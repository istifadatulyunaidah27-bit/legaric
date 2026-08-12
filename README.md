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


## 🌐 Vercel deployment

This version is prepared for Vercel with an Express entrypoint and `vercel.json`.

1. Upload the contents of this folder to the GitHub repository.
2. Import the repository into Vercel.
3. Add environment variable `SESSION_SECRET` with a long random value.
4. Deploy.

### Demo-data limitation
This Vercel-ready version keeps risk data in memory because Vercel deployments are not a persistent local filesystem. Data created during a running instance may be reset after a new deployment/restart. For a real multi-user application, use a persistent database such as PostgreSQL.
