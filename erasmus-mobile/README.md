# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

For LAN testing, start the backend on `0.0.0.0` and set:

```powershell
$env:EXPO_PUBLIC_API_URL="http://YOUR-PC-LAN-IP:8000"
```

## Production parity features

- Calls and applications are cached locally and remain readable during a temporary network outage.
- Administrators can export applications as CSV, XLSX, or PDF from the Applications tab.
- Document preview uses an authenticated native WebView route; Download remains available through the system share sheet.
- Push delivery is enabled when the app is built with EAS. Set the EAS project ID before building:

```powershell
$env:EXPO_PUBLIC_EAS_PROJECT_ID="your-eas-project-id"
```

Push notifications require an EAS development/production build and Apple/Android notification credentials; Expo Go cannot provide reliable background push behavior.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
