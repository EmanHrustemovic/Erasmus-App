import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { readCached, writeCached } from "@/lib/offline-cache";
import { exportApplications } from "@/lib/exports";

type Application = {
  id: number;
  call_title: string;
  department: string;
  gpa: number;
  status: string;
  decision_reason?: string | null;
  created_at: string;
  full_name: string;
  user_email: string;
};

export default function ApplicationsScreen() {
  const { token, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const role = user?.role;
  const activeItems = user?.role === "admin" ? items.filter(item => item.status === "pending") : items;
  const historyItems = user?.role === "admin" ? items.filter(item => item.status !== "pending") : [];

  const loadApplications = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const nextItems = await apiRequest<Application[]>(role === "admin" ? "/applications" : "/applications/me", {}, token);
      setItems(nextItems);
      await writeCached(`applications-${role}`, nextItems);
    } catch (err: unknown) {
      const cachedItems = await readCached<Application[]>(`applications-${role}`);
      if (cachedItems) setItems(cachedItems);
      setError(err instanceof Error ? err.message : "Could not load applications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, role]);

  useEffect(() => {
    const timer = setTimeout(() => void loadApplications(), 0);
    return () => clearTimeout(timer);
  }, [loadApplications]);

  if (authLoading) return <View style={styles.center}><ActivityIndicator color="#2563eb" /></View>;
  if (!user || !token) return <Redirect href={"/login" as never} />;

  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>YOUR MOBILITY JOURNEY</Text>
      <Text style={styles.title}>{user.role === "admin" ? "Applications" : "My applications"}</Text>
      <Text style={styles.subtitle}>{user.role === "admin" ? "Review pending submissions and keep every decision in history." : "Stay up to date with every submitted application."}</Text>
      {user.role === "admin" && <View style={styles.exportRow}>
        {(["csv", "xlsx", "pdf"] as const).map(format => (
          <Pressable key={format} style={styles.exportButton} disabled={exporting} onPress={async () => {
            setExporting(true);
            try { await exportApplications(token, format); }
            catch (err: unknown) { setError(err instanceof Error ? err.message : "Could not export applications"); }
            finally { setExporting(false); }
          }}>
            <Text style={styles.exportText}>{exporting ? "..." : `Export ${format.toUpperCase()}`}</Text>
          </Pressable>
        ))}
      </View>}
      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#2563eb" /></View>
      ) : (
        <FlatList
          data={activeItems}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadApplications(); }} />}
          keyExtractor={item => String(item.id)}
          ListHeaderComponent={user.role === "admin" ? <Text style={styles.sectionTitle}>Pending review ({activeItems.length})</Text> : null}
          ListEmptyComponent={<Text style={styles.empty}>{user.role === "admin" ? "No pending applications." : "You have not submitted an application yet."}</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => user.role === "admin" && router.push({ pathname: "/application-detail", params: { id: String(item.id) } } as never)}>
              <View style={styles.row}>
                <Text style={styles.cardTitle}>{item.call_title}</Text>
                <Text style={[styles.status, styles[`status_${item.status}` as keyof typeof styles]]}>{item.status.toUpperCase()}</Text>
              </View>
              <Text style={styles.meta}>{item.department} · GPA {item.gpa.toFixed(2)}</Text>
              {item.decision_reason ? <Text style={styles.reason}>{item.decision_reason}</Text> : null}
              <Text style={styles.date}>Submitted {new Date(item.created_at).toLocaleDateString()}</Text>
              {user.role === "admin" && item.status === "pending" && (
                <View>
                  <TextInput
                    style={styles.reasonInput}
                    placeholder="Rejection reason (required for reject)"
                    value={reason[item.id] ?? ""}
                    onChangeText={value => setReason(current => ({ ...current, [item.id]: value }))}
                  />
                  <View style={styles.actions}>
                    <Pressable style={[styles.action, styles.approve]} onPress={() => review(item.id, "approved")} disabled={busyId === item.id}>
                      <Text style={styles.actionText}>Approve</Text>
                    </Pressable>
                    <Pressable style={[styles.action, styles.reject]} onPress={() => review(item.id, "rejected")} disabled={busyId === item.id}>
                      <Text style={styles.actionText}>Reject</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </Pressable>
          )}
        />
      )}
      {user.role === "admin" && historyItems.length > 0 && (
        <View style={styles.history}>
          <Text style={styles.sectionTitle}>Review history ({historyItems.length})</Text>
          {historyItems.map(item => (
            <Pressable key={item.id} style={styles.historyRow} onPress={() => router.push({ pathname: "/application-detail", params: { id: String(item.id) } } as never)}>
              <View style={styles.historyMain}><Text style={styles.cardTitle}>{item.call_title}</Text><Text style={styles.meta}>{item.full_name} · {item.user_email}</Text></View>
              <Text style={[styles.status, styles[`status_${item.status}` as keyof typeof styles]]}>{item.status.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  async function review(id: number, status: "approved" | "rejected") {
    if (!token) return;
    if (status === "rejected" && !reason[id]?.trim()) {
      setError("Enter a rejection reason first.");
      return;
    }
    setBusyId(id);
    try {
      await apiRequest(`/applications/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ status, reason: reason[id]?.trim() || undefined }),
      }, token);
      await loadApplications();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not review application");
    } finally {
      setBusyId(null);
    }
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7fb", paddingTop: 58, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: "#2563eb", fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#0f172a", fontSize: 30, fontWeight: "800", marginTop: 6 },
  subtitle: { color: "#64748b", lineHeight: 21, marginTop: 5, marginBottom: 22 },
  list: { gap: 12, paddingBottom: 24 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 17, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 14, elevation: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  cardTitle: { flex: 1, color: "#0f172a", fontSize: 16, fontWeight: "800", lineHeight: 22 },
  status: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: "800", overflow: "hidden" },
  status_pending: { color: "#92400e", backgroundColor: "#fef3c7" },
  status_approved: { color: "#166534", backgroundColor: "#dcfce7" },
  status_rejected: { color: "#b91c1c", backgroundColor: "#fee2e2" },
  status_withdrawn: { color: "#475569", backgroundColor: "#e2e8f0" },
  meta: { color: "#64748b", marginTop: 10 },
  reason: { color: "#334155", backgroundColor: "#f8fafc", borderRadius: 10, padding: 10, marginTop: 12, lineHeight: 19 },
  date: { color: "#94a3b8", fontSize: 12, marginTop: 12 },
  error: { color: "#b91c1c", backgroundColor: "#fef2f2", borderRadius: 12, padding: 12, marginBottom: 12 },
  exportRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  exportButton: { flex: 1, backgroundColor: "#dbeafe", borderRadius: 10, padding: 10, alignItems: "center" },
  exportText: { color: "#1d4ed8", fontSize: 11, fontWeight: "800" },
  empty: { color: "#64748b", textAlign: "center", padding: 28 },
  sectionTitle: { color: "#0f172a", fontSize: 18, fontWeight: "800", marginBottom: 10 },
  history: { marginTop: 18, paddingBottom: 24 },
  historyRow: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 9, flexDirection: "row", alignItems: "center", gap: 10 },
  historyMain: { flex: 1 },
  reasonInput: { borderWidth: 1, borderColor: "#dbe3ef", borderRadius: 11, padding: 11, marginTop: 12, color: "#0f172a" },
  actions: { flexDirection: "row", gap: 10, marginTop: 10 },
  action: { flex: 1, borderRadius: 11, padding: 12, alignItems: "center" },
  approve: { backgroundColor: "#16a34a" },
  reject: { backgroundColor: "#dc2626" },
  actionText: { color: "#fff", fontWeight: "800" },
});
