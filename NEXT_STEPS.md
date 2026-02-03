# Next steps — Storage Manager

Use this file when you come back to the project. It summarizes where things are and what to do next.

---

## Current state (as of last update)

- **Repo:** https://github.com/redefinered/probable-carnival  
- **Default branch:** `main`  
- **Version:** `0.0.1` (in `package.json`)

**What’s done:**

- Electron + React (Vite) macOS app in this repo.
- Web version: `npm start` → http://localhost:3847 (no install).
- Electron dev: `npm install` then `npm run electron:start`.
- Local build: `npm run build:mac` → output in `release/`.
- GitHub Actions workflow **Build macOS app** (manual: Actions → Run workflow):
  - Reads version from `package.json`.
  - Builds DMG + zip (unsigned if no cert).
  - Creates/updates a GitHub Release and uploads the DMG and zip.
- Workflow supports **code signing** if you add the secrets below (optional).
- README has a “Code signing (GitHub Actions)” section.

**What’s not done yet:**

- Signing secrets are **not** set in GitHub → builds are unsigned → users may see “damaged” and need `xattr -cr` (see below).
- Notarization is **not** set up (requires paid Apple Developer account).
- No note in the app or release for users who get “damaged” (only in this file).

---

## When you continue development

### 1. Finish code signing (so the DMG isn’t “damaged”)

1. On your Mac: **Keychain Access** → find your **Apple Development** (personal team) or **Developer ID Application** cert → Right‑click → **Export** → save as `.p12` and set a password.
2. Encode it:  
   `base64 -i YourCertificate.p12 | pbcopy`
3. In GitHub: **Settings → Secrets and variables → Actions** → New repository secret:
   - **APPLE_CERTIFICATE** = paste the base64 string (no line breaks).
   - **APPLE_CERTIFICATE_PASSWORD** = the `.p12` password.
   - **APPLE_CERTIFICATE_NAME** (optional) = exact name from Keychain, e.g. `Apple Development: you@email.com (TEAM_ID)`.
4. Run the **Build macOS app** workflow again. The new DMG will be signed.

Details are in the main **README** under “Code signing (GitHub Actions)”.

### 2. (Optional) Notarization

To avoid “unidentified developer” and Gatekeeper warnings for other users:

- You need a **paid Apple Developer Program** account ($99/year).
- Add these repository secrets (same place as above):
  - **APPLE_ID** = Apple ID email.
  - **APPLE_APP_SPECIFIC_PASSWORD** = app-specific password (Apple ID → Sign-In and Security → App-Specific Passwords).
  - **APPLE_TEAM_ID** = Team ID from your Apple Developer account.
- The workflow already passes these to electron-builder; you may need to enable notarization in the workflow or in `package.json` build config when you’re ready.

### 3. User-facing note for “damaged” / first open

Until signing (and optionally notarization) is done, add a short note for downloaders, e.g. in:

- GitHub Release description, or  
- README “Install” or “First time opening” section:

Example:

- “If macOS says the app is damaged: open Terminal and run  
  `xattr -cr "/Applications/Storage Manager.app"`  
  then open the app and use **Open** in the security dialog.”

### 4. Version bumps and releases

- Bump **version** in `package.json` (e.g. `0.0.2`).
- Commit and push to `main`.
- Run **Build macOS app** workflow → it will create/update release `v0.0.2` and attach the new DMG/zip.

---

## Quick reference

| Task              | Command / location |
|-------------------|--------------------|
| Run web app       | `npm start` → http://localhost:3847 |
| Run Electron dev  | `npm run electron:start` (after `npm install`) |
| Build DMG locally | `npm run build:mac` → `release/` |
| Build + release   | Push to `main`, then Actions → **Build macOS app** → Run workflow |
| Signing secrets   | GitHub repo → Settings → Secrets and variables → Actions |
| Release / DMG     | GitHub repo → **Releases** |

---

## Repo layout (reminder)

- `electron/` — main process, preload, storage logic (scan/cleanup).
- `src/` — React app (Vite).
- `public/` — static files for the **web** version (`npm start`).
- `server.js` — HTTP server for the web version.
- `.github/workflows/build-mac.yml` — build and release workflow.

When you’re back, start with **NEXT_STEPS.md** (this file) and the **README**, then do step 1 (signing) if you want signed builds.
