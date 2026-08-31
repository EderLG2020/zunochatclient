import apiClient from "./api.config";
import type {
  ApiResponse,
  RespondStreakRequest,
  SetStreakEnabledRequest,
  StreakResponse,
} from "@/types";

export const streakService = {
  // GET /api/streaks/{conversationId}
  get: async (conversationId: number): Promise<StreakResponse> => {
    const res = await apiClient.get<ApiResponse<StreakResponse>>(
      `/api/streaks/${conversationId}`,
    );
    return res.data.data;
  },

  // PATCH /api/streaks/{conversationId}
  // enabled=true dispara/acepta una solicitud de activación; enabled=false desactiva de inmediato.
  setEnabled: async (
    conversationId: number,
    payload: SetStreakEnabledRequest,
  ): Promise<StreakResponse> => {
    const res = await apiClient.patch<ApiResponse<StreakResponse>>(
      `/api/streaks/${conversationId}`,
      payload,
    );
    return res.data.data;
  },

  // POST /api/streaks/{conversationId}/respond
  respond: async (
    conversationId: number,
    payload: RespondStreakRequest,
  ): Promise<StreakResponse> => {
    const res = await apiClient.post<ApiResponse<StreakResponse>>(
      `/api/streaks/${conversationId}/respond`,
      payload,
    );
    return res.data.data;
  },
};
