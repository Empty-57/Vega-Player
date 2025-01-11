<script setup>
import {ref, toRaw} from "vue";
import IndexDB from "../assets/indexDB";
import EventBus from "../assets/EventBus";
import {findInsertPosition} from "../assets/BinarySearchPosition";
import MusicList from "./MusicList.vue";
import {useStorage} from "@vueuse/core";

const db = new IndexDB()
const cacheLike_list = ref([])
const like_cfg = useStorage('like_cfg', {sort_key: 'title'})
let sort_key = ref(like_cfg.value.sort_key)


db.init_DB().then(() => {
  db.searchData('', 0, [],'LikesCache').then(data => {
    data.forEach(item => {
      const position = findInsertPosition(cacheLike_list.value, (item[sort_key.value] || 0).toString(), sort_key.value)
      cacheLike_list.value.splice(position, 0, item)
    })
    console.log(cacheLike_list.value)
  })
})

EventBus.on('delete_LikeCache', path => {
  const LikeCacheSet = cacheLike_list.value.map(item => item.path)
  cacheLike_list.value.splice(LikeCacheSet.indexOf(path), 1)
})
EventBus.on('add_LikeCache', item => {
  const position = findInsertPosition(cacheLike_list.value, (item[sort_key.value] || 0).toString(), sort_key.value)
  cacheLike_list.value.splice(position, 0, item)
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

function music_delete(music_local) {
  console.log("music_delete: ", music_local)
  db.init_DB().then(() => {
    db.deleteData(music_local.value.path, 'LikesCache')
    cacheLike_list.value[music_local.value.music_index].isLike = false
    db.addData(toRaw(cacheLike_list.value[music_local.value.music_index]))
    db.close_db()
    cacheLike_list.value.splice(music_local.value.music_index, 1)
    EventBus.emit('set_Like_false', music_local.value.path)
  })
}

</script>

<template>
  <MusicList :cache_list="cacheLike_list" title="喜欢"
             @SwitchLikes="(event ,args) => SwitchLikes(event,args)"
             @music_delete="music_local => music_delete(music_local)"></MusicList>
</template>
