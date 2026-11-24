import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/ui";
import { useSession } from "./session";
import { colors } from "./theme";

const KEY = "gg_app_lock";
const GRACE_MS = 60_000; // locking only after a minute in the background keeps quick app-switches painless

type Ctx = { available: boolean; enabled: boolean; setEnabled: (on: boolean) => Promise<boolean> };
const LockContext = createContext<Ctx>({ available: false, enabled: false, setEnabled: async () => false });
export const useAppLock = () => useContext(LockContext);

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const [covered, setCovered] = useState(false); // hides content in the app switcher
  const leftAt = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const hw = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setAvailable(hw && enrolled);
        setEnabledState((await SecureStore.getItemAsync(KEY)) === "1");
      } catch {
        setAvailable(false);
      }
    })();
  }, []);

  const unlock = useCallback(async () => {
    try {
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock GrowGift", cancelLabel: "Cancel" });
      if (r.success) setLocked(false);
    } catch {
      /* stay locked */
    }
  }, []);

  const active = enabled && !!session;

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (!active) return;
      if (s === "active") {
        setCovered(false);
        if (leftAt.current !== null && Date.now() - leftAt.current >= GRACE_MS) {
          setLocked(true);
          unlock();
        }
        leftAt.current = null;
      } else {
        setCovered(true);
        if (leftAt.current === null) leftAt.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [active, unlock]);

  useEffect(() => {
    if (!session) {
      setLocked(false);
      setCovered(false);
    }
  }, [session]);

  const setEnabled = useCallback(async (on: boolean) => {
    if (on) {
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Turn on app lock" });
      if (!r.success) return false;
    }
    try {
      if (on) await SecureStore.setItemAsync(KEY, "1");
      else await SecureStore.deleteItemAsync(KEY);
    } catch {
      return false;
    }
    setEnabledState(on);
    return true;
  }, []);

  return (
    <LockContext.Provider value={{ available, enabled, setEnabled }}>
      {children}
      {active && (locked || covered) && (
        <View style={s.cover} accessibilityViewIsModal>
          <Text style={s.title}>GrowGift</Text>
          {locked && (
            <>
              <Text style={s.sub}>Locked</Text>
              <Button title="Unlock" onPress={unlock} />
            </>
          )}
        </View>
      )}
    </LockContext.Provider>
  );
}

const s = StyleSheet.create({
  cover: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  title: { fontSize: 28, fontWeight: "800", color: colors.ink },
  sub: { color: colors.ink, opacity: 0.7 },
});
