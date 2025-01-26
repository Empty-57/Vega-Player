<script setup>
import {computed, onActivated, ref, toRaw, watch} from 'vue';
import IndexDB from '../assets/indexDB';
import EventBus from '../assets/EventBus';
import {compareSorts, findInsertPosition} from '../assets/BinarySearchPosition';
import MusicList from './MusicList.vue';
import {useStorage} from '@vueuse/core';

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
    search();
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
    search();
  },
  {immediate: true}
);

EventBus.on('delete_LikeCache', path => {
  cacheLike_list.value.splice(
    cacheLike_list.value.findIndex((item) => item.path === path),
    1
  );
  search();
  EventBus.emit('delPlayList', {localName: 'Likes', path: path});
});
EventBus.on('add_LikeCache', item => {
  const position = findInsertPosition(cacheLike_list.value, item[sort_key.value], sort_key.value);
  cacheLike_list.value.splice(position, 0, item);
  search();
});

EventBus.on('SwitchLikes_like', ({event, args}) => {
  SwitchLikes(event, args)
})

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
  search();
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

function search(search_text = '') {
  const regex = new RegExp(search_text.split('').join(''), 'i');
  f_cacheLike_list.value.length = 0;
  f_cacheLike_list.value.push(
    ...computed(() => {
      return cacheLike_list.value.filter(
        (item) =>
          (item.title && regex.test(item.title)) ||
          (item.artist && regex.test(item.artist)) ||
          (item.album && regex.test(item.album))
      );
    }).value
  );
}

function mulDelete(list) {
  list.forEach((path) => {
    music_delete(path);
  });
}
</script>

<template>
  <MusicList
    :cache_list="f_cacheLike_list"
    :is-reverse="isReverse"
    :sort_key="sort_key"
    :title="'喜欢 ' + cacheLike_list.length + ' 首'"
    local-name="Likes"
    @SwitchLikes="(event, args) => SwitchLikes(event, args)"
    @mulDelete="(list) => mulDelete(list)"
    @music_delete="(path) => music_delete(path)"
    @search="(search_text) => search(search_text)"
    @select_sort="(key_) => select_sort(key_)"
    @sw_reverse="sw_reverse"
  ></MusicList>
</template>
