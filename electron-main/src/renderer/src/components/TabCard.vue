<script setup>
import {ref} from "vue";

const tabIndex=ref(0)
</script>

<template>
  <div class="relative left-0 top-0 flex flex-col items-center justify-center h-screen w-24  bg-zinc-300 dark:bg-zinc-900 p-4 gap-y-4">
    <span @click="()=>tabIndex=0" :class="[tabIndex===0? 'text-cyan-400':'text-zinc-900 dark:text-zinc-200']">tab1</span>
    <span @click="()=>tabIndex=1" :class="[tabIndex===1? 'text-cyan-400':'text-zinc-900 dark:text-zinc-200']">tab2</span>
    <span @click="()=>tabIndex=2" :class="[tabIndex===2? 'text-cyan-400':'text-zinc-900 dark:text-zinc-200']">tab3</span>
  </div>
  <div class="bg-transparent w-full h-screen" v-show="tabIndex===0">
    <slot name="item1"></slot>
  </div>
  <div class="bg-transparent w-full h-screen" v-show="tabIndex===1">
    <slot name="item2"></slot>
  </div>
  <div class="bg-transparent w-full h-screen" v-show="tabIndex===2">
    <slot name="item3"></slot>
  </div>
</template>

<style scoped>

</style>
