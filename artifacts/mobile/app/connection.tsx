import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useServer } from "@/context/ServerContext";

export default function ConnectionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { serverUrl, localIp, port, connectedCount, isSharing } = useServer();
  const [copied, setCopied] = useState(false);

  const domain = process.env.EXPO_PUBLIC_DOMAIN || "";
  console.log(domain);
  const SERVER_URL = "http://192.168.0.186:3000";
  const displayUrl = SERVER_URL;
  const qrUrl = SERVER_URL;


  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad =
    Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(displayUrl);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <LinearGradient
      colors={colors.isDark ? ["#0A0F1E", "#0D1533"] : ["#F0F6FF", "#F8FAFF"]}
      style={[
        styles.container,
        { paddingTop: topPad, paddingBottom: bottomPad },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.backBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.back()}
          >
            <Feather name="x" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontFamily: "Inter_700Bold" },
            ]}
          >
            Connection
          </Text>
          <View style={styles.backBtn} />
        </View>

        {/* Status badge */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isSharing ? colors.success + "20" : colors.muted,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isSharing
                  ? colors.success
                  : colors.mutedForeground,
              },
            ]}
          />
          <Text
            style={[
              styles.statusLabel,
              {
                color: isSharing ? colors.success : colors.mutedForeground,
                fontFamily: "Inter_600SemiBold",
              },
            ]}
          >
            {isSharing ? `Active · ${connectedCount} connected` : "Not sharing"}
          </Text>
        </View>

        {/* QR Code */}
        <View
          style={[
            styles.qrCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.qrLabel,
              { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
            ]}
          >
            Scan with laptop camera or browser
          </Text>
          <View style={[styles.qrContainer, { backgroundColor: "#FFFFFF" }]}>
            <QRCode
              value={qrUrl || "https://quickdrop.app"}
              size={200}
              color="#0A0F1E"
              backgroundColor="#FFFFFF"
            />
          </View>
          <Text
            style={[
              styles.qrNote,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            Open in any browser on the same network
          </Text>
        </View>

        {/* URL card */}
        <View
          style={[
            styles.urlCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.urlHeader}>
            <Feather name="link" size={16} color={colors.primary} />
            <Text
              style={[
                styles.urlHeaderLabel,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                },
              ]}
            >
              Server URL
            </Text>
          </View>
          <Text
            style={[
              styles.urlText,
              { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {displayUrl}
          </Text>
          <TouchableOpacity
            style={[
              styles.copyBtn,
              { backgroundColor: copied ? colors.success : colors.primary },
            ]}
            onPress={handleCopy}
            activeOpacity={0.8}
          >
            <Feather name={copied ? "check" : "copy"} size={16} color="#fff" />
            <Text
              style={[styles.copyLabel, { fontFamily: "Inter_600SemiBold" }]}
            >
              {copied ? "Copied!" : "Copy URL"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View
          style={[
            styles.instructionsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.instructionsTitle,
              { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            How to connect
          </Text>
          {[
            {
              step: "1",
              text: "Connect your laptop to the same Wi-Fi network",
            },
            {
              step: "2",
              text: "Scan the QR code or open the URL in your browser",
            },
            { step: "3", text: "Upload and download files instantly" },
          ].map((item) => (
            <View key={item.step} style={styles.instructionRow}>
              <View
                style={[styles.stepBadge, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.stepNum, { fontFamily: "Inter_700Bold" }]}>
                  {item.step}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepText,
                  { color: colors.foreground, fontFamily: "Inter_400Regular" },
                ]}
              >
                {item.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Network info */}
        {localIp && (
          <View
            style={[
              styles.networkCard,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <Feather name="wifi" size={14} color={colors.primary} />
            <Text
              style={[
                styles.networkText,
                {
                  color: colors.secondaryForeground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            >
              Device IP: {localIp}
            </Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 24, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: { fontSize: 20, letterSpacing: -0.5 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "center",
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 14 },
  qrCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
  qrLabel: { fontSize: 14 },
  qrContainer: {
    padding: 16,
    borderRadius: 16,
  },
  qrNote: { fontSize: 12 },
  urlCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  urlHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  urlHeaderLabel: { fontSize: 12 },
  urlText: { fontSize: 16, letterSpacing: -0.3 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  copyLabel: { color: "#fff", fontSize: 15 },
  instructionsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  instructionsTitle: { fontSize: 16 },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: { color: "#fff", fontSize: 13 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  networkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  networkText: { fontSize: 13 },
});
