import * as WebBrowser from "expo-web-browser";
import * as ScreenCapture from "expo-screen-capture";
import { useCallback, useEffect, useState } from "react";
import { Share } from "react-native";
import { useFocusEffect } from "expo-router";
import { Banner, Button, Card, H1, H2, Loading, mono, P, Row, Screen } from "../../components/ui";
import { Text } from "react-native";
import { api, type BuyerOrderSummary } from "../../lib/api";
import { friendly } from "../../lib/errors";
import { boxName, describeGiftOrder, orderRef, safeTrackingUrl, shipmentsByOrder, type ShipmentLite } from "../../lib/giftStatus";
import { formatMoney } from "../../lib/portfolio";
import { colors } from "../../lib/theme";

export default function MyGifts() {
  const [orders, setOrders] = useState<BuyerOrderSummary[] | null>(null);
  const [received, setReceived] = useState<Awaited<ReturnType<typeof api.receivedGifts>>>([]);
  const [ships, setShips] = useState<Record<string, ShipmentLite>>({});
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // While a redemption code is on screen, block screenshots and screen recording.
  const showingCode = Object.keys(codes).length > 0;
  useEffect(() => {
    if (!showingCode) return;
    ScreenCapture.preventScreenCaptureAsync("codes").catch(() => {});
    return () => { ScreenCapture.allowScreenCaptureAsync("codes").catch(() => {}); };
  }, [showingCode]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [o, r, s] = await Promise.all([api.myOrders(), api.receivedGifts().catch(() => []), api.myShipments().catch(() => [])]);
      setOrders(o);
      setReceived(r);
      setShips(shipmentsByOrder(s));
    } catch (e) {
      setError(friendly(e));
      setOrders((o) => o ?? []);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function reveal(id: string) {
    try {
      const r = await api.getRevealedCode(id);
      if (r.code) setCodes((c) => ({ ...c, [id]: r.code! }));
    } catch (e) {
      setError(friendly(e));
    }
  }

  async function payNow(id: string) {
    try {
      const url = await api.createCheckoutSession(id);
      await WebBrowser.openBrowserAsync(url);
      load();
    } catch (e) {
      setError(friendly(e));
    }
  }

  if (!orders) return <Screen><Loading /></Screen>;

  return (
    <Screen onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} refreshing={refreshing}>
      <H1>My gifts</H1>
      {error && <Banner tone="bad">{error}</Banner>}
      {orders.length === 0 && <P muted>You haven't sent a gift yet. Choose a collection on the Gift tab.</P>}
      {orders.map((o) => {
        const v = describeGiftOrder(o);
        const ship = ships[o.id];
        const track = safeTrackingUrl(ship?.trackingUrl);
        return (
          <Card key={o.id}>
            <Row style={{ justifyContent: "space-between" }}>
              <H2>{o.symbol}</H2>
              <Text style={{ fontWeight: "700", color: colors.ink }}>{formatMoney(o.totalAmount, o.currency)}</Text>
            </Row>
            <P>For {o.recipientName ?? "—"} · {o.deliveryMethod === "Physical" ? boxName(o.boxSku) ?? "Gift box" : "Email"}</P>
            <Banner tone={v.tone === "bad" ? "bad" : v.tone === "warn" ? "warn" : v.tone === "good" ? "good" : "info"}>{v.label}</Banner>
            {v.next && <P muted>{v.next}</P>}
            {ship && <P muted>Delivery: {ship.status}{ship.carrier ? ` · ${ship.carrier}` : ""}</P>}
            {track && <Button title="Track parcel" kind="secondary" onPress={() => WebBrowser.openBrowserAsync(track)} />}
            {!v.paid && (o.status === "Draft" || o.status === "AwaitingPayment") && <Button title="Pay now" kind="ribbon" onPress={() => payNow(o.id)} />}
            {v.canShowCode && !codes[o.id] && <Button title="Show redemption code" kind="secondary" onPress={() => reveal(o.id)} />}
            {codes[o.id] && (
              <>
                <Text selectable style={[mono, { fontSize: 20, fontWeight: "700", color: colors.ink }]}>{codes[o.id]}</Text>
                <Button title="Share code" onPress={() => Share.share({ message: `Your GrowGift code: ${codes[o.id]}` })} />
              </>
            )}
            <P muted style={{ fontSize: 12 }}>{orderRef(o.id)}</P>
          </Card>
        );
      })}
      {received.length > 0 && (
        <>
          <H2>Gifts you redeemed</H2>
          {received.map((g) => (
            <Card key={g.giftId}>
              <P>{g.symbol} · {formatMoney(g.amount, g.currency)}</P>
              <P muted>Redeemed {new Date(g.redeemedAtUtc).toLocaleDateString()}</P>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
