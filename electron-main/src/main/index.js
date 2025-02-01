import {app, BrowserWindow, ipcMain, Menu, shell, Tray} from 'electron';
import {join} from 'path';
import {electronApp, is, optimizer} from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import {useDebounceFn} from '@vueuse/core';
import {audio_scan, getCover, getLocalCover} from './audio_scan';
import {ByteVector, File, PictureType} from "node-taglib-sharp";
import axios from "axios";
import sharp from "sharp";

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    title: 'Vega Player',
    backgroundColor: '0x00000000',
    show: false,
    frame: false, // 禁用默认边框
    transparent: false, // 可选：让窗口背景透明
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? {icon} : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      webSecurity: false
    }
  });
  mainWindow.setMenu(null);
  mainWindow.setMaximizable(false);

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return {action: 'deny'};
  });
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on(
    'resize',
    useDebounceFn(() => {
      if (!mainWindow.isMaximized()) {
        mainWindow.webContents.send('resize');
      }
    }, 200)
  );

  mainWindow.on('close', () => {
    mainWindow = null;
  });

  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.vega-player');
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.handle('windowAction', (event, action) => {
    const window = mainWindow;
    if (action === 'close') {
      window.close();
    }
    if (action === 'minimize') {
      window.minimize();
    }
    if (action === 'maximize') {
      window.isMaximized() ? window.unmaximize() : window.maximize();
      return window.isMaximized();
    }
    return false;
  });
  createWindow();

  tray = new Tray(join(__dirname, '../../resources/icon.png'))
  tray.setToolTip('Vega-Player')


  const contextMenu = Menu.buildFromTemplate([
    {label: '上一首', click: () => mainWindow.webContents.send('TogglePlay', 'last')},
    {label: '暂停/播放', click: () => mainWindow.webContents.send('swPause')},
    {label: '下一首', click: () => mainWindow.webContents.send('TogglePlay', 'next')},
    {type: 'separator'},
    {label: '随机播放', type: "radio", id: 'random', click: () => mainWindow.webContents.send('setPlayMode', 'random')},
    {label: '单曲循环', type: "radio", id: 'loop', click: () => mainWindow.webContents.send('setPlayMode', 'loop')},
    {label: '列表循环', type: "radio", id: 'order', click: () => mainWindow.webContents.send('setPlayMode', 'order')},
    {type: 'separator'},
    {label: '退出', role: 'quit'}
  ]);
  tray.setContextMenu(contextMenu);

  ipcMain.on('setPlayModeBtn', (_, mode) => {
    contextMenu.getMenuItemById(mode).checked = true;
  });

  tray.on('click', () => {
    if (mainWindow.isMinimized() && mainWindow) {
      mainWindow.restore()
    } else {
      mainWindow.show()
    }
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
ipcMain.on('select_files', async (event, args) => {
  if (!app.isReady()) {
    return null;
  }
  const startTime = performance.now();
  await audio_scan(event, args.flag, args.cacheList);
  const endTime = performance.now();
  console.log(`Execution Time: ${(endTime - startTime).toFixed(2)}ms`);
});

ipcMain.handle('getCovers', async (_, path) => {
  return await getCover(path);
});

ipcMain.handle('getLocalCovers', async (_, path) => {
  return await getLocalCover(path);
});

ipcMain.on('saveNetCover', async (_, args) => {
  try {
    axios.get(args.picUrl, {responseType: 'arraybuffer'}).then(async ({data}) => {
      const picData = await sharp(Buffer.from(data, 'binary'))
        .resize(600, 600)
        .toBuffer()

      const myFile = File.createFromPath(args.path);
      const pic = {
        data: ByteVector.fromByteArray(picData),
        mimeType: 'image/png',
        type: PictureType.FrontCover
      };
      myFile.tag.pictures = [pic];
      myFile.save();
      myFile.dispose();
    })
  } catch (err) {
    console.log(err);
  }

})

ipcMain.on('setTrayTitle',(_, title)=>{
  tray.setToolTip(title)
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
