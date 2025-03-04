<script setup>
import EventBus from '../assets/EventBus.js';
import {Howl} from 'howler';
import {onMounted, ref, useTemplateRef, watch} from 'vue';
import placeholder from '../assets/placeholder.jpg';
import {useCycleList, useStorage} from '@vueuse/core';
import {vOnClickOutside} from '@vueuse/components';
import PlayListBar from './PlayListBar.vue';
import PlayPage from "./PlayPage.vue";

const music_cfg = useStorage('music_cfg', {playMode: 'order', volume: 0.1});
const playMode = ref(music_cfg.value.playMode);
const volume = ref(music_cfg.value.volume);

const volumeProcess = ref(volume.value * 100 + '%');

const playMode_list = ['order', 'random', 'loop'];
const {state, next, go} = useCycleList(playMode_list);

go(playMode_list.indexOf(music_cfg.value.playMode));
window.electron.ipcRenderer.send('setPlayModeBtn', playMode.value);

onMounted(() => {
  const e = document.querySelector('#volume');
  if (!e) {
    return;
  }
  e.onwheel = (e) => {
    if (e.deltaY < 0) {
      volume.value = volume.value + 0.1;
      if (volume.value >= 1) {
        volume.value = 1;
      }
    }
    if (e.deltaY > 0) {
      volume.value = volume.value - 0.1;
      if (volume.value <= 0) {
        volume.value = 0;
      }
    }
    sound.volume(volume.value);
    music_cfg.value.volume = volume.value;
    volumeProcess.value = volume.value * 100 + '%';
  };
});

const rate = ref(1.0);

const soundInit = ref({
  src: [''],
  format: [
    'mp3',
    'mpeg',
    'opus',
    'ogg',
    'oga',
    'wav',
    'aac',
    'caf',
    'm4a',
    'm4b',
    'mp4',
    'weba',
    'webm',
    'dolby',
    'flac'
  ],
  autoplay: false,
  loop: false,
  html5: true,
  volume: volume.value,
  rate: rate.value,
  pool: 1,
  onend: () => onend(),
  onpause: () => onpause(),
  onstop: () => onstop(),
  onplay: () => onplay()
});

const currentLocal = ref('');
const playList = ref([]);
const currentIndex = ref(-1);
const metadata = ref({});
const canListenTime = ref(false);
const playProcess = ref('0%');
const currentTime = ref('');
const currentSec = ref(0);
const currentSecMs = ref(0);

const volume_dropdown = ref(false);
const hasNext = ref(false);
const isShowPlayList = ref(false);
const isShowPlayPage = ref(false);

let sound = new Howl(soundInit.value);
const playPause = useTemplateRef('playPause');
const like_sw = useTemplateRef('like_sw');

watch(currentIndex, () => {
  if (currentIndex.value === -1) {
    return;
  }
  EventBus.emit('getMetadata', {
    path: playList.value[currentIndex.value]?.path,
    currentLocal: currentLocal.value
  });
});

watch(metadata, () => {
  window.electron.ipcRenderer.send('setTrayTitle', metadata.value.path ? metadata.value.title + ' - ' + metadata.value.artist : 'Vega Player');
})

EventBus.on('putMetadata', (metadata_) => {
  metadata.value = metadata_;
});

EventBus.on('play', (args) => {
  if (args.localName !== currentLocal.value) {
    currentLocal.value = args.localName;
    playList.value = args.playList;
  }
  if (playList.value.findIndex((i) => i.path === args.path) === -1) {
    playList.value.push({path: args.path, title: args.title, artist: args.artist});
  }
  currentIndex.value = playList.value.findIndex((i) => i.path === args.path);
  EventBus.emit('getMetadata', {
    path: playList.value[currentIndex.value]?.path,
    currentLocal: currentLocal.value
  });

  setIndex();
});

EventBus.on('delPlayList', (args) => {
  if (args.localName === currentLocal.value && args.path === playList.value[currentIndex.value]?.path) {
    playList.value.splice(currentIndex.value, 1);
    canListenTime.value = false;
    if (playList.value.length === 0) {
      clearPlayList()
      return;
    }
    currentIndex.value = 0;
    EventBus.emit('getMetadata', {
      path: playList.value[currentIndex.value]?.path,
      currentLocal: currentLocal.value
    });
    setIndex();
    return;
  }
  if (args.localName === currentLocal.value) {
    playList.value.splice(playList.value.findIndex(i => i.path === args.path), 1);
  }
  currentIndex.value = playList.value.findIndex((item) => item.path === metadata.value.path);
});

EventBus.on('updatePlayList', ({path, title, artist, localName}) => {
  if (playList.value.findIndex((i) => i.path === path) === -1) {
    if (!currentLocal.value) {
      currentLocal.value = localName;
    }
    if (localName === currentLocal.value) {
      playList.value.push({path: path, title: title, artist: artist});
      currentIndex.value = playList.value.findIndex((item) => item.path === metadata.value.path);
    }
  }
});

EventBus.on('insert2next', ({path, title, artist, localName}) => {
  if (localName === currentLocal.value && currentLocal.value) {
    if (playList.value.findIndex((i) => i.path === path) !== -1) {
      playList.value.splice(
        playList.value.findIndex((i) => i.path === path),
        1
      );
    }

    playList.value.splice(currentIndex.value + 1, 0, {path, title, artist, localName});
    currentIndex.value = playList.value.findIndex((item) => item.path === metadata.value.path);
    hasNext.value = true;
  }
});

EventBus.on('replacePlayList', (args) => {
  if (args.localName === currentLocal.value && currentLocal.value) {
    playList.value = args.playList;
    currentIndex.value = 0;
    setIndex();
  }
});

EventBus.on('syncCache', args => {
  if (playList.value.find(item => item.path === args.path)) {
    playList.value.find(item => item.path === args.path).title = args.title;
    playList.value.find(item => item.path === args.path).artist = args.artist;
  }
})

function onplay() {
  canListenTime.value = true;
  playPause.value.checked = false;
  EventBus.emit('setPauseBtn', false)

  if (!metadata.value.duration) {
    metadata.value.duration = sound.duration();
    metadata.value.formatTime =
      Math.floor(metadata.value.duration / 60)
        .toString()
        .padStart(2, '0') +
      ':' +
      Math.floor(metadata.value.duration % 60)
        .toString()
        .padStart(2, '0');
  }
  sound.volume(volume.value);
}

function onstop() {
  canListenTime.value = false;
  playPause.value.checked = true;
  EventBus.emit('setPauseBtn', true)
}

function onpause() {
  canListenTime.value = false;
  playPause.value.checked = true;
  EventBus.emit('setPauseBtn', true)
}

function onend() {
  canListenTime.value = false;
  setNext();
}

function setIndex() {
  if (!playList.value[currentIndex.value]?.path) {
    return;
  }
  sound.unload();
  sound = null;
  soundInit.value.src = [playList.value[currentIndex.value]?.path];

  sound = new Howl(soundInit.value);
  sound.play();
  EventBus.emit('setCurrentMusic', {
    localName: currentLocal.value,
    path: playList.value[currentIndex.value]?.path
  });
}

function setNext() {
  if (playMode.value === 'order' || hasNext.value) {
    currentIndex.value =
      currentIndex.value === playList.value.length - 1 ? 0 : currentIndex.value + 1;
  }
  if (playMode.value === 'random' && !hasNext.value) {
    currentIndex.value = Math.floor(Math.random() * playList.value.length);
  }
  hasNext.value = false;
  //Mode loop:Implicit
  setIndex();
  EventBus.emit('setLocal');
}

function swPause(e) {
  if (e.target.checked) {
    sound.pause();
  } else {
    sound.play();
  }
}

window.electron.ipcRenderer.on('swPause', () => {
  if (!(currentIndex.value !== -1 && metadata.value.path)) {
    return
  }
  if (sound.playing()) {
    sound.pause()
  } else {
    sound.play();
  }
})

function TogglePlay(flag) {
  if (!playList.value.length > 0) {
    return;
  }

  if (flag === 'next') {
    currentIndex.value =
      currentIndex.value === playList.value.length - 1 ? 0 : currentIndex.value + 1;
  }
  if (flag === 'last') {
    currentIndex.value =
      currentIndex.value === 0 ? playList.value.length - 1 : currentIndex.value - 1;
  }
  if (playMode.value === 'random' && !hasNext.value) {
    currentIndex.value = Math.floor(Math.random() * playList.value.length);
  }
  hasNext.value = false;
  setIndex();
  EventBus.emit('setLocal');
}

window.electron.ipcRenderer.on('TogglePlay', (_, flag) => {
  TogglePlay(flag);
})

let count = 0;
function syncCurrentTime(){
  if (!canListenTime.value) {
    return;
  }
  currentSecMs.value = sound.seek();
  if (count >= 49) {
    count = 0;
    currentSec.value = sound.seek();
    playProcess.value = (currentSec.value / metadata.value.duration) * 100 + '%';
    currentTime.value =
      Math.floor(currentSec.value / 60)
        .toString()
        .padStart(2, '0') +
      ':' +
      Math.floor(currentSec.value % 60)
        .toString()
        .padStart(2, '0');
  }
  count++;
}

function loopTimer(){ //第2个方案
  let timer=setTimeout(()=>{
    syncCurrentTime()
    clearTimeout(timer);
    return loopTimer()
  },20)
}
// loopTimer()

function accurateInterval(callback, interval) {
  let expected = performance.now() + interval;
  const tick = () => {
    const drift = performance.now() - expected; // 计算时间偏差
    expected += interval; // 更新下一次预期时间
    let timer=setTimeout(()=>{
      callback();
      clearTimeout(timer);
      return tick()
    }, Math.max(0, interval - drift))
  };
  setTimeout(tick, interval);
}

accurateInterval(() => {
  syncCurrentTime()
}, 20/rate.value);


function SwitchLikes(event, args) {
  if (currentLocal.value === 'Locals') {
    EventBus.emit('SwitchLikes', {event, args});
  }
  if (currentLocal.value === 'Likes') {
    EventBus.emit('SwitchLikes_like', {event, args});
  }
}

function updateBackColor(e, duration) {
  currentSec.value = e.target.value;
  currentSecMs.value=e.target.value;
  playProcess.value = (currentSec.value / duration) * 100 + '%';
  currentTime.value =
    Math.floor(currentSec.value / 60)
      .toString()
      .padStart(2, '0') +
    ':' +
    Math.floor(currentSec.value % 60)
      .toString()
      .padStart(2, '0');
}

function onPlaySkip(e) {
  sound.seek(e.target.value);
}

function setVolume(e) {
  volume.value = e.target.value / 100;
  sound.volume(volume.value);
  music_cfg.value.volume = volume.value;

  volumeProcess.value = e.target.value + '%';
}

function setVolumeValue(value) {
  volume.value = value / 100;
  sound.volume(volume.value);
  music_cfg.value.volume = volume.value;

  volumeProcess.value = value + '%';
}

function setPlayMode() {
  next();
  music_cfg.value.playMode = state.value;
  playMode.value = state.value;
  window.electron.ipcRenderer.send('setPlayModeBtn', playMode.value);
}

window.electron.ipcRenderer.on('setPlayMode', (_, mode) => {
  go(playMode_list.indexOf(mode));
  music_cfg.value.playMode = mode
  playMode.value = mode;
})

function clearPlayList() {
  playList.value = [];
  currentIndex.value = -1;
  sound.stop();
  metadata.value = {};
  like_sw.value.checked = false;
  isShowPlayList.value = false;

  playProcess.value = '0%';
  currentTime.value = '';
  currentSec.value = 0;
  currentSecMs.value=0

  EventBus.emit('setCurrentMusic', {
    localName: '',
    path: ''
  });
  currentLocal.value = '';
}

function removeMusic(path) {
  playList.value.splice(
    playList.value.findIndex((i) => i.path === path),
    1
  );
  if (playList.value.length < 1) {
    clearPlayList();
    return;
  }

  currentIndex.value = playList.value.findIndex((item) => item.path === metadata.value.path);
  if (metadata.value.path === path) {
    currentIndex.value = -1
    TogglePlay('next')
  }
  EventBus.emit('getMetadata', {
    path: playList.value[currentIndex.value].path,
    currentLocal: currentLocal.value
  });
}

function setPlay(path) {
  currentIndex.value = playList.value.findIndex(i => i.path === path);
  setIndex();
}

function onPlaySkip_Lrc(timestamp){
  sound.seek(timestamp);
}

</script>

<template>
  <div
    class="fixed w-screen h-16 dark:bg-neutral-900 bg-neutral-200 border-t-[0.1px] dark:border-neutral-700 border-gray-400 bottom-0 left-0 flex items-center justify-start px-3 **:select-none z-10"
  >
    <div class="flex items-center justify-start min-w-1/3 max-w-1/3">
      <img
        :src="metadata.src ? metadata.src : placeholder"
        alt=""
        style="-webkit-user-drag: none;"
        class="size-11 object-cover rounded-sm cursor-pointer hover:brightness-60 duration-200"
        @click="() =>{isShowPlayPage=true}"
      />
      <div class="flex flex-col items-start justify-between h-10 mx-3 **:text-zinc-900 max-w-[calc(100%-56px)]">
        <span class="dark:text-zinc-200 text-xs h-4 truncate w-full"
        >{{ metadata.title }}
          <span class="dark:text-zinc-200 text-xs">&nbsp;-&nbsp;</span>
          <span class="dark:text-zinc-400 text-[10px] truncate"
          >{{ metadata.artist ? metadata.artist : '未知艺术家' }}
          </span>
        </span>
        <label class="swap">
          <input
            ref="like_sw"
            :checked="metadata.isLike"
            class="outline-none"
            type="checkbox"
            @change="SwitchLikes($event, { path: metadata.path })"
          />
          <svg
            class="swap-off stroke-zinc-500 dark:stroke-zinc-400"
            height="16"
            viewBox="0 0 24 24"
            width="16"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill="none"
              stroke-width="2"
            />
          </svg>

          <svg
            class="swap-on dark:fill-red-900 fill-red-600"
            height="16"
            viewBox="0 0 24 24"
            width="16"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              stroke-width="2"
            />
          </svg>
        </label>
      </div>
    </div>

    <div class="flex h-10 flex-col items-center justify-start mx-3 w-1/3">
      <div
        class="w-full flex items-center justify-center *:text-zinc-900 *:dark:text-zinc-400 *:text-[8px] h-4"
      >
        <span>{{ currentTime }}</span>
        <input
          id="playProcess"
          :class="[
            currentIndex !== -1 && metadata.path ? 'pointer-events-auto' : 'pointer-events-none'
          ]"
          :max="metadata.duration"
          :value="currentSec"
          class="cursor-pointer mx-2 w-full appearance-none outline-0 border-0 dark:bg-neutral-600/40 bg-neutral-300 h-[3px] rounded-sm"
          min="0"
          type="range"
          @change="onPlaySkip"
          @input="updateBackColor($event, metadata.duration)"
        />
        <span>{{ metadata.formatTime }}</span>
      </div>

      <div class="flex items-center justify-center gap-x-4 mt-1 h-4">
        <div class="w-4">
          <svg
            v-if="playMode === 'random'"
            class="fill-zinc-900 dark:fill-zinc-200 dark:hover:fill-cyan-600 hover:fill-red-500/80 cursor-pointer"
            height="13"
            viewBox="0 0 1024 1024"
            width="13"
            xmlns="http://www.w3.org/2000/svg"
            @click="setPlayMode"
          >
            <path
              d="M844.8 665.6c-6.4-6.4-16-12.8-25.6-9.6-19.2 0-35.2 16-35.2 35.2 0 9.6 6.4 19.2 12.8 25.6l41.6 41.6c-44.8-6.4-86.4-22.4-121.6-51.2-3.2 0-3.2-3.2-6.4-6.4L332.8 304C268.8 233.6 192 195.2 99.2 195.2c-19.2 0-35.2 16-35.2 35.2s16 32 35.2 32c73.6 0 134.4 32 182.4 86.4l384 400 6.4 6.4c48 38.4 108.8 64 172.8 70.4l-48 44.8c-9.6 6.4-16 19.2-16 28.8 0 19.2 19.2 35.2 38.4 32 9.6 0 19.2-6.4 25.6-12.8l99.2-92.8c16-16 16-41.6 0-57.6l-99.2-102.4z m-3.2-556.8c-12.8-16-32-19.2-48-6.4-9.6 6.4-12.8 16-12.8 25.6 0 12.8 3.2 22.4 16 28.8l41.6 41.6c-73.6 9.6-140.8 38.4-192 89.6l-115.2 118.4c-12.8 12.8-12.8 32 0 44.8 6.4 6.4 16 9.6 25.6 9.6s19.2-3.2 25.6-9.6l112-118.4c41.6-38.4 92.8-64 147.2-70.4l-44.8 44.8c-6.4 6.4-12.8 16-12.8 25.6 0 19.2 16 35.2 32 35.2 9.6 0 19.2-3.2 28.8-9.6L950.4 256c12.8-12.8 12.8-35.2 0-48l-108.8-99.2m-438.4 448c-9.6 0-19.2 3.2-25.6 9.6l-118.4 121.6c-48 44.8-96 67.2-160 67.2H96c-19.2 0-35.2 16-35.2 35.2s16 32 35.2 32h3.2c83.2 0 147.2-32 211.2-86.4l121.6-124.8c6.4-6.4 9.6-12.8 9.6-22.4 0-9.6-3.2-16-9.6-22.4-9.6-6.4-19.2-9.6-28.8-9.6z"
            ></path>
          </svg>
          <svg
            v-if="playMode === 'order'"
            class="fill-zinc-900 dark:fill-zinc-200 dark:hover:fill-cyan-600 hover:fill-red-500/80 cursor-pointer"
            height="14"
            viewBox="0 0 1024 1024"
            width="14"
            xmlns="http://www.w3.org/2000/svg"
            @click="setPlayMode"
          >
            <path
              d="M790.08 283.612c15.468-15.644 15.404-41.168-0.164-56.724L643.908 80.88c-15.564-15.556-28.236-10.284-28.164 11.716l0.212 71.344c0.072 22-17.884 40-39.884 40H420c-22 0-56.512 7.168-76.692 15.928l-256.488 247.78c-9.252 19.96 1.176 36.292 23.176 36.292h20c22 0 47.668-16.284 57.044-36.188l156.172-148.096C363.448 311.012 398 303.94 420 303.94h156.372c22 0 40.06 18 40.116 40l0.232 74.868c0.064 22 12.768 27.2 28.248 11.56l145.112-146.756zM906 503.94c-22 0-47.672 16.288-57.048 36.184l-156.172 148.092c-20.236 8.64-54.78 15.72-76.78 15.72h-126.56c-22 0-40.052-18-40.12-40l-0.212-71.344c-0.068-22-12.776-27.204-28.244-11.568l-145.12 146.752c-15.468 15.64-15.396 41.172 0.16 56.732l146.008 146.004c15.556 15.564 28.232 10.284 28.168-11.716l-0.22-74.88c-0.068-22 17.88-40 39.88-40H616c22 0 56.512-7.164 76.692-15.92l256.484-247.772c9.252-19.96-1.176-36.296-23.176-36.296l-20 0.012z"
            ></path>
          </svg>
          <svg
            v-if="playMode === 'loop'"
            class="fill-zinc-900 dark:fill-zinc-200 dark:hover:fill-cyan-600 hover:fill-red-500/80 cursor-pointer"
            height="14"
            viewBox="0 0 1024 1024"
            width="14"
            xmlns="http://www.w3.org/2000/svg"
            @click="setPlayMode"
          >
            <path
              d="M928 476.8c-19.2 0-32 12.8-32 32v86.4c0 108.8-86.4 198.4-198.4 198.4H201.6l41.6-38.4c6.4-6.4 12.8-16 12.8-25.6 0-19.2-16-35.2-35.2-35.2-9.6 0-22.4 3.2-28.8 9.6l-108.8 99.2c-16 12.8-12.8 35.2 0 48l108.8 96c6.4 6.4 19.2 12.8 28.8 12.8 19.2 0 35.2-12.8 38.4-32 0-12.8-6.4-22.4-16-28.8l-48-44.8h499.2c147.2 0 265.6-118.4 265.6-259.2v-86.4c0-19.2-12.8-32-32-32zM96 556.8c19.2 0 32-12.8 32-32v-89.6c0-112 89.6-201.6 198.4-204.8h496l-41.6 38.4c-6.4 6.4-12.8 16-12.8 25.6 0 19.2 16 35.2 35.2 35.2 9.6 0 22.4-3.2 28.8-9.6l105.6-99.2c16-12.8 12.8-35.2 0-48l-108.8-96c-6.4-6.4-19.2-12.8-28.8-12.8-19.2 0-35.2 12.8-38.4 32 0 12.8 6.4 22.4 16 28.8l48 44.8H329.6C182.4 169.6 64 288 64 438.4v86.4c0 19.2 12.8 32 32 32z"
            ></path>
            <path d="M544 672V352h-48L416 409.6l16 41.6 60.8-41.6V672z"></path>
          </svg>
        </div>
        <svg
          :class="[
            currentIndex !== -1 && metadata.path ? 'pointer-events-auto' : 'pointer-events-none'
          ]"
          class="fill-zinc-900 dark:fill-zinc-200 rotate-180 dark:hover:fill-cyan-600 hover:fill-red-500/80 cursor-pointer"
          height="13"
          viewBox="0 0 1024 1024"
          width="13"
          xmlns="http://www.w3.org/2000/svg"
          @click="TogglePlay('last')"
        >
          <path
            d="M192 899.072c-5.632 0-11.264-1.536-15.872-4.096-9.728-5.632-15.872-16.384-15.872-27.648V159.232c0-11.264 6.144-22.016 15.872-27.648 9.728-5.632 22.016-5.632 31.744 0l612.864 353.792c9.728 5.632 15.872 16.384 15.872 27.648s-6.144 22.016-15.872 27.648L207.872 894.464c-4.608 3.072-10.24 4.608-15.872 4.608z"
          ></path>
          <path
            d="M837.12 898.56h-60.416c-15.36 0-27.648-12.288-27.648-27.648V155.136c0-15.36 12.288-27.648 27.648-27.648h60.416c15.36 0 27.648 12.288 27.648 27.648V870.4c0 15.872-12.288 28.16-27.648 28.16z"
          ></path>
        </svg>
        <label
          :class="[
            currentIndex !== -1 && metadata.path ? 'pointer-events-auto' : 'pointer-events-none'
          ]"
          class="swap"
        >
          <input ref="playPause" class="outline-none" type="checkbox" @change="swPause"/>
          <svg
            class="swap-on fill-zinc-900 dark:fill-zinc-200"
            height="16"
            viewBox="0 0 1024 1024"
            width="16"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M852.5 533.9L279 864.7c-11.9 6.9-27.2 2.8-34.1-9.1-2.2-3.8-3.3-8.1-3.3-12.5V181.5c0-13.8 11.2-24.9 24.9-24.9 4.4 0 8.7 1.2 12.5 3.3l573.4 330.8c11.9 6.9 16 22.1 9.1 34.1-2.1 3.8-5.2 6.9-9 9.1z"
            ></path>
          </svg>

          <svg
            class="swap-off fill-zinc-900 dark:fill-zinc-200"
            height="16"
            viewBox="0 0 1024 1024"
            width="16"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M325.504 192.512a35.968 35.968 0 0 0-36.010667 35.968v567.04c0 19.882667 16.128 35.968 36.010667 35.968a34.56 34.56 0 0 0 34.986667-35.968V228.48a34.56 34.56 0 0 0-34.986667-35.968z m372.992 0a35.968 35.968 0 0 0-36.010667 35.968v567.04a35.968 35.968 0 1 0 71.978667 0V228.48a35.968 35.968 0 0 0-35.968-35.968z"
            ></path>
          </svg>
        </label>
        <svg
          :class="[
            currentIndex !== -1 && metadata.path ? 'pointer-events-auto' : 'pointer-events-none'
          ]"
          class="fill-zinc-900 dark:fill-zinc-200 dark:hover:fill-cyan-600 hover:fill-red-500/80 cursor-pointer"
          height="13"
          viewBox="0 0 1024 1024"
          width="13"
          xmlns="http://www.w3.org/2000/svg"
          @click="TogglePlay('next')"
        >
          <path
            d="M192 899.072c-5.632 0-11.264-1.536-15.872-4.096-9.728-5.632-15.872-16.384-15.872-27.648V159.232c0-11.264 6.144-22.016 15.872-27.648 9.728-5.632 22.016-5.632 31.744 0l612.864 353.792c9.728 5.632 15.872 16.384 15.872 27.648s-6.144 22.016-15.872 27.648L207.872 894.464c-4.608 3.072-10.24 4.608-15.872 4.608z"
          ></path>
          <path
            d="M837.12 898.56h-60.416c-15.36 0-27.648-12.288-27.648-27.648V155.136c0-15.36 12.288-27.648 27.648-27.648h60.416c15.36 0 27.648 12.288 27.648 27.648V870.4c0 15.872-12.288 28.16-27.648 28.16z"
          ></path>
        </svg>
        <div class="relative size-4 flex items-center justify-center">
          <svg
            class="fill-zinc-900 dark:fill-zinc-200 dark:hover:fill-cyan-600 hover:fill-red-500/80 cursor-pointer"
            height="13"
            viewBox="0 0 1024 1024"
            width="13"
            xmlns="http://www.w3.org/2000/svg"
            @click.stop="
              () => {
                volume_dropdown = !volume_dropdown;
              }
            "
          >
            <path
              d="M260.256 356.576l204.288-163.968a32 32 0 0 1 52.032 24.96v610.432a32 32 0 0 1-51.968 24.992l-209.92-167.552H96a32 32 0 0 1-32-32v-264.864a32 32 0 0 1 32-32h164.256zM670.784 720.128a32 32 0 0 1-44.832-45.664 214.08 214.08 0 0 0 64.32-153.312 213.92 213.92 0 0 0-55.776-144.448 32 32 0 1 1 47.36-43.04 277.92 277.92 0 0 1 72.416 187.488 278.08 278.08 0 0 1-83.488 198.976zM822.912 858.88a32 32 0 1 1-45.888-44.608A419.008 419.008 0 0 0 896 521.152c0-108.704-41.376-210.848-114.432-288.384a32 32 0 0 1 46.592-43.872c84.16 89.28 131.84 207.04 131.84 332.256 0 127.84-49.76 247.904-137.088 337.728z"
            ></path>
          </svg>

          <div
            v-on-click-outside.bubble="
              () => {
                volume_dropdown = false;
              }
            "
            :class="[volume_dropdown ? 'w-24 opacity-100' : 'w-0 opacity-0']"
            class="absolute left-4 flex items-center justify-start duration-200"
          >
            <input
              id="volume"
              :value="volume * 100"
              class="cursor-pointer mx-2 w-full appearance-none outline-0 border-0 dark:bg-neutral-600/40 bg-neutral-300 h-[3px] rounded-sm"
              max="100"
              min="0"
              type="range"
              @input="setVolume"
            />
            <span class="dark:text-zinc-400 text-zinc-900 w-4 text-[8px]">{{
                Math.floor(volume * 100)
              }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="w-1/3 h-10 flex items-center justify-end gap-x-4 mr-2">
      <svg
        class="fill-zinc-900 dark:fill-zinc-200 dark:hover:fill-cyan-600 hover:fill-red-500/80 cursor-pointer"
        height="24"
        viewBox="0 0 1024 1024"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M793.941 160H230.06C191.36 160 160 191.616 160 230.059v563.84C160 832.64 191.616 864 230.059 864h563.84c38.698 0 70.058-31.616 70.058-70.059V230.06C864 191.36 832.384 160 793.941 160z m5.718 640c0-0.299-575.659-0.341-575.659-0.341 0.299 0 0.341-575.659 0.341-575.659 0 0.299 575.659 0.341 575.659 0.341-0.299 0-0.341 575.659-0.341 575.659z"
        ></path>
        <path
          d="M703.659 681.472l0.341 0.17V349.654c-1.152-18.602-13.952-28.501-38.357-29.653H459.776c-12.8 1.152-19.755 9.301-20.95 24.405 1.153 15.104 8.15 23.254 20.95 24.406h190.123c3.498 0 5.248 1.749 5.248 5.248V656.64l0.469 0.256h-65.792c-6.699 0-17.579 8.704-18.432 22.656 0.853 15.104 10.112 23.253 18.432 24.405h98.944c8.79-1.066 13.739-8.576 14.89-22.485zM477.227 438.613c-11.648-1.152-18.006-9.301-19.2-24.405 1.152-13.952 7.552-21.504 19.2-22.656h143.018c13.952 1.152 21.504 8.704 22.656 22.656-1.152 15.104-8.149 23.253-20.949 24.405H477.227zM334.72 367.104c-6.827-1.152-22.016-9.301-22.699-24.448 0.683-13.952 13.398-21.504 20.267-22.656h56.235c8.234 1.152 20.01 8.704 20.693 22.656-0.64 15.147-13.141 23.296-20.693 24.448H334.72z m67.499 288.512v-204.8c1.152-25.6-8.704-37.803-29.654-36.65H330.71c-12.8 1.194-19.754 9.343-20.949 24.447 1.152 16.299 8.15 25.003 20.95 26.155h17.45c3.499 0 5.248 1.75 5.248 5.248v206.677a9.985 9.985 0 0 0-0.128 1.622c0.128 3.029 0.853 5.76 1.963 8.234 2.901 9.515 7.893 14.464 19.114 17.238 1.878 0.298 3.712-0.086 5.547-1.067h49.152c7.253-1.152 20.779-9.301 21.461-24.405-0.64-13.952-13.525-21.504-21.461-22.656h-26.837z m97.706-21.632c-24.405 0-36.65-11.648-36.65-34.901V497.92c0-23.253 10.453-34.901 31.402-34.901H597.59c24.406 0 36.054 9.898 34.902 29.653v106.41c0 23.254-10.454 34.902-31.403 34.902H499.925z m12.203-50.603c1.152 2.347 2.901 4.054 5.248 5.248h61.056c3.499 0 5.248-1.749 5.248-5.248v-68.01c0-3.499-1.75-5.248-5.248-5.248h-61.099c-3.498 0-5.248 1.749-5.248 5.248v68.01z"
        ></path>
      </svg>

      <svg
        class="fill-zinc-900 dark:fill-zinc-200 dark:hover:fill-cyan-600 hover:fill-red-500/80 cursor-pointer"
        height="24"
        viewBox="0 0 1024 1024"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
        @click.stop="() => {isShowPlayList = !isShowPlayList}"
      >
        <path
          d="M838.99432863 162.40722482l-186.33127437 38.02037807c-13.51137403 2.82796201-23.25213204 14.61113702-23.25213205 28.43672906v412.09690783c0 23.09502305-15.86800901 43.20497508-38.49170507 48.54668107L534.04575904 702.86218588c-34.24976206 8.01255901-61.27251012 37.39194207-61.42961915 72.58435814-0.31421799 48.07535409 44.30473808 83.58198817 90.96611119 72.74146715l29.85071007-6.91279599c48.70379009-11.31184801 83.26777017-53.73127811 85.62440516-103.22061322h0.47132701v-372.34833075c0-10.84052103 7.69834101-20.26706103 18.38175304-22.46658704l150.35331329-30.63625506c10.84052103-2.19952601 18.69597103-11.78317502 18.69597104-22.93791404v-104.47748521c0.15710901-14.76824603-13.35426503-25.76587604-27.96540206-22.78080504zM166.72491631 255.88708001h375.96183773v33.14999904H166.72491631zM166.72491631 387.38731327h375.96183773v33.14999905H166.72491631z"
        ></path>
        <path
          d="M166.72491631 518.88754654h375.96183773V552.03754558H166.72491631zM166.72491631 650.3877798h202.98482839v33.14999904H166.72491631z"
        ></path>
      </svg>
    </div>
  </div>

  <transition mode="out-in" name="list-fade">
    <play-list-bar
      v-if="isShowPlayList"
      v-on-click-outside.bubble="
        () => {
          isShowPlayList = !isShowPlayList;
        }
      "
      :current-music="playList[currentIndex]?.path"
      :play-list="playList"
      @play="path=>setPlay(path)"
      @clear-play-list="clearPlayList"
      @remove-music="(path) => removeMusic(path)"
    ></play-list-bar>
  </transition>

  <transition mode="out-in" name="page-fade">
    <play-page
      v-show="isShowPlayPage"
      :is-show-play-page="isShowPlayPage"
      :current-index="currentIndex"
      :current-sec="currentSec"
      :current-sec-ms="currentSecMs"
      :current-time="currentTime"
      :metadata="metadata"
      :play-mode="playMode"
      :play-process="playProcess"
      :volume="volume"
      :volumeProcess="volumeProcess"
      @set-volume-value="value => setVolumeValue(value)"
      @set-volume="e=>setVolume(e)"
      @sw-pause="e=>swPause(e)"
      @toggle-play="flag=>TogglePlay(flag)"
      @set-play-mode="setPlayMode"
      @on-play-skip="e=> onPlaySkip(e)"
      @update-back-color="args =>updateBackColor(args.event,args.duration)"
      @sw-like="args => SwitchLikes(args.event,args.args)"
      @close-play-page="()=>{isShowPlayPage=false}"
      @on-play-skip_-lrc="timestamp => onPlaySkip_Lrc(timestamp)"
    ></play-page>
  </transition>


</template>

<style scoped>
#volume {
  background: linear-gradient(
    to right,
    #ef4444aa v-bind(volumeProcess),
    #00000000 v-bind(volumeProcess)
  );
}

html.dark {
  #volume {
    background: linear-gradient(
      to right,
      #06b6d455 v-bind(volumeProcess),
      #00000000 v-bind(volumeProcess)
    );
  }
}

#playProcess {
  background: linear-gradient(
    to right,
    #ef4444aa v-bind(playProcess),
    #00000000 v-bind(playProcess)
  );
}

html.dark {
  #playProcess {
    background: linear-gradient(
      to right,
      #06b6d455 v-bind(playProcess),
      #00000000 v-bind(playProcess)
    );
  }
}

#playProcess::-webkit-slider-thumb,
#volume::-webkit-slider-thumb {
  appearance: none;
  position: relative;
  width: 6px;
  height: 6px;
  rotate: 45deg;
}

#playProcess::-webkit-slider-thumb,
#volume::-webkit-slider-thumb {
  background-color: #dc2626;
  box-shadow: 0 0 4px 0 #dc2626;
}

html.dark {
  #playProcess::-webkit-slider-thumb,
  #volume::-webkit-slider-thumb {
    background-color: #0e7490;
    box-shadow: 0 0 8px 0 #0e7490;
  }
}

.list-fade-enter-active {
  transition: all 0.1s ease-out;
}

.list-fade-leave-active {
  transition: all 0.1s cubic-bezier(1, 0.5, 0.8, 1);
}

.list-fade-enter-from,
.list-fade-leave-to {
  transform: translateX(100px);
  opacity: 0;
}


.page-fade-enter-active {
  transition: all 0.1s ease-out;
}

.page-fade-leave-active {
  transition: all 0.1s cubic-bezier(1, 0.5, 0.8, 1);
}

.page-fade-enter-from,
.page-fade-leave-to {
  transform: translateY(100px);
  opacity: 0;
}
</style>
