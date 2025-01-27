<script setup>
import EventBus from '../assets/EventBus.js';
import {Howl} from 'howler';
import {ref, useTemplateRef, watch} from 'vue';
import placeholder from '../assets/placeholder.jpg';

const rate = ref(1.0)
const volume = ref(1.0)
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
  onplay: () => onplay(),
});

const playMode = ref('order');
const currentLocal = ref('');
const playList = ref([]);
const currentIndex = ref(-1);
const metadata = ref({})
const canListenTime = ref(false);
const playProcess = ref('0%')
const currentTime = ref('00:00')
const currentSec = ref(0)


const sound = new Howl(soundInit.value);
const playPause = useTemplateRef('playPause')

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
    currentIndex.value = currentIndex.value === 0 ? playList.value.length - 1 : currentIndex.value - 1;
    setIndex()
    sound.pause()
    canListenTime.value = false;
    setTimeout(() => {
      playPause.value.checked = true;
      playProcess.value = '0%'
      currentTime.value = '00:00';
      currentSec.value = 0
    }, 200)
  }
});

function onplay() {
  canListenTime.value = true;
  playPause.value.checked = false
}

function onstop() {
  canListenTime.value = false;
}

function onpause() {
  canListenTime.value = false;
}

function onend() {
  canListenTime.value = false;
  setNext()
}

function setIndex() {
  sound.unload();
  soundInit.value.src = [playList.value[currentIndex.value]];

  sound.init(soundInit.value);
  sound.play();
  EventBus.emit('setCurrentMusic', {
    localName: currentLocal.value,
    path: playList.value[currentIndex.value]
  });
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
  setIndex()
}

function swPause(e) {
  if (e.target.checked) {
    sound.pause()
  } else {
    sound.play()
  }
}

function TogglePlay(flag) {
  if (flag === 'next') {
    currentIndex.value = currentIndex.value === playList.value.length - 1 ? 0 : currentIndex.value + 1;
    setIndex()
  }
  if (flag === 'last') {
    currentIndex.value = currentIndex.value === 0 ? playList.value.length - 1 : currentIndex.value - 1;
    setIndex()
  }
}

let count = 0;

setInterval(() => {
  if (!canListenTime.value) {
    return;
  }
  count++;
  if (count === 10) {
    count = 0;
    currentSec.value = sound.seek();
    playProcess.value = currentSec.value / metadata.value.duration * 100 + '%';
    currentTime.value = Math.floor(currentSec.value / 60).toString().padStart(2, '0') + ':' + Math.floor(currentSec.value % 60).toString().padStart(2, '0')
  }

}, 100 / rate.value)

function SwitchLikes(event, args) {
  if (currentLocal.value === 'Locals') {
    EventBus.emit('SwitchLikes', {event, args})
  }
  if (currentLocal.value === 'Likes') {
    EventBus.emit('SwitchLikes_like', {event, args})
  }

}

function updateBackColor(e, duration) {
  currentSec.value = e.target.value
  playProcess.value = currentSec.value / duration * 100 + '%';
  currentTime.value = Math.floor(currentSec.value / 60).toString().padStart(2, '0') + ':' + Math.floor(currentSec.value % 60).toString().padStart(2, '0')

}

function onPlaySkip(e) {
  sound.seek(e.target.value)
}


</script>

<template>
  <div
    class="fixed w-screen h-16 dark:bg-neutral-900 bg-neutral-200 border-t-[0.1px] dark:border-neutral-700 border-gray-400 shadow-xl bottom-0 left-0 flex items-center justify-start px-3 **:select-none"
  >
    <div class="flex items-center justify-stretch w-1/3">
      <img :src="metadata.src?metadata.src:placeholder" alt="" class="size-11 bg-cover rounded-sm"/>
      <div class="flex flex-col items-start justify-between h-10 px-3 **:text-zinc-900 w-[90%]">

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


    <div class="flex h-10 flex-col items-center justify-start px-2 w-1/3">

      <div class="w-full flex items-center justify-center *:text-zinc-900 *:dark:text-zinc-400 *:text-[8px]">
        <span>{{ currentTime }}</span>
        <input id="playProcess"
               :max="metadata.duration"
               :value="currentSec" class="cursor-pointer mx-2 w-full appearance-none outline-0 border-0 dark:bg-neutral-600/40 bg-neutral-300 h-[3px] rounded-sm" min="0"
               type="range" @change="onPlaySkip" @input="updateBackColor($event,metadata.duration)">
        <span>{{ metadata.formatTime }}</span>
      </div>

      <div class="flex items-center justify-center gap-x-4 pt-1">
        <svg
          :class="[currentIndex!==-1 &&metadata.path ? 'pointer-events-auto':'pointer-events-none']"
          class="fill-zinc-900 dark:fill-zinc-200 rotate-180 dark:hover:fill-cyan-600 hover:fill-cyan-500 cursor-pointer"
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
          :class="[currentIndex!==-1&&metadata.path ? 'pointer-events-auto':'pointer-events-none']" class="swap"
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

          <svg class="swap-off fill-zinc-900 dark:fill-zinc-200" height="16"
               viewBox="0 0 1024 1024" width="16" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M325.504 192.512a35.968 35.968 0 0 0-36.010667 35.968v567.04c0 19.882667 16.128 35.968 36.010667 35.968a34.56 34.56 0 0 0 34.986667-35.968V228.48a34.56 34.56 0 0 0-34.986667-35.968z m372.992 0a35.968 35.968 0 0 0-36.010667 35.968v567.04a35.968 35.968 0 1 0 71.978667 0V228.48a35.968 35.968 0 0 0-35.968-35.968z">
            </path>
          </svg>
        </label>

        <svg
          :class="[currentIndex!==-1&&metadata.path ? 'pointer-events-auto':'pointer-events-none']"
          class="fill-zinc-900 dark:fill-zinc-200 dark:hover:fill-cyan-600 hover:fill-cyan-500 cursor-pointer"
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
      </div>

    </div>

    <span class="w-1/3"></span>

  </div>
</template>

<style scoped>
#playProcess {
  background: linear-gradient(to right, #ef4444aa v-bind(playProcess), #00000000 v-bind(playProcess));
}

html.dark {
  #playProcess {
    background: linear-gradient(to right, #06b6d455 v-bind(playProcess), #00000000 v-bind(playProcess));
  }
}

#playProcess::-webkit-slider-thumb {
  appearance: none;
  position: relative;
  width: 6px;
  height: 6px;
  rotate: 45deg;
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
