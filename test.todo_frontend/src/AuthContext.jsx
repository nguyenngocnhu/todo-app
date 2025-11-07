import React, { createContext, useContext, useEffect, useState } from "react";
import api, { setAccessToken, doRefresh } from "./services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessTokenLocal, setAccessTokenLocal] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function silentRefresh() {
      try {
        const token = await doRefresh();
        setAccessToken(token);
        if (mounted) setAccessTokenLocal(token);
      } catch (err) {
        setAccessToken(null);
        if (mounted) setAccessTokenLocal(null);
      } finally {
        if (mounted) setInitializing(false);
      }
    }
    silentRefresh();
    return () => (mounted = false);
  }, []);

  async function login(username, password) {
    const res = await api.post("/auth/login", { username, password });
    const token = res.data?.accessToken ?? null;

    setAccessToken(token); 
    setAccessTokenLocal(token); 

    await new Promise((resolve) => setTimeout(resolve, 100));

    return res;
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // ignore
    }
    setAccessToken(null);
    setAccessTokenLocal(null);
    // navigate to login
    window.location.href = "/";
  }

  return (
    <AuthContext.Provider
      value={{
        accessToken: accessTokenLocal,
        isAuthenticated: !!accessTokenLocal,
        initializing,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
