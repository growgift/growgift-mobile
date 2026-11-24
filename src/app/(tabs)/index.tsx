import { router } from "expo-router";
import { Pressable, Text } from "react-native";
import { Card, H1, H2, P, Row, Screen } from "../../components/ui";
import { collections } from "../../lib/collections";
import { colors } from "../../lib/theme";

export default function Collections() {
  return (
    <Screen>
      <H1>Pick a collection</H1>
      <P muted>Choose a theme, then a company, and we'll turn your gift into shares.</P>
      {collections.map((c) => (
        <Card key={c.slug}>
          <Row>
            <Text style={{ fontSize: 30 }}>{c.emoji}</Text>
            <H2>{c.name}</H2>
          </Row>
          <P muted>{c.tagline}</P>
          {c.companies.map((co) => (
            <Pressable
              key={co.symbol}
              accessibilityRole="button"
              accessibilityLabel={`Gift ${co.name}`}
              onPress={() => router.push({ pathname: "/gift/new", params: { symbol: co.symbol, name: co.name } })}
              style={({ pressed }) => ({
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: colors.line,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ fontWeight: "700", color: colors.ink }}>
                {co.name} <Text style={{ color: colors.muted, fontWeight: "400" }}>({co.symbol})</Text>
              </Text>
              <Text style={{ color: colors.muted }}>{co.blurb}</Text>
            </Pressable>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
