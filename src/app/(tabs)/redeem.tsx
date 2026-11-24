import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Banner, Button, Card, Field, H1, H2, P, Screen } from "../../components/ui";
import { api, getToken } from "../../lib/api";
import { actionFor, needsBrokerageCheck, STATUS_UNAVAILABLE, waitForApproval, type GateAction } from "../../lib/brokerageGate";
import { friendly } from "../../lib/errors";
import { parseSession } from "../../lib/jwt";
import { formatMoney } from "../../lib/portfolio";
import { isValidCodeShape } from "../../lib/redemption";
import { useSession } from "../../lib/session";
import { WEB_BASE } from "../../lib/config";

type Preview = Awaited<ReturnType<typeof api.previewGift>>;

function normalise(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/^GG/, "").replace(/(.{4})(?=.)/g, "$1-").slice(0, 14).replace(/^/, "GG-");
}

export default function Redeem() {
  const { session } = useSession();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<GateAction | null>(null);
  const [done, setDone] = useState<{ symbol: string; amount: number; currency: string } | null>(null);

  // A code arriving from the QR scanner or a growgift://redeem?code=... link.
  useEffect(() => {
    if (params.code) {
      const c = normalise(params.code);
      if (isValidCodeShape(c)) {
        setCode(c);
        void check(c);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code]);

  async function check(c = code) {
    setError(null);
    setPreview(null);
    if (!isValidCodeShape(c)) return setError("That doesn't look like a GrowGift code. It looks like GG-XXXX-XXXX-XXXX.");
    setBusy(true);
    try {
      setPreview(await api.previewGift(c));
    } catch (e) {
      // Wrong and unknown codes look the same on purpose.
      setError(friendly(e, "We couldn't find that code. Check it and try again."));
    } finally {
      setBusy(false);
    }
  }

  async function redeem() {
    if (!session) return;
    setBusy(true);
    setError(null);
    setGate(null);
    try {
      if (needsBrokerageCheck(session)) {
        let action: GateAction;
        try {
          action = actionFor((await api.resolveExistingAccount()).decision);
        } catch {
          action = STATUS_UNAVAILABLE;
        }
        if (action.kind === "stop") return setGate(action);
        if (action.kind === "onboard") {
          // The identity application is long and handled on the website (same account, same secure session).
          setGate({
            kind: "stop",
            title: "Verify your identity first",
            message: "To receive shares you need a brokerage account. We'll open the secure form; come back here when you're done. Your gift stays saved.",
            retryable: true,
          });
          await WebBrowser.openBrowserAsync(`${WEB_BASE}/onboarding`);
          return;
        }
        const ok = await waitForApproval(async () => {
          await api.refreshSession();
          const s = parseSession(getToken());
          return !!s && !needsBrokerageCheck(s);
        });
        if (!ok) return setGate({ kind: "stop", title: "Almost there", message: "We found your brokerage account and are finishing linking it. Your gift is saved — try again in a moment.", retryable: true });
      }
      const r = await api.redeemGift({ code });
      setDone({ symbol: r.symbol, amount: r.amount, currency: r.currency });
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <Screen>
        <H1>Gift redeemed! 🎉</H1>
        <Banner tone="good">
          {formatMoney(done.amount, done.currency)} of {done.symbol} is being bought into your brokerage account. It can take a little while to show in your portfolio.
        </Banner>
        <Button title="View portfolio" onPress={() => router.replace("/(tabs)/portfolio")} />
      </Screen>
    );

  return (
    <Screen>
      <H1>Redeem a gift</H1>
      <Button title="Scan the QR code" kind="secondary" onPress={() => router.push("/scan")} />
      <Field label="Or type your code" value={code} onChangeText={(t) => setCode(normalise(t))} autoCapitalize="characters" placeholder="GG-XXXX-XXXX-XXXX" autoCorrect={false} />
      {error && <Banner tone="bad">{error}</Banner>}
      {!preview && <Button title="Check code" onPress={() => check()} busy={busy} />}
      {preview && (
        <Card>
          <H2>{preview.recipientName ? `For ${preview.recipientName}` : "Your gift"}</H2>
          <P>{formatMoney(preview.amount, preview.currency)} of {preview.symbol}</P>
          {preview.greetingMessage ? <P muted>“{preview.greetingMessage}”</P> : null}
          {preview.status !== "Issued" ? <Banner tone="warn">This gift can't be redeemed (status: {preview.status}).</Banner> : <Button title="Redeem" kind="ribbon" onPress={redeem} busy={busy} />}
        </Card>
      )}
      {gate && gate.kind === "stop" && (
        <Banner tone="warn">{gate.title}. {gate.message}</Banner>
      )}
    </Screen>
  );
}
