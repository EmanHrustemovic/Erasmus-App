import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";

export default function RegisterScreen() {
  const router = useRouter(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setStatus("");
    try { const result = await apiRequest<{ message: string }>("/auth/register", { method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase(), password }) }); setStatus(result.message); }
    catch (err: unknown) { setStatus(err instanceof Error ? err.message : "Registration failed"); }
    finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <Text style={styles.eyebrow}>ERASMUS PORTAL</Text><Text style={styles.title}>Create student account</Text><Text style={styles.subtitle}>Use your university email. A verification link will be sent.</Text>
    {status && <Text style={styles.status}>{status}</Text>}<TextInput style={styles.input} placeholder="name@stu.ibu.edu.ba" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
    <TextInput style={styles.input} placeholder="Password (minimum 8 characters)" value={password} onChangeText={setPassword} secureTextEntry />
    <Pressable style={styles.button} onPress={submit} disabled={busy}><Text style={styles.buttonText}>{busy ? "Creating..." : "Register"}</Text></Pressable>
    <Pressable onPress={() => router.replace("/login" as never)}><Text style={styles.link}>Back to login</Text></Pressable>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f4f7fb" }, eyebrow: { color: "#2563eb", fontWeight: "800", letterSpacing: 1.4 }, title: { color: "#0f172a", fontSize: 30, fontWeight: "800", marginTop: 8 }, subtitle: { color: "#64748b", lineHeight: 22, marginTop: 8, marginBottom: 20 }, input: { borderWidth: 1, borderColor: "#dbe3ef", borderRadius: 14, padding: 14, marginTop: 11, color: "#0f172a", backgroundColor: "#fff" }, button: { backgroundColor: "#2563eb", borderRadius: 14, minHeight: 50, justifyContent: "center", alignItems: "center", marginTop: 16 }, buttonText: { color: "#fff", fontWeight: "800" }, status: { color: "#166534", backgroundColor: "#dcfce7", borderRadius: 10, padding: 11 }, link: { color: "#2563eb", fontWeight: "700", textAlign: "center", marginTop: 20 } });
