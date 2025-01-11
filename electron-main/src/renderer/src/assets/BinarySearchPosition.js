export function findInsertPosition(array, str, sort_key) {
  let left = 0;
  let right = array.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const comparison = str.localeCompare(array[mid][sort_key] || '', 'en', {
      sensitivity: 'base',
      ignorePunctuation: true,
      numeric: true,
      caseFirst: "upper",
      collation: "pinyin"
    });

    if (comparison === 0) {
      return mid;
    } else if (comparison < 0) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  return left;
}
