//代码来自：https://github.com/chenmozhijin/LDDC/blob/main/LDDC/backend/decryptor


import {inflate} from "zlib";

import {promisify} from "util";

const PromiseInflate = promisify(inflate);

const ENCRYPT = 1
const DECRYPT = 0

const QRC_KEY = Buffer.from("!@#)(*$%123ZXC!@!@#)(NHL");
// const KRC_KEY = Buffer.from("@Gaw^2tGQ61-\xce\xd2ni");



const PRIVKEY = new Uint8Array([
  0xc3, 0x4a, 0xd6, 0xca, 0x90, 0x67, 0xf7, 0x52,
  0xd8, 0xa1, 0x66, 0x62, 0x9f, 0x5b, 0x09, 0x00,
  0xc3, 0x5e, 0x95, 0x23, 0x9f, 0x13, 0x11, 0x7e,
  0xd8, 0x92, 0x3f, 0xbc, 0x90, 0xbb, 0x74, 0x0e,
  0xc3, 0x47, 0x74, 0x3d, 0x90, 0xaa, 0x3f, 0x51,
  0xd8, 0xf4, 0x11, 0x84, 0x9f, 0xde, 0x95, 0x1d,
  0xc3, 0xc6, 0x09, 0xd5, 0x9f, 0xfa, 0x66, 0xf9,
  0xd8, 0xf0, 0xf7, 0xa0, 0x90, 0xa1, 0xd6, 0xf3,
  0xc3, 0xf3, 0xd6, 0xa1, 0x90, 0xa0, 0xf7, 0xf0,
  0xd8, 0xf9, 0x66, 0xfa, 0x9f, 0xd5, 0x09, 0xc6,
  0xc3, 0x1d, 0x95, 0xde, 0x9f, 0x84, 0x11, 0xf4,
  0xd8, 0x51, 0x3f, 0xaa, 0x90, 0x3d, 0x74, 0x47,
  0xc3, 0x0e, 0x74, 0xbb, 0x90, 0xbc, 0x3f, 0x92,
  0xd8, 0x7e, 0x11, 0x13, 0x9f, 0x23, 0x95, 0x5e,
  0xc3, 0x00, 0x09, 0x5b, 0x9f, 0x62, 0x66, 0xa1,
  0xd8, 0x52, 0xf7, 0x67, 0x90, 0xca, 0xd6, 0x4a,
]);

const sbox = [
  [ // sbox1
    14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7,
    0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8,
    4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0,
    15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13
  ],
  [ // sbox2
    15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10,
    3,13,4,7,15,2,8,15,12,0,1,10,6,9,11,5,
    0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15,
    13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9
  ],
  [ // sbox3
    10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8,
    13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1,
    13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7,
    1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12
  ],
  [ // sbox4
    7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15,
    13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9,
    10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4,
    3,15,0,6,10,10,13,8,9,4,5,11,12,7,2,14
  ],
  [ // sbox5
    2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9,
    14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6,
    4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14,
    11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3
  ],
  [ // sbox6
    12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11,
    10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8,
    9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6,
    4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13
  ],
  [ // sbox7
    4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1,
    13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6,
    1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2,
    6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12
  ],
  [ // sbox8
    13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7,
    1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2,
    7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8,
    2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11
  ]
];


function bitnum(a, b, c) {
  const pos = Math.floor(b / 32) * 4 + 3 - Math.floor((b % 32) / 8);
  return ((a[pos] >>> (7 - b % 8)) & 1) << c;
}

function bitnum_intr(a, b, c) {
  return ((a >>> (31 - b)) & 1) << c;
}

function bitnum_intl(a, b, c) {
  return ((a << b) & 0x80000000) >>> c;
}

function sbox_bit(a) {
  return (a & 32) | ((a & 31) >>> 1) | ((a & 1) << 4);
}


function initial_permutation(input_data) {
  let s0 = 0, s1 = 0;

  // s0 calculation
  s0 |= bitnum(input_data, 57, 31); s0 |= bitnum(input_data, 49, 30);
  s0 |= bitnum(input_data, 41, 29); s0 |= bitnum(input_data, 33, 28);
  s0 |= bitnum(input_data, 25, 27); s0 |= bitnum(input_data, 17, 26);
  s0 |= bitnum(input_data, 9, 25);  s0 |= bitnum(input_data, 1, 24);
  s0 |= bitnum(input_data, 59, 23); s0 |= bitnum(input_data, 51, 22);
  s0 |= bitnum(input_data, 43, 21); s0 |= bitnum(input_data, 35, 20);
  s0 |= bitnum(input_data, 27, 19); s0 |= bitnum(input_data, 19, 18);
  s0 |= bitnum(input_data, 11, 17); s0 |= bitnum(input_data, 3, 16);
  s0 |= bitnum(input_data, 61, 15); s0 |= bitnum(input_data, 53, 14);
  s0 |= bitnum(input_data, 45, 13); s0 |= bitnum(input_data, 37, 12);
  s0 |= bitnum(input_data, 29, 11); s0 |= bitnum(input_data, 21, 10);
  s0 |= bitnum(input_data, 13, 9);  s0 |= bitnum(input_data, 5, 8);
  s0 |= bitnum(input_data, 63, 7);  s0 |= bitnum(input_data, 55, 6);
  s0 |= bitnum(input_data, 47, 5);  s0 |= bitnum(input_data, 39, 4);
  s0 |= bitnum(input_data, 31, 3);  s0 |= bitnum(input_data, 23, 2);
  s0 |= bitnum(input_data, 15, 1);  s0 |= bitnum(input_data, 7, 0);

  // s1 calculation
  s1 |= bitnum(input_data, 56, 31); s1 |= bitnum(input_data, 48, 30);
  s1 |= bitnum(input_data, 40, 29); s1 |= bitnum(input_data, 32, 28);
  s1 |= bitnum(input_data, 24, 27); s1 |= bitnum(input_data, 16, 26);
  s1 |= bitnum(input_data, 8, 25);  s1 |= bitnum(input_data, 0, 24);
  s1 |= bitnum(input_data, 58, 23); s1 |= bitnum(input_data, 50, 22);
  s1 |= bitnum(input_data, 42, 21); s1 |= bitnum(input_data, 34, 20);
  s1 |= bitnum(input_data, 26, 19); s1 |= bitnum(input_data, 18, 18);
  s1 |= bitnum(input_data, 10, 17); s1 |= bitnum(input_data, 2, 16);
  s1 |= bitnum(input_data, 60, 15); s1 |= bitnum(input_data, 52, 14);
  s1 |= bitnum(input_data, 44, 13); s1 |= bitnum(input_data, 36, 12);
  s1 |= bitnum(input_data, 28, 11); s1 |= bitnum(input_data, 20, 10);
  s1 |= bitnum(input_data, 12, 9);  s1 |= bitnum(input_data, 4, 8);
  s1 |= bitnum(input_data, 62, 7);  s1 |= bitnum(input_data, 54, 6);
  s1 |= bitnum(input_data, 46, 5);  s1 |= bitnum(input_data, 38, 4);
  s1 |= bitnum(input_data, 30, 3);  s1 |= bitnum(input_data, 22, 2);
  s1 |= bitnum(input_data, 14, 1);  s1 |= bitnum(input_data, 6, 0);

  return [s0 >>> 0, s1 >>> 0]; // 转换为无符号32位整数
}

function inverse_permutation(s0, s1) {
  const data = new Uint8Array(8);

  data[3] = (
    bitnum_intr(s1,7,7) | bitnum_intr(s0,7,6) | bitnum_intr(s1,15,5) |
    bitnum_intr(s0,15,4) | bitnum_intr(s1,23,3) | bitnum_intr(s0,23,2) |
    bitnum_intr(s1,31,1) | bitnum_intr(s0,31,0)
  );

  data[2] = (
    bitnum_intr(s1,6,7) | bitnum_intr(s0,6,6) | bitnum_intr(s1,14,5) |
    bitnum_intr(s0,14,4) | bitnum_intr(s1,22,3) | bitnum_intr(s0,22,2) |
    bitnum_intr(s1,30,1) | bitnum_intr(s0,30,0)
  );

  data[1] = (
    bitnum_intr(s1,5,7) | bitnum_intr(s0,5,6) | bitnum_intr(s1,13,5) |
    bitnum_intr(s0,13,4) | bitnum_intr(s1,21,3) | bitnum_intr(s0,21,2) |
    bitnum_intr(s1,29,1) | bitnum_intr(s0,29,0)
  );

  data[0] = (
    bitnum_intr(s1,4,7) | bitnum_intr(s0,4,6) | bitnum_intr(s1,12,5) |
    bitnum_intr(s0,12,4) | bitnum_intr(s1,20,3) | bitnum_intr(s0,20,2) |
    bitnum_intr(s1,28,1) | bitnum_intr(s0,28,0)
  );

  data[7] = (
    bitnum_intr(s1,3,7) | bitnum_intr(s0,3,6) | bitnum_intr(s1,11,5) |
    bitnum_intr(s0,11,4) | bitnum_intr(s1,19,3) | bitnum_intr(s0,19,2) |
    bitnum_intr(s1,27,1) | bitnum_intr(s0,27,0)
  );

  data[6] = (
    bitnum_intr(s1,2,7) | bitnum_intr(s0,2,6) | bitnum_intr(s1,10,5) |
    bitnum_intr(s0,10,4) | bitnum_intr(s1,18,3) | bitnum_intr(s0,18,2) |
    bitnum_intr(s1,26,1) | bitnum_intr(s0,26,0)
  );

  data[5] = (
    bitnum_intr(s1,1,7) | bitnum_intr(s0,1,6) | bitnum_intr(s1,9,5) |
    bitnum_intr(s0,9,4) | bitnum_intr(s1,17,3) | bitnum_intr(s0,17,2) |
    bitnum_intr(s1,25,1) | bitnum_intr(s0,25,0)
  );

  data[4] = (
    bitnum_intr(s1,0,7) | bitnum_intr(s0,0,6) | bitnum_intr(s1,8,5) |
    bitnum_intr(s0,8,4) | bitnum_intr(s1,16,3) | bitnum_intr(s0,16,2) |
    bitnum_intr(s1,24,1) | bitnum_intr(s0,24,0)
  );

  return data;
}

function f(state,key){
const t1 = (bitnum_intl(state, 31, 0) | ((state & 0xf0000000) >>> 1) | bitnum_intl(state, 4, 5) |
  bitnum_intl(state, 3, 6) | ((state & 0x0f000000) >>> 3) | bitnum_intl(state, 8, 11) |
  bitnum_intl(state, 7, 12) | ((state & 0x00f00000) >>> 5) | bitnum_intl(state, 12, 17) |
  bitnum_intl(state, 11, 18) | ((state & 0x000f0000) >>> 7) | bitnum_intl(state, 16, 23))

  const t2=(bitnum_intl(state, 15, 0) | ((state & 0x0000f000) << 15) | bitnum_intl(state, 20, 5) |
  bitnum_intl(state, 19, 6) | ((state & 0x00000f00) << 13) | bitnum_intl(state, 24, 11) |
  bitnum_intl(state, 23, 12) | ((state & 0x000000f0) << 11) | bitnum_intl(state, 28, 17) |
  bitnum_intl(state, 27, 18) | ((state & 0x0000000f) << 9) | bitnum_intl(state, 0, 23))

  const lrgstate_ = [
    (t1 >>> 24) & 0x000000ff, (t1 >>> 16) & 0x000000ff, (t1 >>> 8) & 0x000000ff,
    (t2 >>> 24) & 0x000000ff, (t2 >>> 16) & 0x000000ff, (t2 >>> 8) & 0x000000ff,
  ]

  const lrgstate=[]


  for (let i = 0; i < 6; i++) {
    lrgstate.push(lrgstate_[i] ^ key[i])
  }

  state = (sbox[0][sbox_bit(lrgstate[0] >>> 2)] << 28) |
    (sbox[1][sbox_bit(((lrgstate[0] & 0x03) << 4) | (lrgstate[1] >>> 4))] << 24) |
    (sbox[2][sbox_bit(((lrgstate[1] & 0x0f) << 2) | (lrgstate[2] >>> 6))] << 20) |
    (sbox[3][sbox_bit(lrgstate[2] & 0x3f)] << 16) |
    (sbox[4][sbox_bit(lrgstate[3] >>> 2)] << 12) |
    (sbox[5][sbox_bit(((lrgstate[3] & 0x03) << 4) | (lrgstate[4] >>> 4))] << 8) |
    (sbox[6][sbox_bit(((lrgstate[4] & 0x0f) << 2) | (lrgstate[5] >>> 6))] << 4) |
    sbox[7][sbox_bit(lrgstate[5] & 0x3f)]

  return bitnum_intl(state, 15, 0) | bitnum_intl(state, 6, 1) | bitnum_intl(state, 19, 2) |
    bitnum_intl(state, 20, 3) | bitnum_intl(state, 28, 4) | bitnum_intl(state, 11, 5) |
    bitnum_intl(state, 27, 6) | bitnum_intl(state, 16, 7) | bitnum_intl(state, 0, 8) |
    bitnum_intl(state, 14, 9) | bitnum_intl(state, 22, 10) | bitnum_intl(state, 25, 11) |
    bitnum_intl(state, 4, 12) | bitnum_intl(state, 17, 13) | bitnum_intl(state, 30, 14) |
    bitnum_intl(state, 9, 15) | bitnum_intl(state, 1, 16) | bitnum_intl(state, 7, 17) |
    bitnum_intl(state, 23, 18) | bitnum_intl(state, 13, 19) | bitnum_intl(state, 31, 20) |
    bitnum_intl(state, 26, 21) | bitnum_intl(state, 2, 22) | bitnum_intl(state, 8, 23) |
    bitnum_intl(state, 18, 24) | bitnum_intl(state, 12, 25) | bitnum_intl(state, 29, 26) |
    bitnum_intl(state, 5, 27) | bitnum_intl(state, 21, 28) | bitnum_intl(state, 10, 29) |
    bitnum_intl(state, 3, 30) | bitnum_intl(state, 24, 31)
}

function crypt(input_data,key){
  let [s0, s1] = initial_permutation(input_data)

  for (let idx = 0; idx < 15; idx++) {
    let previous_s1 = s1
    s1 = f(s1, key[idx]) ^ s0
    s0 = previous_s1
  }
  s0 = f(s1, key[15]) ^ s0
  return inverse_permutation(s0, s1)
}

function key_schedule(key,mode){
  const schedule =Array.from({length:16}, () => new Array(6).fill(0));

  const key_rnd_shift = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]
  const key_perm_c = [56, 48, 40, 32, 24, 16, 8, 0, 57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35]
  const key_perm_d = [62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 60, 52, 44, 36, 28, 20, 12, 4, 27, 19, 11, 3]
  const key_compression = [13, 16, 10, 23, 0, 4, 2, 27, 14, 5, 20, 9, 22, 18, 11, 3, 25, 7, 15, 6, 26, 19, 12, 1, 40, 51, 30, 36,
    46, 54, 29, 39, 50, 44, 32, 47, 43, 48, 38, 55, 33, 52, 45, 41, 49, 35, 28, 31]

  let c =0;
  let d =0;

  for (let i = 0; i < 28; i++) {
    c+=bitnum(key, key_perm_c[i], 31 - i)
    d+=bitnum(key, key_perm_d[i], 31 - i)
  }

  for (let i = 0; i < 16; i++) {
    c = ((c << key_rnd_shift[i]) | (c >>> (28 - key_rnd_shift[i]))) & 0xfffffff0
    d = ((d << key_rnd_shift[i]) | (d >>> (28 - key_rnd_shift[i]))) & 0xfffffff0

    // let togen = 15 - i if mode == DECRYPT else i
    let togen = mode ===DECRYPT? 15-i:i

    for (let j = 0; j < 6; j++) {
      schedule[togen][j] = 0
    }

    for (let j = 0; j < 24; j++) {
      schedule[togen][Math.floor(j / 8)] |= bitnum_intr(c, key_compression[j], 7 - (j % 8))
    }

    for (let j = 24; j < 48; j++) {
      schedule[togen][Math.floor(j / 8)] |= bitnum_intr(d, key_compression[j] - 27, 7 - (j % 8))
    }

  }
  return schedule
}

function qmc1_decrypt(data) {
  for (let i = 0; i < data.length; i++) {
    const keyIndex = i > 0x7FFF ? (i % 0x7FFF) & 0x7F : i & 0x7F;
    data[i] ^= PRIVKEY[keyIndex];
  }
}

function tripledes_key_setup(key,mode){
  if (mode ===ENCRYPT){
    return [
      key_schedule(key.subarray(0,8), ENCRYPT),
      key_schedule(key.subarray(8,16), DECRYPT),
      key_schedule(key.subarray(16), ENCRYPT)
    ];
  }
  return [key_schedule(key.subarray(16), DECRYPT),
  key_schedule(key.subarray(8,16), ENCRYPT),
  key_schedule(key.subarray(0,8), DECRYPT)]
}

function tripledes_crypt(data,key){
  for (let i = 0; i < 3; i++) {
    data = crypt(data, key[i])
  }
  return data
}



export async function qrc_decrypt(encrypted_qrc, isLocal) {
  if (!encrypted_qrc) {
    return;
  }
  let encrypted_text_byte;

  if (typeof encrypted_qrc == "string") {
    encrypted_text_byte = Buffer.from(encrypted_qrc, 'hex');
  } else if (encrypted_qrc instanceof Buffer) {
    encrypted_text_byte = encrypted_qrc
  } else {
    console.log('未知类型')
    return;
  }

  try {
    if (isLocal) {
      qmc1_decrypt(encrypted_text_byte)
      encrypted_text_byte = encrypted_text_byte.subarray(11);
    }
    let data = [];
    const schedule = tripledes_key_setup(QRC_KEY, DECRYPT)
    for (let i = 0; i < encrypted_text_byte.length; i += 8) {
      data.push(...tripledes_crypt(encrypted_text_byte.subarray(i), schedule))
    }

    return (await PromiseInflate(Buffer.from(data))).toString('utf-8')
  } catch (e) {
    console.log('解密失败', e)
  }
  return null;
}
