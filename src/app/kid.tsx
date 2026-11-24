import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Banner, Button, Card, H1, H2, Loading, P, Screen } from "../components/ui";
import { api } from "../lib/api";
import { friendly } from "../lib/errors";
import { formatMoney } from "../lib/portfolio";
import { useSession } from "../lib/session";

type View = Awaited<ReturnType<typeof api.getChildView>>;

export default function Kid() {
  const { signOut } = useSession();
  const [v, setV] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { api.getChildView().then(setV).catch((e) => setError(friendly(e))); }, []));
  if (!v && !error) return <Screen><Loading /></Screen>;
  return (
    <Screen>
      {error && <Banner tone="bad">{error}</Banner>}
      {v && (
        <>
          <H1>Hi {v.name}! 👋</H1>
          <Card><H2>🌱 Short-term jar</H2><P>{formatMoney(v.jars.shortTerm, v.jars.currency)}</P></Card>
          <Card><H2>🌳 Medium-term jar</H2><P>{formatMoney(v.jars.mediumTerm, v.jars.currency)}</P></Card>
          <Card><H2>🏔️ Long-term jar</H2><P>{formatMoney(v.jars.longTerm, v.jars.currency)}</P></Card>
          {v.pendingTasks.length > 0 && <H2>My chores</H2>}
          {v.pendingTasks.map((t) => <Card key={t.id}><P>{t.title} · {formatMoney(t.reward, v.jars.currency)}</P></Card>)}
          {v.giftedShares.length > 0 && <H2>Gifts for me</H2>}
          {v.giftedShares.map((g, i) => <Card key={i}><P>{g.symbol} · {formatMoney(g.amount, g.currency)}</P></Card>)}
        </>
      )}
      <Button title="Sign out" kind="secondary" onPress={() => signOut()} />
    </Screen>
  );
}
