<div align="center">

<img src="assets/logo.png" alt="mac-cleaner Logo" width="140" height="140" />

# mac-cleaner

**Advanced macOS Storage Manager, Developer Cache Cleaner, Smart Uninstaller & Live Menu Bar Companion**

[![macOS](https://img.shields.io/badge/macOS-12.0%2B%20(Monterey%20--%20Sequoia)-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/imozkandev/Mac-Cleaner)
[![Arch](https://img.shields.io/badge/Arch-Apple%20Silicon%20(M1--M4)%20%26%20Intel-38bdf8?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/imozkandev/Mac-Cleaner)
[![Electron](https://img.shields.io/badge/Electron-Native%20Desktop-6366f1?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![SIP Safe](https://img.shields.io/badge/Security-SIP%20%26%20Safe%20Trash-10b981?style=for-the-badge)](https://github.com/imozkandev/Mac-Cleaner)
[![License: MIT](https://img.shields.io/badge/License-MIT-a855f7?style=for-the-badge)](LICENSE)

<br />

[**🇹🇷 Türkçe Dokümantasyon (`README.md`)**](README.md) &nbsp;|&nbsp; [**🇬🇧 English Documentation (`README.en.md`)**](README.en.md)

</div>

---

## 🌟 Overview

**`mac-cleaner`** is a native-grade, open-source macOS storage management, developer cache cleaner, smart application uninstaller, and live menu bar utility designed for developers, content creators, and power users.

While macOS's built-in Storage Management buries hundreds of gigabytes of reclaimable files under an opaque *"System Data"* category, `mac-cleaner` provides transparent inspection and one-click cleanup across browser and app caches, Xcode build artifacts, inactive `node_modules` & `.venv` environments, orphaned application leftovers, duplicate files, and background `LaunchAgents`—all while remaining **100% SIP-compliant** and routing deletions through **macOS Finder Trash (`~/.Trash`)** so every action is recoverable.

---

## 🆚 macOS Built-in Storage vs. `mac-cleaner`

| Feature / Capability | macOS Built-in Storage | `mac-cleaner` |
| :--- | :--- | :--- |
| **APFS Container Accuracy** | Hides most data inside "System Data" | ✅ True APFS container usage & live category breakdown |
| **Developer Cache & Project Cleaner** | None | ✅ Xcode (`DerivedData`, Simulators, `.xcarchive`), `node_modules`, `.venv`, `target/`, Docker & Homebrew |
| **Complete App Uninstaller & App Reset** | Deletes `.app` bundle only (leaves gigabytes in `~/Library`) | ✅ Scans 9 `~/Library` locations, detects Orphaned leftovers, and supports **App Reset** |
| **Live Process & RAM Manager** | Requires separate Activity Monitor | ✅ Built-in Top RAM/CPU Process Inspector, 1-click process kill & RAM Purge |
| **Startup Services & macOS Maintenance** | Basic Login Items list | ✅ `LaunchAgents` load/unload/remove + DNS Flush, QuickLook reset, Font cache & LaunchServices repair |
| **Duplicate & Similar Photo Finder** | None | ✅ 3-Stage Hashing (`Size -> 64KB MD5 -> Full SHA-256`) + Perceptual Similar Photo grouping |
| **Visual Disk Treemap** | Static horizontal bar | ✅ Interactive HTML5 Canvas Treemap with infinite folder drill-down & Finder integration |
| **Menu Bar Companion** | None | ✅ Native macOS Menu Bar tray with live RAM/Disk stats & Drag-and-Drop Safe Trash |
| **Automation & Smart Rules Engine** | None | ✅ Custom cleanup rules, folder size threshold alerts, Dry-Run preview & Whitelist protection |
| **Localization & Themes** | System default | ✅ Instant Turkish / English (`TR` / `EN`) switch & Dark / Light glassmorphic themes |

---

## ⚡ Core Modules & Features

### 1. 📊 Dashboard & Live Process Inspector
- **True APFS Storage Metrics:** Queries `/System/Volumes/Data` APFS container space to display accurate total, used, and free disk space rather than only the read-only OS snapshot.
- **Dynamic Storage Breakdown Bar:** Computes real usage across Developer caches, Applications, Media, Documents & Downloads, Trash, and Free Space.
- **Live Process Inspector:** Displays top RAM and CPU consuming processes in real time with sorting and 1-click termination for unresponsive apps.

### 2. 🧹 Deep System & User Clean
- **Browser & App Caches:** Chrome, Safari, Brave, Arc, Edge, Firefox, Spotify, Discord, Slack, Telegram, Zoom, VS Code, JetBrains, Android Studio, CocoaPods, and QuickLook caches.
- **System & App Logs:** Scans `~/Library/Logs` and crash reports (`DiagnosticReports`).
- **Mail & iMessage Attachments:** Inspects local media attachments in `~/Library/Messages/Attachments` and Apple Mail downloads.
- **Download Residues & Large Files:** Finds leftover `.dmg`, `.pkg`, `.iso`, `.crdownload`, `.part` files and scans user folders for large files (`>100 MB` up to `>5 GB`).

### 3. 🛠️ Developer & Power User Clean
- **Xcode Deep Clean:** Cleans `DerivedData`, `CoreSimulator` devices, `.xcarchive` builds, and crash logs individually or in bulk.
- **Project Dependency Inspector:** Scans default or custom project roots for `node_modules`, `.venv`, `venv`, `target`, `vendor`, `.next`, `build`, and `dist`, automatically flagging projects untouched for **>30 days**.
- **Containers & Package Managers:** Integrates `docker system df` / `docker system prune`, `brew cleanup`, and cache cleanup for `npm`, `yarn`, `pnpm`, `pip`, `cargo`, and `gradle`.

### 4. 📦 Smart Uninstaller, Orphaned Files & App Reset
- **9-Directory Leftover Scanner:** Automatically discovers app residues across `Application Support`, `Caches`, `Preferences`, `Saved Application State`, `LaunchAgents`, `Containers`, `Group Containers`, `HTTPStorages`, and `WebKit`.
- **App Reset:** Inspect any installed application's leftovers and clean selected caches/states without removing the `.app` bundle itself.
- **Orphaned File Detector:** Identifies forgotten folders in `~/Library` left behind by previously deleted apps.

### 5. 🔧 System Maintenance & Startup Services (`LaunchAgents`)
- **macOS Maintenance Toolkit:**
  - **Flush DNS Cache:** Executes `dscacheutil -flushcache` and restarts `mDNSResponder`.
  - **Reset QuickLook Cache:** Executes `qlmanage -r cache` to refresh broken Finder thumbnails.
  - **Clear User Font Cache:** Executes `atsutil databases -removeUser` to fix font rendering glitches.
  - **Rebuild LaunchServices Database:** Repairs duplicate or broken entries in Finder's *"Open With"* menu.
- **LaunchAgents & Daemons Manager:** Lists third-party startup agents, shows live `launchctl` status, and allows loading, unloading, revealing in Finder, or trashing user agents.

### 6. 🔍 Duplicate & Similar Photo Finder
- **3-Stage Hash Pipeline:** Groups files by exact byte size -> compares first `64 KB` MD5 partial hash -> verifies exact duplicates via full `SHA-256` digest.
- **Similar Photo Grouping & Smart Select:** Groups visually similar images and offers one-click *Keep Original*, *Keep Newest*, and *Keep Oldest* selection presets.

### 7. 🗺️ Interactive Disk Treemap & Menu Bar Companion
- **HTML5 Canvas Treemap:** Visualizes folder hierarchies as proportional blocks with infinite drill-down, breadcrumb navigation, custom folder selection, and quick Finder/Trash actions.
- **Menu Bar Companion & Smart Rules:** Native macOS Tray popover with live RAM/Disk indicators, Drag-and-Drop Safe Trash, custom automation rule builder, and Whitelist protection.

---

## 🚀 Installation, Usage & Packaging

### Prerequisites
- **OS:** macOS 12.0 Monterey or later (Apple Silicon & Intel)
- **Node.js:** `v18.0.0` or higher

```bash
# Clone the repository
git clone https://github.com/imozkandev/Mac-Cleaner.git
cd Mac-Cleaner

# Install dependencies
npm install

# Run as a native macOS Electron app + Menu Bar Companion
npm start

# Run in standalone Web Server mode (http://localhost:4173)
npm run web

# Package macOS .app / .dmg release
npm run dist
```

---

## 📄 License

Licensed under the **MIT License**. See [LICENSE](LICENSE) for details.
