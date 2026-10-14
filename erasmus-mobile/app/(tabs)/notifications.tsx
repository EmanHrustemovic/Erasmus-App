import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Notification = { id: number; subject: string; body: string; created_at: string; read_at?: string | null };

export default function NotificationsScreen() {
  const { token, user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [messages, count] = await Promise.all([
        apiRequest<Notification[]>("/inbox", {}, token),
        apiRequest<{ count: number }>("/inbox/unread-count", {}, token),
      ]);
      setItems(messages); setUnread(count.count);
    }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);
  const markAllRead = async () => {
    if (!token || unread === 0) return;
    await apiRequest("/inbox/mark-all-read", { method: "POST" }, token);
    setItems(current => current.map(item => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    setUnread(0);
  };
  const deleteMessage = async (id: number) => {
    if (!token) return;
    await apiRequest(`/inbox/${id}`, { method: "DELETE" }, token);
    setItems(current => current.filter(item => item.id !== id));
    setUnread(current => Math.max(0, current - (items.find(item => item.id === id)?.read_at ? 0 : 1)));
  };
  useEffect(() => { void load(); }, [load]);
  if (authLoading) return <View style={styles.center}><ActivityIndicator color="#2563eb" /></View>;
  if (!user || !token) return <Redirect href={"/login" as never} />;
  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>PORTAL UPDATES</Text>
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.subtitle}>Important updates about calls and applications. {unread > 0 ? `${unread} unread` : "All caught up."}</Text>
      <View style={styles.toolbar}>
        <Pressable onPress={() => void markAllRead()}><Text style={styles.toolbarAction}>Mark all read</Text></Pressable>
        <Text style={styles.toolbarHint}>Tap a message to read it</Text>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color="#2563eb" /></View> : (
        <FlatList data={items} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
          keyExtractor={item => String(item.id)}
          ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
          renderItem={({ item }) => <Pressable style={[styles.card, !item.read_at && styles.unread]} onPress={async () => {
            if (!item.read_at) {
              await apiRequest(`/inbox/${item.id}/read`, { method: "POST" }, token);
              setItems(current => current.map(message => message.id === item.id ? { ...message, read_at: new Date().toISOString() } : message));
            }
          }}>
            <Text style={styles.cardTitle}>{item.subject}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <View style={styles.messageFooter}><Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text><Pressable onPress={() => Alert.alert("Delete message?", "This message will be removed from your inbox.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void deleteMessage(item.id) }])}><Text style={styles.delete}>Delete</Text></Pressable></View>
          </Pressable>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7fb", paddingTop: 58, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: "#2563eb", fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#0f172a", fontSize: 30, fontWeight: "800", marginTop: 6 },
  subtitle: { color: "#64748b", marginTop: 5, marginBottom: 22 },
  list: { gap: 12, paddingBottom: 24 },
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 17, shadowColor: "#0f172a", shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardTitle: { color: "#0f172a", fontSize: 16, fontWeight: "800" },
  body: { color: "#475569", lineHeight: 21, marginTop: 8 },
  date: { color: "#94a3b8", fontSize: 12, marginTop: 12 },
  empty: { color: "#64748b", textAlign: "center", padding: 28 },
  unread: { borderLeftWidth: 4, borderLeftColor: "#2563eb" },
  toolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  toolbarAction: { color: "#2563eb", fontWeight: "800" },
  toolbarHint: { color: "#94a3b8", fontSize: 12 },
  messageFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  delete: { color: "#dc2626", fontWeight: "700", fontSize: 12 },
});
