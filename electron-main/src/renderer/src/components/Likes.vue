<script setup>
import {computed, onActivated, ref, toRaw, watch} from "vue";
import IndexDB from "../assets/indexDB";
import EventBus from "../assets/EventBus";
import {findInsertPosition} from "../assets/BinarySearchPosition";
import MusicList from "./MusicList.vue";
import {useStorage} from "@vueuse/core";

const db = new IndexDB()
const cacheLike_list = ref([])
const like_cfg = useStorage('like_cfg', {sort_key: 'title', isReverse: false})
let sort_key = ref(like_cfg.value.sort_key)
let isReverse = ref(like_cfg.value.isReverse)

watch([sort_key, isReverse], async () => {
  cacheLike_list.value.length = 0;
  db.init_DB().then(() => {
    db.searchData('', 0, [], 'LikesCache').then(data => {
      data.forEach(item => {
        const position = findInsertPosition(cacheLike_list.value, (item[sort_key.value] || 0).toString(), sort_key.value)
        cacheLike_list.value.splice(position, 0, item)
      })
      if (isReverse.value) {
        cacheLike_list.value.reverse()
      }
      search()
    })
  })
}, {immediate: true})

EventBus.on('delete_LikeCache', path => {
  const LikeCacheSet = cacheLike_list.value.map(item => item.path)
  cacheLike_list.value.splice(LikeCacheSet.indexOf(path), 1)
})
EventBus.on('add_LikeCache', item => {
  const position = findInsertPosition(cacheLike_list.value, (item[sort_key.value] || 0).toString(), sort_key.value)
  cacheLike_list.value.splice(position, 0, item)
})

function SwitchLikes(event, args) {
  const LikeCacheSet = cacheLike_list.value.map(item => item.path)
  const f_CacheSet = f_cacheLike_list.value.map(item => item.path)
  console.log('likes: ', toRaw(cacheLike_list.value[LikeCacheSet.indexOf(args.path)]))
  db.init_DB().then(() => {
    db.deleteData(args.path, 'LikesCache')
    cacheLike_list.value[LikeCacheSet.indexOf(args.path)].isLike = false
    db.addData(toRaw(cacheLike_list.value[LikeCacheSet.indexOf(args.path)]))
    db.close_db()
    cacheLike_list.value.splice(LikeCacheSet.indexOf(args.path), 1)
    f_cacheLike_list.value.splice(f_CacheSet.indexOf(args.path), 1)
    EventBus.emit('set_Like_false', args.path)
  })
}

onActivated(() => {
  search()
})

function music_delete(music_local) {
  const LikeCacheSet = cacheLike_list.value.map(item => item.path)
  const f_CacheSet = f_cacheLike_list.value.map(item => item.path)
  console.log("music_delete: ", music_local)
  db.init_DB().then(() => {
    db.deleteData(music_local.value.path, 'LikesCache')
    cacheLike_list.value[LikeCacheSet.indexOf(music_local.value.path)].isLike = false
    db.addData(toRaw(cacheLike_list.value[LikeCacheSet.indexOf(music_local.value.path)]))
    db.close_db()
    cacheLike_list.value.splice(LikeCacheSet.indexOf(music_local.value.path), 1)
    f_cacheLike_list.value.splice(f_CacheSet.indexOf(music_local.value.path), 1)
    EventBus.emit('set_Like_false', music_local.value.path)
  })
}

function select_sort(key_) {
  like_cfg.value.sort_key = key_
  sort_key.value = key_
}

function sw_reverse() {
  isReverse.value = !isReverse.value
  like_cfg.value.isReverse = isReverse.value
}

const f_cacheLike_list = ref([]);

function search(search_text = '') {
  const regex = new RegExp(search_text.split('').join('|'), 'i');
  f_cacheLike_list.value.length = 0;
  f_cacheLike_list.value.push(...computed(() => {
    return cacheLike_list.value.filter(item => (item.title && regex.test(item.title)) ||
      (item.artist && regex.test(item.artist)) ||
      (item.album && regex.test(item.album)))
  }).value)
}

</script>

<template>
  <MusicList :cache_list="f_cacheLike_list" :is-reverse="isReverse" :sort_key="sort_key" title="喜欢"
             @SwitchLikes="(event ,args) => SwitchLikes(event,args)"
             @music_delete="music_local => music_delete(music_local)"
             @search="search_text=>search(search_text)"
             @select_sort="key_ => select_sort(key_)"
             @sw_reverse="sw_reverse"></MusicList>
</template>
