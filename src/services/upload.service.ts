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
      // El archivo viaja navegador → backend → Cloudinary (dos saltos), así
      // que el timeout global de 10s (api.config.ts) corta la subida antes de
      // tiempo con archivos grandes o conexiones lentas — sube el axios nunca
      // llega a ver una respuesta y el backend ni siquiera termina de leer el
      // request, así que no hay un error de negocio que mostrar.
      timeout: 60_000,
    });
    return res.data.data.urls;
  },
};
