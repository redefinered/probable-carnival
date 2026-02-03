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

## Requirements

- **Node.js** 18+
- **macOS** (paths target your home directory and `~/Library`)

## Safety

- Only paths under your home directory are ever modified.
- Every destructive action requires a confirmation in the UI.
- Quit Cursor before removing its backup file.
