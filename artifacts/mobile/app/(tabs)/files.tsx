import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useEffect } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useServer, FileItem } from "@/context/ServerContext";

const SERVER = "http://192.168.0.186:3000";

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
  if (type.includes("zip") || name.endsWith(".zip")) return "archive";
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
  const [serverFiles, setServerFiles] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom + 84, 118) : insets.bottom + 84;

  // جلب ملفات اللاب من السيرفر
  const fetchServerFiles = async () => {
    try {
      const res = await fetch(`${SERVER}/api/files`);
      const data = await res.json();
      setServerFiles(data.files ?? []);
    } catch {}
  };

  useEffect(() => {
    fetchServerFiles();
    const interval = setInterval(fetchServerFiles, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchServerFiles();
    setRefreshing(false);
  };

  // بعت ملف من الموبايل للاب
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
        const formData = new FormData();
        formData.append("file", {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType ?? "application/octet-stream",
        } as any);

        const res = await fetch(`${SERVER}/api/upload-simple`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
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
      }

      setUploading(false);
      fetchServerFiles();
    } catch {
      setUploading(false);
    }
  };

  // تحميل ملف من اللاب على الموبايل
  const handleDownload = async (id: string, name: string) => {
    try {
      setDownloading(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const dest = FileSystem.documentDirectory + name;
      const { uri } = await FileSystem.downloadAsync(
        `${SERVER}/api/download/${id}`,
        dest
      );
      await Sharing.shareAsync(uri);
      addToHistory({
        id: generateId(),
        fileName: name,
        fileSize: 0,
        fileType: "",
        direction: "download",
        timestamp: Date.now(),
        status: "completed",
      });
      setDownloading(null);
    } catch {
      setDownloading(null);
      Alert.alert("Error", "Failed to download file");
    }
  };

  const handleDelete = (id: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove File", `Remove "${name}" from sharing?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeFile(id) },
    ]);
  };

  return (
    <LinearGradient
      colors={colors.isDark ? ["#0A0F1E", "#0D1533"] : ["#F0F6FF", "#F8FAFF"]}
      style={styles.container}
    >
      <View style={[styles.inner, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Files
          </Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={handlePickFile}
            activeOpacity={0.8}
            disabled={uploading}
          >
            <Feather name={uploading ? "loader" : "plus"} size={18} color="#fff" />
            <Text style={[styles.addBtnLabel, { fontFamily: "Inter_600SemiBold" }]}>
              {uploading ? "Sending..." : "Send to Laptop"}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListHeaderComponent={
            <>
              {/* ملفات اللاب */}
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                FROM LAPTOP ({serverFiles.length})
              </Text>
              {serverFiles.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="monitor" size={28} color={colors.border} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    No files from laptop yet
                  </Text>
                </View>
              ) : (
                serverFiles.map((item) => (
                  <View key={item.id} style={[styles.fileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.fileIcon, { backgroundColor: colors.accent }]}>
                      <Feather name={getFileIcon(item.type, item.name)} size={20} color={colors.primary} />
                    </View>
                    <View style={styles.fileInfo}>
                      <Text style={[styles.fileName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.fileMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        {item.sizeFormatted}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleDownload(item.id, item.name)}
                      disabled={downloading === item.id}
                    >
                      <Feather name={downloading === item.id ? "loader" : "download"} size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {/* ملفات الموبايل */}
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginTop: 20 }]}>
                FROM PHONE ({files.length})
              </Text>
              {files.length === 0 && (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="smartphone" size={28} color={colors.border} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Tap "Send to Laptop" to share files
                  </Text>
                </View>
              )}
              {files.map((item) => (
                <View key={item.id} style={[styles.fileCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 10 }]}>
                  <View style={[styles.fileIcon, { backgroundColor: colors.accent }]}>
                    <Feather name={getFileIcon(item.type, item.name)} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.fileMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {formatBytes(item.size)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                    onPress={() => handleDelete(item.id, item.name)}
                  >
                    <Feather name="trash-2" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          }
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    marginBottom: 20,
  },
  title: { fontSize: 28, letterSpacing: -0.8 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnLabel: { color: "#fff", fontSize: 14 },
  sectionTitle: { fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  emptyText: { fontSize: 13, textAlign: "center" },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 10,
  },
  fileIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14 },
  fileMeta: { fontSize: 12, marginTop: 2 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});