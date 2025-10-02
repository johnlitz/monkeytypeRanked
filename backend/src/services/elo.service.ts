import { getRankedPlayersCollection, RankedPlayer } from "../dal/rankedPlayer";
import { ObjectId } from "mongodb";

const K_FACTOR_NEW_PLAYER = 32;
const K_FACTOR_ESTABLISHED_PLAYER = 16;
const NEW_PLAYER_GAMES_THRESHOLD = 10; // Number of games after which K-factor changes
const ELO_DECAY_AMOUNT = 10;
const ELO_DECAY_INACTIVITY_WEEKS = 2;

export const RANK_TIERS = [
  { name: "Bronze V", min_elo: 0, max_elo: 499 },
  { name: "Bronze IV", min_elo: 500, max_elo: 599 },
  { name: "Bronze III", min_elo: 600, max_elo: 699 },
  { name: "Bronze II", min_elo: 700, max_elo: 799 },
  { name: "Bronze I", min_elo: 800, max_elo: 899 },
  { name: "Silver V", min_elo: 900, max_elo: 999 },
  { name: "Silver IV", min_elo: 1000, max_elo: 1099 },
  { name: "Silver III", min_elo: 1100, max_elo: 1199 },
  { name: "Silver II", min_elo: 1200, max_elo: 1299 },
  { name: "Silver I", min_elo: 1300, max_elo: 1399 },
  { name: "Gold V", min_elo: 1400, max_elo: 1499 },
  { name: "Gold IV", min_elo: 1500, max_elo: 1599 },
  { name: "Gold III", min_elo: 1600, max_elo: 1699 },
  { name: "Gold II", min_elo: 1700, max_elo: 1799 },
  { name: "Gold I", min_elo: 1800, max_elo: 1899 },
  { name: "Platinum V", min_elo: 1900, max_elo: 1999 },
  { name: "Platinum IV", min_elo: 2000, max_elo: 2099 },
  { name: "Platinum III", min_elo: 2100, max_elo: 2199 },
  { name: "Platinum II", min_elo: 2200, max_elo: 2299 },
  { name: "Platinum I", min_elo: 2300, max_elo: 2399 },
  { name: "Diamond V", min_elo: 2400, max_elo: 2499 },
  { name: "Diamond IV", min_elo: 2500, max_elo: 2599 },
  { name: "Diamond III", min_elo: 2600, max_elo: 2699 },
  { name: "Diamond II", min_elo: 2700, max_elo: 2799 },
  { name: "Diamond I", min_elo: 2800, max_elo: 2899 },
  { name: "Master", min_elo: 2900, max_elo: Infinity },
];

export function getRankTier(elo: number): string {
  for (const tier of RANK_TIERS) {
    if (elo >= tier.min_elo && elo <= tier.max_elo) {
      return tier.name;
    }
  }
  return "Unranked"; // Should not happen if tiers cover all ranges
}

export async function getOrCreateRankedPlayer(uid: string): Promise<RankedPlayer> {
  const collection = getRankedPlayersCollection();
  let player = await collection.findOne({ uid });

  if (!player) {
    player = {
      _id: new ObjectId(),
      uid,
      elo: 1000,
      rank_tier: getRankTier(1000),
      last_ranked_game_timestamp: 0,
      games_played: 0,
      wins: 0,
      losses: 0,
      k_factor: K_FACTOR_NEW_PLAYER,
    };
    await collection.insertOne(player);
  }
  return player;
}

export function calculateEloChange(
  player1Elo: number,
  player2Elo: number,
  player1Score: number, // 1 for win, 0 for loss, 0.5 for draw
  player2Score: number, // 1 for win, 0 for loss, 0.5 for draw
  kFactor1: number,
  kFactor2: number
): { newPlayer1Elo: number; newPlayer2Elo: number } {
  const expectedScore1 = 1 / (1 + Math.pow(10, (player2Elo - player1Elo) / 400));
  const expectedScore2 = 1 / (1 + Math.pow(10, (player1Elo - player2Elo) / 400));

  const newPlayer1Elo = player1Elo + kFactor1 * (player1Score - expectedScore1);
  const newPlayer2Elo = player2Elo + kFactor2 * (player2Score - expectedScore2);

  return { newPlayer1Elo, newPlayer2Elo };
}

export async function updatePlayerEloAndStats(
  uid: string,
  newElo: number,
  isWin: boolean,
  timestamp: number
): Promise<void> {
  const collection = getRankedPlayersCollection();
  const player = await getOrCreateRankedPlayer(uid);

  const updateDoc: any = {
    elo: newElo,
    rank_tier: getRankTier(newElo),
    last_ranked_game_timestamp: timestamp,
    games_played: player.games_played + 1,
  };

  if (isWin) {
    updateDoc.wins = player.wins + 1;
  } else {
    updateDoc.losses = player.losses + 1;
  }

  if (player.games_played + 1 >= NEW_PLAYER_GAMES_THRESHOLD) {
    updateDoc.k_factor = K_FACTOR_ESTABLISHED_PLAYER;
  }

  await collection.updateOne({ uid }, { $set: updateDoc });
}

export async function applyEloDecay(): Promise<void> {
  const collection = getRankedPlayersCollection();
  const twoWeeksAgo = Date.now() - ELO_DECAY_INACTIVITY_WEEKS * 7 * 24 * 60 * 60 * 1000;

  await collection.updateMany(
    {
      last_ranked_game_timestamp: { $lt: twoWeeksAgo },
      elo: { $gt: 0 }, // Ensure ELO doesn't go below 0 due to decay
    },
    {
      $inc: { elo: -ELO_DECAY_AMOUNT },
    }
  );
}

export async function findMatchmakingCandidates(playerElo: number, excludeUid: string): Promise<RankedPlayer[]> {
  const collection = getRankedPlayersCollection();
  const ELO_RANGE = 100;

  const candidates = await collection.find({
    uid: { $ne: excludeUid },
    elo: { $gte: playerElo - ELO_RANGE, $lte: playerElo + ELO_RANGE },
  }).limit(50).toArray(); // Limit to a reasonable number of candidates

  return candidates;
}

