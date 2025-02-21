import {app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, shell, Tray,screen} from 'electron';
import {join,dirname} from 'path';
import {electronApp, is, optimizer} from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import {useDebounceFn} from '@vueuse/core';
import {audio_scan, getCover, getLocalCover,getLyrics} from './audio_scan';
import {ByteVector, File, PictureType} from 'node-taglib-sharp'
import axios from "axios";
import sharp from "sharp";
import fs from "fs";
import {data} from "autoprefixer";

let mainWindow = null;
let tray = null;
const singleInstanceLock = app.requestSingleInstanceLock();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    maxWidth:screen.getPrimaryDisplay().workAreaSize.width+50,
    maxHeight: screen.getPrimaryDisplay().workAreaSize.height+50,
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
        mainWindow.webContents.send('resize', false);
      }
    }, 200)
  );

  mainWindow.on('close', () => {
    mainWindow = null;
  });

  mainWindow.on('focus', () => {
    if (!mainWindow) {
      return;
    }
    mainWindow.webContents.send('resize', mainWindow.isMaximized());
  })

  mainWindow.webContents.openDevTools();
}


if (!singleInstanceLock) {
  app.quit(); // 如果没有获取到锁，则退出当前实例
} else {
  app.on('second-instance', () => {
      // 当尝试打开第二个实例时，聚焦到第一个实例的窗口
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    }
  )
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

ipcMain.handle('getCovers', async (_, args) => {
  return await getCover(args.path, args.flag);
});

ipcMain.handle('getLocalCovers', async (_, args) => {
  return await getLocalCover(args.path, args.flag);
});

ipcMain.on('saveNetCover', async (_, args) => {
  axios.get(args.picUrl, {responseType: 'arraybuffer'}).then(async ({data}) => {
    const picData = await sharp(Buffer.from(data, 'binary'))
      .resize(800, 800)
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

  }).catch(error => {
    console.log(error);
  })
})

ipcMain.on('saveMetadata', async (_, args) => {
  try {
    const myFile = File.createFromPath(args.path);
    myFile.tag.title = args.title
    myFile.tag.performers = [args.artist]
    myFile.tag.album = args.album

    if (args.coverPath) {
      const picData = await sharp(await fs.promises.readFile(args.coverPath))
        .resize(800, 800)
        .toBuffer()

      const pic = {
        data: ByteVector.fromByteArray(picData),
        mimeType: 'image/png',
        type: PictureType.FrontCover
      };
      myFile.tag.pictures = [pic];
    }

    myFile.save()
    myFile.dispose()
  } catch (error) {
    console.error(error);
  }
})

ipcMain.handle('editCover', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'], // 打开文件选择对话框
      filters: [
        {name: 'Images', extensions: ['jpg', 'png', 'jpeg']}
      ]
    });
    if (result.canceled) {
      return null;
    } // 如果用户取消选择

    const filePath = result.filePaths[0];
    const picData = await sharp(await fs.promises.readFile(filePath))
      .resize(800, 800)
      .toBuffer()

    const src = nativeImage.createFromBuffer(picData).toDataURL();

    return {filePath: filePath, src: src};
  } catch (error) {
    console.error(error);
    return {filePath: '', src: ''};
  }
})

ipcMain.on('reSetCover', (_, path) => {
  try {
    const myFile = File.createFromPath(path);
    myFile.tag.pictures = [];
    myFile.save();
    myFile.dispose();
  } catch (error) {
    console.error(error);
  }
})
ipcMain.on('setTrayTitle', (_, title) => {
  if (tray&&mainWindow){
    tray.setToolTip(title)
    mainWindow.setTitle(title);
  }
})
function parseLrc(data, data_ts, type) {
  const LRC_REGEX = /\[(\d{2}):(\d{2}\.\d{2,3})](.*?)(\r?\n|$)/g;

  // 时间戳解析
  const parseTime = (m, s) => {
    const minutes = parseInt(m, 10);
    const seconds = parseFloat(s);
    return minutes * 60 + seconds;
  };

  // 歌词解析器（保持原有顺序）
  const parseLyrics = (text) => {
    const entries = [];
    let match;
    while ((match = LRC_REGEX.exec(text)) !== null) {
      try {
        entries.push({
          timestamp: parseTime(match[1], match[2]),
          text: match[3].trim()
        });
      } catch (err) {
        console.warn('Invalid lyric line:', match[0], err.message);
      }
    }
    return entries;
  };

  // 解析主歌词（保持原始顺序）
  const mainLyrics = parseLyrics(data || '');

  // 解析翻译歌词并建立查找队列
  const transQueue = data_ts ? parseLyrics(data_ts) : [];
  let transIndex = 0;  // 翻译指针（按时间顺序推进）

  // 构建最终结果
  return mainLyrics.map((mainEntry, index) => {
    const nextTime = index < mainLyrics.length - 1
      ? mainLyrics[index + 1].timestamp
      : Infinity;

    // 寻找匹配的翻译（满足：翻译时间 ≤ 主歌词时间）
    let translate = '';
    while (transIndex < transQueue.length) {
      const transEntry = transQueue[transIndex];

      // 主时间超前翻译时间
      if (mainEntry.timestamp >= transEntry.timestamp) {
        translate=transEntry.text;
        transIndex++;
      } else {
        break; // 后续翻译时间更大，停止查找
      }
    }

    return {
      timestamp: mainEntry.timestamp,
      lyricText: mainEntry.text,
      nextTime,
      translate
    };
  });
}

function parseKaraokeLyric(lyricData) {
  const SEGMENT_REGEX = /\[(\d+),(\d+)]\s*((?:\(\d+,\d+,\d+\).*?)+)(?=\n\[|\n$)/g;
  const WORD_REGEX = /\((\d+),(\d+),\d+\)\s*((?:.(?!\(\d+,))*?.)(?=\s*\(|\s*$)/gs; // 注意添加 s 标志允许 . 匹配换行符

  const result = [];
  let segmentMatch;

  while ((segmentMatch = SEGMENT_REGEX.exec(lyricData)) !== null) {
    const [_, segStart, segDuration, content] = segmentMatch;
    const words = [];

    let wordMatch;
    while ((wordMatch = WORD_REGEX.exec(content)) !== null) {
      const [_, start, duration, text] = wordMatch;
      words.push({
        start: parseInt(start, 10),
        duration: parseInt(duration, 10),
        text: text.trim()
      });
    }

    result.push({
      segmentStart: parseInt(segStart, 10),
      segmentDuration: parseInt(segDuration, 10),
      words
    });
  }

  return result;
}

ipcMain.handle('getLyrics',async (_, path)=>{
  const lyrics_data =await getLyrics(path)
  return parseLrc(lyrics_data?.lyrics,lyrics_data?.lyrics_ts,lyrics_data?.type)
})

ipcMain.on('openPath',(_, path)=>{
  shell.showItemInFolder(path)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
