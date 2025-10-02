import express from "express";
import {
  startRankedMatch,
  submitRankedMatchResult,
  getRankedLeaderboard,
  getPlayerRankedStats,
  joinRankedMatchmakingQueue,
  leaveRankedMatchmakingQueue,
  getMatchmakingQueue,
} from "../controllers/ranked";

const router = express.Router();

router.post("/ranked/match/start", startRankedMatch);
router.post("/ranked/match/submit", submitRankedMatchResult);
router.get("/ranked/leaderboard", getRankedLeaderboard);
router.get("/ranked/player/:uid/stats", getPlayerRankedStats);
router.post("/ranked/queue/join", joinRankedMatchmakingQueue);
router.post("/ranked/queue/leave", leaveRankedMatchmakingQueue);
router.get("/ranked/queue/status", getMatchmakingQueue);

export default router;

