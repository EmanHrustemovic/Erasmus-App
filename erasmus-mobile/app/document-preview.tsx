import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { useAuth } from "@/lib/auth";

export default function DocumentPreviewScreen() {
  const { token } = useAuth();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const url = `${process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.68:8000"}/documents/${id}`;
  if (!token || !id) return <View style={styles.center}><ActivityIndicator color="#2563eb" /></View>;
  return <View style={styles.screen}>
    <Text style={styles.title}>{name ?? "Document preview"}</Text>
    <WebView
      source={{ uri: url, headers: { Authorization: `Bearer ${token}` } }}
      startInLoadingState
      renderLoading={() => <View style={styles.center}><ActivityIndicator color="#2563eb" /></View>}
      style={styles.webview}
    />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7fb", paddingTop: 55 },
  title: { color: "#0f172a", fontSize: 17, fontWeight: "800", padding: 16 },
  webview: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
