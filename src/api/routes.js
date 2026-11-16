/**
 * routes.js - REST API Router for mac-cleaner
 */

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');

const systemService = require('../services/system');
const devCleanService = require('../services/devClean');
const uninstallerService = require('../services/uninstaller');
const duplicateService = require('../services/duplicateFinder');
const treemapService = require('../services/treemap');
const rulesService = require('../services/rulesEngine');
const safeTrash = require('../services/safeTrash');
const deepCleanService = require('../services/deepClean');

// Deep Clean Endpoints
router.get('/deep/caches', async (req, res) => {
  try {
    const data = await deepCleanService.scanDeepCaches();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/deep/logs', async (req, res) => {
  try {
    const data = await deepCleanService.scanLogs();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/deep/attachments', async (req, res) => {
  try {
    const data = await deepCleanService.scanAttachments();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/deep/download-residues', async (req, res) => {
  try {
    const data = await deepCleanService.scanDownloadResidues();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/deep/large-files', async (req, res) => {
  try {
    const minMb = parseInt(req.query.minMb, 10) || 100;
    const data = await deepCleanService.scanLargeFiles(minMb * 1024 * 1024);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. System Endpoints
router.get('/system/stats', async (req, res) => {
  try {
    const [memory, disk, systemInfo, trash] = await Promise.all([
      systemService.getMemoryStats(),
      systemService.getDiskStats(),
      systemService.getSystemInfo(),
      systemService.getTrashStats()
    ]);
    res.json({ success: true, memory, disk, systemInfo, trash });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/system/storage-breakdown', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const breakdown = await systemService.getStorageBreakdown(force);
    res.json({ success: true, data: breakdown });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/system/processes', async (req, res) => {
  try {
    const data = await systemService.getTopProcesses(12);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/system/processes/kill', async (req, res) => {
  try {
    const { pid, force } = req.body;
    const result = await systemService.killProcess(pid, !!force);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/system/launch-agents', async (req, res) => {
  try {
    const data = await systemService.getLaunchAgents();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/system/launch-agents/toggle', async (req, res) => {
  try {
    const { plistPath, action } = req.body;
    const result = await systemService.toggleLaunchAgent(plistPath, action);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/system/maintenance', async (req, res) => {
  try {
    const { taskId } = req.body;
    const result = await systemService.runMaintenanceTask(taskId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/system/purge-ram', async (req, res) => {
  try {
    const result = await systemService.purgeMemory();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/system/empty-trash', async (req, res) => {
  try {
    const result = await systemService.emptyTrash();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Dev Clean Endpoints
router.get('/dev/xcode', async (req, res) => {
  try {
    const data = await devCleanService.scanXcode();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/dev/dependencies', async (req, res) => {
  try {
    const roots = req.query.roots ? req.query.roots.split(',') : null;
    const data = await devCleanService.scanProjectDependencies(roots);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/dev/containers-packages', async (req, res) => {
  try {
    const data = await devCleanService.scanContainersAndPackages();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/dev/docker/prune', async (req, res) => {
  try {
    const all = req.body.all === true;
    const data = await devCleanService.pruneDocker(all);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/dev/brew/cleanup', async (req, res) => {
  try {
    const data = await devCleanService.cleanupHomebrew();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/dev/simulators/clean', async (req, res) => {
  try {
    const data = await devCleanService.deleteSimulatorCache();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Uninstaller Endpoints
router.get('/uninstaller/apps', async (req, res) => {
  try {
    const data = await uninstallerService.scanInstalledApps();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/uninstaller/orphaned', async (req, res) => {
  try {
    const data = await uninstallerService.scanOrphanedFiles();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/uninstaller/uninstall', async (req, res) => {
  try {
    const { appPath, leftoverPaths } = req.body;
    const whitelist = await rulesService.getWhitelist();
    const result = await uninstallerService.uninstallApp(appPath, leftoverPaths || [], whitelist);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Duplicate Finder Endpoints
router.post('/duplicates/scan', async (req, res) => {
  try {
    const { targetDirs, findSimilarImages } = req.body;
    const data = await duplicateService.scanDuplicates(targetDirs, { findSimilarImages: !!findSimilarImages });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/duplicates/delete', async (req, res) => {
  try {
    const { filePaths } = req.body;
    if (!Array.isArray(filePaths)) {
      return res.status(400).json({ success: false, error: 'filePaths array is required' });
    }
    const whitelist = await rulesService.getWhitelist();
    const results = await safeTrash.batchMoveToTrash(filePaths, whitelist);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Treemap Endpoints
router.post('/treemap/scan', async (req, res) => {
  try {
    const targetDir = req.body.targetDir || require('os').homedir();
    const depth = req.body.depth || 3;
    const tree = await treemapService.buildDiskTree(targetDir, depth);
    res.json({ success: true, data: tree });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Rules & Whitelist Endpoints
router.get('/rules', async (req, res) => {
  try {
    const rules = await rulesService.getRules();
    res.json({ success: true, rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/rules', async (req, res) => {
  try {
    const rules = await rulesService.saveRules(req.body.rules);
    res.json({ success: true, rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/rules/evaluate', async (req, res) => {
  try {
    const dryRun = req.body.dryRun !== false;
    const results = await rulesService.evaluateRules(dryRun);
    res.json({ success: true, results, dryRun });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/whitelist', async (req, res) => {
  try {
    const whitelist = await rulesService.getWhitelist();
    res.json({ success: true, whitelist });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/whitelist', async (req, res) => {
  try {
    const whitelist = await rulesService.saveWhitelist(req.body.whitelist);
    res.json({ success: true, whitelist });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. General Actions
router.post('/action/trash', async (req, res) => {
  try {
    const { targetPath } = req.body;
    const whitelist = await rulesService.getWhitelist();
    const result = await safeTrash.moveToTrash(targetPath, whitelist);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/action/show-in-finder', (req, res) => {
  const { targetPath } = req.body;
  if (!targetPath) return res.status(400).json({ error: 'targetPath is required' });

  exec(`open -R "${targetPath}"`, (err) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
