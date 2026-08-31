import apiClient from "./api.config";
import type {
  ApiResponse,
  ConversationResponse,
  CreateConversationRequest,
  CreateGroupRequest,
  MuteConversationRequest,
  Page,
  SetEphemeralRequest,
} from "@/types";

/*
 * EJEMPLO DE USO — OBTENER CONVERSACIONES:
 *
 *   const page = await conversationService.list()
 *   page.content.forEach(conv => {
 *     console.log(conv.otherUsername, conv.lastMessagePreview, conv.unreadCount)
 *   })
 */
export const conversationService = {
  // GET /api/conversations?page=0&size=20
  // El backend extrae el userId del JWT — no hace falta pasarlo
  list: async (page = 0, size = 20): Promise<Page<ConversationResponse>> => {
    const res = await apiClient.get<ApiResponse<Page<ConversationResponse>>>(
      "/api/conversations",
      { params: { page, size } },
    );
    return res.data.data;
  },

  // POST /api/conversations
  // Si ya existe una conversación con ese usuario, la retorna sin duplicar
  create: async (
    payload: CreateConversationRequest,
  ): Promise<ConversationResponse> => {
    const res = await apiClient.post<ApiResponse<ConversationResponse>>(
      "/api/conversations",
      payload,
    );
    return res.data.data;
  },

  // POST /api/conversations/group
  createGroup: async (payload: CreateGroupRequest): Promise<ConversationResponse> => {
    const res = await apiClient.post<ApiResponse<ConversationResponse>>(
      "/api/conversations/group",
      payload,
    );
    return res.data.data;
  },

  // PATCH /api/conversations/{id}/mute
  setMuted: async (
    conversationId: number,
    payload: MuteConversationRequest,
  ): Promise<ConversationResponse> => {
    const res = await apiClient.patch<ApiResponse<ConversationResponse>>(
      `/api/conversations/${conversationId}/mute`,
      payload,
    );
    return res.data.data;
  },

  // PATCH /api/conversations/{id}/ephemeral
  setEphemeral: async (
    conversationId: number,
    payload: SetEphemeralRequest,
  ): Promise<ConversationResponse> => {
    const res = await apiClient.patch<ApiResponse<ConversationResponse>>(
      `/api/conversations/${conversationId}/ephemeral`,
      payload,
    );
    return res.data.data;
  },
};
