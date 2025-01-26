<script setup>
import EventBus from '../assets/EventBus.js';
import {Howl} from 'howler';
import {ref, watch} from 'vue';
import placeholder from '../assets/placeholder.jpg';

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
  volume: 0.2,
  rate: 1.0,
  pool: 1,
  onend: () => onend(),
  onpause: () => onpause(),
  onstop: () => onstop(),
  onplay: () => onplay(),
});

const playMode = ref('order');
const currentLocal = ref('');
const playList = ref([]);
const currentIndex = ref(-1);
const metadata = ref({})
const canListenTime = ref(false);

const sound = new Howl(soundInit.value);

watch(currentIndex, () => {
  EventBus.emit('getMetadata', {path: playList.value[currentIndex.value], currentLocal: currentLocal.value});
})

EventBus.on('putMetadata', metadata_ => {
  metadata.value = metadata_
})

EventBus.on('play', args => {
  if (sound.playing()) {
    sound.stop();
  }

  sound.unload();
  if (args.localName !== currentLocal.value) {
    currentLocal.value = args.localName;
    playList.value = args.playList;
    metadata.value = args.metadata
  }
  if (!playList.value.includes(args.path)) {
    playList.value.push(args.path);
  }
  soundInit.value.src = [args.path];
  currentIndex.value = playList.value.indexOf(args.path);

  sound.init(soundInit.value);
  sound.play();
  EventBus.emit('setCurrentMusic', {
    localName: currentLocal.value,
    path: playList.value[currentIndex.value]
  });
});

EventBus.on('delPlayList', args => {
  if (args.localName === currentLocal.value && args.path === playList.value[currentIndex.value]) {
    playList.value.splice(currentIndex.value, 1);
    sound.stop();
    metadata.value = {}
  }
});

function onplay() {
  canListenTime.value = true;
}

function onstop() {
  canListenTime.value = false;
}

function onpause() {
}

function onend() {
  canListenTime.value = false;
  setNext()
}

function setNext() {
  if (playMode.value === 'order') {
    currentIndex.value =
      currentIndex.value === playList.value.length - 1 ? 0 : currentIndex.value + 1;
  }
  if (playMode.value === 'random') {
    currentIndex.value = Math.floor(Math.random() * playList.value.length);
  }

  //Mode loop:Implicit
  sound.unload();
  soundInit.value.src = [playList.value[currentIndex.value]];

  sound.init(soundInit.value);
  sound.play();
  EventBus.emit('setCurrentMusic', {
    localName: currentLocal.value,
    path: playList.value[currentIndex.value]
  });
}

// setInterval(()=>{console.log(sound.seek())},1000)

function SwitchLikes(event, args) {
  if (currentLocal.value === 'Locals') {
    EventBus.emit('SwitchLikes', {event, args})
  }
  if (currentLocal.value === 'Likes') {
    EventBus.emit('SwitchLikes_like', {event, args})
  }

}
</script>

<template>
  <div
    class="fixed w-screen h-16 dark:bg-neutral-900 bg-neutral-200 border-t-[0.1px] dark:border-neutral-700 border-gray-400 shadow-xl bottom-0 left-0 flex items-center justify-start px-3 **:select-none"
  >
    <div class="flex items-center justify-stretch w-1/3">
      <img :src="metadata.src?metadata.src:placeholder" alt="" class="size-11 bg-cover rounded-sm"/>
      <div class="flex flex-col items-start justify-between h-10 px-3 **:text-zinc-900">

        <span class="w-full dark:text-zinc-200 text-xs truncate">{{ metadata.title }}
          <span class="dark:text-zinc-200 text-xs">&nbsp;-&nbsp;</span>
          <span class="dark:text-zinc-400 text-[10px] truncate">{{ metadata.artist }}
          </span>
        </span>
        <label
          class="swap"
          @dblclick.stop
          @click.right.stop
        >
          <input
            ref="theme_sw"
            :checked="metadata.isLike"
            class="outline-none"
            type="checkbox"
            @change="SwitchLikes($event, { path: metadata.path})"
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


    <div class="flex h-10 flex-col items-center justify-between px-2 w-1/3">

      <div class="w-full flex items-center justify-center *:text-zinc-900 *:dark:text-zinc-400 *:text-[10px]">
        <span>1</span>
        <input id="playProcess" class="cursor-pointer mx-2 w-full appearance-none outline-0 border-0 dark:bg-neutral-600/40 bg-neutral-300 h-1 rounded-sm" max="100" min="0" type="range"
               value="20">
        <span>{{ metadata.formatTime }}</span>
      </div>

    </div>

    <span class="w-1/3"></span>

  </div>
</template>

<style scoped>

#playProcess::-webkit-slider-thumb {
  appearance: none;
  position: relative;
  width: 6px;
  height: 6px;
  rotate: 45deg;
}

#playProcess::-webkit-slider-thumb:before {
  content: "";
  position: absolute;
  top: 3px;
  width: 800px;
  height: 6px;
  background: #dc2626;
  pointer-events: none;
}

#playProcess::-webkit-slider-thumb {
  background-color: #dc2626;
  box-shadow: 0 0 4px 0 #dc2626;
}

html.dark {
  #playProcess::-webkit-slider-thumb {
    background-color: #0e7490;
    box-shadow: 0 0 8px 0 #0e7490;
  }
}
</style>
