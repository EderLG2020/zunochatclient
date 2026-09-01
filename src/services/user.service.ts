import apiClient from "./api.config";
import type { ApiResponse, AuthResponse, BlockedUserResponse, ThemePreference, UserProfileResponse } from "@/types";

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

  // PATCH /api/users/me/username — el username viaja como "sub" del JWT, así
  // que el backend devuelve un token nuevo (el viejo deja de resolver a este
  // usuario). El caller debe aplicar el AuthResponse al auth store.
  updateUsername: async (username: string): Promise<AuthResponse> => {
    const res = await apiClient.patch<ApiResponse<AuthResponse>>("/api/users/me/username", { username });
    return res.data.data;
  },

  // PATCH /api/users/me/avatar — avatarUrl viene de uploadService.upload(); null o "" borra el avatar
  updateAvatar: async (avatarUrl: string | null): Promise<void> => {
    await apiClient.patch<ApiResponse<null>>("/api/users/me/avatar", { avatarUrl });
  },

  // PATCH /api/users/me/password — requiere la contraseña actual (distinto del reset por OTP)
  updatePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.patch<ApiResponse<null>>("/api/users/me/password", { currentPassword, newPassword });
  },

  // POST /api/users/me/email/request-change — envía un OTP al correo nuevo
  requestEmailChange: async (currentPassword: string, newEmail: string): Promise<void> => {
    await apiClient.post<ApiResponse<null>>("/api/users/me/email/request-change", { currentPassword, newEmail });
  },

  // POST /api/users/me/email/confirm-change — valida el OTP recibido en el correo nuevo
  confirmEmailChange: async (otpCode: string): Promise<void> => {
    await apiClient.post<ApiResponse<null>>("/api/users/me/email/confirm-change", { otpCode });
  },
};
