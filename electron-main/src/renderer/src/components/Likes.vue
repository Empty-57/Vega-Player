<script setup>
import {nextTick, ref, toRaw, useTemplateRef} from "vue";
import {useScroll, useVirtualList} from '@vueuse/core'
import IndexDB from "../assets/indexDB";
import placeholder from "../assets/placeholder.jpg";
import FloatLocalTopBtn from "./FloatLocalTopBtn.vue";
import {vOnClickOutside} from "@vueuse/components";
import EventBus from "../assets/EventBus";
import {findInsertPosition} from "../assets/BinarySearchPosition";

const db = new IndexDB()
const music_dropdown = ref(false)
const music_menu = useTemplateRef('music_menu')
const music_local = ref({
  x: 0,
  y: 0,
  path: '',
  music_index: 0,
})
const cacheLike_list = ref([])
const {list, containerProps, wrapperProps} = useVirtualList(
  cacheLike_list.value,
  {
    itemHeight: 56,
    overscan: 5,
  })
const music_list = containerProps.ref
const {arrivedState} = useScroll(music_list)


db.init_DB().then(() => {
  db.searchData('', 0, [],'LikesCache').then(data => {
    data.forEach(item => {
      const position = findInsertPosition(cacheLike_list.value, item.title)
      cacheLike_list.value.splice(position, 0, item)
    })
    console.log(cacheLike_list.value)
  })
})

EventBus.on('delete_LikeCache', path => {
  const LikeCacheSet = cacheLike_list.value.map(item => item.path)
  cacheLike_list.value.splice(LikeCacheSet.indexOf(path), 1)

})
EventBus.on('add_LikeCache', data => {
  const position = findInsertPosition(cacheLike_list.value, data.title)
  cacheLike_list.value.splice(position, 0, data)
})

function SwitchLikes(event, args) {
  console.log('likes: ', toRaw(cacheLike_list.value[args.index]))
  db.init_DB().then(() => {
    db.deleteData(args.path, 'LikesCache')
    cacheLike_list.value[args.index].isLike = false
    db.addData(toRaw(cacheLike_list.value[args.index]))
    db.close_db()
    cacheLike_list.value.splice(args.index, 1)
    EventBus.emit('set_Like_false', args.path)
  })
}

function music_delete() {
  db.init_DB().then(() => {
    db.deleteData(music_local.value.path)
    db.deleteData(music_local.value.path, 'LikesCache')
    db.close_db()
    cacheLike_list.value.splice(music_local.value.music_index, 1)
    EventBus.emit('delete_Cache', music_local.value.path)
  })
  music_dropdown.value = false
}


async function click_menu(event, args) {
  music_dropdown.value = !music_dropdown.value;
  await nextTick(() => {
    music_local.value.x = event.clientX - 6;
    music_local.value.y = event.clientY - music_menu.value.clientHeight - 6;
    music_local.value.path = args.path;
    music_local.value.music_index = args.index
  })
}

function dropdownClose() {
  music_dropdown.value = false
}

function ToTop() {
  music_list.value.scrollTop = 0
}

function ToLocal() {
}
</script>

<template>
  <div class="relative top-0 left-0 flex flex-col items-start justify-start h-screen w-full p-4 pb-16 gap-y-2">
    <span
      class="select-none text-zinc-900 dark:text-zinc-200 text-2xl basis-1/6 flex items-center justify-center font-semibold px-4 pt-4">喜欢</span>
    <div class="w-full basis-1/12 flex items-center justify-start gap-x-4 px-4">
      <span>mul_action</span>
      <span>search</span>
      <span>sort</span>
      <span>view</span>
    </div>
    <div
      class="dark:bg-zinc-800 bg-zinc-200 flex items-center justify-start w-full h-fit *:text-[10px] px-6 pr-8 *:select-none *:text-zinc-900 *:dark:text-zinc-400">
      <span class="w-0 flex-auto mr-4 max-w-[25%]">歌曲/艺术家</span>
      <span class="w-10"></span>
      <span class="text-xs mx-8 mr-16 w-6"></span>
      <span class="w-0 flex-auto text-left">专辑</span>
      <span class="w-10 mx-8 text-right">时长</span>
    </div>
    <div class="basis-2/3 w-full overflow-x-hidden overflow-y-auto p-4 pb-0" v-bind="containerProps">
      <div class="w-full flex flex-col items-start justify-start" v-bind="wrapperProps">
        <div
          v-for="metadata in list" :key="metadata.data.audio_id"
          class="*:select-none flex items-center justify-start dark:even:bg-zinc-800 dark:odd:bg-zinc-900/40 even:bg-zinc-200 odd:bg-zinc-300/60 dark:hover:bg-zinc-950/60 hover:bg-zinc-400/40 w-full h-14 p-2 *:text-zinc-900 rounded duration-200 hover:cursor-pointer">
          <img
            :src="metadata.data.picture? metadata.data.picture:placeholder"
            alt=""
            class="rounded h-10 w-10 object-cover bg-cover" loading="lazy"/>
          <div class="flex flex-col items-start justify-between h-8 mx-2 w-0 flex-auto max-w-[25%] *:truncate">
            <span class="text-xs w-full dark:text-zinc-200">{{ metadata.data.title }}</span>
            <span class="text-[10px] w-full font-thin dark:text-zinc-400">{{ metadata.data.artist }}</span>
          </div>
          <span class="flex items-center justify-center mx-8 mr-4 w-6">
            <label class="swap">
            <input ref="theme_sw" :checked="metadata.data.isLike" class="outline-none" type="checkbox"
                   @change="SwitchLikes($event,{path:metadata.data.path,index:metadata.index})"/>
            <svg class="swap-off stroke-zinc-500 dark:stroke-zinc-400" height="16" viewBox="0 0 24 24" width="16"
                 xmlns="http://www.w3.org/2000/svg">
  <path
    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
    fill="none" stroke-width="2"/>
</svg>

            <svg class="swap-on dark:fill-red-900 fill-red-600" height="16" viewBox="0 0 24 24" width="16"
                 xmlns="http://www.w3.org/2000/svg">
  <path
    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
    stroke-width="2"/>
</svg>
          </label>
          </span>
          <span class="flex items-center justify-center mr-6 w-6"
                @click="click_menu($event,{path:metadata.data.path,index:metadata.index})">
            <svg class="fill-zinc-500 dark:fill-zinc-400 dark:hover:fill-cyan-600 hover:fill-cyan-500" height="16"
                 viewBox="0 0 1024 1024"
                 width="16" xmlns="http://www.w3.org/2000/svg"><path
              d="M929.70745 299.43679 93.792153 299.43679c-16.575514 0-30.013571-13.100366-30.013571-29.67588s13.438057-29.67588 30.013571-29.67588l835.916321 0c16.575514 0 30.013571 13.100366 30.013571 29.67588S946.283987 299.43679 929.70745 299.43679z"></path><path
              d="M775.639492 546.053584 93.792153 546.053584c-16.575514 0-30.013571-13.612019-30.013571-30.187533s13.438057-30.187533 30.013571-30.187533L775.639492 485.678518c16.575514 0 30.013571 13.612019 30.013571 30.187533S792.215006 546.053584 775.639492 546.053584z"></path><path
              d="M929.70745 791.647071 93.792153 791.647071c-16.575514 0-30.013571-13.100366-30.013571-29.67588s13.438057-29.67588 30.013571-29.67588l835.916321 0c16.575514 0 30.013571 13.100366 30.013571 29.67588S946.283987 791.647071 929.70745 791.647071z">
            </path></svg>
          </span>
          <span class="text-[10px] w-0 text-left flex-auto truncate dark:text-zinc-400">
          {{ metadata.data.album }}
        </span>
          <div class="text-[10px] font-thin text-center w-10 mx-8 truncate dark:text-zinc-400">
            {{ metadata.data.formatTime }}
          </div>
        </div>
      </div>
    </div>
    <float-local-top-btn :is-play="true" :is-top="arrivedState.top" @ToLocal="ToLocal"
                         @ToTop="ToTop"></float-local-top-btn>
    <div
      v-if="music_dropdown"
      ref="music_menu"
      v-on-click-outside.blub="dropdownClose"
      :style="{'left':music_local.x+'px', 'top':music_local.y+'px'}"
      class="*:select-none *:px-4 *:py-2 *:w-full flex flex-col items-start justify-center w-36 py-2 fixed shadow-lg dark:bg-neutral-900 bg-gray-200 *:text-zinc-900 *:dark:text-zinc-300 rounded *:text-[10px] *:duration-200">
      <span class="dark:hover:bg-neutral-800/40 hover:bg-gray-300/80 flex items-center justify-start">
        <svg class="fill-zinc-900 dark:fill-zinc-200" height="14" viewBox="0 0 1024 1024"
             width="14" xmlns="http://www.w3.org/2000/svg"><path
          d="M852.5 533.9L279 864.7c-11.9 6.9-27.2 2.8-34.1-9.1-2.2-3.8-3.3-8.1-3.3-12.5V181.5c0-13.8 11.2-24.9 24.9-24.9 4.4 0 8.7 1.2 12.5 3.3l573.4 330.8c11.9 6.9 16 22.1 9.1 34.1-2.1 3.8-5.2 6.9-9 9.1z">

        </path></svg>
        <span class="px-2">播放</span>
      </span>
      <span class="dark:hover:bg-neutral-800/40 hover:bg-gray-300/80 flex items-center justify-start">
        <svg class="fill-zinc-900 dark:fill-zinc-200" height="16" viewBox="0 0 1024 1024"
             width="16" xmlns="http://www.w3.org/2000/svg"><path
          d="M655.706179 465.602819L332.053897 218.588294c-38.414608-29.327534-93.791393-1.929039-93.791392 46.396277v494.029051c0 48.325316 55.376785 75.725617 93.791392 46.398084l323.652282-247.014525c30.602722-23.357989 30.602722-69.436372 0-92.794362zM781.064814 780.798397V451.684117v-164.562559c0-19.628152 5.904521-60.475733-17.057907-75.841215-25.523642-17.068744-59.747828 1.210165-59.747828 31.919454v493.676839c0 19.628152-5.915358 60.473927 17.047069 75.841215 25.532673 17.068744 59.758666-1.211971 59.758666-31.919454z">

        </path></svg>
        <span class="px-2">下一首播放</span>
      </span>
      <div
        class="before:absolute before:left-0 before:h-[0.5px] before:w-full before:dark:bg-gray-300/40 before:bg-neutral-800/60"></div>
      <span class="dark:hover:bg-red-800/40 hover:bg-red-500/80 flex items-center justify-start" @click="music_delete">
        <svg class="fill-zinc-900 dark:fill-zinc-200" height="16" viewBox="0 0 1024 1024"
             width="16" xmlns="http://www.w3.org/2000/svg"><path
          d="M256 256h554.666667v640H256V256z m42.666667 42.666667v554.666666h469.333333V298.666667H298.666667z m128 128h42.666666v298.666666h-42.666666v-298.666666z m170.666666 0h42.666667v298.666666h-42.666667v-298.666666zM213.333333 256h640v42.666667H213.333333V256z m213.333334-85.333333h213.333333v42.666666h-213.333333V170.666667z">

        </path></svg>
        <span class="px-2">删除</span>
      </span>
    </div>
  </div>
</template>
