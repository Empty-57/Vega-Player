<script setup>
import placeholder from '../assets/placeholder.jpg';
import {onMounted, ref, useTemplateRef, watch,nextTick,toRaw,computed} from "vue";
import ColorThief from "../assets/color-thief.mjs";
import EventBus from "../assets/EventBus.js";
import {vOnClickOutside} from '@vueuse/components';
import {useDebounceFn,watchDebounced,useStorage} from "@vueuse/core";

import {getLrcBySearch, saveCoverByText} from '../../../Api/apis.js'

const lrc_cfg = useStorage('lrc_cfg', {
  showTranslate: true,
  lrcSpacing:0,
  lrcWeight:700,
  lrcGlow:false,
  autoDownloadLrc:true,
  api:0
});

let showTranslate=lrc_cfg.value.showTranslate
const lrcWeight=ref(lrc_cfg.value.lrcWeight)
const letterSpacing=ref(lrc_cfg.value.lrcSpacing/10+'rem')
let useGlow = lrc_cfg.value.lrcGlow

let autoDownloadLrc_=lrc_cfg.value.autoDownloadLrc

watch(lrc_cfg,()=>{
  showTranslate=lrc_cfg.value.showTranslate
  letterSpacing.value=lrc_cfg.value.lrcSpacing/10+'rem'
  lrcWeight.value=lrc_cfg.value.lrcWeight
  useGlow = lrc_cfg.value.lrcGlow
  autoDownloadLrc_=lrc_cfg.value.autoDownloadLrc
})



const colorThief = new ColorThief();
const isMaximized = ref(false);
const playPause2 = useTemplateRef('playPause2')

const emit = defineEmits(['closePlayPage', 'onPlaySkip', 'updateBackColor', 'swLike', 'setPlayMode', 'TogglePlay', 'swPause', 'setVolume', 'setVolumeValue','onPlaySkip_Lrc'])
const {
  metadata,
  currentTime,
  currentIndex,
  currentSec,
  currentSecMs,
  playProcess,
  playMode, volume, volumeProcess,isShowPlayPage
} = defineProps(['metadata', 'currentTime', 'currentIndex', 'currentSec', 'playProcess', 'playMode', 'volume', 'volumeProcess','currentSecMs','isShowPlayPage'])

const src = ref('')
const isLoaded = ref(false)
const parsedLyrics = ref([])
const lrcType=ref('')

const lrcCurrentIndex=ref(0)

const useEffects = ref(false)

const isScroll=ref(false);

const showPlayAction =ref(false);

const showLrcModal=ref(false);

const musicLrcData=ref([])

const searchLrcOffset=ref(0)

const effectLrcProcess=ref(0)

const apiSource=ref(0)

const lrcSearchText=ref('')

const showApiList=ref(false)

let coverImg = null;
let colors = ref(['#A0A0A0', '#F0F0F0', '#F0F0F0']);
let lyricsList=[]

function decodeHTMLEntities(text) {
  const textarea = document.createElement('div');
  textarea.innerHTML = text;
  return textarea.textContent || textarea.innerText || '';
}

const reLocal=()=>{
  if (isScroll.value){
    return;
  }
  lyricsList[lrcCurrentIndex.value]?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

async function syncLrc(data) {
  parsedLyrics.value = data?.parsedLrc || []
  lrcType.value = data?.type || ''

  parsedLyrics.value=parsedLyrics.value.map(item =>{
    return {
      ...item,
      lyricText:decodeHTMLEntities(item.lyricText),
    }
  })

  console.log(parsedLyrics.value,lrcType.value)
  await nextTick()
  lyricsList = document.querySelectorAll('.lyrics > div');
}

watch(() => metadata.path, async () => {
  lrcCurrentIndex.value=0
  src.value = await getCover();

  const data = await window.electron.ipcRenderer.invoke('getLyrics', metadata.path)
  await syncLrc(data)
  reLocal()

}, {immediate: true})

watch(()=> isShowPlayPage,async () => {
  if (isShowPlayPage && parsedLyrics.value.length > 0) {
    await nextTick()
    reLocal()
  }
})

let accumulated = 0

const wordIndex=ref(0)
const wordInfo=computed(()=>parsedLyrics.value[lrcCurrentIndex.value]?.words[wordIndex.value])
let wordStart=0
let wordDuration=0.01
let correction=0

const interludeProcess=ref(0)

const lyricComputed = computed(() => {
  const currentLyric = parsedLyrics.value[lrcCurrentIndex.value]
  if (!currentLyric) return { interval: 1, wordsLen: undefined, wordNext: Infinity }

  const { nextTime, words = [] } = currentLyric
  const lastWord = words[words.length - 1] || {}
  return {
    interval: nextTime - (lastWord.start + lastWord.duration),
    wordsLen: words.length,
    wordNext: words[wordIndex.value + 1]?.start || Infinity
  }
})
const lrcInterval = computed(() => lyricComputed.value.interval)
const wordsLen = computed(() => lyricComputed.value.wordsLen)
const wordNext = computed(() => lyricComputed.value.wordNext)

const lrcBlur=computed(()=>index=>{
  const shouldBlur = !(lrcCurrentIndex.value === index || isScroll.value)
  const blurValue = shouldBlur
    ? `blur(${Math.min(Math.abs(index - lrcCurrentIndex.value)*1.5, 6)}px)`
    : 'none'

  return { filter: blurValue }
})

const readDeps = () => [
  lrcCurrentIndex.value,
  wordIndex.value,
  wordsLen.value,
  lrcInterval.value,
  effectLrcProcess.value,
  interludeProcess.value
];

const lrcEffect1 = computed(() => {
  const [current, wordIdx, wordsLen_, interval, process] = readDeps();

  const threshold = interval >= 4 ? 90 : 150;
  const isNotLast = wordIdx !== wordsLen_ - 1;
  const isThresholdValid = process < threshold;

  return (index) => current === index && (isNotLast || isThresholdValid)
});


const lrcEffect2 = computed(() => {
  const [_, wordIdx, len, interval, process] = readDeps();

  const isLast = wordIdx === len-1;
  const threshold = interval >= 4 ? 90 : 150;

  return isLast && process >= threshold;
});


const showInterlude = computed(() => {
  const [current, wordIdx, len, interval, process, interlude] = readDeps();
  const isLast = wordIdx === len-1;
  return (index) => (current === index) && isLast&&interval >= 4&&process>=100&&interlude<=95&&lrcCurrentIndex.value<parsedLyrics.value.length-1;
});

watch(wordIndex,() => {
  wordStart=wordInfo.value?.start||null
  wordDuration=wordInfo.value?.duration||null

  if (wordDuration&&wordStart){
    if (currentSecMs-wordStart>=0.02){
      correction= 2/(wordDuration-currentSecMs+wordStart)
    }else{
      correction= 2/wordDuration
    }
  }else {
    correction =0
  }
})


function findCurrentLine(time,hint) {

  const lyrics = parsedLyrics.value;
  const n = lyrics.length;

  // 检查提示位置附近
  if (hint > 0 && hint < n) {
    if (time >= lyrics[hint].segmentStart &&
      time < lyrics[hint].nextTime) {
      return hint;
    }
    if (hint + 1 < n &&
      time >= lyrics[hint+1].segmentStart &&
      time < lyrics[hint+1].nextTime) {
      return hint + 1;
    }
  }

  let low = 0
  let high = parsedLyrics.value.length - 1

  while (low <= high) {
    const mid = (low + high) >> 1; // 位运算优化
    const current = parsedLyrics.value[mid]

    if (time >= current.segmentStart && time < current.nextTime) {
      return mid
    } else if (time < current.segmentStart) {
      high = mid - 1
    } else {
      low = mid + 1
    }
  }
  return -1
}

watch(()=> currentSecMs,()=>{
  const newIndex = findCurrentLine(currentSecMs,lrcCurrentIndex.value)
  if (newIndex !== lrcCurrentIndex.value ||currentSecMs<wordStart) {

    accumulated = 0
    if (lrcType.value!=='.lrc'){
      wordIndex.value=-1
    }
    lrcCurrentIndex.value=newIndex

    if (!isScroll.value){
      reLocal()
    }
  }

  if (lrcType.value==='.lrc' || lrcCurrentIndex.value===-1){return}

  if (
    (currentSecMs >= wordStart+wordDuration)
    &&(currentSecMs>=wordNext.value)
    &&(wordIndex.value+1<wordsLen.value)
  ) {
    interludeProcess.value=0
    accumulated=0
    wordIndex.value++
  }

  accumulated+=correction
  effectLrcProcess.value = accumulated

  if (effectLrcProcess.value>=100&&wordIndex.value===wordsLen.value-1){
    interludeProcess.value+= 2/lrcInterval.value
  }
})

EventBus.on('setPauseBtn', flag => {
  if (playPause2.value){
    playPause2.value.checked = flag
  }
})


async function getCover() {
  if (!metadata.path) {
    return;
  }
  isLoaded.value = false
  let src_ = await window.electron.ipcRenderer.invoke('getCovers', {path: metadata.path, flag: 2});

  const title = metadata.title;
  const artist = metadata.artist ? ' - ' + metadata.artist : '';
  if (!src) {
    await saveCoverByText(title+artist,metadata.path,lrc_cfg.value.api);
  }

  isLoaded.value = true
  return src_;
}

function getPalette() {
  if (!coverImg) {
    return;
  }
  if (coverImg?.complete) {
    const color = colorThief.getPalette(coverImg, 3);
    colors.value = color.map(item => {
      return `#${item[0].toString(16).padStart(2, '0')}${item[1].toString(16).padStart(2, '0')}${item[2].toString(16).padStart(2, '0')}`
    })
  } else {
    coverImg.addEventListener('load', function () {
      const color = colorThief.getPalette(coverImg, 3);
      colors.value = color.map(item => {
        return `#${item[0].toString(16).padStart(2, '0')}${item[1].toString(16).padStart(2, '0')}${item[2].toString(16).padStart(2, '0')}`
      })
    });
  }
}

let timer=null;

onMounted(async () => {
  coverImg = document.getElementById("coverImg")

  coverImg.addEventListener('load', () => {
    getPalette()
  })

  const lrc_box=document.querySelector('#LrcBox');

  lrc_box.onmousewheel = useDebounceFn(() => {
    isScroll.value=true
    clearTimeout(timer)
    timer = null
    timer= setTimeout(()=> {
      isScroll.value = false
      reLocal()
      clearTimeout(timer)
      timer = null
    },3000)
  },100)

})

function closePlayPage() {
  emit('closePlayPage');
}

async function windowAction(action) {
  isMaximized.value = await window.electron.ipcRenderer.invoke('windowAction', action);
  EventBus.emit('setWindowBtn', isMaximized.value)
}

EventBus.on('setWindowBtn2', state => {
  isMaximized.value = state
})

window.electron.ipcRenderer.on('resize', (_, args) => {
  isMaximized.value = args;
});

function SwitchLikes(event, args) {
  emit('swLike', {event, args});
}

function onPlaySkip(e) {
  emit('onPlaySkip', e)
}

function onPlaySkip_Lrc(timestamp){
  emit('onPlaySkip_Lrc',timestamp)
}
function updateBackColor(e, duration) {
  emit('updateBackColor', {event: e, duration: duration});
}

function setPlayMode() {
  emit('setPlayMode')
}

function TogglePlay(flag) {
  emit('TogglePlay', flag)
}

function swPause(e) {
  emit('swPause', e)
}

function setVolume(e) {
  emit('setVolume', e);
}

function setVolumeValue(value) {
  emit('setVolumeValue', value)
}

watchDebounced(lrcSearchText,async()=>{
  searchLrcOffset.value=0
  await selectLrc();
},{debounce:500})

async function selectLrc() {
  musicLrcData.value=[]
  try {
    musicLrcData.value=await getLrcBySearch(lrcSearchText.value,searchLrcOffset.value,5,apiSource.value)
    console.log(musicLrcData.value)
  }catch (err){
    console.error(err)
  }
}
async function switchLrc(lrcData) {
  const data = await window.electron.ipcRenderer.invoke('switchLrc', toRaw(lrcData))

  await syncLrc(data)

  showLrcModal.value=false

  if (autoDownloadLrc_){
    await window.electron.ipcRenderer.send('downloadLrc', toRaw({...lrcData, path:metadata.path}))
  }
}

async function openPath() {
  showPlayAction.value=false
  await window.electron.ipcRenderer.send('openPath', metadata.path)
}

async function selectApi(index){
  apiSource.value=index
  showApiList.value = false
  await selectLrc();
}

</script>

<template>
  <div class="z-25 fixed w-full h-screen left-0 top-0">
    <div
      id="diy_bar"
      class="*:cursor-pointer fixed z-24 w-screen h-11 bg-transparent top-0 left-0 flex items-center justify-center *:duration-200"
    >
      <span class="no_drag p-3" @click="closePlayPage">
        <svg class="fill-zinc-200 hover:fill-cyan-600" height="16"
             viewBox="0 0 1024 1024" width="16" xmlns="http://www.w3.org/2000/svg"><path
          d="M185.884 327.55 146.3 367.133 512.021 732.779 877.7 367.133 838.117 327.55 511.997 653.676Z">

        </path></svg>
      </span>
      <span class="grow"></span>
      <span
        class="no_drag p-3"
        @click="windowAction('minimize')"
      >
      <svg
        class="fill-zinc-200 hover:stroke-cyan-600"
        height="16"
        viewBox="0 0 24 24"
        width="16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect height="1" rx="2" ry="2" width="16" x="4" y="12"/>
      </svg>
    </span>
      <span
        class="no_drag p-3"
        @click="windowAction('maximize')"
      >
      <svg
        v-if="!isMaximized"
        class="stroke-zinc-200 hover:stroke-cyan-600"
        height="16"
        viewBox="0 0 24 24"
        width="16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect fill="none" height="16" rx="2" ry="2" stroke-width="1" width="16" x="4" y="4"/>
      </svg>
      <svg
        v-if="isMaximized"
        class="fill-zinc-200 hover:fill-cyan-600"
        height="16"
        viewBox="0 0 1024 1024"
        width="16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M812.2 65H351.6c-78.3 0-142.5 61.1-147.7 138.1-77 5.1-138.1 69.4-138.1 147.7v460.6c0 81.6 66.4 148 148 148h460.6c78.3 0 142.5-61.1 147.7-138.1 77-5.1 138.1-69.4 138.1-147.7V213c0-81.6-66.4-148-148-148z m-45.8 746.3c0 50.7-41.3 92-92 92H213.8c-50.7 0-92-41.3-92-92V350.7c0-50.7 41.3-92 92-92h460.6c50.7 0 92 41.3 92 92v460.6z m137.8-137.7c0 47.3-35.8 86.3-81.8 91.4V350.7c0-81.6-66.4-148-148-148H260.2c5.1-45.9 44.2-81.8 91.4-81.8h460.6c50.7 0 92 41.3 92 92v460.7z"
        ></path>
      </svg>
    </span>
      <span
        class="no_drag p-3 rounded-tr"
        @click="windowAction('close')"
      >
      <svg
        class="stroke-zinc-200 hover:stroke-cyan-600"
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
    </span>
    </div>
    <div class="absolute w-full h-screen left-0 top-0 z-23 flex items-center justify-center **:select-none">
      <div class="flex relative left-0 top-0 flex-col items-center justify-center w-3/7 h-screen py-4">
        <img :class="[isLoaded? 'opacity-100':'opacity-0']"
             id="coverImg"
             :src="src? src:placeholder"
             style="-webkit-user-drag: none;"
             alt="" class="rounded w-3/5 aspect-square duration-200 object-cover">

        <div class="relative w-3/5 flex items-center justify-start h-16 mt-8 group">
          <span class="group-hover:opacity-100 opacity-0 duration-200 text-[12px] text-zinc-50/70 absolute w-full max-h-10 bottom-14 text-clip">{{ metadata.title }}{{metadata.artist ? ' - '+metadata.artist : ' - 未知歌手'}}</span>
          <span class="grow flex flex-col items-start justify-center truncate" id="musicInfo">
  <span class="text-zinc-50/80 text-xl truncate">{{ metadata.title }}</span>
  <span class="text-zinc-50/70 text-[14px] truncate font-light">{{
      metadata.artist ? metadata.artist : '未知歌手'
    }}</span>
</span>

<span class="grow min-w-[10%] flex items-start justify-end">
  <label class="swap">
          <input
            ref="like_sw"
            :checked="metadata.isLike"
            class="outline-none"
            type="checkbox"
            @change="SwitchLikes($event, { path: metadata.path })"
          />
          <svg
            class="swap-off stroke-zinc-50/80"
            height="18"
            viewBox="0 0 24 24"
            width="18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill="none"
              stroke-width="2"
            />
          </svg>
          <svg
            class="swap-on fill-red-700"
            height="18"
            viewBox="0 0 24 24"
            width="18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              stroke-width="2"
            />
          </svg>
        </label>
</span>
      </div>

        <div class="w-3/5 flex flex-col items-center justify-center h-4 mt-4">
          <input
            :style="{'--playProcess':playProcess}"
            id="playProcess2"
            :class="[
            currentIndex !== -1 && metadata.path ? 'pointer-events-auto' : 'pointer-events-none'
          ]"
            :max="metadata.duration"
            :value="currentSec"
            class="cursor-pointer w-full appearance-none outline-0 border-0 bg-zinc-300/40 rounded-sm"
            min="0"
            type="range"
            @change="onPlaySkip"
            @input="updateBackColor($event, metadata.duration)"
          />
          <span class="flex items-center w-full justify-between *:text-[8px] *:text-zinc-200/60 mt-1">
          <span>{{ currentTime }}</span>
        <span>{{ metadata.formatTime }}</span>
        </span>

        </div>
        <div class="w-3/5 relative flex items-center justify-between mt-4 h-4 *:duration-200">
          <div class="*:duration-200 w-4">
            <svg
              v-if="playMode === 'random'"
              class="fill-zinc-50/60 hover:fill-zinc-50 cursor-pointer"
              height="15"
              viewBox="0 0 1024 1024"
              width="15"
              xmlns="http://www.w3.org/2000/svg"
              @click="setPlayMode"
            >
              <path
                d="M844.8 665.6c-6.4-6.4-16-12.8-25.6-9.6-19.2 0-35.2 16-35.2 35.2 0 9.6 6.4 19.2 12.8 25.6l41.6 41.6c-44.8-6.4-86.4-22.4-121.6-51.2-3.2 0-3.2-3.2-6.4-6.4L332.8 304C268.8 233.6 192 195.2 99.2 195.2c-19.2 0-35.2 16-35.2 35.2s16 32 35.2 32c73.6 0 134.4 32 182.4 86.4l384 400 6.4 6.4c48 38.4 108.8 64 172.8 70.4l-48 44.8c-9.6 6.4-16 19.2-16 28.8 0 19.2 19.2 35.2 38.4 32 9.6 0 19.2-6.4 25.6-12.8l99.2-92.8c16-16 16-41.6 0-57.6l-99.2-102.4z m-3.2-556.8c-12.8-16-32-19.2-48-6.4-9.6 6.4-12.8 16-12.8 25.6 0 12.8 3.2 22.4 16 28.8l41.6 41.6c-73.6 9.6-140.8 38.4-192 89.6l-115.2 118.4c-12.8 12.8-12.8 32 0 44.8 6.4 6.4 16 9.6 25.6 9.6s19.2-3.2 25.6-9.6l112-118.4c41.6-38.4 92.8-64 147.2-70.4l-44.8 44.8c-6.4 6.4-12.8 16-12.8 25.6 0 19.2 16 35.2 32 35.2 9.6 0 19.2-3.2 28.8-9.6L950.4 256c12.8-12.8 12.8-35.2 0-48l-108.8-99.2m-438.4 448c-9.6 0-19.2 3.2-25.6 9.6l-118.4 121.6c-48 44.8-96 67.2-160 67.2H96c-19.2 0-35.2 16-35.2 35.2s16 32 35.2 32h3.2c83.2 0 147.2-32 211.2-86.4l121.6-124.8c6.4-6.4 9.6-12.8 9.6-22.4 0-9.6-3.2-16-9.6-22.4-9.6-6.4-19.2-9.6-28.8-9.6z"
              ></path>
            </svg>
            <svg
              v-if="playMode === 'order'"
              class="fill-zinc-50/60 hover:fill-zinc-50 cursor-pointer"
              height="16"
              viewBox="0 0 1024 1024"
              width="16"
              xmlns="http://www.w3.org/2000/svg"
              @click="setPlayMode"
            >
              <path
                d="M790.08 283.612c15.468-15.644 15.404-41.168-0.164-56.724L643.908 80.88c-15.564-15.556-28.236-10.284-28.164 11.716l0.212 71.344c0.072 22-17.884 40-39.884 40H420c-22 0-56.512 7.168-76.692 15.928l-256.488 247.78c-9.252 19.96 1.176 36.292 23.176 36.292h20c22 0 47.668-16.284 57.044-36.188l156.172-148.096C363.448 311.012 398 303.94 420 303.94h156.372c22 0 40.06 18 40.116 40l0.232 74.868c0.064 22 12.768 27.2 28.248 11.56l145.112-146.756zM906 503.94c-22 0-47.672 16.288-57.048 36.184l-156.172 148.092c-20.236 8.64-54.78 15.72-76.78 15.72h-126.56c-22 0-40.052-18-40.12-40l-0.212-71.344c-0.068-22-12.776-27.204-28.244-11.568l-145.12 146.752c-15.468 15.64-15.396 41.172 0.16 56.732l146.008 146.004c15.556 15.564 28.232 10.284 28.168-11.716l-0.22-74.88c-0.068-22 17.88-40 39.88-40H616c22 0 56.512-7.164 76.692-15.92l256.484-247.772c9.252-19.96-1.176-36.296-23.176-36.296l-20 0.012z"
              ></path>
            </svg>
            <svg
              v-if="playMode === 'loop'"
              class="fill-zinc-50/60 hover:fill-zinc-50 cursor-pointer"
              height="16"
              viewBox="0 0 1024 1024"
              width="16"
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
            class="fill-zinc-50/60 hover:fill-zinc-50 rotate-180 cursor-pointer"
            height="15"
            viewBox="0 0 1024 1024"
            width="15"
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
            <input ref="playPause2" class="outline-none" type="checkbox" @change="swPause"/>
            <svg
              class="swap-on fill-zinc-50/80"
              height="18"
              viewBox="0 0 1024 1024"
              width="18"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M852.5 533.9L279 864.7c-11.9 6.9-27.2 2.8-34.1-9.1-2.2-3.8-3.3-8.1-3.3-12.5V181.5c0-13.8 11.2-24.9 24.9-24.9 4.4 0 8.7 1.2 12.5 3.3l573.4 330.8c11.9 6.9 16 22.1 9.1 34.1-2.1 3.8-5.2 6.9-9 9.1z"
              ></path>
            </svg>

            <svg
              class="swap-off fill-zinc-50/80"
              height="18"
              viewBox="0 0 1024 1024"
              width="18"
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
            class="fill-zinc-50/60 hover:fill-zinc-50 cursor-pointer"
            height="15"
            viewBox="0 0 1024 1024"
            width="15"
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
          <svg class="fill-zinc-50/60 hover:fill-zinc-50 cursor-pointer" height="18"
               @click.stop="
              () => {
                showPlayAction = !showPlayAction;
              }
            "
               viewBox="0 0 1024 1024" width="18" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M150.528 431.104q37.888 0 58.368 24.064t20.48 51.712l0 11.264q0 34.816-17.92 58.88t-59.904 24.064l-7.168 0q-38.912 0-61.952-21.504t-23.04-59.392l0-14.336q0-13.312 5.632-26.624t15.872-24.064 25.6-17.408 33.792-6.656l10.24 0zM519.168 431.104q37.888 0 58.368 24.064t20.48 51.712l0 11.264q0 34.816-17.92 58.88t-59.904 24.064l-7.168 0q-38.912 0-61.952-21.504t-23.04-59.392l0-14.336q0-13.312 5.632-26.624t15.872-24.064 25.6-17.408 33.792-6.656l10.24 0zM887.808 431.104q37.888 0 58.368 24.064t20.48 51.712l0 11.264q0 34.816-17.92 58.88t-59.904 24.064l-7.168 0q-38.912 0-61.952-21.504t-23.04-59.392l0-14.336q0-13.312 5.632-26.624t15.872-24.064 25.6-17.408 33.792-6.656l10.24 0z">
            </path>
          </svg>
          <ul
            v-on-click-outside.bubble="
              () => {
                showPlayAction = false;
              }
            "
            :class="[
              showPlayAction ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            ]"
            class="right-0 bottom-4 w-36 p-0 *:duration-200 duration-200 *:select-none py-2 absolute shadow-xl bg-zinc-100/20 backdrop-blur-md *:text-zinc-300 rounded *:text-[10px]"
            tabindex="0"
          >
            <li
              class="hover:bg-neutral-200/20 p-2 h-8"
              @click.stop="()=>{
                searchLrcOffset=0
                showLrcModal = !showLrcModal
                lrcSearchText=metadata.title
                selectLrc()
              }"
            >
              选择歌词
            </li>
            <li
              class="hover:bg-neutral-200/20 p-2 h-8"
              @click="openPath"
            >
              从文件夹打开
            </li>
          </ul>
        </div>
        <div class="w-3/5 flex items-center justify-between mt-4 h-4">
          <svg class="fill-zinc-50/60 hover:fill-zinc-50 cursor-pointer"
               height="18"
               viewBox="0 0 1024 1024" width="18" xmlns="http://www.w3.org/2000/svg" @click="setVolumeValue(0)">
            <path d="M128 384l0 256 170.668 0L512 863.086 512 160.916 298.668 384 128 384z"></path>
          </svg>
          <input
            :style="{'--volumeProcess':volumeProcess}"
            id="volume2"
            :value="volume * 100"
            class="cursor-pointer mx-2 w-full appearance-none outline-0 border-0 bg-zinc-300/40 rounded-sm"
            max="100"
            min="0"
            type="range"
            @input="setVolume"
          />
          <svg
            class="fill-zinc-50/60 hover:fill-zinc-50 cursor-pointer"
            height="15"
            viewBox="0 0 1024 1024"
            width="15"
            xmlns="http://www.w3.org/2000/svg"
            @click="setVolumeValue(100)">
            <path
              d="M260.256 356.576l204.288-163.968a32 32 0 0 1 52.032 24.96v610.432a32 32 0 0 1-51.968 24.992l-209.92-167.552H96a32 32 0 0 1-32-32v-264.864a32 32 0 0 1 32-32h164.256zM670.784 720.128a32 32 0 0 1-44.832-45.664 214.08 214.08 0 0 0 64.32-153.312 213.92 213.92 0 0 0-55.776-144.448 32 32 0 1 1 47.36-43.04 277.92 277.92 0 0 1 72.416 187.488 278.08 278.08 0 0 1-83.488 198.976zM822.912 858.88a32 32 0 1 1-45.888-44.608A419.008 419.008 0 0 0 896 521.152c0-108.704-41.376-210.848-114.432-288.384a32 32 0 0 1 46.592-43.872c84.16 89.28 131.84 207.04 131.84 332.256 0 127.84-49.76 247.904-137.088 337.728z"
            ></path>
          </svg>
        </div>
      </div>

      <div id="LrcBox"
           class="w-4/7 h-[65%] relative right-0 top-0 overflow-x-hidden overflow-y-scroll **:text-pretty **:text-left pr-8 pl-2">
        <div class="h-[25vh] w-full"></div>
        <div v-if="parsedLyrics.length>0" class="*:cursor-pointer lyrics w-full *:w-full flex flex-col items-start justify-center gap-y-4 *:duration-500">
          <div v-for="(data,index) in parsedLyrics"
               :class="[useGlow &&lrcCurrentIndex===index? 'drop-shadow-[0px_0px_2px_#fafafabb]':'']"
             :style="lrcBlur(index)"
               @dblclick="onPlaySkip_Lrc(data.segmentStart)"
          >

            <p
              :class="{'scale-110 opacity-85':lrcEffect1(index)}"
              class="text-2xl origin-left delay-100 duration-300 w-fit will-change-transform will-change-[opacity]"
            >
              <span v-if="index === lrcCurrentIndex&&lrcType!=='.lrc'"
                    :style="{ '--wordProgress': effectLrcProcess}"
                    :class="{'text-white/40':lrcEffect2}"
                    class="*:inline-block duration-200 *:antialiased text-white will-change-transform  *:will-change-transform *:whitespace-pre-wrap"
              >
                <span
                  :class="{
                  'effectLrc': index2 === wordIndex,
                  'text-white/40': index2 > wordIndex,
                  'wordAnimation1': index2 <= wordIndex,
                }"
                  v-for="(word,index2) in data.words"
                  :style="{'--wordDuration':word.duration}">
                  {{word.lyricWord}}
                </span>
              </span>
              <span v-else
                :class="[lrcCurrentIndex===index&&lrcType==='.lrc'? 'text-white':'text-white/40']"
              >
              {{ data.lyricText.split(' / ')[0] }}
            </span>
            </p>

            <p v-if="showTranslate&&(data.translate||data.lyricText.split(' / ')[1])" class="mt-1 text-xl text-white/40 w-full">
              {{data.translate? data.translate:data.lyricText.split(' / ')[1]}}
            </p>
            <transition mode="out-in" name="interlude-fade">
              <div v-if="showInterlude(index)"
                   :style="{'--interludeProcess':interludeProcess}"
                   class="w-fit interludeFade *:size-2.5 *:bg-white *:rounded-[50%] gap-x-2.5 flex items-center justify-start interlude">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </transition>

          </div>
        </div>
        <p v-else class="h-fit absolute m-auto top-0 bottom-0">无歌词文件或歌词文件格式错误</p>
        <div class="h-[25vh] w-full"></div>
      </div>
    </div>

    <div v-on-click-outside.bubble="
              () => {
                showLrcModal = false;
                lrcSearchText=''
              }"
         v-if="showLrcModal"
         class="absolute m-auto left-0 right-0 top-0 bottom-0 rounded overflow-x-hidden overflow-y-scroll gap-y-2 w-2/3 h-[90%] z-25 bg-zinc-600/40 flex flex-col items-center justify-start backdrop-blur-lg p-4 **:text-zinc-200">

      <div class="sticky top-0 w-full flex h-16 items-center justify-between gap-x-4 *:text-sm bg-zinc-800 rounded p-4">
        <p @click.stop="()=>{showApiList=!showApiList}" class="text-center w-36 duration-200 hover:bg-neutral-600/60 bg-neutral-600/40 p-2 rounded">API：{{['QQ音乐','网易云'][apiSource]}}</p>
        <ul
          v-on-click-outside.bubble="
              () => {
                showApiList = false;
              }
            "
          :class="[
              showApiList ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            ]"
          class="left-0 top-17 w-36 p-0 *:duration-200 duration-200 *:select-none py-2 absolute shadow-xl bg-zinc-900/80 backdrop-blur-md *:text-zinc-300 rounded *:text-[10px]"
          tabindex="0"
        >
          <li
            class="hover:bg-neutral-200/20 p-2 h-8"
            @click.stop="selectApi(0)"
          >
            QQ音乐
          </li>
          <li
            class="hover:bg-neutral-200/20 p-2 h-8"
            @click="selectApi(1)"
          >
            网易云
          </li>
        </ul>
        <input v-model="lrcSearchText" placeholder="搜索" class="w-36 outline-0 border-0 bg-neutral-600/20 p-2 rounded">
      <span class="w-36 hover:bg-neutral-600/60 bg-neutral-600/40 p-2 px-4 rounded duration-200 text-center"
            @click.stop="()=>{
                searchLrcOffset++
                selectLrc()
              }"
      >换一批</span>
      </div>
      <div v-for="data in musicLrcData" class="w-full bg-zinc-800/20 rounded flex flex-col items-center justify-center">

          <div class="select-none font-semibold w-full p-4">{{data.name}} - {{data.artist}} [{{data.translate? '有翻译':'无翻译'}} - {{data.type==='.lrc'? '逐行歌词':'逐字歌词'}}]</div>

          <div class="w-full text-sm overflow-x-hidden overflow-y-scroll whitespace-pre-wrap p-4 max-h-36">
            {{data.lrc||data.qrc||data.yrc||'无歌词'}}<br>翻译：<br>{{data.translate? data.translate:'无翻译'}}
          </div>

          <span class="select-none hover:bg-zinc-800/40 w-full bg-zinc-800/20 p-4 rounded duration-200 text-center"
                @click="switchLrc(data)"
          >使用</span>

        </div>

    </div>

    <div :class="[useEffects? 'effectCover will-change-transform':'simpleCover']"
         :style="{
       '--imgColor0':colors[0],
       '--imgColor1':colors[1],
       '--imgColor2':colors[2],
  }"
         class="w-full h-screen absolute left-0 right-0 brightness-50 z-22"></div>

  </div>
</template>

<style scoped>
#LrcBox {
  mask: linear-gradient(to top, transparent 0%, #000 10%, #000 90%, transparent 100%);
}

#LrcBox p{
  font-weight: v-bind(lrcWeight);
}

#musicInfo{
  mask: linear-gradient(to left, transparent 0%, #000 10%);
}

.lyrics>div{
  contain: content;
}

.lyrics>div p{
  letter-spacing: v-bind(letterSpacing);
}

.wordAnimation1{
  animation: wordToTop calc(var(--wordDuration) * 1.8s) ease-in-out forwards calc(var(--wordDuration) * 0.2s);
}

@keyframes wordToTop {
  25%{
    transform: translateY(-0.25px);
  }
  50%{
    transform: translateY(-0.5px);
  }
  75%{
    transform: translateY(-0.75px);
  }
  100%{
    transform: translateY(-1px);
  }
}

.effectLrc{
  --dynamic-width: min(var(--wordProgress) * 0%, 20%);

  mask-image: linear-gradient(
    to right,
    rgba(0, 0, 0, 1) calc(var(--wordProgress) * 1% - var(--dynamic-width)), /* 动态过渡宽度 */
    rgba(0, 0, 0, 1) calc(var(--wordProgress) * 1%),
    rgba(0, 0, 0, 0.4) calc(var(--wordProgress) * 1% + var(--dynamic-width))
  );
  mask-repeat: no-repeat;
  text-rendering: optimizeLegibility;
}

.interludeFade{
  mask-image: linear-gradient(
    to right,
    rgba(0, 0, 0, 1) calc(var(--interludeProcess) * 1%),
    rgba(0, 0, 0, 0.4) calc(var(--interludeProcess) * 1% + 10%)
  );
  mask-repeat: no-repeat;
}


.interlude{
  height: 2.5rem;
  margin-bottom: 1rem;
  margin-top: 1rem;
  opacity: 0.85;
}

.interlude-fade-enter-active {
  transition: all 0.5s ease-out;
}

.interlude-fade-leave-active {
  transition: all 0.5s ease-in;
}

.interlude-fade-enter-from,
.interlude-fade-leave-to {
  opacity: 0;
  height: 0;
  margin: 0;
}

.simpleCover {
  background-color: var(--imgColor0);
}

.effectCover {
  background-color: var(--imgColor0);
  background-image: linear-gradient(125deg, var(--imgColor0), var(--imgColor1), var(--imgColor2));
  background-size: 500%;
  animation: 15s coverAnimation linear infinite;
  transform: translateZ(0);
}

@keyframes coverAnimation {
  0%, 100% {
    background-position: 0 50%;
  }
  25% {
    background-position: 25% 50%;
  }
  50% {
    background-position: 50% 50%;
  }
  65% {
    background-position: 75% 50%;
  }
  75% {
    background-position: 50% 50%;
  }
  90% {
    background-position: 25% 50%;
  }
}

::-webkit-scrollbar-thumb {
  border-radius: 6px;
  background: rgba(24 24 27 / 0);
}

html.dark {
  ::-webkit-scrollbar-thumb {
    border-radius: 6px;
    background: rgba(24 24 27 / 0);
  }
}

#playProcess2 {
  background: linear-gradient(
    to right,
    #ffffff99 var(--playProcess),
    #00000000 var(--playProcess)
  );
}

#playProcess2::-webkit-slider-thumb {
  appearance: none;
  position: relative;
  width: 6px;
  height: 4px;
  background-color: #ffffff00;
}

#volume2 {
  background: linear-gradient(
    to right,
    #ffffff99 var(--volumeProcess),
    #00000000 var(--volumeProcess)
  );
}

#volume2::-webkit-slider-thumb {
  appearance: none;
  position: relative;
  width: 6px;
  height: 4px;
  background-color: #ffffff00;
}

#diy_bar {
  -webkit-app-region: drag;
}

.no_drag {
  -webkit-app-region: no-drag;
}
</style>
