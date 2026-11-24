import { router } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, H1, P } from "../components/ui";
import { colors, fonts, space } from "../lib/theme";

export default function Welcome() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas, padding: space.lg, justifyContent: "space-between" }}>
      <View style={{ marginTop: 60, gap: space.md }}>
        <Text style={{ fontSize: 64 }}>🎁</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 40, fontWeight: "800", color: colors.ink }}>GrowGift</Text>
        <H1>Give a share, grow a future.</H1>
        <P muted>Gift real shares to someone you love, and help your family build savings habits together.</P>
      </View>
      <View style={{ gap: space.sm }}>
        <Button title="Create an account" onPress={() => router.push("/signup")} />
        <Button title="I already have an account" kind="secondary" onPress={() => router.push("/login")} />
        <P muted style={{ fontSize: 12, textAlign: "center" }}>Investing involves risk. The value of shares can go down as well as up.</P>
      </View>
    </SafeAreaView>
  );
}
