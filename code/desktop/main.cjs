const { app, BrowserWindow, screen, globalShortcut, ipcMain, session } = require('electron');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// Default target web URL (development or production)
const DEFAULT_WEB_URL = process.env.EXAM_WEB_URL || 'http://localhost:5173';
const isDevMode = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

let mainWindow = null;
let launchTargetUrl = null;

// Register the custom protocol 'examapp'
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('examapp', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('examapp');
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // Someone clicked a deep-link URI while the app was running
    const deepLinkUrl = commandLine.find((arg) => arg.startsWith('examapp://'));
    if (deepLinkUrl) {
      handleDeepLink(deepLinkUrl);
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function handleDeepLink(deepLinkUrl) {
  try {
    const urlObj = new URL(deepLinkUrl);
    let examId = urlObj.searchParams.get('examId');
    const ticket = urlObj.searchParams.get('ticket');

    // Handle device registration deep links (examapp://register or examapp://devices/register)
    if (deepLinkUrl.includes('register')) {
      launchTargetUrl = `${DEFAULT_WEB_URL}/devices/register-action${urlObj.search || ''}`;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(launchTargetUrl);
      }
      return;
    }

    // Also support path format like examapp://exam/:examId/gates or examapp://launch?examId=...
    if (!examId && urlObj.pathname) {
      const parts = urlObj.pathname.replace(/^\/\//, '/').split('/').filter(Boolean);
      if (parts[0] === 'exam' && parts[1]) {
        examId = parts[1];
      } else if (parts[0] === 'launch' && parts[1]) {
        examId = parts[1];
      }
    }

    if (examId) {
      const searchStr = urlObj.search || (ticket ? `?ticket=${encodeURIComponent(ticket)}` : '');
      const targetPath = `/exam/${examId}/gates${searchStr}`;
      launchTargetUrl = `${DEFAULT_WEB_URL}${targetPath}`;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(launchTargetUrl);
      }
    }
  } catch (err) {
    console.error('Failed to parse deep link URL:', err);
  }
}

// Parse initial process arguments for deep link
const initialDeepLink = process.argv.find((arg) => arg.startsWith('examapp://'));
if (initialDeepLink) {
  handleDeepLink(initialDeepLink);
}

function createLockdownWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: isDevMode ? 1280 : width,
    height: isDevMode ? 800 : height,
    fullscreen: !isDevMode,
    kiosk: !isDevMode, // Kiosk mode locks down taskbar in production
    alwaysOnTop: !isDevMode,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
  });

  // Load target URL or default web app entry
  const targetToLoad = launchTargetUrl || `${DEFAULT_WEB_URL}/dashboard`;
  mainWindow.loadURL(targetToLoad);

  // In production exam mode, intercept keyboard shortcuts
  if (!isDevMode) {
    mainWindow.on('focus', () => {
      registerSecurityShortcuts();
    });
  }

  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('security:violation', {
        type: 'FOCUS_LOST',
        timestampMs: Date.now(),
        details: 'Window lost focus or candidate attempted task-switch.',
      });
    }
  });

  // Monitor screen display additions (anti-cheating multi-monitor detection)
  screen.on('display-added', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('security:violation', {
        type: 'MULTIPLE_DISPLAYS',
        timestampMs: Date.now(),
        details: 'Secondary monitor or projector connected during assessment.',
      });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    globalShortcut.unregisterAll();
  });
}

function registerSecurityShortcuts() {
  globalShortcut.unregisterAll();

  // Block PrintScreen, DevTools, Refresh, Task Switching in production mode
  const blockedShortcuts = [
    'PrintScreen',
    'CommandOrControl+Shift+I',
    'F12',
    'CommandOrControl+R',
    'F5',
    'Alt+Tab',
    'Alt+F4',
    'CommandOrControl+W',
  ];

  for (const shortcut of blockedShortcuts) {
    globalShortcut.register(shortcut, () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('security:violation', {
          type: 'FORBIDDEN_KEYSTROKE',
          timestampMs: Date.now(),
          details: `Blocked shortcut key attempt: ${shortcut}`,
        });
      }
      return false;
    });
  }
}

// -------------------------------------------------------------
// IPC Handlers for window.electronBridge
// -------------------------------------------------------------
ipcMain.handle('security:get-fingerprint', async () => {
  const hardwareData = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.cpus()[0]?.model || 'cpu'}`;
  return crypto.createHash('sha256').update(hardwareData).digest('hex');
});

ipcMain.handle('security:get-device-info', async () => {
  const hostname = os.hostname();
  const platform = os.platform() === 'win32' ? 'Windows' : os.platform() === 'darwin' ? 'macOS' : 'Linux';
  const release = os.release();
  const arch = os.arch();
  const cpu = os.cpus()[0]?.model || '';
  return {
    hostname,
    platform,
    release,
    arch,
    cpu,
    label: hostname,
  };
});

ipcMain.handle('security:get-attestation', async () => {
  const attestationPayload = {
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    timestamp: Date.now(),
    appVersion: app.getVersion(),
  };
  return crypto.createHash('sha256').update(JSON.stringify(attestationPayload)).digest('hex');
});

ipcMain.handle('security:enable-lockdown', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!isDevMode) {
      mainWindow.setKiosk(true);
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      registerSecurityShortcuts();
    }
    return { success: true };
  }
  return { success: false, error: 'Window not active' };
});

ipcMain.handle('security:disable-lockdown', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!isDevMode) {
      mainWindow.setKiosk(false);
      mainWindow.setAlwaysOnTop(false);
      globalShortcut.unregisterAll();
    }
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('security:get-display-count', async () => {
  return screen.getAllDisplays().length;
});

ipcMain.handle('security:close-shell', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
  return { success: true };
});

// App lifecycle
app.whenReady().then(() => {
  // Automatically grant media permissions (camera, microphone) to the exam session
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'camera', 'microphone', 'display-capture', 'notifications'];
    if (allowed.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowed = ['media', 'camera', 'microphone', 'display-capture', 'notifications'];
    return allowed.includes(permission);
  });

  createLockdownWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createLockdownWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
