<script setup>
import {useVirtualList} from '@vueuse/core';
import {onMounted} from 'vue';

const {playList, currentMusic} = defineProps(['playList', 'currentMusic']);
const emit = defineEmits(['clearPlayList', 'removeMusic']);

const {list, containerProps, wrapperProps, scrollTo} = useVirtualList(playList, {
  itemHeight: 56,
  overscan: 1
});

onMounted(() => {
  scrollTo(playList.findIndex((item) => item.path === currentMusic));
});

function clearPlayList() {
  emit('clearPlayList');
}

function removeMusic(path) {
  emit('removeMusic', path);
}
</script>

<template>
  <div
    class="z-[9] shadow-lg dark:shadow-neutral-900 shadow-neutral-300 h-screen w-1/3 absolute top-0 right-0 dark:bg-neutral-900 bg-neutral-300 flex flex-col items-start justify-center **:select-none p-4 pt-13"
  >
    <span class="w-full mx-2 mb-2 flex items-center justify-between">
      <span class="text-zinc-900 dark:text-zinc-200 text-xs">播放列表</span>

      <svg
        class="mr-4 fill-zinc-900 dark:fill-zinc-200 dark:hover:fill-red-600 hover:fill-red-500/80 cursor-pointer"
        height="20"
        viewBox="0 0 1024 1024"
        width="20"
        xmlns="http://www.w3.org/2000/svg"
        @click="clearPlayList"
      >
        <path
          d="M149.333333 278.613333m32 0l661.333334 0q32 0 32 32l0 0q0 32-32 32l-661.333334 0q-32 0-32-32l0 0q0-32 32-32Z"
        ></path>
        <path
          d="M394.444637 493.032804m22.627417-22.627417l0 0q22.627417-22.627417 45.254834 0l165.934391 165.934392q22.627417 22.627417 0 45.254834l0 0q-22.627417 22.627417-45.254834 0l-165.934391-165.934392q-22.627417-22.627417 0-45.254834Z"
        ></path>
        <path
          d="M650.885192 493.031353m-22.627417-22.627417l0 0q-22.627417-22.627417-45.254834 0l-165.934391 165.934391q-22.627417 22.627417 0 45.254834l0 0q22.627417 22.627417 45.254834 0l165.934391-165.934391q22.627417-22.627417 0-45.254834Z"
        ></path>
        <path
          d="M746.666667 384v373.333333a53.333333 53.333333 0 0 1-53.333334 53.333334h-362.666666a53.333333 53.333333 0 0 1-53.333334-53.333334V384a32 32 0 0 0-64 0v384a106.666667 106.666667 0 0 0 106.666667 106.666667h384a106.666667 106.666667 0 0 0 106.666667-106.666667V384a32 32 0 0 0-64 0zM384 316.586667V266.666667a53.333333 53.333333 0 0 1 53.76-53.333334h149.333333A53.333333 53.333333 0 0 1 640 266.666667v49.92h64V256a106.666667 106.666667 0 0 0-106.666667-106.666667h-170.666666a106.666667 106.666667 0 0 0-106.666667 106.666667v60.586667h64z"
        ></path>
      </svg>
    </span>

    <span class="text-zinc-900 dark:text-zinc-400 text-[10px] ml-2 mb-1"
    >共{{ playList.length }}首歌曲</span
    >

    <div class="overflow-x-hidden overflow-y-auto w-full grow" v-bind="containerProps">
      <div class="w-full flex flex-col items-start justify-start" v-bind="wrapperProps">
        <div
          v-for="metadata in list"
          :key="metadata.data.path"
          class="group flex items-center justify-start dark:odd:bg-neutral-950/40 odd:bg-neutral-200/60 dark:hover:bg-zinc-950/60 hover:bg-zinc-400/40 w-full h-14 p-2 rounded duration-200 hover:cursor-pointer"
        >
          <div
            :class="[
              currentMusic === metadata.data.path
                ? '*:dark:text-cyan-600 *:text-cyan-500'
                : '*:text-zinc-900'
            ]"
            class="flex flex-col items-start justify-between h-8 max-w-[90%] *:truncate"
          >
            <span class="text-xs w-full dark:text-zinc-200">{{ metadata.data.title }}</span>
            <span class="text-[10px] w-full font-thin dark:text-zinc-400">{{
                metadata.data.artist ? metadata.data.artist : '未知艺术家'
              }}</span>
          </div>
          <span class="grow"></span>
          <svg
            class="group-hover:inline hidden fill-zinc-900 dark:fill-zinc-200 dark:hover:fill-red-600 hover:fill-red-500/80 cursor-pointer"
            height="12"
            viewBox="0 0 1024 1024"
            width="12"
            xmlns="http://www.w3.org/2000/svg"
            @click="removeMusic(metadata.data.path)"
          >
            <path
              d="M912.526651 867.741144 555.540144 510.712681l356.986507-357.000833c11.171434-11.18576 11.171434-29.257348 0-40.443108-11.20111-11.18576-29.272697-11.18576-40.444131 0L515.096013 470.267527 158.096203 113.267716c-11.187807-11.159154-29.258371-11.159154-40.444131 0-11.186783 11.186783-11.186783 29.286 0 40.47176L474.623229 510.712681 117.623419 867.741144c-11.159154 11.172457-11.159154 29.216415 0 40.443108 11.18576 11.17348 29.284977 11.17348 40.47176 0l357.000833-357.027439 356.985484 357.027439c11.171434 11.17348 29.243021 11.17348 40.444131 0C923.698085 896.957559 923.725714 878.913601 912.526651 867.741144z"
            ></path>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
