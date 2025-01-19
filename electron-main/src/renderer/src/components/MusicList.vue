<script setup>
import placeholder from "../assets/placeholder.jpg";
import FloatLocalTopBtn from "./FloatLocalTopBtn.vue";
import {nextTick, onDeactivated, onWatcherCleanup, ref, useTemplateRef, watchEffect} from "vue";
import {useScroll, useVirtualList} from "@vueuse/core";
import {vOnClickOutside} from "@vueuse/components";
import EventBus from "../assets/EventBus";

const emit = defineEmits(["SwitchLikes", "music_delete", "select_sort", "sw_reverse", "search"])
const {cache_list, title, sort_key, isReverse} = defineProps(["cache_list", "title", "sort_key", "isReverse"]);

let timer = null;
let timer2 = null;
const search_box = useTemplateRef('search_box')
const search_btn = useTemplateRef('search_btn')
const isFocused = ref(false)
const search_text = ref('')
const music_dropdown = ref(false)
const music_menu = useTemplateRef('music_menu')
const music_local = ref({
  x: 0,
  y: 0,
  path: '',
  music_index: 0,
  isLike: false,
})
const {list, containerProps, wrapperProps} = useVirtualList(
  cache_list,
  {
    itemHeight: 56,
    overscan: 2,
  })
const music_list = containerProps.ref
const {arrivedState} = useScroll(music_list)


watchEffect(() => {
  const list_ = list.value
  timer2 = setTimeout(() => {
    list_.forEach((item, index) => {
      if (list.value[index] && list.value[index].data.src) {
        return;
      }
      window.electron.ipcRenderer.invoke("getCovers", item.data.path).then(src => {
        if (list.value[index]) {
          list.value[index].data.src = src;
        }
      })
    })
  }, 300)
  onWatcherCleanup(() => {
    clearTimeout(timer2)
  })
})

onDeactivated(() => {
  isFocused.value = false
  search_text.value = ''
  search_btn.value.checked = false
})

EventBus.on('load_start', () => {
  music_local.value.scrollTop = 0
})

function SwitchLikes(event, args) {
  emit("SwitchLikes", event, args)
}

function music_delete() {
  emit("music_delete", music_local)
  music_dropdown.value = false
}

async function click_menu(event, args) {
  music_dropdown.value = !music_dropdown.value;
  await nextTick(() => {
    music_local.value.x = event.clientX - 6;
    music_local.value.y = event.clientY - music_menu.value.clientHeight - 6;
    music_local.value.path = args.path;
    music_local.value.music_index = args.index
    music_local.value.isLike = args.isLike;
  })
}

function select_sort(sort_key) {
  emit("select_sort", sort_key)
}

function sw_reverse() {
  emit("sw_reverse")
}


watchEffect(() => {
  const search_text_ = search_text.value
  timer = setTimeout(() => {
    emit("search", search_text_);
  }, 300)
  onWatcherCleanup(() => {
    clearTimeout(timer)
  })
})

function sw_search(e) {
  if (e.target.checked) {
    isFocused.value = true;
    search_box.value.focus()
  } else {
    isFocused.value = false;
    search_text.value = ''
  }
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
      class="select-none text-zinc-900 dark:text-zinc-200 text-2xl basis-1/6 flex items-center justify-center font-semibold px-4 pt-4">{{
        title
      }}</span>
    <div class="w-full basis-1/12 flex items-center justify-start gap-x-4 px-4">
      <slot></slot>
      <span>mul_action</span>
      <span>view</span>
      <span class="grow"></span>
      <div class="flex items-center justify-center gap-x-2">
        <input ref="search_box"
               v-model="search_text"
               :class="{'w-36 p-1 px-2':isFocused,'w-0 p-0':!isFocused}"
               class=" text-zinc-900  dark:text-zinc-200 dark:bg-neutral-900/40 bg-gray-300/80 peer placeholder:italic placeholder:text-xs rounded h-8 outline-none text-xs duration-200"
               placeholder="搜索歌单歌曲">

        <label class="swap swap-rotate *:dark:hover:fill-cyan-600 *:hover:fill-cyan-500">
          <input ref="search_btn" class="outline-none" type="checkbox" @change="sw_search"/>
          <svg class="swap-off fill-zinc-900 dark:fill-zinc-200 "
               height="16"
               viewBox="0 0 1024 1024" width="16" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M966.4 924.8l-230.4-227.2c60.8-67.2 96-156.8 96-256 0-217.6-176-390.4-390.4-390.4-217.6 0-390.4 176-390.4 390.4 0 217.6 176 390.4 390.4 390.4 99.2 0 188.8-35.2 256-96l230.4 227.2c9.6 9.6 28.8 9.6 38.4 0C979.2 950.4 979.2 934.4 966.4 924.8zM102.4 441.6c0-185.6 150.4-339.2 339.2-339.2s339.2 150.4 339.2 339.2c0 89.6-35.2 172.8-92.8 233.6-3.2 0-3.2 3.2-6.4 3.2-3.2 3.2-3.2 3.2-3.2 6.4-60.8 57.6-144 92.8-233.6 92.8C256 780.8 102.4 627.2 102.4 441.6z">
            </path>
          </svg>
          <svg class="swap-on fill-zinc-900 dark:fill-zinc-200" height="16"
               viewBox="0 0 1024 1024" width="16" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M851.416 217.84l-45.256-45.248L512 466.744l-294.152-294.16-45.256 45.256L466.744 512l-294.152 294.16 45.248 45.256L512 557.256l294.16 294.16 45.256-45.256L557.256 512z">

            </path>
          </svg>
        </label>
      </div>
      <div class="dropdown dropdown-end">
        <button
          :class="{'pointer-events-none': isFocused}"
          class="flex items-center justify-center pr-2 rounded duration-200 outline-none"
          tabindex="0">
          <svg class="fill-zinc-900 dark:fill-zinc-200 dark:hover:fill-cyan-600 hover:fill-cyan-500"
               height="18" viewBox="0 0 1024 1024" width="18" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M419.84 563.2h-202.752l-67.584 133.12c-6.144 10.24-18.432 14.336-26.624 8.192-10.24-6.144-14.336-18.432-8.192-26.624l180.224-356.352c12.288-24.576 43.008-24.576 55.296 0l169.984 356.352c4.096 10.24 0 22.528-10.24 26.624-10.24 4.096-22.528 0-26.624-10.24l-63.488-131.072z m-18.432-40.96l-77.824-163.84-83.968 163.84h161.792z m161.792 114.688l268.288-278.528H583.68c-12.288 0-20.48-8.192-20.48-20.48s8.192-20.48 20.48-20.48h276.48c28.672 0 40.96 28.672 20.48 49.152l-268.288 278.528h268.288c12.288 0 20.48 8.192 20.48 20.48s-8.192 20.48-20.48 20.48H583.68c-28.672 0-40.96-28.672-20.48-49.152z m-40.96-534.528l102.4 122.88h-204.8l102.4-122.88z m0 819.2l-102.4-122.88h204.8l-102.4 122.88z">
            </path>
          </svg>
        </button>
        <ul
          class="w-24 p-0 py-2 dropdown-content menu shadow-xl dark:bg-neutral-900 bg-gray-200 *:text-zinc-900 *:dark:text-zinc-300 rounded *:text-[10px]"
          tabindex="0">
          <li>
            <a
              :class="{'text-cyan-500 dark:bg-neutral-700/30 bg-neutral-400/20':sort_key==='title'}"
              class="dark:hover:bg-neutral-700/40 hover:bg-neutral-400/20 active:bg-transparent active:text-inherit p-2 h-8 rounded-none"
              @click="select_sort('title')">
              标题
            </a>
          </li>
          <li>
            <a
              :class="{'text-cyan-500 dark:bg-neutral-700/30 bg-neutral-400/20':sort_key==='artist'}"
              class="dark:hover:bg-neutral-700/40 hover:bg-neutral-400/20 active:bg-transparent active:text-inherit p-2 h-8 rounded-none"
              @click="select_sort('artist')">
              艺术家
            </a>
          </li>
          <li>
            <a
              :class="{'text-cyan-500 dark:bg-neutral-700/30 bg-neutral-400/20':sort_key==='album'}"
              class="dark:hover:bg-neutral-700/40 hover:bg-neutral-400/20 active:bg-transparent active:text-inherit p-2 h-8 rounded-none"
              @click="select_sort('album')">
              专辑
            </a>
          </li>
          <li>
            <a
              :class="{'text-cyan-500 dark:bg-neutral-700/30 bg-neutral-400/20':sort_key==='duration'}"
              class="dark:hover:bg-neutral-700/40 hover:bg-neutral-400/20 active:bg-transparent active:text-inherit p-2 h-8 rounded-none"
              @click="select_sort('duration')">
              时长
            </a>
          </li>
          <li>
            <div
              class="hover:bg-transparent active:bg-transparent hover:cursor-default before:absolute before:left-0 before:h-[0.5px] before:w-full before:dark:bg-gray-300/40 before:bg-neutral-800/60"></div>
          </li>
          <li>
            <span
              class="rounded-none active:text-inherit p-2 h-8 dark:hover:bg-neutral-700/40 hover:bg-neutral-400/20 active:bg-transparent"
              @click="sw_reverse">
              <svg v-if="isReverse" class="fill-zinc-900 dark:fill-zinc-200" height="16"
                   viewBox="0 0 1024 1024" width="16" xmlns="http://www.w3.org/2000/svg"><path
                d="M392.533333 806.4L85.333333 503.466667l59.733334-59.733334 247.466666 247.466667L866.133333 213.333333l59.733334 59.733334L392.533333 806.4z">

              </path></svg>
        <span>倒序</span>
      </span>
          </li>
        </ul>
      </div>
    </div>
    <div
      class="dark:bg-zinc-800 bg-zinc-200 flex items-center justify-start w-full h-fit *:text-[10px] px-6 pr-8 *:select-none *:text-zinc-900 *:dark:text-zinc-400">
      <span class="w-0 flex-auto mr-4 max-w-[25%]">歌曲/艺术家</span>
      <span class="w-16 text-xs mx-8 mr-16"></span>
      <span class="w-0 flex-auto text-left">专辑</span>
      <span class="w-8 mr-7">时长</span>
    </div>
    <div class="basis-2/3 w-full overflow-x-hidden overflow-y-scroll p-4 pb-0" v-bind="containerProps">
      <div class="w-full flex flex-col items-start justify-start" v-bind="wrapperProps">
        <div
          v-for="metadata in list" :key="metadata.data.path"
          class="*:select-none flex items-center justify-start dark:even:bg-zinc-800 dark:odd:bg-zinc-900/40 even:bg-zinc-200 odd:bg-zinc-300/60 dark:hover:bg-zinc-950/60 hover:bg-zinc-400/40 w-full h-14 p-2 *:text-zinc-900 rounded duration-200 hover:cursor-pointer">
          <img
            :src="metadata.data.src? metadata.data.src:placeholder"
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
                @click="click_menu($event,{path:metadata.data.path,index:metadata.index,isLike:metadata.data.isLike})">
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
