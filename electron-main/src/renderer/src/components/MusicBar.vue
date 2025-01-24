<script setup>
import EventBus from '../assets/EventBus.js';
import {Howl} from 'howler';
import {ref} from 'vue';
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
  volume: 1.0,
  rate: 1.0,
  pool: 1,
  onend: () => onend()
});

const playMode = ref('loop');
const currentLocal = ref('');
const playList = ref([]);
const currentIndex = ref(0);

const sound = new Howl(soundInit.value);

EventBus.on('play', (args) => {
  if (sound.playing()) {
    sound.stop();
  }

  sound.unload();
  if (args.localName !== currentLocal.value) {
    currentLocal.value = args.localName;
    playList.value = args.playList;
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

EventBus.on('delPlayList', (args) => {
  if (args.localName === currentLocal.value && args.path === playList.value[currentIndex.value]) {
    playList.value.splice(currentIndex.value, 1);
    sound.stop();
  }
});

function onend() {
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

function onseek() {
}
</script>

<template>
  <div
    class="fixed w-screen h-16 bg-cyan-400/20 bottom-0 left-0 flex items-center justify-start px-2"
  >
    <img :src="placeholder" alt="" class="size-12 bg-cover rounded-sm"/>

    <div class="flex flex-col items-start justify-stretch h-12 px-2 max-w-[30%]">
      <span class="w-full text-zinc-900 dark:text-zinc-200 text-sm truncate">
        Title<span class="dark:text-zinc-400 text-xs truncate"> - arts</span>
      </span>

      <span> Likes </span>
    </div>
  </div>
</template>
