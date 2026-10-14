import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api";
import { registerForPushNotifications } from "./push";

export type User = {
  id: number;
  email: string;
  role: "student" | "admin";
  is_verified: boolean;
  two_factor_enabled: boolean;
};

type LoginResponse = {
  access_token: string;
  user: User;
  requires_2fa?: boolean;
  two_factor_token?: string | null;
};

type AuthContextValue = {
  token: string | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<LoginResponse>;
  verifyTwoFactor: (challenge: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const TOKEN_KEY = "erasmus-mobile-token";
const USER_KEY = "erasmus-mobile-user";
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([SecureStore.getItemAsync(TOKEN_KEY), SecureStore.getItemAsync(USER_KEY)])
      .then(async ([storedToken, storedUser]) => {
        if (!storedToken || !storedUser) return;
        try {
          const currentUser = await apiRequest<User>("/me", {}, storedToken);
          setToken(storedToken);
          setUser(currentUser);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(currentUser));
        } catch (error: unknown) {
          if (error instanceof Error && error.name === "AuthenticationError") {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(USER_KEY);
            return;
          }
          throw error;
        }
      })
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const saveSession = async (nextToken: string, nextUser: User) => {
    await SecureStore.setItemAsync(TOKEN_KEY, nextToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    void registerForPushNotifications(nextToken);
  };

  const signIn = async (email: string, password: string) => {
    const response = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (!response.requires_2fa) {
      await saveSession(response.access_token, response.user);
    }
    return response;
  };

  const verifyTwoFactor = async (challenge: string, code: string) => {
    const response = await apiRequest<LoginResponse>("/auth/verify-2fa", {
      method: "POST",
      body: JSON.stringify({ two_factor_token: challenge, code }),
    });
    await saveSession(response.access_token, response.user);
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setToken(null);
    setUser(null);
  };
  const refreshUser = async () => {
    if (!token) return;
    const nextUser = await apiRequest<User>("/me", {}, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const value = useMemo(
    () => ({ token, user, loading, signIn, verifyTwoFactor, signOut, refreshUser }),
    [token, user, loading]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
