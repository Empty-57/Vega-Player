import {BrowserWindow, dialog} from "electron";
import fs from "node:fs";
import path from "node:path";
import {loadMusicMetadata} from "music-metadata";

const _ext = ["mp3", "mpeg", "opus", "ogg", "oga", "wav", "aac", "caf", "m4a", "m4b", "mp4", "weba", "webm", "", "flac"]
const audio_ext = new Set(_ext.map(item => {
  return '.' + item
}))

export async function audio_scan(event, flag) {
  const window = BrowserWindow.getFocusedWindow();
  const mm = await loadMusicMetadata()
  if (flag === 'file') {
    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile'], // 打开文件选择对话框
      filters: [
        {name: 'Audio Files', extensions: _ext}, // 只显示音频文件
      ]
    });
    if (result.canceled) {
      event.sender.send('close_db')
      return null
    } // 如果用户取消选择

    const filePath = result.filePaths[0];
    const metadata = await mm.parseFile(filePath, {skipPostHeaders: true, includeChapters: false});

    new Promise(() => {
      event.sender.send('update_cache_file', {
        audio_id: filePath,
        title: metadata.common.title ? metadata.common.title : path.basename(filePath, path.extname(filePath)),
        artist: metadata.common.artist,
        album: metadata.common.album,
        numberOfChannels: metadata.format.numberOfChannels,//声道
        sampleRate: metadata.format.sampleRate,//音频采样率
        duration: metadata.format.duration,//时长 s
        bitrate: metadata.format.bitrate,//比特率
        picture: metadata.common.picture,
        path: filePath,
        isLike: false
      })
    }).then(() => {
      event.sender.send('close_db')
    })
  }

  if (flag === 'folder') {
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'], // 打开文件夹选择对话框
    });
    if (result.canceled) {
      event.sender.send('close_db')
      return null
    } // 如果用户取消选择
    event.sender.send('clear_db')

    const folderPath = result.filePaths[0];
    const files = await fs.promises.opendir(folderPath); // 获取文件夹内容
    const audioFiles = [];  // 过滤音频文件
    for await (const file of files) {
      if (audio_ext.has(path.extname(file.name))) {
        audioFiles.push(file.name);
      }
    }

    Promise.all(audioFiles.map(async (file) => {
      const filePath = path.join(folderPath, file);
      const metadata = await mm.parseFile(filePath, {skipPostHeaders: true, includeChapters: false});
      event.sender.send('update_cache_folder', {
        audio_id: filePath,
        title: metadata.common.title ? metadata.common.title : path.basename(file, path.extname(file)),
        artist: metadata.common.artist,
        album: metadata.common.album,
        numberOfChannels: metadata.format.numberOfChannels,//声道
        sampleRate: metadata.format.sampleRate,//音频采样率
        duration: metadata.format.duration,//时长 s
        bitrate: metadata.format.bitrate,//比特率
        picture: metadata.common.picture,
        path: filePath,
        isLike: false
      })
    })).then(() => {
      event.sender.send('close_db')
    });
  }
}
