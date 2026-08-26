import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "@/services";
import { useAuthStore } from "@/store/authstore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) return;
    try {
      setIsLoading(true);
      setError(null);
      const auth = await authService.login({ identifier, password });
      login(auth);
      navigate("/chat", { replace: true });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "Credenciales incorrectas.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md dark:bg-gray-900">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">ZunoChat</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Inicia sesión para continuar
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Usuario o email"
            type="text"
            placeholder="username o correo@ejemplo.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <Link
            to="/forgot-password"
            className="-mt-2 self-end text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            ¿Olvidaste tu contraseña?
          </Link>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}
          <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
            Entrar
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          ¿No tienes cuenta?{" "}
          <Link
            to="/register"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
