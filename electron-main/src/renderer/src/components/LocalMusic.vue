<script setup>
import {reactive} from "vue";
const fileMeta_list=reactive([])
async function SelectFile(flag) {
    fileMeta_list.value = await window.electron.ipcRenderer.invoke('select_files',flag)
}
</script>

<template>
  <div class="relative top-0 left-0 flex flex-col items-start justify-start w-full h-screen p-4 gap-y-2">
    <span id="title"
          class="text-zinc-900 dark:text-zinc-200 text-2xl grow-[1] flex items-center justify-center font-semibold px-4 pt-4">本地音乐</span>
    <div id="tool_bar" class="bg-red-400/0 w-full grow-[1] flex items-center justify-start gap-x-4 px-4">
      <div class="dropdown">
        <div class="flex items-center justify-center gap-x-2 text-zinc-900 dark:text-zinc-200 text-xs select-none dark:bg-zinc-700 bg-zinc-400/20 active:bg-[#a6adbb1a] p-2 px-4 rounded duration-200 outline-none" role="button"
             tabindex="0">
          <svg class="stroke-zinc-900 dark:stroke-zinc-200" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
            <line stroke-width="1" x1="8" x2="8" y1="0" y2="16"/>
            <line stroke-width="1" x1="0" x2="16" y1="8" y2="8"/>
          </svg>
          添加
        </div>
        <ul class="w-36 dropdown-content menu shadow dark:bg-zinc-800 bg-zinc-200 *:text-zinc-900 *:dark:text-zinc-200 rounded"
            tabindex="0">
          <li>
            <a class="active:bg-transparent active:text-inherit" @click="SelectFile('file')">
              手动添加
            </a>
          </li>
          <li>
            <a class="active:bg-transparent active:text-inherit" @click="SelectFile('folder')">
              添加文件夹
            </a>
          </li>
        </ul>
      </div>
      <span>mul_action</span>
      <span>search</span>
      <span>sort</span>
      <span>view</span>
    </div>
    <div id="music_list" class="bg-cyan-400/20 w-full grow-[10] p-4 gap-y-4 flex flex-col items-start justify-start">
      <div class="flex items-center justify-center even:bg-red-400/20 odd:bg-cyan-400/20 w-full h-12 p-2 *:text-zinc-900 *:dark:text-zinc-200 rounded *:truncate">
        <img alt="" src="./test.jpg" class="rounded h-10 w-10 object-cover bg-cover grow-[0]"/>
        <div class="flex flex-col items-start justify-end mx-2 grow-[8] overflow-hidden max-w-[40%]">
          <span class="text-sm">测试</span>
          <span class="text-xs">测试</span>
        </div>
        <span class="text-xs grow-[4]">收藏</span>
        <span class="text-xs grow-[4] overflow-hidden max-w-[20%] mx-2">测试</span>
        <span class="text-xs grow-[1]">00:00</span>
      </div>
    </div>
  </div>
</template>
