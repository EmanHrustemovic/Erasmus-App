import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.68:8000";

export async function exportApplications(token: string, format: "csv" | "xlsx" | "pdf") {
  const extension = format;
  const mimeType = format === "csv"
    ? "text/csv"
    : format === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "application/pdf";
  const target = new File(Paths.cache, `applications.${extension}`);
  if (target.exists) target.delete();
  const result = await File.downloadFileAsync(`${API_URL}/applications/export/${format}`, target, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(result.uri, { mimeType, dialogTitle: `Export applications.${extension}` });
}
