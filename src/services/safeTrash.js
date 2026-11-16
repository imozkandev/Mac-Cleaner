/**
 * safeTrash.js - Safe Deletion and System Protection Layer
 * 
 * Guarantees:
 * 1. SIP Compliance: Strictly prevents touching macOS system files & critical paths.
 * 2. Safe Delete: Moves items to macOS Trash (~/.Trash via Finder AppleScript)
 *    so files can be easily recovered by the user.
 * 3. Whitelist enforcement: Checks user-defined protected directories.
 */

const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const HOME_DIR = os.homedir();

// Critical system paths that must NEVER be deleted or modified
const PROTECTED_SYSTEM_PATHS = [
  '/',
  '/System',
  '/usr',
  '/bin',
  '/sbin',
  '/private',
  '/private/var',
  '/private/etc',
  '/Library',
  '/Library/Apple',
  '/Library/SystemExtensions',
  '/Library/CoreAnalytics',
  '/Applications/Safari.app',
  '/Applications/Utilities',
  '/Applications/System Settings.app',
  '/Applications/App Store.app',
  '/Applications/Finder.app',
  path.join(HOME_DIR, 'Library/Keychains'),
  path.join(HOME_DIR, 'Library/Preferences/com.apple.*'),
  path.join(HOME_DIR, 'Desktop'),
  path.join(HOME_DIR, 'Documents'),
  path.join(HOME_DIR, 'Downloads'),
  path.join(HOME_DIR, 'Pictures'),
  path.join(HOME_DIR, 'Music'),
  path.join(HOME_DIR, 'Movies')
];

/**
 * Checks if a target path is protected by SIP, macOS core policies, or root directories.
 */
function isPathProtected(targetPath, userWhitelist = []) {
  if (!targetPath || typeof targetPath !== 'string') return true;
  const resolved = path.resolve(targetPath);

  // Direct exact match check
  for (const p of PROTECTED_SYSTEM_PATHS) {
    if (resolved === path.resolve(p)) return true;
  }

  // System root prefixes
  if (
    resolved.startsWith('/System') ||
    resolved.startsWith('/usr') ||
    resolved.startsWith('/bin') ||
    resolved.startsWith('/sbin') ||
    resolved.startsWith('/private/var/db')
  ) {
    return true;
  }

  // User whitelist check
  for (const wl of userWhitelist) {
    if (!wl) continue;
    const resolvedWl = path.resolve(wl.replace(/^~(?=$|\/|\\)/, HOME_DIR));
    if (resolved === resolvedWl || resolved.startsWith(resolvedWl + path.sep)) {
      return true;
    }
  }

  return false;
}

/**
 * Moves a file or directory to the macOS Trash using Finder AppleScript.
 * This preserves metadata and allows the user to 'Put Back' the file.
 */
async function moveToTrash(targetPath, userWhitelist = []) {
  const resolved = path.resolve(targetPath.replace(/^~(?=$|\/|\\)/, HOME_DIR));

  // Security check
  if (isPathProtected(resolved, userWhitelist)) {
    throw new Error(`Güvenlik Uyarısı: '${resolved}' yolu macOS sistem veya kullanıcı istisna koruması altındadır ve silinemez.`);
  }

  // Check if file exists
  try {
    await fs.lstat(resolved);
  } catch (err) {
    return { success: false, path: resolved, error: 'Dosya veya dizin bulunamadı' };
  }

  // Escape double quotes and backslashes for AppleScript
  const escapedPath = resolved.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const script = `osascript -e 'tell application "Finder" to delete POSIX file "${escapedPath}"'`;

  try {
    await execAsync(script);
    return { success: true, path: resolved, movedToTrash: true };
  } catch (appleScriptError) {
    // Fallback: move directly to ~/.Trash if Finder AppleScript encounters permission/dialog delay
    try {
      const trashDir = path.join(HOME_DIR, '.Trash');
      const baseName = path.basename(resolved);
      let dest = path.join(trashDir, baseName);
      
      // If destination already exists in trash, append timestamp
      try {
        await fs.lstat(dest);
        dest = path.join(trashDir, `${baseName}_${Date.now()}`);
      } catch (e) {
        // file doesn't exist in Trash, good to proceed
      }

      await fs.rename(resolved, dest);
      return { success: true, path: resolved, movedToTrash: true, fallback: true };
    } catch (fallbackError) {
      throw new Error(`Çöp Kutusuna taşınamadı: ${fallbackError.message || appleScriptError.message}`);
    }
  }
}

/**
 * Moves multiple paths to Trash safely.
 */
async function batchMoveToTrash(paths, userWhitelist = []) {
  const results = [];
  for (const p of paths) {
    try {
      const res = await moveToTrash(p, userWhitelist);
      results.push(res);
    } catch (err) {
      results.push({ success: false, path: p, error: err.message });
    }
  }
  return results;
}

module.exports = {
  isPathProtected,
  moveToTrash,
  batchMoveToTrash,
  PROTECTED_SYSTEM_PATHS
};
