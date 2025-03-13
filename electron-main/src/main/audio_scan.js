import {BrowserWindow, dialog, nativeImage} from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {parseFile} from 'music-metadata';
import pLimit from 'p-limit';
import sharp from "sharp";
import languageEncoding from 'detect-file-encoding-and-language'
import iconv_pkg from "iconv-lite";
import {qrc_decrypt} from "./qrcDecrypt.js";

const {encodingExists,decode}=iconv_pkg;

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


async function cacheSender(filePath, event, channel) {
  let metadata;
  try {
    metadata = await parseFile(filePath, {
      skipPostHeaders: true,
      includeChapters: false,
      skipCovers: true
    });
  }catch (e) {
    return;
  }

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
    src: null,
    isLike: false,
    isManual:channel==='update_cache_file'
  });
}

const LYRIC_EXTS = ['.qrc','.yrc', '.lrc'];
const LYRIC_VTS_SUFFIX = '_Vts.lrc';
const getLyricPaths = (filePath) => {
  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));

  return {
    mainPaths: LYRIC_EXTS.map(ext => path.join(dir, `${baseName}${ext}`)),
    vtsPath: path.join(dir, `${baseName}${LYRIC_VTS_SUFFIX}`)
  };
};

const safeReadFile = async (filePath) => {
  try {
    const { encoding } = await languageEncoding(filePath);
    if (!encodingExists(encoding)&&path.extname(filePath) === '.lrc') {
      console.warn(`Unsupported encoding: ${encoding} for ${filePath}`);
      return null;
    }

    const buffer = await fs.promises.readFile(filePath);
    if (path.extname(filePath) === '.qrc'){
      const lrc=buffer.toString('utf-8')
      if (!lrc.startsWith('<?xml')){
        return await qrc_decrypt(buffer, true)
      }
    }
    return decode(buffer, encoding, { defaultEncoding: 'utf8' });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Error reading ${filePath}:`, error.message);
    }
    return null;
  }
};

export async function getLyrics(filePath) {
  if (!filePath) return null;

  // 1. 优先读取音频元数据中的歌词
  try {
    const metadata = await parseFile(filePath, {
      skipPostHeaders: true,
      includeChapters: false,
      duration: false,
      skipCovers: true
    });

    if (metadata.common?.lyrics || metadata.common?.lyricist) {
      return {
        lyrics: metadata.common.lyrics || metadata.common.lyricist,
        lyrics_ts: null,
        type: 'metadata'
      };
    }
  } catch (error) {
    console.error('Error reading audio metadata:', error.message);
  }

  // 2. 读取外部歌词文件
  const { mainPaths, vtsPath } = getLyricPaths(filePath);

  // 并行读取 VTS 歌词文件
  const lyricsTsPromise = safeReadFile(vtsPath);

  // 按优先级顺序检查主歌词文件
  for (const lyricPath of mainPaths) {
    const lyrics = await safeReadFile(lyricPath);
    if (lyrics) {
      return {
        lyrics,
        lyrics_ts: await lyricsTsPromise,
        type: path.extname(lyricPath)
      };
    }
  }
  // 3. 所有途径都失败时返回 null
  return null;
}

export async function getLocalCover(filePath, flag = 1) {
  const size = flag === 1 ? 150 : 800
  for (const ext of ['.png', '.jpg', '.jpeg']) {
    const path_ =
      filePath.substring(0, filePath.lastIndexOf('\\')) +
      '\\' +
      path.basename(filePath, path.extname(filePath)) +
      ext;
    try {
      await fs.promises.access(path_, fs.constants.F_OK);

      const picData = await sharp(await fs.promises.readFile(path_))
        .resize(size, size)
        .toBuffer()
      return nativeImage.createFromBuffer(picData).toDataURL();
    } catch (err) {
    }
  }
  return null;
}

export async function getCover(filePath, flag = 1) {
  const metadata = await parseFile(filePath, {
    skipPostHeaders: true,
    includeChapters: false,
    duration: false
  });
  if (!metadata.common.picture) {
    return null
  }
  const size = flag === 1 ? 150 : 800
  const picData = await sharp(metadata.common.picture[0].data)
    .resize(size, size)
    .toBuffer()

  return nativeImage.createFromBuffer(picData).toDataURL();
}

export async function audio_scan(event) {
  const window = BrowserWindow.getFocusedWindow();
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

export async function audio_scan2(event, folderList, cacheList) {
  if (!folderList){
    return;
  }
  event.sender.send('load_start');
    const audioFiles = []; // 过滤音频文件
  try {
    for (const folder of folderList) {
      const files = await fs.promises.readdir(folder, {recursive: true});
      files.forEach((file) => {
        const filePath = path.join(folder, file);
        if (audio_ext.has(path.extname(file))) {
          audioFiles.push(filePath);
        }
      });
    }
  }catch (e){
    console.error(`Error reading audio file: ${e.message}`);
    event.sender.send('load_end');
    return ;
  }


  const setAudioFiles = new Set(audioFiles);
    const itemsToRemove = cacheList.filter((value) => !setAudioFiles.has(value.path)); //删除缓存里面缓存有而文件夹没有的内容

    itemsToRemove.forEach((item, index) => {
      if (!item.isManual){
        event.sender.send('delete_db', item.path, cacheList.indexOf(item) - index, item.isLike);
      }
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
