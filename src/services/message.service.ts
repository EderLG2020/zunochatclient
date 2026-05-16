import apiClient from "./api.config";
import type {
  ApiResponse,
  MarkReadRequest,
  MessageResponse,
  Page,
  SendMessageRequest,
} from "@/types";

/*
 * EJEMPLOS DE USO:
 *
 * // Obtener mensajes (vienen en orden inverso, el hook los invierte)
 *   const page = await messageService.list(42)
 *   console.log(page.content)   // MessageResponse[]
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
  // GET /api/messages?conversationId=42&page=0&size=30
  // Los mensajes vienen más recientes primero → invertir antes de renderizar
  list: async (
    conversationId: number,
    page = 0,
    size = 30,
  ): Promise<Page<MessageResponse>> => {
    const res = await apiClient.get<ApiResponse<Page<MessageResponse>>>(
      "/api/messages",
      { params: { conversationId, page, size } },
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
};
