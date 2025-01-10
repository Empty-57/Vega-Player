import {BrowserWindow, dialog} from "electron";
import fs from "node:fs";
import path from "node:path";
import {loadMusicMetadata} from "music-metadata";

const _ext = ["mp3", "mpeg", "opus", "ogg", "oga", "wav", "aac", "caf", "m4a", "m4b", "mp4", "weba", "webm", "", "flac"]
const audio_ext = new Set(_ext.map(item => {
  return '.' + item
}))

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

export async function audio_scan(event, flag, cacheList) {
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
        picture: metadata.common.picture ? 'data:' + metadata.common.picture[0].format + ';base64,' + uint8ArrayToBase64(metadata.common.picture[0].data) : null,
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
    event.sender.send('to_top')

    const folderPath = result.filePaths[0];
    const files = await fs.promises.opendir(folderPath); // 获取文件夹内容
    const audioFiles = [];  // 过滤音频文件
    for await (const file of files) {
      if (audio_ext.has(path.extname(file.name))) {
        audioFiles.push(file.name);
      }
    }
    const setAudioFiles = new Set(audioFiles.map(item => {
      return path.join(folderPath, item)
    }))
    const itemsToRemove = cacheList.filter(value => !setAudioFiles.has(value.path));//删除缓存里面缓存有而文件夹没有的内容

    itemsToRemove.forEach((item, index) => {
      event.sender.send('delete_db', item.path, cacheList.indexOf(item) - index)
    })

    cacheList = cacheList.filter(value => setAudioFiles.has(value.path));
    const setCacheList = new Set(cacheList.map(item => {
      return item.path
    }))
    const itemsToAdd = audioFiles.filter(value => !setCacheList.has(path.join(folderPath, value)));//向缓存添加缓存里面没有而文件夹有的内容

    Promise.all(itemsToAdd.map(async item => {
      const filePath = path.join(folderPath, item);
      const metadata = await mm.parseFile(filePath, {skipPostHeaders: true, includeChapters: false})
      event.sender.send('add_db', {
        audio_id: filePath,
        title: metadata.common.title ? metadata.common.title : path.basename(item, path.extname(item)),
        artist: metadata.common.artist,
        album: metadata.common.album,
        numberOfChannels: metadata.format.numberOfChannels,//声道
        sampleRate: metadata.format.sampleRate,//音频采样率
        duration: metadata.format.duration,//时长 s
        bitrate: metadata.format.bitrate,//比特率
        picture: metadata.common.picture ? 'data:' + metadata.common.picture[0].format + ';base64,' + uint8ArrayToBase64(metadata.common.picture[0].data) : null,
        path: filePath,
        isLike: false
      })
    })).then(() => {
      event.sender.send('close_db')
    }).catch(error => {
      console.error(error)
      event.sender.send('close_db')
    })
  }
}
