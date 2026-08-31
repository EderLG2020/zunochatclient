import { useState, type FormEvent } from "react";
import { authService } from "@/services";
import { requestGoogleCode } from "@/lib/googleAuth";
import type { AuthResponse } from "@/types";

type Step = "idle" | "pick-username";

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e.response?.data?.message ?? fallback;
}

/**
 * Lógica compartida por LoginPage y RegisterPage para el botón "Continuar
 * con Google": dispara el authorization code flow y, si la cuenta es nueva,
 * pasa a pedir el username antes de llamar a onSuccess con el AuthResponse
 * final — igual en ambas pantallas, así que vive acá en vez de duplicarse.
 */
export function useGoogleAuthFlow(onSuccess: (auth: AuthResponse) => void) {
  const [step, setStep] = useState<Step>("idle");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationToken, setRegistrationToken] = useState("");
  const [googleEmail, setGoogleEmail] = useState("");
  const [username, setUsername] = useState("");

  const start = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);
      const code = await requestGoogleCode();
      const result = await authService.googleAuth({ code });

      if (result.needsUsername) {
        setRegistrationToken(result.registrationToken!);
        setGoogleEmail(result.email!);
        setUsername(result.suggestedUsername ?? "");
        setStep("pick-username");
        return;
      }

      onSuccess(result.auth!);
    } catch (err: unknown) {
      setError(extractMessage(err, "No se pudo continuar con Google."));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const complete = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setIsCompleting(true);
      setError(null);
      const auth = await authService.completeGoogleRegistration({ registrationToken, username });
      onSuccess(auth);
    } catch (err: unknown) {
      setError(extractMessage(err, "No se pudo completar el registro."));
    } finally {
      setIsCompleting(false);
    }
  };

  const cancel = () => {
    setStep("idle");
    setError(null);
  };

  return {
    step,
    isGoogleLoading,
    isCompleting,
    error,
    setError,
    googleEmail,
    username,
    setUsername,
    start,
    complete,
    cancel,
  };
}
