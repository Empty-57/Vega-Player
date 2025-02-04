export function search(f_cacheList,cacheList,searchText = '') {
  // 空值快速返回
  if (!searchText.trim()) {
    f_cacheList.length = 0
    f_cacheList.push(...cacheList);
    return
  }
  // 安全过滤特殊字符并生成高效正则
  const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(
    escaped,
    'i'
  )

  // 单次遍历过滤
  f_cacheList.length = 0
  f_cacheList.push(...cacheList.filter(item => {
    return ['title', 'artist', 'album'].some(field => {
      const value = item[field]
      return typeof value === 'string' && regex.test(value)
    })
  }))
}
