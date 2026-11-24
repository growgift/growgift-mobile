import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text } from "react-native";
import { Banner, Button, Card, H1, H2, Loading, P, Row, Screen } from "../../components/ui";
import { api, type PortfolioView } from "../../lib/api";
import { friendly } from "../../lib/errors";
import {
  describeOrder,
  formatMoney,
  formatPercent,
  formatShares,
  holdingValueLabel,
  OPEN_ORDERS_EXPLAINER,
  pnlTone,
  portfolioTotals,
  redemptionStateLabel,
  type OpenOrder,
  type Redemption,
} from "../../lib/portfolio";
import { colors } from "../../lib/theme";

export default function Portfolio() {
  const [p, setP] = useState<PortfolioView | null>(null);
  const [open, setOpen] = useState<OpenOrder[]>([]);
  const [reds, setReds] = useState<Redemption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setP(await api.portfolio());
      api.openOrders().then((r) => setOpen(r.orders ?? [])).catch(() => setOpen([]));
      api.redemptions().then(setReds).catch(() => setReds([]));
    } catch (e) {
      setError(friendly(e, "We couldn't load your portfolio right now."));
      setP((x) => x ?? { hasAccount: false, cashBalance: 0, holdings: [] });
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!p) return <Screen><Loading /></Screen>;
  const totals = portfolioTotals(p.holdings);

  return (
    <Screen onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} refreshing={refreshing}>
      <H1>Portfolio</H1>
      {error && <Banner tone="bad">{error}</Banner>}
      {!p.hasAccount && !error && (
        <Banner tone="info">You don't have a brokerage account linked yet. Redeem a gift to get started.</Banner>
      )}
      {p.hasAccount && (
        <Card>
          <P muted>Total value</P>
          <Text style={{ fontSize: 32, fontWeight: "800", color: colors.ink }}>{formatMoney(totals.marketValue ?? 0)}</Text>
          <P muted>Cash {formatMoney(p.cashBalance)}</P>
          <Button title="Buy or sell" onPress={() => router.push("/trade")} />
        </Card>
      )}
      {p.holdings.map((h) => (
        <Card key={h.symbol}>
          <Row style={{ justifyContent: "space-between" }}>
            <H2>{h.symbol}</H2>
            <Text style={{ fontWeight: "700", color: colors.ink }}>{holdingValueLabel(h)}</Text>
          </Row>
          <P muted>{formatShares(h.quantity)} shares</P>
          {h.unrealisedPnlPercent != null && (
            <Text style={{ color: pnlTone(h.unrealisedPnlPercent) === "down" ? colors.bad : colors.leafDeep, fontWeight: "600" }}>
              {formatPercent(h.unrealisedPnlPercent)}
            </Text>
          )}
        </Card>
      ))}
      {open.length > 0 && (
        <>
          <H2>Open orders</H2>
          <P muted>{OPEN_ORDERS_EXPLAINER}</P>
          {open.map((o, i) => (
            <Card key={i}><P>{describeOrder(o)}</P></Card>
          ))}
        </>
      )}
      {reds.length > 0 && (
        <>
          <H2>Gift purchases</H2>
          {reds.map((r) => {
            const l = redemptionStateLabel(r.state);
            return <Card key={r.giftId}><P>{r.symbol}</P><Banner tone={l.tone === "ok" ? "good" : l.tone === "bad" ? "bad" : "info"}>{l.text}</Banner></Card>;
          })}
        </>
      )}
    </Screen>
  );
}
