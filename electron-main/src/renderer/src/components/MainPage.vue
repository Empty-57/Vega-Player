<script setup>
import {ref} from "vue";
import TabCard from "./TabCard.vue";

const tabIndex=ref(0)
</script>

<template>
  <div class="relative left-0 top-0 w-full h-screen bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
    <tab-card>
      <template #item1>
        item1
      </template>
      <template #item2>
        item2
      </template>
      <template #item3>
        item3
      </template>
    </tab-card>
  </div>
</template>
