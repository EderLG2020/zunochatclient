import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { adminService } from "@/services";
import { useAuthStore } from "@/store/authstore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import type { AdminUserResponse, Role, UserStatus } from "@/types";

const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING_VERIFICATION: "Pendiente",
  ACTIVE: "Activo",
  BANNED: "Baneado",
  INACTIVE: "Inactivo",
  DELETED: "Eliminado",
};
const STATUS_COLOR: Record<UserStatus, string> = {
  PENDING_VERIFICATION: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  BANNED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  INACTIVE: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  DELETED: "bg-gray-200 text-gray-500 dark:bg-gray-900 dark:text-gray-500",
};

export function AdminPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isSuperadmin = currentUser?.role === "SUPERADMIN";
  const isAuthorized = currentUser?.role === "ADMIN" || isSuperadmin;

  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await adminService.list({
        page,
        size: 15,
        search: search || undefined,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
      });
      setUsers(result.content);
      setTotalPages(result.totalPages);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "No se pudo cargar la lista de usuarios.");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, roleFilter]);

  // Ref para que el efecto dispare la carga sin que el linter de reglas de
  // pureza intente rastrear el setState que ocurre dentro de `load` — mismo
  // patrón que useConversations/useMessages en este mismo proyecto.
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { void loadRef.current(); }, [page, search, statusFilter, roleFilter]);

  if (!isAuthorized) return <Navigate to="/chat" replace />;

  const withAction = async (userId: number, action: () => Promise<void>) => {
    try {
      setActingOn(userId);
      await action();
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "No se pudo completar la acción.");
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">Panel de administración</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser?.username} · {currentUser?.role}</p>
        </div>
        <Link to="/chat" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          Volver al chat
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="w-56">
          <Input
            label="Buscar"
            placeholder="username o email"
            value={search}
            onChange={(e) => { setPage(0); setSearch(e.target.value); }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => { setPage(0); setStatusFilter(e.target.value as UserStatus | ""); }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Todos</option>
            {(Object.keys(STATUS_LABEL) as UserStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rol</label>
          <select
            value={roleFilter}
            onChange={(e) => { setPage(0); setRoleFilter(e.target.value as Role | ""); }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Todos</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SUPERADMIN">SUPERADMIN</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="mx-6 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">{error}</p>
      )}

      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : users.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">No se encontraron usuarios.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-400 dark:border-gray-800">
                <th className="py-2 pr-4">Usuario</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Rol</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4">Registrado</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.username === currentUser?.username;
                const targetIsSuperadmin = u.role === "SUPERADMIN";
                const canModerate = !isSelf && !targetIsSuperadmin && (isSuperadmin || u.role === "USER");
                const busy = actingOn === u.id;

                return (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-900">
                    <td className="py-2.5 pr-4 font-medium text-gray-900 dark:text-gray-100">{u.username}</td>
                    <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      {isSuperadmin && canModerate ? (
                        <select
                          defaultValue={u.role}
                          disabled={busy}
                          onChange={(e) =>
                            withAction(u.id, () => adminService.assignRole(u.id, { role: e.target.value }))
                          }
                          className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{u.role}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[u.status]}`}>
                        {STATUS_LABEL[u.status]}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString("es")}</td>
                    <td className="py-2.5 pr-4">
                      {!canModerate ? (
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      ) : (
                        <div className="flex gap-2">
                          {u.status === "BANNED" ? (
                            <Button
                              variant="secondary"
                              className="!px-2 !py-1 text-xs"
                              isLoading={busy}
                              onClick={() => withAction(u.id, () => adminService.activate(u.id))}
                            >
                              Reactivar
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              className="!px-2 !py-1 text-xs"
                              isLoading={busy}
                              onClick={() => withAction(u.id, () => adminService.ban(u.id, {}))}
                            >
                              Banear
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            className="!px-2 !py-1 text-xs"
                            isLoading={busy}
                            onClick={() => {
                              if (confirm(`¿Eliminar la cuenta de ${u.username}? Esta acción no se puede deshacer desde aquí.`))
                                void withAction(u.id, () => adminService.remove(u.id));
                            }}
                          >
                            Eliminar
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 border-t border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
          <Button variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <span className="text-xs text-gray-500 dark:text-gray-400">Página {page + 1} de {totalPages}</span>
          <Button variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
        </div>
      )}
    </div>
  );
}
