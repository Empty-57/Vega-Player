<script setup>
import {onMounted, ref} from "vue";
import EventBus from "../assets/EventBus.js";
import placeholder from '../assets/placeholder.jpg';

const {oldTitle, oldArtist, oldAlbum, path} = defineProps(['oldTitle', 'oldArtist', 'oldAlbum', 'path'])
const emit = defineEmits(['closeMetadata', 'getCover'])

const title = ref('')
const artist = ref('')
const album = ref('')
const src = ref('')
const isLoaded = ref(false)
const coverPath = ref('')

async function getCover() {
  isLoaded.value = false
  src.value = await window.electron.ipcRenderer.invoke('getCovers', {path: path, flag: 2});
  if (!src.value) {
    src.value = await window.electron.ipcRenderer.invoke('getLocalCovers', path);
  }
  isLoaded.value = true
}

onMounted(async () => {
  title.value = oldTitle
  artist.value = oldArtist
  album.value = oldAlbum

  await getCover()
})

function closeMetadata() {
  emit('closeMetadata')
}

function saveMetadata() {
  window.electron.ipcRenderer.send('saveMetadata', {
    title: title.value,
    artist: artist.value,
    album: album.value,
    path: path,
    coverPath: coverPath.value
  })
  EventBus.emit('syncCache', {title: title.value, artist: artist.value, album: album.value, path})
  emit('closeMetadata')
}

async function editCover() {
  const args = await window.electron.ipcRenderer.invoke('editCover')
  coverPath.value = args?.filePath ? args?.filePath : ''
  src.value = args?.src ? args?.src : src.value
}

async function reSetCover() {
  window.electron.ipcRenderer.send('reSetCover', path)
  await getCover()
}

</script>

<template>
  <div class="fixed left-0 top-0 w-screen h-screen z-15 flex items-center justify-center">
    <div
      class="overflow-y-auto p-4 gap-y-4 **:select-none **:text-xs **:text-zinc-900 **:dark:text-zinc-200 h-[80%] w-[40%] dark:bg-neutral-800 border dark:border-neutral-600 border-neutral-400 bg-neutral-300 rounded flex flex-col items-center justify-stretch">

      <img :class="[isLoaded? 'opacity-100':'opacity-0']" :src="src? src:placeholder" alt=""
           class="w-1/2 rounded aspect-square object-cover duration-200">

      <span class="flex items-center justify-center gap-x-4 w-full">
  <span class="w-[20%] text-center">标题</span>
  <input v-model="title"
         class="border-none dark:bg-neutral-900/40 bg-neutral-400/40 rounded grow p-2 focus:outline-1 focus:outline-cyan-600"
         type="text">
</span>

      <span class="flex items-center justify-center gap-x-4 w-full">
  <span class="w-[20%] text-center">艺术家</span>
  <input v-model="artist"
         class="border-none dark:bg-neutral-900/40 bg-neutral-400/40 rounded grow p-2 focus:outline-1 focus:outline-cyan-600"
         type="text">
</span>

      <span class="flex items-center justify-center gap-x-4 w-full">
  <span class="w-[20%] text-center">专辑</span>
  <input v-model="album"
         class="border-none dark:bg-neutral-900/40 bg-neutral-400/40 rounded grow p-2 focus:outline-1 focus:outline-cyan-600"
         type="text">
</span>
      <span class="grow"></span>

      <span class="flex items-center justify-center gap-x-4 w-full">
  <span
    class="p-2 rounded dark:bg-neutral-900/60 bg-neutral-400/30 grow text-center dark:hover:bg-neutral-900 hover:bg-neutral-400/80 duration-200"
    @click="saveMetadata">保存</span>

  <span
    class="p-2 rounded dark:bg-neutral-900/60 bg-neutral-400/30 grow text-center dark:hover:bg-cyan-800 hover:bg-cyan-500 duration-200"
    @click="editCover">更换封面</span>

        <span
          class="p-2 rounded dark:bg-neutral-900/60 bg-neutral-400/30 grow text-center dark:hover:bg-red-900 hover:bg-red-400 duration-200"
          @click="reSetCover">重置封面</span>

  <span
    class="p-2 rounded dark:bg-neutral-900/60 bg-neutral-400/30 grow text-center dark:hover:bg-red-900 hover:bg-red-400 duration-200"
    @click="closeMetadata">退出</span>
</span>
    </div>
  </div>
</template>
