export function findInsertPosition(array, sort_key) {
  let left = 0;
  let right = array.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const comparison = sort_key.localeCompare(array[mid].title, 'en', {
      sensitivity: 'base',
      ignorePunctuation: true,
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
