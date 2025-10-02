import { Page } from "./page";
import { createElement } from "../utils/dom";

export class RankedProfilePage extends Page {
  constructor() {
    super("rankedProfile");
  }

  async load(options?: { params?: { uid: string } }): Promise<void> {
    console.log("Loading Ranked Profile Page");
    const container = document.getElementById("page-container");
    if (container) {
      container.innerHTML = ";

      const uid = options?.params?.uid || "current_user_uid"; // Replace with actual user UID logic

      const title = createElement("h1", { textContent: `Ranked Profile: ${uid}` });
      container.appendChild(title);

      const profileStats = createElement("div", { id: "ranked-profile-stats" });
      profileStats.textContent = "Loading player stats...";
      container.appendChild(profileStats);

      const matchHistory = createElement("div", { id: "ranked-match-history" });
      matchHistory.innerHTML = `
        <h2>Match History</h2>
        <table class="match-history-table">
          <thead>
            <tr>
              <th>Match ID</th>
              <th>Opponent</th>
              <th>Outcome</th>
              <th>ELO Change</th>
              <th>Your WPM</th>
              <th>Opponent WPM</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody id="match-history-body"></tbody>
        </table>
      `;
      container.appendChild(matchHistory);

      await this.fetchPlayerStats(uid);
    }
  }

  async fetchPlayerStats(uid: string): Promise<void> {
    const profileStatsElement = document.getElementById("ranked-profile-stats");
    const matchHistoryBody = document.getElementById("match-history-body");
    if (!profileStatsElement || !matchHistoryBody) return;

    profileStatsElement.textContent = "Loading player stats...";
    matchHistoryBody.innerHTML = "<tr><td colspan=\"7\">Loading match history...</td></tr>";

    try {
      const response = await fetch(`/api/ranked/player/${uid}/stats`);
      const data = await response.json();

      if (response.ok) {
        profileStatsElement.innerHTML = `
          <p>ELO: <strong>${data.elo.toFixed(0)}</strong></p>
          <p>Rank Tier: <strong>${data.rank_tier}</strong></p>
          <p>Games Played: ${data.games_played}</p>
          <p>Wins: ${data.wins}</p>
          <p>Losses: ${data.losses}</p>
        `;

        matchHistoryBody.innerHTML = "";
        data.match_history.forEach((match: any) => {
          const row = matchHistoryBody.insertRow();
          row.insertCell().textContent = match.match_id.substring(0, 8) + "...";
          row.insertCell().textContent = match.opponent_uid; // Link to opponent profile?
          row.insertCell().textContent = match.outcome;
          row.insertCell().textContent = match.elo_change > 0 ? `+${match.elo_change.toFixed(0)}` : match.elo_change.toFixed(0);
          row.insertCell().textContent = match.player_result.wpm.toFixed(0);
          row.insertCell().textContent = match.opponent_result.wpm.toFixed(0);
          row.insertCell().textContent = new Date(match.timestamp).toLocaleString();
        });
      } else {
        profileStatsElement.textContent = `Error loading stats: ${data.message}`;
        matchHistoryBody.innerHTML = `<tr><td colspan=\"7\">Error loading match history: ${data.message}</td></tr>`;
      }
    } catch (error) {
      console.error("Failed to fetch player stats:", error);
      profileStatsElement.textContent = "Failed to connect to stats service.";
      matchHistoryBody.innerHTML = "<tr><td colspan=\"7\">Failed to connect to match history service.</td></tr>";
    }
  }

  unload(): void {
    console.log("Unloading Ranked Profile Page");
    const container = document.getElementById("page-container");
    if (container) {
      container.innerHTML = "";
    }
  }
}

