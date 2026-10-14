import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Detail = {
  id: number; call_title: string; call_country: string; call_deadline: string; call_description: string;
  call_link: string; user_email: string; full_name: string; phone: string; department: string; gpa: number;
  notes?: string | null; status: string; created_at: string; reviewed_at?: string | null;
  reviewed_by_email?: string | null; decision_reason?: string | null;
  documents: { id: number; doc_type: string; original_name: string; size: number; created_at: string }[];
};
type History = { id: number; status: string; reason?: string | null; changed_by_email: string; changed_by_role: string; created_at: string };

export default function ApplicationDetailScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [data, setData] = useState<Detail | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const [detail, entries] = await Promise.all([
        apiRequest<Detail>(`/applications/${id}`, {}, token),
        apiRequest<History[]>(`/applications/${id}/history`, {}, token),
      ]);
      setData(detail); setHistory(entries);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Could not load application"); }
  }, [id, token]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  if (!user || !token) return null;
  if (!data) return <View style={styles.center}>{error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color="#2563eb" />}</View>;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back to applications</Text></Pressable>
    <Text style={styles.eyebrow}>APPLICATION DETAILS</Text><Text style={styles.title}>{data.call_title}</Text>
    <View style={styles.statusBox}><Text style={styles.statusLabel}>Current status</Text><Text style={[styles.status, styles[`status_${data.status}` as keyof typeof styles]]}>{data.status.toUpperCase()}</Text></View>
    <View style={styles.card}><Text style={styles.cardTitle}>Student information</Text><Text style={styles.row}>Name: {data.full_name}</Text><Text style={styles.row}>Email: {data.user_email}</Text><Text style={styles.row}>Phone: {data.phone}</Text><Text style={styles.row}>Department: {data.department}</Text><Text style={styles.row}>GPA: {data.gpa.toFixed(2)}</Text>{data.notes ? <Text style={styles.notes}>{data.notes}</Text> : null}</View>
    <View style={styles.card}><Text style={styles.cardTitle}>Documents ({data.documents.length})</Text>{data.documents.length ? data.documents.map(doc => <View key={doc.id} style={styles.documentRow}><View style={styles.documentInfo}><Text style={styles.document}>📎 {doc.original_name}</Text><Text style={styles.muted}>{Math.round(doc.size / 1024)} KB</Text></View><View style={styles.documentActions}><Pressable onPress={() => router.push({ pathname: "/document-preview", params: { id: String(doc.id), name: doc.original_name } } as never)}><Text style={styles.openText}>Preview</Text></Pressable><Pressable onPress={() => void openDocument(doc, "download")}><Text style={styles.downloadText}>Download</Text></Pressable></View></View>) : <Text style={styles.muted}>No documents uploaded.</Text>}</View>
    {data.decision_reason ? <View style={styles.card}><Text style={styles.cardTitle}>Decision reason</Text><Text style={styles.row}>{data.decision_reason}</Text></View> : null}
    <View style={styles.card}><Text style={styles.cardTitle}>Status history</Text>{history.map(entry => <View key={entry.id} style={styles.history}><Text style={[styles.status, styles[`status_${entry.status}` as keyof typeof styles]]}>{entry.status.toUpperCase()}</Text><Text style={styles.row}>{entry.reason ?? "Application submitted"} · {entry.changed_by_email}</Text><Text style={styles.muted}>{new Date(entry.created_at).toLocaleString()}</Text></View>)}</View>
  </ScrollView>;

  async function openDocument(doc: Detail["documents"][number], action: "preview" | "download") {
    if (!token) return;
    try {
      const safeName = doc.original_name.replace(/[^\w.-]+/g, "_");
      const extension = safeName.match(/\.[^.]+$/)?.[0].toLowerCase() ?? "";
      const target = new File(Paths.cache, safeName);
      if (target.exists) target.delete();
      const result = await File.downloadFileAsync(
        `${process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.68:8000"}/documents/${doc.id}`,
        target,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (action === "preview" && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          dialogTitle: `Open ${doc.original_name}`,
          mimeType: mimeTypeFor(extension),
          UTI: utiFor(extension),
        });
      } else if (action === "download" && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          dialogTitle: `Save ${doc.original_name}`,
          mimeType: mimeTypeFor(extension),
          UTI: utiFor(extension),
        });
      } else {
        await Linking.openURL(result.uri);
      }
    } catch (err: unknown) {
      Alert.alert("Could not open document", err instanceof Error ? err.message : "The document could not be downloaded.");
    }
  }
}

function mimeTypeFor(extension: string) {
  return ({
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
  } as Record<string, string>)[extension] ?? "application/octet-stream";
}

function utiFor(extension: string) {
  return ({
    ".pdf": "com.adobe.pdf",
    ".doc": "com.microsoft.word.doc",
    ".docx": "org.openxmlformats.wordprocessingml.document",
    ".jpg": "public.jpeg",
    ".jpeg": "public.jpeg",
    ".png": "public.png",
  } as Record<string, string>)[extension];
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7fb" }, content: { padding: 20, paddingTop: 56, paddingBottom: 40 }, center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f4f7fb" }, back: { color: "#2563eb", fontWeight: "700", marginBottom: 24 }, eyebrow: { color: "#2563eb", fontSize: 11, fontWeight: "800", letterSpacing: 1.4 }, title: { color: "#0f172a", fontSize: 28, fontWeight: "800", marginTop: 7 }, statusBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 }, statusLabel: { color: "#64748b", fontWeight: "700" }, card: { backgroundColor: "#fff", borderRadius: 19, padding: 17, marginTop: 15 }, cardTitle: { color: "#0f172a", fontSize: 17, fontWeight: "800", marginBottom: 10 }, row: { color: "#475569", lineHeight: 22 }, notes: { color: "#334155", backgroundColor: "#f8fafc", borderRadius: 10, padding: 10, marginTop: 10 },     documentRow: { borderBottomWidth: 1, borderBottomColor: "#eef2f7", paddingVertical: 10 }, documentInfo: { flex: 1 }, documentActions: { flexDirection: "row", gap: 16, marginTop: 8 }, document: { color: "#1d4ed8" }, openText: { color: "#2563eb", fontWeight: "800" }, downloadText: { color: "#64748b", fontWeight: "700" }, muted: { color: "#94a3b8", fontSize: 12, marginTop: 4 }, history: { borderTopWidth: 1, borderTopColor: "#eef2f7", paddingTop: 12, marginTop: 10 }, status: { alignSelf: "flex-start", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: "800", overflow: "hidden" }, status_pending: { color: "#92400e", backgroundColor: "#fef3c7" }, status_approved: { color: "#166534", backgroundColor: "#dcfce7" }, status_rejected: { color: "#b91c1c", backgroundColor: "#fee2e2" }, status_withdrawn: { color: "#475569", backgroundColor: "#e2e8f0" }, error: { color: "#b91c1c", padding: 20 },
});
