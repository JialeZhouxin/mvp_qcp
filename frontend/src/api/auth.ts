import { apiRequest } from "./client";
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from "./generated/contracts";

export type RegisterPayload = RegisterRequest;
export type LoginPayload = LoginRequest;

export function register(payload: RegisterPayload): Promise<RegisterResponse> {
  return apiRequest("/api/auth/register", { method: "POST", body: payload });
}

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiRequest("/api/auth/login", { method: "POST", body: payload });
}
