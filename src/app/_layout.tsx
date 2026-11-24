import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "../lib/session";
import { colors } from "../lib/theme";

function Routes() {
  const { ready, session } = useSession();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.leaf} size="large" />
      </View>
    );
  }
  const signedIn = !!session;
  const isChild = session?.role === "child";
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Sign in" }} />
        <Stack.Screen name="signup" options={{ title: "Create account" }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !isChild}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="gift/new" options={{ title: "Send a gift" }} />
        <Stack.Screen name="trade" options={{ title: "Buy or sell" }} />
        <Stack.Screen name="scan" options={{ title: "Scan gift code", presentation: "modal" }} />
        <Stack.Screen name="subscription" options={{ title: "Subscription" }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && isChild}>
        <Stack.Screen name="kid" options={{ title: "My jars" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Routes />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
