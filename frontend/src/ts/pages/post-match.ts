import { Page } from "./page";
import { createElement } from "../utils/dom";

export class PostMatchPage extends Page {
  constructor() {
    super("postMatch");
  }

  async load(options?: { data?: any }): Promise<void> {
    console.log("Loading Post-Match Page");
    const container = document.getElementById("page-container");
    if (container) {
      container.innerHTML = "";

      const title = createElement("h1", { textContent: "Match Results" });
      container.appendChild(title);

      if (options?.data) {
        const { player1EloChange, player2EloChange, newPlayer1Elo, newPlayer2Elo, winnerUid } = options.data;

        const resultsContainer = createElement("div");
        resultsContainer.innerHTML = `
          <h2>ELO Changes</h2>
          <p>Your ELO Change: <strong>${player1EloChange > 0 ? `+${player1EloChange.toFixed(0)}` : player1EloChange.toFixed(0)}</strong> (New ELO: ${newPlayer1Elo.toFixed(0)})</p>
          <p>Opponent ELO Change: <strong>${player2EloChange > 0 ? `+${player2EloChange.toFixed(0)}` : player2EloChange.toFixed(0)}</strong> (New ELO: ${newPlayer2Elo.toFixed(0)})</p>
          <h3>Winner: ${winnerUid}</h3>
        `;
        container.appendChild(resultsContainer);
      } else {
        container.appendChild(createElement("p", { textContent: "No match data available." }));
      }

      const backButton = createElement("button", { textContent: "Back to Ranked Mode" });
      backButton.addEventListener("click", () => {
        window.history.pushState({}, "", "/ranked");
        // You might need a more robust navigation function here from the existing codebase
      });
      container.appendChild(backButton);
    }
  }

  unload(): void {
    console.log("Unloading Post-Match Page");
    const container = document.getElementById("page-container");
    if (container) {
      container.innerHTML = "";
    }
  }
}

