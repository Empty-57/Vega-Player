import {app, BrowserWindow, ipcMain, shell} from 'electron'
import {join} from 'path'
import {electronApp, is, optimizer} from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {debounce} from "./debounce";
import {audio_scan} from "./audio_scan";

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false, // 禁用默认边框
    transparent: false, // 可选：让窗口背景透明
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? {icon} : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return {action: 'deny'}
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('resize', debounce(() => {
    if (!mainWindow.isMaximized()) {
      mainWindow.webContents.send('resize')
    }
  }, 200))
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.vega-player')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  ipcMain.handle('windowAction', (event, action) => {
    const window = BrowserWindow.getFocusedWindow();
    if (action === 'close') {
      window.close()
    }
    if (action === 'minimize') {
      window.minimize()
    }
    if (action === 'maximize') {
      window.isMaximized() ? window.unmaximize() : window.maximize();
      return window.isMaximized();
    }
    return false;
  })
  createWindow()
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
ipcMain.handle('select_files', async (_, flag) => {
  if (!app.isReady()) {
    return null;
  }
  const startTime = performance.now();
  const audio_metadata = await audio_scan(flag)
  const endTime = performance.now();
  console.log(`Execution Time: ${(endTime - startTime).toFixed(2)}ms`);
  return audio_metadata;
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

