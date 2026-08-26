import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "@/services";
import { useAuthStore } from "@/store/authstore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Step = "register" | "verify-otp";
const RESEND_COOLDOWN_SECONDS = 60;

export function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [step, setStep] = useState<Step>("register");
  const [dni, setDni] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1_000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendOtp = async () => {
    try {
      setIsResending(true);
      setError(null);
      await authService.resendOtp({ email });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "No se pudo reenviar el código.");
    } finally {
      setIsResending(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      await authService.register({ dni, username, email, password });
      setStep("verify-otp");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "Error al registrar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      const auth = await authService.verifyOtp({ email, otpCode });
      login(auth);
      navigate("/chat", { replace: true });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "OTP incorrecto o expirado.");
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
            {step === "register" ? "Crea tu cuenta" : "Verifica tu email"}
          </p>
        </div>

        {step === "register" ? (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <Input
              label="DNI"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              required
            />
            <Input
              label="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {error}
              </p>
            )}
            <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
              Registrarme
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 text-center dark:text-gray-400">
              Ingresa el código enviado a <strong>{email}</strong>
            </p>
            <Input
              label="Código OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              required
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {error}
              </p>
            )}
            <Button type="submit" isLoading={isLoading} className="w-full">
              Verificar
            </Button>
            <Button
              type="button"
              variant="ghost"
              isLoading={isResending}
              disabled={resendCooldown > 0}
              onClick={handleResendOtp}
              className="w-full"
            >
              {resendCooldown > 0 ? `Reenviar código (${resendCooldown}s)` : "Reenviar código"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("register");
                setError(null);
              }}
              className="w-full"
            >
              Volver
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          ¿Ya tienes cuenta?{" "}
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
