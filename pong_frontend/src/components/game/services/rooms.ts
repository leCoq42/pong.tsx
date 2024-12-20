import { GameRoom, GameMode } from "../../../../../shared/types";
import axios from "axios";

// const API_BASE_URL = "http://localhost:3000/api/game";

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

interface GameResponse {
  gameId: string;
  gameState: GameRoom;
}

interface QueueResponse {
  position: number;
  success: boolean;
}

interface MatchStatusResponse {
  matched: boolean;
  gameId?: string;
}

interface RematchResponse {
  newGameId: string;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

const handleApiError = (error: any): never => {
  if (axios.isAxiosError(error)) {
    console.error('API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'API request failed');
  }
  throw error;
};

const roomApi = {
  async createGame(mode: GameMode): Promise<GameResponse> {
    try {
      const { data } = await api.post<ApiResponse<GameResponse>>(
        "/api/game/start",
        { mode }
      );
      return data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async joinQueue(playerId: string): Promise<QueueResponse> {
    try {
      const { data } = await api.post<ApiResponse<QueueResponse>>(
        "/api/game/queue/join",
        { playerId }
      );
      return data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async leaveQueue(playerId: string): Promise<void> {
    try {
      await api.post<ApiResponse<void>>("/api/game/queue/leave", { playerId });
    } catch (error) {
      handleApiError(error);
    }
  },

  async checkMatchStatus(playerId: string): Promise<MatchStatusResponse> {
    try {
      const { data } = await api.get<ApiResponse<MatchStatusResponse>>(
        `/api/game/queue/status?playerId=${playerId}`
      );
      if (!data || !data.data) {
        return { matched: false };
      }
      return {
        matched: data.data.matched,
        gameId: data.data.gameId
      };
    } catch (error) {
      handleApiError(error);
    }
  },

  async rematch(gameId: string): Promise<RematchResponse> {
    try {
      const { data } = await api.post<ApiResponse<RematchResponse>>(
        "/api/game/rematch",
        { gameId }
      );
      return data.data;
    } catch (error) {
      handleApiError(error);
    }
  },
};

export default roomApi;
