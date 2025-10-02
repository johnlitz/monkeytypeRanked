import { Collection, Document, ObjectId } from "mongodb";
import { getDB } from "../init/mongodb";

export interface RankedPlayer extends Document {
  _id: ObjectId;
  uid: string;
  elo: number;
  rank_tier: string;
  last_ranked_game_timestamp: number;
  games_played: number;
  wins: number;
  losses: number;
  k_factor: number;
}

export function getRankedPlayersCollection(): Collection<RankedPlayer> {
  return getDB().collection<RankedPlayer>("ranked_players");
}

