"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "./api";
import { clearToken, getStoredToken, storeToken } from "./auth";
import type { User } from "./types";

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<User | null>(null);

  const setToken = (value: string | null) => {
    if (value) {
      storeToken(value);
    } else {
      clearToken();
    }
    setTokenState(value);
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    setUser(null);
    window.location.replace("/login");
  };

  useEffect(() => {
    if (!token) return;
    apiRequest<User>("/me", {}, token)
      .then(setUser)
      .catch(() => {
        clearToken();
        setTokenState(null);
        setUser(null);
      });
  }, [token]);

  return { token, user, setToken, setUser, logout };
}
