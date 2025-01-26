<script setup>
import {computed, onActivated, ref, toRaw, watch} from 'vue';
import IndexDB from '../assets/indexDB';
import EventBus from '../assets/EventBus';
import {compareSorts, findInsertPosition} from '../assets/BinarySearchPosition';
import MusicList from './MusicList.vue';
import {useStorage} from '@vueuse/core';
import {vOnClickOutside} from '@vueuse/components';

const db = new IndexDB();
const cache_list = ref([]);
const f_cache_list = ref([]);
const isLoading = ref(false);
const file_dropdown = ref(false);
const loadCount = ref(0);
const delCount = ref(0);
const local_cfg = useStorage('local_cfg', {sort_key: 'title', isReverse: false});
let sort_key = ref(local_cfg.value.sort_key);
let isReverse = ref(local_cfg.value.isReverse);

db.init_DB().then(() => {
  db.searchData('', 0).then((data) => {
    cache_list.value.push(...data);
    cache_list.value.sort((item1, item2) =>
      isReverse.value
        ? compareSorts(item2[sort_key.value], item1[sort_key.value])
        : compareSorts(item1[sort_key.value], item2[sort_key.value])
    );
    search();
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
    search();
  },
  {immediate: true}
);

function SelectFile(flag, cacheList = []) {
  window.electron.ipcRenderer.send('select_files', {flag: flag, cacheList: toRaw(cacheList)});
  file_dropdown.value = false;
}

window.electron.ipcRenderer.on('load_end', () => {
  cache_list.value.sort((item1, item2) =>
    isReverse.value
      ? compareSorts(item2[sort_key.value], item1[sort_key.value])
      : compareSorts(item1[sort_key.value], item2[sort_key.value])
  );
  search();
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
});

window.electron.ipcRenderer.on('add_db', (_, item) => {
  db.addData(item);
  cache_list.value.push(item);
  loadCount.value++;
});

window.electron.ipcRenderer.on('update_cache_file', (_, item) => {
  db.searchData(item.path, 1).then((flag) => {
    if (flag === 0) {
      db.addData(item);
      const position = findInsertPosition(cache_list.value, item[sort_key.value], sort_key.value);
      cache_list.value.splice(position, 0, item);
    }
    search();
  });
});

EventBus.on('set_Like_false', path => {
  cache_list.value[cache_list.value.findIndex((item) => item.path === path)].isLike = false;
});
EventBus.on('delete_Cache', path => {
  cache_list.value.splice(
    cache_list.value.findIndex((item) => item.path === path),
    1
  );
});

EventBus.on('SwitchLikes', ({event, args}) => {
  SwitchLikes(event, args)
})

function SwitchLikes(event, args) {
  const cacheIndex = cache_list.value.findIndex((item) => item.path === args.path);

  console.log('likes: ', toRaw(cache_list.value[cacheIndex]));
  if (event.target.checked) {
    cache_list.value[cacheIndex].isLike = true;
    db.addData(toRaw(cache_list.value[cacheIndex]));
    db.addData(toRaw(cache_list.value[cacheIndex]), 'LikesCache');

    EventBus.emit('add_LikeCache', toRaw(cache_list.value[cacheIndex]));
  } else {
    db.deleteData(args.path, 'LikesCache');
    cache_list.value[cacheIndex].isLike = false;
    db.addData(toRaw(cache_list.value[cacheIndex]));

    EventBus.emit('delete_LikeCache', args.path);
  }
}

onActivated(() => {
  search();
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

function search(search_text = '') {
  const regex = new RegExp(search_text.split('').join(''), 'i');
  f_cache_list.value.length = 0;
  f_cache_list.value.push(
    ...computed(() => {
      return cache_list.value.filter(
        (item) =>
          (item.title && regex.test(item.title)) ||
          (item.artist && regex.test(item.artist)) ||
          (item.album && regex.test(item.album))
      );
    }).value
  );
}

function mulDelete(list) {
  list.forEach((path) => {
    music_delete(path);
  });
}

function addToLike(list) {
  list.forEach((path) => {
    const cacheIndex = cache_list.value.findIndex((item) => item.path === path);
    if (cache_list.value[cacheIndex].isLike) {
      return;
    }
    cache_list.value[cacheIndex].isLike = true;
    db.addData(toRaw(cache_list.value[cacheIndex]));
    db.addData(toRaw(cache_list.value[cacheIndex]), 'LikesCache');

    EventBus.emit('add_LikeCache', toRaw(cache_list.value[cacheIndex]));
  });
}
</script>

<template>
  <div class="relative w-full h-screen left-0 top-0">
    <music-list
      :cache_list="f_cache_list"
      :is-reverse="isReverse"
      :sort_key="sort_key"
      :title="'本地音乐 ' + cache_list.length + ' 首'"
      local-name="Locals"
      @SwitchLikes="(event, args) => SwitchLikes(event, args)"
      @addToLike="(list) => addToLike(list)"
      @mulDelete="(list) => mulDelete(list)"
      @music_delete="(path) => music_delete(path)"
      @search="(search_text) => search(search_text)"
      @select_sort="(key_) => select_sort(key_)"
      @sw_reverse="sw_reverse"
    >
      <template #slot1>
        <div class="">
          <div
            class="h-8 flex items-center justify-center gap-x-2 text-zinc-900 dark:text-zinc-200 text-xs select-none dark:bg-neutral-700 bg-zinc-400/30 hover:bg-neutral-700/30 p-2 px-4 rounded duration-200 outline-none"
            role="button"
            tabindex="0"
            @click="() => (file_dropdown = !file_dropdown)"
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
            v-on-click-outside.blub="() => (file_dropdown = false)"
            :class="[file_dropdown ? 'pointer-events-auto opacity-100':'pointer-events-none opacity-0' ]"
            class="w-36 p-0 z-[5] *:duration-200 duration-200 *:select-none py-2 absolute shadow-xl dark:bg-neutral-900 bg-gray-200 *:text-zinc-900 *:dark:text-zinc-300 rounded *:text-[10px]"
            tabindex="0"
          >
            <li class="dark:hover:bg-neutral-700/40 hover:bg-neutral-400/20 p-2 h-8"
                @click="SelectFile('file')">
              手动添加
            </li>
            <li class="dark:hover:bg-neutral-700/40 hover:bg-neutral-400/20 p-2 h-8"
                @click="SelectFile('folder', cache_list)">
              扫描文件夹
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
  </div>
</template>
