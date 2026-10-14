import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Audit = { id: number; action: string; entity_type?: string; entity_id?: number; actor_email?: string; created_at: string; details?: string | null };

export default function AuditLogScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!token) return;
    try { setItems(await apiRequest<Audit[]>("/audit-log?limit=100", {}, token)); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Could not load audit log"); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  if (!user || user.role !== "admin" || !token) return <Redirect href={"/(tabs)" as never} />;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back to portal</Text></Pressable>
    <Text style={styles.eyebrow}>ADMINISTRATION</Text><Text style={styles.title}>Audit log</Text><Text style={styles.subtitle}>A complete record of administrative activity.</Text>
    {loading ? <ActivityIndicator color="#2563eb" /> : error ? <Text style={styles.error}>{error}</Text> : items.map(item => <View style={styles.card} key={item.id}><Text style={styles.action}>{item.action}</Text><Text style={styles.meta}>{item.entity_type ?? "System"}{item.entity_id ? ` #${item.entity_id}` : ""} · {item.actor_email ?? "Unknown actor"}</Text>{item.details ? <Text style={styles.details}>{item.details}</Text> : null}<Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text></View>)}
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#f4f7fb" }, content: { padding: 20, paddingTop: 56, paddingBottom: 40 }, back: { color: "#2563eb", fontWeight: "700", marginBottom: 24 }, eyebrow: { color: "#2563eb", fontSize: 11, fontWeight: "800", letterSpacing: 1.4 }, title: { color: "#0f172a", fontSize: 30, fontWeight: "800", marginTop: 6 }, subtitle: { color: "#64748b", marginTop: 6, marginBottom: 20 }, card: { backgroundColor: "#fff", borderRadius: 16, padding: 15, marginBottom: 10 }, action: { color: "#0f172a", fontWeight: "800" }, meta: { color: "#64748b", marginTop: 7 }, details: { color: "#334155", marginTop: 8 }, date: { color: "#94a3b8", fontSize: 12, marginTop: 9 }, error: { color: "#b91c1c", padding: 12 } });
