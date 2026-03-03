import { apiRequest } from "./client";

export interface RegisterPayload {
  username: string;
  password: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export function register(payload: RegisterPayload): Promise<{ user_id: number; username: string }> {
  return apiRequest("/api/auth/register", { method: "POST", body: payload });
}

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiRequest("/api/auth/login", { method: "POST", body: payload });
}
