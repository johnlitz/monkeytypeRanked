'''
# Ranked Competitive Mode Implementation

This document provides a comprehensive overview of the newly implemented ranked competitive mode for the Monkeytype fork. It details the backend architecture, frontend components, and provides instructions for setup and usage.

## Table of Contents

1.  [Features](#features)
2.  [Backend Implementation](#backend-implementation)
    -   [Database Schema](#database-schema)
    -   [ELO Rating System](#elo-rating-system)
    -   [Matchmaking](#matchmaking)
    -   [Anti-Cheat System](#anti-cheat-system)
    -   [API Endpoints](#api-endpoints)
3.  [Frontend Implementation](#frontend-implementation)
    -   [Ranked Mode UI](#ranked-mode-ui)
    -   [Leaderboard](#leaderboard)
    -   [Player Profile](#player-profile)
    -   [Post-Match Screen](#post-match-screen)
4.  [Setup and Usage](#setup-and-usage)

## Features

-   **ELO Rating System:** Players are ranked using a standard ELO system, with a starting rating of 1000.
-   **Matchmaking:** A queue-based system matches players with opponents within a ±100 ELO range.
-   **Rank Tiers:** A tier system (Bronze, Silver, Gold, etc.) provides a visual representation of a player's skill level.
-   **Live Leaderboard:** A real-time leaderboard displays the top-ranked players.
-   **Player Profiles:** Detailed player profiles show current ELO, rank tier, and match history.
-   **Post-Match Screen:** An immediate post-match screen displays ELO changes and match results.
-   **Anti-Cheat:** A basic anti-cheat system flags and invalidates suspicious results.

## Backend Implementation

The backend is built with Node.js and TypeScript, using MongoDB as the database.

### Database Schema

Two new MongoDB collections have been added:

-   **`ranked_players`**: Stores individual player data related to ranked mode.
    -   `uid`: User ID (String)
    -   `elo`: ELO rating (Number)
    -   `rank_tier`: Rank tier (String)
    -   `last_ranked_game_timestamp`: Timestamp of the last ranked game (Number)
    -   `games_played`, `wins`, `losses`: Match statistics (Number)
    -   `k_factor`: ELO K-factor (Number)

-   **`ranked_matches`**: Stores the results of each ranked match.
    -   `match_id`: Unique match identifier (String)
    -   `player1_uid`, `player2_uid`: Player UIDs (String)
    -   `player1_initial_elo`, `player2_initial_elo`, `player1_final_elo`, `player2_final_elo`: ELO before and after the match (Number)
    -   `winner_uid`, `loser_uid`: UIDs of the winner and loser (String)
    -   `player1_result`, `player2_result`: Detailed match results (Object)
    -   `timestamp`: Match completion timestamp (Number)
    -   `is_valid`: Anti-cheat validation flag (Boolean)

### ELO Rating System

The ELO logic is implemented in `backend/src/services/elo.service.ts`. Key features include:

-   **Starting Rating:** 1000 ELO
-   **K-Factor:** 32 for new players (e.g., < 20 games), 16 for established players.
-   **Rank Tiers:** A tier system is defined in `elo.service.ts`, mapping ELO ranges to ranks like "Bronze", "Silver", "Gold", etc.
-   **Inactivity Decay:** A placeholder for a decay system is included, which can be implemented as a scheduled job to deduct ELO from inactive players.

### Matchmaking

The matchmaking system in `backend/src/services/matchmaking.service.ts` uses an in-memory queue. For production environments, it is recommended to switch to a more robust solution like Redis.

-   Players joining the queue are matched with opponents within a ±100 ELO range.
-   If no suitable opponent is found, the player waits in the queue.

### Anti-Cheat System

A basic anti-cheat system is implemented in `backend/src/services/antiCheat.service.ts`. It currently flags:

-   Inhumanly high WPM (e.g., > 300).
-   Perfect accuracy at very high speeds (e.g., 100% at > 150 WPM).

Flagged matches are marked as `is_valid: false` in the `ranked_matches` collection.

### API Endpoints

New API endpoints are defined in `backend/src/api/routes/ranked.ts` and implemented in `backend/src/api/controllers/ranked.ts`:

-   `POST /api/ranked/match/start`: Initiates a ranked match or joins the matchmaking queue.
-   `POST /api/ranked/match/submit`: Submits the result of a ranked match.
-   `GET /api/ranked/leaderboard`: Fetches the top 100 ranked players.
-   `GET /api/ranked/player/:uid/stats`: Retrieves a player's ranked stats and match history.
-   `POST /api/ranked/queue/join`: Joins the matchmaking queue.
-   `POST /api/ranked/queue/leave`: Leaves the matchmaking queue.
-   `GET /api/ranked/queue/status`: Gets the current status of the matchmaking queue.

## Frontend Implementation

The frontend is built with TypeScript and jQuery, with a page-based architecture.

### Ranked Mode UI

-   **`ranked.ts`**: The main page for the ranked mode, located at `/ranked`. It includes UI for joining/leaving the queue and displays match-found notifications.

### Leaderboard

-   **`ranked-leaderboard.ts`**: A new page at `/ranked-leaderboard` that displays the top players, their ELO, rank, and other stats.

### Player Profile

-   **`ranked-profile.ts`**: A dynamic page at `/ranked-profile/:uid` that shows a player's detailed ranked statistics and their recent match history.

### Post-Match Screen

-   **`post-match.ts`**: After a ranked match, players are redirected to this page to see their ELO changes and the match outcome.

## Setup and Usage

1.  **Backend:**
    -   Ensure your MongoDB instance is running.
    -   The new collections (`ranked_players`, `ranked_matches`) will be created automatically when the application starts.
    -   The new API routes are integrated into the main application in `backend/src/app.ts` and `backend/src/api/routes/index.ts`.

2.  **Frontend:**
    -   The new pages and routes are integrated into the existing page and route controllers.
    -   To access the new features, navigate to the following URLs:
        -   `/ranked`: To join the ranked queue.
        -   `/ranked-leaderboard`: To view the leaderboard.
        -   `/ranked-profile/:uid`: To view a player's profile (replace `:uid` with a user ID).

This implementation provides a solid foundation for a competitive ranked mode. Future enhancements could include more sophisticated anti-cheat measures, a more robust matchmaking system (e.g., using Redis), and visual improvements to the UI.
'''
