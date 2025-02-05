import {createNoise2D} from "simplex-noise";

let noise2D = createNoise2D();

function lerp(start, end, t) {
  return start + t * (end - start);
}

// 获取颜色的插值（渐变色）
function lerpColor(color1, color2, t) {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function lerpColorMulti(colors, t) {
  const numColors = colors.length;
  // 将 t 映射到 [0, numColors - 1] 范围
  const scaledT = t * (numColors - 1);
  const colorIndex1 = Math.floor(scaledT);
  const colorIndex2 = Math.min(colorIndex1 + 1, numColors - 1);  // 保证不会越界
  const lerpT = scaledT - colorIndex1;  // 当前段的插值比率
  return lerpColor(colors[colorIndex1], colors[colorIndex2], lerpT);
}

function fbm(x, y, f = 1, a = 1, octaves = 4, f_gain = 2.0, a_gain = 0.5) {
  // f_gain:2的倍数
  // a_gain:2的倒数倍数
  let total = 0;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    total += noise2D(x * f, y * f) * a;
    maxValue += a;
    a *= a_gain;
    f *= f_gain;
  }
  // 将噪声值从 [-maxValue, maxValue] 映射到 [-1, 1]
  return total / maxValue;
}

export function generateNoise(width, height, colors) {
  noise2D = createNoise2D();
  const newGrid = [];
  for (let y = 0; y < height; y++) {
    newGrid[y] = [];
    for (let x = 0; x < width; x++) {
      const fbmValue = fbm(x, y, 0.00625, 8, 8, 1.0625, 0.875);
      const t = (fbmValue + 1) / 2; // 噪声值转换为 0 到 1 之间的值
      newGrid[y][x] = lerpColorMulti(colors, t);  // 存储渐变色
    }
  }
  return newGrid;
}
