/**
 * uninstaller.js - Smart & Complete App Uninstaller & Orphaned File Finder
 * 
 * Features:
 * 1. Deep residue detection across ~/Library/Application Support, Caches, Preferences,
 *    Saved Application State, LaunchAgents, Containers.
 * 2. Orphaned File Detector: Identifies residues of previously removed apps.
 * 3. Safe uninstallation moving files to macOS Trash.
 */

const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { moveToTrash, isPathProtected } = require('./safeTrash');
const { formatBytes } = require('./system');

const HOME_DIR = os.homedir();

/**
 * Calculates size of a file or directory
 */
async function getItemSize(itemPath) {
  try {
    const stat = await fs.lstat(itemPath);
    if (!stat.isDirectory()) {
      return stat.size;
    }
    const { stdout } = await execAsync(`du -sk "${itemPath}" 2>/dev/null || true`, { maxBuffer: 10 * 1024 * 1024 });
    const lines = stdout.trim().split('\n').filter(Boolean);
    const lastLine = lines[lines.length - 1] || '';
    const kb = parseInt(lastLine.trim().split(/\s+/)[0], 10) || 0;
    return kb * 1024;
  } catch (e) {
    return 0;
  }
}

/**
 * Reads Info.plist of an app bundle
 */
async function readAppPlist(appPath) {
  const plistPath = path.join(appPath, 'Contents/Info.plist');
  try {
    const { stdout } = await execAsync(`plutil -convert json -o - "${plistPath}" 2>/dev/null`);
    const info = JSON.parse(stdout);
    return {
      bundleId: info.CFBundleIdentifier || null,
      name: info.CFBundleDisplayName || info.CFBundleName || path.basename(appPath, '.app'),
      version: info.CFBundleShortVersionString || info.CFBundleVersion || '1.0',
      iconFile: info.CFBundleIconFile || null
    };
  } catch (e) {
    return {
      bundleId: null,
      name: path.basename(appPath, '.app'),
      version: '1.0',
      iconFile: null
    };
  }
}

/**
 * Finds all leftover files and directories associated with an app and its bundle ID
 */
async function findAppLeftovers(appName, bundleId) {
  const leftovers = [];
  const searchLocations = [
    { type: 'Application Support', dir: path.join(HOME_DIR, 'Library/Application Support') },
    { type: 'Caches', dir: path.join(HOME_DIR, 'Library/Caches') },
    { type: 'Preferences', dir: path.join(HOME_DIR, 'Library/Preferences') },
    { type: 'Saved Application State', dir: path.join(HOME_DIR, 'Library/Saved Application State') },
    { type: 'LaunchAgents', dir: path.join(HOME_DIR, 'Library/LaunchAgents') },
    { type: 'Containers', dir: path.join(HOME_DIR, 'Library/Containers') },
    { type: 'Group Containers', dir: path.join(HOME_DIR, 'Library/Group Containers') },
    { type: 'HTTPStorages', dir: path.join(HOME_DIR, 'Library/HTTPStorages') },
    { type: 'WebKit', dir: path.join(HOME_DIR, 'Library/WebKit') }
  ];

  const searchTerms = new Set();
  if (appName) {
    searchTerms.add(appName.toLowerCase());
    searchTerms.add(appName.toLowerCase().replace(/\s+/g, ''));
  }
  if (bundleId) {
    searchTerms.add(bundleId.toLowerCase());
    // Also add sub-part e.g. com.spotify.client -> spotify
    const parts = bundleId.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length > 3) {
      searchTerms.add(parts[parts.length - 1].toLowerCase());
    }
  }

  for (const loc of searchLocations) {
    try {
      const exists = await fs.lstat(loc.dir).catch(() => null);
      if (!exists) continue;

      const entries = await fs.readdir(loc.dir);
      for (const entry of entries) {
        const lower = entry.toLowerCase();
        let match = false;

        // Bundle ID exact or prefix match
        if (bundleId && lower.includes(bundleId.toLowerCase())) {
          match = true;
        } else if (appName && lower.startsWith(appName.toLowerCase())) {
          match = true;
        }

        if (match) {
          const fullPath = path.join(loc.dir, entry);
          const sizeBytes = await getItemSize(fullPath);
          leftovers.push({
            id: `leftover_${Buffer.from(fullPath).toString('base64').substring(0, 16)}`,
            name: entry,
            type: loc.type,
            path: fullPath,
            sizeBytes,
            formattedSize: formatBytes(sizeBytes)
          });
        }
      }
    } catch (e) {}
  }

  return leftovers;
}

/**
 * Scans installed applications in /Applications and ~/Applications
 */
async function scanInstalledApps() {
  const appDirs = [
    '/Applications',
    path.join(HOME_DIR, 'Applications')
  ];

  const apps = [];
  const seenPaths = new Set();

  for (const dir of appDirs) {
    try {
      const exists = await fs.lstat(dir).catch(() => null);
      if (!exists) continue;

      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.name.endsWith('.app')) continue;

        const appPath = path.join(dir, entry.name);
        if (seenPaths.has(appPath)) continue;
        seenPaths.add(appPath);

        // Filter out macOS built-in system-protected apps
        const isSystemApp = isPathProtected(appPath);

        const plist = await readAppPlist(appPath);
        const appSize = await getItemSize(appPath);

        // Find associated leftovers
        const leftovers = await findAppLeftovers(plist.name, plist.bundleId);
        const leftoversSize = leftovers.reduce((acc, item) => acc + item.sizeBytes, 0);
        const totalSize = appSize + leftoversSize;

        apps.push({
          id: `app_${Buffer.from(appPath).toString('base64').substring(0, 16)}`,
          name: plist.name,
          bundleId: plist.bundleId || 'N/A',
          version: plist.version,
          path: appPath,
          appSizeBytes: appSize,
          formattedAppSize: formatBytes(appSize),
          leftovers,
          leftoversCount: leftovers.length,
          leftoversSizeBytes: leftoversSize,
          formattedLeftoversSize: formatBytes(leftoversSize),
          totalSizeBytes: totalSize,
          formattedTotalSize: formatBytes(totalSize),
          isSystemApp
        });
      }
    } catch (e) {}
  }

  // Sort by total size descending
  apps.sort((a, b) => b.totalSizeBytes - a.totalSizeBytes);

  const totalBytes = apps.reduce((acc, a) => acc + a.totalSizeBytes, 0);
  return {
    items: apps,
    totalCount: apps.length,
    totalBytes,
    formattedTotal: formatBytes(totalBytes)
  };
}

/**
 * Scans for Orphaned Files:
 * Files/directories in ~/Library whose parent application is no longer installed on the system.
 */
async function scanOrphanedFiles() {
  // First, get all known installed bundle IDs and app names
  const { items: apps } = await scanInstalledApps();
  const installedBundles = new Set();
  const installedNames = new Set();

  for (const a of apps) {
    if (a.bundleId && a.bundleId !== 'N/A') installedBundles.add(a.bundleId.toLowerCase());
    installedNames.add(a.name.toLowerCase());
    installedNames.add(a.name.toLowerCase().replace(/\s+/g, ''));
  }

  // Add common macOS built-in Apple bundles so they aren't marked as orphaned
  installedBundles.add('com.apple');

  const checkDirs = [
    { type: 'Application Support', dir: path.join(HOME_DIR, 'Library/Application Support') },
    { type: 'Caches', dir: path.join(HOME_DIR, 'Library/Caches') },
    { type: 'Saved Application State', dir: path.join(HOME_DIR, 'Library/Saved Application State') },
    { type: 'Containers', dir: path.join(HOME_DIR, 'Library/Containers') }
  ];

  const orphaned = [];

  for (const target of checkDirs) {
    try {
      const exists = await fs.lstat(target.dir).catch(() => null);
      if (!exists) continue;

      const entries = await fs.readdir(target.dir, { withFileTypes: true });
      for (const entry of entries) {
        const lowerName = entry.name.toLowerCase();
        
        // Skip system/apple directories
        if (
          lowerName.startsWith('com.apple.') ||
          lowerName.startsWith('apple') ||
          lowerName === 'google' || // broad
          lowerName === 'microsoft' ||
          lowerName === 'cloudkit' ||
          lowerName === 'addressbook' ||
          lowerName === 'callhistory' ||
          lowerName === 'syncservices'
        ) {
          continue;
        }

        // Check if matches any installed app
        let isInstalled = false;
        for (const bundle of installedBundles) {
          if (lowerName.includes(bundle)) {
            isInstalled = true;
            break;
          }
        }
        if (!isInstalled) {
          for (const name of installedNames) {
            if (lowerName.startsWith(name)) {
              isInstalled = true;
              break;
            }
          }
        }

        // If not installed, it is an orphaned leftover!
        if (!isInstalled) {
          const fullPath = path.join(target.dir, entry.name);
          try {
            const stat = await fs.stat(fullPath);
            const sizeBytes = await getItemSize(fullPath);
            if (sizeBytes > 1024 * 50) { // filter out negligible empty folders (<50KB)
              orphaned.push({
                id: `orphan_${Buffer.from(fullPath).toString('base64').substring(0, 16)}`,
                name: entry.name,
                type: target.type,
                path: fullPath,
                sizeBytes,
                formattedSize: formatBytes(sizeBytes),
                lastModified: stat.mtime
              });
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  orphaned.sort((a, b) => b.sizeBytes - a.sizeBytes);
  const totalBytes = orphaned.reduce((acc, item) => acc + item.sizeBytes, 0);

  return {
    items: orphaned,
    totalCount: orphaned.length,
    totalBytes,
    formattedTotal: formatBytes(totalBytes)
  };
}

/**
 * Uninstall an application and/or its leftovers safely
 */
async function uninstallApp(appPath, leftoverPaths = [], userWhitelist = []) {
  const results = [];

  // Delete leftovers first
  for (const lp of leftoverPaths) {
    try {
      const res = await moveToTrash(lp, userWhitelist);
      results.push(res);
    } catch (e) {
      results.push({ success: false, path: lp, error: e.message });
    }
  }

  // Delete main app if path provided and not a protected system app
  if (appPath) {
    if (isPathProtected(appPath, userWhitelist)) {
      throw new Error(`'${appPath}' korumalı bir sistem uygulamasıdır ve silinemez.`);
    }
    const appRes = await moveToTrash(appPath, userWhitelist);
    results.push(appRes);
  }

  return {
    success: results.every(r => r.success),
    details: results
  };
}

module.exports = {
  scanInstalledApps,
  scanOrphanedFiles,
  uninstallApp,
  getItemSize
};
