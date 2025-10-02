import { getRankedPlayersCollection, RankedPlayer } from "../dal/rankedPlayer";
import { findMatchmakingCandidates, getOrCreateRankedPlayer } from "./elo.service";
import { ObjectId } from "mongodb";

interface MatchmakingQueueEntry {
  uid: string;
  elo: number;
  timestamp: number;
}

// In-memory queue for simplicity. For production, consider Redis.
const matchmakingQueue: MatchmakingQueueEntry[] = [];

export async function joinMatchmakingQueue(uid: string): Promise<string> {
  const player = await getOrCreateRankedPlayer(uid);

  // Remove if already in queue
  const existingIndex = matchmakingQueue.findIndex(entry => entry.uid === uid);
  if (existingIndex !== -1) {
    matchmakingQueue.splice(existingIndex, 1);
  }

  matchmakingQueue.push({ uid, elo: player.elo, timestamp: Date.now() });
  console.log(`Player ${uid} joined queue. Current queue size: ${matchmakingQueue.length}`);

  // Attempt to find a match immediately
  const match = await findMatch(uid);
  if (match) {
    return match;
  }

  return "Waiting for opponent";
}

export function leaveMatchmakingQueue(uid: string): void {
  const initialLength = matchmakingQueue.length;
  matchmakingQueue.splice(matchmakingQueue.findIndex(entry => entry.uid === uid), 1);
  if (matchmakingQueue.length < initialLength) {
    console.log(`Player ${uid} left queue. Current queue size: ${matchmakingQueue.length}`);
  }
}

export async function findMatch(playerUid: string): Promise<string | null> {
  const player1Entry = matchmakingQueue.find(entry => entry.uid === playerUid);
  if (!player1Entry) return null;

  const player1 = await getOrCreateRankedPlayer(playerUid);

  const candidates = await findMatchmakingCandidates(player1.elo, player1.uid);

  for (const candidate of candidates) {
    const player2EntryIndex = matchmakingQueue.findIndex(entry => entry.uid === candidate.uid && entry.uid !== player1.uid);
    if (player2EntryIndex !== -1) {
      const player2Entry = matchmakingQueue[player2EntryIndex];

      // Remove both players from the queue
      leaveMatchmakingQueue(player1.uid);
      leaveMatchmakingQueue(player2Entry.uid);

      // Generate a unique match ID
      const matchId = new ObjectId().toHexString();

      // In a real scenario, you'd store this match in a temporary state or a 'pending_matches' collection
      // and then redirect both players to a game session with this matchId.
      console.log(`Match found! ${player1.uid} vs ${player2Entry.uid} (Match ID: ${matchId})`);
      return matchId;
    }
  }
  return null;
}

export function getMatchmakingQueueStatus(): { uid: string; elo: number; timestamp: number }[] {
  return matchmakingQueue;
}

