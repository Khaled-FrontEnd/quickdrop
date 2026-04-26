import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useServer } from "@/context/ServerContext";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSharing, connectedCount, startSharing, stopSharing, localIp } = useServer();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isSharing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
  }, [isSharing]);

  const handleToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isSharing) {
      stopSharing();
    } else {
      await startSharing();
      router.push("/connection");
    }
  };

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  return (
    <LinearGradient
      colors={colors.isDark ? ["#0A0F1E", "#0D1533", "#0A1628"] : ["#F0F6FF", "#E8F2FF", "#F8FAFF"]}
      style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}
    >
      <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
              <Feather name="zap" size={22} color="#fff" />
            </View>
            <Text style={[styles.appName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              QuickDrop
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/settings")}
          >
            <Feather name="settings" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Status card */}
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statusDot, { backgroundColor: isSharing ? colors.success : colors.border }]} />
          <Text style={[styles.statusText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            {isSharing ? `Sharing active · ${connectedCount} device${connectedCount !== 1 ? "s" : ""} connected` : "Not sharing"}
          </Text>
        </View>

        {/* Main button */}
        <View style={styles.centerSection}>
          <View style={styles.orbitContainer}>
            {isSharing && (
              <>
                <Animated.View
                  style={[
                    styles.orbit,
                    styles.orbit1,
                    { borderColor: colors.primary + "30" },
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.orbit,
                    styles.orbit2,
                    { borderColor: colors.primary + "20" },
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
              </>
            )}
            <TouchableOpacity onPress={handleToggle} activeOpacity={0.85}>
              <LinearGradient
                colors={isSharing ? ["#EF4444", "#DC2626"] : [colors.primary, "#0055CC"]}
                style={styles.mainButton}
              >
                <Feather
                  name={isSharing ? "wifi-off" : "wifi"}
                  size={40}
                  color="#fff"
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={[styles.mainLabel, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {isSharing ? "Stop Sharing" : "Start Sharing"}
          </Text>
          <Text style={[styles.mainSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {isSharing
              ? `Server running on port 8080`
              : "Tap to start wireless file transfer"}
          </Text>
        </View>

        {/* Action grid */}
        <View style={styles.actionGrid}>
          <ActionCard
            icon="folder"
            label="Files"
            count={undefined}
            onPress={() => router.push("/(tabs)/files")}
            colors={colors}
          />
          <ActionCard
            icon="clock"
            label="History"
            count={undefined}
            onPress={() => router.push("/(tabs)/history")}
            colors={colors}
          />
          {isSharing && (
            <ActionCard
              icon="link"
              label="Connection"
              count={undefined}
              onPress={() => router.push("/connection")}
              colors={colors}
              highlight
            />
          )}
        </View>

        {/* Feature pills */}
        <View style={styles.pillRow}>
          {["No Internet Needed", "LAN Transfer", "Drag & Drop"].map((label) => (
            <View key={label} style={[styles.pill, { backgroundColor: colors.accent, borderColor: colors.border }]}>
              <Text style={[styles.pillText, { color: colors.accentForeground, fontFamily: "Inter_500Medium" }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

function ActionCard({
  icon,
  label,
  onPress,
  colors,
  highlight,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  count?: number;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  highlight?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionCard,
        {
          backgroundColor: highlight ? colors.primary : colors.card,
          borderColor: highlight ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Feather name={icon} size={22} color={highlight ? "#fff" : colors.primary} />
      <Text
        style={[
          styles.actionLabel,
          { color: highlight ? "#fff" : colors.foreground, fontFamily: "Inter_600SemiBold" },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
  },
  centerSection: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  orbitContainer: {
    width: 170,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
  },
  orbit: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1.5,
  },
  orbit1: {
    width: 150,
    height: 150,
  },
  orbit2: {
    width: 170,
    height: 170,
  },
  mainButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  mainLabel: {
    fontSize: 24,
    letterSpacing: -0.5,
  },
  mainSub: {
    fontSize: 14,
    textAlign: "center",
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  actionLabel: {
    fontSize: 13,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 20,
    justifyContent: "center",
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
  },
});
