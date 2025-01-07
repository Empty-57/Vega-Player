<script setup>
import {onBeforeMount, reactive} from "vue";
import {useVirtualList} from '@vueuse/core'
import IndexDB from "../assets/indexDB";
import placeholder from "../assets/placeholder.jpg";

const db = new IndexDB()

const fileMeta_list = reactive([])
const {list, containerProps, wrapperProps} = useVirtualList(
  fileMeta_list,
  {
    itemHeight: 56,
    overscan: 5
  })

onBeforeMount(() => {
  db.init_DB().then(() => {
    db.searchData('', 0, fileMeta_list)
  })
})

async function SelectFile(flag) {
  await db.init_DB()
  await window.electron.ipcRenderer.send('select_files', flag)
}

window.electron.ipcRenderer.on('close_db', async (_, item) => {
  db.close_db()
})
window.electron.ipcRenderer.on('clear_db', async (_, item) => {
  fileMeta_list.length = 0
  db.clearData()
})

window.electron.ipcRenderer.on('update_cache_folder', async (_, item) => {
  db.addData(item)
  fileMeta_list.push(item)
  console.log(item);
})

window.electron.ipcRenderer.on('update_cache_file', async (_, item) => {
  const check = []
  db.searchData(item.path, 1, check)
  if (check) {
    return;
  }
  db.addData(item)
  fileMeta_list.push(item)
  console.log(item);
})

function SwitchLikes() {

}

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
</script>

<template>
  <div class="relative top-0 left-0 flex flex-col items-start justify-start h-screen w-full p-4 gap-y-2">
    <span
      class="text-zinc-900 dark:text-zinc-200 text-2xl basis-1/6 flex items-center justify-center font-semibold px-4 pt-4">本地音乐</span>
    <div class="w-full basis-1/12 flex items-center justify-start gap-x-4 px-4">
      <div class="dropdown">
        <div
          class="flex items-center justify-center gap-x-2 text-zinc-900 dark:text-zinc-200 text-xs select-none dark:bg-zinc-700 bg-zinc-400/20 hover:bg-[#a6adbb1a] p-2 px-4 rounded duration-200 outline-none"
          role="button"
          tabindex="0">
          <svg class="stroke-zinc-900 dark:stroke-zinc-200" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
            <line stroke-width="1" x1="8" x2="8" y1="0" y2="16"/>
            <line stroke-width="1" x1="0" x2="16" y1="8" y2="8"/>
          </svg>
          添加
        </div>
        <ul
          class="w-36 dropdown-content menu shadow dark:bg-zinc-900 bg-zinc-200 *:text-zinc-900 *:dark:text-zinc-200 rounded *:text-xs"
          tabindex="0">
          <li>
            <a class="active:bg-transparent active:text-inherit" @click="SelectFile('file')">
              手动添加
            </a>
          </li>
          <li>
            <a class="active:bg-transparent active:text-inherit" @click="SelectFile('folder')">
              添加文件夹
            </a>
          </li>
        </ul>
      </div>
      <span>mul_action</span>
      <span>search</span>
      <span>sort</span>
      <span>view</span>
    </div>
    <div
      class="dark:bg-zinc-800 bg-zinc-200 flex items-center justify-start w-full h-fit *:text-xs px-6 pr-8 *:select-none *:text-zinc-900 *:dark:text-zinc-400">
      <span class="w-0 flex-auto mr-4 max-w-[25%]">歌曲/艺术家</span>
      <span class="w-10"></span>
      <span class="text-xs mx-8 mr-16 w-7"></span>
      <span class="w-0 flex-auto text-left">专辑</span>
      <span class="w-10 mx-8 text-center">时长</span>
    </div>
    <div class="basis-2/3 w-full overflow-x-hidden overflow-y-auto p-4" v-bind="containerProps">
      <div class="w-full flex flex-col items-start justify-start overflow-hidden" v-bind="wrapperProps">
        <div
          v-for="metadata in list" :key="metadata.index"
          class="flex items-center justify-start dark:even:bg-zinc-800 dark:odd:bg-zinc-900/40 even:bg-zinc-200 odd:bg-zinc-300/60 dark:hover:bg-zinc-900/60 hover:bg-zinc-400/40 w-full h-14 p-2 *:text-zinc-900 *:dark:text-zinc-200 rounded duration-200">
          <img
            :src="metadata.data.picture? 'data:'+metadata.data.picture[0].format+';base64,'+uint8ArrayToBase64(metadata.data.picture[0].data):placeholder"
            alt=""
            class="rounded h-10 w-10 object-cover bg-cover" loading="lazy"/>
          <div class="flex flex-col items-start justify-center mx-2 w-0 flex-auto max-w-[25%] *:truncate">
            <span class="text-sm w-full">{{ metadata.data.title }}</span>
            <span class="text-xs w-full">{{ metadata.data.artist }}</span>
          </div>
          <span class="text-xs mx-8 mr-16 w-7">
            <label class="swap">
            <input ref="theme_sw" type="checkbox" @change="SwitchLikes"/>
            <svg class="swap-off stroke-zinc-500 dark:stroke-zinc-400" height="16" viewBox="0 0 24 24" width="16"
                 xmlns="http://www.w3.org/2000/svg">
  <path
    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
    fill="none" stroke-width="2"/>
</svg>

            <svg class="swap-on dark:fill-red-900 fill-red-600" height="16" viewBox="0 0 24 24" width="16"
                 xmlns="http://www.w3.org/2000/svg">
  <path
    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
    stroke-width="2"/>
</svg>
          </label>
          </span>
          <span class="text-xs w-0 text-left flex-auto truncate">
          {{ metadata.data.album }}
        </span>
          <div class="text-xs text-center w-10 mx-8 truncate">
            {{
              Math.floor(metadata.data.duration / 60).toString().padStart(2, '0')
            }}:{{ Math.floor(metadata.data.duration % 60).toString().padStart(2, '0') }}
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
