import { Request, Response } from "express";
import { getOrCreateRankedPlayer, calculateEloChange, updatePlayerEloAndStats, getRankTier } from "../../services/elo.service";
import { getRankedMatchesCollection, RankedMatch, PlayerResult } from "../../dal/rankedMatch";
import { joinMatchmakingQueue, leaveMatchmakingQueue, findMatch, getMatchmakingQueueStatus } from "../../services/matchmaking.service";
import { ObjectId } from "mongodb";
import MonkeyError from "../../utils/error";
import { validateRankedResult } from "../../services/antiCheat.service";

// Helper to generate a standardized word list (placeholder for actual implementation)
function generateStandardWordList(seed: string): string[] {
  // In a real scenario, this would use the seed to generate a consistent word list
  // For now, return a dummy list
  return ["the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog"];
}

export async function startRankedMatch(req: Request, res: Response): Promise<void> {
  const { uid } = req.body; // Assuming uid is passed in the request body or from auth middleware

  if (!uid) {
    res.status(400).json({ message: "User ID is required." });
    return;
  }

  try {
    const player = await getOrCreateRankedPlayer(uid);
    const matchId = await findMatch(uid); // Attempt to find a match from the queue

    if (matchId) {
      // If a match is found, prepare the game for both players
      const wordListSeed = new ObjectId().toHexString(); // Unique seed for the word list
      const wordList = generateStandardWordList(wordListSeed);
      res.status(200).json({ message: "Match found!", matchId, opponentFound: true, wordList, wordListSeed });
    } else {
      // If no match found, player joins the queue
      await joinMatchmakingQueue(uid);
      res.status(200).json({ message: "Joined matchmaking queue. Waiting for opponent.", opponentFound: false });
    }
  } catch (error) {
    console.error("Error starting ranked match:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function submitRankedMatchResult(req: Request, res: Response): Promise<void> {
  const { matchId, playerUid, opponentUid, playerResult, opponentResult, wordListSeed } = req.body;

  if (!matchId || !playerUid || !opponentUid || !playerResult || !opponentResult || !wordListSeed) {
    res.status(400).json({ message: "Missing required match result data." });
    return;
  }

  try {
    const isPlayer1ResultValid = validateRankedResult(playerResult.wpm, playerResult.accuracy, playerResult.rawWPM, playerResult.duration);
    const isPlayer2ResultValid = validateRankedResult(opponentResult.wpm, opponentResult.accuracy, opponentResult.rawWPM, opponentResult.duration);

    let isMatchValid = isPlayer1ResultValid && isPlayer2ResultValid;

    if (!isMatchValid) {
      console.warn(`Match ${matchId} flagged as invalid due to anti-cheat.`);
      // Optionally, penalize players or prevent ELO update here
    }

    if (playerResult.wpm <= 0 || playerResult.accuracy <= 0 || opponentResult.wpm <= 0 || opponentResult.accuracy <= 0) {
      throw new MonkeyError(400, "Invalid game results.", "submitRankedMatchResult");
    }

    const player1 = await getOrCreateRankedPlayer(playerUid);
    const player2 = await getOrCreateRankedPlayer(opponentUid);

    let winnerUid: string;
    let loserUid: string;
    let player1Score: number;
    let player2Score: number;

    // Determine winner based on WPM, then accuracy
    if (playerResult.wpm > opponentResult.wpm) {
      winnerUid = playerUid;
      loserUid = opponentUid;
      player1Score = 1;
      player2Score = 0;
    } else if (opponentResult.wpm > playerResult.wpm) {
      winnerUid = opponentUid;
      loserUid = playerUid;
      player1Score = 0;
      player2Score = 1;
    } else if (playerResult.accuracy > opponentResult.accuracy) {
      winnerUid = playerUid;
      loserUid = opponentUid;
      player1Score = 1;
      player2Score = 0;
    } else if (opponentResult.accuracy > playerResult.accuracy) {
      winnerUid = opponentUid;
      loserUid = playerUid;
      player1Score = 0;
      player2Score = 1;
    } else {
      // Draw scenario
      winnerUid = "draw"; // Or handle as a specific draw case
      loserUid = "draw";
      player1Score = 0.5;
      player2Score = 0.5;
    }

    const { newPlayer1Elo, newPlayer2Elo } = calculateEloChange(
      player1.elo,
      player2.elo,
      player1Score,
      player2Score,
      player1.k_factor,
      player2.k_factor
    );

    const timestamp = Date.now();

    await updatePlayerEloAndStats(player1.uid, newPlayer1Elo, player1Score === 1, timestamp);
    await updatePlayerEloAndStats(player2.uid, newPlayer2Elo, player2Score === 1, timestamp);

    const rankedMatch: RankedMatch = {
      _id: new ObjectId(),
      match_id: matchId,
      player1_uid: player1.uid,
      player2_uid: player2.uid,
      player1_initial_elo: player1.elo,
      player2_initial_elo: player2.elo,
      player1_final_elo: newPlayer1Elo,
      player2_final_elo: newPlayer2Elo,
      winner_uid: winnerUid,
      loser_uid: loserUid,
      player1_result: playerResult,
      player2_result: opponentResult,
      timestamp,
      word_list_seed: wordListSeed,
      is_valid: isMatchValid,
    };

    await getRankedMatchesCollection().insertOne(rankedMatch);

    res.status(200).json({
      message: "Match result submitted successfully.",
      player1EloChange: newPlayer1Elo - player1.elo,
      player2EloChange: newPlayer2Elo - player2.elo,
      newPlayer1Elo,
      newPlayer2Elo,
      winnerUid,
    });
  } catch (error) {
    console.error("Error submitting ranked match result:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getRankedLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const leaderboard = await getRankedPlayersCollection()
      .find({})
      .sort({ elo: -1, games_played: -1 }) // Sort by ELO descending, then games played descending
      .limit(100) // Top 100 players
      .toArray();

    const formattedLeaderboard = leaderboard.map(player => ({
      uid: player.uid,
      elo: player.elo,
      rank_tier: getRankTier(player.elo),
      games_played: player.games_played,
      wins: player.wins,
      losses: player.losses,
    }));

    res.status(200).json(formattedLeaderboard);
  } catch (error) {
    console.error("Error fetching ranked leaderboard:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getPlayerRankedStats(req: Request, res: Response): Promise<void> {
  const { uid } = req.params;

  try {
    const player = await getOrCreateRankedPlayer(uid);
    const matchHistory = await getRankedMatchesCollection()
      .find({ $or: [{ player1_uid: uid }, { player2_uid: uid }] })
      .sort({ timestamp: -1 })
      .limit(20) // Last 20 matches
      .toArray();

    res.status(200).json({
      uid: player.uid,
      elo: player.elo,
      rank_tier: getRankTier(player.elo),
      games_played: player.games_played,
      wins: player.wins,
      losses: player.losses,
      match_history: matchHistory.map(match => ({
        match_id: match.match_id,
        opponent_uid: match.player1_uid === uid ? match.player2_uid : match.player1_uid,
        initial_elo: match.player1_uid === uid ? match.player1_initial_elo : match.player2_initial_elo,
        final_elo: match.player1_uid === uid ? match.player1_final_elo : match.player2_final_elo,
        elo_change: (match.player1_uid === uid ? match.player1_final_elo : match.player2_final_elo) - (match.player1_uid === uid ? match.player1_initial_elo : match.player2_initial_elo),
        outcome: match.winner_uid === uid ? "win" : (match.loser_uid === uid ? "loss" : "draw"),
        timestamp: match.timestamp,
        player_result: match.player1_uid === uid ? match.player1_result : match.player2_result,
        opponent_result: match.player1_uid === uid ? match.player2_result : match.player1_result,
      })),
    });
  } catch (error) {
    console.error("Error fetching player ranked stats:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function joinRankedMatchmakingQueue(req: Request, res: Response): Promise<void> {
  const { uid } = req.body; // Assuming uid is passed in the request body or from auth middleware

  if (!uid) {
    res.status(400).json({ message: "User ID is required." });
    return;
  }

  try {
    const status = await joinMatchmakingQueue(uid);
    res.status(200).json({ message: status });
  } catch (error) {
    console.error("Error joining matchmaking queue:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function leaveRankedMatchmakingQueue(req: Request, res: Response): Promise<void> {
  const { uid } = req.body; // Assuming uid is passed in the request body or from auth middleware

  if (!uid) {
    res.status(400).json({ message: "User ID is required." });
    return;
  }

  try {
    leaveMatchmakingQueue(uid);
    res.status(200).json({ message: "Left matchmaking queue." });
  } catch (error) {
    console.error("Error leaving matchmaking queue:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getMatchmakingQueue(req: Request, res: Response): Promise<void> {
  try {
    const queue = getMatchmakingQueueStatus();
    res.status(200).json(queue);
  } catch (error) {
    console.error("Error fetching matchmaking queue status:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

