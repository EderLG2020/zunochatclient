import apiClient from "./api.config";
import type { ApiResponse } from "@/types";

interface UploadResponse {
  urls: string[];
}

export const uploadService = {
  // POST /api/uploads (multipart) — hasta 3 archivos, 5MB c/u (límites del backend)
  upload: async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const res = await apiClient.post<ApiResponse<UploadResponse>>("/api/uploads", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data.urls;
  },
};
