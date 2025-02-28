import axios from "axios";


async function neSearchByText(text,offset,limit) {
  const {data} = await axios.get(`https://music.163.com/api/cloudsearch/pc`, {
    params: {
      s: text,
      type: 1,
      offset: offset,
      total: true,
      limit: limit
    }
  })
  if(data){
    return data
  }
  return null;
}

async function neGetLrc(id){
  const {data} = await axios.get(`https://music.163.com/api/song/lyric`, {
    params: {
      id:id,
      lv:-1,
      yv:-1,
      tv:-1,
      os:'pc'
    }
  })
  if (data){
    return {
      lrc: data?.lrc?.lyric,
      yrc: data?.yrc?.lyric,
      translate: data?.tlyric?.lyric,
      type: data?.yrc?.lyric? ".yrc":".lrc",
    }
  }
  return null;
}

async function neGetLrcBySearch(text,offset,limit){
  let lrcData=[]
  try {
    const data=await neSearchByText(text,offset,limit)
    if (!data?.result?.songs){
      return;
    }
    for (const item of data.result.songs) {
      const data=await neGetLrc(item.id)
      if (!data){
        continue;
      }

      lrcData.push({
        name: item.name,
        id: item.id,
        artist: item.ar[0]?.name||'未知',
        ...data
      })
    }
    return lrcData
  }catch (err){
    console.error(err)
    return null;
  }
}

async function neSaveColorByText(text,songPath){
  try {
    const data=await neSearchByText(text,1,1)
    if (data?.result?.songCount > 0){
      const picUrl = data.result.songs[0].al.picUrl;
      await window.electron.ipcRenderer.send('saveNetCover', {songPath, picUrl});
    }
  }catch (err){
    console.error(err)
  }
}



async function qmSearchByText(text,offset,limit){
  const {data} = await axios.get(`https://c.y.qq.com/soso/fcgi-bin/client_search_cp`, {
    params: {
      format: 'json',
      w: text,
      n: limit,
      p: offset
    }
  })
  if(data){
    return data
  }
  return null;
}

async function qmGetLrc(id){
  let {data} = await axios.get(`https://c.y.qq.com/qqmusic/fcgi-bin/lyric_download.fcg`, {
    params: {
      version:'15',
      lrctype:'4',
      musicid:id,
    }
  })
  if(data){
    const regex=/CDATA\[(\S+)]]/g
    const lrc_ts=[] //original,ts,roma
    let match;
    while ((match = regex.exec(data)) !== null){
      lrc_ts.push(match[1])
    }
    lrc_ts[0]= await window.electron.ipcRenderer.invoke('qrc_decrypt',lrc_ts[0]);
    lrc_ts[1]= await window.electron.ipcRenderer.invoke('qrc_decrypt',lrc_ts[1]);
    return {
      lrc:null,
      qrc: lrc_ts[0],
      translate: lrc_ts[1],
      type: '.qrc',
    }
  }
}

async function qmGetLrcBySearch(text,offset,limit){
  let lrcData=[]
  try {
    const data=await qmSearchByText(text,offset,limit)
    if (!data?.data?.song?.list){
      return;
    }
    for (const item of data?.data?.song?.list) {
      const data=await qmGetLrc(item.songid)
      if (!data){
        continue;
      }

      lrcData.push({
        name: item.songname,
        id: item.songid,
        artist: item.singer[0]?.name||'未知',
        ...data
      })
    }
    return lrcData
  }catch (err){
    console.error(err)
    return null;
  }
}

async function qmSaveColorByText(text,songPath){
  try {
    const data=await qmSearchByText(text,1,1)
    const mid=data?.data?.song?.list[0]?.albummid
    if (mid){
        const picUrl = `https://y.gtimg.cn/music/photo_new/T002R800x800M000${mid}.jpg`;
        await window.electron.ipcRenderer.send('saveNetCover', {songPath, picUrl});
    }
  }catch (err){
    console.error(err)
  }
}

export async function searchByText(text,offset,limit,apiSource){
  return await [qmSearchByText,neSearchByText][apiSource](text,offset,limit)
}

export async function getLrcById(id,apiSource){
  return await [qmGetLrc,neGetLrc][apiSource](id)
}

export async function getLrcBySearch(text,offset,limit,apiSource){
  return await [qmGetLrcBySearch,neGetLrcBySearch][apiSource](text,offset,limit)
}

export async function saveColorByText(text,songPath,apiSource){
  return [qmSaveColorByText,neSaveColorByText][apiSource](text,songPath)
}
