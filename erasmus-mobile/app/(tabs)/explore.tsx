import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

type SetupResponse = { secret: string; qr_code: string };

export default function SecurityScreen() {
  const { token, user, refreshUser } = useAuth();
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const startSetup = async () => {
    if (!token) return;
    try {
      setSetup(await apiRequest<SetupResponse>("/auth/2fa/setup", { method: "POST" }, token));
      setMessage(null);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Could not start 2FA setup");
    }
  };

  const confirm = async () => {
    if (!token) return;
    try {
      const response = await apiRequest<{ message: string }>(
        "/auth/2fa/confirm",
        { method: "POST", body: JSON.stringify({ code }) },
        token
      );
      setMessage(response.message);
      setSetup(null);
      setCode("");
      await refreshUser();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Invalid code");
    }
  };
  const changePassword = async () => {
    if (!token) return;
    try {
      const response = await apiRequest<{ message: string }>("/auth/change-password", { method: "POST", body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) }, token);
      setMessage(response.message); setCurrentPassword(""); setNewPassword("");
    } catch (err: unknown) { setMessage(err instanceof Error ? err.message : "Could not change password"); }
  };
  const disable = async () => {
    if (!token) return;
    try { const response = await apiRequest<{ message: string }>("/auth/2fa/disable", { method: "POST", body: JSON.stringify({ code }) }, token); setMessage(response.message); setCode(""); }
    catch (err: unknown) { setMessage(err instanceof Error ? err.message : "Could not disable 2FA"); }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>ACCOUNT SECURITY</Text>
      <Text style={styles.title}>Protect your account</Text>
      <Text style={styles.subtitle}>{user?.email}</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Two-factor authentication</Text>
        <Text style={styles.text}>
          Status: {user?.two_factor_enabled ? "Enabled" : "Disabled"}
        </Text>
        {message && <Text style={styles.message}>{message}</Text>}
        {!user?.two_factor_enabled && !setup && (
          <Pressable style={styles.button} onPress={startSetup}>
            <Text style={styles.buttonText}>Set up 2FA</Text>
          </Pressable>
        )}
        {setup && (
          <View style={styles.setup}>
            <Image source={{ uri: setup.qr_code }} style={styles.qr} />
            <Text style={styles.text}>Scan the QR code, then enter the authenticator code.</Text>
            <Text style={styles.secret}>{setup.secret}</Text>
            <TextInput style={styles.input} placeholder="6-digit code" placeholderTextColor="#94a3b8" keyboardType="number-pad" value={code} onChangeText={setCode} maxLength={6} />
            <Pressable style={styles.button} onPress={confirm}><Text style={styles.buttonText}>Confirm 2FA</Text></Pressable>
          </View>
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Change password</Text>
        <TextInput style={styles.input} placeholder="Current password" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
        <TextInput style={styles.input} placeholder="New password (minimum 8 characters)" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
        <Pressable style={styles.button} onPress={changePassword}><Text style={styles.buttonText}>Update password</Text></Pressable>
      </View>
      {user?.two_factor_enabled && <View style={styles.card}>
        <Text style={styles.cardTitle}>Disable 2FA</Text>
        <Text style={styles.text}>Enter the current authenticator code to disable two-factor authentication.</Text>
        <TextInput style={styles.input} placeholder="6-digit code" keyboardType="number-pad" value={code} onChangeText={setCode} maxLength={6} />
        <Pressable style={styles.dangerButton} onPress={disable}><Text style={styles.buttonText}>Disable 2FA</Text></Pressable>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7fb", paddingTop: 58, paddingHorizontal: 20 },
  eyebrow: { color: "#2563eb", fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#0f172a", fontSize: 30, fontWeight: "800", marginTop: 6 },
  subtitle: { color: "#64748b", fontSize: 13, marginTop: 5, marginBottom: 22 },
  card: { backgroundColor: "#fff", borderRadius: 22, padding: 18, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 14, elevation: 2 },
  cardTitle: { color: "#0f172a", fontSize: 18, fontWeight: "800" },
  text: { color: "#64748b", lineHeight: 21, marginTop: 8 },
  message: { color: "#166534", backgroundColor: "#dcfce7", borderRadius: 12, padding: 11, marginTop: 14 },
  button: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#2563eb", borderRadius: 14, marginTop: 16 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  setup: { marginTop: 12 },
  qr: { width: 220, height: 220, alignSelf: "center", marginVertical: 12 },
  secret: { color: "#1d4ed8", fontWeight: "800", letterSpacing: 1.2, marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#dbe3ef", borderRadius: 14, padding: 14, marginTop: 14, color: "#0f172a", fontSize: 16 },
  dangerButton: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#dc2626", borderRadius: 14, marginTop: 16 },
});
