import apiClient from "./api.config";
import type {
  ApiResponse,
  EditMessageRequest,
  MarkReadRequest,
  MessageCursorPage,
  MessageResponse,
  SendMessageRequest,
} from "@/types";

/*
 * EJEMPLOS DE USO:
 *
 * // Obtener mensajes más recientes (vienen en orden inverso, el hook los invierte)
 *   const page = await messageService.list(42)
 *   console.log(page.content)   // MessageResponse[]
 *
 * // Obtener mensajes anteriores a un cursor (scroll hacia el pasado)
 *   const older = await messageService.list(42, page.nextCursor)
 *
 * // Enviar mensaje de texto
 *   const msg = await messageService.send({
 *     conversationId: 42,
 *     type: 'TEXT',
 *     textContent: 'Hola!',
 *   })
 *
 * // Enviar archivo (URLs ya subidas al storage)
 *   const msg = await messageService.send({
 *     conversationId: 42,
 *     type: 'FILE',
 *     fileUrls: ['https://storage.ejemplo.com/archivo.pdf'],
 *   })
 *
 * // Marcar como leídos (doble check azul)
 *   await messageService.markRead({ conversationId: 42 })
 */
export const messageService = {
  // GET /api/messages?conversationId=42&beforeId=&size=30
  // Paginación por cursor: sin beforeId trae los más recientes; con beforeId,
  // los `size` mensajes anteriores a ese id. Vienen más recientes primero → el hook invierte.
  list: async (
    conversationId: number,
    beforeId?: number | null,
    size = 30,
  ): Promise<MessageCursorPage> => {
    const res = await apiClient.get<ApiResponse<MessageCursorPage>>(
      "/api/messages",
      { params: { conversationId, beforeId: beforeId ?? undefined, size } },
    );
    return res.data.data;
  },

  // POST /api/messages
  // El receptor se infiere desde la conversación
  send: async (payload: SendMessageRequest): Promise<MessageResponse> => {
    const res = await apiClient.post<ApiResponse<MessageResponse>>(
      "/api/messages",
      payload,
    );
    return res.data.data;
  },

  // PATCH /api/messages/read
  markRead: async (payload: MarkReadRequest): Promise<string> => {
    const res = await apiClient.patch<ApiResponse<string>>(
      "/api/messages/read",
      payload,
    );
    return res.data.data;
  },

  // PATCH /api/messages/{id} — solo texto, solo el emisor, ventana de 15 min
  edit: async (messageId: number, payload: EditMessageRequest): Promise<MessageResponse> => {
    const res = await apiClient.patch<ApiResponse<MessageResponse>>(`/api/messages/${messageId}`, payload);
    return res.data.data;
  },

  // DELETE /api/messages/{id} — soft delete, solo el emisor
  delete: async (messageId: number): Promise<MessageResponse> => {
    const res = await apiClient.delete<ApiResponse<MessageResponse>>(`/api/messages/${messageId}`);
    return res.data.data;
  },
};
