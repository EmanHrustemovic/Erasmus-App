import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Redirect, useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Call = { id: number; title: string; country: string; description: string; deadline: string; link: string; erasmus_email?: string; min_gpa: number; required_docs: string[] };
type Form = Omit<Call, "id" | "min_gpa" | "required_docs"> & { min_gpa: string; required_docs: string[] };
const docs = ["cv", "transcript", "motivation", "language_proof", "recommendation", "learning_agreement", "id_copy", "application_form"];
const countries = [
  ["🇦🇫", "Afghanistan"], ["🇦🇱", "Albania"], ["🇩🇿", "Algeria"], ["🇦🇷", "Argentina"], ["🇦🇺", "Australia"], ["🇦🇹", "Austria"],
  ["🇧🇪", "Belgium"], ["🇧🇦", "Bosnia and Herzegovina"], ["🇧🇷", "Brazil"], ["🇧🇬", "Bulgaria"], ["🇨🇦", "Canada"], ["🇨🇱", "Chile"],
  ["🇨🇳", "China"], ["🇨🇴", "Colombia"], ["🇭🇷", "Croatia"], ["🇨🇾", "Cyprus"], ["🇨🇿", "Czech Republic"], ["🇩🇰", "Denmark"],
  ["🇪🇬", "Egypt"], ["🇪🇪", "Estonia"], ["🇫🇮", "Finland"], ["🇫🇷", "France"], ["🇬🇪", "Georgia"], ["🇩🇪", "Germany"],
  ["🇬🇷", "Greece"], ["🇭🇺", "Hungary"], ["🇮🇸", "Iceland"], ["🇮🇳", "India"], ["🇮🇩", "Indonesia"], ["🇮🇪", "Ireland"],
  ["🇮🇱", "Israel"], ["🇮🇹", "Italy"], ["🇯🇵", "Japan"], ["🇯🇴", "Jordan"], ["🇰🇿", "Kazakhstan"], ["🇰🇪", "Kenya"],
  ["🇽🇰", "Kosovo"], ["🇱🇻", "Latvia"], ["🇱🇧", "Lebanon"], ["🇱🇹", "Lithuania"], ["🇱🇺", "Luxembourg"], ["🇲🇾", "Malaysia"],
  ["🇲🇹", "Malta"], ["🇲🇽", "Mexico"], ["🇲🇩", "Moldova"], ["🇲🇪", "Montenegro"], ["🇲🇦", "Morocco"], ["🇳🇱", "Netherlands"],
  ["🇳🇿", "New Zealand"], ["🇳🇬", "Nigeria"], ["🇲🇰", "North Macedonia"], ["🇳🇴", "Norway"], ["🇵🇰", "Pakistan"], ["🇵🇪", "Peru"],
  ["🇵🇭", "Philippines"], ["🇵🇱", "Poland"], ["🇵🇹", "Portugal"], ["🇶🇦", "Qatar"], ["🇷🇴", "Romania"], ["🇷🇺", "Russia"],
  ["🇸🇦", "Saudi Arabia"], ["🇷🇸", "Serbia"], ["🇸🇬", "Singapore"], ["🇸🇰", "Slovakia"], ["🇸🇮", "Slovenia"], ["🇿🇦", "South Africa"],
  ["🇰🇷", "South Korea"], ["🇪🇸", "Spain"], ["🇸🇪", "Sweden"], ["🇨🇭", "Switzerland"], ["🇹🇼", "Taiwan"], ["🇹🇭", "Thailand"],
  ["🇹🇳", "Tunisia"], ["🇹🇷", "Turkey"], ["🇺🇦", "Ukraine"], ["🇦🇪", "United Arab Emirates"], ["🇬🇧", "United Kingdom"],
  ["🇺🇸", "United States"], ["🇺🇾", "Uruguay"], ["🇺🇿", "Uzbekistan"], ["🇻🇳", "Vietnam"], ["🇿🇼", "Zimbabwe"],
] as const;
const empty: Form = { title: "", country: "", description: "", deadline: "", link: "", erasmus_email: "", min_gpa: "0", required_docs: [] };

export default function AdminCallsScreen() {
  const router = useRouter();
  const { token, user, loading: authLoading } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [form, setForm] = useState<Form>(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const filteredCountries = countries.filter((country) =>
    country[1].toLocaleLowerCase().includes(countryQuery.trim().toLocaleLowerCase())
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  const load = useCallback(async () => {
    if (token) setCalls(await apiRequest<Call[]>("/calls", {}, token));
  }, [token]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  if (authLoading) return <View style={styles.center}><ActivityIndicator color="#2563eb" /></View>;
  if (!user || user.role !== "admin" || !token) return <Redirect href={"/(tabs)" as never} />;

  const save = async () => {
    setBusy(true); setMessage(null);
    if (!form.title.trim() || !form.country || !form.description.trim() || !form.deadline || !form.link.trim() || !(form.erasmus_email ?? "").trim()) {
      setMessage("Complete all required fields before saving.");
      setBusy(false);
      return;
    }
    try { new URL(form.link); } catch { setMessage("Enter a valid call link starting with https://."); setBusy(false); return; }
    try {
      const payload = { ...form, min_gpa: Number(form.min_gpa), erasmus_email: form.erasmus_email || null };
      await apiRequest(editing ? `/calls/${editing}` : "/calls", { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) }, token);
      setForm(empty); setEditing(null); setMessage("Call saved successfully."); await load();
    } catch (err: unknown) { setMessage(err instanceof Error ? err.message : "Could not save call"); }
    finally { setBusy(false); }
  };
  const remove = async (id: number) => {
    try { await apiRequest(`/calls/${id}`, { method: "DELETE" }, token); await load(); }
    catch (err: unknown) { setMessage(err instanceof Error ? err.message : "Could not delete call"); }
  };
  const field = (key: keyof Form, placeholder: string) => (
    <TextInput style={styles.input} placeholder={placeholder} value={String(form[key] ?? "")}
      onChangeText={value => setForm(current => ({ ...current, [key]: value }))} />
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back to portal</Text></Pressable>
      <Text style={styles.eyebrow}>ADMINISTRATION</Text>
      <Text style={styles.title}>Manage Erasmus calls</Text>
      <Text style={styles.subtitle}>Create, edit and remove opportunities directly from mobile.</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{editing ? "Edit call" : "Add new call"}</Text>
        <Text style={styles.label}>Call title *</Text>{field("title", "e.g. Erasmus exchange 2026")}
        <Text style={styles.label}>Country *</Text><Pressable style={styles.select} onPress={() => setCountryOpen(true)}><Text style={form.country ? styles.selectValue : styles.placeholder}>{form.country || "Select country"}</Text><Text style={styles.chevron}>⌄</Text></Pressable>
        <Text style={styles.label}>Application deadline *</Text><Pressable style={styles.select} onPress={() => setCalendarOpen(true)}><Text style={form.deadline ? styles.selectValue : styles.placeholder}>{form.deadline || "Select deadline"}</Text><Text style={styles.chevron}>⌄</Text></Pressable>
        {calendarOpen && <DateTimePicker value={form.deadline ? new Date(form.deadline) : new Date()} mode="date" minimumDate={new Date()} onValueChange={(_, value) => { setCalendarOpen(false); if (value) setForm(current => ({ ...current, deadline: value.toISOString().slice(0, 10) })); }} onDismiss={() => setCalendarOpen(false)} />}
        <Text style={styles.label}>Official call link *</Text>{field("link", "https://...")}
        <Text style={styles.label}>Erasmus contact email *</Text>{field("erasmus_email", "contact@ibu.edu.ba")}
        <Text style={styles.label}>Minimum GPA</Text>{field("min_gpa", "0.00")}
        <Text style={styles.label}>Description *</Text><TextInput style={[styles.input, styles.large]} placeholder="Describe the opportunity and requirements" value={form.description} onChangeText={value => setForm(current => ({ ...current, description: value }))} multiline />
        <Text style={styles.label}>Required documents</Text>
        <View style={styles.docGrid}>{docs.map(doc => {
          const selected = form.required_docs.includes(doc);
          return <Pressable key={doc} onPress={() => setForm(current => ({ ...current, required_docs: selected ? current.required_docs.filter(item => item !== doc) : [...current.required_docs, doc] }))} style={[styles.doc, selected && styles.docSelected]}>
            <Text style={[styles.docText, selected && styles.docTextSelected]}>{doc.replaceAll("_", " ")}</Text>
          </Pressable>;
        })}</View>
        {message && <Text style={styles.message}>{message}</Text>}
        <Pressable style={styles.button} onPress={save} disabled={busy}><Text style={styles.buttonText}>{busy ? "Saving..." : editing ? "Save changes" : "Create call"}</Text></Pressable>
        {editing && <Pressable onPress={() => { setEditing(null); setForm(empty); }}><Text style={styles.cancel}>Cancel editing</Text></Pressable>}
      </View>
      <Text style={styles.sectionTitle}>Current calls ({calls.length})</Text>
      {calls.map(call => <View style={styles.call} key={call.id}>
        <Text style={styles.callTitle}>{call.title}</Text><Text style={styles.meta}>{call.country} · Deadline {call.deadline}</Text>
        <View style={styles.actions}><Pressable onPress={() => { setEditing(call.id); setForm({ ...call, min_gpa: String(call.min_gpa), required_docs: call.required_docs ?? [] }); }}><Text style={styles.edit}>Edit</Text></Pressable><Pressable onPress={() => Alert.alert("Delete call?", "This action cannot be undone.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void remove(call.id) }])}><Text style={styles.delete}>Delete</Text></Pressable></View>
      </View>)}
      <Modal visible={countryOpen} transparent animationType="slide" onRequestClose={() => setCountryOpen(false)}>
        <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}><Text style={styles.cardTitle}>Select country</Text><Pressable onPress={() => setCountryOpen(false)}><Text style={styles.close}>Close</Text></Pressable></View>
              <TextInput style={styles.search} placeholder="Search countries..." placeholderTextColor="#64748b" value={countryQuery} onChangeText={setCountryQuery} autoFocus />
              {filteredCountries.length === 0
                ? <Text style={styles.noResults}>No countries found.</Text>
                : <FlatList
                    data={filteredCountries}
                    keyExtractor={([, country]) => country}
                    keyboardShouldPersistTaps="handled"
                    style={styles.countryList}
                    renderItem={({ item: [flag, country] }) => (
                      <Pressable style={styles.countryOption} onPress={() => { setForm(current => ({ ...current, country })); setCountryQuery(""); setCountryOpen(false); }}>
                        <Text style={styles.countryText}>{flag}  {country}</Text>
                      </Pressable>
                    )}
                  />}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7fb" }, content: { padding: 20, paddingTop: 56, paddingBottom: 40 }, center: { flex: 1, alignItems: "center", justifyContent: "center" },
  back: { color: "#2563eb", fontWeight: "700", marginBottom: 24 }, eyebrow: { color: "#2563eb", fontSize: 11, fontWeight: "800", letterSpacing: 1.4 }, title: { color: "#0f172a", fontSize: 29, fontWeight: "800", marginTop: 6 }, subtitle: { color: "#64748b", lineHeight: 21, marginTop: 6, marginBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 17, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 14, elevation: 2 }, cardTitle: { color: "#0f172a", fontSize: 18, fontWeight: "800", marginBottom: 4 },         input: { borderWidth: 1.5, borderColor: "#94a3b8", backgroundColor: "#fff", borderRadius: 12, padding: 13, marginTop: 7, color: "#0f172a", fontSize: 15 }, select: { borderWidth: 1.5, borderColor: "#94a3b8", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginTop: 7, flexDirection: "row", justifyContent: "space-between" }, selectValue: { color: "#0f172a", fontWeight: "600" }, placeholder: { color: "#64748b" }, chevron: { color: "#2563eb", fontSize: 18 }, large: { minHeight: 110, textAlignVertical: "top" }, label: { color: "#1e293b", fontWeight: "800", fontSize: 13, marginTop: 15 }, docGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9 }, doc: { borderWidth: 1, borderColor: "#94a3b8", borderRadius: 9, padding: 9, backgroundColor: "#fff" }, docSelected: { backgroundColor: "#dbeafe", borderColor: "#2563eb" }, docText: { color: "#334155", fontSize: 12 }, docTextSelected: { color: "#1d4ed8", fontWeight: "700" }, message: { color: "#166534", backgroundColor: "#dcfce7", borderRadius: 10, padding: 10, marginTop: 12 }, button: { backgroundColor: "#2563eb", minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 13, marginTop: 16 }, buttonText: { color: "#fff", fontWeight: "800" }, cancel: { color: "#64748b", textAlign: "center", marginTop: 14 }, sectionTitle: { color: "#0f172a", fontSize: 20, fontWeight: "800", marginTop: 26, marginBottom: 10 }, call: { backgroundColor: "#fff", borderRadius: 16, padding: 15, marginBottom: 10 },   callTitle: { color: "#0f172a", fontWeight: "800", fontSize: 16 }, meta: { color: "#64748b", marginTop: 7 }, actions: { flexDirection: "row", gap: 18, marginTop: 12 }, edit: { color: "#2563eb", fontWeight: "800" }, delete: { color: "#dc2626", fontWeight: "800" }, modalKeyboard: { flex: 1 }, modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" }, modalCard: { maxHeight: "85%", backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }, modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }, close: { color: "#2563eb", fontWeight: "700" }, search: { borderWidth: 1.5, borderColor: "#94a3b8", borderRadius: 12, padding: 12, color: "#0f172a", marginBottom: 8 }, countryList: { flexGrow: 0 }, countryOption: { borderBottomWidth: 1, borderBottomColor: "#eef2f7", paddingVertical: 14 }, countryText: { color: "#0f172a", fontSize: 16 }, noResults: { color: "#64748b", padding: 16, textAlign: "center" },
});
