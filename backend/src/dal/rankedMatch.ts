import { Collection, Document, ObjectId } from "mongodb";
import { getDB } from "../init/mongodb";

export interface PlayerResult {
  wpm: number;
  accuracy: number;
  rawWPM: number;
  consistency: number;
  duration: number;
  wordlist: string[];
}

export interface RankedMatch extends Document {
  _id: ObjectId;
  match_id: string;
  player1_uid: string;
  player2_uid: string;
  player1_initial_elo: number;
  player2_initial_elo: number;
  player1_final_elo: number;
  player2_final_elo: number;
  winner_uid: string;
  loser_uid: string;
  player1_result: PlayerResult;
  player2_result: PlayerResult;
  timestamp: number;
  word_list_seed: string;
  is_valid: boolean;
}

export function getRankedMatchesCollection(): Collection<RankedMatch> {
  return getDB().collection<RankedMatch>("ranked_matches");
}

