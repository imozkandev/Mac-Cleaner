/**
 * rulesEngine.js - Smart Rules, Automation & Whitelist Management
 * 
 * Features:
 * 1. Define and evaluate cleanup rules (e.g., .dmg/.pkg older than 30 days)
 * 2. Directory growth limit alerts
 * 3. Whitelist management for protected paths
 * 4. Persistent JSON storage in ~/.config/mac-cleaner
 */

const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { moveToTrash } = require('./safeTrash');
const { formatBytes } = require('./system');

async function getDirSizeBytes(dirPath) {
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

const HOME_DIR = os.homedir();
const CONFIG_DIR = path.join(HOME_DIR, '.config/mac-cleaner');
const RULES_FILE = path.join(CONFIG_DIR, 'rules.json');
const WHITELIST_FILE = path.join(CONFIG_DIR, 'whitelist.json');

// Default built-in smart rules
const DEFAULT_RULES = [
  {
    id: 'rule_downloads_dmg_pkg',
    title: 'Eski Kurulum Dosyaları (.dmg / .pkg)',
    description: 'İndirilenler klasöründeki 30 günden eski .dmg ve .pkg dosyalarını Çöp Kutusu\'na taşı.',
    enabled: true,
    targetDir: path.join(HOME_DIR, 'Downloads'),
    extensions: ['.dmg', '.pkg', '.iso'],
    ageDays: 30,
    action: 'trash'
  },
  {
    id: 'rule_xcode_derived_data',
    title: 'Xcode DerivedData Otomasyonu',
    description: 'Xcode DerivedData 14 günden eski build önbelleklerini temizle.',
    enabled: true,
    targetDir: path.join(HOME_DIR, 'Library/Developer/Xcode/DerivedData'),
    extensions: [],
    ageDays: 14,
    action: 'trash'
  },
  {
    id: 'rule_inactive_node_modules',
    title: 'Hareketsiz Proje Bağımlılıkları',
    description: '60 günden uzun süredir açılmamış projelerdeki node_modules klasörlerini uyar/temizle.',
    enabled: false,
    targetDir: path.join(HOME_DIR, 'Projects'),
    extensions: ['node_modules'],
    ageDays: 60,
    action: 'notify'
  },
  {
    id: 'rule_downloads_growth_alert',
    title: 'İndirilenler Boyut Limiti Alarmı',
    description: '~/Downloads klasörü 15 GB üzerine çıktığında uyarı ver.',
    enabled: true,
    targetDir: path.join(HOME_DIR, 'Downloads'),
    sizeThresholdGB: 15,
    action: 'alert'
  }
];

// Default user whitelist
const DEFAULT_WHITELIST = [
  path.join(HOME_DIR, 'Documents/Important'),
  path.join(HOME_DIR, '.ssh'),
  path.join(HOME_DIR, '.gnupg')
];

/**
 * Ensures config directory exists
 */
async function ensureConfigDir() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (e) {}
}

/**
 * Loads rules
 */
async function getRules() {
  await ensureConfigDir();
  try {
    const data = await fs.readFile(RULES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    // Save defaults
    await fs.writeFile(RULES_FILE, JSON.stringify(DEFAULT_RULES, null, 2));
    return DEFAULT_RULES;
  }
}

/**
 * Saves rules
 */
async function saveRules(rules) {
  await ensureConfigDir();
  await fs.writeFile(RULES_FILE, JSON.stringify(rules, null, 2));
  return rules;
}

/**
 * Loads whitelist
 */
async function getWhitelist() {
  await ensureConfigDir();
  try {
    const data = await fs.readFile(WHITELIST_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    await fs.writeFile(WHITELIST_FILE, JSON.stringify(DEFAULT_WHITELIST, null, 2));
    return DEFAULT_WHITELIST;
  }
}

/**
 * Saves whitelist
 */
async function saveWhitelist(whitelist) {
  await ensureConfigDir();
  await fs.writeFile(WHITELIST_FILE, JSON.stringify(whitelist, null, 2));
  return whitelist;
}

/**
 * Evaluates all active rules and executes or reports candidates
 */
async function evaluateRules(dryRun = true) {
  const rules = await getRules();
  const whitelist = await getWhitelist();
  const evaluationResults = [];

  const now = Date.now();

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const result = {
      ruleId: rule.id,
      title: rule.title,
      action: rule.action,
      matchedItems: [],
      totalBytes: 0,
      formattedTotal: '0 B',
      triggeredAlert: false,
      alertMessage: ''
    };

    const targetDir = rule.targetDir
      ? path.resolve(String(rule.targetDir).replace(/^~(?=$|\/|\\)/, HOME_DIR))
      : null;

    // Check size threshold rule (Growth alert)
    if (rule.sizeThresholdGB && rule.action === 'alert' && targetDir) {
      try {
        const bytes = await getDirSizeBytes(targetDir);
        result.totalBytes = bytes;
        result.formattedTotal = formatBytes(bytes);
        const limitBytes = rule.sizeThresholdGB * 1024 * 1024 * 1024;
        if (bytes > limitBytes) {
          result.triggeredAlert = true;
          result.alertMessage = `${targetDir} klasörü ${formatBytes(bytes)} boyutuna ulaştı (Eşik: ${rule.sizeThresholdGB} GB)!`;
        }
      } catch (e) {}
      evaluationResults.push(result);
      continue;
    }

    // Age & extension matching rule
    if (targetDir) {
      try {
        const stat = await fs.lstat(targetDir).catch(() => null);
        if (stat && stat.isDirectory()) {
          const entries = await fs.readdir(targetDir, { withFileTypes: true });
          const ageLimitMs = (rule.ageDays || 30) * 24 * 60 * 60 * 1000;

          for (const entry of entries) {
            if (entry.name.startsWith('.') && entry.name !== '.venv') continue;
            const fullPath = path.join(targetDir, entry.name);
            const ext = path.extname(entry.name).toLowerCase();

            // Match extension if specified
            const matchesExt = !rule.extensions || rule.extensions.length === 0 || rule.extensions.includes(ext) || rule.extensions.includes(entry.name);
            if (!matchesExt) continue;

            try {
              const entryStat = await fs.stat(fullPath);
              const ageMs = now - entryStat.mtime.getTime();

              if (ageMs > ageLimitMs) {
                let sizeBytes = entryStat.size;
                if (entry.isDirectory()) {
                  sizeBytes = await getDirSizeBytes(fullPath);
                }

                result.matchedItems.push({
                  name: entry.name,
                  path: fullPath,
                  sizeBytes,
                  formattedSize: formatBytes(sizeBytes),
                  lastModified: entryStat.mtime,
                  daysOld: Math.floor(ageMs / (24 * 60 * 60 * 1000))
                });
                result.totalBytes += sizeBytes;

                // Execute action if not dry run
                if (!dryRun && rule.action === 'trash') {
                  await moveToTrash(fullPath, whitelist);
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

    result.formattedTotal = formatBytes(result.totalBytes);
    evaluationResults.push(result);
  }

  return evaluationResults;
}

module.exports = {
  getRules,
  saveRules,
  getWhitelist,
  saveWhitelist,
  evaluateRules
};
