import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function Details() {
  const router = useRouter();
  const dark = useColorScheme() === "dark";
  const { token, user } = useAuth();
  const params = useLocalSearchParams();
  const title = String(params.title ?? "Erasmus call");
  const country = String(params.country ?? "");
  const description = String(params.description ?? "");
  const deadline = String(params.deadline ?? "");
  const link = String(params.link ?? "");
  const callId = String(params.id ?? "");
  const minimumGpa = Number(params.min_gpa ?? 0);
  const requiredDocs = (() => {
    try { return JSON.parse(String(params.required_docs ?? "[]")) as string[]; } catch { return []; }
  })();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [gpa, setGpa] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, DocumentPicker.DocumentPickerAsset>>({});
  const [step, setStep] = useState(1);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    if (!token || !callId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const form = new FormData();
    form.append("full_name", fullName);
    form.append("phone", phone);
    form.append("department", department);
    form.append("gpa", gpa);
    form.append("notes", notes);
    Object.entries(files).forEach(([docType, file]) => {
      form.append(docType, new File(file.uri));
    });
    try {
      await apiRequest(`/calls/${callId}/apply`, { method: "POST", body: form }, token);
      setMessage("Application submitted successfully.");
      setTimeout(() => router.replace("/(tabs)/applications"), 700);
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : "Could not submit application";
      if (detail.toLowerCase().includes("already applied")) {
        setError("You have already applied to this call. Check My applications for the current status.");
        setTimeout(() => router.replace("/(tabs)/applications"), 800);
      } else {
        setError(detail);
      }
    } finally {
      setBusy(false);
    }
  };
  const nextStep = () => {
    if (!fullName.trim() || !phone.trim() || !department.trim() || !gpa.trim()) {
      setFieldError("Complete all required personal and academic fields.");
      return;
    }
    const parsedGpa = Number(gpa);
    if (Number.isNaN(parsedGpa) || parsedGpa < minimumGpa || parsedGpa > 10) {
      setFieldError(`GPA must be between ${minimumGpa} and 10.`);
      return;
    }
    setFieldError(null);
    setStep(current => Math.min(3, current + 1));
  };

  return (
    <ScrollView style={[styles.screen, dark && styles.screenDark]} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>ERASMUS OPPORTUNITY</Text>
      <Text style={[styles.title, dark && styles.darkText]}>{title}</Text>
      <Text style={[styles.meta, dark && styles.darkMuted]}>{country} · Deadline {deadline}</Text>
      <View style={[styles.card, dark && styles.cardDark]}>
        <Text style={[styles.cardTitle, dark && styles.darkText]}>About this call</Text>
        <Text style={[styles.description, dark && styles.darkMuted]}>{description}</Text>
        {link.startsWith("http") && (
          <Pressable onPress={() => Linking.openURL(link)}><Text style={styles.link}>Open official call link</Text></Pressable>
        )}
      </View>
      {user?.role === "student" && (
        <View style={[styles.card, dark && styles.cardDark]}>
          <Text style={[styles.cardTitle, dark && styles.darkText]}>Apply now</Text>
          <View style={styles.progress}><View style={[styles.progressStep, step >= 1 && styles.progressActive]} /><View style={[styles.progressStep, step >= 2 && styles.progressActive]} /><View style={[styles.progressStep, step >= 3 && styles.progressActive]} /></View>
          <Text style={[styles.stepLabel, dark && styles.darkMuted]}>Step {step} of 3 · {step === 1 ? "Personal information" : step === 2 ? "Required documents" : "Review and submit"}</Text>
          {error && <Text style={styles.error}>{error}</Text>}
          {message && <Text style={styles.success}>{message}</Text>}
          {fieldError && <Text style={styles.error}>{fieldError}</Text>}
          {step === 1 && <>
          <Text style={styles.label}>Full name *</Text>
          <TextInput style={styles.input} placeholder="Enter your full name" placeholderTextColor="#64748b" value={fullName} onChangeText={setFullName} />
          <Text style={styles.label}>Phone number *</Text>
          <TextInput style={styles.input} placeholder="Enter your phone number" placeholderTextColor="#64748b" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Text style={styles.label}>Department *</Text>
          <TextInput style={styles.input} placeholder="Enter your department" placeholderTextColor="#64748b" value={department} onChangeText={setDepartment} />
          <Text style={styles.label}>GPA * <Text style={styles.hint}>(minimum {minimumGpa})</Text></Text>
          <TextInput style={styles.input} placeholder="e.g. 8.50" placeholderTextColor="#64748b" value={gpa} onChangeText={setGpa} keyboardType="decimal-pad" />
          <Text style={styles.label}>Additional notes</Text>
          <TextInput style={[styles.input, styles.notes]} placeholder="Optional notes" placeholderTextColor="#64748b" value={notes} onChangeText={setNotes} multiline />
          <Pressable style={styles.button} onPress={nextStep}><Text style={styles.buttonText}>Continue to documents</Text></Pressable>
          </>}
          {step === 2 && <>
          <Text style={styles.helper}>Attach the documents required for this call. You can review everything before sending.</Text>
          {requiredDocs.map(doc => (
            <Pressable key={doc} style={styles.fileButton} onPress={async () => {
              const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: "*/*" });
              if (!result.canceled) setFiles(current => ({ ...current, [doc]: result.assets[0] }));
            }}>
              <Text style={styles.fileText}>{files[doc]?.name ?? `Attach ${doc.replaceAll("_", " ")}`}</Text>
            </Pressable>
          ))}
          <View style={styles.navigation}><Pressable style={styles.secondaryButton} onPress={() => setStep(1)}><Text style={styles.secondaryText}>Back</Text></Pressable><Pressable style={styles.buttonSmall} onPress={() => setStep(3)}><Text style={styles.buttonText}>Review</Text></Pressable></View>
          </>}
          {step === 3 && (
            <View>
              <View style={styles.review}>
                <Text style={[styles.reviewTitle, dark && styles.darkText]}>Application summary</Text>
                <Text style={[styles.reviewRow, dark && styles.darkMuted]}>Name: {fullName}</Text>
                <Text style={[styles.reviewRow, dark && styles.darkMuted]}>Phone: {phone}</Text>
                <Text style={[styles.reviewRow, dark && styles.darkMuted]}>Department: {department}</Text>
                <Text style={[styles.reviewRow, dark && styles.darkMuted]}>GPA: {gpa}</Text>
                <Text style={[styles.reviewRow, dark && styles.darkMuted]}>Documents: {Object.keys(files).length}/{requiredDocs.length}</Text>
                {notes ? <Text style={[styles.reviewRow, dark && styles.darkMuted]}>Notes: {notes}</Text> : null}
              </View>
              <View style={styles.navigation}>
                <Pressable style={styles.secondaryButton} onPress={() => setStep(2)}><Text style={styles.secondaryText}>Back</Text></Pressable>
                <Pressable style={styles.buttonSmall} onPress={apply} disabled={busy}><Text style={styles.buttonText}>{busy ? "Submitting..." : "Submit application"}</Text></Pressable>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7fb" },
  screenDark: { backgroundColor: "#0f172a" },
  content: { padding: 20, paddingTop: 58, paddingBottom: 40 },
  eyebrow: { color: "#2563eb", fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#0f172a", fontSize: 28, fontWeight: "800", marginTop: 7 },
  meta: { color: "#64748b", marginTop: 8 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 18, marginTop: 20, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 14, elevation: 2 },
  cardDark: { backgroundColor: "#1e293b" },
  darkText: { color: "#f8fafc" },
  darkMuted: { color: "#cbd5e1" },
  cardTitle: { color: "#0f172a", fontSize: 18, fontWeight: "800" },
  description: { color: "#475569", lineHeight: 22, marginTop: 10 },
  helper: { color: "#64748b", lineHeight: 20, marginTop: 8, marginBottom: 8 },
  link: { color: "#2563eb", fontWeight: "700", marginTop: 16 },
  input: { borderWidth: 1.5, borderColor: "#94a3b8", borderRadius: 13, padding: 14, marginTop: 7, color: "#0f172a", backgroundColor: "#fff", fontSize: 15 },
  label: { color: "#1e293b", fontSize: 13, fontWeight: "800", marginTop: 15 },
  hint: { color: "#64748b", fontWeight: "500" },
  notes: { minHeight: 78, textAlignVertical: "top" },
  button: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#2563eb", marginTop: 14 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  fileButton: { borderWidth: 1, borderStyle: "dashed", borderColor: "#93c5fd", borderRadius: 12, padding: 13, marginTop: 11, backgroundColor: "#eff6ff" },
  fileText: { color: "#1d4ed8", fontWeight: "700" },
  progress: { flexDirection: "row", gap: 5, marginTop: 17 },
  progressStep: { flex: 1, height: 5, borderRadius: 5, backgroundColor: "#e2e8f0" },
  progressActive: { backgroundColor: "#2563eb" },
  stepLabel: { color: "#64748b", fontSize: 12, fontWeight: "700", marginTop: 8 },
  navigation: { flexDirection: "row", gap: 10, marginTop: 15 },
  secondaryButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1.5, borderColor: "#2563eb" },
  secondaryText: { color: "#2563eb", fontWeight: "800" },
  buttonSmall: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#2563eb" },
  review: { backgroundColor: "#f8fafc", borderRadius: 14, padding: 14, marginTop: 14 },
  reviewTitle: { color: "#0f172a", fontSize: 16, fontWeight: "800", marginBottom: 8 },
  reviewRow: { color: "#475569", lineHeight: 22 },
  error: { color: "#b91c1c", backgroundColor: "#fef2f2", borderRadius: 10, padding: 10, marginTop: 10 },
  success: { color: "#166534", backgroundColor: "#dcfce7", borderRadius: 10, padding: 10, marginTop: 10 },
});
