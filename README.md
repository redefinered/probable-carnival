# Storage Manager (macOS)

A macOS app that scans your Mac’s storage (caches, Docker, dev tools) and lets you safely free space with one click. Built with **Electron** and **React** (Vite).

## What it does

- **Scans** `~/Library/Caches`, Docker (`~/Library/Containers/com.docker.docker`), dev caches (`~/.npm`, `~/.yarn`, etc.), `~/Library` hotspots (Xcode, Android, Parallels), and Cursor’s Application Support.
- **Shows** sizes per folder/file so you can see what’s using space.
- **Cleanup actions** (with confirmation):
  - Delete individual cache folders under `~/Library/Caches`
  - **Docker:** `docker system prune -a --volumes` (Docker must be running)
  - **npm:** `npm cache clean --force`
  - **Cursor:** delete `state.vscdb.backup` (quit Cursor first)
  - **Xcode:** `xcrun simctl delete unavailable`

## Run the app

### Development (Electron + React)

```bash
git clone git@github.com:redefinered/probable-carnival.git
cd probable-carnival
npm install
npm run electron:start
```

- Starts the Vite dev server and opens the Electron window.
- Use **Scan storage** to run a full scan; cleanup buttons appear after a scan.

### Build a macOS app (DMG / .app)

```bash
npm run build:mac
```

Output is in **`release/`**:

- **Storage Manager.app** — double-click to run.
- **Storage Manager-1.0.0.dmg** — disk image for distribution.

### Web version (optional)

To run the lightweight web UI in your browser instead of the Electron app:

```bash
npm start
```

Then open **http://localhost:3847**. No `npm install` is required for the web version (Node only).

## Code signing (GitHub Actions)

To have the built DMG signed with your **personal team** (or Apple Developer account), add these **repository secrets** in GitHub (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| **APPLE_CERTIFICATE** | Base64-encoded `.p12` file of your signing certificate (Developer ID Application or Apple Development). |
| **APPLE_CERTIFICATE_PASSWORD** | Password for the `.p12` file. |
| **APPLE_CERTIFICATE_NAME** | *(Optional)* Exact certificate name as shown in Keychain (e.g. `Apple Development: you@email.com (TEAM_ID)`). Needed only if you have multiple identities. |

**Exporting the certificate:**

1. On your Mac: **Keychain Access** → find your **Developer ID Application** (or **Apple Development** for personal team) certificate and its private key.
2. Right-click the certificate → **Export** → save as `.p12` and set a password.
3. Encode for GitHub:  
   `base64 -i YourCertificate.p12 | pbcopy`  
   Paste the result into the **APPLE_CERTIFICATE** secret (no line breaks).

If these secrets are set, the workflow will import the cert and sign the app. Without them, the build runs unsigned (users may need to run `xattr -cr "/Applications/Storage Manager.app"` and use **Open** in the security dialog).

## Requirements

- **Node.js** 18+
- **macOS** (paths target your home directory and `~/Library`)

## Safety

- Only paths under your home directory are ever modified.
- Every destructive action requires a confirmation in the UI.
- Quit Cursor before removing its backup file.
