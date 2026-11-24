import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { colors } from "../../lib/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={icon} color={color as string} size={size} />,
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.leafDeep,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.ink,
        tabBarStyle: { backgroundColor: colors.white },
      }}
    >
      <Tabs.Screen name="index" options={tab("Gift", "gift-outline")} />
      <Tabs.Screen name="gifts" options={tab("My gifts", "receipt-outline")} />
      <Tabs.Screen name="redeem" options={tab("Redeem", "qr-code-outline")} />
      <Tabs.Screen name="portfolio" options={tab("Portfolio", "trending-up-outline")} />
      <Tabs.Screen name="family" options={tab("Family", "people-outline")} />
      <Tabs.Screen name="profile" options={tab("Profile", "person-circle-outline")} />
    </Tabs>
  );
}
