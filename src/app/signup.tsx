import { router } from "expo-router";
import { useState } from "react";
import { Banner, Button, Card, Chip, Field, H2, P, Row, Screen } from "../components/ui";
import { api, type ShippingAddress } from "../lib/api";
import { friendly } from "../lib/errors";

type Role = "buyer" | "recipient" | "parent";
const roles: { key: Role; label: string; help: string }[] = [
  { key: "buyer", label: "Send a gift", help: "Buy shares as a gift for someone. No identity check needed." },
  { key: "recipient", label: "Receive a gift", help: "Redeem a gift code. You'll verify your identity with our broker." },
  { key: "parent", label: "Family", help: "Manage children's savings, chores and rewards." },
];

const emptyAddress: ShippingAddress = { fullName: "", line1: "", line2: "", city: "", region: "", postalCode: "", countryCode: "AU", phone: "" };

export default function Signup() {
  const [role, setRole] = useState<Role>("buyer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState<ShippingAddress>(emptyAddress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const set = (patch: Partial<ShippingAddress>) => setAddress((a) => ({ ...a, ...patch }));

  async function submit() {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (password.length < 12) return setError("Use a password of at least 12 characters.");
    if (role === "buyer" && !(address.fullName && address.line1 && address.city && address.region && address.postalCode))
      return setError("Add your shipping address so we can send gift boxes.");
    setBusy(true);
    try {
      const r = await api.register({ email: email.trim(), password, role, shippingAddress: role === "buyer" ? address : undefined });
      setDone(r.message || "Check your email to verify your account, then sign in.");
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <Screen>
        <H2>Almost there</H2>
        <Banner tone="good">{done}</Banner>
        {role !== "buyer" && <P muted>After you sign in, you can add a card for your subscription. Nothing is charged for the first 3 months.</P>}
        <Button title="Go to sign in" onPress={() => router.replace("/login")} />
      </Screen>
    );

  return (
    <Screen>
      <H2>What would you like to do?</H2>
      <Row>{roles.map((r) => <Chip key={r.key} label={r.label} selected={role === r.key} onPress={() => setRole(r.key)} />)}</Row>
      <P muted>{roles.find((r) => r.key === role)?.help}</P>
      {error && <Banner tone="bad">{error}</Banner>}
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
      <Field label="Password (12+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      {role === "buyer" && (
        <Card>
          <H2>Shipping address</H2>
          <Field label="Full name" value={address.fullName} onChangeText={(v) => set({ fullName: v })} autoCapitalize="words" />
          <Field label="Address line 1" value={address.line1} onChangeText={(v) => set({ line1: v })} autoCapitalize="words" />
          <Field label="Address line 2 (optional)" value={address.line2 ?? ""} onChangeText={(v) => set({ line2: v })} autoCapitalize="words" />
          <Field label="Suburb / city" value={address.city} onChangeText={(v) => set({ city: v })} autoCapitalize="words" />
          <Field label="State" value={address.region} onChangeText={(v) => set({ region: v.toUpperCase() })} autoCapitalize="characters" />
          <Field label="Postcode" value={address.postalCode} onChangeText={(v) => set({ postalCode: v })} keyboardType="number-pad" />
          <Field label="Phone (optional)" value={address.phone ?? ""} onChangeText={(v) => set({ phone: v })} keyboardType="phone-pad" />
        </Card>
      )}
      <Button title="Create account" onPress={submit} busy={busy} />
    </Screen>
  );
}
