# Erasmus Portal — Project Explanation

Ovaj dokument je kratki tehnički vodič za prezentaciju projekta.
This document is a short technical guide for presenting the project.

## 1. Šta je sistem? / What is the system?

Erasmus Portal je informacioni sistem za Erasmus pozive, studentske prijave,
administratorski pregled i komunikaciju sa korisnicima.

The Erasmus Portal is an information system for Erasmus calls, student
applications, administrative review, document management, and user messaging.

Sistem ima tri glavna dijela:

The system has three main parts:

```text
Web frontend  ─┐
               ├── FastAPI backend ─── SQLite database + uploaded documents
Mobile app   ──┘
```

- **Backend:** `backend/` — FastAPI, poslovna logika, autentifikacija i API.
- **Web frontend:** `erasmus-web/` — Next.js, React i TypeScript.
- **Mobile frontend:** `erasmus-mobile/` — Expo, React Native i TypeScript.

Web i mobile koriste isti backend, iste endpoint-e i istu bazu. Promjena
napravljena na jednoj platformi zato je dostupna i na drugoj.

The web and mobile clients use the same backend, endpoints, and database.
Therefore, a change made on one platform is available on the other platform.

## 2. Najvažniji folderi i fajlovi / Main folders and files

### Backend

```text
backend/
├── main.py       # FastAPI aplikacija i API endpointi
├── models.py     # SQLAlchemy modeli/tabele baze
├── schemas.py    # Request/response modeli i validacija
├── database.py   # Konekcija i schema baze
├── mailer.py     # Development email servis
├── erasmus.db    # SQLite baza
└── uploads/      # Fizički uploadovani dokumenti
```

`main.py` sadrži autentifikaciju, calls, applications, review workflow,
inbox, audit log, dokumente, export i security endpoint-e.

`models.py` definiše korisnike, calls, applications, dokumente, poruke,
history, audit logove i security tabele.

`schemas.py` definiše oblik podataka koje API prima i vraća.

### Web

```text
erasmus-web/app/
├── login/page.tsx
├── register/page.tsx
├── verify/page.tsx
├── forgot-password/page.tsx
├── reset-password/page.tsx
├── student/page.tsx
├── admin/page.tsx
├── applications/[id]/page.tsx
├── inbox/page.tsx
├── security/page.tsx
├── lib/api.ts
└── lib/useAuth.ts
```

### Mobile

```text
erasmus-mobile/
├── app/login.tsx
├── app/register.tsx
├── app/verify.tsx
├── app/forgot-password.tsx
├── app/reset-password.tsx
├── app/(tabs)/index.tsx
├── app/(tabs)/applications.tsx
├── app/(tabs)/notifications.tsx
├── app/admin-calls.tsx
├── app/application-detail.tsx
├── app/document-preview.tsx
├── lib/api.ts
└── lib/auth.tsx
```

## 3. Baza podataka / Database

SQLite baza se nalazi na:

```text
backend/erasmus.db
```

Glavne tabele su:

- `users` — korisnici, role i security status;
- `calls` — Erasmus pozivi;
- `applications` — studentske prijave;
- `application_documents` — metadata dokumenata;
- `inbox_messages` — poruke korisnicima;
- `application_status_history` — istorija statusa;
- `audit_logs` — administratorske aktivnosti;
- security tabele — login pokušaji, lockout, verification/reset tokeni i 2FA;
- `push_tokens` — registrovani mobilni uređaji za push obavijesti.

Password se nikada ne čuva kao običan tekst. U bazi se čuva password hash.

Passwords are never stored as plain text. Only a password hash is stored.

## 4. Registracija i verifikacija / Registration and verification

Student se registruje na `/register`. Backend:

1. validira email domen i podatke;
2. provjerava da korisnik već ne postoji;
3. hashira password;
4. kreira korisnika sa role `student`;
5. generiše verification token;
6. šalje verification email.

U development okruženju email se zapisuje u `backend/emails/`. U produkciji
se koristi pravi SMTP/email servis.

Student registers through `/register`. The backend validates the university
email, hashes the password, creates a student account, generates a
time-limited verification token, and sends a verification email.

## 5. Login, JWT i 2FA / Login, JWT and 2FA

Login koristi:

```text
POST /auth/login
```

Backend provjerava korisnika, password hash, email verification i eventualni
2FA status. Nakon uspješnog logina vraća JWT access token.

The backend checks the account, password hash, email verification, and
two-factor status. After successful authentication it returns a JWT token.

Token se šalje u svakom zaštićenom zahtjevu:

```http
Authorization: Bearer <token>
```

Mobile token čuva u `expo-secure-store`. Pri pokretanju poziva `GET /me`.
Ako je token nevažeći, sesija se briše i korisnik se vraća na login.

Mobile stores the token in `expo-secure-store` and validates it through
`GET /me` when the app starts.

TOTP 2FA se podešava na Security stranici skeniranjem QR koda. Kod se zatim
traži pri loginu.

TOTP two-factor authentication is configured on the Security page by scanning
a QR code and is required during login after activation.

## 6. Password promjena i reset / Password change and reset

### Promjena passworda / Change password

Korisnik na Security stranici šalje trenutni i novi password na:

```text
POST /auth/change-password
```

Backend prvo provjerava trenutni password, zatim hashira i pohranjuje novi.

### Zaboravljen password / Forgot password

1. Korisnik unosi email na `/forgot-password`.
2. Backend generiše vremenski ograničen reset token.
3. Korisnik otvara `/reset-password?token=...`.
4. Novi password se validira i pohranjuje kao hash.

Reset token je vremenski ograničen i može se iskoristiti samo jednom.

## 7. Studentska prijava / Student application

Student bira call, popunjava lične i akademske podatke, dodaje obavezne
dokumente, pregleda review ekran i šalje prijavu.

Student selects a call, enters personal and academic information, uploads
required documents, reviews the submission, and sends the application.

Backend tada:

1. validira podatke i GPA;
2. sprečava duplu prijavu na isti call;
3. provjerava uploadovane dokumente;
4. kreira `applications` zapis sa statusom `pending`;
5. kreira `application_documents` zapise;
6. kreira početni status history;
7. šalje inbox poruku administratorima.

## 8. Dokumenti / Documents

Stvarni dokumenti se čuvaju u:

```text
backend/uploads/
```

U bazi se čuva samo metadata:

- ID dokumenta;
- tip dokumenta;
- originalni naziv;
- veličina;
- interno ime fajla;
- povezana prijava.

Prilikom uploada backend provjerava ekstenziju, MIME type, veličinu i
signature fajla. Dozvoljeni su PDF, DOCX, JPG, JPEG i PNG formati.

When a document is downloaded or previewed, the backend checks the JWT,
user role, and application ownership before returning the file. PDF and image
previews can be displayed in the mobile native preview screen; Download is
available separately.

## 9. Admin workflow / Administrator workflow

Admin može:

- kreirati, uređivati i brisati Erasmus calls;
- vidjeti pending prijave;
- otvoriti detalje prijave;
- pregledati ili preuzeti dokumente;
- odobriti ili odbiti prijavu;
- unijeti razlog odbijanja;
- vidjeti history i audit log;
- izvesti applications u CSV, XLSX i PDF.

Kada admin odobri ili odbije prijavu:

1. mijenja se status prijave;
2. dodaje se status history;
3. dodaje se audit log;
4. student dobija inbox poruku;
5. push obavijest se šalje ako je mobilni uređaj registrovan.

## 10. Inbox i notifikacije / Inbox and notifications

Inbox koristi:

```text
GET    /inbox
GET    /inbox/unread-count
POST   /inbox/{id}/read
POST   /inbox/mark-all-read
DELETE /inbox/{id}
```

Web i mobile prikazuju iste poruke. Mobile prikazuje unread badge i periodično
provjerava nove poruke. Push notifikacije zahtijevaju EAS build i Apple/Android
credentials; Expo Go je dovoljan za osnovni inbox, ali ne i pouzdane
background push notifikacije.

## 11. Security / Sigurnost

Najvažnije sigurnosne mjere:

- password hashing;
- JWT Bearer autentifikacija;
- role-based access za student/admin endpoint-e;
- provjera vlasništva nad dokumentima;
- ograničeni formati i veličine fajlova;
- verification i reset tokeni sa istekom;
- TOTP 2FA;
- login audit i lockout zaštita;
- CORS konfiguracija;
- production provjera jakog secret-a, admin passworda i HTTPS URL-a;
- `.gitignore` zaštita za `.env`, bazu, uploads i development emailove.

For production, the system additionally requires HTTPS, a strong random
secret, a production email provider, restricted CORS, backups, monitoring,
and a formal security review.

## 12. Offline i health status / Offline and health status

Mobile lokalno kešira calls i applications. Ako mreža privremeno nestane,
prikazuje posljednje sačuvane podatke i nudi Retry akciju.

Backend endpoint:

```text
GET /health
```

provjerava dostupnost API-ja i baze. Mobile prikazuje status `Backend
connected` ili `Offline mode`.

## 13. Kako pokrenuti sistem / How to run

### Backend

```powershell
cd "C:\Users\win11\Desktop\ERASMUS APP\backend"
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Web

```powershell
cd "C:\Users\win11\Desktop\ERASMUS APP\erasmus-web"
npm run dev
```

Otvori `http://localhost:3000`.

### Mobile

```powershell
cd "C:\Users\win11\Desktop\ERASMUS APP\erasmus-mobile"
$env:EXPO_PUBLIC_API_URL="http://IP_RACUNARA:8000"
npx expo start -c
```

Telefon i računar moraju biti na istoj Wi-Fi mreži.

## 14. Preporučeni demo redoslijed / Recommended demo flow

1. Otvoriti web portal i listu calls.
2. Kreirati call kao admin.
3. Pokazati isti call na mobile aplikaciji.
4. Prijaviti se kao student.
5. Poslati prijavu sa CV dokumentom.
6. Kao admin otvoriti prijavu i pregledati dokument.
7. Odobriti ili odbiti prijavu.
8. Kao student pokazati novi status i inbox poruku.
9. Pokazati history, audit log, 2FA i export.

Najvažnija arhitektonska poruka:

> Web i mobile su dva klijenta istog sistema. Oba koriste isti FastAPI
> backend, iste API endpoint-e i istu bazu podataka.

> The web and mobile applications are two clients of the same system. Both
> use the same FastAPI backend, API endpoints, and database.
