<script setup>
import {nextTick, ref, toRaw, useTemplateRef} from "vue";
import {useScroll, useVirtualList} from '@vueuse/core'
import IndexDB from "../assets/indexDB";
import placeholder from "../assets/placeholder.jpg";
import FloatLocalTopBtn from "./FloatLocalTopBtn.vue";
import {vOnClickOutside} from "@vueuse/components";
import EventBus from "../assets/EventBus";

const db = new IndexDB()
const music_dropdown = ref(false)
const music_menu = useTemplateRef('music_menu')
const music_local = ref({
  x: 0,
  y: 0,
  path: '',
  music_index: 0,
  isLike: false,
})
const cache_list = ref([])
const {list, containerProps, wrapperProps} = useVirtualList(
  cache_list.value,
  {
    itemHeight: 56,
    overscan: 5
  })
const music_list = containerProps.ref
const {arrivedState} = useScroll(music_list)


db.init_DB().then(() => {
  db.searchData('', 0, cache_list.value)
})

async function SelectFile(flag, cacheList = []) {
  await db.init_DB()
  window.electron.ipcRenderer.send('select_files', {flag: flag, cacheList: toRaw(cacheList)})
}

window.electron.ipcRenderer.on('close_db', () => {
  db.close_db()
})
window.electron.ipcRenderer.on('to_top', () => {
  music_list.value.scrollTop = 0
})

window.electron.ipcRenderer.on('delete_db', (_, path, index, isLike) => {
  db.deleteData(path)
  if (isLike) {
    db.deleteData(path, 'LikesCache')
    EventBus.emit('delete_LikeCache', path)
  }
  cache_list.value.splice(index, 1)
})

window.electron.ipcRenderer.on('add_db', (_, item) => {
  db.addData(item)
  cache_list.value.push(item)
})

window.electron.ipcRenderer.on('update_cache_file', (_, item) => {
  console.log(item);
  db.searchData(item.path, 1).then(flag => {
    if (flag === 0) {
      db.addData(item)
      cache_list.value.push(item)
    }
  })
})

EventBus.on('set_Like_false', path => {
  const cacheSet = cache_list.value.map(item => item.path)
  cache_list.value[cacheSet.indexOf(path)].isLike = false
})
EventBus.on('delete_Cache', path => {
  const cacheSet = cache_list.value.map(item => item.path)
  cache_list.value.splice(cacheSet.indexOf(path), 1)
})

function SwitchLikes(event, args) {
  console.log('likes: ', toRaw(cache_list.value[args.index]))
  if (event.target.checked) {
    db.init_DB().then(() => {
      cache_list.value[args.index].isLike = true
      db.addData(toRaw(cache_list.value[args.index]))
      db.addData(toRaw(cache_list.value[args.index]), 'LikesCache')
      db.close_db()
      EventBus.emit('add_LikeCache', toRaw(cache_list.value[args.index]))
    })
  } else {
    db.init_DB().then(() => {
      db.deleteData(args.path, 'LikesCache')
      cache_list.value[args.index].isLike = false
      db.addData(toRaw(cache_list.value[args.index]))
      db.close_db()
      EventBus.emit('delete_LikeCache', args.path)
    })
  }
}

function music_delete() {
  db.init_DB().then(() => {
    db.deleteData(music_local.value.path)
    db.deleteData(music_local.value.path, 'LikesCache')
    db.close_db()
    cache_list.value.splice(music_local.value.music_index, 1)
    if (music_local.value.isLike) {
      EventBus.emit('delete_LikeCache', music_local.value.path)
    }
  })
  music_dropdown.value = false
}


async function click_menu(event, args) {
  music_dropdown.value = !music_dropdown.value;
  await nextTick(() => {
    music_local.value.x = event.clientX - 6;
    music_local.value.y = event.clientY - music_menu.value.clientHeight - 6;
    music_local.value.path = args.path;
    music_local.value.music_index = args.index
    music_local.value.isLike = args.isLike;
  })

}

function dropdownClose() {
  music_dropdown.value = false
}

function ToTop() {
  music_list.value.scrollTop = 0
}

function ToLocal() {
}
</script>

<template>
  <div class="relative top-0 left-0 flex flex-col items-start justify-start h-screen w-full p-4 pb-16 gap-y-2">
    <span
      class="select-none text-zinc-900 dark:text-zinc-200 text-2xl basis-1/6 flex items-center justify-center font-semibold px-4 pt-4">本地音乐</span>
    <div class="w-full basis-1/12 flex items-center justify-start gap-x-4 px-4">
      <div class="dropdown">
        <button
          class="flex items-center justify-center gap-x-2 text-zinc-900 dark:text-zinc-200 text-xs select-none dark:bg-neutral-700 bg-zinc-400/30 hover:bg-neutral-700/30 p-2 px-4 rounded duration-200 outline-none"
          tabindex="0">
          <svg class="stroke-zinc-900 dark:stroke-zinc-200" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
            <line stroke-width="1" x1="8" x2="8" y1="0" y2="16"/>
            <line stroke-width="1" x1="0" x2="16" y1="8" y2="8"/>
          </svg>
          添加
        </button>
        <ul
          class="w-36 p-0 py-2 dropdown-content menu shadow-xl dark:bg-neutral-900 bg-gray-200 *:text-zinc-900 *:dark:text-zinc-300 rounded *:text-[10px]"
          tabindex="0">
          <li>
            <a class="active:bg-transparent active:text-inherit p-2 h-8 rounded-none" @click="SelectFile('file')">
              手动添加
            </a>
          </li>
          <li>
            <a class="active:bg-transparent active:text-inherit p-2 h-8 rounded-none"
               @click="SelectFile('folder',cache_list)">
              扫描文件夹
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
      class="dark:bg-zinc-800 bg-zinc-200 flex items-center justify-start w-full h-fit *:text-[10px] px-6 pr-8 *:select-none *:text-zinc-900 *:dark:text-zinc-400">
      <span class="w-0 flex-auto mr-4 max-w-[25%]">歌曲/艺术家</span>
      <span class="w-10"></span>
      <span class="text-xs mx-8 mr-16 w-6"></span>
      <span class="w-0 flex-auto text-left">专辑</span>
      <span class="w-10 mx-8 text-center">时长</span>
    </div>
    <div class="basis-2/3 w-full overflow-x-hidden overflow-y-auto p-4 pb-0" v-bind="containerProps">
      <div class="w-full flex flex-col items-start justify-start" v-bind="wrapperProps">
        <div
          v-for="metadata in list" :key="metadata.index"
          class="*:select-none flex items-center justify-start dark:even:bg-zinc-800 dark:odd:bg-zinc-900/40 even:bg-zinc-200 odd:bg-zinc-300/60 dark:hover:bg-zinc-950/60 hover:bg-zinc-400/40 w-full h-14 p-2 *:text-zinc-900 rounded duration-200 hover:cursor-pointer">
          <img
            :src="metadata.data.picture? metadata.data.picture:placeholder"
            alt=""
            class="rounded h-10 w-10 object-cover bg-cover" loading="lazy"/>
          <div class="flex flex-col items-start justify-between h-8 mx-2 w-0 flex-auto max-w-[25%] *:truncate">
            <span class="text-xs w-full dark:text-zinc-200">{{ metadata.data.title }}</span>
            <span class="text-[10px] w-full font-thin dark:text-zinc-400">{{ metadata.data.artist }}</span>
          </div>
          <span class="flex items-center justify-center mx-8 mr-4 w-6">
            <label class="swap">
            <input ref="theme_sw" :checked="metadata.data.isLike" class="outline-none" type="checkbox"
                   @change="SwitchLikes($event,{path:metadata.data.path,index:metadata.index})"/>
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
          <span class="flex items-center justify-center mr-6 w-6"
                @click.stop="click_menu($event,{path:metadata.data.path,index:metadata.index,isLike:metadata.data.isLike})">
            <svg class="fill-zinc-500 dark:fill-zinc-400" height="16" viewBox="0 0 1024 1024"
                 width="16" xmlns="http://www.w3.org/2000/svg"><path
              d="M929.70745 299.43679 93.792153 299.43679c-16.575514 0-30.013571-13.100366-30.013571-29.67588s13.438057-29.67588 30.013571-29.67588l835.916321 0c16.575514 0 30.013571 13.100366 30.013571 29.67588S946.283987 299.43679 929.70745 299.43679z"></path><path
              d="M775.639492 546.053584 93.792153 546.053584c-16.575514 0-30.013571-13.612019-30.013571-30.187533s13.438057-30.187533 30.013571-30.187533L775.639492 485.678518c16.575514 0 30.013571 13.612019 30.013571 30.187533S792.215006 546.053584 775.639492 546.053584z"></path><path
              d="M929.70745 791.647071 93.792153 791.647071c-16.575514 0-30.013571-13.100366-30.013571-29.67588s13.438057-29.67588 30.013571-29.67588l835.916321 0c16.575514 0 30.013571 13.100366 30.013571 29.67588S946.283987 791.647071 929.70745 791.647071z">
            </path></svg>
          </span>
          <span class="text-[10px] w-0 text-left flex-auto truncate dark:text-zinc-400">
          {{ metadata.data.album }}
        </span>
          <div class="text-[10px] font-thin text-center w-10 mx-8 truncate dark:text-zinc-400">
            {{
              Math.floor(metadata.data.duration / 60).toString().padStart(2, '0')
            }}:{{ Math.floor(metadata.data.duration % 60).toString().padStart(2, '0') }}
          </div>
        </div>
      </div>
    </div>
    <float-local-top-btn :is-play="true" :is-top="arrivedState.top" @ToLocal="ToLocal"
                         @ToTop="ToTop"></float-local-top-btn>
    <div
      v-if="music_dropdown"
      ref="music_menu"
      v-on-click-outside.blub="dropdownClose"
      :style="{'left':music_local.x+'px', 'top':music_local.y+'px'}"
      class="*:select-none *:px-4 *:py-2 *:w-full flex flex-col items-start justify-center w-36 py-2 fixed shadow-lg dark:bg-neutral-900 bg-gray-200 *:text-zinc-900 *:dark:text-zinc-300 rounded *:text-[10px] *:duration-200">
      <span class="dark:hover:bg-neutral-800/40 hover:bg-gray-300/80" @click="music_delete">删除</span>
      <span class="dark:hover:bg-neutral-800/40 hover:bg-gray-300/80">播放</span>
    </div>
  </div>
</template>
