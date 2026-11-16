/**
 * deepClean.js - Comprehensive Deep System & User Clean Service
 * 
 * Features:
 * 1. User & System Caches (Browser Caches: Chrome, Safari, Brave, Arc, Edge, Firefox; App Caches: Spotify, Slack, Discord, Telegram, Zoom, QuickLook)
 * 2. System & Application Logs (~/Library/Logs)
 * 3. Mail & Message Attachments (~/Library/Messages/Attachments, ~/Library/Containers/com.apple.mail)
 * 4. Incomplete Downloads & Old Disk Images (.crdownload, .download, .part, .dmg, .pkg, .iso)
 * 5. IDE & Developer Caches (VS Code, JetBrains, Android Studio, Gradle, CocoaPods)
 * 6. Large & Old Files Finder (>100MB, >500MB, >1GB across user directory)
 */

const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { formatBytes } = require('./system');
const { isPathProtected } = require('./safeTrash');

const HOME_DIR = os.homedir();

async function getDirSize(dirPath) {
  try {
    const { stdout } = await execAsync(`du -sk "${dirPath}" 2>/dev/null || true`, { maxBuffer: 10 * 1024 * 1024 });
    const lines = stdout.trim().split('\n').filter(Boolean);
    const lastLine = lines[lines.length - 1] || '';
    const kb = parseInt(lastLine.trim().split(/\s+/)[0], 10) || 0;
    return kb * 1024;
  } catch (e) {
    return 0;
  }
}

/**
 * 1. Comprehensive System & User Caches Scanner
 */
async function scanDeepCaches() {
  const cacheDefinitions = [
    // Browser Caches
    { id: 'chrome', category: 'browsers', name: 'Google Chrome Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/Google/Chrome') },
    { id: 'safari', category: 'browsers', name: 'Safari Web Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/com.apple.Safari') },
    { id: 'brave', category: 'browsers', name: 'Brave Browser Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/BraveSoftware/Brave-Browser') },
    { id: 'arc', category: 'browsers', name: 'Arc Browser Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/company.thebrowser.Browser') },
    { id: 'edge', category: 'browsers', name: 'Microsoft Edge Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/Microsoft Edge') },
    { id: 'firefox', category: 'browsers', name: 'Mozilla Firefox Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/Firefox') },
    
    // App Caches
    { id: 'spotify', category: 'apps', name: 'Spotify Şarkı & Medya Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/com.spotify.client') },
    { id: 'discord', category: 'apps', name: 'Discord Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/com.hnc.Discord') },
    { id: 'slack', category: 'apps', name: 'Slack Çalışma Alanı Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/com.tinyspeck.slackmacgap') },
    { id: 'telegram', category: 'apps', name: 'Telegram Medya Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/ru.keepcoder.Telegram') },
    { id: 'zoom', category: 'apps', name: 'Zoom Toplantı Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/us.zoom.xos') },
    { id: 'quicklook', category: 'system', name: 'QuickLook Küçük Resim Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/com.apple.QuickLook.thumbnailcache') },
    
    // IDE & Developer Caches
    { id: 'jetbrains', category: 'dev', name: 'JetBrains / IntelliJ Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/JetBrains') },
    { id: 'vscode', category: 'dev', name: 'VS Code Kod & Eklenti Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/com.microsoft.VSCode') },
    { id: 'vscode_cacheddata', category: 'dev', name: 'VS Code CachedData', path: path.join(HOME_DIR, 'Library/Application Support/Code/CachedData') },
    { id: 'android_studio', category: 'dev', name: 'Android Studio / SDK Önbelleği', path: path.join(HOME_DIR, '.android/cache') },
    { id: 'cocoapods', category: 'dev', name: 'CocoaPods İndirme Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/CocoaPods') },
    { id: 'carthage', category: 'dev', name: 'Carthage Derleme Önbelleği', path: path.join(HOME_DIR, 'Library/Caches/carthage') }
  ];

  const categories = {
    browsers: { name: 'Tarayıcı Önbellekleri', items: [], totalBytes: 0, formatted: '0 B' },
    apps: { name: 'Uygulama Önbellekleri', items: [], totalBytes: 0, formatted: '0 B' },
    system: { name: 'Sistem & Önizleme Önbellekleri', items: [], totalBytes: 0, formatted: '0 B' },
    dev: { name: 'IDE & Geliştirici Önbellekleri', items: [], totalBytes: 0, formatted: '0 B' }
  };

  let grandTotalBytes = 0;

  for (const def of cacheDefinitions) {
    try {
      const exists = await fs.lstat(def.path).catch(() => null);
      if (exists) {
        const sizeBytes = await getDirSize(def.path);
        if (sizeBytes > 1024 * 1024) { // Only show items > 1MB
          const item = {
            id: def.id,
            name: def.name,
            path: def.path,
            category: def.category,
            sizeBytes,
            formattedSize: formatBytes(sizeBytes)
          };
          if (categories[def.category]) {
            categories[def.category].items.push(item);
            categories[def.category].totalBytes += sizeBytes;
          }
          grandTotalBytes += sizeBytes;
        }
      }
    } catch (e) {}
  }

  for (const cat in categories) {
    categories[cat].formatted = formatBytes(categories[cat].totalBytes);
  }

  return {
    categories,
    grandTotalBytes,
    formattedGrandTotal: formatBytes(grandTotalBytes)
  };
}

/**
 * 2. System and Application Logs Scanner (~/Library/Logs)
 */
async function scanLogs() {
  const logsPath = path.join(HOME_DIR, 'Library/Logs');
  const items = [];
  let totalBytes = 0;

  try {
    const entries = await fs.readdir(logsPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(logsPath, entry.name);
      try {
        let size = 0;
        if (entry.isDirectory()) {
          size = await getDirSize(fullPath);
        } else {
          const stat = await fs.stat(fullPath);
          size = stat.size;
        }
        if (size > 1024 * 50) { // >50KB
          items.push({
            id: `log_${Buffer.from(fullPath).toString('base64').substring(0, 16)}`,
            name: entry.name,
            path: fullPath,
            sizeBytes: size,
            formattedSize: formatBytes(size)
          });
          totalBytes += size;
        }
      } catch (e) {}
    }
  } catch (e) {}

  items.sort((a, b) => b.sizeBytes - a.sizeBytes);

  return {
    items,
    totalBytes,
    formattedTotal: formatBytes(totalBytes)
  };
}

/**
 * 3. Mail & Message Attachments Scanner
 */
async function scanAttachments() {
  const locations = [
    { id: 'messages', name: 'iMessage Medya & Video Ekleri', path: path.join(HOME_DIR, 'Library/Messages/Attachments') },
    { id: 'mail', name: 'Apple Mail İndirilen Ekler', path: path.join(HOME_DIR, 'Library/Containers/com.apple.mail/Data/Library/Mail Downloads') }
  ];

  const items = [];
  let totalBytes = 0;

  for (const loc of locations) {
    try {
      const exists = await fs.lstat(loc.path).catch(() => null);
      if (exists) {
        const sizeBytes = await getDirSize(loc.path);
        if (sizeBytes > 1024 * 1024) { // >1MB
          items.push({
            id: loc.id,
            name: loc.name,
            path: loc.path,
            sizeBytes,
            formattedSize: formatBytes(sizeBytes)
          });
          totalBytes += sizeBytes;
        }
      }
    } catch (e) {}
  }

  return {
    items,
    totalBytes,
    formattedTotal: formatBytes(totalBytes)
  };
}

/**
 * 4. Incomplete Downloads and Disk Images (.crdownload, .part, .dmg, .pkg, .iso)
 */
async function scanDownloadResidues() {
  const checkDirs = [
    path.join(HOME_DIR, 'Downloads'),
    path.join(HOME_DIR, 'Desktop')
  ];

  const residueExts = new Set(['.crdownload', '.download', '.part', '.dmg', '.pkg', '.iso']);
  const items = [];
  let totalBytes = 0;

  for (const dir of checkDirs) {
    try {
      const exists = await fs.lstat(dir).catch(() => null);
      if (!exists) continue;

      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (residueExts.has(ext)) {
          const fullPath = path.join(dir, entry.name);
          const stat = await fs.stat(fullPath);
          items.push({
            id: `res_${Buffer.from(fullPath).toString('base64').substring(0, 16)}`,
            name: entry.name,
            path: fullPath,
            ext,
            sizeBytes: stat.size,
            formattedSize: formatBytes(stat.size),
            lastModified: stat.mtime
          });
          totalBytes += stat.size;
        }
      }
    } catch (e) {}
  }

  items.sort((a, b) => b.sizeBytes - a.sizeBytes);

  return {
    items,
    totalBytes,
    formattedTotal: formatBytes(totalBytes)
  };
}

/**
 * 5. Large & Old Files Finder
 * Finds files larger than 100MB across user home directory (Desktop, Downloads, Documents, Movies, Music, Pictures)
 */
async function scanLargeFiles(minSizeBytes = 100 * 1024 * 1024) {
  const searchRoots = [
    path.join(HOME_DIR, 'Downloads'),
    path.join(HOME_DIR, 'Desktop'),
    path.join(HOME_DIR, 'Documents'),
    path.join(HOME_DIR, 'Movies'),
    path.join(HOME_DIR, 'Music'),
    path.join(HOME_DIR, 'Pictures')
  ];

  const largeFiles = [];
  const now = Date.now();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  const sixMonthsMs = 180 * 24 * 60 * 60 * 1000;

  async function traverse(currentDir, depth = 0) {
    if (depth > 6) return;
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        if (entry.name === 'node_modules' || entry.name === 'Library') continue;

        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await traverse(fullPath, depth + 1);
        } else if (entry.isFile()) {
          try {
            const stat = await fs.stat(fullPath);
            if (stat.size >= minSizeBytes) {
              const ageMs = now - stat.mtime.getTime();
              let ageCategory = 'Recent';
              if (ageMs > oneYearMs) ageCategory = 'Older than 1 year';
              else if (ageMs > sixMonthsMs) ageCategory = 'Older than 6 months';

              const ext = path.extname(entry.name).toLowerCase();
              let kind = 'Document / Other';
              if (['.mp4', '.mov', '.mkv', '.avi', '.m4v'].includes(ext)) kind = 'Video';
              else if (['.dmg', '.pkg', '.iso', '.vmdk'].includes(ext)) kind = 'Disk Image';
              else if (['.zip', '.tar', '.gz', '.tgz', '.7z', '.rar'].includes(ext)) kind = 'Archive';
              else if (['.raw', '.psd', '.ai', '.tiff'].includes(ext)) kind = 'Media Project';

              largeFiles.push({
                id: `large_${Buffer.from(fullPath).toString('base64').substring(0, 16)}`,
                name: entry.name,
                path: fullPath,
                ext,
                kind,
                sizeBytes: stat.size,
                formattedSize: formatBytes(stat.size),
                lastModified: stat.mtime,
                ageCategory,
                daysOld: Math.floor(ageMs / (24 * 60 * 60 * 1000))
              });
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  for (const root of searchRoots) {
    const stat = await fs.lstat(root).catch(() => null);
    if (stat && stat.isDirectory()) {
      await traverse(root, 0);
    }
  }

  largeFiles.sort((a, b) => b.sizeBytes - a.sizeBytes);
  const totalBytes = largeFiles.reduce((acc, f) => acc + f.sizeBytes, 0);

  return {
    items: largeFiles,
    totalCount: largeFiles.length,
    totalBytes,
    formattedTotal: formatBytes(totalBytes)
  };
}

module.exports = {
  scanDeepCaches,
  scanLogs,
  scanAttachments,
  scanDownloadResidues,
  scanLargeFiles
};
