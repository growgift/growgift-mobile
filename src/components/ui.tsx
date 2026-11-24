import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { colors, fonts, radius, space } from "../lib/theme";

export function Screen({
  children,
  onRefresh,
  refreshing,
  scroll = true,
}: {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
}) {
  const body = scroll ? (
    <ScrollView
      style={s.flex}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.leaf} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[s.flex, s.content]}>{children}</View>
  );
  return (
    <KeyboardAvoidingView style={[s.flex, { backgroundColor: colors.canvas }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {body}
    </KeyboardAvoidingView>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={s.h1} accessibilityRole="header">{children}</Text>;
}
export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={s.h2} accessibilityRole="header">{children}</Text>;
}
export function P({ children, muted, style }: { children: React.ReactNode; muted?: boolean; style?: object }) {
  return <Text style={[s.p, muted && { color: colors.muted }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  kind = "primary",
  busy,
  disabled,
}: {
  title: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "danger" | "ribbon";
  busy?: boolean;
  disabled?: boolean;
}) {
  const off = busy || disabled;
  const bg = kind === "primary" ? colors.leaf : kind === "ribbon" ? colors.ribbon : kind === "danger" ? colors.bad : colors.white;
  const fg = kind === "secondary" ? colors.leafDeep : kind === "ribbon" ? colors.ink : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: off ? 0.55 : pressed ? 0.85 : 1 },
        kind === "secondary" && { borderWidth: 2, borderColor: colors.leaf },
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, error, ...rest }: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#8AA396"
        autoCapitalize="none"
        {...rest}
        style={[s.input, error ? { borderColor: colors.bad } : null, rest.multiline ? { minHeight: 90, textAlignVertical: "top" } : null]}
      />
      {error ? <Text style={s.err}>{error}</Text> : null}
    </View>
  );
}

export function Banner({ tone = "info", children }: { tone?: "good" | "info" | "warn" | "bad"; children: React.ReactNode }) {
  const bg = { good: colors.goodBg, info: colors.infoBg, warn: colors.warnBg, bad: colors.badBg }[tone];
  const fg = tone === "bad" ? colors.bad : colors.ink;
  return (
    <View style={[s.banner, { backgroundColor: bg }]} accessibilityRole="alert">
      <Text style={{ color: fg, fontSize: 15, lineHeight: 21 }}>{children}</Text>
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[s.chip, selected && { backgroundColor: colors.leaf, borderColor: colors.leaf }]}
    >
      <Text style={{ color: selected ? colors.white : colors.ink, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" }, style]}>{children}</View>;
}

export function Loading() {
  return (
    <View style={{ padding: space.xl, alignItems: "center" }}>
      <ActivityIndicator color={colors.leaf} size="large" />
    </View>
  );
}

export const mono = { fontFamily: fonts.mono } as const;

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.md, gap: space.md, paddingBottom: space.xl * 2 },
  h1: { fontFamily: fonts.display, fontSize: 28, fontWeight: "700", color: colors.ink },
  h2: { fontFamily: fonts.display, fontSize: 20, fontWeight: "700", color: colors.ink },
  p: { fontSize: 16, lineHeight: 23, color: colors.ink },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    gap: space.sm,
  },
  btn: { minHeight: 50, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: space.md },
  btnText: { fontSize: 17, fontWeight: "700" },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: colors.white,
    color: colors.ink,
  },
  err: { color: colors.bad, fontSize: 13 },
  banner: { padding: 14, borderRadius: radius.md },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
});
