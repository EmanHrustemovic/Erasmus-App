import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, verifyTwoFactor } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await signIn(email, password);
      if (response.requires_2fa && response.two_factor_token) {
        setChallenge(response.two_factor_token);
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      await verifyTwoFactor(challenge, code);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.brandMark}><Text style={styles.brandLetter}>E</Text></View>
      <Text style={styles.eyebrow}>ERASMUS PORTAL</Text>
      <Text style={styles.title}>{challenge ? "Verify your login" : "Welcome back"}</Text>
      <Text style={styles.subtitle}>
        {challenge
          ? "Enter the six-digit code from your authenticator app."
          : "Sign in with your university account to continue."}
      </Text>
      <View style={styles.card}>
        {error && <Text style={styles.error}>{error}</Text>}
        {!challenge ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="University email"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
            />
            <Pressable style={styles.button} onPress={submit} disabled={busy}>
              <Text style={styles.buttonText}>{busy ? "Signing in..." : "Sign in"}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="6-digit code"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              value={code}
              onChangeText={setCode}
              maxLength={6}
            />
            <Pressable style={styles.button} onPress={submitCode} disabled={busy}>
              <Text style={styles.buttonText}>{busy ? "Verifying..." : "Verify and continue"}</Text>
            </Pressable>
          </>
        )}
      </View>
      {!challenge && (
        <View style={styles.links}>
          <Pressable onPress={() => router.push("/register" as never)}><Text style={styles.link}>Register student account</Text></Pressable>
          <Pressable onPress={() => router.push("/forgot-password" as never)}><Text style={styles.link}>Forgot password?</Text></Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f4f7fb" },
  brandMark: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#2563eb", marginBottom: 18 },
  brandLetter: { color: "#fff", fontSize: 28, fontWeight: "800" },
  eyebrow: { color: "#2563eb", fontSize: 12, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: "#0f172a", fontSize: 34, fontWeight: "800", marginTop: 8 },
  subtitle: { color: "#64748b", fontSize: 16, lineHeight: 24, marginTop: 10, marginBottom: 24 },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 18, gap: 12, shadowColor: "#0f172a", shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 },
  input: { borderWidth: 1, borderColor: "#dbe3ef", borderRadius: 14, padding: 14, fontSize: 16, color: "#0f172a", backgroundColor: "#fbfdff" },
  button: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#2563eb", marginTop: 4 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  error: { color: "#b91c1c", backgroundColor: "#fef2f2", borderRadius: 12, padding: 12, lineHeight: 20 },
  links: { gap: 14, marginTop: 20, alignItems: "center" },
  link: { color: "#2563eb", fontWeight: "700" },
});
