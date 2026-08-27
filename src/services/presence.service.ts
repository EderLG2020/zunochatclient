import apiClient from "./api.config";
import type { ApiResponse } from "@/types";

export interface PresenceSnapshot {
  userId: number;
  online: boolean;
  lastSeen: string | null;
}

export const presenceService = {
  // GET /api/presence?ids=1,2,3 — estado actual (no depende de haber estado
  // suscripto al WS en el momento exacto en que la otra persona se conectó).
  snapshot: async (ids: number[]): Promise<PresenceSnapshot[]> => {
    if (ids.length === 0) return [];
    const res = await apiClient.get<ApiResponse<PresenceSnapshot[]>>("/api/presence", {
      params: { ids: ids.join(",") },
    });
    return res.data.data;
  },
};
