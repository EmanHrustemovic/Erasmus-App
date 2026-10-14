import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { readCached, writeCached } from "@/lib/offline-cache";

type ErasmusCall = {
  id: number;
  title: string;
  country: string;
  description: string;
  deadline: string;
  link: string;
  min_gpa?: number;
  required_docs?: string[];
};
type ApplicationSummary = { id: number; status: string };

export default function HomeScreen() {
  const router = useRouter();
  const { user, token, loading: authLoading, signOut } = useAuth();
  const [calls, setCalls] = useState<ErasmusCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const role = user?.role;

  const loadCalls = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      await apiRequest<{ status: string }>("/health");
      setApiStatus("online");
      const [nextCalls, nextApplications] = await Promise.all([
        apiRequest<ErasmusCall[]>("/calls", {}, token),
        apiRequest<ApplicationSummary[]>(role === "admin" ? "/applications" : "/applications/me", {}, token),
      ]);
      setCalls(nextCalls);
      setApplications(nextApplications);
      await Promise.all([writeCached("calls", nextCalls), writeCached(`applications-${role}`, nextApplications)]);
    } catch (err: unknown) {
      setApiStatus("offline");
      const [cachedCalls, cachedApplications] = await Promise.all([
        readCached<ErasmusCall[]>("calls"),
        readCached<ApplicationSummary[]>(`applications-${role}`),
      ]);
      if (cachedCalls) setCalls(cachedCalls);
      if (cachedApplications) setApplications(cachedApplications);
      setError(err instanceof Error ? err.message : "Could not load calls");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, role]);

  useEffect(() => {
    const timer = setTimeout(() => void loadCalls(), 0);
    return () => clearTimeout(timer);
  }, [loadCalls]);

  if (authLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }
  if (!user || !token) return <Redirect href={"/login" as never} />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>ERASMUS PORTAL</Text>
          <Text style={styles.title}>Good to see you</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
        <Pressable onPress={signOut} style={styles.logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Find your next mobility opportunity.</Text>
        <Text style={styles.heroText}>Browse open calls and review deadlines, requirements, and GPA thresholds.</Text>
      </View>
      {user.role === "admin" && (
        <View>
          <Pressable style={styles.manage} onPress={() => router.push("/admin-calls" as never)}>
            <Text style={styles.manageText}>Manage calls as administrator →</Text>
          </Pressable>
          <Pressable style={styles.audit} onPress={() => router.push("/audit-log" as never)}>
            <Text style={styles.auditText}>Open audit log →</Text>
          </Pressable>
        </View>
      )}
      <View style={[styles.connection, apiStatus === "offline" && styles.connectionOffline]}>
        <View style={[styles.connectionDot, apiStatus === "online" && styles.connectionOnline, apiStatus === "offline" && styles.connectionOfflineDot]} />
        <Text style={styles.connectionText}>
          {apiStatus === "online" ? "Backend connected" : apiStatus === "offline" ? "Offline mode — showing saved data" : "Checking connection…"}
        </Text>
        {apiStatus === "offline" && <Pressable onPress={() => { setLoading(true); void loadCalls(); }}><Text style={styles.retry}>Retry</Text></Pressable>}
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statValue}>{calls.length}</Text><Text style={styles.statLabel}>Open calls</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{applications.length}</Text><Text style={styles.statLabel}>{user.role === "admin" ? "Applications" : "My applications"}</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{applications.filter(item => item.status === (user.role === "admin" ? "pending" : "approved")).length}</Text><Text style={styles.statLabel}>{user.role === "admin" ? "Pending review" : "Approved"}</Text></View>
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Open calls</Text>
        <Text style={styles.count}>{calls.length} available</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#2563eb" /></View>
      ) : (
        <FlatList
          data={calls}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadCalls();
              }}
              tintColor="#2563eb"
            />
          }
          keyExtractor={item => String(item.id)}
          ListEmptyComponent={<Text style={styles.empty}>No open calls available.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() =>
                router.push({
                  pathname: "/details",
                  params: {
                    id: String(item.id),
                    title: item.title,
                    country: item.country,
                    description: item.description,
                    deadline: item.deadline,
                    link: item.link,
                    min_gpa: String(item.min_gpa ?? 0),
                    required_docs: JSON.stringify(item.required_docs ?? []),
                  },
                })
              }
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.open}>OPEN</Text>
              </View>
              <Text style={styles.meta}>{item.country}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.meta}>Deadline {item.deadline}</Text>
                {item.min_gpa ? <Text style={styles.meta}>Min GPA {item.min_gpa}</Text> : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7fb", paddingTop: 56, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f4f7fb" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eyebrow: { color: "#2563eb", fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#0f172a", fontSize: 27, fontWeight: "800", marginTop: 5 },
  email: { color: "#64748b", fontSize: 12, marginTop: 4 },
  logout: { borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: "#e8eef8" },
  logoutText: { color: "#1d4ed8", fontWeight: "700" },
  hero: { backgroundColor: "#1e3a8a", borderRadius: 24, padding: 20, marginTop: 22, marginBottom: 24 },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800", lineHeight: 28 },
  heroText: { color: "#dbeafe", fontSize: 14, lineHeight: 21, marginTop: 8 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: "#0f172a", fontSize: 20, fontWeight: "800" },
  count: { color: "#64748b", fontSize: 13 },
  list: { paddingBottom: 28, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 17, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 14, elevation: 2 },
  cardPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  cardTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  cardTitle: { flex: 1, color: "#0f172a", fontSize: 17, fontWeight: "800", lineHeight: 23 },
  open: { color: "#166534", backgroundColor: "#dcfce7", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: "800" },
  meta: { color: "#64748b", fontSize: 13, marginTop: 8 },
  cardFooter: { flexDirection: "row", gap: 18, marginTop: 2 },
  error: { color: "#b91c1c", backgroundColor: "#fef2f2", borderRadius: 12, padding: 12, marginBottom: 12 },
  empty: { color: "#64748b", textAlign: "center", padding: 28 },
  manage: { backgroundColor: "#dbeafe", borderRadius: 14, padding: 14, marginBottom: 18 },
  manageText: { color: "#1d4ed8", fontWeight: "800", textAlign: "center" },
  stats: { flexDirection: "row", gap: 9, marginBottom: 20 },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: 15, padding: 12 },
  statValue: { color: "#0f172a", fontSize: 22, fontWeight: "800" },
  statLabel: { color: "#64748b", fontSize: 11, marginTop: 4 },
  audit: { padding: 8, marginTop: -12, marginBottom: 14 },
  auditText: { color: "#64748b", textAlign: "center", fontWeight: "700", fontSize: 12 },
  connection: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ecfdf5", borderRadius: 10, padding: 9, marginBottom: 14 },
  connectionOffline: { backgroundColor: "#fff7ed" },
  connectionDot: { width: 8, height: 8, borderRadius: 99, backgroundColor: "#94a3b8" },
  connectionOnline: { backgroundColor: "#16a34a" },
  connectionOfflineDot: { backgroundColor: "#ea580c" },
  connectionText: { flex: 1, color: "#475569", fontSize: 12, fontWeight: "700" },
  retry: { color: "#c2410c", fontWeight: "800", fontSize: 12 },
});
