import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiRequest } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(token: string) {
  if (!Device.isDevice) return;
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return;
  const permissions = await Notifications.getPermissionsAsync();
  const finalStatus = permissions.status === "granted"
    ? permissions.status
    : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== "granted") return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await apiRequest("/push-tokens", {
    method: "POST",
    body: JSON.stringify({ token: pushToken, platform: Platform.OS }),
  }, token);
}
