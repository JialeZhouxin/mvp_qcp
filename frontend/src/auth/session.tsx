import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { clearAccessToken, getAccessToken, storeAccessToken } from "./session-store";

interface AuthSessionValue {
  readonly token: string | null;
  readonly isAuthenticated: boolean;
  readonly login: (token: string) => void;
  readonly logout: () => void;
}

const AuthSessionContext = createContext<AuthSessionValue | null>(null);

interface AuthSessionProviderProps {
  readonly children: ReactNode;
}

export function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  const [token, setToken] = useState<string | null>(() => getAccessToken());

  const value = useMemo<AuthSessionValue>(
    () => ({
      token,
      isAuthenticated: token !== null,
      login: (nextToken: string) => {
        setToken(storeAccessToken(nextToken));
      },
      logout: () => {
        clearAccessToken();
        setToken(null);
      },
    }),
    [token],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionValue {
  const context = useContext(AuthSessionContext);
  if (context === null) {
    throw new Error("AuthSessionProvider is required");
  }
  return context;
}
