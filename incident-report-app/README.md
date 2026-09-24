# TexHSE: Incident reporting and Quality

The **Home** tab opens a mobile inspector dashboard backed by the existing web application at
`https://texmaco-frontend.vercel.app/quality-dashboard`. It uses the existing login,
password changes, permissions, forms, validation, stage/PDI workflow, drafts,
history and search. The inspector landing page is native, with a greeting,
Drafts/My Forms/Search shortcuts, wagon forms and bogie inspections.
These shortcuts open the existing web routes; data-entry screens and workflow rules
remain on the website. Other roles retain their existing web dashboard. Website
updates to the forms are also available inside the app.

Inspection pages show **Back** and **Menu** together in one compact row above
the form. Menu toggles the existing web sidebar; the duplicate web navbar is
hidden in the app and its unused spacing is removed. Back
returns through the page history, falling back to the inspector dashboard when
there is no previous page. Login has Back
to the welcome screen. Incident forms and My Profile also have labelled Back
controls. Android hardware Back follows the same inspector navigation.

The app opens with **Inspector Login** and **Report an Incident** for users who
have not signed in. Inspector Login opens the existing web login and takes the
inspector directly to Quality after login (and any required password change).
A remembered web session opens Quality automatically on later launches. Logout
returns to the welcome choices. Report an Incident opens the existing Home page
without requiring inspector login. The **Report Incident** bottom tab has a red icon and label and
also opens the incident module. The incident button above login and Quality has
been removed. Session detection passes login status, role, username and current
route to native code, never passwords or tokens.

Inspectors use their existing web credentials in Quality. My Reports and
My Profile remain available alongside it. Quality stays mounted while
switching tabs, preserving the current form and login. Use the web interface's
Logout to sign out of Quality. **My Profile > Logout** signs out of both Quality
and incident-admin mode and returns to the welcome screen. It clears the web
authentication fields without deleting saved drafts or the incident reporter
profile. Pending logout is retained locally until the web session is cleared,
including across offline restarts.

**My Reports** opens the signed-in inspector's existing filled wagon forms
history, retaining its web filters and details. A highlighted **Submitted
Incidents** button opens incident records; Back returns to wagon forms.
The history refreshes when opened and offers a refresh button. Signed-out
users can still open their incident records and are prompted to log in for
wagon forms. Incident records use the current inspector's saved reporter
details when signed in, or the guest reporter details otherwise.

My Profile fetches the signed-in account from `GET /api/auth/me` after login and
each time the tab opens. It shows all available account details (name, username,
role, serial number, job role, bay, agency, status, password-change requirement,
creation/update dates and account ID). Missing fields are marked Not available.
Built-in accounts may have only a username and role. Passwords, hashes, salts and
tokens are never displayed or passed to native profile storage. Profile data is
held in memory and cleared on logout. Refresh Profile retries failed requests.

My Profile also supports an account photo: choose an image, crop/adjust with
the device editor, review the circular preview, then Save photo. JPEG output
is resized and checked to be strictly below 100,000 bytes before upload.
GET/PUT `/api/auth/me/photo` stores the photo for the authenticated inspector
on the shared backend. Deploy the updated backend routes and InspectorPhoto
model before using this feature in the live app. Failed saves retain the
preview for retry; cancellation leaves the existing photo unchanged.

Pull down to refresh Home/account details, My Profile (including its saved
photo), the signed-in incident landing page, wagon submission history, and
incident report lists. Native refresh controls support short pages too.
Wagon history uses native refresh on iOS and a top-of-page pull gesture on
Android. Editing forms are not reloaded, and unsaved photo crops are retained.

Incident and learning-event forms prefill the logged-in inspector's available
reporter details. Name comes from the account; choosing Contractor also fills
the account agency. Reporter type, mobile number, employee ID and department
are not stored in InspectorAccount, so enter these once. After a successful
report, they are saved separately for that username and reused on later reports.
Autofill never overwrites fields already edited in the current form, never
copies another user's saved reporter details, and does not fill incident/victim
details. Logging out clears reporter fields in an open incident form. All fields
remain editable, and guests can still enter details manually.

Deploy the updated `sales-backend/routes/auth.routes.js` to the shared backend
before using this feature against production; older deployments do not have
`/api/auth/me`. No web deployment or database migration is needed.

## Flow

- Home
- Select report type
- Dynamic report form
- Success screen

## Backend API

- `POST /api/incidents`
- `GET /api/incidents`
- `GET /api/incidents/:id`

## Run

1. Install dependencies with `npm install`.
2. Start with `npm run start:live` and scan the QR code in Expo Go compatible with
   this project's Expo SDK 54.
3. Choose **Inspector Login** and sign in, or choose **Report an Incident**.

Plain `npm start` also defaults to production unless `APP_ENV` overrides it.
The embedded browser uses `react-native-webview` 13.15.0, the SDK 54 bundled version.

Both incident reporting and the live inspector website use
`https://texmaco-backend.onrender.com/api`. Preview and production EAS profiles
use that backend too. The app previously pointed at a different Render service;
this change does not migrate records from that service.

## Local development

Run `sales-backend` on port 5000. In `sales-kpi-web`, set
`VITE_API_BASE_URL=http://<computer-LAN-IP>:5000` and start
`npm run dev -- --host 0.0.0.0`. Add `http://<computer-LAN-IP>:5173` to the
backend's `CORS_ORIGINS` and restart it. A phone cannot reach your computer using
`localhost`.

The app's `npm run start:dev` uses the existing LAN IP `192.168.16.22`. Its
development Quality URL defaults to the API host on port 5173. For another host,
set these variables before `npm start`:

```text
APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=http://<computer-LAN-IP>:5000/api
EXPO_PUBLIC_INSPECTOR_WEB_URL=http://<computer-LAN-IP>:5173/quality-dashboard
```

Always point the web build's `VITE_API_BASE_URL` and the app's API URL at the
same backend. Do not pair a local incident API with the live inspector site.
Restart Expo after configuration changes. Use HTTPS for live deployments.

## Mobile verification

Web file inputs use the device picker. Export buttons use native sharing/saving;
external links open in the browser. Android Back navigates within Quality, then
returns to the app's Home when leaving incident reporting. iOS supports back/forward gestures. Connection and browser-process
failures show a retry screen. Unsaved data cannot survive a process termination;
use the existing Save/Draft actions before closing the app. Quality requires an
internet connection.

```sh
npm run test:inspector
npx expo export --platform android --platform ios
```

Before release, check on Android/iOS devices using a test inspector:

- Existing login, invalid password, temporary-password change, logout and relaunch.
- On a fresh install, check both welcome buttons. After inspector login, confirm
  Quality opens directly and a subsequent launch reuses the saved session.
- Stage completion, skipping/resuming and PDI using the same web rules.
- CTRB, DM Line, DM Final, draft save/resume, history and search; confirm submitted
  records appear in the website against the same backend.
- Bogie and after-wheeling forms, including image/signature uploads.
- Fill part of a quality form, tap Report an Incident, then return
  to Quality and verify the unsaved fields remain. Check the incident in My Reports.
- Exports, keyboard, wide tables, Android Back/iOS gestures and offline retry.

These checks require credentials and devices; a JavaScript export does not
replace them. Build checks do not need to create production records.
