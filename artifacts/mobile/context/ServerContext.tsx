import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

export interface TransferRecord {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  direction: "upload" | "download";
  timestamp: number;
  status: "completed" | "failed";
}

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uri: string;
  addedAt: number;
}

interface ServerContextType {
  isSharing: boolean;
  serverUrl: string;
  localIp: string;
  port: number;
  connectedCount: number;
  files: FileItem[];
  history: TransferRecord[];
  startSharing: () => void;
  stopSharing: () => void;
  addFile: (file: FileItem) => void;
  removeFile: (id: string) => void;
  clearHistory: () => void;
  addToHistory: (record: TransferRecord) => void;
  setConnectedCount: (n: number) => void;
}

const ServerContext = createContext<ServerContextType>({
  isSharing: false,
  serverUrl: "",
  localIp: "",
  port: 8080,
  connectedCount: 0,
  files: [],
  history: [],
  startSharing: () => {},
  stopSharing: () => {},
  addFile: () => {},
  removeFile: () => {},
  clearHistory: () => {},
  addToHistory: () => {},
  setConnectedCount: () => {},
});

const PORT = 8080;
const STORAGE_KEYS = {
  FILES: "quickdrop_files",
  HISTORY: "quickdrop_history",
};

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

export function ServerProvider({ children }: { children: React.ReactNode }) {
  const [isSharing, setIsSharing] = useState(false);
  const [localIp, setLocalIp] = useState("");
  const [connectedCount, setConnectedCount] = useState(0);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [history, setHistory] = useState<TransferRecord[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const domain = process.env.EXPO_PUBLIC_DOMAIN || "";
  // const serverUrl = domain ? `http://${domain}/api/files` : "";
  const serverUrl = domain ? `http://${domain}/api/files` : "";

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.FILES).then((val) => {
      if (val) {
        try {
          setFiles(JSON.parse(val));
        } catch {}
      }
    });
    AsyncStorage.getItem(STORAGE_KEYS.HISTORY).then((val) => {
      if (val) {
        try {
          setHistory(JSON.parse(val));
        } catch {}
      }
    });
  }, []);

  const detectIp = useCallback(async () => {
    try {
      const Network = await import("expo-network");
      const ip = await Network.getIpAddressAsync();
      if (ip && ip !== "0.0.0.0") {
        setLocalIp(ip);
        return ip;
      }
    } catch {}

    if (Platform.OS === "web") {
      setLocalIp("localhost");
      return "localhost";
    }
    return "";
  }, []);

  const startSharing = useCallback(async () => {
    await detectIp();
    setIsSharing(true);
    setConnectedCount(0);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`http://192.168.0.186:3000/api/status`);
        if (res.ok) {
          const data = (await res.json()) as { connected?: number };
          setConnectedCount(data.connected ?? 0);
        }
      } catch {}
    }, 3000);
  }, [detectIp]);

  const stopSharing = useCallback(() => {
    setIsSharing(false);
    setConnectedCount(0);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const saveFiles = useCallback((newFiles: FileItem[]) => {
    setFiles(newFiles);
    AsyncStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(newFiles));
  }, []);

  const addFile = useCallback((file: FileItem) => {
    setFiles((prev) => {
      const next = [file, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(next));
      return next;
    });
  }, []);

  const addToHistory = useCallback((record: TransferRecord) => {
    setHistory((prev) => {
      const next = [record, ...prev].slice(0, 100);
      AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    AsyncStorage.removeItem(STORAGE_KEYS.HISTORY);
  }, []);

  return (
    <ServerContext.Provider
      value={{
        isSharing,
        serverUrl,
        localIp,
        port: PORT,
        connectedCount,
        files,
        history,
        startSharing,
        stopSharing,
        addFile,
        removeFile,
        clearHistory,
        addToHistory,
        setConnectedCount,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  return useContext(ServerContext);
}
