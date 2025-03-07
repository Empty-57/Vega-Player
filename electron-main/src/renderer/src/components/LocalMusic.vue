<script setup>
import {onActivated, ref, toRaw, watch} from 'vue';
import IndexDB from '../assets/indexDB';
import EventBus from '../assets/EventBus';
import {compareSorts, findInsertPosition} from '../assets/BinarySearchPosition';
import MusicList from './MusicList.vue';
import {useStorage} from '@vueuse/core';
import {vOnClickOutside} from '@vueuse/components';
import {search} from "../assets/Search.mjs";

const db = new IndexDB();
const cache_list = ref([]);
const f_cache_list = ref([]);
const isLoading = ref(false);
const file_dropdown = ref(false);
const loadCount = ref(0);
const delCount = ref(0);
const local_cfg = useStorage('local_cfg', {sort_key: 'title', isReverse: false});
const sort_key = ref(local_cfg.value.sort_key);
const isReverse = ref(local_cfg.value.isReverse);

const musicFolders = ref([]);
const showFolderCard=ref(false);

db.init_DB().then(() => {
  db.searchData('', 0).then(async (data) => {
    cache_list.value.push(...data);
    cache_list.value.sort((item1, item2) =>
      isReverse.value
        ? compareSorts(item2[sort_key.value], item1[sort_key.value])
        : compareSorts(item1[sort_key.value], item2[sort_key.value])
    );
    search(f_cache_list.value, cache_list.value)

    await window.electron.ipcRenderer.send('syncMusicCache', {
      cache_list: toRaw(cache_list.value)
    });
  });
});

watch(
  [sort_key, isReverse],
  async () => {
    cache_list.value.sort((item1, item2) =>
      isReverse.value
        ? compareSorts(item2[sort_key.value], item1[sort_key.value])
        : compareSorts(item1[sort_key.value], item2[sort_key.value])
    );
    search(f_cache_list.value,cache_list.value)
  },
  {immediate: true}
);

function SelectFile() {
  window.electron.ipcRenderer.send('select_files');
  file_dropdown.value = false;
}

async function openFolderCard() {
  showFolderCard.value = true;
  musicFolders.value = await window.electron.ipcRenderer.invoke('getMusicFolder')
  file_dropdown.value = false;
}

async function addMusicFolder() {
  const data = await window.electron.ipcRenderer.invoke('addMusicFolder');
  musicFolders.value.push(data)
  musicFolders.value=Array.from(new Set(musicFolders.value))
}

function deleteMusicFolder(path){
  musicFolders.value.splice(musicFolders.value.findIndex(path_ => path_ === path),1)
}

async function updateMusicFolders() {
  showFolderCard.value = false;
  await window.electron.ipcRenderer.send('updateMusicFolder',{folders:toRaw(musicFolders.value),cache_list:toRaw(cache_list.value)});
}

window.electron.ipcRenderer.on('load_end', () => {
  cache_list.value.sort((item1, item2) =>
    isReverse.value
      ? compareSorts(item2[sort_key.value], item1[sort_key.value])
      : compareSorts(item1[sort_key.value], item2[sort_key.value])
  );
  search(f_cache_list.value,cache_list.value)
  isLoading.value = false;
});
window.electron.ipcRenderer.on('load_start', () => {
  EventBus.emit('load_start');
  isLoading.value = true;
  loadCount.value = 0;
  delCount.value = 0;
});

window.electron.ipcRenderer.on('delete_db', (_, path, index, isLike) => {
  db.deleteData(path);
  if (isLike) {
    db.deleteData(path, 'LikesCache');
    EventBus.emit('delete_LikeCache', path);
  }
  cache_list.value.splice(index, 1);
  delCount.value++;
  EventBus.emit('delPlayList', {localName: 'Locals', path: path});
});

window.electron.ipcRenderer.on('add_db', (_, item) => {
  db.addData(item);
  cache_list.value.push(item);
  loadCount.value++;
  EventBus.emit('updatePlayList', {
    path: item.path,
    title: item.title,
    artist: item.artist,
    localName: 'Locals'
  });
});

window.electron.ipcRenderer.on('update_cache_file', (_, item) => {
  db.searchData(item.path, 1).then((flag) => {
    if (flag === 0) {
      db.addData(item);
      const position = findInsertPosition(cache_list.value, item[sort_key.value], sort_key.value);
      cache_list.value.splice(position, 0, item);
      EventBus.emit('updatePlayList', {
        path: item.path,
        title: item.title,
        artist: item.artist,
        localName: 'Locals'
      });
    }
    search(f_cache_list.value,cache_list.value)
  });
});

EventBus.on('set_Like_false', (path) => {
  cache_list.value.find((item) => item.path === path).isLike = false;
});

EventBus.on('SwitchLikes', ({event, args}) => {
  SwitchLikes(event, args);
});

function SwitchLikes(event, args) {
  const cache = cache_list.value.find((item) => item.path === args.path);

  console.log('likes: ', toRaw(cache));
  if (event.target.checked) {
    cache.isLike = true;
    db.addData(toRaw(cache));
    db.addData(toRaw(cache), 'LikesCache');

    EventBus.emit('add_LikeCache', toRaw(cache));
  } else {
    db.deleteData(args.path, 'LikesCache');
    cache.isLike = false;
    db.addData(toRaw(cache));

    EventBus.emit('delete_LikeCache', args.path);
  }
}

onActivated(() => {
  search(f_cache_list.value,cache_list.value)
});

function music_delete(path) {
  const cacheIndex = cache_list.value.findIndex((item) => item.path === path);
  const f_cacheIndex = f_cache_list.value.findIndex((item) => item.path === path);

  db.deleteData(path);
  db.deleteData(path, 'LikesCache');

  const local = cache_list.value.splice(cacheIndex, 1);
  f_cache_list.value.splice(f_cacheIndex, 1);
  const isLike = local ? local[0].isLike : false;
  if (isLike) {
    EventBus.emit('delete_LikeCache', path);
  }

  EventBus.emit('delPlayList', {localName: 'Locals', path: path});
}

function select_sort(key_) {
  local_cfg.value.sort_key = key_;
  sort_key.value = key_;
}

function sw_reverse() {
  isReverse.value = !isReverse.value;
  local_cfg.value.isReverse = isReverse.value;
}
function mulDelete(list) {
  list.forEach((path) => {
    music_delete(path);
  });
}

function addToLike(list) {
  list.forEach((path) => {
    const cache = cache_list.value.find((item) => item.path === path);
    if (cache.isLike) {
      return;
    }
    cache.isLike = true;
    db.addData(toRaw(cache));
    db.addData(toRaw(cache), 'LikesCache');

    EventBus.emit('add_LikeCache', toRaw(cache));
  });
}

EventBus.on('syncCache', args => {
  if (cache_list.value.find(item => item.path === args.path)) {
    cache_list.value.find(item => item.path === args.path).title = args.title;
    cache_list.value.find(item => item.path === args.path).artist = args.artist;
    cache_list.value.find(item => item.path === args.path).album = args.album;
    db.addData(toRaw(cache_list.value.find(item => item.path === args.path)));
    if (cache_list.value.find(item => item.path === args.path).isLike) {
      db.addData(toRaw(cache_list.value.find(item => item.path === args.path)), 'LikesCache');
    }
    search(f_cache_list.value,cache_list.value)
  }

})

</script>

<template>
  <div class="relative w-full h-screen left-0 top-0">
    <music-list
      :cache_list="f_cache_list"
      :full-cache-list="cache_list"
      :is-reverse="isReverse"
      :sort_key="sort_key"
      :title="'本地音乐 ' + cache_list.length + ' 首'"
      local-name="Locals"
      @SwitchLikes="(event, args) => SwitchLikes(event, args)"
      @addToLike="(list) => addToLike(list)"
      @mulDelete="(list) => mulDelete(list)"
      @music_delete="(path) => music_delete(path)"
      @search="(search_text) => search(f_cache_list,cache_list,search_text)"
      @select_sort="(key_) => select_sort(key_)"
      @sw_reverse="sw_reverse"
    >
      <template #slot1>
        <div class="">
          <div
            class="h-8 flex items-center justify-center gap-x-2 text-zinc-900 dark:text-zinc-200 text-xs select-none dark:bg-neutral-700 bg-zinc-400/30 hover:bg-neutral-700/30 p-2 px-4 rounded duration-200 outline-none"
            @click.stop="
              () => {
                file_dropdown = !file_dropdown;
              }
            "
          >
            <svg
              class="stroke-zinc-900 dark:stroke-zinc-200"
              height="16"
              width="16"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line stroke-width="1" x1="8" x2="8" y1="0" y2="16"/>
              <line stroke-width="1" x1="0" x2="16" y1="8" y2="8"/>
            </svg>
            添加
          </div>
          <ul
            v-on-click-outside.bubble="
              () => {
                file_dropdown = false;
              }
            "
            :class="[
              file_dropdown ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            ]"
            class="w-36 p-0 z-[5] *:duration-200 duration-200 *:select-none py-2 absolute shadow-xl dark:bg-neutral-900 bg-gray-200 *:text-zinc-900 *:dark:text-zinc-300 rounded *:text-[10px]"
            tabindex="0"
          >
            <li
              class="dark:hover:bg-neutral-700/40 hover:bg-neutral-400/20 p-2 h-8"
              @click="SelectFile"
            >
              手动添加
            </li>
            <li
              class="dark:hover:bg-neutral-700/40 hover:bg-neutral-400/20 p-2 h-8"
              @click="openFolderCard"
            >
              添加文件夹
            </li>
          </ul>
        </div>
      </template>
    </music-list>
    <div
      v-if="isLoading"
      class="fixed w-full h-screen z-[9] m-auto bg-zinc-800/40 left-0 right-0 top-0 bottom-0 flex items-center justify-center"
    >
      <div class="h-fit w-1/2 p-8 bg-zinc-900/80 rounded text-zinc-300 select-none">
        已添加：{{ loadCount }}
        <br/>
        已删除：{{ delCount }}
      </div>
    </div>
    <div v-if="showFolderCard" class="z-11 w-[60%] h-[80%] m-auto dark:bg-zinc-900 bg-zinc-300 shadow-md rounded fixed left-0 right-0 top-0 bottom-0 flex flex-col items-center justify-between gap-y-4 p-4">
      <div class="w-full flex items-end justify-between text-xs dark:text-zinc-300 text-zinc-900 *:select-none">
        <span>当前监控的文件夹：</span>
        <div class="duration-200 dark:hover:bg-zinc-700 hover:bg-zinc-400/60 dark:bg-zinc-800 bg-zinc-400/40 p-2 h-8 rounded cursor-pointer" @click="addMusicFolder">添加文件夹</div>
      </div>
      <div class="flex flex-col items-start justify-start gap-y-1 p-2 grow dark:bg-neutral-800/60 bg-neutral-400/20 rounded w-full *:w-full *:truncate *:text-[14px] dark:text-zinc-300 text-zinc-900">
        <div v-for="path in musicFolders" class="w-full flex items-center justify-between">
          <span>{{path}}</span>
          <svg
            @click="deleteMusicFolder(path)"
            class="dark:stroke-zinc-200 stroke-zinc-900 hover:stroke-red-600"
            height="20"
            viewBox="0 0 24 24"
            width="20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 18L18 6M6 6l12 12"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1"
            />
          </svg>
        </div>
      </div>
      <div class="text-md dark:text-zinc-300 text-zinc-900 text-center duration-200 dark:hover:bg-zinc-700 hover:bg-zinc-400/60 dark:bg-zinc-800 bg-zinc-400/40 w-full p-2 h-10 rounded cursor-pointer" @click.stop="updateMusicFolders">确定</div>
    </div>
  </div>
</template>
