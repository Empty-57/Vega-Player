export function debounce(fn, delay) {
  let time = null
  return function () {
    if (time !== null) {
      clearTimeout(time);
    }
    time = setTimeout(() => {
      fn.call(this, arguments);
    }, delay)
  }
}
