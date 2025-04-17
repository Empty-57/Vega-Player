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
function mergeTranslations(parsedLrcData,lyricData_ts,type='.lrc',tolerance=0.3){
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

    const getTranslate=type !=='.qrc'? transEntry => transEntry.lyricText : transEntry => {
      if (transEntry.lyricText==='//'){
        return ' '
      }
      return  transEntry.lyricText
    }

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
          translate=getTranslate(transEntry);
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

const msToSec = (ms) => {
  return parseFloat((parseInt(ms, 10) / 1000).toFixed(3));
};

const getWordRegexConfig=(type) => {
  const CONFIG_MAP = {
    '.yrc': {
      regex: /\((\d+),(\d+),\d+\)[^(]*?((?:.(?!\(\d+,))*.)/g,
      indices: { start: 1, duration: 2, text: 3 }
    },
    '.qrc': {
      regex: /[^(]*?((?:.(?!\(\d+,))*.)\((\d+),(\d+)\)/g,
      indices: { start: 2, duration: 3, text: 1 }
    }
  };
  return CONFIG_MAP[type] || null;
};

const shouldMergeWords = (current, last) => (
  current.start === last.start ||
  (current.duration <= 0.06 ||last.duration <= 0.06  && last.start)
);

const extractWordData = (match, indices) => ({
  start: msToSec(match[indices.start]),
  duration: msToSec(match[indices.duration]),
  lyricWord: match[indices.text].replace('\n', '')
});

const mergeWords = (lastWord, current) => ({
  start: lastWord.start,
  duration: lastWord.duration + current.duration,
  lyricWord: lastWord.lyricWord + current.lyricWord
});

const processWords = (content, wordRegex, indices) => {
  const words = [];

  let wordMatch;
  while ((wordMatch = wordRegex.exec(content)) !== null) {
    const lastWord = words[words.length - 1];
    const current = extractWordData(wordMatch, indices);

    if (lastWord&&shouldMergeWords(current,lastWord)){
      if (lastWord.duration+lastWord.start<current.start){
        words.push(current);
      }else{
        words[words.length - 1] = mergeWords(lastWord,current);
      }
    }else{
      words.push(current);
    }
  }
  return words;
};

export function parseKaraOkLyric(lyricData, lyricData_ts,type) {
  if (!lyricData) return;

  const SEGMENT_REGEX = /\[(\d+),(\d+)](.*?)(\r?\n|$)/g;

  const regexConfig = getWordRegexConfig(type);
  if (!regexConfig) return;

  const { regex: WORD_REGEX, indices } = regexConfig;

  const result = [];
  let segmentMatch;

  while ((segmentMatch = SEGMENT_REGEX.exec(lyricData)) !== null) {
    const [_, segStart, segDuration, content] = segmentMatch;
    const words=processWords(content,WORD_REGEX,indices);
    result.push({
      segmentStart: msToSec(segStart),
      segmentDuration: msToSec(segDuration),
      words,
      lyricText:words?.map(item => item.lyricWord).join(''),
    });
  }

  return mergeTranslations(result, lyricData_ts,type);
}
