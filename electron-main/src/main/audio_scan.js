import {BrowserWindow, dialog} from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {parseFile} from 'music-metadata';
import pLimit from 'p-limit';

const _ext = [
  'mp3',
  'mpeg',
  'opus',
  'ogg',
  'oga',
  'wav',
  'aac',
  'caf',
  'm4a',
  'm4b',
  'mp4',
  'weba',
  'webm',
  'dolby',
  'flac'
];
const audio_ext = new Set(
  _ext.map((item) => {
    return '.' + item;
  })
);

// 获取 CPU 核心数
const cpuCount = os.cpus().length;
// 最大并发数
const maxConcurrency = cpuCount * 2;
const limit = pLimit(maxConcurrency);

function uint8ArrayToBase64(array) {
  // 将 Uint8Array 转换为字符串（必须是有效的 ASCII 字符）
  let binaryString = '';
  const length = array.length;
  for (let i = 0; i < length; i++) {
    binaryString += String.fromCharCode(array[i]);
  }
  // 使用 btoa 将二进制字符串转换为 Base64
  return btoa(binaryString);
}

async function cacheSender(filePath, event, channel) {
  const metadata = await parseFile(filePath, {
    skipPostHeaders: true,
    includeChapters: false,
    skipCovers: true
  });
  event.sender.send(channel, {
    title: metadata.common.title
      ? metadata.common.title
      : path.basename(filePath, path.extname(filePath)),
    artist: metadata.common.artist,
    album: metadata.common.album,
    // numberOfChannels: metadata.format.numberOfChannels,//声道
    // sampleRate: metadata.format.sampleRate,//音频采样率
    duration: metadata.format.duration, //时长 s
    formatTime: metadata.format.duration
      ? Math.floor(metadata.format.duration / 60)
        .toString()
        .padStart(2, '0') +
      ':' +
      Math.floor(metadata.format.duration % 60)
        .toString()
        .padStart(2, '0')
      : '?',
    // bitrate: metadata.format.bitrate,//比特率
    path: filePath,
    isLike: false
  });
}

export async function getLocalCover(filePath) {
  for (const ext of ['.png', '.jpg', '.jpeg']) {
    let path_ =
      filePath.substring(0, filePath.lastIndexOf('\\')) +
      '\\' +
      path.basename(filePath, path.extname(filePath)) +
      ext;
    try {
      await fs.promises.access(path_, fs.constants.F_OK);
      path_ = 'file://' + path_;
      return path_;
    } catch (err) {
    }
  }
  return null;
}

export async function getCover(filePath) {
  const metadata = await parseFile(filePath, {
    skipPostHeaders: true,
    includeChapters: false,
    duration: false
  });
  return metadata.common.picture
    ? 'data:' +
    metadata.common.picture[0].format +
    ';base64,' +
    uint8ArrayToBase64(metadata.common.picture[0].data)
    : null;
}

export async function audio_scan(event, flag, cacheList) {
  const window = BrowserWindow.getFocusedWindow();
  if (flag === 'file') {
    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile'], // 打开文件选择对话框
      filters: [
        {name: 'Audio Files', extensions: _ext} // 只显示音频文件
      ]
    });
    if (result.canceled) {
      event.sender.send('load_end');
      return null;
    } // 如果用户取消选择

    const filePath = result.filePaths[0];

    Promise.all([await cacheSender(filePath, event, 'update_cache_file')]).then(() => {
      event.sender.send('load_end');
    });
  }

  if (flag === 'folder') {
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'] // 打开文件夹选择对话框
    });
    if (result.canceled) {
      event.sender.send('load_end');
      return null;
    } // 如果用户取消选择
    event.sender.send('load_start');

    const folderPath = result.filePaths[0];
    const audioFiles = []; // 过滤音频文件

    const files = await fs.promises.readdir(folderPath, {recursive: true});
    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
      if (audio_ext.has(path.extname(file))) {
        audioFiles.push(filePath);
      }
    });

    const setAudioFiles = new Set(audioFiles);
    const itemsToRemove = cacheList.filter((value) => !setAudioFiles.has(value.path)); //删除缓存里面缓存有而文件夹没有的内容

    itemsToRemove.forEach((item, index) => {
      event.sender.send('delete_db', item.path, cacheList.indexOf(item) - index, item.isLike);
    });

    cacheList = cacheList.filter((value) => setAudioFiles.has(value.path));
    const setCacheList = new Set(
      cacheList.map((item) => {
        return item.path;
      })
    );
    const itemsToAdd = audioFiles.filter((value) => !setCacheList.has(value)); //向缓存添加缓存里面没有而文件夹有的内容

    if (!itemsToAdd.length > 0) {
      event.sender.send('load_end');
      return null;
    }

    const tasks = itemsToAdd.map((filePath) => {
      return limit(() => cacheSender(filePath, event, 'add_db'));
    });

    await Promise.all(tasks);
    event.sender.send('load_end');
  }
}
