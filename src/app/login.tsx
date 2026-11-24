import { router } from "expo-router";
import { useState } from "react";
import { Banner, Button, Field, P, Screen } from "../components/ui";
import { api } from "../lib/api";
import { friendly } from "../lib/errors";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password) return setError("Enter your email (or child login code) and password (or PIN).");
    setBusy(true);
    setError(null);
    try {
      await api.login({ email: email.trim(), password });
      router.replace("/");
    } catch (e) {
      setError(friendly(e, "That didn't match. Check your details and try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <P muted>Children: use the login code and PIN your parent gave you.</P>
      {error && <Banner tone="bad">{error}</Banner>}
      <Field label="Email or login code" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" textContentType="username" />
      <Field label="Password or PIN" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" />
      <Button title="Sign in" onPress={submit} busy={busy} />
    </Screen>
  );
}
