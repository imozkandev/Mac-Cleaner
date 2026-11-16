/**
 * main.js - Native macOS Desktop Application & Menu Bar Companion
 * 
 * Features:
 * - Native macOS Frameless Window with Vibrancy & Traffic Lights
 * - Native macOS Menu Bar (Status Bar) Companion:
 *   * Lives right in the macOS Top Menu Bar
 *   * Shows live RAM & Disk usage in the bar
 *   * Clicking opens an Apple-grade floating popover directly under the bar icon
 *   * Right-click shows native menu
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell, nativeImage, screen } = require('electron');
const path = require('path');
const { startServer, stopServer } = require('./server');
const systemService = require('./src/services/system');

let mainWindow = null;
let popoverWindow = null;
let tray = null;
let serverPort = 4173;
let trayUpdateTimer = null;

// Load crisp monochrome macOS menu bar template icon
function createTrayIcon() {
  const iconPath = path.join(__dirname, 'assets', 'trayTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);
  return icon;
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 840,
    minWidth: 1060,
    minHeight: 680,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#0c0f17',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadURL(`http://localhost:${serverPort}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Creates the floating Menu Bar Popover Window anchored to the macOS Top Bar
 */
function createPopoverWindow() {
  popoverWindow = new BrowserWindow({
    width: 320,
    height: 380,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    vibrancy: 'popover',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  popoverWindow.loadURL(`http://localhost:${serverPort}/menu.html`);

  popoverWindow.on('blur', () => {
    if (!popoverWindow.webContents.isDevToolsOpened()) {
      popoverWindow.hide();
    }
  });
}

function togglePopover() {
  if (!popoverWindow || !tray) return;

  if (popoverWindow.isVisible()) {
    popoverWindow.hide();
    return;
  }

  // Calculate position right below the macOS Menu Bar icon
  const trayBounds = tray.getBounds();
  const windowBounds = popoverWindow.getBounds();
  const primaryDisplay = screen.getPrimaryDisplay();
  const screenWidth = primaryDisplay.workAreaSize.width;

  // Center popover horizontally under tray icon, keeping within screen bounds
  let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
  if (x + windowBounds.width > screenWidth - 12) {
    x = screenWidth - windowBounds.width - 12;
  }
  if (x < 12) x = 12;
  const y = Math.round(trayBounds.y + trayBounds.height + 4);

  popoverWindow.setPosition(x, y, false);
  popoverWindow.show();
  popoverWindow.focus();
}

/**
 * Setup Menu Bar Tray
 */
async function setupTray() {
  try {
    const icon = createTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('mac-cleaner — macOS Menü Çubuğu İzleyici');

    // Left click toggles the floating companion popover directly under the bar!
    tray.on('click', () => {
      togglePopover();
    });

    // Right click shows context menu
    tray.on('right-click', () => {
      showContextMenu();
    });

    async function updateTrayTitle() {
      try {
        const mem = await systemService.getMemoryStats();
        // Display percentage directly in macOS top menu bar
        tray.setTitle(` ${mem.usagePercent}% RAM`);
      } catch (e) {}
    }

    await updateTrayTitle();
    trayUpdateTimer = setInterval(updateTrayTitle, 3500);
  } catch (err) {
    console.error('Tray init error:', err);
  }
}

function showContextMenu() {
  const contextMenu = Menu.buildFromTemplate([
    { label: 'mac-cleaner Pro', enabled: false },
    { type: 'separator' },
    {
      label: 'Hızlı RAM Boşalt (Purge)',
      click: async () => {
        await systemService.purgeMemory();
      }
    },
    {
      label: 'Çöp Kutusunu Boşalt',
      click: async () => {
        await systemService.emptyTrash();
      }
    },
    { type: 'separator' },
    {
      label: 'Ana Pencereyi Aç',
      click: () => {
        openMainWindow();
      }
    },
    { type: 'separator' },
    { label: 'Çıkış', role: 'quit' }
  ]);

  tray.popUpContextMenu(contextMenu);
}

function openMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createMainWindow();
  }
}

// IPC Handlers
ipcMain.handle('open-main-window', () => {
  if (popoverWindow) popoverWindow.hide();
  openMainWindow();
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('open-in-finder', async (event, targetPath) => {
  if (targetPath) {
    shell.showItemInFolder(targetPath);
    return true;
  }
  return false;
});

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});
ipcMain.handle('window-close', () => { if (mainWindow) mainWindow.close(); });

// App Lifecycle
app.whenReady().then(async () => {
  try {
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(path.join(__dirname, 'assets', 'icon.png'));
    }
  } catch (e) {}

  try {
    const serverInfo = await startServer();
    serverPort = serverInfo.port;
  } catch (err) {
    console.error('Server startup error:', err);
  }

  createPopoverWindow();
  await setupTray();
  await createMainWindow();

  app.on('activate', () => {
    openMainWindow();
  });
});

app.on('window-all-closed', () => {
  // On macOS keep app running in menu bar
});

app.on('will-quit', () => {
  if (trayUpdateTimer) clearInterval(trayUpdateTimer);
  stopServer();
});
