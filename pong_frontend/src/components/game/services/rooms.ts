import { GameRoom } from "../../../../../shared/types";

const API_BASE_URL = "http://localhost:3000/api/game";

interface GameResponse {
  gameId: string;
  gameState: GameRoom;
}

export const roomApi = {
  async createGame(
    mode: "singleplayer" | "local-mp" | "remote-mp"
  ): Promise<GameResponse> {
    const response = await fetch(`${API_BASE_URL}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ mode }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create game: ${response.statusText}`);
    }

    return response.json();
  },

  async joinQueue(): Promise<{ position: number }> {
    const response = await fetch(`${API_BASE_URL}/queue/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
    });
    return response.json();
  },

  async checkMatchStatus(): Promise<{ matched: boolean; gameId?: string }> {
    const response = await fetch(`${API_BASE_URL}/queue/status`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    });
    return response.json();
  },

  async leaveQueue(): Promise<void> {
    await fetch(`${API_BASE_URL}/queue/leave`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
    });
  },

  async rematch(gameId: string): Promise<{ newGameId: string }> {
    const response = await fetch(`${API_BASE_URL}/rematch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ gameId }),
    });
    return response.json();
  },
};
