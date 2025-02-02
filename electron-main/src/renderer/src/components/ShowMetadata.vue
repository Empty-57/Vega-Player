<script setup>
import {ref,onMounted} from "vue";

const {oldTitle,oldArtist,oldAlbum}=defineProps(['oldTitle','oldArtist','oldAlbum'])
const emit=defineEmits(['closeMetadata'])

const title=ref('')
const artist=ref('')
const album=ref('')

onMounted(() => {
  title.value=oldTitle
  artist.value=oldArtist
  album.value=oldAlbum
})

function closeMetadata(){
  emit('closeMetadata')
}

function saveMetadata(){
  console.log('title:',title.value)
}

</script>

<template>
<div class="fixed left-0 top-0 w-screen h-screen z-15 flex items-center justify-center">
  <div class="p-4 gap-y-4 **:select-none **:text-xs **:text-zinc-900 **:dark:text-zinc-200 h-[80%] w-[40%] dark:bg-neutral-800 border dark:border-neutral-600 border-neutral-400 bg-neutral-300 rounded flex flex-col items-start justify-stretch">
<span class="flex items-center justify-center gap-x-4 w-full">
  <span class="w-[20%] text-center">标题</span>
  <input v-model="title" type="text" class="border-none dark:bg-neutral-900/40 bg-neutral-400/40 rounded grow p-2 focus:outline-1 focus:outline-cyan-600">
</span>

    <span class="flex items-center justify-center gap-x-4 w-full">
  <span class="w-[20%] text-center">艺术家</span>
  <input v-model="artist" type="text" class="border-none dark:bg-neutral-900/40 bg-neutral-400/40 rounded grow p-2 focus:outline-1 focus:outline-cyan-600">
</span>

    <span class="flex items-center justify-center gap-x-4 w-full">
  <span class="w-[20%] text-center">专辑</span>
  <input v-model="album" type="text" class="border-none dark:bg-neutral-900/40 bg-neutral-400/40 rounded grow p-2 focus:outline-1 focus:outline-cyan-600">
</span>
    <span class="grow"></span>

    <span class="flex items-center justify-center gap-x-4 w-full">
  <span class="p-2 rounded dark:bg-neutral-900/60 bg-neutral-400/30 grow text-center dark:hover:bg-neutral-900 hover:bg-neutral-400/80 duration-200" @click="saveMetadata">保存</span>
  <span class="p-2 rounded dark:bg-neutral-900/60 bg-neutral-400/30 grow text-center dark:hover:bg-red-900 hover:bg-red-400 duration-200" @click="closeMetadata">退出</span>
</span>
  </div>
</div>
</template>
