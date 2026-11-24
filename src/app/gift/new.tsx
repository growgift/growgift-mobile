import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Banner, Button, Card, Chip, Field, H2, P, Row, Screen } from "../../components/ui";
import { api, type DeliveryMethod } from "../../lib/api";
import { friendly } from "../../lib/errors";
import { useSession } from "../../lib/session";
import { formatMoney } from "../../lib/portfolio";

const AMOUNTS = [25, 50, 100, 250];
const BOXES = [
  { sku: "BOX-CLASSIC", name: "Classic", desc: "Ticket + certificate frame", price: 12 },
  { sku: "BOX-DELUXE", name: "Deluxe", desc: "Classic + themed goodies", price: 29 },
  { sku: "BOX-GRAND", name: "Grand", desc: "Deluxe + keepsake wooden box", price: 49 },
];

export default function NewGift() {
  const { symbol, name } = useLocalSearchParams<{ symbol: string; name?: string }>();
  const { session } = useSession();
  const [amount, setAmount] = useState(50);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState<DeliveryMethod>("Email");
  const [box, setBox] = useState(BOXES[0].sku);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const dollars = custom ? Number(custom) : amount;
  const boxPrice = method === "Physical" ? BOXES.find((b) => b.sku === box)?.price ?? 0 : 0;

  async function pay() {
    setError(null);
    if (!symbol) return setError("Choose a company first.");
    if (!Number.isFinite(dollars) || dollars < 5 || dollars > 5000) return setError("Choose an amount between $5 and $5,000.");
    if (!recipientName.trim()) return setError("Who is the gift for?");
    if (method === "Email" && !/^\S+@\S+\.\S+$/.test(recipientEmail.trim())) return setError("Enter the recipient's email address.");
    setBusy(true);
    try {
      const order = await api.createGiftOrder({
        symbol,
        amount: dollars,
        currency: "AUD",
        recipientName: recipientName.trim(),
        message: message.trim(),
        deliveryMethod: method,
        boxSku: box,
        recipientEmail: recipientEmail.trim(),
      });
      setPlacedOrderId(order.id);
      const url = await api.createCheckoutSession(order.id);
      // Stripe's hosted page: card, Apple Pay and Google Pay. Card details never touch this app.
      await WebBrowser.openBrowserAsync(url);
      router.replace("/(tabs)/gifts");
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(code === "shipping_address.required" ? "Add a shipping address in Profile before ordering a gift box." : friendly(e));
    } finally {
      setBusy(false);
    }
  }

  if (session && !session.billingOk)
    return (
      <Screen>
        <Banner tone="warn">Your subscription needs attention before you can send new gifts.</Banner>
        <Button title="Manage subscription" onPress={() => router.push("/subscription")} />
      </Screen>
    );

  return (
    <Screen>
      <H2>{name ?? symbol}</H2>
      {error && <Banner tone="bad">{error}</Banner>}
      {placedOrderId && error && <P muted>Your order is saved in My gifts. You can finish paying from there.</P>}
      <P>How much?</P>
      <Row>
        {AMOUNTS.map((a) => (
          <Chip key={a} label={`$${a}`} selected={!custom && amount === a} onPress={() => { setCustom(""); setAmount(a); }} />
        ))}
      </Row>
      <Field label="Or enter an amount (AUD)" value={custom} onChangeText={setCustom} keyboardType="decimal-pad" placeholder="e.g. 75" />
      <P>How should it arrive?</P>
      <Row>
        <Chip label="By email" selected={method === "Email"} onPress={() => setMethod("Email")} />
        <Chip label="Gift box" selected={method === "Physical"} onPress={() => setMethod("Physical")} />
      </Row>
      {method === "Physical" &&
        BOXES.map((b) => (
          <Card key={b.sku} style={box === b.sku ? { borderColor: "#2F8F5B", borderWidth: 2 } : undefined}>
            <Row style={{ justifyContent: "space-between" }}>
              <H2>{b.name}</H2>
              <P>+${b.price}</P>
            </Row>
            <P muted>{b.desc}</P>
            <Button title={box === b.sku ? "Selected" : "Choose"} kind="secondary" onPress={() => setBox(b.sku)} />
          </Card>
        ))}
      <Field label="Recipient's name" value={recipientName} onChangeText={setRecipientName} autoCapitalize="words" />
      {method === "Email" && <Field label="Recipient's email" value={recipientEmail} onChangeText={setRecipientEmail} keyboardType="email-address" />}
      <Field label="Message (optional)" value={message} onChangeText={setMessage} multiline autoCapitalize="sentences" maxLength={300} />
      <Card>
        <P>Gift: {formatMoney(Number.isFinite(dollars) ? dollars : 0, "AUD")}</P>
        {boxPrice > 0 && <P>Gift box: {formatMoney(boxPrice, "AUD")}</P>}
        <P muted>Postage and service fees (if any) are added at checkout.</P>
      </Card>
      <Button title="Continue to payment" kind="ribbon" onPress={pay} busy={busy} />
      <P muted style={{ fontSize: 12 }}>Payment is handled on Stripe's secure page. Shares are bought when the gift is redeemed.</P>
    </Screen>
  );
}
