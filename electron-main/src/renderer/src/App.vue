<script setup>
import MainPage from './components/MainPage.vue';
import MyWindowBorder from './components/MyWindowBorder.vue';
import MusicBar from './components/MusicBar.vue';
</script>

<template>
  <MyWindowBorder></MyWindowBorder>
  <MainPage></MainPage>
  <keep-alive>
    <music-bar></music-bar>
  </keep-alive>
</template>
