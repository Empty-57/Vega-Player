import fs from 'fs';
import path from 'path';
const cfgPath=path.join(__dirname,'../../resources/config.json')
export async function rwMusicFolders(folders,flag){
  try {
    let data=await fs.promises.readFile(cfgPath)
    data = JSON.parse(data.toString())
    if (flag ==='r'){
      return data.musicFolders
    }
    if (flag ==='w'){
      data.musicFolders=folders
      await fs.promises.writeFile(cfgPath, JSON.stringify(data, null, 2));
    }
  }catch (e){
    console.error(e);
  }
}
