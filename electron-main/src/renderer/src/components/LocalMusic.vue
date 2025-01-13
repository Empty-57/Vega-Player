<script setup>
import {ref, toRaw, watch} from "vue";
import IndexDB from "../assets/indexDB";
import EventBus from "../assets/EventBus";
import {findInsertPosition} from "../assets/BinarySearchPosition";
import MusicList from "./MusicList.vue";
import {useStorage} from '@vueuse/core'

const db = new IndexDB()
const cache_list = ref([])
const isLoading = ref(false)
const loadCount = ref(0)
const delCount = ref(0)
const local_cfg = useStorage('local_cfg', {sort_key: 'title', isReverse: false})
let sort_key = ref(local_cfg.value.sort_key)
let isReverse = ref(local_cfg.value.isReverse)

watch([sort_key, isReverse], async () => {
  cache_list.value.length = 0;
  db.init_DB().then(() => {
    db.searchData('', 0).then(data => {
      data.forEach(item => {
        const position = findInsertPosition(cache_list.value, (item[sort_key.value] || 0).toString(), sort_key.value)
        cache_list.value.splice(position, 0, item)
      })
      if (isReverse.value) {
        cache_list.value.reverse()
      }
    })
  })
}, {immediate: true})


async function SelectFile(flag, cacheList = []) {
  await db.init_DB()
  window.electron.ipcRenderer.send('select_files', {flag: flag, cacheList: toRaw(cacheList)})
}

window.electron.ipcRenderer.on('close_db', () => {
  db.close_db()
  isLoading.value = false
})
window.electron.ipcRenderer.on('load_start', () => {
  EventBus.emit('load_start')
  isLoading.value = true
  loadCount.value = 0
  delCount.value = 0
})

window.electron.ipcRenderer.on('delete_db', (_, path, index, isLike) => {
  db.deleteData(path)
  if (isLike) {
    db.deleteData(path, 'LikesCache')
    EventBus.emit('delete_LikeCache', path)
  }
  cache_list.value.splice(index, 1)
  delCount.value++;
})

window.electron.ipcRenderer.on('add_db', (_, item) => {
  db.addData(item)
  const position = findInsertPosition(cache_list.value, (item[sort_key.value] || 0).toString(), sort_key.value)
  cache_list.value.splice(position, 0, item)
  loadCount.value++;
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

function music_delete(music_local) {
  db.init_DB().then(() => {
    db.deleteData(music_local.value.path)
    db.deleteData(music_local.value.path, 'LikesCache')
    db.close_db()
    cache_list.value.splice(music_local.value.music_index, 1)
    if (music_local.value.isLike) {
      EventBus.emit('delete_LikeCache', music_local.value.path)
    }
  })
}

function select_sort(key_) {
  local_cfg.value.sort_key = key_
  sort_key.value = key_
}

function sw_reverse() {
  isReverse.value = !isReverse.value
  local_cfg.value.isReverse = isReverse.value
}
</script>

<template>
  <div class="relative w-full h-screen left-0 top-0">
    <music-list :cache_list="cache_list" :is-reverse="isReverse" :sort_key="sort_key" title="本地音乐"
                @SwitchLikes="(event ,args) => SwitchLikes(event,args)"
                @music_delete="music_local => music_delete(music_local)"
                @select_sort="key_ => select_sort(key_)"
                @sw_reverse="sw_reverse">
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
            <a
              class="dark:hover:bg-neutral-700/40 hover:bg-neutral-400/20 active:bg-transparent active:text-inherit p-2 h-8 rounded-none"
              @click="SelectFile('file')">
              手动添加
            </a>
          </li>
          <li>
            <a
              class="dark:hover:bg-neutral-700/40 hover:bg-neutral-400/20 active:bg-transparent active:text-inherit p-2 h-8 rounded-none"
              @click="SelectFile('folder',cache_list)">
              扫描文件夹
            </a>
          </li>
        </ul>
      </div>
    </music-list>
    <div v-if="isLoading"
         class="fixed w-full h-screen z-[9] m-auto bg-zinc-800/40 left-0 right-0 top-0 bottom-0 flex items-center justify-center">
      <div class="h-fit w-1/2 p-8 bg-zinc-900/80 rounded text-zinc-300">
        已添加：{{ loadCount }}
        <br>
        已删除：{{ delCount }}
      </div>
    </div>
  </div>
</template>
