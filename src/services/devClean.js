/**
 * devClean.js - Developer & Power User Deep Clean Module
 * 
 * Features:
 * 1. Xcode Deep Clean (DerivedData, Simulators, Archives, Crash Logs)
 * 2. Project Dependency Inspector (node_modules, .venv, target, vendor untouched > 30 days)
 * 3. Containers & Package Managers (Docker, Homebrew, npm, yarn, pnpm, pip, cargo)
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
 * Helper to get directory size in bytes using du -sk
 */
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
 * 1. Xcode Deep Clean Scanner
 */
async function scanXcode() {
  const result = {
    derivedData: { items: [], totalBytes: 0, formatted: '0 B' },
    simulators: { items: [], totalBytes: 0, formatted: '0 B' },
    archives: { items: [], totalBytes: 0, formatted: '0 B' },
    crashLogs: { items: [], totalBytes: 0, formatted: '0 B' },
    totalReclaimableBytes: 0,
    formattedTotal: '0 B'
  };

  // 1a. DerivedData
  const derivedDataPath = path.join(HOME_DIR, 'Library/Developer/Xcode/DerivedData');
  try {
    const entries = await fs.readdir(derivedDataPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'ModuleCache.noindex') {
        const fullPath = path.join(derivedDataPath, entry.name);
        const stat = await fs.stat(fullPath);
        const size = await getDirSize(fullPath);
        result.derivedData.items.push({
          id: `derived_${entry.name}`,
          name: entry.name,
          path: fullPath,
          sizeBytes: size,
          formattedSize: formatBytes(size),
          lastModified: stat.mtime
        });
        result.derivedData.totalBytes += size;
      }
    }
    result.derivedData.formatted = formatBytes(result.derivedData.totalBytes);
  } catch (e) {}

  // 1b. CoreSimulator Devices & Simulators
  const simulatorPath = path.join(HOME_DIR, 'Library/Developer/CoreSimulator/Devices');
  try {
    const exists = await fs.lstat(simulatorPath).catch(() => null);
    if (exists) {
      const simSize = await getDirSize(simulatorPath);
      result.simulators.totalBytes = simSize;
      result.simulators.formatted = formatBytes(simSize);

      // Check for unavailable devices via xcrun
      try {
        const { stdout } = await execAsync('xcrun simctl list devices --json 2>/dev/null');
        const parsed = JSON.parse(stdout);
        const devices = parsed.devices || {};
        let unavailableCount = 0;
        let totalSimulators = 0;

        for (const runtime in devices) {
          for (const dev of devices[runtime]) {
            totalSimulators++;
            if (!dev.isAvailable) unavailableCount++;
          }
        }

        result.simulators.items.push({
          id: 'simulators_devices',
          name: `iOS/watchOS/tvOS Cihaz Simülatörleri (${totalSimulators} Cihaz)`,
          details: `${unavailableCount} kullanılmayan/eski simülatör`,
          path: simulatorPath,
          sizeBytes: simSize,
          formattedSize: formatBytes(simSize)
        });
      } catch (xcErr) {
        result.simulators.items.push({
          id: 'simulators_devices',
          name: 'CoreSimulator Cihazları',
          path: simulatorPath,
          sizeBytes: simSize,
          formattedSize: formatBytes(simSize)
        });
      }
    }
  } catch (e) {}

  // 1c. Archives
  const archivesPath = path.join(HOME_DIR, 'Library/Developer/Xcode/Archives');
  try {
    const exists = await fs.lstat(archivesPath).catch(() => null);
    if (exists) {
      const archSize = await getDirSize(archivesPath);
      result.archives.totalBytes = archSize;
      result.archives.formatted = formatBytes(archSize);

      // List sub-folders (usually dates like 2026-01-15)
      const dateDirs = await fs.readdir(archivesPath, { withFileTypes: true });
      for (const d of dateDirs) {
        if (d.isDirectory()) {
          const fullPath = path.join(archivesPath, d.name);
          const size = await getDirSize(fullPath);
          result.archives.items.push({
            id: `archive_${d.name}`,
            name: `Xcode Arşivi (${d.name})`,
            path: fullPath,
            sizeBytes: size,
            formattedSize: formatBytes(size)
          });
        }
      }
    }
  } catch (e) {}

  // 1d. DiagnosticReports / Crash logs
  const crashLogsPath = path.join(HOME_DIR, 'Library/Logs/DiagnosticReports');
  try {
    const logs = await fs.readdir(crashLogsPath);
    let crashTotal = 0;
    for (const logFile of logs) {
      if (logFile.endsWith('.ips') || logFile.endsWith('.crash') || logFile.endsWith('.diag')) {
        const fullPath = path.join(crashLogsPath, logFile);
        const stat = await fs.stat(fullPath);
        crashTotal += stat.size;
      }
    }
    result.crashLogs.totalBytes = crashTotal;
    result.crashLogs.formatted = formatBytes(crashTotal);
    if (logs.length > 0) {
      result.crashLogs.items.push({
        id: 'crash_logs',
        name: `Sistem ve Xcode Crash Logları (${logs.length} Dosya)`,
        path: crashLogsPath,
        sizeBytes: crashTotal,
        formattedSize: formatBytes(crashTotal)
      });
    }
  } catch (e) {}

  result.totalReclaimableBytes =
    result.derivedData.totalBytes +
    result.simulators.totalBytes +
    result.archives.totalBytes +
    result.crashLogs.totalBytes;
  result.formattedTotal = formatBytes(result.totalReclaimableBytes);

  return result;
}

/**
 * 2. Project Dependencies Scanner (node_modules, .venv, target, vendor)
 */
async function scanProjectDependencies(searchRoots = null) {
  // Common developer roots if none provided
  const rawRoots = (Array.isArray(searchRoots) && searchRoots.length > 0)
    ? searchRoots
    : [
        path.join(HOME_DIR, 'Desktop'),
        path.join(HOME_DIR, 'Documents'),
        path.join(HOME_DIR, 'Projects'),
        path.join(HOME_DIR, 'Developer'),
        path.join(HOME_DIR, 'code'),
        path.join(HOME_DIR, 'workspace')
      ];
  const roots = rawRoots.map(r => path.resolve(String(r).replace(/^~(?=$|\/|\\)/, HOME_DIR)));

  const targetFolderNames = new Set(['node_modules', '.venv', 'venv', 'target', 'vendor', '.next', 'build', 'dist']);
  const projects = [];
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  // Max search depth to keep scanning fast and non-blocking
  async function searchDir(currentDir, depth = 0) {
    if (depth > 5) return;
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.') && !['.venv', '.next'].includes(entry.name)) continue;
        if (entry.name === 'Library' || entry.name === 'Applications' || entry.name === '.Trash') continue;

        const fullPath = path.join(currentDir, entry.name);

        if (targetFolderNames.has(entry.name)) {
          // Found a dependency folder
          try {
            const stat = await fs.stat(fullPath);
            const parentDir = path.dirname(fullPath);
            const projectName = path.basename(parentDir);
            const lastModified = stat.mtime;
            const ageMs = now - lastModified.getTime();
            const isUntouched30Days = ageMs > thirtyDaysMs;
            const sizeBytes = await getDirSize(fullPath);

            // Determine ecosystem
            let type = 'Node.js';
            if (entry.name === '.venv' || entry.name === 'venv') type = 'Python';
            else if (entry.name === 'target') type = 'Rust / Java';
            else if (entry.name === 'vendor') type = 'Go / PHP';
            else if (entry.name === '.next' || entry.name === 'build' || entry.name === 'dist') type = 'Build Cache';

            projects.push({
              id: `dep_${Buffer.from(fullPath).toString('base64').substring(0, 16)}`,
              name: entry.name,
              projectName,
              path: fullPath,
              parentPath: parentDir,
              type,
              sizeBytes,
              formattedSize: formatBytes(sizeBytes),
              lastModified,
              daysInactive: Math.floor(ageMs / (24 * 60 * 60 * 1000)),
              isUntouched30Days
            });
          } catch (e) {}
          // Don't descend into node_modules itself
          continue;
        } else {
          // Traverse child
          await searchDir(fullPath, depth + 1);
        }
      }
    } catch (e) {}
  }

  for (const root of roots) {
    try {
      const stat = await fs.lstat(root).catch(() => null);
      if (stat && stat.isDirectory()) {
        await searchDir(root, 0);
      }
    } catch (e) {}
  }

  // Sort by size descending
  projects.sort((a, b) => b.sizeBytes - a.sizeBytes);

  const totalBytes = projects.reduce((acc, p) => acc + p.sizeBytes, 0);
  const inactiveBytes = projects.filter(p => p.isUntouched30Days).reduce((acc, p) => acc + p.sizeBytes, 0);

  return {
    items: projects,
    totalBytes,
    formattedTotal: formatBytes(totalBytes),
    inactiveCount: projects.filter(p => p.isUntouched30Days).length,
    inactiveBytes,
    formattedInactive: formatBytes(inactiveBytes)
  };
}

/**
 * 3. Container & Package Managers Scanner
 */
async function scanContainersAndPackages() {
  const result = {
    docker: { installed: false, running: false, reclaimableBytes: 0, formatted: '0 B', details: null },
    homebrew: { installed: false, cacheBytes: 0, formatted: '0 B', cleanupDryRun: '' },
    packageManagers: []
  };

  // 3a. Docker
  try {
    const { stdout: dockerPath } = await execAsync('which docker');
    if (dockerPath.trim()) {
      result.docker.installed = true;
      try {
        const { stdout: dfOut } = await execAsync('docker system df --format "{{json .}}"', { timeout: 2500 });
        result.docker.running = true;
        const lines = dfOut.trim().split('\n').filter(Boolean);
        let dockerReclaimable = 0;
        const details = [];

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            details.push(data);
            // Docker outputs Size and Reclaimable strings like "1.2GB (80%)"
            if (data.Reclaimable) {
              const match = data.Reclaimable.match(/^([\d\.]+)\s*([A-Za-z]+)/);
              if (match) {
                const val = parseFloat(match[1]);
                const unit = match[2].toUpperCase();
                let mult = 1;
                if (unit.startsWith('K')) mult = 1024;
                else if (unit.startsWith('M')) mult = 1024 * 1024;
                else if (unit.startsWith('G')) mult = 1024 * 1024 * 1024;
                dockerReclaimable += val * mult;
              }
            }
          } catch (e) {}
        }

        result.docker.reclaimableBytes = Math.round(dockerReclaimable);
        result.docker.formatted = formatBytes(result.docker.reclaimableBytes);
        result.docker.details = details;
      } catch (daemonErr) {
        result.docker.running = false;
        result.docker.error = 'Docker servisi çalışmıyor';
      }
    }
  } catch (e) {}

  // 3b. Homebrew
  const brewCachePath = path.join(HOME_DIR, 'Library/Caches/Homebrew');
  try {
    const { stdout: brewPath } = await execAsync('which brew');
    if (brewPath.trim()) {
      result.homebrew.installed = true;
      const size = await getDirSize(brewCachePath);
      result.homebrew.cacheBytes = size;
      result.homebrew.formatted = formatBytes(size);

      try {
        const { stdout: dryRun } = await execAsync('brew cleanup -n 2>/dev/null');
        result.homebrew.cleanupDryRun = dryRun.trim();
      } catch (e) {}
    }
  } catch (e) {}

  // 3c. Package Manager Caches
  const pmCaches = [
    { name: 'npm Cache', path: path.join(HOME_DIR, '.npm'), type: 'npm' },
    { name: 'Yarn Cache', path: path.join(HOME_DIR, 'Library/Caches/Yarn'), type: 'yarn' },
    { name: 'pnpm Store', path: path.join(HOME_DIR, 'Library/pnpm/store'), type: 'pnpm' },
    { name: 'pip Cache', path: path.join(HOME_DIR, 'Library/Caches/pip'), type: 'pip' },
    { name: 'pip Unix Cache', path: path.join(HOME_DIR, '.cache/pip'), type: 'pip' },
    { name: 'Cargo Registry & Git', path: path.join(HOME_DIR, '.cargo/registry'), type: 'cargo' },
    { name: 'Gradle Cache', path: path.join(HOME_DIR, '.gradle/caches'), type: 'gradle' }
  ];

  for (const pm of pmCaches) {
    try {
      const exists = await fs.lstat(pm.path).catch(() => null);
      if (exists) {
        const size = await getDirSize(pm.path);
        if (size > 0) {
          result.packageManagers.push({
            id: `pm_${pm.type}_${path.basename(pm.path)}`,
            name: pm.name,
            path: pm.path,
            type: pm.type,
            sizeBytes: size,
            formattedSize: formatBytes(size)
          });
        }
      }
    } catch (e) {}
  }

  return result;
}

/**
 * Execute Docker system prune
 */
async function pruneDocker(all = false) {
  const flag = all ? '-a -f --volumes' : '-f';
  const { stdout } = await execAsync(`docker system prune ${flag}`);
  return { success: true, output: stdout };
}

/**
 * Execute Homebrew cleanup
 */
async function cleanupHomebrew() {
  const { stdout } = await execAsync('brew cleanup');
  return { success: true, output: stdout };
}

/**
 * Delete simulator runtime cache
 */
async function deleteSimulatorCache() {
  try {
    await execAsync('xcrun simctl erase all 2>/dev/null');
    return { success: true };
  } catch (err) {
    throw new Error(`Simülatör temizleme hatası: ${err.message}`);
  }
}

module.exports = {
  scanXcode,
  scanProjectDependencies,
  scanContainersAndPackages,
  pruneDocker,
  cleanupHomebrew,
  deleteSimulatorCache
};
