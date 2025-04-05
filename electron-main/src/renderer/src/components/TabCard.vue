<script setup>
import {ref} from 'vue';
import LocalMusic from './LocalMusic.vue';
import Likes from './Likes.vue';
import Setting from './Setting.vue';

const tabIndex = ref('LocalMusic');
const tabs = {
  LocalMusic,
  Likes,
  Setting
};
</script>

<template>
  <div class="relative left-0 top-0 flex items-center justify-start w-full h-screen">
    <div
      class="relative left-0 top-0 flex flex-col items-stretch justify-center h-screen min-w-36 bg-zinc-300 p-2 dark:bg-zinc-900 gap-y-4"
    >
      <span class="select-none flex items-center justify-center">
        <span>
          <svg
            class="stroke-zinc-900 dark:stroke-zinc-200"
            fill="none"
            height="32"
            stroke-width="1"
            viewBox="0 -12 64 64"
            width="32"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M10 32 L20 10 L25 15 L30 12 L35 20 L40 10 L50 32"/>
            <path d="M54 32 L44 10 L39 15 L34 12 L29 20 L24 10 L14 32"/>
          </svg>
        </span>
        <span class="text-zinc-900 dark:text-zinc-200 text-sm">Vega Player</span>
      </span>
      <span class="grow"></span>
      <span
        :class="[
          tabIndex === 'LocalMusic'
            ? 'dark:text-zinc-200 text-zinc-900 dark:bg-zinc-800 bg-zinc-400/40'
            : 'text-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800/40 hover:bg-zinc-400/20'
        ]"
        class="cursor-pointer select-none py-2 h-10 rounded flex items-center justify-center duration-200"
        @click="() => (tabIndex = 'LocalMusic')"
      >
        <svg
          class="stroke-zinc-900 dark:stroke-zinc-200"
          height="24"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line stroke-width="1" x1="5" x2="19" y1="20" y2="20"/>
          <path d="M12 4v12m0 0l-4-4m4 4l4-4" fill="none" stroke-width="1"/>
        </svg>
        <span class="ml-2 text-sm">本地</span>
      </span>
      <span
        :class="[
          tabIndex === 'Likes'
            ? 'dark:text-zinc-200 text-zinc-900 dark:bg-zinc-800 bg-zinc-400/40'
            : 'text-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800/40 hover:bg-zinc-400/20'
        ]"
        class="cursor-pointer select-none py-2 h-10 rounded flex items-center justify-center duration-200"
        @click="() => (tabIndex = 'Likes')"
      >
        <svg
          class="fill-zinc-900 dark:fill-zinc-200"
          height="20"
          viewBox="0 0 1024 1024"
          width="20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M523.733333 841.024l33.173334-32.576 99.690666-97.813333c70.976-69.632 120.32-117.973333 138.709334-135.893334 59.008-57.514667 93.248-121.28 99.626666-184.234666 6.250667-61.44-15.488-119.744-61.589333-164.672-44.992-43.84-98.88-61.909333-157.034667-52.906667-49.365333 7.616-101.034667 34.624-150.016 78.848a21.333333 21.333333 0 0 1-28.586666 0c-48.981333-44.224-100.650667-71.232-150.016-78.869333-58.154667-8.96-112.042667 9.088-157.034667 52.928-46.101333 44.928-67.84 103.210667-61.610667 164.693333 6.4 62.933333 40.64 126.72 99.648 184.213333a100207.573333 100207.573333 0 0 1 145.92 142.826667l24.256 23.765333L512 852.522667l11.733333-11.498667z m-11.733333 11.52l-1.493333 1.429333A2.133333 2.133333 0 0 1 512 853.333333c0.512 0 1.045333 0.213333 1.493333 0.64l-1.493333-1.450666z m157.781333-721.792c71.637333-11.093333 138.901333 11.477333 193.344 64.533333 55.317333 53.930667 81.834667 124.992 74.282667 199.530667-7.466667 73.642667-46.549333 146.368-112.32 210.474667-18.346667 17.898667-67.669333 66.218667-138.453333 135.637333-31.829333 31.232-65.706667 64.448-99.84 97.984L553.6 871.466667l-13.184 12.949333a40.554667 40.554667 0 0 1-56.832 0l-114.602667-112.64-24.213333-23.722667a677626.346667 677626.346667 0 0 0-145.856-142.762666C133.141333 541.184 94.08 468.48 86.613333 394.816c-7.552-74.538667 18.944-145.6 74.282667-199.530667 54.442667-53.056 121.706667-75.605333 193.344-64.533333 53.162667 8.213333 107.093333 34.688 157.781333 76.949333 50.709333-42.24 104.618667-68.736 157.781334-76.949333z"
          ></path>
        </svg>
        <span class="ml-2 text-sm">收藏</span>
      </span>
      <span
        :class="[
          tabIndex === 'Setting'
            ? 'dark:text-zinc-200 text-zinc-900 dark:bg-zinc-800 bg-zinc-400/40'
            : 'text-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800/40 hover:bg-zinc-400/20'
        ]"
        class="cursor-pointer select-none py-2 h-10 rounded flex items-center justify-center duration-200"
        @click="() => (tabIndex = 'Setting')"
      >
        <svg
          class="fill-zinc-900 dark:fill-zinc-200"
          height="20"
          viewBox="0 0 1024 1024"
          width="20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M944.48 552.458667l-182.357333 330.666666a73.792 73.792 0 0 1-64.565334 38.325334h-362.133333a73.792 73.792 0 0 1-64.565333-38.325334l-182.357334-330.666666a75.338667 75.338667 0 0 1 0-72.682667l182.357334-330.666667a73.792 73.792 0 0 1 64.565333-38.325333h362.133333a73.792 73.792 0 0 1 64.565334 38.325333l182.357333 330.666667a75.338667 75.338667 0 0 1 0 72.682667z m-55.989333-31.146667a10.773333 10.773333 0 0 0 0-10.378667l-182.037334-330.666666a10.517333 10.517333 0 0 0-9.205333-5.482667H335.733333a10.517333 10.517333 0 0 0-9.205333 5.482667l-182.037333 330.666666a10.773333 10.773333 0 0 0 0 10.378667l182.037333 330.666667a10.517333 10.517333 0 0 0 9.205333 5.472h361.514667a10.517333 10.517333 0 0 0 9.205333-5.472l182.037334-330.666667zM513.738667 682.666667c-94.261333 0-170.666667-76.405333-170.666667-170.666667s76.405333-170.666667 170.666667-170.666667c94.250667 0 170.666667 76.405333 170.666666 170.666667s-76.416 170.666667-170.666666 170.666667z m0-64c58.912 0 106.666667-47.754667 106.666666-106.666667s-47.754667-106.666667-106.666666-106.666667-106.666667 47.754667-106.666667 106.666667 47.754667 106.666667 106.666667 106.666667z"
          ></path>
        </svg>
        <span class="ml-2 text-sm">设置</span>
      </span>
      <span class="grow"></span>
    </div>
    <div class="bg-transparent h-screen w-full">
      <transition mode="out-in" name="slide-fade">
        <keep-alive>
          <component :is="tabs[tabIndex]"></component>
        </keep-alive>
      </transition>
    </div>
  </div>
</template>
<style scoped>
.slide-fade-enter-active {
  transition: all 0.1s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.1s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>
