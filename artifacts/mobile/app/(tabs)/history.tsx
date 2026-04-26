import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useServer, TransferRecord } from "@/context/ServerContext";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { history, clearHistory } = useServer();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom + 84, 34 + 84) : insets.bottom + 84;

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Clear History", "Delete all transfer history?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearHistory },
    ]);
  };

  const renderItem = ({ item }: { item: TransferRecord }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: item.direction === "upload" ? colors.accent : colors.secondary }]}>
        <Feather
          name={item.direction === "upload" ? "upload" : "download"}
          size={18}
          color={colors.primary}
        />
      </View>
      <View style={styles.info}>
        <Text style={[styles.fileName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {item.fileName}
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {formatBytes(item.fileSize)} · {item.direction === "upload" ? "From phone" : "To phone"} · {timeAgo(item.timestamp)}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: item.status === "completed" ? colors.success + "20" : colors.destructive + "20" }]}>
        <Feather
          name={item.status === "completed" ? "check" : "x"}
          size={12}
          color={item.status === "completed" ? colors.success : colors.destructive}
        />
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={colors.isDark ? ["#0A0F1E", "#0D1533"] : ["#F0F6FF", "#F8FAFF"]}
      style={styles.container}
    >
      <View style={[styles.inner, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              History
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {history.length} transfer{history.length !== 1 ? "s" : ""}
            </Text>
          </View>
          {history.length > 0 && (
            <TouchableOpacity
              style={[styles.clearBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleClear}
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </TouchableOpacity>
          )}
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="clock" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              No transfers yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Your file transfer history will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingTop: 16,
  },
  title: { fontSize: 28, letterSpacing: -0.8 },
  subtitle: { fontSize: 14, marginTop: 2 },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  list: { gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  fileName: { fontSize: 14 },
  meta: { fontSize: 11, marginTop: 2 },
  statusBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
