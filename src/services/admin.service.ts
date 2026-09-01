import apiClient from "./api.config";
import type {
  AdminAuditLogResponse,
  AdminUserResponse,
  ApiResponse,
  AssignRoleRequest,
  ModerateUserRequest,
  Page,
  Role,
  UserStatus,
} from "@/types";

export interface ListUsersParams {
  status?: UserStatus;
  role?: Role;
  search?: string;
  page?: number;
  size?: number;
}

export interface AuditLogParams {
  targetId?: number;
  actorId?: number;
  page?: number;
  size?: number;
}

export const adminService = {
  // GET /api/admin/usuarios — requiere permiso usuarios:ver (ADMIN/SUPERADMIN)
  list: async (params: ListUsersParams = {}): Promise<Page<AdminUserResponse>> => {
    const res = await apiClient.get<ApiResponse<Page<AdminUserResponse>>>("/api/admin/usuarios", {
      params: { page: 0, size: 20, ...params },
    });
    return res.data.data;
  },

  // PATCH /api/admin/usuarios/{id}/ban — requiere usuarios:bannear
  ban: async (userId: number, payload?: ModerateUserRequest): Promise<void> => {
    await apiClient.patch<ApiResponse<null>>(`/api/admin/usuarios/${userId}/ban`, payload ?? {});
  },

  // PATCH /api/admin/usuarios/{id}/activar — requiere usuarios:activar
  activate: async (userId: number): Promise<void> => {
    await apiClient.patch<ApiResponse<null>>(`/api/admin/usuarios/${userId}/activar`);
  },

  // DELETE /api/admin/usuarios/{id} — requiere usuarios:eliminar (soft delete)
  remove: async (userId: number): Promise<void> => {
    await apiClient.delete<ApiResponse<null>>(`/api/admin/usuarios/${userId}`);
  },

  // PATCH /api/admin/usuarios/{id}/rol — requiere roles:asignar (solo SUPERADMIN)
  assignRole: async (userId: number, payload: AssignRoleRequest): Promise<void> => {
    await apiClient.patch<ApiResponse<null>>(`/api/admin/usuarios/${userId}/rol`, payload);
  },

  // GET /api/admin/audit-log — requiere permiso auditoria:ver (ADMIN/SUPERADMIN)
  auditLog: async (params: AuditLogParams = {}): Promise<Page<AdminAuditLogResponse>> => {
    const res = await apiClient.get<ApiResponse<Page<AdminAuditLogResponse>>>("/api/admin/audit-log", {
      params: { page: 0, size: 20, ...params },
    });
    return res.data.data;
  },
};
