import apiClient from "./api.config";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  VerifyOtpRequest,
  ResendOtpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  GoogleAuthRequest,
  GoogleAuthResponse,
  CompleteGoogleRegistrationRequest,
  ApiResponse,
} from "@/types";

/*
 * EJEMPLO DE USO — LOGIN:
 *
 *   const auth = await authService.login({ identifier: 'juan', password: '1234' })
 *   // auth.token      → "eyJhbGci..."
 *   // auth.role       → "USER"
 *   // auth.username   → "juan"
 */
export const authService = {
  // POST /api/auth/login
  // identifier puede ser username o email
  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>(
      "/api/auth/login",
      payload,
    );
    return res.data.data;
  },

  // POST /api/auth/register
  // Retorna el OTP (en dev) o mensaje de confirmación
  register: async (payload: RegisterRequest): Promise<string> => {
    const res = await apiClient.post<ApiResponse<string>>(
      "/api/auth/register",
      payload,
    );
    return res.data.data;
  },

  // POST /api/auth/verify-otp
  // Activa la cuenta y devuelve JWT igual que login
  verifyOtp: async (payload: VerifyOtpRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>(
      "/api/auth/verify-otp",
      payload,
    );
    return res.data.data;
  },

  // POST /api/auth/resend-otp — para cuentas PENDING_VERIFICATION que no alcanzaron a verificar
  resendOtp: async (payload: ResendOtpRequest): Promise<void> => {
    await apiClient.post<ApiResponse<null>>("/api/auth/resend-otp", payload);
  },

  // POST /api/auth/google — paso 1 del login/registro con Google (authorization
  // code flow, ver lib/googleAuth.ts). needsUsername=true → falta completar el
  // alta con googleAuthComplete.
  googleAuth: async (payload: GoogleAuthRequest): Promise<GoogleAuthResponse> => {
    const res = await apiClient.post<ApiResponse<GoogleAuthResponse>>(
      "/api/auth/google",
      payload,
    );
    return res.data.data;
  },

  // POST /api/auth/google/complete — paso 2 (solo cuentas nuevas): el usuario
  // elige su username y se crea la cuenta.
  completeGoogleRegistration: async (
    payload: CompleteGoogleRegistrationRequest,
  ): Promise<AuthResponse> => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>(
      "/api/auth/google/complete",
      payload,
    );
    return res.data.data;
  },

  // POST /api/auth/forgot-password — respuesta genérica exista o no la cuenta
  forgotPassword: async (payload: ForgotPasswordRequest): Promise<void> => {
    await apiClient.post<ApiResponse<null>>("/api/auth/forgot-password", payload);
  },

  // POST /api/auth/reset-password
  resetPassword: async (payload: ResetPasswordRequest): Promise<void> => {
    await apiClient.post<ApiResponse<null>>("/api/auth/reset-password", payload);
  },

  // POST /api/auth/refresh — renueva el JWT antes/poco después de que expire
  refresh: async (currentToken: string): Promise<AuthResponse> => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>(
      "/api/auth/refresh",
      null,
      { headers: { Authorization: `Bearer ${currentToken}` } },
    );
    return res.data.data;
  },
};
