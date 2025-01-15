function compareSorts(str1, str2) {
  if (!str1 && !str2) return 0;
  if (!str1) return 1;
  if (!str2) return -1;
  return str1.toString().localeCompare(str2, 'en', {
    sensitivity: 'case',
    ignorePunctuation: true,
    numeric: true,
    caseFirst: "upper",
    collation: "pinyin"
  });
}

export function findInsertPosition(array, str, sort_key) {
  let left = 0;
  let right = array.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const comparison = compareSorts(str, array[mid][sort_key]);

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
