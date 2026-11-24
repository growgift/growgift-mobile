import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { Banner, Button, Card, H2, Loading, P, Screen } from "../components/ui";
import { api } from "../lib/api";
import { checkoutErrorMessage, describeSubscription, planSummary, cardRuleNote, type SubscriptionView } from "../lib/billing";
import { friendly } from "../lib/errors";

export default function Subscription() {
  const [v, setV] = useState<SubscriptionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      await api.syncSubscription().catch(() => {});
      setV(await api.subscription());
    } catch (e) {
      setError(friendly(e));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function go(kind: "subscribe" | "manage") {
    setBusy(true);
    setError(null);
    try {
      const url = kind === "subscribe" ? await api.startSubscriptionCheckout() : await api.openBillingPortal();
      await WebBrowser.openBrowserAsync(url); // Stripe-hosted; card details never touch this app
      await load();
    } catch (e) {
      setError(checkoutErrorMessage((e as { code?: string }).code) || friendly(e));
    } finally {
      setBusy(false);
    }
  }

  if (!v && !error) return <Screen><Loading /></Screen>;
  if (!v) return <Screen><Banner tone="bad">{error}</Banner></Screen>;
  if (!v.required) return <Screen><Card><H2>No subscription needed</H2><P muted>Your account type doesn't need a subscription.</P></Card></Screen>;
  const d = describeSubscription(v);
  return (
    <Screen>
      {error && <Banner tone="bad">{error}</Banner>}
      <Card>
        <H2>{d.headline}</H2>
        <P>{d.detail}</P>
        <P muted>{planSummary(v)}</P>
        <P muted>{cardRuleNote(v.minCardMonths)}</P>
      </Card>
      {d.action === "subscribe" && <Button title="Add a card" onPress={() => go("subscribe")} busy={busy} />}
      {d.action === "manage" && <Button title="Manage subscription" kind="secondary" onPress={() => go("manage")} busy={busy} />}
    </Screen>
  );
}
