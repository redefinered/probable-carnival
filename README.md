# macOS Storage Manager

A local web app that scans your Mac’s storage (caches, Docker, dev tools) and lets you safely free space with one click.

## What it does

- **Scans** `~/Library/Caches`, Docker (`~/Library/Containers/com.docker.docker`), dev caches (`~/.npm`, `~/.yarn`, etc.), `~/Library` hotspots (Xcode, Android, Parallels), and Cursor’s Application Support.
- **Shows** sizes per folder/file so you can see what’s using space.
- **Cleanup actions** (with confirmation):
  - Delete individual cache folders under `~/Library/Caches`
  - **Docker:** `docker system prune -a --volumes` (Docker must be running)
  - **npm:** `npm cache clean --force`
  - **Cursor:** delete `state.vscdb.backup` (quit Cursor first)
  - **Xcode:** `xcrun simctl delete unavailable`

## Run it

```bash
cd mac-storage-manager
npm start
```

Then open **http://localhost:3847** in your browser.

No `npm install` needed — it uses only Node’s built-in modules.

## Requirements

- Node.js 18+
- macOS (paths are for your home and `~/Library`)

## Safety

- Only paths under your home directory are ever touched.
- Destructive actions require a confirmation in the UI.
- Quit Cursor before removing its backup file.
