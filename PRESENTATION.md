# Erasmus Portal presentation runbook

## Demo accounts

Use separate demo accounts for the student and administrator roles. Do not use
real student data during the presentation. The local administrator defaults
to `admin@ibu.edu.ba` only in development; change it before any deployment.

## Recommended demo flow

1. Open the web portal as a student and show the available Erasmus calls.
2. Open the same backend from the mobile app and show the matching calls.
3. Submit one application with a PDF or DOCX CV and the required documents.
4. Switch to the admin web/mobile view and show the new inbox message.
5. Open the application, preview a document, and optionally download it.
6. Approve or reject the application with a reason.
7. Return to the student account and show the updated status and inbox message.
8. Show application history, audit log, exports, security/2FA, and the mobile
   offline fallback if the network is briefly disabled.

## Start locally

```powershell
cd "C:\Users\win11\Desktop\ERASMUS APP\backend"
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

```powershell
cd "C:\Users\win11\Desktop\ERASMUS APP\erasmus-web"
npm run dev
```

```powershell
cd "C:\Users\win11\Desktop\ERASMUS APP\erasmus-mobile"
$env:EXPO_PUBLIC_API_URL="http://YOUR-PC-LAN-IP:8000"
npx expo start -c
```

The phone and computer must be on the same Wi-Fi network. Verify
`http://YOUR-PC-LAN-IP:8000/health` before starting the mobile demo.

## Before presenting

- Back up `backend/erasmus.db` and `backend/uploads/`.
- Verify the web and mobile API URLs.
- Test one complete student-to-admin workflow.
- Keep a local copy of the project and a second demo account.
- Use an EAS development/production build when demonstrating background push
  notifications; Expo Go is suitable for the core workflow but not reliable
  for background push delivery.
