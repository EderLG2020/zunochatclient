import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "@/services";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Step = "request" | "reset" | "done";

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e.response?.data?.message ?? fallback;
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      await authService.forgotPassword({ email });
      setStep("reset");
    } catch (err: unknown) {
      setError(extractMessage(err, "No se pudo procesar la solicitud."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      await authService.resetPassword({ email, otpCode, newPassword });
      setStep("done");
    } catch (err: unknown) {
      setError(extractMessage(err, "Código incorrecto o expirado."));
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
            {step === "request" && "Recupera tu contraseña"}
            {step === "reset" && "Crea una nueva contraseña"}
            {step === "done" && "¡Listo!"}
          </p>
        </div>

        {step === "request" && (
          <form onSubmit={handleRequest} className="flex flex-col gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ingresa el correo de tu cuenta y te enviaremos un código para restablecer tu contraseña.
            </p>
            <Input
              label="Email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {error}
              </p>
            )}
            <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
              Enviar código
            </Button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 text-center dark:text-gray-400">
              Si <strong>{email}</strong> pertenece a una cuenta activa, te llegó un código de 6 dígitos.
            </p>
            <Input
              label="Código OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              required
            />
            <Input
              label="Nueva contraseña"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {error}
              </p>
            )}
            <Button type="submit" isLoading={isLoading} className="w-full">
              Restablecer contraseña
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep("request")} className="w-full">
              Volver
            </Button>
          </form>
        )}

        {step === "done" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 text-center dark:text-gray-400">
              Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <Button onClick={() => navigate("/login", { replace: true })} className="w-full">
              Ir a iniciar sesión
            </Button>
          </div>
        )}

        {step !== "done" && (
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <Link to="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              Volver a iniciar sesión
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
