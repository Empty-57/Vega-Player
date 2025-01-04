<script setup>
import {onActivated, onMounted, useTemplateRef} from "vue";

const theme_sw = useTemplateRef('theme_sw')
localStorage.theme = 'dark'
let html_ = null;
onMounted(() => {
  html_ = document.querySelector('html');
  theme_sw.value.checked = localStorage.theme === 'light';
  html_.className = localStorage.theme
})
onActivated(() => {
  theme_sw.value.checked = localStorage.theme === 'light';
})

function themeSwitch(event) {
  if (event.target.checked) {
    localStorage.setItem("theme", "light")
    html_.className = 'light'
  } else {
    localStorage.setItem("theme", "dark")
    html_.className = 'dark'
  }
}

function windowAction(action) {
  window.electron.ipcRenderer.send('windowAction', action);
}
</script>

<template>
  <div id="diy_bar"
       class="fixed w-screen h-11 bg-transparent top-0 left-0 z-10 flex items-center justify-center *:duration-200">
    <span class="no_drag p-3 flex items-center justify-center">
      <span>
        <svg class=" stroke-zinc-900 dark:stroke-zinc-200" fill="none" height="32" stroke-width="1"
             viewBox="0 -12 64 64" width="32" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 32 L20 10 L25 15 L30 12 L35 20 L40 10 L50 32"/>
  <path d="M54 32 L44 10 L39 15 L34 12 L29 20 L24 10 L14 32"/>
</svg>
      </span>

      <span class="text-zinc-900 dark:text-zinc-200 text-xs">Vega Player</span>
    </span>
    <span class="grow"></span>
    <span class="no_drag p-3 flex items-center justify-center">
      <label class="swap swap-rotate">
            <input ref="theme_sw" type="checkbox" @change="themeSwitch"/>
            <svg class="swap-off stroke-zinc-900 dark:stroke-zinc-200" fill="none"
                 height="20" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" viewBox="0 -1 24 24" width="20"
                 xmlns="http://www.w3.org/2000/svg">
  <path d="M21 12.79A9 9 0 0 1 11.21 3a7 7 0 1 0 9.58 9.79z"/>
</svg>

            <svg class="swap-on stroke-zinc-900 dark:stroke-zinc-200" fill="none"
                 height="20" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" viewBox="0 0 24 24" width="20"
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
      <svg class=" stroke-zinc-900 dark:stroke-zinc-200" height="16" viewBox="0 0 24 24" width="16"
           xmlns="http://www.w3.org/2000/svg">
  <rect fill="none" height="16" rx="2" ry="2" stroke-width="1" width="16" x="4" y="4"/>
</svg>
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
