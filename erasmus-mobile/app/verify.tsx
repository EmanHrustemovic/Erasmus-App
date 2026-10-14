import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
export default function VerifyScreen() {
  const router = useRouter(); const { token } = useLocalSearchParams(); const [status, setStatus] = useState("Verifying your email...");
  useEffect(() => { void (async () => { try { const result = await apiRequest<{ message: string }>("/auth/verify-email", { method: "POST", body: JSON.stringify({ token: String(token ?? "") }) }); setStatus(result.message); } catch (err: unknown) { setStatus(err instanceof Error ? err.message : "Verification failed"); } })(); }, [token]);
  return <View style={styles.screen}><Text style={styles.eyebrow}>EMAIL VERIFICATION</Text><Text style={styles.title}>{status}</Text><Pressable style={styles.button} onPress={() => router.replace("/login" as never)}><Text style={styles.buttonText}>Go to login</Text></Pressable></View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f4f7fb" }, eyebrow: { color: "#2563eb", fontWeight: "800", letterSpacing: 1.4 }, title: { color: "#0f172a", fontSize: 28, fontWeight: "800", marginTop: 8, lineHeight: 36 }, button: { backgroundColor: "#2563eb", borderRadius: 14, minHeight: 50, justifyContent: "center", alignItems: "center", marginTop: 22 }, buttonText: { color: "#fff", fontWeight: "800" } });
