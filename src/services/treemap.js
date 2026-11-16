/**
 * treemap.js - Interactive Treemap and Disk Usage Visualizer Engine
 * 
 * Generates hierarchical storage nodes for canvas/SVG treemap & sunburst rendering.
 */

const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { formatBytes } = require('./system');

const HOME_DIR = os.homedir();

async function getFastFolderSize(folderPath) {
  try {
    const { stdout } = await execAsync(`du -sk "${folderPath}" 2>/dev/null || true`, {
      timeout: 10000,
      maxBuffer: 10 * 1024 * 1024
    });
    const lines = stdout.trim().split('\n').filter(Boolean);
    const lastLine = lines[lines.length - 1] || '';
    const kb = parseInt(lastLine.trim().split(/\s+/)[0], 10) || 0;
    return kb * 1024;
  } catch (e) {
    return 0;
  }
}

const CATEGORY_MAP = {
  Developer: ['.js', '.ts', '.jsx', '.tsx', '.json', '.py', '.swift', '.rs', '.go', '.cpp', '.c', '.h', '.java', '.rb', '.php', '.html', '.css', '.scss', '.lock', '.yaml', '.yml', '.md'],
  Media: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.mp4', '.mov', '.avi', '.mkv', '.mp3', '.wav', '.flac', '.aac', '.m4a', '.heic'],
  Documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pages', '.numbers', '.key', '.txt', '.rtf', '.csv'],
  Archives: ['.zip', '.tar', '.gz', '.tgz', '.bz2', '.7z', '.rar', '.dmg', '.pkg', '.iso'],
  Applications: ['.app', '.dylib', '.framework', '.kext']
};

function getCategory(ext) {
  const lowerExt = ext.toLowerCase();
  for (const [cat, exts] of Object.entries(CATEGORY_MAP)) {
    if (exts.includes(lowerExt)) return cat;
  }
  return 'Other';
}

/**
 * Recursively scans directory and builds tree for Treemap
 */
async function buildDiskTree(rawDirPath, maxDepth = 3, currentDepth = 0) {
  const dirPath = path.resolve(String(rawDirPath || HOME_DIR).replace(/^~(?=$|\/|\\)/, HOME_DIR));
  const baseName = path.basename(dirPath) || dirPath;
  const node = {
    name: baseName,
    path: dirPath,
    type: 'folder',
    category: 'Folder',
    sizeBytes: 0,
    formattedSize: '0 B',
    children: []
  };

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hidden system nodes if at top level
      if (entry.name.startsWith('.') && currentDepth === 0) continue;
      if (entry.name === '.Trash') continue;

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (currentDepth < maxDepth) {
          const childNode = await buildDiskTree(fullPath, maxDepth, currentDepth + 1);
          if (childNode.sizeBytes > 0) {
            node.children.push(childNode);
            node.sizeBytes += childNode.sizeBytes;
          }
        } else {
          // At max depth, compute folder size with fast du -sk
          try {
            const folderSize = await getFastFolderSize(fullPath);
            if (folderSize > 0) {
              node.children.push({
                name: entry.name,
                path: fullPath,
                type: 'folder',
                category: 'Folder',
                sizeBytes: folderSize,
                formattedSize: formatBytes(folderSize),
                children: []
              });
              node.sizeBytes += folderSize;
            }
          } catch (e) {}
        }
      } else if (entry.isFile()) {
        try {
          const stat = await fs.stat(fullPath);
          const ext = path.extname(entry.name);
          const cat = getCategory(ext);

          node.children.push({
            name: entry.name,
            path: fullPath,
            type: 'file',
            ext,
            category: cat,
            sizeBytes: stat.size,
            formattedSize: formatBytes(stat.size),
            lastModified: stat.mtime
          });
          node.sizeBytes += stat.size;
        } catch (e) {}
      }
    }
  } catch (err) {
    // Permission denied or unreadable folder
  }

  // Sort children by size descending
  node.children.sort((a, b) => b.sizeBytes - a.sizeBytes);
  node.formattedSize = formatBytes(node.sizeBytes);

  return node;
}

module.exports = {
  buildDiskTree,
  getCategory
};
