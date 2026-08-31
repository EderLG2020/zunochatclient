import apiClient from "./api.config";
import type { ApiResponse, BlockedUserResponse, ThemePreference, UserProfileResponse } from "@/types";

export interface UserSearchResult {
  id: number;
  username: string;
  avatar: string | null;
}

export const userService = {
  search: async (q: string): Promise<UserSearchResult[]> => {
    const res = await apiClient.get<ApiResponse<UserSearchResult[]>>(
      "/api/users/search",
      { params: { q } },
    );
    return res.data.data;
  },

  // POST /api/users/{id}/block
  block: async (userId: number): Promise<void> => {
    await apiClient.post<ApiResponse<null>>(`/api/users/${userId}/block`);
  },

  // DELETE /api/users/{id}/block
  unblock: async (userId: number): Promise<void> => {
    await apiClient.delete<ApiResponse<null>>(`/api/users/${userId}/block`);
  },

  // GET /api/users/blocked
  listBlocked: async (): Promise<BlockedUserResponse[]> => {
    const res = await apiClient.get<ApiResponse<BlockedUserResponse[]>>("/api/users/blocked");
    return res.data.data;
  },

  // PATCH /api/users/me/theme
  updateTheme: async (theme: ThemePreference): Promise<void> => {
    await apiClient.patch<ApiResponse<null>>("/api/users/me/theme", { theme });
  },

  // GET /api/users/{id}/profile
  getProfile: async (userId: number): Promise<UserProfileResponse> => {
    const res = await apiClient.get<ApiResponse<UserProfileResponse>>(`/api/users/${userId}/profile`);
    return res.data.data;
  },

  // PATCH /api/users/me/phone — phone null o "" borra el guardado
  updatePhone: async (phone: string | null): Promise<void> => {
    await apiClient.patch<ApiResponse<null>>("/api/users/me/phone", { phone });
  },
};
