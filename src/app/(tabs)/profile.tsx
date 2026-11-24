import * as WebBrowser from "expo-web-browser";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Banner, Button, Card, H1, H2, Loading, P, Screen } from "../../components/ui";
import { api, type Me } from "../../lib/api";
import { WEB_BASE } from "../../lib/config";
import { friendly } from "../../lib/errors";
import { useSession } from "../../lib/session";

export default function Profile() {
  const { session, signOut } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    api.me().then(setMe).catch((e) => setError(friendly(e)));
  }, []));

  if (!me && !error) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <H1>Profile</H1>
      {error && <Banner tone="bad">{error}</Banner>}
      {me && (
        <Card>
          <H2>{me.email}</H2>
          <P muted>Account type: {me.role}</P>
          <P muted>Email {me.emailVerified ? "verified" : "not verified yet"}</P>
          <P muted>Identity verification: {me.kycStatus}</P>
          {session && !session.billingOk && <Banner tone="warn">Your subscription needs attention. New gift purchases and new family features are paused.</Banner>}
        </Card>
      )}
      <Button title="Subscription" kind="secondary" onPress={() => router.push("/subscription")} />
      <Button title="Edit shipping address (on the website)" kind="secondary" onPress={() => WebBrowser.openBrowserAsync(`${WEB_BASE}/profile`)} />
      <Button title="Sign out" kind="danger" onPress={() => signOut()} />
    </Screen>
  );
}
