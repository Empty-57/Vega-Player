const LRC_REGEX = /\[(\d{2}):(\d{2}\.\d{2,3})](.*?)(\r?\n|$)/g;
const parseTime = (m, s) => {
  const minutes = parseInt(m, 10);
  const seconds = parseFloat(s);
  return minutes * 60 + seconds;
};
const parseLyrics = (text) => {
  const entries = [];
  let match;
  while ((match = LRC_REGEX.exec(text)) !== null) {
    try {
      entries.push({
        segmentStart: parseTime(match[1], match[2]),
        lyricText: match[3].trim()
      });
    } catch (err) {
      console.warn('Invalid lyric line:', match[0], err.message);
    }
  }
  return entries;
};
function mergeTranslations(parsedLrcData,lyricData_ts,tolerance=0.3){
  // 解析翻译歌词并建立查找队列
  const transQueue = lyricData_ts ? parseLyrics(lyricData_ts) : [];
  let transIndex = 0;  // 翻译指针（按时间顺序推进）

  // 构建最终结果
  return parsedLrcData.map((mainEntry, index) => {
    const nextTime = index < parsedLrcData.length - 1
      ? parsedLrcData[index + 1].segmentStart
      : Infinity;

    // 寻找匹配的翻译（满足：翻译时间 ≤ 主歌词时间(带容差)）
    let translate = '';

    if (!mainEntry.lyricText) {
      return {
        ...mainEntry,
        nextTime,
        translate
      };
    }


    while (transIndex < transQueue.length) {
      const transEntry = transQueue[transIndex];

      // 主时间超前翻译时间(带容差)
      if (mainEntry.segmentStart >= transEntry.segmentStart-tolerance) {
        if (mainEntry.segmentStart <= transEntry.segmentStart + tolerance){
          translate=transEntry.lyricText;
        }
      } else {
        break; // 后续翻译时间更大，停止查找
      }
      transIndex++;
    }
    return {
      ...mainEntry,
      nextTime,
      translate
    };
  });
}
export function parseLrc(lyricData, lyricData_ts) {
  if (!lyricData){return }
  // 解析主歌词（保持原始顺序）
  const mainLyrics = parseLyrics(lyricData || '');

  return  mergeTranslations(mainLyrics, lyricData_ts)
}

export function parseKaraOkLyric(lyricData, lyricData_ts,type) {
  if (!lyricData){return }

  const SEGMENT_REGEX = /\[(\d+),(\d+)](.*?)(\r?\n|$)/g;

  let WORD_REGEX;
  let startIndex;
  let durationIndex;
  let textIndex;
  if (type ==='.yrc'){
    WORD_REGEX = /\((\d+),(\d+),\d+\)[^(]*?((?:.(?!\(\d+,))*.)/g;
    startIndex=1;
    durationIndex=2;
    textIndex=3;
  }
  if (type === '.qrc'){
    WORD_REGEX = /[^(]*?((?:.(?!\(\d+,))*.)\((\d+),(\d+)\)/g;
    startIndex=2;
    durationIndex=3;
    textIndex=1;
  }

  // 毫秒转秒（保留3位小数）
  const msToSec = (ms) => {
    let sec=parseFloat((parseInt(ms, 10) / 1000).toFixed(3))
    if (sec ===0.0){
      sec = 0.01
    }
    return sec;
  };

  const result = [];
  let segmentMatch;

  while ((segmentMatch = SEGMENT_REGEX.exec(lyricData)) !== null) {
    const [_, segStart, segDuration, content] = segmentMatch;
    const words = [];

    let wordMatch;
    while ((wordMatch = WORD_REGEX.exec(content)) !== null) {

      if (msToSec(wordMatch[startIndex])===words[words.length - 1]?.start){
        words[words.length - 1]={
          start: msToSec(wordMatch[startIndex]),
          duration: msToSec(wordMatch[durationIndex]),
          lyricWord: (words[words.length - 1].lyricWord+wordMatch[textIndex]).replace('\n','')
        }
        continue;
      }

      words.push({
        start: msToSec(wordMatch[startIndex]),
        duration: msToSec(wordMatch[durationIndex]),
        lyricWord: wordMatch[textIndex].replace('\n','')
      });
    }
    result.push({
      segmentStart: msToSec(segStart),
      segmentDuration: msToSec(segDuration),
      words,
      lyricText:words?.map(item => item.lyricWord).join(''),
    });
  }

  return mergeTranslations(result, lyricData_ts);
}
