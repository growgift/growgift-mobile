import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Banner, Button, Card, Chip, Field, H2, P, Row, Screen } from "../components/ui";
import { api, type PortfolioView } from "../lib/api";
import { friendly } from "../lib/errors";
import { checkSell, describeState, ineligibleMessage, newIdempotencyKey, validateOrderForm, type OrderResult, type Side } from "../lib/trading";
import { formatShares } from "../lib/portfolio";

export default function Trade() {
  const params = useLocalSearchParams<{ symbol?: string }>();
  const [side, setSide] = useState<Side>("BUY");
  const [symbol, setSymbol] = useState(params.symbol ?? "");
  const [qty, setQty] = useState("");
  const [sellAll, setSellAll] = useState(false);
  const [p, setP] = useState<PortfolioView | null>(null);
  const [can, setCan] = useState<{ canTrade: boolean; reason: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderResult | null>(null);
  // One key per attempt: re-pressing the button after an uncertain result reuses it, so the order can never be doubled.
  const key = useRef(newIdempotencyKey());

  useEffect(() => {
    api.tradingStatus().then(setCan).catch(() => setCan({ canTrade: false, reason: "not_configured" }));
    api.portfolio().then(setP).catch(() => setP(null));
  }, []);

  const held = p?.holdings.find((h) => h.symbol === symbol.trim().toUpperCase())?.quantity ?? 0;

  // Any edit starts a new, separate order: clear the last result and use a fresh idempotency key.
  function touch() {
    setResult(null);
    key.current = newIdempotencyKey();
  }
  const changed =
    <A extends unknown[]>(fn: (...a: A) => void) =>
    (...a: A) => {
      fn(...a);
      touch();
    };

  async function submit() {
    setError(null);
    let quantity: number;
    let all = false;
    if (side === "SELL") {
      const c = checkSell(held, sellAll ? "all" : "part", qty);
      if (!c.ok) return setError(c.message);
      quantity = c.quantity;
      all = c.sellAll;
    } else {
      const v = validateOrderForm({ side, symbol, quantity: qty }, p?.holdings);
      if (!v.ok) return setError(v.message);
      quantity = v.quantity;
    }
    setBusy(true);
    try {
      setResult(await api.placeOrder({ side, symbol: symbol.trim().toUpperCase(), quantity, sellAll: all || undefined }, key.current));
    } catch (e) {
      setError(friendly(e, "We couldn't place this order."));
    } finally {
      setBusy(false);
    }
  }

  if (can && !can.canTrade) return <Screen><Banner tone="warn">{ineligibleMessage(can.reason).text}</Banner></Screen>;

  const view = result ? describeState(result.state) : null;
  return (
    <Screen>
      <Row>
        <Chip label="Buy" selected={side === "BUY"} onPress={changed(() => setSide("BUY"))} />
        <Chip label="Sell" selected={side === "SELL"} onPress={changed(() => setSide("SELL"))} />
      </Row>
      <Field label="Ticker symbol" value={symbol} onChangeText={changed(setSymbol)} autoCapitalize="characters" placeholder="e.g. RBLX" />
      {side === "SELL" && <P muted>You hold {formatShares(held)} shares.</P>}
      {side === "SELL" && (
        <Row>
          <Chip label="Sell everything" selected={sellAll} onPress={changed(() => setSellAll(!sellAll))} />
        </Row>
      )}
      {!(side === "SELL" && sellAll) && (
        <Field label={side === "BUY" ? "Shares (whole numbers)" : "Shares to sell"} value={qty} onChangeText={changed(setQty)} keyboardType="decimal-pad" />
      )}
      {error && <Banner tone="bad">{error}</Banner>}
      {view && result && (
        <Card>
          <H2>{view.title}</H2>
          <P>{result.message}</P>
          {result.orderRef ? <P muted>Reference {result.orderRef}</P> : null}
          {result.state === "unconfirmed" && <Banner tone="warn">Check your open orders on the Portfolio tab before trying again. Pressing the button again will not create a second order.</Banner>}
        </Card>
      )}
      <Button title={side === "BUY" ? "Place buy order" : "Place sell order"} onPress={submit} busy={busy} disabled={!!result && describeState(result.state).final} />
      <P muted style={{ fontSize: 12 }}>Market orders fill at the market price when US markets are open. Accepted does not mean executed.</P>
    </Screen>
  );
}
