import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useServer, FileItem } from "@/context/ServerContext";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileIcon(type: string, name: string): keyof typeof Feather.glyphMap {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "music";
  if (type.includes("pdf")) return "file-text";
  if (type.includes("zip") || type.includes("rar") || name.endsWith(".zip")) return "archive";
  if (name.endsWith(".apk")) return "smartphone";
  return "file";
}

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

export default function FilesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { files, addFile, removeFile, addToHistory } = useServer();
  const [uploading, setUploading] = useState(false);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom + 84, 34 + 84) : insets.bottom + 84;

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setUploading(true);
      for (const asset of result.assets) {
        const file: FileItem = {
          id: generateId(),
          name: asset.name,
          size: asset.size ?? 0,
          type: asset.mimeType ?? "application/octet-stream",
          uri: asset.uri,
          addedAt: Date.now(),
        };
        addFile(file);
        addToHistory({
          id: generateId(),
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          direction: "upload",
          timestamp: Date.now(),
          status: "completed",
        });
      }
      setUploading(false);
    } catch (e) {
      setUploading(false);
    }
  };

  const handleShare = async (file: FileItem) => {
    try {
      if (Platform.OS !== "web" && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri);
      }
    } catch {}
  };

  const handleDelete = (id: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove File", `Remove "${name}" from sharing?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeFile(id),
      },
    ]);
  };

  const renderItem = ({ item }: { item: FileItem }) => (
    <View style={[styles.fileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.fileIcon, { backgroundColor: colors.accent }]}>
        <Feather name={getFileIcon(item.type, item.name)} size={22} color={colors.primary} />
      </View>
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.fileMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {formatBytes(item.size)} · {new Date(item.addedAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.fileActions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.muted }]} onPress={() => handleShare(item)}>
          <Feather name="share-2" size={16} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.muted }]} onPress={() => handleDelete(item.id, item.name)}>
          <Feather name="trash-2" size={16} color={colors.destructive} />
        </TouchableOpacity>
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
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            My Files
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {files.length} file{files.length !== 1 ? "s" : ""} ready to share
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={handlePickFile}
          activeOpacity={0.8}
          disabled={uploading}
        >
          <Feather name={uploading ? "loader" : "plus"} size={20} color="#fff" />
          <Text style={[styles.addBtnLabel, { fontFamily: "Inter_600SemiBold" }]}>
            {uploading ? "Adding..." : "Add Files"}
          </Text>
        </TouchableOpacity>

        {files.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="folder" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              No files yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Add files to make them available for download from your laptop
            </Text>
          </View>
        ) : (
          <FlatList
            data={files}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!!files.length}
          />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24 },
  header: { marginBottom: 16, paddingTop: 16 },
  title: { fontSize: 28, letterSpacing: -0.8 },
  subtitle: { fontSize: 14, marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  addBtnLabel: { color: "#fff", fontSize: 16 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  list: { gap: 12, paddingBottom: 20 },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  fileIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 15 },
  fileMeta: { fontSize: 12, marginTop: 2 },
  fileActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
