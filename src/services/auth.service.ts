import apiClient from "./api.config";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  VerifyOtpRequest,
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
};
