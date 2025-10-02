import { Page } from "./page";
import { createElement } from "../utils/dom";

export class RankedLeaderboardPage extends Page {
  constructor() {
    super("rankedLeaderboard");
  }

  async load(): Promise<void> {
    console.log("Loading Ranked Leaderboard Page");
    const container = document.getElementById("page-container");
    if (container) {
      container.innerHTML = '';

      const title = createElement('h1', { textContent: 'Ranked Leaderboard' });
      container.appendChild(title);

      const leaderboardTable = createElement('table', { id: 'ranked-leaderboard-table', className: 'leaderboard-table' });
      leaderboardTable.innerHTML = `
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>ELO</th>
            <th>Tier</th>
            <th>Games Played</th>
            <th>Wins</th>
            <th>Losses</th>
          </tr>
        </thead>
        <tbody id="leaderboard-body"></tbody>
      `;
      container.appendChild(leaderboardTable);

      await this.fetchLeaderboard();
    }
  }

  async fetchLeaderboard(): Promise<void> {
    const leaderboardBody = document.getElementById('leaderboard-body');
    if (!leaderboardBody) return;

    leaderboardBody.innerHTML = '<tr><td colspan="7">Loading leaderboard...</td></tr>';

    try {
      const response = await fetch('/api/ranked/leaderboard');
      const data = await response.json();

      if (response.ok) {
        leaderboardBody.innerHTML = ''; // Clear loading message
        data.forEach((player: any, index: number) => {
          const row = leaderboardBody.insertRow();
          row.insertCell().textContent = (index + 1).toString();
          row.insertCell().textContent = player.uid; // Replace with player name if available
          row.insertCell().textContent = player.elo.toFixed(0);
          row.insertCell().textContent = player.rank_tier;
          row.insertCell().textContent = player.games_played.toString();
          row.insertCell().textContent = player.wins.toString();
          row.insertCell().textContent = player.losses.toString();
        });
      } else {
        leaderboardBody.innerHTML = `<tr><td colspan="7">Error loading leaderboard: ${data.message}</td></tr>`;
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      leaderboardBody.innerHTML = '<tr><td colspan="7">Failed to connect to leaderboard service.</td></tr>';
    }
  }

  unload(): void {
    console.log("Unloading Ranked Leaderboard Page");
    const container = document.getElementById("page-container");
    if (container) {
      container.innerHTML = '';
    }
  }
}

