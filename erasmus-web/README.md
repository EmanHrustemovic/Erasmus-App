# Erasmus Portal Web

## Local development

Start the API in one PowerShell terminal:

```powershell
cd "C:\Users\win11\Desktop\ERASMUS APP\backend"
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Start the web app in a second terminal:

```powershell
cd "C:\Users\win11\Desktop\ERASMUS APP\erasmus-web"
npm run dev
```

Open `http://localhost:3000`.

The frontend uses `NEXT_PUBLIC_API_URL` when provided and otherwise targets
`http://localhost:8000`.

For the Expo mobile app, use the computer's Wi-Fi IPv4 address:

```powershell
$env:EXPO_PUBLIC_API_URL="http://192.168.1.68:8000"
npx expo start
```

Replace `192.168.1.68` if the computer's local IP changes. The phone and
computer must be connected to the same Wi-Fi network.

Registration, email verification, and password recovery emails are written by
the local development mailer to `backend/emails/`. Configure a real mail
provider before production.

Authenticated users can open **Security** to set up TOTP two-factor
authentication by scanning the generated QR code. The six-digit authenticator
code is then required at login.

## Production configuration

Configure these backend environment variables before deployment:

- `ENVIRONMENT=production`
- `SECRET_KEY=<long-random-secret>`
- `ADMIN_EMAIL=<university-admin-email>`
- `ADMIN_PASSWORD=<strong-unique-password>`
- `CORS_ORIGINS=https://your-web-domain.example`

Production startup intentionally fails when the development JWT secret or
default admin password is still configured.

## Validation

```powershell
npm run lint
npm run build
```

GitHub Actions runs both commands for pushes and pull requests.
