# LEGARIC MVP v0.2

LEGARIC = Legal, Governance, Risk, Compliance & Internal Control.

This version intentionally avoids native database modules, so it is easier to run on Windows/Node.js 24 without installing Python or Visual Studio Build Tools.

Included:
- Login/session
- Administrator and Risk Officer demo users
- Executive dashboard
- Risk Register + Add Risk
- JSON file data storage (`data.json`)
- LEGARIC logo on login
- "Developed by Rumah Hantu Team" footer
- Navigation placeholders for Legal, Governance, Compliance, Internal Control, Audit, Action Plans, Documents, Reports and Administration

Demo accounts:
- admin@legaric.local / admin123
- risk@legaric.local / risk123

Run:
1. Open Command Prompt in this folder.
2. `npm install`
3. `npm start`
4. Open http://localhost:3000


## v0.6 Dashboard
Executive Dashboard now includes illustrative risk distribution, compliance-by-area bars, action-plan progress, integrated module overview, priority items, and upcoming GRC calendar. Replace illustrative figures with live module data as CRUD modules are connected.


## v0.7 Branding
KIG logo is used as the browser favicon and app icon. If Chrome continues showing the old icon, hard-refresh the page or close/reopen the tab because favicons may be cached by the browser.


## v0.8 Login UI
Modernized login page with KIG branding, blue sign-in CTA, responsive layout, password visibility toggle, demo access panel, secure-login indicator, and Rumah Hantu Team footer.


## v0.9 Profile Menu
Added clickable administrator profile menu with My Profile, Ganti Akun, and Logout actions.


## v1.0 Profile
My Profile now opens a functional profile modal with account details, status, access level, and profile actions.


## v1.1 — Interactive Modules
All sidebar modules are accessible. Module actions open functional forms, register searches/status filters work, reports open printable report views, local records persist in browser storage, and profile actions are interactive.


## 🌐 Deploy agar bisa diakses orang lain

Versi ini sudah disiapkan untuk deployment ke **Render**.

### Cara paling mudah
1. Buat akun GitHub dan repository baru, misalnya `legaric`.
2. Upload seluruh isi folder `LEGARIC` ke repository tersebut.
3. Buka Render dan pilih **New → Web Service**.
4. Hubungkan repository GitHub tadi.
5. Gunakan:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Tambahkan environment variable:
   - `NODE_ENV=production`
   - `SESSION_SECRET` = string acak yang panjang
7. Deploy.
8. Setelah selesai, Render akan memberikan alamat seperti `https://legaric-xxxx.onrender.com`.
   Bagikan alamat tersebut ke orang lain — mereka bisa membuka aplikasi dari browser tanpa menjalankan Node.js di komputer mereka.

### Catatan penting
- Aplikasi ini masih memakai `data.json` sebagai penyimpanan sederhana. Cocok untuk demo/tugas, tetapi **belum cocok untuk produksi dengan banyak pengguna**.
- Pada hosting gratis tertentu, filesystem dapat di-reset ketika service dibuat/deploy ulang. Jadi data risiko yang dimasukkan pengguna sebaiknya dianggap data demo.
- Akun demo:
  - `admin@legaric.local` / `admin123`
  - `risk@legaric.local` / `risk123`
- Untuk penggunaan nyata, sebaiknya nanti dipindahkan ke database PostgreSQL dan password akun diganti dengan kredensial yang aman.
