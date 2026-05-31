import apiClient from "./api.config";
import type { ApiResponse } from "@/types";

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
};
