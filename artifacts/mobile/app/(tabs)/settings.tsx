import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useServer } from "@/context/ServerContext";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { themeMode, setThemeMode, isDark } = useTheme();
  const { history, clearHistory, serverUrl } = useServer();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom + 84, 34 + 84) : insets.bottom + 84;

  const toggleDark = () => {
    Haptics.selectionAsync();
    setThemeMode(isDark ? "light" : "dark");
  };

  const handleHotspotGuide = () => {
    Alert.alert(
      "Enable Hotspot",
      "To create a local network:\n\n1. Open Settings\n2. Go to Personal Hotspot (iOS) or Hotspot (Android)\n3. Enable Mobile Hotspot\n4. Connect your laptop to the hotspot\n5. Come back and tap Start Sharing",
      [{ text: "Got it" }]
    );
  };

  const handleClearHistory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Clear History", "Delete all transfer history?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearHistory },
    ]);
  };

  return (
    <LinearGradient
      colors={colors.isDark ? ["#0A0F1E", "#0D1533"] : ["#F0F6FF", "#F8FAFF"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Settings
        </Text>

        {/* Appearance */}
        <SectionHeader label="Appearance" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="moon"
            label="Dark Mode"
            colors={colors}
            right={
              <Switch
                value={isDark}
                onValueChange={toggleDark}
                thumbColor={isDark ? colors.primary : "#f4f3f4"}
                trackColor={{ false: colors.border, true: colors.primary + "80" }}
              />
            }
          />
        </View>

        {/* Connectivity */}
        <SectionHeader label="Connectivity" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="wifi"
            label="Wi-Fi Hotspot Guide"
            colors={colors}
            onPress={handleHotspotGuide}
            showChevron
          />
          <Divider colors={colors} />
          <SettingRow
            icon="link"
            label="View Connection Info"
            colors={colors}
            onPress={() => router.push("/connection")}
            showChevron
          />
        </View>

        {/* Data */}
        <SectionHeader label="Data" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="clock"
            label="Transfer History"
            colors={colors}
            right={
              <Text style={[styles.count, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {history.length} items
              </Text>
            }
          />
          <Divider colors={colors} />
          <SettingRow
            icon="trash-2"
            label="Clear History"
            colors={colors}
            onPress={handleClearHistory}
            destructive
            showChevron
          />
        </View>

        {/* About */}
        <SectionHeader label="About" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="zap"
            label="QuickDrop"
            colors={colors}
            right={
              <Text style={[styles.version, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                v1.0.0
              </Text>
            }
          />
          <Divider colors={colors} />
          <SettingRow
            icon="shield"
            label="No internet required"
            colors={colors}
            right={
              <Text style={[styles.version, { color: colors.success, fontFamily: "Inter_500Medium" }]}>
                LAN only
              </Text>
            }
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function SectionHeader({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
      {label}
    </Text>
  );
}

function Divider({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

function SettingRow({
  icon,
  label,
  colors,
  right,
  onPress,
  showChevron,
  destructive,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  colors: ReturnType<typeof useColors>;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
}) {
  const content = (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: destructive ? colors.destructive + "20" : colors.accent }]}>
        <Feather name={icon} size={18} color={destructive ? colors.destructive : colors.primary} />
      </View>
      <Text style={[styles.settingLabel, { color: destructive ? colors.destructive : colors.foreground, fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
      <View style={styles.settingRight}>
        {right}
        {showChevron && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 8 },
  title: { fontSize: 28, letterSpacing: -0.8, paddingTop: 16, marginBottom: 8 },
  sectionHeader: { fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 12, marginBottom: 4, marginLeft: 4 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  settingRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  settingIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  settingLabel: { flex: 1, fontSize: 15 },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  divider: { height: 1, marginLeft: 62 },
  count: { fontSize: 14 },
  version: { fontSize: 13 },
});
