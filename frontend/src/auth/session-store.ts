import { clearToken, getToken, setToken } from "./token";

export function getAccessToken(): string | null {
  return getToken();
}

export function storeAccessToken(token: string): string {
  setToken(token);
  return token;
}

export function clearAccessToken(): void {
  clearToken();
}
