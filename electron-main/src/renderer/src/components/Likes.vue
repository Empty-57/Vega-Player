<script setup>
import {onActivated, ref, toRaw, watch} from 'vue';
import IndexDB from '../assets/indexDB';
import EventBus from '../assets/EventBus';
import {compareSorts, findInsertPosition} from '../assets/BinarySearchPosition';
import MusicList from './MusicList.vue';
import {useStorage} from '@vueuse/core';
import {search} from "../assets/Search.js";

const db = new IndexDB();
const cacheLike_list = ref([]);
const f_cacheLike_list = ref([]);
const like_cfg = useStorage('like_cfg', {sort_key: 'title', isReverse: false});
let sort_key = ref(like_cfg.value.sort_key);
let isReverse = ref(like_cfg.value.isReverse);

db.init_DB().then(() => {
  db.searchData('', 0, [], 'LikesCache').then((data) => {
    cacheLike_list.value.push(...data);
    cacheLike_list.value.sort((item1, item2) =>
      isReverse.value
        ? compareSorts(item2[sort_key.value], item1[sort_key.value])
        : compareSorts(item1[sort_key.value], item2[sort_key.value])
    );
    search(f_cacheLike_list.value,cacheLike_list.value)
  });
});

watch(
  [sort_key, isReverse],
  async () => {
    cacheLike_list.value.sort((item1, item2) =>
      isReverse.value
        ? compareSorts(item2[sort_key.value], item1[sort_key.value])
        : compareSorts(item1[sort_key.value], item2[sort_key.value])
    );
    search(f_cacheLike_list.value,cacheLike_list.value)
  },
  {immediate: true}
);

EventBus.on('delete_LikeCache', (path) => {
  cacheLike_list.value.splice(
    cacheLike_list.value.findIndex((item) => item.path === path),
    1
  );
  search(f_cacheLike_list.value,cacheLike_list.value)
  EventBus.emit('delPlayList', {localName: 'Likes', path: path});
});
EventBus.on('add_LikeCache', (item) => {
  const position = findInsertPosition(cacheLike_list.value, item[sort_key.value], sort_key.value);
  cacheLike_list.value.splice(position, 0, item);
  search(f_cacheLike_list.value,cacheLike_list.value)
  EventBus.emit('updatePlayList', {
    path: item.path,
    title: item.title,
    artist: item.artist,
    localName: 'Likes'
  });
});

EventBus.on('SwitchLikes_like', ({event, args}) => {
  SwitchLikes(event, args);
});

function SwitchLikes(event, args) {
  const cacheLikeIndex = cacheLike_list.value.findIndex((item) => item.path === args.path);
  const f_cacheLikeIndex = f_cacheLike_list.value.findIndex((item) => item.path === args.path);
  console.log('likes: ', toRaw(cacheLike_list.value[cacheLikeIndex]));
  db.deleteData(args.path, 'LikesCache');
  cacheLike_list.value[cacheLikeIndex].isLike = false;
  db.addData(toRaw(cacheLike_list.value[cacheLikeIndex]));

  cacheLike_list.value.splice(cacheLikeIndex, 1);
  f_cacheLike_list.value.splice(f_cacheLikeIndex, 1);
  EventBus.emit('set_Like_false', args.path);
  EventBus.emit('delPlayList', {localName: 'Likes', path: args.path});
}

onActivated(() => {
  search(f_cacheLike_list.value,cacheLike_list.value)
});

function music_delete(path) {
  const cacheLikeIndex = cacheLike_list.value.findIndex((item) => item.path === path);
  const f_cacheLikeIndex = f_cacheLike_list.value.findIndex((item) => item.path === path);

  db.deleteData(path, 'LikesCache');
  cacheLike_list.value[cacheLikeIndex].isLike = false;
  db.addData(toRaw(cacheLike_list.value[cacheLikeIndex]));

  cacheLike_list.value.splice(cacheLikeIndex, 1);
  f_cacheLike_list.value.splice(f_cacheLikeIndex, 1);
  EventBus.emit('set_Like_false', path);

  EventBus.emit('delPlayList', {localName: 'Likes', path: path});
}

function select_sort(key_) {
  like_cfg.value.sort_key = key_;
  sort_key.value = key_;
}

function sw_reverse() {
  isReverse.value = !isReverse.value;
  like_cfg.value.isReverse = isReverse.value;
}

function mulDelete(list) {
  list.forEach((path) => {
    music_delete(path);
  });
}

EventBus.on('syncCache', args => {
  if (cacheLike_list.value.find(item => item.path === args.path)) {
    cacheLike_list.value.find(item => item.path === args.path).title = args.title;
    cacheLike_list.value.find(item => item.path === args.path).artist = args.artist;
    cacheLike_list.value.find(item => item.path === args.path).album = args.album;
    search(f_cacheLike_list.value,cacheLike_list.value)
  }

})

</script>

<template>
  <MusicList
    :cache_list="f_cacheLike_list"
    :full-cache-list="cacheLike_list"
    :is-reverse="isReverse"
    :sort_key="sort_key"
    :title="'喜欢 ' + cacheLike_list.length + ' 首'"
    local-name="Likes"
    @SwitchLikes="(event, args) => SwitchLikes(event, args)"
    @mulDelete="(list) => mulDelete(list)"
    @music_delete="(path) => music_delete(path)"
    @search="(search_text) => search(f_cacheLike_list,cacheLike_list,search_text)"
    @select_sort="(key_) => select_sort(key_)"
    @sw_reverse="sw_reverse"
  ></MusicList>
</template>
