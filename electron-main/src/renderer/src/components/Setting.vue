<script setup>
import {useStorage} from '@vueuse/core';
const lrc_cfg = useStorage('lrc_cfg', {showTranslate: true,lrcSpacing:0,lrcWeight:700});
</script>

<template>
  <div class="relative top-0 left-0 flex flex-col items-start justify-start h-screen w-full p-8 pb-16 gap-y-2 **:text-zinc-900 **:dark:text-zinc-200">
    <div class="**:select-none flex flex-col items-start justify-center w-full gap-y-2">
      <p class="text-xl font-semibold mb-4">歌词样式</p>
      <div class="w-full flex items-center justify-between border rounded p-3 dark:bg-gray-900/10 bg-gray-600/10 dark:border-white/20 border-black/20">
        <span class="text-md font-medium">显示翻译歌词</span>
        <input type="checkbox" :checked="lrc_cfg.showTranslate" @change="e=>{lrc_cfg.showTranslate=e.target.checked}" class="toggle toggle-sm border-0 dark:bg-gray-600/40 bg-gray-600/20 before:text-white dark:checked:bg-cyan-600 checked:bg-red-400" />
      </div>

      <div class="w-full flex flex-col items-center justify-start gap-y-2 border rounded p-3 dark:bg-gray-900/10 bg-gray-600/10 dark:border-white/20 border-black/20">
        <div class="w-full flex items-center justify-between">
          <span class="text-md font-medium">
          歌词间距
          <span class="text-[12px] opacity-50">0-10的值</span>
        </span>
          <input type="number"
                 :value="lrc_cfg.lrcSpacing"
                 class="input validator border-0 focus:outline-0 dark:bg-gray-600/20 w-[20%] bg-gray-600/20"
                 @change="e=>{lrc_cfg.lrcSpacing=e.target.value&&e.target.value>=0&&e.target.value<=10? e.target.value:0}"
                 min="0" max="10">
        </div>

        <div class="w-full flex items-center justify-between">
          <span class="text-md font-medium">
          字重
          <span class="text-[12px] opacity-50">0-1000的值</span>
        </span>
          <input type="number"
                 :value="lrc_cfg.lrcWeight"
                 class="input validator border-0 focus:outline-0 dark:bg-gray-600/20 w-[20%] bg-gray-600/20"
                 @input="e=>{lrc_cfg.lrcWeight=e.target.value&&e.target.value>=0&&e.target.value<=1000? e.target.value:700}"
                 min="0" max="1000">
        </div>

        <div class="w-full flex flex-col items-center justify-center"
        :style="{'--lrcWeight':lrc_cfg.lrcWeight,
        '--letterSpacing':lrc_cfg.lrcSpacing/10+'rem'
        }"
        >
          <span class="text-md font-medium self-start">样式预览</span>
          <p class="font-(--lrcWeight) tracking-(--letterSpacing) text-2xl">样式预览 Style preview スタイルプレビュー</p>
          <p class="font-(--lrcWeight) tracking-(--letterSpacing) text-xl opacity-40">样式预览 Style preview スタイルプレビュー</p>
        </div>

        </div>
    </div>
    <span class="grow"></span>
  </div>
</template>
