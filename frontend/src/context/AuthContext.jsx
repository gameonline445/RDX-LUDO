import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ app_name: "MY LUDO", referral_percent: 2 });

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      setWallet(data.wallet);
      setTotalBalance(data.total_balance);
    } catch {
      setUser(null);
      setWallet(null);
      setTotalBalance(0);
      localStorage.removeItem("token");
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/settings/public");
        setSettings(data);
      } catch {}
      if (localStorage.getItem("token")) await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = async (token, u) => {
    localStorage.setItem("token", token);
    setUser(u);
    await refresh();
  };
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setWallet(null);
  };

  return (
    <AuthCtx.Provider value={{ user, wallet, totalBalance, loading, settings, login, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
