<script setup>
import {ref} from "vue";
import {useDark, useToggle} from "@vueuse/core";

const isMaximized = ref(false)

const isDark = useDark({
  storageKey: 'theme',
  valueDark: 'dark',
  valueLight: 'light',
  disableTransition: false
})
const toggleDark = useToggle(isDark)

async function windowAction(action) {
  isMaximized.value = await window.electron.ipcRenderer.invoke('windowAction', action);
}

window.electron.ipcRenderer.on('resize', () => {
  isMaximized.value = false;
});
</script>

<template>
  <div id="diy_bar"
       class="fixed w-screen h-11 bg-transparent top-0 left-0 z-10 flex items-center justify-center *:duration-200">
    <span class="grow"></span>
    <span class="no_drag p-3 flex items-center justify-center">
      <label class="swap swap-rotate">
            <input ref="theme_sw" :checked="!isDark" class="outline-none" type="checkbox" @change="toggleDark()"/>
            <svg class="swap-off stroke-zinc-900 dark:stroke-zinc-200" fill="none"
                 height="20" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" viewBox="0 -1 24 24"
                 width="20"
                 xmlns="http://www.w3.org/2000/svg">
  <path d="M21 12.79A9 9 0 0 1 11.21 3a7 7 0 1 0 9.58 9.79z"/>
</svg>
            <svg class="swap-on stroke-zinc-900 dark:stroke-zinc-200" fill="none"
                 height="20" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" viewBox="0 0 24 24"
                 width="20"
                 xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="5"/>
  <line x1="12" x2="12" y1="1" y2="3"/>
  <line x1="12" x2="12" y1="21" y2="23"/>
  <line x1="4.22" x2="5.64" y1="4.22" y2="5.64"/>
  <line x1="18.36" x2="19.78" y1="18.36" y2="19.78"/>
  <line x1="1" x2="3" y1="12" y2="12"/>
  <line x1="21" x2="23" y1="12" y2="12"/>
  <line x1="4.22" x2="5.64" y1="19.78" y2="18.36"/>
  <line x1="18.36" x2="19.78" y1="5.64" y2="4.22"/>
</svg>
          </label>
    </span>
    <span class=" no_drag dark:hover:bg-zinc-600/40 hover:bg-zinc-400/20 p-3" @click="windowAction('minimize')">
      <svg class="fill-zinc-900 dark:fill-zinc-200" height="16" viewBox="0 0 24 24" width="16"
           xmlns="http://www.w3.org/2000/svg">
  <rect height="1" rx="2" ry="2" width="16" x="4" y="12"/>
</svg>
    </span>
    <span class=" no_drag dark:hover:bg-zinc-600/40 hover:bg-zinc-400/20 p-3" @click="windowAction('maximize')">
      <svg v-if="!isMaximized" class=" stroke-zinc-900 dark:stroke-zinc-200" height="16" viewBox="0 0 24 24" width="16"
           xmlns="http://www.w3.org/2000/svg">
  <rect fill="none" height="16" rx="2" ry="2" stroke-width="1" width="16" x="4" y="4"/>
</svg>
      <svg v-if="isMaximized" class=" fill-zinc-900 dark:fill-zinc-200" height="16"
           viewBox="0 0 1024 1024" width="16" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M812.2 65H351.6c-78.3 0-142.5 61.1-147.7 138.1-77 5.1-138.1 69.4-138.1 147.7v460.6c0 81.6 66.4 148 148 148h460.6c78.3 0 142.5-61.1 147.7-138.1 77-5.1 138.1-69.4 138.1-147.7V213c0-81.6-66.4-148-148-148z m-45.8 746.3c0 50.7-41.3 92-92 92H213.8c-50.7 0-92-41.3-92-92V350.7c0-50.7 41.3-92 92-92h460.6c50.7 0 92 41.3 92 92v460.6z m137.8-137.7c0 47.3-35.8 86.3-81.8 91.4V350.7c0-81.6-66.4-148-148-148H260.2c5.1-45.9 44.2-81.8 91.4-81.8h460.6c50.7 0 92 41.3 92 92v460.7z">
      </path></svg>
    </span>
    <span class=" no_drag dark:hover:bg-red-800 hover:bg-red-600 p-3 rounded-tr" @click="windowAction('close')">
      <svg class=" stroke-zinc-900 dark:stroke-zinc-200" height="20" viewBox="0 0 24 24" width="20"
           xmlns="http://www.w3.org/2000/svg">
  <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="1"/>
</svg>

    </span>
  </div>
</template>
<style scoped>
#diy_bar {
  -webkit-app-region: drag
}

.no_drag {
  -webkit-app-region: no-drag
}
</style>
