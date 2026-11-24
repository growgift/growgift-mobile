import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { hydrateToken, onTokenChange, api, getToken } from "./api";
import { loadToken } from "./storage";
import { parseSession, type Session } from "./jwt";

type Ctx = {
  ready: boolean;
  session: Session | null;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx>({ ready: false, session: null, signOut: async () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadToken().then((t) => {
      if (!alive) return;
      hydrateToken(t);
      setTokenState(t);
      setReady(true);
    });
    const off = onTokenChange((t) => setTokenState(t));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const session = useMemo(() => parseSession(token), [token]);

  // An expired token ends the session at the moment it expires, not on the next failed request.
  useEffect(() => {
    if (!session?.expiresAt) return;
    const ms = session.expiresAt - Date.now();
    if (ms <= 0) {
      api.logout();
      return;
    }
    const t = setTimeout(() => api.logout(), Math.min(ms, 2_147_000_000));
    return () => clearTimeout(t);
  }, [session?.expiresAt]);

  const signOut = useCallback(async () => {
    await api.logout();
  }, []);

  return <SessionContext.Provider value={{ ready, session, signOut }}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
export { getToken };
