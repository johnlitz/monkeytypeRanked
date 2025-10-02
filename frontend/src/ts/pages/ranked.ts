import { Page } from "./page";
import { createElement } from "../utils/dom";
import { navigate } from "../controllers/route-controller";
import * as TestState from "../test/test-state";

export class RankedPage extends Page {
  private queueInterval: number | undefined;
  private joinQueueButton: HTMLElement | undefined;
  private leaveQueueButton: HTMLElement | undefined;
  private queueStatusElement: HTMLElement | undefined;
  private matchFoundElement: HTMLElement | undefined;

  constructor() {
    super("ranked");
  }

  async load(): Promise<void> {
    console.log("Loading Ranked Page");
    const container = document.getElementById("page-container");
    if (container) {
      container.innerHTML = "";

      const title = createElement("h1", { textContent: "Ranked Mode" });
      container.appendChild(title);

      this.queueStatusElement = createElement("p", { id: "ranked-queue-status", textContent: "Loading queue status..." });
      container.appendChild(this.queueStatusElement);

      this.joinQueueButton = createElement("button", { textContent: "Join Ranked Queue" });
      this.joinQueueButton.addEventListener("click", () => this.joinQueue());
      container.appendChild(this.joinQueueButton);

      this.leaveQueueButton = createElement("button", { textContent: "Leave Ranked Queue" });
      this.leaveQueueButton.addEventListener("click", () => this.leaveQueue());
      this.leaveQueueButton.style.display = "none"; // Hidden by default
      container.appendChild(this.leaveQueueButton);

      this.matchFoundElement = createElement("div", { id: "ranked-match-found", style: "display:none;" });
      container.appendChild(this.matchFoundElement);

      this.updateQueueStatus();
      this.queueInterval = setInterval(() => this.updateQueueStatus(), 5000); // Update every 5 seconds
    }
  }

  async joinQueue(): Promise<void> {
    if (!this.joinQueueButton || !this.leaveQueueButton || !this.queueStatusElement) return;

    this.joinQueueButton.disabled = true;
    this.queueStatusElement.textContent = "Joining queue...";

    try {
      const response = await fetch("/api/ranked/queue/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: "current_user_uid" }), // Replace with actual user UID
      });
      const data = await response.json();

      if (response.ok) {
        this.queueStatusElement.textContent = data.message;
        this.joinQueueButton.style.display = "none";
        this.leaveQueueButton.style.display = "block";
        if (data.opponentFound && data.matchId) {
          this.displayMatchFound(data.matchId, data.wordList, data.wordListSeed);
        }
      } else {
        this.queueStatusElement.textContent = `Error: ${data.message}`;
        this.joinQueueButton.disabled = false;
      }
    } catch (error) {
      console.error("Failed to join queue:", error);
      this.queueStatusElement.textContent = "Failed to connect to matchmaking service.";
      this.joinQueueButton.disabled = false;
    }
  }

  async leaveQueue(): Promise<void> {
    if (!this.joinQueueButton || !this.leaveQueueButton || !this.queueStatusElement) return;

    this.leaveQueueButton.disabled = true;
    this.queueStatusElement.textContent = "Leaving queue...";

    try {
      const response = await fetch("/api/ranked/queue/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: "current_user_uid" }), // Replace with actual user UID
      });
      const data = await response.json();

      if (response.ok) {
        this.queueStatusElement.textContent = data.message;
        this.joinQueueButton.style.display = "block";
        this.leaveQueueButton.style.display = "none";
        this.matchFoundElement!.style.display = "none";
      } else {
        this.queueStatusElement.textContent = `Error: ${data.message}`;
        this.leaveQueueButton.disabled = false;
      }
    } catch (error) {
      console.error("Failed to leave queue:", error);
      this.queueStatusElement.textContent = "Failed to connect to matchmaking service.";
      this.leaveQueueButton.disabled = false;
    }
  }

  async updateQueueStatus(): Promise<void> {
    if (!this.queueStatusElement) return;

    try {
      const response = await fetch("/api/ranked/queue/status");
      const data = await response.json();
      if (response.ok) {
        this.queueStatusElement.textContent = `Players in queue: ${data.length}.`;
        // In a real app, you'd check if the current user is in the queue and update buttons accordingly
      } else {
        this.queueStatusElement.textContent = `Error fetching queue status: ${data.message}`;
      }
    } catch (error) {
      console.error("Failed to fetch queue status:", error);
      this.queueStatusElement.textContent = "Failed to connect to matchmaking service.";
    }
  }

  displayMatchFound(matchId: string, wordList: string[], wordListSeed: string): void {
    if (!this.matchFoundElement) return;

    this.matchFoundElement.innerHTML = `
      <h2>Match Found!</h2>
      <p>Opponent found! Match ID: ${matchId}</p>
      <p>Word List: ${wordList.join(" ")}</p>
      <button id="start-match-button">Start Match</button>
    `;
    this.matchFoundElement.style.display = "block";

    const startMatchButton = document.getElementById("start-match-button");
    startMatchButton?.addEventListener("click", () => {
      // Navigate to the test page with match details
      TestState.setTestData({ matchId, wordList, wordListSeed, ranked: true });
      navigate("/test");
    });
  }

  unload(): void {
    console.log("Unloading Ranked Page");
    if (this.queueInterval) {
      clearInterval(this.queueInterval);
    }
    const container = document.getElementById("page-container");
    if (container) {
      container.innerHTML = "";
    }
  }
}

