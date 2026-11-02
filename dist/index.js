#!/usr/bin/env bun
// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  if (mod && typeof mod === "object" || typeof mod === "function") {
    for (let key of __getOwnPropNames(mod))
      if (!__hasOwnProp.call(to, key))
        __defProp(to, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true
        });
  }
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __esm = (fn, res, err) => () => {
  if (fn)
    try {
      res = fn(fn = 0);
    } catch (e) {
      err = [e];
    }
  if (err)
    throw err[0];
  return res;
};
var __require = import.meta.require;

// lib/private.ts
import { chmodSync, mkdirSync } from "fs";
function secureDirectory(dir) {
  mkdirSync(dir, { recursive: true, mode: 448 });
  chmodSync(dir, 448);
}
function secureFile(path) {
  chmodSync(path, 384);
}
var init_private = () => {};

// lib/auth.ts
import { existsSync, writeFileSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
function ensureDataDir() {
  secureDirectory(DATA_DIR);
  if (existsSync(TOKEN_PATH))
    secureFile(TOKEN_PATH);
}
function saveToken(data) {
  ensureDataDir();
  writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2), { encoding: "utf-8", mode: 384 });
  secureFile(TOKEN_PATH);
}
function loadToken() {
  if (!existsSync(TOKEN_PATH))
    return null;
  try {
    const raw = JSON.parse(readFileSync(TOKEN_PATH, "utf-8"));
    return raw;
  } catch {
    return null;
  }
}
function getCookie() {
  const token = loadToken();
  if (!token) {
    console.error(`
  Not logged in. Run:
`);
    console.error("    snowball login                 # QR code in the terminal");
    console.error("    snowball login --qr-png <file> # PNG for a phone chat, then wait");
    console.error("    snowball login --manual        # scan in the Chrome window");
    console.error(`    snowball token <cookie>        # manual paste
`);
    process.exit(1);
  }
  return token.cookie;
}
async function verifyToken(cookie) {
  try {
    const res = await fetch("https://stock.xueqiu.com/v5/stock/realtime/quotec.json?symbol=SH000001", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Cookie: cookie
      }
    });
    if (!res.ok)
      return { valid: false };
    const data = await res.json();
    if (data.data && !data.error_code)
      return { valid: true };
    return { valid: false };
  } catch {
    return { valid: false };
  }
}
var DATA_DIR, TOKEN_PATH;
var init_auth = __esm(() => {
  init_private();
  DATA_DIR = join(homedir(), ".snowball-cli");
  TOKEN_PATH = join(DATA_DIR, "token.json");
  ensureDataDir();
});

// node_modules/qrcode/lib/can-promise.js
var require_can_promise = __commonJS(function(exports, module) {
  module.exports = function() {
    return typeof Promise === "function" && Promise.prototype && Promise.prototype.then;
  };
});

// node_modules/qrcode/lib/core/utils.js
var require_utils = __commonJS(function(exports) {
  var toSJISFunction;
  var CODEWORDS_COUNT = [
    0,
    26,
    44,
    70,
    100,
    134,
    172,
    196,
    242,
    292,
    346,
    404,
    466,
    532,
    581,
    655,
    733,
    815,
    901,
    991,
    1085,
    1156,
    1258,
    1364,
    1474,
    1588,
    1706,
    1828,
    1921,
    2051,
    2185,
    2323,
    2465,
    2611,
    2761,
    2876,
    3034,
    3196,
    3362,
    3532,
    3706
  ];
  exports.getSymbolSize = function getSymbolSize(version) {
    if (!version)
      throw new Error('"version" cannot be null or undefined');
    if (version < 1 || version > 40)
      throw new Error('"version" should be in range from 1 to 40');
    return version * 4 + 17;
  };
  exports.getSymbolTotalCodewords = function getSymbolTotalCodewords(version) {
    return CODEWORDS_COUNT[version];
  };
  exports.getBCHDigit = function(data) {
    let digit = 0;
    while (data !== 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  };
  exports.setToSJISFunction = function setToSJISFunction(f) {
    if (typeof f !== "function") {
      throw new Error('"toSJISFunc" is not a valid function.');
    }
    toSJISFunction = f;
  };
  exports.isKanjiModeEnabled = function() {
    return typeof toSJISFunction !== "undefined";
  };
  exports.toSJIS = function toSJIS(kanji) {
    return toSJISFunction(kanji);
  };
});

// node_modules/qrcode/lib/core/error-correction-level.js
var require_error_correction_level = __commonJS(function(exports) {
  exports.L = { bit: 1 };
  exports.M = { bit: 0 };
  exports.Q = { bit: 3 };
  exports.H = { bit: 2 };
  function fromString(string) {
    if (typeof string !== "string") {
      throw new Error("Param is not a string");
    }
    const lcStr = string.toLowerCase();
    switch (lcStr) {
      case "l":
      case "low":
        return exports.L;
      case "m":
      case "medium":
        return exports.M;
      case "q":
      case "quartile":
        return exports.Q;
      case "h":
      case "high":
        return exports.H;
      default:
        throw new Error("Unknown EC Level: " + string);
    }
  }
  exports.isValid = function isValid(level) {
    return level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4;
  };
  exports.from = function from(value, defaultValue) {
    if (exports.isValid(value)) {
      return value;
    }
    try {
      return fromString(value);
    } catch (e) {
      return defaultValue;
    }
  };
});

// node_modules/qrcode/lib/core/bit-buffer.js
var require_bit_buffer = __commonJS(function(exports, module) {
  function BitBuffer() {
    this.buffer = [];
    this.length = 0;
  }
  BitBuffer.prototype = {
    get: function(index) {
      const bufIndex = Math.floor(index / 8);
      return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) === 1;
    },
    put: function(num, length) {
      for (let i = 0;i < length; i++) {
        this.putBit((num >>> length - i - 1 & 1) === 1);
      }
    },
    getLengthInBits: function() {
      return this.length;
    },
    putBit: function(bit) {
      const bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) {
        this.buffer.push(0);
      }
      if (bit) {
        this.buffer[bufIndex] |= 128 >>> this.length % 8;
      }
      this.length++;
    }
  };
  module.exports = BitBuffer;
});

// node_modules/qrcode/lib/core/bit-matrix.js
var require_bit_matrix = __commonJS(function(exports, module) {
  function BitMatrix(size) {
    if (!size || size < 1) {
      throw new Error("BitMatrix size must be defined and greater than 0");
    }
    this.size = size;
    this.data = new Uint8Array(size * size);
    this.reservedBit = new Uint8Array(size * size);
  }
  BitMatrix.prototype.set = function(row, col, value, reserved) {
    const index = row * this.size + col;
    this.data[index] = value;
    if (reserved)
      this.reservedBit[index] = true;
  };
  BitMatrix.prototype.get = function(row, col) {
    return this.data[row * this.size + col];
  };
  BitMatrix.prototype.xor = function(row, col, value) {
    this.data[row * this.size + col] ^= value;
  };
  BitMatrix.prototype.isReserved = function(row, col) {
    return this.reservedBit[row * this.size + col];
  };
  module.exports = BitMatrix;
});

// node_modules/qrcode/lib/core/alignment-pattern.js
var require_alignment_pattern = __commonJS(function(exports) {
  var getSymbolSize = require_utils().getSymbolSize;
  exports.getRowColCoords = function getRowColCoords(version) {
    if (version === 1)
      return [];
    const posCount = Math.floor(version / 7) + 2;
    const size = getSymbolSize(version);
    const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
    const positions = [size - 7];
    for (let i = 1;i < posCount - 1; i++) {
      positions[i] = positions[i - 1] - intervals;
    }
    positions.push(6);
    return positions.reverse();
  };
  exports.getPositions = function getPositions(version) {
    const coords = [];
    const pos = exports.getRowColCoords(version);
    const posLength = pos.length;
    for (let i = 0;i < posLength; i++) {
      for (let j = 0;j < posLength; j++) {
        if (i === 0 && j === 0 || i === 0 && j === posLength - 1 || i === posLength - 1 && j === 0) {
          continue;
        }
        coords.push([pos[i], pos[j]]);
      }
    }
    return coords;
  };
});

// node_modules/qrcode/lib/core/finder-pattern.js
var require_finder_pattern = __commonJS(function(exports) {
  var getSymbolSize = require_utils().getSymbolSize;
  var FINDER_PATTERN_SIZE = 7;
  exports.getPositions = function getPositions(version) {
    const size = getSymbolSize(version);
    return [
      [0, 0],
      [size - FINDER_PATTERN_SIZE, 0],
      [0, size - FINDER_PATTERN_SIZE]
    ];
  };
});

// node_modules/qrcode/lib/core/mask-pattern.js
var require_mask_pattern = __commonJS(function(exports) {
  exports.Patterns = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7
  };
  var PenaltyScores = {
    N1: 3,
    N2: 3,
    N3: 40,
    N4: 10
  };
  exports.isValid = function isValid(mask) {
    return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
  };
  exports.from = function from(value) {
    return exports.isValid(value) ? parseInt(value, 10) : undefined;
  };
  exports.getPenaltyN1 = function getPenaltyN1(data) {
    const size = data.size;
    let points = 0;
    let sameCountCol = 0;
    let sameCountRow = 0;
    let lastCol = null;
    let lastRow = null;
    for (let row = 0;row < size; row++) {
      sameCountCol = sameCountRow = 0;
      lastCol = lastRow = null;
      for (let col = 0;col < size; col++) {
        let module2 = data.get(row, col);
        if (module2 === lastCol) {
          sameCountCol++;
        } else {
          if (sameCountCol >= 5)
            points += PenaltyScores.N1 + (sameCountCol - 5);
          lastCol = module2;
          sameCountCol = 1;
        }
        module2 = data.get(col, row);
        if (module2 === lastRow) {
          sameCountRow++;
        } else {
          if (sameCountRow >= 5)
            points += PenaltyScores.N1 + (sameCountRow - 5);
          lastRow = module2;
          sameCountRow = 1;
        }
      }
      if (sameCountCol >= 5)
        points += PenaltyScores.N1 + (sameCountCol - 5);
      if (sameCountRow >= 5)
        points += PenaltyScores.N1 + (sameCountRow - 5);
    }
    return points;
  };
  exports.getPenaltyN2 = function getPenaltyN2(data) {
    const size = data.size;
    let points = 0;
    for (let row = 0;row < size - 1; row++) {
      for (let col = 0;col < size - 1; col++) {
        const last = data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
        if (last === 4 || last === 0)
          points++;
      }
    }
    return points * PenaltyScores.N2;
  };
  exports.getPenaltyN3 = function getPenaltyN3(data) {
    const size = data.size;
    let points = 0;
    let bitsCol = 0;
    let bitsRow = 0;
    for (let row = 0;row < size; row++) {
      bitsCol = bitsRow = 0;
      for (let col = 0;col < size; col++) {
        bitsCol = bitsCol << 1 & 2047 | data.get(row, col);
        if (col >= 10 && (bitsCol === 1488 || bitsCol === 93))
          points++;
        bitsRow = bitsRow << 1 & 2047 | data.get(col, row);
        if (col >= 10 && (bitsRow === 1488 || bitsRow === 93))
          points++;
      }
    }
    return points * PenaltyScores.N3;
  };
  exports.getPenaltyN4 = function getPenaltyN4(data) {
    let darkCount = 0;
    const modulesCount = data.data.length;
    for (let i = 0;i < modulesCount; i++)
      darkCount += data.data[i];
    const k = Math.abs(Math.ceil(darkCount * 100 / modulesCount / 5) - 10);
    return k * PenaltyScores.N4;
  };
  function getMaskAt(maskPattern, i, j) {
    switch (maskPattern) {
      case exports.Patterns.PATTERN000:
        return (i + j) % 2 === 0;
      case exports.Patterns.PATTERN001:
        return i % 2 === 0;
      case exports.Patterns.PATTERN010:
        return j % 3 === 0;
      case exports.Patterns.PATTERN011:
        return (i + j) % 3 === 0;
      case exports.Patterns.PATTERN100:
        return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case exports.Patterns.PATTERN101:
        return i * j % 2 + i * j % 3 === 0;
      case exports.Patterns.PATTERN110:
        return (i * j % 2 + i * j % 3) % 2 === 0;
      case exports.Patterns.PATTERN111:
        return (i * j % 3 + (i + j) % 2) % 2 === 0;
      default:
        throw new Error("bad maskPattern:" + maskPattern);
    }
  }
  exports.applyMask = function applyMask(pattern, data) {
    const size = data.size;
    for (let col = 0;col < size; col++) {
      for (let row = 0;row < size; row++) {
        if (data.isReserved(row, col))
          continue;
        data.xor(row, col, getMaskAt(pattern, row, col));
      }
    }
  };
  exports.getBestMask = function getBestMask(data, setupFormatFunc) {
    const numPatterns = Object.keys(exports.Patterns).length;
    let bestPattern = 0;
    let lowerPenalty = Infinity;
    for (let p = 0;p < numPatterns; p++) {
      setupFormatFunc(p);
      exports.applyMask(p, data);
      const penalty = exports.getPenaltyN1(data) + exports.getPenaltyN2(data) + exports.getPenaltyN3(data) + exports.getPenaltyN4(data);
      exports.applyMask(p, data);
      if (penalty < lowerPenalty) {
        lowerPenalty = penalty;
        bestPattern = p;
      }
    }
    return bestPattern;
  };
});

// node_modules/qrcode/lib/core/error-correction-code.js
var require_error_correction_code = __commonJS(function(exports) {
  var ECLevel = require_error_correction_level();
  var EC_BLOCKS_TABLE = [
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    2,
    2,
    1,
    2,
    2,
    4,
    1,
    2,
    4,
    4,
    2,
    4,
    4,
    4,
    2,
    4,
    6,
    5,
    2,
    4,
    6,
    6,
    2,
    5,
    8,
    8,
    4,
    5,
    8,
    8,
    4,
    5,
    8,
    11,
    4,
    8,
    10,
    11,
    4,
    9,
    12,
    16,
    4,
    9,
    16,
    16,
    6,
    10,
    12,
    18,
    6,
    10,
    17,
    16,
    6,
    11,
    16,
    19,
    6,
    13,
    18,
    21,
    7,
    14,
    21,
    25,
    8,
    16,
    20,
    25,
    8,
    17,
    23,
    25,
    9,
    17,
    23,
    34,
    9,
    18,
    25,
    30,
    10,
    20,
    27,
    32,
    12,
    21,
    29,
    35,
    12,
    23,
    34,
    37,
    12,
    25,
    34,
    40,
    13,
    26,
    35,
    42,
    14,
    28,
    38,
    45,
    15,
    29,
    40,
    48,
    16,
    31,
    43,
    51,
    17,
    33,
    45,
    54,
    18,
    35,
    48,
    57,
    19,
    37,
    51,
    60,
    19,
    38,
    53,
    63,
    20,
    40,
    56,
    66,
    21,
    43,
    59,
    70,
    22,
    45,
    62,
    74,
    24,
    47,
    65,
    77,
    25,
    49,
    68,
    81
  ];
  var EC_CODEWORDS_TABLE = [
    7,
    10,
    13,
    17,
    10,
    16,
    22,
    28,
    15,
    26,
    36,
    44,
    20,
    36,
    52,
    64,
    26,
    48,
    72,
    88,
    36,
    64,
    96,
    112,
    40,
    72,
    108,
    130,
    48,
    88,
    132,
    156,
    60,
    110,
    160,
    192,
    72,
    130,
    192,
    224,
    80,
    150,
    224,
    264,
    96,
    176,
    260,
    308,
    104,
    198,
    288,
    352,
    120,
    216,
    320,
    384,
    132,
    240,
    360,
    432,
    144,
    280,
    408,
    480,
    168,
    308,
    448,
    532,
    180,
    338,
    504,
    588,
    196,
    364,
    546,
    650,
    224,
    416,
    600,
    700,
    224,
    442,
    644,
    750,
    252,
    476,
    690,
    816,
    270,
    504,
    750,
    900,
    300,
    560,
    810,
    960,
    312,
    588,
    870,
    1050,
    336,
    644,
    952,
    1110,
    360,
    700,
    1020,
    1200,
    390,
    728,
    1050,
    1260,
    420,
    784,
    1140,
    1350,
    450,
    812,
    1200,
    1440,
    480,
    868,
    1290,
    1530,
    510,
    924,
    1350,
    1620,
    540,
    980,
    1440,
    1710,
    570,
    1036,
    1530,
    1800,
    570,
    1064,
    1590,
    1890,
    600,
    1120,
    1680,
    1980,
    630,
    1204,
    1770,
    2100,
    660,
    1260,
    1860,
    2220,
    720,
    1316,
    1950,
    2310,
    750,
    1372,
    2040,
    2430
  ];
  exports.getBlocksCount = function getBlocksCount(version, errorCorrectionLevel) {
    switch (errorCorrectionLevel) {
      case ECLevel.L:
        return EC_BLOCKS_TABLE[(version - 1) * 4 + 0];
      case ECLevel.M:
        return EC_BLOCKS_TABLE[(version - 1) * 4 + 1];
      case ECLevel.Q:
        return EC_BLOCKS_TABLE[(version - 1) * 4 + 2];
      case ECLevel.H:
        return EC_BLOCKS_TABLE[(version - 1) * 4 + 3];
      default:
        return;
    }
  };
  exports.getTotalCodewordsCount = function getTotalCodewordsCount(version, errorCorrectionLevel) {
    switch (errorCorrectionLevel) {
      case ECLevel.L:
        return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0];
      case ECLevel.M:
        return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1];
      case ECLevel.Q:
        return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2];
      case ECLevel.H:
        return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3];
      default:
        return;
    }
  };
});

// node_modules/qrcode/lib/core/galois-field.js
var require_galois_field = __commonJS(function(exports) {
  var EXP_TABLE = new Uint8Array(512);
  var LOG_TABLE = new Uint8Array(256);
  (function initTables() {
    let x = 1;
    for (let i = 0;i < 255; i++) {
      EXP_TABLE[i] = x;
      LOG_TABLE[x] = i;
      x <<= 1;
      if (x & 256) {
        x ^= 285;
      }
    }
    for (let i = 255;i < 512; i++) {
      EXP_TABLE[i] = EXP_TABLE[i - 255];
    }
  })();
  exports.log = function log(n) {
    if (n < 1)
      throw new Error("log(" + n + ")");
    return LOG_TABLE[n];
  };
  exports.exp = function exp(n) {
    return EXP_TABLE[n];
  };
  exports.mul = function mul(x, y) {
    if (x === 0 || y === 0)
      return 0;
    return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
  };
});

// node_modules/qrcode/lib/core/polynomial.js
var require_polynomial = __commonJS(function(exports) {
  var GF = require_galois_field();
  exports.mul = function mul2(p1, p2) {
    const coeff = new Uint8Array(p1.length + p2.length - 1);
    for (let i = 0;i < p1.length; i++) {
      for (let j = 0;j < p2.length; j++) {
        coeff[i + j] ^= GF.mul(p1[i], p2[j]);
      }
    }
    return coeff;
  };
  exports.mod = function mod(divident, divisor) {
    let result = new Uint8Array(divident);
    while (result.length - divisor.length >= 0) {
      const coeff = result[0];
      for (let i = 0;i < divisor.length; i++) {
        result[i] ^= GF.mul(divisor[i], coeff);
      }
      let offset = 0;
      while (offset < result.length && result[offset] === 0)
        offset++;
      result = result.slice(offset);
    }
    return result;
  };
  exports.generateECPolynomial = function generateECPolynomial(degree) {
    let poly = new Uint8Array([1]);
    for (let i = 0;i < degree; i++) {
      poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]));
    }
    return poly;
  };
});

// node_modules/qrcode/lib/core/reed-solomon-encoder.js
var require_reed_solomon_encoder = __commonJS(function(exports, module) {
  var Polynomial = require_polynomial();
  function ReedSolomonEncoder(degree) {
    this.genPoly = undefined;
    this.degree = degree;
    if (this.degree)
      this.initialize(this.degree);
  }
  ReedSolomonEncoder.prototype.initialize = function initialize(degree) {
    this.degree = degree;
    this.genPoly = Polynomial.generateECPolynomial(this.degree);
  };
  ReedSolomonEncoder.prototype.encode = function encode(data) {
    if (!this.genPoly) {
      throw new Error("Encoder not initialized");
    }
    const paddedData = new Uint8Array(data.length + this.degree);
    paddedData.set(data);
    const remainder = Polynomial.mod(paddedData, this.genPoly);
    const start = this.degree - remainder.length;
    if (start > 0) {
      const buff = new Uint8Array(this.degree);
      buff.set(remainder, start);
      return buff;
    }
    return remainder;
  };
  module.exports = ReedSolomonEncoder;
});

// node_modules/qrcode/lib/core/version-check.js
var require_version_check = __commonJS(function(exports) {
  exports.isValid = function isValid(version) {
    return !isNaN(version) && version >= 1 && version <= 40;
  };
});

// node_modules/qrcode/lib/core/regex.js
var require_regex = __commonJS(function(exports) {
  var numeric = "[0-9]+";
  var alphanumeric = "[A-Z $%*+\\-./:]+";
  var kanji = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|" + "[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|" + "[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|" + "[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
  kanji = kanji.replace(/u/g, "\\u");
  var byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + `)(?:.|[\r
]))+`;
  exports.KANJI = new RegExp(kanji, "g");
  exports.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
  exports.BYTE = new RegExp(byte, "g");
  exports.NUMERIC = new RegExp(numeric, "g");
  exports.ALPHANUMERIC = new RegExp(alphanumeric, "g");
  var TEST_KANJI = new RegExp("^" + kanji + "$");
  var TEST_NUMERIC = new RegExp("^" + numeric + "$");
  var TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
  exports.testKanji = function testKanji(str) {
    return TEST_KANJI.test(str);
  };
  exports.testNumeric = function testNumeric(str) {
    return TEST_NUMERIC.test(str);
  };
  exports.testAlphanumeric = function testAlphanumeric(str) {
    return TEST_ALPHANUMERIC.test(str);
  };
});

// node_modules/qrcode/lib/core/mode.js
var require_mode = __commonJS(function(exports) {
  var VersionCheck = require_version_check();
  var Regex = require_regex();
  exports.NUMERIC = {
    id: "Numeric",
    bit: 1 << 0,
    ccBits: [10, 12, 14]
  };
  exports.ALPHANUMERIC = {
    id: "Alphanumeric",
    bit: 1 << 1,
    ccBits: [9, 11, 13]
  };
  exports.BYTE = {
    id: "Byte",
    bit: 1 << 2,
    ccBits: [8, 16, 16]
  };
  exports.KANJI = {
    id: "Kanji",
    bit: 1 << 3,
    ccBits: [8, 10, 12]
  };
  exports.MIXED = {
    bit: -1
  };
  exports.getCharCountIndicator = function getCharCountIndicator(mode, version) {
    if (!mode.ccBits)
      throw new Error("Invalid mode: " + mode);
    if (!VersionCheck.isValid(version)) {
      throw new Error("Invalid version: " + version);
    }
    if (version >= 1 && version < 10)
      return mode.ccBits[0];
    else if (version < 27)
      return mode.ccBits[1];
    return mode.ccBits[2];
  };
  exports.getBestModeForData = function getBestModeForData(dataStr) {
    if (Regex.testNumeric(dataStr))
      return exports.NUMERIC;
    else if (Regex.testAlphanumeric(dataStr))
      return exports.ALPHANUMERIC;
    else if (Regex.testKanji(dataStr))
      return exports.KANJI;
    else
      return exports.BYTE;
  };
  exports.toString = function toString(mode) {
    if (mode && mode.id)
      return mode.id;
    throw new Error("Invalid mode");
  };
  exports.isValid = function isValid(mode) {
    return mode && mode.bit && mode.ccBits;
  };
  function fromString(string) {
    if (typeof string !== "string") {
      throw new Error("Param is not a string");
    }
    const lcStr = string.toLowerCase();
    switch (lcStr) {
      case "numeric":
        return exports.NUMERIC;
      case "alphanumeric":
        return exports.ALPHANUMERIC;
      case "kanji":
        return exports.KANJI;
      case "byte":
        return exports.BYTE;
      default:
        throw new Error("Unknown mode: " + string);
    }
  }
  exports.from = function from(value, defaultValue) {
    if (exports.isValid(value)) {
      return value;
    }
    try {
      return fromString(value);
    } catch (e) {
      return defaultValue;
    }
  };
});

// node_modules/qrcode/lib/core/version.js
var require_version = __commonJS(function(exports) {
  var Utils = require_utils();
  var ECCode = require_error_correction_code();
  var ECLevel = require_error_correction_level();
  var Mode = require_mode();
  var VersionCheck = require_version_check();
  var G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
  var G18_BCH = Utils.getBCHDigit(G18);
  function getBestVersionForDataLength(mode, length, errorCorrectionLevel) {
    for (let currentVersion = 1;currentVersion <= 40; currentVersion++) {
      if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
        return currentVersion;
      }
    }
    return;
  }
  function getReservedBitsCount(mode, version) {
    return Mode.getCharCountIndicator(mode, version) + 4;
  }
  function getTotalBitsFromDataArray(segments, version) {
    let totalBits = 0;
    segments.forEach(function(data) {
      const reservedBits = getReservedBitsCount(data.mode, version);
      totalBits += reservedBits + data.getBitsLength();
    });
    return totalBits;
  }
  function getBestVersionForMixedData(segments, errorCorrectionLevel) {
    for (let currentVersion = 1;currentVersion <= 40; currentVersion++) {
      const length = getTotalBitsFromDataArray(segments, currentVersion);
      if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
        return currentVersion;
      }
    }
    return;
  }
  exports.from = function from(value, defaultValue) {
    if (VersionCheck.isValid(value)) {
      return parseInt(value, 10);
    }
    return defaultValue;
  };
  exports.getCapacity = function getCapacity(version, errorCorrectionLevel, mode) {
    if (!VersionCheck.isValid(version)) {
      throw new Error("Invalid QR Code version");
    }
    if (typeof mode === "undefined")
      mode = Mode.BYTE;
    const totalCodewords = Utils.getSymbolTotalCodewords(version);
    const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
    const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
    if (mode === Mode.MIXED)
      return dataTotalCodewordsBits;
    const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);
    switch (mode) {
      case Mode.NUMERIC:
        return Math.floor(usableBits / 10 * 3);
      case Mode.ALPHANUMERIC:
        return Math.floor(usableBits / 11 * 2);
      case Mode.KANJI:
        return Math.floor(usableBits / 13);
      case Mode.BYTE:
      default:
        return Math.floor(usableBits / 8);
    }
  };
  exports.getBestVersionForData = function getBestVersionForData(data, errorCorrectionLevel) {
    let seg;
    const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
    if (Array.isArray(data)) {
      if (data.length > 1) {
        return getBestVersionForMixedData(data, ecl);
      }
      if (data.length === 0) {
        return 1;
      }
      seg = data[0];
    } else {
      seg = data;
    }
    return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
  };
  exports.getEncodedBits = function getEncodedBits(version) {
    if (!VersionCheck.isValid(version) || version < 7) {
      throw new Error("Invalid QR Code version");
    }
    let d = version << 12;
    while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
      d ^= G18 << Utils.getBCHDigit(d) - G18_BCH;
    }
    return version << 12 | d;
  };
});

// node_modules/qrcode/lib/core/format-info.js
var require_format_info = __commonJS(function(exports) {
  var Utils = require_utils();
  var G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
  var G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
  var G15_BCH = Utils.getBCHDigit(G15);
  exports.getEncodedBits = function getEncodedBits(errorCorrectionLevel, mask) {
    const data = errorCorrectionLevel.bit << 3 | mask;
    let d = data << 10;
    while (Utils.getBCHDigit(d) - G15_BCH >= 0) {
      d ^= G15 << Utils.getBCHDigit(d) - G15_BCH;
    }
    return (data << 10 | d) ^ G15_MASK;
  };
});

// node_modules/qrcode/lib/core/numeric-data.js
var require_numeric_data = __commonJS(function(exports, module) {
  var Mode = require_mode();
  function NumericData(data) {
    this.mode = Mode.NUMERIC;
    this.data = data.toString();
  }
  NumericData.getBitsLength = function getBitsLength(length) {
    return 10 * Math.floor(length / 3) + (length % 3 ? length % 3 * 3 + 1 : 0);
  };
  NumericData.prototype.getLength = function getLength() {
    return this.data.length;
  };
  NumericData.prototype.getBitsLength = function getBitsLength() {
    return NumericData.getBitsLength(this.data.length);
  };
  NumericData.prototype.write = function write(bitBuffer) {
    let i, group, value;
    for (i = 0;i + 3 <= this.data.length; i += 3) {
      group = this.data.substr(i, 3);
      value = parseInt(group, 10);
      bitBuffer.put(value, 10);
    }
    const remainingNum = this.data.length - i;
    if (remainingNum > 0) {
      group = this.data.substr(i);
      value = parseInt(group, 10);
      bitBuffer.put(value, remainingNum * 3 + 1);
    }
  };
  module.exports = NumericData;
});

// node_modules/qrcode/lib/core/alphanumeric-data.js
var require_alphanumeric_data = __commonJS(function(exports, module) {
  var Mode = require_mode();
  var ALPHA_NUM_CHARS = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    " ",
    "$",
    "%",
    "*",
    "+",
    "-",
    ".",
    "/",
    ":"
  ];
  function AlphanumericData(data) {
    this.mode = Mode.ALPHANUMERIC;
    this.data = data;
  }
  AlphanumericData.getBitsLength = function getBitsLength(length) {
    return 11 * Math.floor(length / 2) + 6 * (length % 2);
  };
  AlphanumericData.prototype.getLength = function getLength() {
    return this.data.length;
  };
  AlphanumericData.prototype.getBitsLength = function getBitsLength() {
    return AlphanumericData.getBitsLength(this.data.length);
  };
  AlphanumericData.prototype.write = function write(bitBuffer) {
    let i;
    for (i = 0;i + 2 <= this.data.length; i += 2) {
      let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
      value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);
      bitBuffer.put(value, 11);
    }
    if (this.data.length % 2) {
      bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
    }
  };
  module.exports = AlphanumericData;
});

// node_modules/qrcode/lib/core/byte-data.js
var require_byte_data = __commonJS(function(exports, module) {
  var Mode = require_mode();
  function ByteData(data) {
    this.mode = Mode.BYTE;
    if (typeof data === "string") {
      this.data = new TextEncoder().encode(data);
    } else {
      this.data = new Uint8Array(data);
    }
  }
  ByteData.getBitsLength = function getBitsLength(length) {
    return length * 8;
  };
  ByteData.prototype.getLength = function getLength() {
    return this.data.length;
  };
  ByteData.prototype.getBitsLength = function getBitsLength() {
    return ByteData.getBitsLength(this.data.length);
  };
  ByteData.prototype.write = function(bitBuffer) {
    for (let i = 0, l = this.data.length;i < l; i++) {
      bitBuffer.put(this.data[i], 8);
    }
  };
  module.exports = ByteData;
});

// node_modules/qrcode/lib/core/kanji-data.js
var require_kanji_data = __commonJS(function(exports, module) {
  var Mode = require_mode();
  var Utils = require_utils();
  function KanjiData(data) {
    this.mode = Mode.KANJI;
    this.data = data;
  }
  KanjiData.getBitsLength = function getBitsLength(length) {
    return length * 13;
  };
  KanjiData.prototype.getLength = function getLength() {
    return this.data.length;
  };
  KanjiData.prototype.getBitsLength = function getBitsLength() {
    return KanjiData.getBitsLength(this.data.length);
  };
  KanjiData.prototype.write = function(bitBuffer) {
    let i;
    for (i = 0;i < this.data.length; i++) {
      let value = Utils.toSJIS(this.data[i]);
      if (value >= 33088 && value <= 40956) {
        value -= 33088;
      } else if (value >= 57408 && value <= 60351) {
        value -= 49472;
      } else {
        throw new Error("Invalid SJIS character: " + this.data[i] + `
` + "Make sure your charset is UTF-8");
      }
      value = (value >>> 8 & 255) * 192 + (value & 255);
      bitBuffer.put(value, 13);
    }
  };
  module.exports = KanjiData;
});

// node_modules/dijkstrajs/dijkstra.js
var require_dijkstra = __commonJS(function(exports, module) {
  var dijkstra = {
    single_source_shortest_paths: function(graph, s, d) {
      var predecessors = {};
      var costs = {};
      costs[s] = 0;
      var open = dijkstra.PriorityQueue.make();
      open.push(s, 0);
      var closest, u, v, cost_of_s_to_u, adjacent_nodes, cost_of_e, cost_of_s_to_u_plus_cost_of_e, cost_of_s_to_v, first_visit;
      while (!open.empty()) {
        closest = open.pop();
        u = closest.value;
        cost_of_s_to_u = closest.cost;
        adjacent_nodes = graph[u] || {};
        for (v in adjacent_nodes) {
          if (adjacent_nodes.hasOwnProperty(v)) {
            cost_of_e = adjacent_nodes[v];
            cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;
            cost_of_s_to_v = costs[v];
            first_visit = typeof costs[v] === "undefined";
            if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
              costs[v] = cost_of_s_to_u_plus_cost_of_e;
              open.push(v, cost_of_s_to_u_plus_cost_of_e);
              predecessors[v] = u;
            }
          }
        }
      }
      if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
        var msg = ["Could not find a path from ", s, " to ", d, "."].join("");
        throw new Error(msg);
      }
      return predecessors;
    },
    extract_shortest_path_from_predecessor_list: function(predecessors, d) {
      var nodes = [];
      var u = d;
      var predecessor;
      while (u) {
        nodes.push(u);
        predecessor = predecessors[u];
        u = predecessors[u];
      }
      nodes.reverse();
      return nodes;
    },
    find_path: function(graph, s, d) {
      var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
      return dijkstra.extract_shortest_path_from_predecessor_list(predecessors, d);
    },
    PriorityQueue: {
      make: function(opts) {
        var T = dijkstra.PriorityQueue, t = {}, key;
        opts = opts || {};
        for (key in T) {
          if (T.hasOwnProperty(key)) {
            t[key] = T[key];
          }
        }
        t.queue = [];
        t.sorter = opts.sorter || T.default_sorter;
        return t;
      },
      default_sorter: function(a, b) {
        return a.cost - b.cost;
      },
      push: function(value, cost) {
        var item = { value, cost };
        this.queue.push(item);
        this.queue.sort(this.sorter);
      },
      pop: function() {
        return this.queue.shift();
      },
      empty: function() {
        return this.queue.length === 0;
      }
    }
  };
  if (typeof module !== "undefined") {
    module.exports = dijkstra;
  }
});

// node_modules/qrcode/lib/core/segments.js
var require_segments = __commonJS(function(exports) {
  var Mode = require_mode();
  var NumericData = require_numeric_data();
  var AlphanumericData = require_alphanumeric_data();
  var ByteData = require_byte_data();
  var KanjiData = require_kanji_data();
  var Regex = require_regex();
  var Utils = require_utils();
  var dijkstra = require_dijkstra();
  function getStringByteLength(str) {
    return unescape(encodeURIComponent(str)).length;
  }
  function getSegments(regex, mode, str) {
    const segments = [];
    let result;
    while ((result = regex.exec(str)) !== null) {
      segments.push({
        data: result[0],
        index: result.index,
        mode,
        length: result[0].length
      });
    }
    return segments;
  }
  function getSegmentsFromString(dataStr) {
    const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
    const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
    let byteSegs;
    let kanjiSegs;
    if (Utils.isKanjiModeEnabled()) {
      byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
      kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
    } else {
      byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
      kanjiSegs = [];
    }
    const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);
    return segs.sort(function(s1, s2) {
      return s1.index - s2.index;
    }).map(function(obj) {
      return {
        data: obj.data,
        mode: obj.mode,
        length: obj.length
      };
    });
  }
  function getSegmentBitsLength(length, mode) {
    switch (mode) {
      case Mode.NUMERIC:
        return NumericData.getBitsLength(length);
      case Mode.ALPHANUMERIC:
        return AlphanumericData.getBitsLength(length);
      case Mode.KANJI:
        return KanjiData.getBitsLength(length);
      case Mode.BYTE:
        return ByteData.getBitsLength(length);
    }
  }
  function mergeSegments(segs) {
    return segs.reduce(function(acc, curr) {
      const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
      if (prevSeg && prevSeg.mode === curr.mode) {
        acc[acc.length - 1].data += curr.data;
        return acc;
      }
      acc.push(curr);
      return acc;
    }, []);
  }
  function buildNodes(segs) {
    const nodes = [];
    for (let i = 0;i < segs.length; i++) {
      const seg = segs[i];
      switch (seg.mode) {
        case Mode.NUMERIC:
          nodes.push([
            seg,
            { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
            { data: seg.data, mode: Mode.BYTE, length: seg.length }
          ]);
          break;
        case Mode.ALPHANUMERIC:
          nodes.push([
            seg,
            { data: seg.data, mode: Mode.BYTE, length: seg.length }
          ]);
          break;
        case Mode.KANJI:
          nodes.push([
            seg,
            { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
          ]);
          break;
        case Mode.BYTE:
          nodes.push([
            { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
          ]);
      }
    }
    return nodes;
  }
  function buildGraph(nodes, version) {
    const table = {};
    const graph = { start: {} };
    let prevNodeIds = ["start"];
    for (let i = 0;i < nodes.length; i++) {
      const nodeGroup = nodes[i];
      const currentNodeIds = [];
      for (let j = 0;j < nodeGroup.length; j++) {
        const node = nodeGroup[j];
        const key = "" + i + j;
        currentNodeIds.push(key);
        table[key] = { node, lastCount: 0 };
        graph[key] = {};
        for (let n = 0;n < prevNodeIds.length; n++) {
          const prevNodeId = prevNodeIds[n];
          if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
            graph[prevNodeId][key] = getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) - getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);
            table[prevNodeId].lastCount += node.length;
          } else {
            if (table[prevNodeId])
              table[prevNodeId].lastCount = node.length;
            graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) + 4 + Mode.getCharCountIndicator(node.mode, version);
          }
        }
      }
      prevNodeIds = currentNodeIds;
    }
    for (let n = 0;n < prevNodeIds.length; n++) {
      graph[prevNodeIds[n]].end = 0;
    }
    return { map: graph, table };
  }
  function buildSingleSegment(data, modesHint) {
    let mode;
    const bestMode = Mode.getBestModeForData(data);
    mode = Mode.from(modesHint, bestMode);
    if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
      throw new Error('"' + data + '"' + " cannot be encoded with mode " + Mode.toString(mode) + `.
 Suggested mode is: ` + Mode.toString(bestMode));
    }
    if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
      mode = Mode.BYTE;
    }
    switch (mode) {
      case Mode.NUMERIC:
        return new NumericData(data);
      case Mode.ALPHANUMERIC:
        return new AlphanumericData(data);
      case Mode.KANJI:
        return new KanjiData(data);
      case Mode.BYTE:
        return new ByteData(data);
    }
  }
  exports.fromArray = function fromArray(array) {
    return array.reduce(function(acc, seg) {
      if (typeof seg === "string") {
        acc.push(buildSingleSegment(seg, null));
      } else if (seg.data) {
        acc.push(buildSingleSegment(seg.data, seg.mode));
      }
      return acc;
    }, []);
  };
  exports.fromString = function fromString(data, version) {
    const segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled());
    const nodes = buildNodes(segs);
    const graph = buildGraph(nodes, version);
    const path = dijkstra.find_path(graph.map, "start", "end");
    const optimizedSegs = [];
    for (let i = 1;i < path.length - 1; i++) {
      optimizedSegs.push(graph.table[path[i]].node);
    }
    return exports.fromArray(mergeSegments(optimizedSegs));
  };
  exports.rawSplit = function rawSplit(data) {
    return exports.fromArray(getSegmentsFromString(data, Utils.isKanjiModeEnabled()));
  };
});

// node_modules/qrcode/lib/core/qrcode.js
var require_qrcode = __commonJS(function(exports) {
  var Utils = require_utils();
  var ECLevel = require_error_correction_level();
  var BitBuffer = require_bit_buffer();
  var BitMatrix = require_bit_matrix();
  var AlignmentPattern = require_alignment_pattern();
  var FinderPattern = require_finder_pattern();
  var MaskPattern = require_mask_pattern();
  var ECCode = require_error_correction_code();
  var ReedSolomonEncoder = require_reed_solomon_encoder();
  var Version = require_version();
  var FormatInfo = require_format_info();
  var Mode = require_mode();
  var Segments = require_segments();
  function setupFinderPattern(matrix, version) {
    const size = matrix.size;
    const pos = FinderPattern.getPositions(version);
    for (let i = 0;i < pos.length; i++) {
      const row = pos[i][0];
      const col = pos[i][1];
      for (let r = -1;r <= 7; r++) {
        if (row + r <= -1 || size <= row + r)
          continue;
        for (let c = -1;c <= 7; c++) {
          if (col + c <= -1 || size <= col + c)
            continue;
          if (r >= 0 && r <= 6 && (c === 0 || c === 6) || c >= 0 && c <= 6 && (r === 0 || r === 6) || r >= 2 && r <= 4 && c >= 2 && c <= 4) {
            matrix.set(row + r, col + c, true, true);
          } else {
            matrix.set(row + r, col + c, false, true);
          }
        }
      }
    }
  }
  function setupTimingPattern(matrix) {
    const size = matrix.size;
    for (let r = 8;r < size - 8; r++) {
      const value = r % 2 === 0;
      matrix.set(r, 6, value, true);
      matrix.set(6, r, value, true);
    }
  }
  function setupAlignmentPattern(matrix, version) {
    const pos = AlignmentPattern.getPositions(version);
    for (let i = 0;i < pos.length; i++) {
      const row = pos[i][0];
      const col = pos[i][1];
      for (let r = -2;r <= 2; r++) {
        for (let c = -2;c <= 2; c++) {
          if (r === -2 || r === 2 || c === -2 || c === 2 || r === 0 && c === 0) {
            matrix.set(row + r, col + c, true, true);
          } else {
            matrix.set(row + r, col + c, false, true);
          }
        }
      }
    }
  }
  function setupVersionInfo(matrix, version) {
    const size = matrix.size;
    const bits = Version.getEncodedBits(version);
    let row, col, mod;
    for (let i = 0;i < 18; i++) {
      row = Math.floor(i / 3);
      col = i % 3 + size - 8 - 3;
      mod = (bits >> i & 1) === 1;
      matrix.set(row, col, mod, true);
      matrix.set(col, row, mod, true);
    }
  }
  function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
    const size = matrix.size;
    const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
    let i, mod;
    for (i = 0;i < 15; i++) {
      mod = (bits >> i & 1) === 1;
      if (i < 6) {
        matrix.set(i, 8, mod, true);
      } else if (i < 8) {
        matrix.set(i + 1, 8, mod, true);
      } else {
        matrix.set(size - 15 + i, 8, mod, true);
      }
      if (i < 8) {
        matrix.set(8, size - i - 1, mod, true);
      } else if (i < 9) {
        matrix.set(8, 15 - i - 1 + 1, mod, true);
      } else {
        matrix.set(8, 15 - i - 1, mod, true);
      }
    }
    matrix.set(size - 8, 8, 1, true);
  }
  function setupData(matrix, data) {
    const size = matrix.size;
    let inc = -1;
    let row = size - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    for (let col = size - 1;col > 0; col -= 2) {
      if (col === 6)
        col--;
      while (true) {
        for (let c = 0;c < 2; c++) {
          if (!matrix.isReserved(row, col - c)) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = (data[byteIndex] >>> bitIndex & 1) === 1;
            }
            matrix.set(row, col - c, dark);
            bitIndex--;
            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || size <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }
  function createData(version, errorCorrectionLevel, segments) {
    const buffer = new BitBuffer;
    segments.forEach(function(data) {
      buffer.put(data.mode.bit, 4);
      buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version));
      data.write(buffer);
    });
    const totalCodewords = Utils.getSymbolTotalCodewords(version);
    const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
    const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
    if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
      buffer.put(0, 4);
    }
    while (buffer.getLengthInBits() % 8 !== 0) {
      buffer.putBit(0);
    }
    const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
    for (let i = 0;i < remainingByte; i++) {
      buffer.put(i % 2 ? 17 : 236, 8);
    }
    return createCodewords(buffer, version, errorCorrectionLevel);
  }
  function createCodewords(bitBuffer, version, errorCorrectionLevel) {
    const totalCodewords = Utils.getSymbolTotalCodewords(version);
    const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
    const dataTotalCodewords = totalCodewords - ecTotalCodewords;
    const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);
    const blocksInGroup2 = totalCodewords % ecTotalBlocks;
    const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;
    const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
    const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
    const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
    const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
    const rs = new ReedSolomonEncoder(ecCount);
    let offset = 0;
    const dcData = new Array(ecTotalBlocks);
    const ecData = new Array(ecTotalBlocks);
    let maxDataSize = 0;
    const buffer = new Uint8Array(bitBuffer.buffer);
    for (let b = 0;b < ecTotalBlocks; b++) {
      const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
      dcData[b] = buffer.slice(offset, offset + dataSize);
      ecData[b] = rs.encode(dcData[b]);
      offset += dataSize;
      maxDataSize = Math.max(maxDataSize, dataSize);
    }
    const data = new Uint8Array(totalCodewords);
    let index = 0;
    let i, r;
    for (i = 0;i < maxDataSize; i++) {
      for (r = 0;r < ecTotalBlocks; r++) {
        if (i < dcData[r].length) {
          data[index++] = dcData[r][i];
        }
      }
    }
    for (i = 0;i < ecCount; i++) {
      for (r = 0;r < ecTotalBlocks; r++) {
        data[index++] = ecData[r][i];
      }
    }
    return data;
  }
  function createSymbol(data, version, errorCorrectionLevel, maskPattern) {
    let segments;
    if (Array.isArray(data)) {
      segments = Segments.fromArray(data);
    } else if (typeof data === "string") {
      let estimatedVersion = version;
      if (!estimatedVersion) {
        const rawSegments = Segments.rawSplit(data);
        estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
      }
      segments = Segments.fromString(data, estimatedVersion || 40);
    } else {
      throw new Error("Invalid data");
    }
    const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);
    if (!bestVersion) {
      throw new Error("The amount of data is too big to be stored in a QR Code");
    }
    if (!version) {
      version = bestVersion;
    } else if (version < bestVersion) {
      throw new Error(`
` + `The chosen QR Code version cannot contain this amount of data.
` + "Minimum version required to store current data is: " + bestVersion + `.
`);
    }
    const dataBits = createData(version, errorCorrectionLevel, segments);
    const moduleCount = Utils.getSymbolSize(version);
    const modules = new BitMatrix(moduleCount);
    setupFinderPattern(modules, version);
    setupTimingPattern(modules);
    setupAlignmentPattern(modules, version);
    setupFormatInfo(modules, errorCorrectionLevel, 0);
    if (version >= 7) {
      setupVersionInfo(modules, version);
    }
    setupData(modules, dataBits);
    if (isNaN(maskPattern)) {
      maskPattern = MaskPattern.getBestMask(modules, setupFormatInfo.bind(null, modules, errorCorrectionLevel));
    }
    MaskPattern.applyMask(maskPattern, modules);
    setupFormatInfo(modules, errorCorrectionLevel, maskPattern);
    return {
      modules,
      version,
      errorCorrectionLevel,
      maskPattern,
      segments
    };
  }
  exports.create = function create(data, options) {
    if (typeof data === "undefined" || data === "") {
      throw new Error("No input text");
    }
    let errorCorrectionLevel = ECLevel.M;
    let version;
    let mask;
    if (typeof options !== "undefined") {
      errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M);
      version = Version.from(options.version);
      mask = MaskPattern.from(options.maskPattern);
      if (options.toSJISFunc) {
        Utils.setToSJISFunction(options.toSJISFunc);
      }
    }
    return createSymbol(data, version, errorCorrectionLevel, mask);
  };
});

// node_modules/pngjs/lib/chunkstream.js
var require_chunkstream = __commonJS(function(exports, module) {
  var util = __require("util");
  var Stream = __require("stream");
  var ChunkStream = module.exports = function() {
    Stream.call(this);
    this._buffers = [];
    this._buffered = 0;
    this._reads = [];
    this._paused = false;
    this._encoding = "utf8";
    this.writable = true;
  };
  util.inherits(ChunkStream, Stream);
  ChunkStream.prototype.read = function(length, callback) {
    this._reads.push({
      length: Math.abs(length),
      allowLess: length < 0,
      func: callback
    });
    process.nextTick(function() {
      this._process();
      if (this._paused && this._reads && this._reads.length > 0) {
        this._paused = false;
        this.emit("drain");
      }
    }.bind(this));
  };
  ChunkStream.prototype.write = function(data, encoding) {
    if (!this.writable) {
      this.emit("error", new Error("Stream not writable"));
      return false;
    }
    let dataBuffer;
    if (Buffer.isBuffer(data)) {
      dataBuffer = data;
    } else {
      dataBuffer = Buffer.from(data, encoding || this._encoding);
    }
    this._buffers.push(dataBuffer);
    this._buffered += dataBuffer.length;
    this._process();
    if (this._reads && this._reads.length === 0) {
      this._paused = true;
    }
    return this.writable && !this._paused;
  };
  ChunkStream.prototype.end = function(data, encoding) {
    if (data) {
      this.write(data, encoding);
    }
    this.writable = false;
    if (!this._buffers) {
      return;
    }
    if (this._buffers.length === 0) {
      this._end();
    } else {
      this._buffers.push(null);
      this._process();
    }
  };
  ChunkStream.prototype.destroySoon = ChunkStream.prototype.end;
  ChunkStream.prototype._end = function() {
    if (this._reads.length > 0) {
      this.emit("error", new Error("Unexpected end of input"));
    }
    this.destroy();
  };
  ChunkStream.prototype.destroy = function() {
    if (!this._buffers) {
      return;
    }
    this.writable = false;
    this._reads = null;
    this._buffers = null;
    this.emit("close");
  };
  ChunkStream.prototype._processReadAllowingLess = function(read) {
    this._reads.shift();
    let smallerBuf = this._buffers[0];
    if (smallerBuf.length > read.length) {
      this._buffered -= read.length;
      this._buffers[0] = smallerBuf.slice(read.length);
      read.func.call(this, smallerBuf.slice(0, read.length));
    } else {
      this._buffered -= smallerBuf.length;
      this._buffers.shift();
      read.func.call(this, smallerBuf);
    }
  };
  ChunkStream.prototype._processRead = function(read) {
    this._reads.shift();
    let pos = 0;
    let count = 0;
    let data = Buffer.alloc(read.length);
    while (pos < read.length) {
      let buf = this._buffers[count++];
      let len = Math.min(buf.length, read.length - pos);
      buf.copy(data, pos, 0, len);
      pos += len;
      if (len !== buf.length) {
        this._buffers[--count] = buf.slice(len);
      }
    }
    if (count > 0) {
      this._buffers.splice(0, count);
    }
    this._buffered -= read.length;
    read.func.call(this, data);
  };
  ChunkStream.prototype._process = function() {
    try {
      while (this._buffered > 0 && this._reads && this._reads.length > 0) {
        let read = this._reads[0];
        if (read.allowLess) {
          this._processReadAllowingLess(read);
        } else if (this._buffered >= read.length) {
          this._processRead(read);
        } else {
          break;
        }
      }
      if (this._buffers && !this.writable) {
        this._end();
      }
    } catch (ex) {
      this.emit("error", ex);
    }
  };
});

// node_modules/pngjs/lib/interlace.js
var require_interlace = __commonJS(function(exports) {
  var imagePasses = [
    {
      x: [0],
      y: [0]
    },
    {
      x: [4],
      y: [0]
    },
    {
      x: [0, 4],
      y: [4]
    },
    {
      x: [2, 6],
      y: [0, 4]
    },
    {
      x: [0, 2, 4, 6],
      y: [2, 6]
    },
    {
      x: [1, 3, 5, 7],
      y: [0, 2, 4, 6]
    },
    {
      x: [0, 1, 2, 3, 4, 5, 6, 7],
      y: [1, 3, 5, 7]
    }
  ];
  exports.getImagePasses = function(width, height) {
    let images = [];
    let xLeftOver = width % 8;
    let yLeftOver = height % 8;
    let xRepeats = (width - xLeftOver) / 8;
    let yRepeats = (height - yLeftOver) / 8;
    for (let i = 0;i < imagePasses.length; i++) {
      let pass = imagePasses[i];
      let passWidth = xRepeats * pass.x.length;
      let passHeight = yRepeats * pass.y.length;
      for (let j = 0;j < pass.x.length; j++) {
        if (pass.x[j] < xLeftOver) {
          passWidth++;
        } else {
          break;
        }
      }
      for (let j = 0;j < pass.y.length; j++) {
        if (pass.y[j] < yLeftOver) {
          passHeight++;
        } else {
          break;
        }
      }
      if (passWidth > 0 && passHeight > 0) {
        images.push({ width: passWidth, height: passHeight, index: i });
      }
    }
    return images;
  };
  exports.getInterlaceIterator = function(width) {
    return function(x, y, pass) {
      let outerXLeftOver = x % imagePasses[pass].x.length;
      let outerX = (x - outerXLeftOver) / imagePasses[pass].x.length * 8 + imagePasses[pass].x[outerXLeftOver];
      let outerYLeftOver = y % imagePasses[pass].y.length;
      let outerY = (y - outerYLeftOver) / imagePasses[pass].y.length * 8 + imagePasses[pass].y[outerYLeftOver];
      return outerX * 4 + outerY * width * 4;
    };
  };
});

// node_modules/pngjs/lib/paeth-predictor.js
var require_paeth_predictor = __commonJS(function(exports, module) {
  module.exports = function paethPredictor(left, above, upLeft) {
    let paeth = left + above - upLeft;
    let pLeft = Math.abs(paeth - left);
    let pAbove = Math.abs(paeth - above);
    let pUpLeft = Math.abs(paeth - upLeft);
    if (pLeft <= pAbove && pLeft <= pUpLeft) {
      return left;
    }
    if (pAbove <= pUpLeft) {
      return above;
    }
    return upLeft;
  };
});

// node_modules/pngjs/lib/filter-parse.js
var require_filter_parse = __commonJS(function(exports, module) {
  var interlaceUtils = require_interlace();
  var paethPredictor = require_paeth_predictor();
  function getByteWidth(width, bpp, depth) {
    let byteWidth = width * bpp;
    if (depth !== 8) {
      byteWidth = Math.ceil(byteWidth / (8 / depth));
    }
    return byteWidth;
  }
  var Filter = module.exports = function(bitmapInfo, dependencies) {
    let width = bitmapInfo.width;
    let height = bitmapInfo.height;
    let interlace = bitmapInfo.interlace;
    let bpp = bitmapInfo.bpp;
    let depth = bitmapInfo.depth;
    this.read = dependencies.read;
    this.write = dependencies.write;
    this.complete = dependencies.complete;
    this._imageIndex = 0;
    this._images = [];
    if (interlace) {
      let passes = interlaceUtils.getImagePasses(width, height);
      for (let i = 0;i < passes.length; i++) {
        this._images.push({
          byteWidth: getByteWidth(passes[i].width, bpp, depth),
          height: passes[i].height,
          lineIndex: 0
        });
      }
    } else {
      this._images.push({
        byteWidth: getByteWidth(width, bpp, depth),
        height,
        lineIndex: 0
      });
    }
    if (depth === 8) {
      this._xComparison = bpp;
    } else if (depth === 16) {
      this._xComparison = bpp * 2;
    } else {
      this._xComparison = 1;
    }
  };
  Filter.prototype.start = function() {
    this.read(this._images[this._imageIndex].byteWidth + 1, this._reverseFilterLine.bind(this));
  };
  Filter.prototype._unFilterType1 = function(rawData, unfilteredLine, byteWidth) {
    let xComparison = this._xComparison;
    let xBiggerThan = xComparison - 1;
    for (let x = 0;x < byteWidth; x++) {
      let rawByte = rawData[1 + x];
      let f1Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
      unfilteredLine[x] = rawByte + f1Left;
    }
  };
  Filter.prototype._unFilterType2 = function(rawData, unfilteredLine, byteWidth) {
    let lastLine = this._lastLine;
    for (let x = 0;x < byteWidth; x++) {
      let rawByte = rawData[1 + x];
      let f2Up = lastLine ? lastLine[x] : 0;
      unfilteredLine[x] = rawByte + f2Up;
    }
  };
  Filter.prototype._unFilterType3 = function(rawData, unfilteredLine, byteWidth) {
    let xComparison = this._xComparison;
    let xBiggerThan = xComparison - 1;
    let lastLine = this._lastLine;
    for (let x = 0;x < byteWidth; x++) {
      let rawByte = rawData[1 + x];
      let f3Up = lastLine ? lastLine[x] : 0;
      let f3Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
      let f3Add = Math.floor((f3Left + f3Up) / 2);
      unfilteredLine[x] = rawByte + f3Add;
    }
  };
  Filter.prototype._unFilterType4 = function(rawData, unfilteredLine, byteWidth) {
    let xComparison = this._xComparison;
    let xBiggerThan = xComparison - 1;
    let lastLine = this._lastLine;
    for (let x = 0;x < byteWidth; x++) {
      let rawByte = rawData[1 + x];
      let f4Up = lastLine ? lastLine[x] : 0;
      let f4Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
      let f4UpLeft = x > xBiggerThan && lastLine ? lastLine[x - xComparison] : 0;
      let f4Add = paethPredictor(f4Left, f4Up, f4UpLeft);
      unfilteredLine[x] = rawByte + f4Add;
    }
  };
  Filter.prototype._reverseFilterLine = function(rawData) {
    let filter = rawData[0];
    let unfilteredLine;
    let currentImage = this._images[this._imageIndex];
    let byteWidth = currentImage.byteWidth;
    if (filter === 0) {
      unfilteredLine = rawData.slice(1, byteWidth + 1);
    } else {
      unfilteredLine = Buffer.alloc(byteWidth);
      switch (filter) {
        case 1:
          this._unFilterType1(rawData, unfilteredLine, byteWidth);
          break;
        case 2:
          this._unFilterType2(rawData, unfilteredLine, byteWidth);
          break;
        case 3:
          this._unFilterType3(rawData, unfilteredLine, byteWidth);
          break;
        case 4:
          this._unFilterType4(rawData, unfilteredLine, byteWidth);
          break;
        default:
          throw new Error("Unrecognised filter type - " + filter);
      }
    }
    this.write(unfilteredLine);
    currentImage.lineIndex++;
    if (currentImage.lineIndex >= currentImage.height) {
      this._lastLine = null;
      this._imageIndex++;
      currentImage = this._images[this._imageIndex];
    } else {
      this._lastLine = unfilteredLine;
    }
    if (currentImage) {
      this.read(currentImage.byteWidth + 1, this._reverseFilterLine.bind(this));
    } else {
      this._lastLine = null;
      this.complete();
    }
  };
});

// node_modules/pngjs/lib/filter-parse-async.js
var require_filter_parse_async = __commonJS(function(exports, module) {
  var util = __require("util");
  var ChunkStream = require_chunkstream();
  var Filter = require_filter_parse();
  var FilterAsync = module.exports = function(bitmapInfo) {
    ChunkStream.call(this);
    let buffers = [];
    let that = this;
    this._filter = new Filter(bitmapInfo, {
      read: this.read.bind(this),
      write: function(buffer) {
        buffers.push(buffer);
      },
      complete: function() {
        that.emit("complete", Buffer.concat(buffers));
      }
    });
    this._filter.start();
  };
  util.inherits(FilterAsync, ChunkStream);
});

// node_modules/pngjs/lib/constants.js
var require_constants = __commonJS(function(exports, module) {
  module.exports = {
    PNG_SIGNATURE: [137, 80, 78, 71, 13, 10, 26, 10],
    TYPE_IHDR: 1229472850,
    TYPE_IEND: 1229278788,
    TYPE_IDAT: 1229209940,
    TYPE_PLTE: 1347179589,
    TYPE_tRNS: 1951551059,
    TYPE_gAMA: 1732332865,
    COLORTYPE_GRAYSCALE: 0,
    COLORTYPE_PALETTE: 1,
    COLORTYPE_COLOR: 2,
    COLORTYPE_ALPHA: 4,
    COLORTYPE_PALETTE_COLOR: 3,
    COLORTYPE_COLOR_ALPHA: 6,
    COLORTYPE_TO_BPP_MAP: {
      0: 1,
      2: 3,
      3: 1,
      4: 2,
      6: 4
    },
    GAMMA_DIVISION: 1e5
  };
});

// node_modules/pngjs/lib/crc.js
var require_crc = __commonJS(function(exports, module) {
  var crcTable = [];
  (function() {
    for (let i = 0;i < 256; i++) {
      let currentCrc = i;
      for (let j = 0;j < 8; j++) {
        if (currentCrc & 1) {
          currentCrc = 3988292384 ^ currentCrc >>> 1;
        } else {
          currentCrc = currentCrc >>> 1;
        }
      }
      crcTable[i] = currentCrc;
    }
  })();
  var CrcCalculator = module.exports = function() {
    this._crc = -1;
  };
  CrcCalculator.prototype.write = function(data) {
    for (let i = 0;i < data.length; i++) {
      this._crc = crcTable[(this._crc ^ data[i]) & 255] ^ this._crc >>> 8;
    }
    return true;
  };
  CrcCalculator.prototype.crc32 = function() {
    return this._crc ^ -1;
  };
  CrcCalculator.crc32 = function(buf) {
    let crc = -1;
    for (let i = 0;i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 255] ^ crc >>> 8;
    }
    return crc ^ -1;
  };
});

// node_modules/pngjs/lib/parser.js
var require_parser = __commonJS(function(exports, module) {
  var constants = require_constants();
  var CrcCalculator = require_crc();
  var Parser = module.exports = function(options, dependencies) {
    this._options = options;
    options.checkCRC = options.checkCRC !== false;
    this._hasIHDR = false;
    this._hasIEND = false;
    this._emittedHeadersFinished = false;
    this._palette = [];
    this._colorType = 0;
    this._chunks = {};
    this._chunks[constants.TYPE_IHDR] = this._handleIHDR.bind(this);
    this._chunks[constants.TYPE_IEND] = this._handleIEND.bind(this);
    this._chunks[constants.TYPE_IDAT] = this._handleIDAT.bind(this);
    this._chunks[constants.TYPE_PLTE] = this._handlePLTE.bind(this);
    this._chunks[constants.TYPE_tRNS] = this._handleTRNS.bind(this);
    this._chunks[constants.TYPE_gAMA] = this._handleGAMA.bind(this);
    this.read = dependencies.read;
    this.error = dependencies.error;
    this.metadata = dependencies.metadata;
    this.gamma = dependencies.gamma;
    this.transColor = dependencies.transColor;
    this.palette = dependencies.palette;
    this.parsed = dependencies.parsed;
    this.inflateData = dependencies.inflateData;
    this.finished = dependencies.finished;
    this.simpleTransparency = dependencies.simpleTransparency;
    this.headersFinished = dependencies.headersFinished || function() {};
  };
  Parser.prototype.start = function() {
    this.read(constants.PNG_SIGNATURE.length, this._parseSignature.bind(this));
  };
  Parser.prototype._parseSignature = function(data) {
    let signature = constants.PNG_SIGNATURE;
    for (let i = 0;i < signature.length; i++) {
      if (data[i] !== signature[i]) {
        this.error(new Error("Invalid file signature"));
        return;
      }
    }
    this.read(8, this._parseChunkBegin.bind(this));
  };
  Parser.prototype._parseChunkBegin = function(data) {
    let length = data.readUInt32BE(0);
    let type = data.readUInt32BE(4);
    let name = "";
    for (let i = 4;i < 8; i++) {
      name += String.fromCharCode(data[i]);
    }
    let ancillary = Boolean(data[4] & 32);
    if (!this._hasIHDR && type !== constants.TYPE_IHDR) {
      this.error(new Error("Expected IHDR on beggining"));
      return;
    }
    this._crc = new CrcCalculator;
    this._crc.write(Buffer.from(name));
    if (this._chunks[type]) {
      return this._chunks[type](length);
    }
    if (!ancillary) {
      this.error(new Error("Unsupported critical chunk type " + name));
      return;
    }
    this.read(length + 4, this._skipChunk.bind(this));
  };
  Parser.prototype._skipChunk = function() {
    this.read(8, this._parseChunkBegin.bind(this));
  };
  Parser.prototype._handleChunkEnd = function() {
    this.read(4, this._parseChunkEnd.bind(this));
  };
  Parser.prototype._parseChunkEnd = function(data) {
    let fileCrc = data.readInt32BE(0);
    let calcCrc = this._crc.crc32();
    if (this._options.checkCRC && calcCrc !== fileCrc) {
      this.error(new Error("Crc error - " + fileCrc + " - " + calcCrc));
      return;
    }
    if (!this._hasIEND) {
      this.read(8, this._parseChunkBegin.bind(this));
    }
  };
  Parser.prototype._handleIHDR = function(length) {
    this.read(length, this._parseIHDR.bind(this));
  };
  Parser.prototype._parseIHDR = function(data) {
    this._crc.write(data);
    let width = data.readUInt32BE(0);
    let height = data.readUInt32BE(4);
    let depth = data[8];
    let colorType = data[9];
    let compr = data[10];
    let filter = data[11];
    let interlace = data[12];
    if (depth !== 8 && depth !== 4 && depth !== 2 && depth !== 1 && depth !== 16) {
      this.error(new Error("Unsupported bit depth " + depth));
      return;
    }
    if (!(colorType in constants.COLORTYPE_TO_BPP_MAP)) {
      this.error(new Error("Unsupported color type"));
      return;
    }
    if (compr !== 0) {
      this.error(new Error("Unsupported compression method"));
      return;
    }
    if (filter !== 0) {
      this.error(new Error("Unsupported filter method"));
      return;
    }
    if (interlace !== 0 && interlace !== 1) {
      this.error(new Error("Unsupported interlace method"));
      return;
    }
    this._colorType = colorType;
    let bpp = constants.COLORTYPE_TO_BPP_MAP[this._colorType];
    this._hasIHDR = true;
    this.metadata({
      width,
      height,
      depth,
      interlace: Boolean(interlace),
      palette: Boolean(colorType & constants.COLORTYPE_PALETTE),
      color: Boolean(colorType & constants.COLORTYPE_COLOR),
      alpha: Boolean(colorType & constants.COLORTYPE_ALPHA),
      bpp,
      colorType
    });
    this._handleChunkEnd();
  };
  Parser.prototype._handlePLTE = function(length) {
    this.read(length, this._parsePLTE.bind(this));
  };
  Parser.prototype._parsePLTE = function(data) {
    this._crc.write(data);
    let entries = Math.floor(data.length / 3);
    for (let i = 0;i < entries; i++) {
      this._palette.push([data[i * 3], data[i * 3 + 1], data[i * 3 + 2], 255]);
    }
    this.palette(this._palette);
    this._handleChunkEnd();
  };
  Parser.prototype._handleTRNS = function(length) {
    this.simpleTransparency();
    this.read(length, this._parseTRNS.bind(this));
  };
  Parser.prototype._parseTRNS = function(data) {
    this._crc.write(data);
    if (this._colorType === constants.COLORTYPE_PALETTE_COLOR) {
      if (this._palette.length === 0) {
        this.error(new Error("Transparency chunk must be after palette"));
        return;
      }
      if (data.length > this._palette.length) {
        this.error(new Error("More transparent colors than palette size"));
        return;
      }
      for (let i = 0;i < data.length; i++) {
        this._palette[i][3] = data[i];
      }
      this.palette(this._palette);
    }
    if (this._colorType === constants.COLORTYPE_GRAYSCALE) {
      this.transColor([data.readUInt16BE(0)]);
    }
    if (this._colorType === constants.COLORTYPE_COLOR) {
      this.transColor([
        data.readUInt16BE(0),
        data.readUInt16BE(2),
        data.readUInt16BE(4)
      ]);
    }
    this._handleChunkEnd();
  };
  Parser.prototype._handleGAMA = function(length) {
    this.read(length, this._parseGAMA.bind(this));
  };
  Parser.prototype._parseGAMA = function(data) {
    this._crc.write(data);
    this.gamma(data.readUInt32BE(0) / constants.GAMMA_DIVISION);
    this._handleChunkEnd();
  };
  Parser.prototype._handleIDAT = function(length) {
    if (!this._emittedHeadersFinished) {
      this._emittedHeadersFinished = true;
      this.headersFinished();
    }
    this.read(-length, this._parseIDAT.bind(this, length));
  };
  Parser.prototype._parseIDAT = function(length, data) {
    this._crc.write(data);
    if (this._colorType === constants.COLORTYPE_PALETTE_COLOR && this._palette.length === 0) {
      throw new Error("Expected palette not found");
    }
    this.inflateData(data);
    let leftOverLength = length - data.length;
    if (leftOverLength > 0) {
      this._handleIDAT(leftOverLength);
    } else {
      this._handleChunkEnd();
    }
  };
  Parser.prototype._handleIEND = function(length) {
    this.read(length, this._parseIEND.bind(this));
  };
  Parser.prototype._parseIEND = function(data) {
    this._crc.write(data);
    this._hasIEND = true;
    this._handleChunkEnd();
    if (this.finished) {
      this.finished();
    }
  };
});

// node_modules/pngjs/lib/bitmapper.js
var require_bitmapper = __commonJS(function(exports) {
  var interlaceUtils = require_interlace();
  var pixelBppMapper = [
    function() {},
    function(pxData, data, pxPos, rawPos) {
      if (rawPos === data.length) {
        throw new Error("Ran out of data");
      }
      let pixel = data[rawPos];
      pxData[pxPos] = pixel;
      pxData[pxPos + 1] = pixel;
      pxData[pxPos + 2] = pixel;
      pxData[pxPos + 3] = 255;
    },
    function(pxData, data, pxPos, rawPos) {
      if (rawPos + 1 >= data.length) {
        throw new Error("Ran out of data");
      }
      let pixel = data[rawPos];
      pxData[pxPos] = pixel;
      pxData[pxPos + 1] = pixel;
      pxData[pxPos + 2] = pixel;
      pxData[pxPos + 3] = data[rawPos + 1];
    },
    function(pxData, data, pxPos, rawPos) {
      if (rawPos + 2 >= data.length) {
        throw new Error("Ran out of data");
      }
      pxData[pxPos] = data[rawPos];
      pxData[pxPos + 1] = data[rawPos + 1];
      pxData[pxPos + 2] = data[rawPos + 2];
      pxData[pxPos + 3] = 255;
    },
    function(pxData, data, pxPos, rawPos) {
      if (rawPos + 3 >= data.length) {
        throw new Error("Ran out of data");
      }
      pxData[pxPos] = data[rawPos];
      pxData[pxPos + 1] = data[rawPos + 1];
      pxData[pxPos + 2] = data[rawPos + 2];
      pxData[pxPos + 3] = data[rawPos + 3];
    }
  ];
  var pixelBppCustomMapper = [
    function() {},
    function(pxData, pixelData, pxPos, maxBit) {
      let pixel = pixelData[0];
      pxData[pxPos] = pixel;
      pxData[pxPos + 1] = pixel;
      pxData[pxPos + 2] = pixel;
      pxData[pxPos + 3] = maxBit;
    },
    function(pxData, pixelData, pxPos) {
      let pixel = pixelData[0];
      pxData[pxPos] = pixel;
      pxData[pxPos + 1] = pixel;
      pxData[pxPos + 2] = pixel;
      pxData[pxPos + 3] = pixelData[1];
    },
    function(pxData, pixelData, pxPos, maxBit) {
      pxData[pxPos] = pixelData[0];
      pxData[pxPos + 1] = pixelData[1];
      pxData[pxPos + 2] = pixelData[2];
      pxData[pxPos + 3] = maxBit;
    },
    function(pxData, pixelData, pxPos) {
      pxData[pxPos] = pixelData[0];
      pxData[pxPos + 1] = pixelData[1];
      pxData[pxPos + 2] = pixelData[2];
      pxData[pxPos + 3] = pixelData[3];
    }
  ];
  function bitRetriever(data, depth) {
    let leftOver = [];
    let i = 0;
    function split() {
      if (i === data.length) {
        throw new Error("Ran out of data");
      }
      let byte = data[i];
      i++;
      let byte8, byte7, byte6, byte5, byte4, byte3, byte2, byte1;
      switch (depth) {
        default:
          throw new Error("unrecognised depth");
        case 16:
          byte2 = data[i];
          i++;
          leftOver.push((byte << 8) + byte2);
          break;
        case 4:
          byte2 = byte & 15;
          byte1 = byte >> 4;
          leftOver.push(byte1, byte2);
          break;
        case 2:
          byte4 = byte & 3;
          byte3 = byte >> 2 & 3;
          byte2 = byte >> 4 & 3;
          byte1 = byte >> 6 & 3;
          leftOver.push(byte1, byte2, byte3, byte4);
          break;
        case 1:
          byte8 = byte & 1;
          byte7 = byte >> 1 & 1;
          byte6 = byte >> 2 & 1;
          byte5 = byte >> 3 & 1;
          byte4 = byte >> 4 & 1;
          byte3 = byte >> 5 & 1;
          byte2 = byte >> 6 & 1;
          byte1 = byte >> 7 & 1;
          leftOver.push(byte1, byte2, byte3, byte4, byte5, byte6, byte7, byte8);
          break;
      }
    }
    return {
      get: function(count) {
        while (leftOver.length < count) {
          split();
        }
        let returner = leftOver.slice(0, count);
        leftOver = leftOver.slice(count);
        return returner;
      },
      resetAfterLine: function() {
        leftOver.length = 0;
      },
      end: function() {
        if (i !== data.length) {
          throw new Error("extra data found");
        }
      }
    };
  }
  function mapImage8Bit(image, pxData, getPxPos, bpp, data, rawPos) {
    let imageWidth = image.width;
    let imageHeight = image.height;
    let imagePass = image.index;
    for (let y = 0;y < imageHeight; y++) {
      for (let x = 0;x < imageWidth; x++) {
        let pxPos = getPxPos(x, y, imagePass);
        pixelBppMapper[bpp](pxData, data, pxPos, rawPos);
        rawPos += bpp;
      }
    }
    return rawPos;
  }
  function mapImageCustomBit(image, pxData, getPxPos, bpp, bits, maxBit) {
    let imageWidth = image.width;
    let imageHeight = image.height;
    let imagePass = image.index;
    for (let y = 0;y < imageHeight; y++) {
      for (let x = 0;x < imageWidth; x++) {
        let pixelData = bits.get(bpp);
        let pxPos = getPxPos(x, y, imagePass);
        pixelBppCustomMapper[bpp](pxData, pixelData, pxPos, maxBit);
      }
      bits.resetAfterLine();
    }
  }
  exports.dataToBitMap = function(data, bitmapInfo) {
    let width = bitmapInfo.width;
    let height = bitmapInfo.height;
    let depth = bitmapInfo.depth;
    let bpp = bitmapInfo.bpp;
    let interlace = bitmapInfo.interlace;
    let bits;
    if (depth !== 8) {
      bits = bitRetriever(data, depth);
    }
    let pxData;
    if (depth <= 8) {
      pxData = Buffer.alloc(width * height * 4);
    } else {
      pxData = new Uint16Array(width * height * 4);
    }
    let maxBit = Math.pow(2, depth) - 1;
    let rawPos = 0;
    let images;
    let getPxPos;
    if (interlace) {
      images = interlaceUtils.getImagePasses(width, height);
      getPxPos = interlaceUtils.getInterlaceIterator(width, height);
    } else {
      let nonInterlacedPxPos = 0;
      getPxPos = function() {
        let returner = nonInterlacedPxPos;
        nonInterlacedPxPos += 4;
        return returner;
      };
      images = [{ width, height }];
    }
    for (let imageIndex = 0;imageIndex < images.length; imageIndex++) {
      if (depth === 8) {
        rawPos = mapImage8Bit(images[imageIndex], pxData, getPxPos, bpp, data, rawPos);
      } else {
        mapImageCustomBit(images[imageIndex], pxData, getPxPos, bpp, bits, maxBit);
      }
    }
    if (depth === 8) {
      if (rawPos !== data.length) {
        throw new Error("extra data found");
      }
    } else {
      bits.end();
    }
    return pxData;
  };
});

// node_modules/pngjs/lib/format-normaliser.js
var require_format_normaliser = __commonJS(function(exports, module) {
  function dePalette(indata, outdata, width, height, palette) {
    let pxPos = 0;
    for (let y = 0;y < height; y++) {
      for (let x = 0;x < width; x++) {
        let color = palette[indata[pxPos]];
        if (!color) {
          throw new Error("index " + indata[pxPos] + " not in palette");
        }
        for (let i = 0;i < 4; i++) {
          outdata[pxPos + i] = color[i];
        }
        pxPos += 4;
      }
    }
  }
  function replaceTransparentColor(indata, outdata, width, height, transColor) {
    let pxPos = 0;
    for (let y = 0;y < height; y++) {
      for (let x = 0;x < width; x++) {
        let makeTrans = false;
        if (transColor.length === 1) {
          if (transColor[0] === indata[pxPos]) {
            makeTrans = true;
          }
        } else if (transColor[0] === indata[pxPos] && transColor[1] === indata[pxPos + 1] && transColor[2] === indata[pxPos + 2]) {
          makeTrans = true;
        }
        if (makeTrans) {
          for (let i = 0;i < 4; i++) {
            outdata[pxPos + i] = 0;
          }
        }
        pxPos += 4;
      }
    }
  }
  function scaleDepth(indata, outdata, width, height, depth) {
    let maxOutSample = 255;
    let maxInSample = Math.pow(2, depth) - 1;
    let pxPos = 0;
    for (let y = 0;y < height; y++) {
      for (let x = 0;x < width; x++) {
        for (let i = 0;i < 4; i++) {
          outdata[pxPos + i] = Math.floor(indata[pxPos + i] * maxOutSample / maxInSample + 0.5);
        }
        pxPos += 4;
      }
    }
  }
  module.exports = function(indata, imageData) {
    let depth = imageData.depth;
    let width = imageData.width;
    let height = imageData.height;
    let colorType = imageData.colorType;
    let transColor = imageData.transColor;
    let palette = imageData.palette;
    let outdata = indata;
    if (colorType === 3) {
      dePalette(indata, outdata, width, height, palette);
    } else {
      if (transColor) {
        replaceTransparentColor(indata, outdata, width, height, transColor);
      }
      if (depth !== 8) {
        if (depth === 16) {
          outdata = Buffer.alloc(width * height * 4);
        }
        scaleDepth(indata, outdata, width, height, depth);
      }
    }
    return outdata;
  };
});

// node_modules/pngjs/lib/parser-async.js
var require_parser_async = __commonJS(function(exports, module) {
  var util = __require("util");
  var zlib = __require("zlib");
  var ChunkStream = require_chunkstream();
  var FilterAsync = require_filter_parse_async();
  var Parser = require_parser();
  var bitmapper = require_bitmapper();
  var formatNormaliser = require_format_normaliser();
  var ParserAsync = module.exports = function(options) {
    ChunkStream.call(this);
    this._parser = new Parser(options, {
      read: this.read.bind(this),
      error: this._handleError.bind(this),
      metadata: this._handleMetaData.bind(this),
      gamma: this.emit.bind(this, "gamma"),
      palette: this._handlePalette.bind(this),
      transColor: this._handleTransColor.bind(this),
      finished: this._finished.bind(this),
      inflateData: this._inflateData.bind(this),
      simpleTransparency: this._simpleTransparency.bind(this),
      headersFinished: this._headersFinished.bind(this)
    });
    this._options = options;
    this.writable = true;
    this._parser.start();
  };
  util.inherits(ParserAsync, ChunkStream);
  ParserAsync.prototype._handleError = function(err) {
    this.emit("error", err);
    this.writable = false;
    this.destroy();
    if (this._inflate && this._inflate.destroy) {
      this._inflate.destroy();
    }
    if (this._filter) {
      this._filter.destroy();
      this._filter.on("error", function() {});
    }
    this.errord = true;
  };
  ParserAsync.prototype._inflateData = function(data) {
    if (!this._inflate) {
      if (this._bitmapInfo.interlace) {
        this._inflate = zlib.createInflate();
        this._inflate.on("error", this.emit.bind(this, "error"));
        this._filter.on("complete", this._complete.bind(this));
        this._inflate.pipe(this._filter);
      } else {
        let rowSize = (this._bitmapInfo.width * this._bitmapInfo.bpp * this._bitmapInfo.depth + 7 >> 3) + 1;
        let imageSize = rowSize * this._bitmapInfo.height;
        let chunkSize = Math.max(imageSize, zlib.Z_MIN_CHUNK);
        this._inflate = zlib.createInflate({ chunkSize });
        let leftToInflate = imageSize;
        let emitError = this.emit.bind(this, "error");
        this._inflate.on("error", function(err) {
          if (!leftToInflate) {
            return;
          }
          emitError(err);
        });
        this._filter.on("complete", this._complete.bind(this));
        let filterWrite = this._filter.write.bind(this._filter);
        this._inflate.on("data", function(chunk) {
          if (!leftToInflate) {
            return;
          }
          if (chunk.length > leftToInflate) {
            chunk = chunk.slice(0, leftToInflate);
          }
          leftToInflate -= chunk.length;
          filterWrite(chunk);
        });
        this._inflate.on("end", this._filter.end.bind(this._filter));
      }
    }
    this._inflate.write(data);
  };
  ParserAsync.prototype._handleMetaData = function(metaData) {
    this._metaData = metaData;
    this._bitmapInfo = Object.create(metaData);
    this._filter = new FilterAsync(this._bitmapInfo);
  };
  ParserAsync.prototype._handleTransColor = function(transColor) {
    this._bitmapInfo.transColor = transColor;
  };
  ParserAsync.prototype._handlePalette = function(palette) {
    this._bitmapInfo.palette = palette;
  };
  ParserAsync.prototype._simpleTransparency = function() {
    this._metaData.alpha = true;
  };
  ParserAsync.prototype._headersFinished = function() {
    this.emit("metadata", this._metaData);
  };
  ParserAsync.prototype._finished = function() {
    if (this.errord) {
      return;
    }
    if (!this._inflate) {
      this.emit("error", "No Inflate block");
    } else {
      this._inflate.end();
    }
  };
  ParserAsync.prototype._complete = function(filteredData) {
    if (this.errord) {
      return;
    }
    let normalisedBitmapData;
    try {
      let bitmapData = bitmapper.dataToBitMap(filteredData, this._bitmapInfo);
      normalisedBitmapData = formatNormaliser(bitmapData, this._bitmapInfo);
      bitmapData = null;
    } catch (ex) {
      this._handleError(ex);
      return;
    }
    this.emit("parsed", normalisedBitmapData);
  };
});

// node_modules/pngjs/lib/bitpacker.js
var require_bitpacker = __commonJS(function(exports, module) {
  var constants = require_constants();
  module.exports = function(dataIn, width, height, options) {
    let outHasAlpha = [constants.COLORTYPE_COLOR_ALPHA, constants.COLORTYPE_ALPHA].indexOf(options.colorType) !== -1;
    if (options.colorType === options.inputColorType) {
      let bigEndian = function() {
        let buffer = new ArrayBuffer(2);
        new DataView(buffer).setInt16(0, 256, true);
        return new Int16Array(buffer)[0] !== 256;
      }();
      if (options.bitDepth === 8 || options.bitDepth === 16 && bigEndian) {
        return dataIn;
      }
    }
    let data = options.bitDepth !== 16 ? dataIn : new Uint16Array(dataIn.buffer);
    let maxValue = 255;
    let inBpp = constants.COLORTYPE_TO_BPP_MAP[options.inputColorType];
    if (inBpp === 4 && !options.inputHasAlpha) {
      inBpp = 3;
    }
    let outBpp = constants.COLORTYPE_TO_BPP_MAP[options.colorType];
    if (options.bitDepth === 16) {
      maxValue = 65535;
      outBpp *= 2;
    }
    let outData = Buffer.alloc(width * height * outBpp);
    let inIndex = 0;
    let outIndex = 0;
    let bgColor = options.bgColor || {};
    if (bgColor.red === undefined) {
      bgColor.red = maxValue;
    }
    if (bgColor.green === undefined) {
      bgColor.green = maxValue;
    }
    if (bgColor.blue === undefined) {
      bgColor.blue = maxValue;
    }
    function getRGBA() {
      let red;
      let green;
      let blue;
      let alpha = maxValue;
      switch (options.inputColorType) {
        case constants.COLORTYPE_COLOR_ALPHA:
          alpha = data[inIndex + 3];
          red = data[inIndex];
          green = data[inIndex + 1];
          blue = data[inIndex + 2];
          break;
        case constants.COLORTYPE_COLOR:
          red = data[inIndex];
          green = data[inIndex + 1];
          blue = data[inIndex + 2];
          break;
        case constants.COLORTYPE_ALPHA:
          alpha = data[inIndex + 1];
          red = data[inIndex];
          green = red;
          blue = red;
          break;
        case constants.COLORTYPE_GRAYSCALE:
          red = data[inIndex];
          green = red;
          blue = red;
          break;
        default:
          throw new Error("input color type:" + options.inputColorType + " is not supported at present");
      }
      if (options.inputHasAlpha) {
        if (!outHasAlpha) {
          alpha /= maxValue;
          red = Math.min(Math.max(Math.round((1 - alpha) * bgColor.red + alpha * red), 0), maxValue);
          green = Math.min(Math.max(Math.round((1 - alpha) * bgColor.green + alpha * green), 0), maxValue);
          blue = Math.min(Math.max(Math.round((1 - alpha) * bgColor.blue + alpha * blue), 0), maxValue);
        }
      }
      return { red, green, blue, alpha };
    }
    for (let y = 0;y < height; y++) {
      for (let x = 0;x < width; x++) {
        let rgba = getRGBA(data, inIndex);
        switch (options.colorType) {
          case constants.COLORTYPE_COLOR_ALPHA:
          case constants.COLORTYPE_COLOR:
            if (options.bitDepth === 8) {
              outData[outIndex] = rgba.red;
              outData[outIndex + 1] = rgba.green;
              outData[outIndex + 2] = rgba.blue;
              if (outHasAlpha) {
                outData[outIndex + 3] = rgba.alpha;
              }
            } else {
              outData.writeUInt16BE(rgba.red, outIndex);
              outData.writeUInt16BE(rgba.green, outIndex + 2);
              outData.writeUInt16BE(rgba.blue, outIndex + 4);
              if (outHasAlpha) {
                outData.writeUInt16BE(rgba.alpha, outIndex + 6);
              }
            }
            break;
          case constants.COLORTYPE_ALPHA:
          case constants.COLORTYPE_GRAYSCALE: {
            let grayscale = (rgba.red + rgba.green + rgba.blue) / 3;
            if (options.bitDepth === 8) {
              outData[outIndex] = grayscale;
              if (outHasAlpha) {
                outData[outIndex + 1] = rgba.alpha;
              }
            } else {
              outData.writeUInt16BE(grayscale, outIndex);
              if (outHasAlpha) {
                outData.writeUInt16BE(rgba.alpha, outIndex + 2);
              }
            }
            break;
          }
          default:
            throw new Error("unrecognised color Type " + options.colorType);
        }
        inIndex += inBpp;
        outIndex += outBpp;
      }
    }
    return outData;
  };
});

// node_modules/pngjs/lib/filter-pack.js
var require_filter_pack = __commonJS(function(exports, module) {
  var paethPredictor = require_paeth_predictor();
  function filterNone(pxData, pxPos, byteWidth, rawData, rawPos) {
    for (let x = 0;x < byteWidth; x++) {
      rawData[rawPos + x] = pxData[pxPos + x];
    }
  }
  function filterSumNone(pxData, pxPos, byteWidth) {
    let sum = 0;
    let length = pxPos + byteWidth;
    for (let i = pxPos;i < length; i++) {
      sum += Math.abs(pxData[i]);
    }
    return sum;
  }
  function filterSub(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
    for (let x = 0;x < byteWidth; x++) {
      let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
      let val = pxData[pxPos + x] - left;
      rawData[rawPos + x] = val;
    }
  }
  function filterSumSub(pxData, pxPos, byteWidth, bpp) {
    let sum = 0;
    for (let x = 0;x < byteWidth; x++) {
      let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
      let val = pxData[pxPos + x] - left;
      sum += Math.abs(val);
    }
    return sum;
  }
  function filterUp(pxData, pxPos, byteWidth, rawData, rawPos) {
    for (let x = 0;x < byteWidth; x++) {
      let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
      let val = pxData[pxPos + x] - up;
      rawData[rawPos + x] = val;
    }
  }
  function filterSumUp(pxData, pxPos, byteWidth) {
    let sum = 0;
    let length = pxPos + byteWidth;
    for (let x = pxPos;x < length; x++) {
      let up = pxPos > 0 ? pxData[x - byteWidth] : 0;
      let val = pxData[x] - up;
      sum += Math.abs(val);
    }
    return sum;
  }
  function filterAvg(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
    for (let x = 0;x < byteWidth; x++) {
      let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
      let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
      let val = pxData[pxPos + x] - (left + up >> 1);
      rawData[rawPos + x] = val;
    }
  }
  function filterSumAvg(pxData, pxPos, byteWidth, bpp) {
    let sum = 0;
    for (let x = 0;x < byteWidth; x++) {
      let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
      let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
      let val = pxData[pxPos + x] - (left + up >> 1);
      sum += Math.abs(val);
    }
    return sum;
  }
  function filterPaeth(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
    for (let x = 0;x < byteWidth; x++) {
      let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
      let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
      let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
      let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
      rawData[rawPos + x] = val;
    }
  }
  function filterSumPaeth(pxData, pxPos, byteWidth, bpp) {
    let sum = 0;
    for (let x = 0;x < byteWidth; x++) {
      let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
      let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
      let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
      let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
      sum += Math.abs(val);
    }
    return sum;
  }
  var filters = {
    0: filterNone,
    1: filterSub,
    2: filterUp,
    3: filterAvg,
    4: filterPaeth
  };
  var filterSums = {
    0: filterSumNone,
    1: filterSumSub,
    2: filterSumUp,
    3: filterSumAvg,
    4: filterSumPaeth
  };
  module.exports = function(pxData, width, height, options, bpp) {
    let filterTypes;
    if (!("filterType" in options) || options.filterType === -1) {
      filterTypes = [0, 1, 2, 3, 4];
    } else if (typeof options.filterType === "number") {
      filterTypes = [options.filterType];
    } else {
      throw new Error("unrecognised filter types");
    }
    if (options.bitDepth === 16) {
      bpp *= 2;
    }
    let byteWidth = width * bpp;
    let rawPos = 0;
    let pxPos = 0;
    let rawData = Buffer.alloc((byteWidth + 1) * height);
    let sel = filterTypes[0];
    for (let y = 0;y < height; y++) {
      if (filterTypes.length > 1) {
        let min = Infinity;
        for (let i = 0;i < filterTypes.length; i++) {
          let sum = filterSums[filterTypes[i]](pxData, pxPos, byteWidth, bpp);
          if (sum < min) {
            sel = filterTypes[i];
            min = sum;
          }
        }
      }
      rawData[rawPos] = sel;
      rawPos++;
      filters[sel](pxData, pxPos, byteWidth, rawData, rawPos, bpp);
      rawPos += byteWidth;
      pxPos += byteWidth;
    }
    return rawData;
  };
});

// node_modules/pngjs/lib/packer.js
var require_packer = __commonJS(function(exports, module) {
  var constants = require_constants();
  var CrcStream = require_crc();
  var bitPacker = require_bitpacker();
  var filter = require_filter_pack();
  var zlib = __require("zlib");
  var Packer = module.exports = function(options) {
    this._options = options;
    options.deflateChunkSize = options.deflateChunkSize || 32 * 1024;
    options.deflateLevel = options.deflateLevel != null ? options.deflateLevel : 9;
    options.deflateStrategy = options.deflateStrategy != null ? options.deflateStrategy : 3;
    options.inputHasAlpha = options.inputHasAlpha != null ? options.inputHasAlpha : true;
    options.deflateFactory = options.deflateFactory || zlib.createDeflate;
    options.bitDepth = options.bitDepth || 8;
    options.colorType = typeof options.colorType === "number" ? options.colorType : constants.COLORTYPE_COLOR_ALPHA;
    options.inputColorType = typeof options.inputColorType === "number" ? options.inputColorType : constants.COLORTYPE_COLOR_ALPHA;
    if ([
      constants.COLORTYPE_GRAYSCALE,
      constants.COLORTYPE_COLOR,
      constants.COLORTYPE_COLOR_ALPHA,
      constants.COLORTYPE_ALPHA
    ].indexOf(options.colorType) === -1) {
      throw new Error("option color type:" + options.colorType + " is not supported at present");
    }
    if ([
      constants.COLORTYPE_GRAYSCALE,
      constants.COLORTYPE_COLOR,
      constants.COLORTYPE_COLOR_ALPHA,
      constants.COLORTYPE_ALPHA
    ].indexOf(options.inputColorType) === -1) {
      throw new Error("option input color type:" + options.inputColorType + " is not supported at present");
    }
    if (options.bitDepth !== 8 && options.bitDepth !== 16) {
      throw new Error("option bit depth:" + options.bitDepth + " is not supported at present");
    }
  };
  Packer.prototype.getDeflateOptions = function() {
    return {
      chunkSize: this._options.deflateChunkSize,
      level: this._options.deflateLevel,
      strategy: this._options.deflateStrategy
    };
  };
  Packer.prototype.createDeflate = function() {
    return this._options.deflateFactory(this.getDeflateOptions());
  };
  Packer.prototype.filterData = function(data, width, height) {
    let packedData = bitPacker(data, width, height, this._options);
    let bpp = constants.COLORTYPE_TO_BPP_MAP[this._options.colorType];
    let filteredData = filter(packedData, width, height, this._options, bpp);
    return filteredData;
  };
  Packer.prototype._packChunk = function(type, data) {
    let len = data ? data.length : 0;
    let buf = Buffer.alloc(len + 12);
    buf.writeUInt32BE(len, 0);
    buf.writeUInt32BE(type, 4);
    if (data) {
      data.copy(buf, 8);
    }
    buf.writeInt32BE(CrcStream.crc32(buf.slice(4, buf.length - 4)), buf.length - 4);
    return buf;
  };
  Packer.prototype.packGAMA = function(gamma) {
    let buf = Buffer.alloc(4);
    buf.writeUInt32BE(Math.floor(gamma * constants.GAMMA_DIVISION), 0);
    return this._packChunk(constants.TYPE_gAMA, buf);
  };
  Packer.prototype.packIHDR = function(width, height) {
    let buf = Buffer.alloc(13);
    buf.writeUInt32BE(width, 0);
    buf.writeUInt32BE(height, 4);
    buf[8] = this._options.bitDepth;
    buf[9] = this._options.colorType;
    buf[10] = 0;
    buf[11] = 0;
    buf[12] = 0;
    return this._packChunk(constants.TYPE_IHDR, buf);
  };
  Packer.prototype.packIDAT = function(data) {
    return this._packChunk(constants.TYPE_IDAT, data);
  };
  Packer.prototype.packIEND = function() {
    return this._packChunk(constants.TYPE_IEND, null);
  };
});

// node_modules/pngjs/lib/packer-async.js
var require_packer_async = __commonJS(function(exports, module) {
  var util = __require("util");
  var Stream = __require("stream");
  var constants = require_constants();
  var Packer = require_packer();
  var PackerAsync = module.exports = function(opt) {
    Stream.call(this);
    let options = opt || {};
    this._packer = new Packer(options);
    this._deflate = this._packer.createDeflate();
    this.readable = true;
  };
  util.inherits(PackerAsync, Stream);
  PackerAsync.prototype.pack = function(data, width, height, gamma) {
    this.emit("data", Buffer.from(constants.PNG_SIGNATURE));
    this.emit("data", this._packer.packIHDR(width, height));
    if (gamma) {
      this.emit("data", this._packer.packGAMA(gamma));
    }
    let filteredData = this._packer.filterData(data, width, height);
    this._deflate.on("error", this.emit.bind(this, "error"));
    this._deflate.on("data", function(compressedData) {
      this.emit("data", this._packer.packIDAT(compressedData));
    }.bind(this));
    this._deflate.on("end", function() {
      this.emit("data", this._packer.packIEND());
      this.emit("end");
    }.bind(this));
    this._deflate.end(filteredData);
  };
});

// node_modules/pngjs/lib/sync-inflate.js
var require_sync_inflate = __commonJS(function(exports, module) {
  var assert = __require("assert").ok;
  var zlib = __require("zlib");
  var util = __require("util");
  var kMaxLength = __require("buffer").kMaxLength;
  function Inflate(opts) {
    if (!(this instanceof Inflate)) {
      return new Inflate(opts);
    }
    if (opts && opts.chunkSize < zlib.Z_MIN_CHUNK) {
      opts.chunkSize = zlib.Z_MIN_CHUNK;
    }
    zlib.Inflate.call(this, opts);
    this._offset = this._offset === undefined ? this._outOffset : this._offset;
    this._buffer = this._buffer || this._outBuffer;
    if (opts && opts.maxLength != null) {
      this._maxLength = opts.maxLength;
    }
  }
  function createInflate(opts) {
    return new Inflate(opts);
  }
  function _close(engine, callback) {
    if (callback) {
      process.nextTick(callback);
    }
    if (!engine._handle) {
      return;
    }
    engine._handle.close();
    engine._handle = null;
  }
  Inflate.prototype._processChunk = function(chunk, flushFlag, asyncCb) {
    if (typeof asyncCb === "function") {
      return zlib.Inflate._processChunk.call(this, chunk, flushFlag, asyncCb);
    }
    let self = this;
    let availInBefore = chunk && chunk.length;
    let availOutBefore = this._chunkSize - this._offset;
    let leftToInflate = this._maxLength;
    let inOff = 0;
    let buffers = [];
    let nread = 0;
    let error;
    this.on("error", function(err) {
      error = err;
    });
    function handleChunk(availInAfter, availOutAfter) {
      if (self._hadError) {
        return;
      }
      let have = availOutBefore - availOutAfter;
      assert(have >= 0, "have should not go down");
      if (have > 0) {
        let out = self._buffer.slice(self._offset, self._offset + have);
        self._offset += have;
        if (out.length > leftToInflate) {
          out = out.slice(0, leftToInflate);
        }
        buffers.push(out);
        nread += out.length;
        leftToInflate -= out.length;
        if (leftToInflate === 0) {
          return false;
        }
      }
      if (availOutAfter === 0 || self._offset >= self._chunkSize) {
        availOutBefore = self._chunkSize;
        self._offset = 0;
        self._buffer = Buffer.allocUnsafe(self._chunkSize);
      }
      if (availOutAfter === 0) {
        inOff += availInBefore - availInAfter;
        availInBefore = availInAfter;
        return true;
      }
      return false;
    }
    assert(this._handle, "zlib binding closed");
    let res;
    do {
      res = this._handle.writeSync(flushFlag, chunk, inOff, availInBefore, this._buffer, this._offset, availOutBefore);
      res = res || this._writeState;
    } while (!this._hadError && handleChunk(res[0], res[1]));
    if (this._hadError) {
      throw error;
    }
    if (nread >= kMaxLength) {
      _close(this);
      throw new RangeError("Cannot create final Buffer. It would be larger than 0x" + kMaxLength.toString(16) + " bytes");
    }
    let buf = Buffer.concat(buffers, nread);
    _close(this);
    return buf;
  };
  util.inherits(Inflate, zlib.Inflate);
  function zlibBufferSync(engine, buffer) {
    if (typeof buffer === "string") {
      buffer = Buffer.from(buffer);
    }
    if (!(buffer instanceof Buffer)) {
      throw new TypeError("Not a string or buffer");
    }
    let flushFlag = engine._finishFlushFlag;
    if (flushFlag == null) {
      flushFlag = zlib.Z_FINISH;
    }
    return engine._processChunk(buffer, flushFlag);
  }
  function inflateSync(buffer, opts) {
    return zlibBufferSync(new Inflate(opts), buffer);
  }
  module.exports = exports = inflateSync;
  exports.Inflate = Inflate;
  exports.createInflate = createInflate;
  exports.inflateSync = inflateSync;
});

// node_modules/pngjs/lib/sync-reader.js
var require_sync_reader = __commonJS(function(exports, module) {
  var SyncReader = module.exports = function(buffer) {
    this._buffer = buffer;
    this._reads = [];
  };
  SyncReader.prototype.read = function(length, callback) {
    this._reads.push({
      length: Math.abs(length),
      allowLess: length < 0,
      func: callback
    });
  };
  SyncReader.prototype.process = function() {
    while (this._reads.length > 0 && this._buffer.length) {
      let read = this._reads[0];
      if (this._buffer.length && (this._buffer.length >= read.length || read.allowLess)) {
        this._reads.shift();
        let buf = this._buffer;
        this._buffer = buf.slice(read.length);
        read.func.call(this, buf.slice(0, read.length));
      } else {
        break;
      }
    }
    if (this._reads.length > 0) {
      return new Error("There are some read requests waitng on finished stream");
    }
    if (this._buffer.length > 0) {
      return new Error("unrecognised content at end of stream");
    }
  };
});

// node_modules/pngjs/lib/filter-parse-sync.js
var require_filter_parse_sync = __commonJS(function(exports) {
  var SyncReader = require_sync_reader();
  var Filter = require_filter_parse();
  exports.process = function(inBuffer, bitmapInfo) {
    let outBuffers = [];
    let reader = new SyncReader(inBuffer);
    let filter = new Filter(bitmapInfo, {
      read: reader.read.bind(reader),
      write: function(bufferPart) {
        outBuffers.push(bufferPart);
      },
      complete: function() {}
    });
    filter.start();
    reader.process();
    return Buffer.concat(outBuffers);
  };
});

// node_modules/pngjs/lib/parser-sync.js
var require_parser_sync = __commonJS(function(exports, module) {
  var hasSyncZlib = true;
  var zlib = __require("zlib");
  var inflateSync = require_sync_inflate();
  if (!zlib.deflateSync) {
    hasSyncZlib = false;
  }
  var SyncReader = require_sync_reader();
  var FilterSync = require_filter_parse_sync();
  var Parser = require_parser();
  var bitmapper = require_bitmapper();
  var formatNormaliser = require_format_normaliser();
  module.exports = function(buffer, options) {
    if (!hasSyncZlib) {
      throw new Error("To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0");
    }
    let err;
    function handleError(_err_) {
      err = _err_;
    }
    let metaData;
    function handleMetaData(_metaData_) {
      metaData = _metaData_;
    }
    function handleTransColor(transColor) {
      metaData.transColor = transColor;
    }
    function handlePalette(palette) {
      metaData.palette = palette;
    }
    function handleSimpleTransparency() {
      metaData.alpha = true;
    }
    let gamma;
    function handleGamma(_gamma_) {
      gamma = _gamma_;
    }
    let inflateDataList = [];
    function handleInflateData(inflatedData) {
      inflateDataList.push(inflatedData);
    }
    let reader = new SyncReader(buffer);
    let parser = new Parser(options, {
      read: reader.read.bind(reader),
      error: handleError,
      metadata: handleMetaData,
      gamma: handleGamma,
      palette: handlePalette,
      transColor: handleTransColor,
      inflateData: handleInflateData,
      simpleTransparency: handleSimpleTransparency
    });
    parser.start();
    reader.process();
    if (err) {
      throw err;
    }
    let inflateData = Buffer.concat(inflateDataList);
    inflateDataList.length = 0;
    let inflatedData;
    if (metaData.interlace) {
      inflatedData = zlib.inflateSync(inflateData);
    } else {
      let rowSize = (metaData.width * metaData.bpp * metaData.depth + 7 >> 3) + 1;
      let imageSize = rowSize * metaData.height;
      inflatedData = inflateSync(inflateData, {
        chunkSize: imageSize,
        maxLength: imageSize
      });
    }
    inflateData = null;
    if (!inflatedData || !inflatedData.length) {
      throw new Error("bad png - invalid inflate data response");
    }
    let unfilteredData = FilterSync.process(inflatedData, metaData);
    inflateData = null;
    let bitmapData = bitmapper.dataToBitMap(unfilteredData, metaData);
    unfilteredData = null;
    let normalisedBitmapData = formatNormaliser(bitmapData, metaData);
    metaData.data = normalisedBitmapData;
    metaData.gamma = gamma || 0;
    return metaData;
  };
});

// node_modules/pngjs/lib/packer-sync.js
var require_packer_sync = __commonJS(function(exports, module) {
  var hasSyncZlib = true;
  var zlib = __require("zlib");
  if (!zlib.deflateSync) {
    hasSyncZlib = false;
  }
  var constants = require_constants();
  var Packer = require_packer();
  module.exports = function(metaData, opt) {
    if (!hasSyncZlib) {
      throw new Error("To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0");
    }
    let options = opt || {};
    let packer = new Packer(options);
    let chunks = [];
    chunks.push(Buffer.from(constants.PNG_SIGNATURE));
    chunks.push(packer.packIHDR(metaData.width, metaData.height));
    if (metaData.gamma) {
      chunks.push(packer.packGAMA(metaData.gamma));
    }
    let filteredData = packer.filterData(metaData.data, metaData.width, metaData.height);
    let compressedData = zlib.deflateSync(filteredData, packer.getDeflateOptions());
    filteredData = null;
    if (!compressedData || !compressedData.length) {
      throw new Error("bad png - invalid compressed data response");
    }
    chunks.push(packer.packIDAT(compressedData));
    chunks.push(packer.packIEND());
    return Buffer.concat(chunks);
  };
});

// node_modules/pngjs/lib/png-sync.js
var require_png_sync = __commonJS(function(exports) {
  var parse = require_parser_sync();
  var pack = require_packer_sync();
  exports.read = function(buffer, options) {
    return parse(buffer, options || {});
  };
  exports.write = function(png, options) {
    return pack(png, options);
  };
});

// node_modules/pngjs/lib/png.js
var require_png = __commonJS(function(exports) {
  var util = __require("util");
  var Stream = __require("stream");
  var Parser = require_parser_async();
  var Packer = require_packer_async();
  var PNGSync = require_png_sync();
  var PNG = exports.PNG = function(options) {
    Stream.call(this);
    options = options || {};
    this.width = options.width | 0;
    this.height = options.height | 0;
    this.data = this.width > 0 && this.height > 0 ? Buffer.alloc(4 * this.width * this.height) : null;
    if (options.fill && this.data) {
      this.data.fill(0);
    }
    this.gamma = 0;
    this.readable = this.writable = true;
    this._parser = new Parser(options);
    this._parser.on("error", this.emit.bind(this, "error"));
    this._parser.on("close", this._handleClose.bind(this));
    this._parser.on("metadata", this._metadata.bind(this));
    this._parser.on("gamma", this._gamma.bind(this));
    this._parser.on("parsed", function(data) {
      this.data = data;
      this.emit("parsed", data);
    }.bind(this));
    this._packer = new Packer(options);
    this._packer.on("data", this.emit.bind(this, "data"));
    this._packer.on("end", this.emit.bind(this, "end"));
    this._parser.on("close", this._handleClose.bind(this));
    this._packer.on("error", this.emit.bind(this, "error"));
  };
  util.inherits(PNG, Stream);
  PNG.sync = PNGSync;
  PNG.prototype.pack = function() {
    if (!this.data || !this.data.length) {
      this.emit("error", "No data provided");
      return this;
    }
    process.nextTick(function() {
      this._packer.pack(this.data, this.width, this.height, this.gamma);
    }.bind(this));
    return this;
  };
  PNG.prototype.parse = function(data, callback) {
    if (callback) {
      let onParsed, onError;
      onParsed = function(parsedData) {
        this.removeListener("error", onError);
        this.data = parsedData;
        callback(null, this);
      }.bind(this);
      onError = function(err) {
        this.removeListener("parsed", onParsed);
        callback(err, null);
      }.bind(this);
      this.once("parsed", onParsed);
      this.once("error", onError);
    }
    this.end(data);
    return this;
  };
  PNG.prototype.write = function(data) {
    this._parser.write(data);
    return true;
  };
  PNG.prototype.end = function(data) {
    this._parser.end(data);
  };
  PNG.prototype._metadata = function(metadata) {
    this.width = metadata.width;
    this.height = metadata.height;
    this.emit("metadata", metadata);
  };
  PNG.prototype._gamma = function(gamma) {
    this.gamma = gamma;
  };
  PNG.prototype._handleClose = function() {
    if (!this._parser.writable && !this._packer.readable) {
      this.emit("close");
    }
  };
  PNG.bitblt = function(src, dst, srcX, srcY, width, height, deltaX, deltaY) {
    srcX |= 0;
    srcY |= 0;
    width |= 0;
    height |= 0;
    deltaX |= 0;
    deltaY |= 0;
    if (srcX > src.width || srcY > src.height || srcX + width > src.width || srcY + height > src.height) {
      throw new Error("bitblt reading outside image");
    }
    if (deltaX > dst.width || deltaY > dst.height || deltaX + width > dst.width || deltaY + height > dst.height) {
      throw new Error("bitblt writing outside image");
    }
    for (let y = 0;y < height; y++) {
      src.data.copy(dst.data, (deltaY + y) * dst.width + deltaX << 2, (srcY + y) * src.width + srcX << 2, (srcY + y) * src.width + srcX + width << 2);
    }
  };
  PNG.prototype.bitblt = function(dst, srcX, srcY, width, height, deltaX, deltaY) {
    PNG.bitblt(this, dst, srcX, srcY, width, height, deltaX, deltaY);
    return this;
  };
  PNG.adjustGamma = function(src) {
    if (src.gamma) {
      for (let y = 0;y < src.height; y++) {
        for (let x = 0;x < src.width; x++) {
          let idx = src.width * y + x << 2;
          for (let i = 0;i < 3; i++) {
            let sample = src.data[idx + i] / 255;
            sample = Math.pow(sample, 1 / 2.2 / src.gamma);
            src.data[idx + i] = Math.round(sample * 255);
          }
        }
      }
      src.gamma = 0;
    }
  };
  PNG.prototype.adjustGamma = function() {
    PNG.adjustGamma(this);
  };
});

// node_modules/qrcode/lib/renderer/utils.js
var require_utils2 = __commonJS(function(exports) {
  function hex2rgba(hex) {
    if (typeof hex === "number") {
      hex = hex.toString();
    }
    if (typeof hex !== "string") {
      throw new Error("Color should be defined as hex string");
    }
    let hexCode = hex.slice().replace("#", "").split("");
    if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
      throw new Error("Invalid hex color: " + hex);
    }
    if (hexCode.length === 3 || hexCode.length === 4) {
      hexCode = Array.prototype.concat.apply([], hexCode.map(function(c) {
        return [c, c];
      }));
    }
    if (hexCode.length === 6)
      hexCode.push("F", "F");
    const hexValue = parseInt(hexCode.join(""), 16);
    return {
      r: hexValue >> 24 & 255,
      g: hexValue >> 16 & 255,
      b: hexValue >> 8 & 255,
      a: hexValue & 255,
      hex: "#" + hexCode.slice(0, 6).join("")
    };
  }
  exports.getOptions = function getOptions(options) {
    if (!options)
      options = {};
    if (!options.color)
      options.color = {};
    const margin = typeof options.margin === "undefined" || options.margin === null || options.margin < 0 ? 4 : options.margin;
    const width = options.width && options.width >= 21 ? options.width : undefined;
    const scale = options.scale || 4;
    return {
      width,
      scale: width ? 4 : scale,
      margin,
      color: {
        dark: hex2rgba(options.color.dark || "#000000ff"),
        light: hex2rgba(options.color.light || "#ffffffff")
      },
      type: options.type,
      rendererOpts: options.rendererOpts || {}
    };
  };
  exports.getScale = function getScale(qrSize, opts) {
    return opts.width && opts.width >= qrSize + opts.margin * 2 ? opts.width / (qrSize + opts.margin * 2) : opts.scale;
  };
  exports.getImageWidth = function getImageWidth(qrSize, opts) {
    const scale = exports.getScale(qrSize, opts);
    return Math.floor((qrSize + opts.margin * 2) * scale);
  };
  exports.qrToImageData = function qrToImageData(imgData, qr, opts) {
    const size = qr.modules.size;
    const data = qr.modules.data;
    const scale = exports.getScale(size, opts);
    const symbolSize = Math.floor((size + opts.margin * 2) * scale);
    const scaledMargin = opts.margin * scale;
    const palette = [opts.color.light, opts.color.dark];
    for (let i = 0;i < symbolSize; i++) {
      for (let j = 0;j < symbolSize; j++) {
        let posDst = (i * symbolSize + j) * 4;
        let pxColor = opts.color.light;
        if (i >= scaledMargin && j >= scaledMargin && i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
          const iSrc = Math.floor((i - scaledMargin) / scale);
          const jSrc = Math.floor((j - scaledMargin) / scale);
          pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
        }
        imgData[posDst++] = pxColor.r;
        imgData[posDst++] = pxColor.g;
        imgData[posDst++] = pxColor.b;
        imgData[posDst] = pxColor.a;
      }
    }
  };
});

// node_modules/qrcode/lib/renderer/png.js
var require_png2 = __commonJS(function(exports) {
  var fs = __require("fs");
  var PNG = require_png().PNG;
  var Utils = require_utils2();
  exports.render = function render(qrData, options) {
    const opts = Utils.getOptions(options);
    const pngOpts = opts.rendererOpts;
    const size = Utils.getImageWidth(qrData.modules.size, opts);
    pngOpts.width = size;
    pngOpts.height = size;
    const pngImage = new PNG(pngOpts);
    Utils.qrToImageData(pngImage.data, qrData, opts);
    return pngImage;
  };
  exports.renderToDataURL = function renderToDataURL(qrData, options, cb) {
    if (typeof cb === "undefined") {
      cb = options;
      options = undefined;
    }
    exports.renderToBuffer(qrData, options, function(err, output) {
      if (err)
        cb(err);
      let url = "data:image/png;base64,";
      url += output.toString("base64");
      cb(null, url);
    });
  };
  exports.renderToBuffer = function renderToBuffer(qrData, options, cb) {
    if (typeof cb === "undefined") {
      cb = options;
      options = undefined;
    }
    const png = exports.render(qrData, options);
    const buffer = [];
    png.on("error", cb);
    png.on("data", function(data) {
      buffer.push(data);
    });
    png.on("end", function() {
      cb(null, Buffer.concat(buffer));
    });
    png.pack();
  };
  exports.renderToFile = function renderToFile(path, qrData, options, cb) {
    if (typeof cb === "undefined") {
      cb = options;
      options = undefined;
    }
    let called = false;
    const done = (...args) => {
      if (called)
        return;
      called = true;
      cb.apply(null, args);
    };
    const stream = fs.createWriteStream(path);
    stream.on("error", done);
    stream.on("close", done);
    exports.renderToFileStream(stream, qrData, options);
  };
  exports.renderToFileStream = function renderToFileStream(stream, qrData, options) {
    const png = exports.render(qrData, options);
    png.pack().pipe(stream);
  };
});

// node_modules/qrcode/lib/renderer/utf8.js
var require_utf8 = __commonJS(function(exports) {
  var Utils = require_utils2();
  var BLOCK_CHAR = {
    WW: " ",
    WB: "\u2584",
    BB: "\u2588",
    BW: "\u2580"
  };
  var INVERTED_BLOCK_CHAR = {
    BB: " ",
    BW: "\u2584",
    WW: "\u2588",
    WB: "\u2580"
  };
  function getBlockChar(top, bottom, blocks) {
    if (top && bottom)
      return blocks.BB;
    if (top && !bottom)
      return blocks.BW;
    if (!top && bottom)
      return blocks.WB;
    return blocks.WW;
  }
  exports.render = function(qrData, options, cb) {
    const opts = Utils.getOptions(options);
    let blocks = BLOCK_CHAR;
    if (opts.color.dark.hex === "#ffffff" || opts.color.light.hex === "#000000") {
      blocks = INVERTED_BLOCK_CHAR;
    }
    const size = qrData.modules.size;
    const data = qrData.modules.data;
    let output = "";
    let hMargin = Array(size + opts.margin * 2 + 1).join(blocks.WW);
    hMargin = Array(opts.margin / 2 + 1).join(hMargin + `
`);
    const vMargin = Array(opts.margin + 1).join(blocks.WW);
    output += hMargin;
    for (let i = 0;i < size; i += 2) {
      output += vMargin;
      for (let j = 0;j < size; j++) {
        const topModule = data[i * size + j];
        const bottomModule = data[(i + 1) * size + j];
        output += getBlockChar(topModule, bottomModule, blocks);
      }
      output += vMargin + `
`;
    }
    output += hMargin.slice(0, -1);
    if (typeof cb === "function") {
      cb(null, output);
    }
    return output;
  };
  exports.renderToFile = function renderToFile(path, qrData, options, cb) {
    if (typeof cb === "undefined") {
      cb = options;
      options = undefined;
    }
    const fs = __require("fs");
    const utf8 = exports.render(qrData, options);
    fs.writeFile(path, utf8, cb);
  };
});

// node_modules/qrcode/lib/renderer/terminal/terminal.js
var require_terminal = __commonJS(function(exports) {
  exports.render = function(qrData, options, cb) {
    const size = qrData.modules.size;
    const data = qrData.modules.data;
    const black = "\x1B[40m  \x1B[0m";
    const white = "\x1B[47m  \x1B[0m";
    let output = "";
    const hMargin = Array(size + 3).join(white);
    const vMargin = Array(2).join(white);
    output += hMargin + `
`;
    for (let i = 0;i < size; ++i) {
      output += white;
      for (let j = 0;j < size; j++) {
        output += data[i * size + j] ? black : white;
      }
      output += vMargin + `
`;
    }
    output += hMargin + `
`;
    if (typeof cb === "function") {
      cb(null, output);
    }
    return output;
  };
});

// node_modules/qrcode/lib/renderer/terminal/terminal-small.js
var require_terminal_small = __commonJS(function(exports) {
  var backgroundWhite = "\x1B[47m";
  var backgroundBlack = "\x1B[40m";
  var foregroundWhite = "\x1B[37m";
  var foregroundBlack = "\x1B[30m";
  var reset = "\x1B[0m";
  var lineSetupNormal = backgroundWhite + foregroundBlack;
  var lineSetupInverse = backgroundBlack + foregroundWhite;
  var createPalette = function(lineSetup, foregroundWhite, foregroundBlack) {
    return {
      "00": reset + " " + lineSetup,
      "01": reset + foregroundWhite + "\u2584" + lineSetup,
      "02": reset + foregroundBlack + "\u2584" + lineSetup,
      10: reset + foregroundWhite + "\u2580" + lineSetup,
      11: " ",
      12: "\u2584",
      20: reset + foregroundBlack + "\u2580" + lineSetup,
      21: "\u2580",
      22: "\u2588"
    };
  };
  var mkCodePixel = function(modules, size, x, y) {
    const sizePlus = size + 1;
    if (x >= sizePlus || y >= sizePlus || y < -1 || x < -1)
      return "0";
    if (x >= size || y >= size || y < 0 || x < 0)
      return "1";
    const idx = y * size + x;
    return modules[idx] ? "2" : "1";
  };
  var mkCode = function(modules, size, x, y) {
    return mkCodePixel(modules, size, x, y) + mkCodePixel(modules, size, x, y + 1);
  };
  exports.render = function(qrData, options, cb) {
    const size = qrData.modules.size;
    const data = qrData.modules.data;
    const inverse = !!(options && options.inverse);
    const lineSetup = options && options.inverse ? lineSetupInverse : lineSetupNormal;
    const white = inverse ? foregroundBlack : foregroundWhite;
    const black = inverse ? foregroundWhite : foregroundBlack;
    const palette = createPalette(lineSetup, white, black);
    const newLine = reset + `
` + lineSetup;
    let output = lineSetup;
    for (let y = -1;y < size + 1; y += 2) {
      for (let x = -1;x < size; x++) {
        output += palette[mkCode(data, size, x, y)];
      }
      output += palette[mkCode(data, size, size, y)] + newLine;
    }
    output += reset;
    if (typeof cb === "function") {
      cb(null, output);
    }
    return output;
  };
});

// node_modules/qrcode/lib/renderer/terminal.js
var require_terminal2 = __commonJS(function(exports) {
  var big = require_terminal();
  var small = require_terminal_small();
  exports.render = function(qrData, options, cb) {
    if (options && options.small) {
      return small.render(qrData, options, cb);
    }
    return big.render(qrData, options, cb);
  };
});

// node_modules/qrcode/lib/renderer/svg-tag.js
var require_svg_tag = __commonJS(function(exports) {
  var Utils = require_utils2();
  function getColorAttrib(color, attrib) {
    const alpha = color.a / 255;
    const str = attrib + '="' + color.hex + '"';
    return alpha < 1 ? str + " " + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"' : str;
  }
  function svgCmd(cmd, x, y) {
    let str = cmd + x;
    if (typeof y !== "undefined")
      str += " " + y;
    return str;
  }
  function qrToPath(data, size, margin) {
    let path = "";
    let moveBy = 0;
    let newRow = false;
    let lineLength = 0;
    for (let i = 0;i < data.length; i++) {
      const col = Math.floor(i % size);
      const row = Math.floor(i / size);
      if (!col && !newRow)
        newRow = true;
      if (data[i]) {
        lineLength++;
        if (!(i > 0 && col > 0 && data[i - 1])) {
          path += newRow ? svgCmd("M", col + margin, 0.5 + row + margin) : svgCmd("m", moveBy, 0);
          moveBy = 0;
          newRow = false;
        }
        if (!(col + 1 < size && data[i + 1])) {
          path += svgCmd("h", lineLength);
          lineLength = 0;
        }
      } else {
        moveBy++;
      }
    }
    return path;
  }
  exports.render = function render(qrData, options, cb) {
    const opts = Utils.getOptions(options);
    const size = qrData.modules.size;
    const data = qrData.modules.data;
    const qrcodesize = size + opts.margin * 2;
    const bg = !opts.color.light.a ? "" : "<path " + getColorAttrib(opts.color.light, "fill") + ' d="M0 0h' + qrcodesize + "v" + qrcodesize + 'H0z"/>';
    const path = "<path " + getColorAttrib(opts.color.dark, "stroke") + ' d="' + qrToPath(data, size, opts.margin) + '"/>';
    const viewBox = 'viewBox="' + "0 0 " + qrcodesize + " " + qrcodesize + '"';
    const width = !opts.width ? "" : 'width="' + opts.width + '" height="' + opts.width + '" ';
    const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path + `</svg>
`;
    if (typeof cb === "function") {
      cb(null, svgTag);
    }
    return svgTag;
  };
});

// node_modules/qrcode/lib/renderer/svg.js
var require_svg = __commonJS(function(exports) {
  var svgTagRenderer = require_svg_tag();
  exports.render = svgTagRenderer.render;
  exports.renderToFile = function renderToFile(path, qrData, options, cb) {
    if (typeof cb === "undefined") {
      cb = options;
      options = undefined;
    }
    const fs = __require("fs");
    const svgTag = exports.render(qrData, options);
    const xmlStr = '<?xml version="1.0" encoding="utf-8"?>' + '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' + svgTag;
    fs.writeFile(path, xmlStr, cb);
  };
});

// node_modules/qrcode/lib/renderer/canvas.js
var require_canvas = __commonJS(function(exports) {
  var Utils = require_utils2();
  function clearCanvas(ctx, canvas, size) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!canvas.style)
      canvas.style = {};
    canvas.height = size;
    canvas.width = size;
    canvas.style.height = size + "px";
    canvas.style.width = size + "px";
  }
  function getCanvasElement() {
    try {
      return document.createElement("canvas");
    } catch (e) {
      throw new Error("You need to specify a canvas element");
    }
  }
  exports.render = function render(qrData, canvas, options) {
    let opts = options;
    let canvasEl = canvas;
    if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
      opts = canvas;
      canvas = undefined;
    }
    if (!canvas) {
      canvasEl = getCanvasElement();
    }
    opts = Utils.getOptions(opts);
    const size = Utils.getImageWidth(qrData.modules.size, opts);
    const ctx = canvasEl.getContext("2d");
    const image = ctx.createImageData(size, size);
    Utils.qrToImageData(image.data, qrData, opts);
    clearCanvas(ctx, canvasEl, size);
    ctx.putImageData(image, 0, 0);
    return canvasEl;
  };
  exports.renderToDataURL = function renderToDataURL(qrData, canvas, options) {
    let opts = options;
    if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
      opts = canvas;
      canvas = undefined;
    }
    if (!opts)
      opts = {};
    const canvasEl = exports.render(qrData, canvas, opts);
    const type = opts.type || "image/png";
    const rendererOpts = opts.rendererOpts || {};
    return canvasEl.toDataURL(type, rendererOpts.quality);
  };
});

// node_modules/qrcode/lib/browser.js
var require_browser = __commonJS(function(exports) {
  var canPromise = require_can_promise();
  var QRCode = require_qrcode();
  var CanvasRenderer = require_canvas();
  var SvgRenderer = require_svg_tag();
  function renderCanvas(renderFunc, canvas, text, opts, cb) {
    const args = [].slice.call(arguments, 1);
    const argsNum = args.length;
    const isLastArgCb = typeof args[argsNum - 1] === "function";
    if (!isLastArgCb && !canPromise()) {
      throw new Error("Callback required as last argument");
    }
    if (isLastArgCb) {
      if (argsNum < 2) {
        throw new Error("Too few arguments provided");
      }
      if (argsNum === 2) {
        cb = text;
        text = canvas;
        canvas = opts = undefined;
      } else if (argsNum === 3) {
        if (canvas.getContext && typeof cb === "undefined") {
          cb = opts;
          opts = undefined;
        } else {
          cb = opts;
          opts = text;
          text = canvas;
          canvas = undefined;
        }
      }
    } else {
      if (argsNum < 1) {
        throw new Error("Too few arguments provided");
      }
      if (argsNum === 1) {
        text = canvas;
        canvas = opts = undefined;
      } else if (argsNum === 2 && !canvas.getContext) {
        opts = text;
        text = canvas;
        canvas = undefined;
      }
      return new Promise(function(resolve, reject) {
        try {
          const data = QRCode.create(text, opts);
          resolve(renderFunc(data, canvas, opts));
        } catch (e) {
          reject(e);
        }
      });
    }
    try {
      const data = QRCode.create(text, opts);
      cb(null, renderFunc(data, canvas, opts));
    } catch (e) {
      cb(e);
    }
  }
  exports.create = QRCode.create;
  exports.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
  exports.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);
  exports.toString = renderCanvas.bind(null, function(data, _, opts) {
    return SvgRenderer.render(data, opts);
  });
});

// node_modules/jsbn/index.js
var require_jsbn = __commonJS(function(exports, module) {
  (function() {
    var dbits;
    var canary = 244837814094590;
    var j_lm = (canary & 16777215) == 15715070;
    function BigInteger(a, b, c) {
      if (a != null)
        if (typeof a == "number")
          this.fromNumber(a, b, c);
        else if (b == null && typeof a != "string")
          this.fromString(a, 256);
        else
          this.fromString(a, b);
    }
    function nbi() {
      return new BigInteger(null);
    }
    function am1(i, x, w, j, c, n) {
      while (--n >= 0) {
        var v = x * this[i++] + w[j] + c;
        c = Math.floor(v / 67108864);
        w[j++] = v & 67108863;
      }
      return c;
    }
    function am2(i, x, w, j, c, n) {
      var xl = x & 32767, xh = x >> 15;
      while (--n >= 0) {
        var l = this[i] & 32767;
        var h = this[i++] >> 15;
        var m = xh * l + h * xl;
        l = xl * l + ((m & 32767) << 15) + w[j] + (c & 1073741823);
        c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
        w[j++] = l & 1073741823;
      }
      return c;
    }
    function am3(i, x, w, j, c, n) {
      var xl = x & 16383, xh = x >> 14;
      while (--n >= 0) {
        var l = this[i] & 16383;
        var h = this[i++] >> 14;
        var m = xh * l + h * xl;
        l = xl * l + ((m & 16383) << 14) + w[j] + c;
        c = (l >> 28) + (m >> 14) + xh * h;
        w[j++] = l & 268435455;
      }
      return c;
    }
    var inBrowser = typeof navigator !== "undefined";
    if (inBrowser && j_lm && navigator.appName == "Microsoft Internet Explorer") {
      BigInteger.prototype.am = am2;
      dbits = 30;
    } else if (inBrowser && j_lm && navigator.appName != "Netscape") {
      BigInteger.prototype.am = am1;
      dbits = 26;
    } else {
      BigInteger.prototype.am = am3;
      dbits = 28;
    }
    BigInteger.prototype.DB = dbits;
    BigInteger.prototype.DM = (1 << dbits) - 1;
    BigInteger.prototype.DV = 1 << dbits;
    var BI_FP = 52;
    BigInteger.prototype.FV = Math.pow(2, BI_FP);
    BigInteger.prototype.F1 = BI_FP - dbits;
    BigInteger.prototype.F2 = 2 * dbits - BI_FP;
    var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
    var BI_RC = new Array;
    var rr, vv;
    rr = 48;
    for (vv = 0;vv <= 9; ++vv)
      BI_RC[rr++] = vv;
    rr = 97;
    for (vv = 10;vv < 36; ++vv)
      BI_RC[rr++] = vv;
    rr = 65;
    for (vv = 10;vv < 36; ++vv)
      BI_RC[rr++] = vv;
    function int2char(n) {
      return BI_RM.charAt(n);
    }
    function intAt(s, i) {
      var c = BI_RC[s.charCodeAt(i)];
      return c == null ? -1 : c;
    }
    function bnpCopyTo(r) {
      for (var i = this.t - 1;i >= 0; --i)
        r[i] = this[i];
      r.t = this.t;
      r.s = this.s;
    }
    function bnpFromInt(x) {
      this.t = 1;
      this.s = x < 0 ? -1 : 0;
      if (x > 0)
        this[0] = x;
      else if (x < -1)
        this[0] = x + this.DV;
      else
        this.t = 0;
    }
    function nbv(i) {
      var r = nbi();
      r.fromInt(i);
      return r;
    }
    function bnpFromString(s, b) {
      var k;
      if (b == 16)
        k = 4;
      else if (b == 8)
        k = 3;
      else if (b == 256)
        k = 8;
      else if (b == 2)
        k = 1;
      else if (b == 32)
        k = 5;
      else if (b == 4)
        k = 2;
      else {
        this.fromRadix(s, b);
        return;
      }
      this.t = 0;
      this.s = 0;
      var i = s.length, mi = false, sh = 0;
      while (--i >= 0) {
        var x = k == 8 ? s[i] & 255 : intAt(s, i);
        if (x < 0) {
          if (s.charAt(i) == "-")
            mi = true;
          continue;
        }
        mi = false;
        if (sh == 0)
          this[this.t++] = x;
        else if (sh + k > this.DB) {
          this[this.t - 1] |= (x & (1 << this.DB - sh) - 1) << sh;
          this[this.t++] = x >> this.DB - sh;
        } else
          this[this.t - 1] |= x << sh;
        sh += k;
        if (sh >= this.DB)
          sh -= this.DB;
      }
      if (k == 8 && (s[0] & 128) != 0) {
        this.s = -1;
        if (sh > 0)
          this[this.t - 1] |= (1 << this.DB - sh) - 1 << sh;
      }
      this.clamp();
      if (mi)
        BigInteger.ZERO.subTo(this, this);
    }
    function bnpClamp() {
      var c = this.s & this.DM;
      while (this.t > 0 && this[this.t - 1] == c)
        --this.t;
    }
    function bnToString(b) {
      if (this.s < 0)
        return "-" + this.negate().toString(b);
      var k;
      if (b == 16)
        k = 4;
      else if (b == 8)
        k = 3;
      else if (b == 2)
        k = 1;
      else if (b == 32)
        k = 5;
      else if (b == 4)
        k = 2;
      else
        return this.toRadix(b);
      var km = (1 << k) - 1, d, m = false, r = "", i = this.t;
      var p = this.DB - i * this.DB % k;
      if (i-- > 0) {
        if (p < this.DB && (d = this[i] >> p) > 0) {
          m = true;
          r = int2char(d);
        }
        while (i >= 0) {
          if (p < k) {
            d = (this[i] & (1 << p) - 1) << k - p;
            d |= this[--i] >> (p += this.DB - k);
          } else {
            d = this[i] >> (p -= k) & km;
            if (p <= 0) {
              p += this.DB;
              --i;
            }
          }
          if (d > 0)
            m = true;
          if (m)
            r += int2char(d);
        }
      }
      return m ? r : "0";
    }
    function bnNegate() {
      var r = nbi();
      BigInteger.ZERO.subTo(this, r);
      return r;
    }
    function bnAbs() {
      return this.s < 0 ? this.negate() : this;
    }
    function bnCompareTo(a) {
      var r = this.s - a.s;
      if (r != 0)
        return r;
      var i = this.t;
      r = i - a.t;
      if (r != 0)
        return this.s < 0 ? -r : r;
      while (--i >= 0)
        if ((r = this[i] - a[i]) != 0)
          return r;
      return 0;
    }
    function nbits(x) {
      var r = 1, t;
      if ((t = x >>> 16) != 0) {
        x = t;
        r += 16;
      }
      if ((t = x >> 8) != 0) {
        x = t;
        r += 8;
      }
      if ((t = x >> 4) != 0) {
        x = t;
        r += 4;
      }
      if ((t = x >> 2) != 0) {
        x = t;
        r += 2;
      }
      if ((t = x >> 1) != 0) {
        x = t;
        r += 1;
      }
      return r;
    }
    function bnBitLength() {
      if (this.t <= 0)
        return 0;
      return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ this.s & this.DM);
    }
    function bnpDLShiftTo(n, r) {
      var i;
      for (i = this.t - 1;i >= 0; --i)
        r[i + n] = this[i];
      for (i = n - 1;i >= 0; --i)
        r[i] = 0;
      r.t = this.t + n;
      r.s = this.s;
    }
    function bnpDRShiftTo(n, r) {
      for (var i = n;i < this.t; ++i)
        r[i - n] = this[i];
      r.t = Math.max(this.t - n, 0);
      r.s = this.s;
    }
    function bnpLShiftTo(n, r) {
      var bs = n % this.DB;
      var cbs = this.DB - bs;
      var bm = (1 << cbs) - 1;
      var ds = Math.floor(n / this.DB), c = this.s << bs & this.DM, i;
      for (i = this.t - 1;i >= 0; --i) {
        r[i + ds + 1] = this[i] >> cbs | c;
        c = (this[i] & bm) << bs;
      }
      for (i = ds - 1;i >= 0; --i)
        r[i] = 0;
      r[ds] = c;
      r.t = this.t + ds + 1;
      r.s = this.s;
      r.clamp();
    }
    function bnpRShiftTo(n, r) {
      r.s = this.s;
      var ds = Math.floor(n / this.DB);
      if (ds >= this.t) {
        r.t = 0;
        return;
      }
      var bs = n % this.DB;
      var cbs = this.DB - bs;
      var bm = (1 << bs) - 1;
      r[0] = this[ds] >> bs;
      for (var i = ds + 1;i < this.t; ++i) {
        r[i - ds - 1] |= (this[i] & bm) << cbs;
        r[i - ds] = this[i] >> bs;
      }
      if (bs > 0)
        r[this.t - ds - 1] |= (this.s & bm) << cbs;
      r.t = this.t - ds;
      r.clamp();
    }
    function bnpSubTo(a, r) {
      var i = 0, c = 0, m = Math.min(a.t, this.t);
      while (i < m) {
        c += this[i] - a[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }
      if (a.t < this.t) {
        c -= a.s;
        while (i < this.t) {
          c += this[i];
          r[i++] = c & this.DM;
          c >>= this.DB;
        }
        c += this.s;
      } else {
        c += this.s;
        while (i < a.t) {
          c -= a[i];
          r[i++] = c & this.DM;
          c >>= this.DB;
        }
        c -= a.s;
      }
      r.s = c < 0 ? -1 : 0;
      if (c < -1)
        r[i++] = this.DV + c;
      else if (c > 0)
        r[i++] = c;
      r.t = i;
      r.clamp();
    }
    function bnpMultiplyTo(a, r) {
      var x = this.abs(), y = a.abs();
      var i = x.t;
      r.t = i + y.t;
      while (--i >= 0)
        r[i] = 0;
      for (i = 0;i < y.t; ++i)
        r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
      r.s = 0;
      r.clamp();
      if (this.s != a.s)
        BigInteger.ZERO.subTo(r, r);
    }
    function bnpSquareTo(r) {
      var x = this.abs();
      var i = r.t = 2 * x.t;
      while (--i >= 0)
        r[i] = 0;
      for (i = 0;i < x.t - 1; ++i) {
        var c = x.am(i, x[i], r, 2 * i, 0, 1);
        if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
          r[i + x.t] -= x.DV;
          r[i + x.t + 1] = 1;
        }
      }
      if (r.t > 0)
        r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
      r.s = 0;
      r.clamp();
    }
    function bnpDivRemTo(m, q, r) {
      var pm = m.abs();
      if (pm.t <= 0)
        return;
      var pt = this.abs();
      if (pt.t < pm.t) {
        if (q != null)
          q.fromInt(0);
        if (r != null)
          this.copyTo(r);
        return;
      }
      if (r == null)
        r = nbi();
      var y = nbi(), ts = this.s, ms = m.s;
      var nsh = this.DB - nbits(pm[pm.t - 1]);
      if (nsh > 0) {
        pm.lShiftTo(nsh, y);
        pt.lShiftTo(nsh, r);
      } else {
        pm.copyTo(y);
        pt.copyTo(r);
      }
      var ys = y.t;
      var y0 = y[ys - 1];
      if (y0 == 0)
        return;
      var yt = y0 * (1 << this.F1) + (ys > 1 ? y[ys - 2] >> this.F2 : 0);
      var d1 = this.FV / yt, d2 = (1 << this.F1) / yt, e = 1 << this.F2;
      var i = r.t, j = i - ys, t = q == null ? nbi() : q;
      y.dlShiftTo(j, t);
      if (r.compareTo(t) >= 0) {
        r[r.t++] = 1;
        r.subTo(t, r);
      }
      BigInteger.ONE.dlShiftTo(ys, t);
      t.subTo(y, y);
      while (y.t < ys)
        y[y.t++] = 0;
      while (--j >= 0) {
        var qd = r[--i] == y0 ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
        if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
          y.dlShiftTo(j, t);
          r.subTo(t, r);
          while (r[i] < --qd)
            r.subTo(t, r);
        }
      }
      if (q != null) {
        r.drShiftTo(ys, q);
        if (ts != ms)
          BigInteger.ZERO.subTo(q, q);
      }
      r.t = ys;
      r.clamp();
      if (nsh > 0)
        r.rShiftTo(nsh, r);
      if (ts < 0)
        BigInteger.ZERO.subTo(r, r);
    }
    function bnMod(a) {
      var r = nbi();
      this.abs().divRemTo(a, null, r);
      if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0)
        a.subTo(r, r);
      return r;
    }
    function Classic(m) {
      this.m = m;
    }
    function cConvert(x) {
      if (x.s < 0 || x.compareTo(this.m) >= 0)
        return x.mod(this.m);
      else
        return x;
    }
    function cRevert(x) {
      return x;
    }
    function cReduce(x) {
      x.divRemTo(this.m, null, x);
    }
    function cMulTo(x, y, r) {
      x.multiplyTo(y, r);
      this.reduce(r);
    }
    function cSqrTo(x, r) {
      x.squareTo(r);
      this.reduce(r);
    }
    Classic.prototype.convert = cConvert;
    Classic.prototype.revert = cRevert;
    Classic.prototype.reduce = cReduce;
    Classic.prototype.mulTo = cMulTo;
    Classic.prototype.sqrTo = cSqrTo;
    function bnpInvDigit() {
      if (this.t < 1)
        return 0;
      var x = this[0];
      if ((x & 1) == 0)
        return 0;
      var y = x & 3;
      y = y * (2 - (x & 15) * y) & 15;
      y = y * (2 - (x & 255) * y) & 255;
      y = y * (2 - ((x & 65535) * y & 65535)) & 65535;
      y = y * (2 - x * y % this.DV) % this.DV;
      return y > 0 ? this.DV - y : -y;
    }
    function Montgomery(m) {
      this.m = m;
      this.mp = m.invDigit();
      this.mpl = this.mp & 32767;
      this.mph = this.mp >> 15;
      this.um = (1 << m.DB - 15) - 1;
      this.mt2 = 2 * m.t;
    }
    function montConvert(x) {
      var r = nbi();
      x.abs().dlShiftTo(this.m.t, r);
      r.divRemTo(this.m, null, r);
      if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0)
        this.m.subTo(r, r);
      return r;
    }
    function montRevert(x) {
      var r = nbi();
      x.copyTo(r);
      this.reduce(r);
      return r;
    }
    function montReduce(x) {
      while (x.t <= this.mt2)
        x[x.t++] = 0;
      for (var i = 0;i < this.m.t; ++i) {
        var j = x[i] & 32767;
        var u0 = j * this.mpl + ((j * this.mph + (x[i] >> 15) * this.mpl & this.um) << 15) & x.DM;
        j = i + this.m.t;
        x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
        while (x[j] >= x.DV) {
          x[j] -= x.DV;
          x[++j]++;
        }
      }
      x.clamp();
      x.drShiftTo(this.m.t, x);
      if (x.compareTo(this.m) >= 0)
        x.subTo(this.m, x);
    }
    function montSqrTo(x, r) {
      x.squareTo(r);
      this.reduce(r);
    }
    function montMulTo(x, y, r) {
      x.multiplyTo(y, r);
      this.reduce(r);
    }
    Montgomery.prototype.convert = montConvert;
    Montgomery.prototype.revert = montRevert;
    Montgomery.prototype.reduce = montReduce;
    Montgomery.prototype.mulTo = montMulTo;
    Montgomery.prototype.sqrTo = montSqrTo;
    function bnpIsEven() {
      return (this.t > 0 ? this[0] & 1 : this.s) == 0;
    }
    function bnpExp(e, z) {
      if (e > 4294967295 || e < 1)
        return BigInteger.ONE;
      var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e) - 1;
      g.copyTo(r);
      while (--i >= 0) {
        z.sqrTo(r, r2);
        if ((e & 1 << i) > 0)
          z.mulTo(r2, g, r);
        else {
          var t = r;
          r = r2;
          r2 = t;
        }
      }
      return z.revert(r);
    }
    function bnModPowInt(e, m) {
      var z;
      if (e < 256 || m.isEven())
        z = new Classic(m);
      else
        z = new Montgomery(m);
      return this.exp(e, z);
    }
    BigInteger.prototype.copyTo = bnpCopyTo;
    BigInteger.prototype.fromInt = bnpFromInt;
    BigInteger.prototype.fromString = bnpFromString;
    BigInteger.prototype.clamp = bnpClamp;
    BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
    BigInteger.prototype.drShiftTo = bnpDRShiftTo;
    BigInteger.prototype.lShiftTo = bnpLShiftTo;
    BigInteger.prototype.rShiftTo = bnpRShiftTo;
    BigInteger.prototype.subTo = bnpSubTo;
    BigInteger.prototype.multiplyTo = bnpMultiplyTo;
    BigInteger.prototype.squareTo = bnpSquareTo;
    BigInteger.prototype.divRemTo = bnpDivRemTo;
    BigInteger.prototype.invDigit = bnpInvDigit;
    BigInteger.prototype.isEven = bnpIsEven;
    BigInteger.prototype.exp = bnpExp;
    BigInteger.prototype.toString = bnToString;
    BigInteger.prototype.negate = bnNegate;
    BigInteger.prototype.abs = bnAbs;
    BigInteger.prototype.compareTo = bnCompareTo;
    BigInteger.prototype.bitLength = bnBitLength;
    BigInteger.prototype.mod = bnMod;
    BigInteger.prototype.modPowInt = bnModPowInt;
    BigInteger.ZERO = nbv(0);
    BigInteger.ONE = nbv(1);
    function bnClone() {
      var r = nbi();
      this.copyTo(r);
      return r;
    }
    function bnIntValue() {
      if (this.s < 0) {
        if (this.t == 1)
          return this[0] - this.DV;
        else if (this.t == 0)
          return -1;
      } else if (this.t == 1)
        return this[0];
      else if (this.t == 0)
        return 0;
      return (this[1] & (1 << 32 - this.DB) - 1) << this.DB | this[0];
    }
    function bnByteValue() {
      return this.t == 0 ? this.s : this[0] << 24 >> 24;
    }
    function bnShortValue() {
      return this.t == 0 ? this.s : this[0] << 16 >> 16;
    }
    function bnpChunkSize(r) {
      return Math.floor(Math.LN2 * this.DB / Math.log(r));
    }
    function bnSigNum() {
      if (this.s < 0)
        return -1;
      else if (this.t <= 0 || this.t == 1 && this[0] <= 0)
        return 0;
      else
        return 1;
    }
    function bnpToRadix(b) {
      if (b == null)
        b = 10;
      if (this.signum() == 0 || b < 2 || b > 36)
        return "0";
      var cs = this.chunkSize(b);
      var a = Math.pow(b, cs);
      var d = nbv(a), y = nbi(), z = nbi(), r = "";
      this.divRemTo(d, y, z);
      while (y.signum() > 0) {
        r = (a + z.intValue()).toString(b).substr(1) + r;
        y.divRemTo(d, y, z);
      }
      return z.intValue().toString(b) + r;
    }
    function bnpFromRadix(s, b) {
      this.fromInt(0);
      if (b == null)
        b = 10;
      var cs = this.chunkSize(b);
      var d = Math.pow(b, cs), mi = false, j = 0, w = 0;
      for (var i = 0;i < s.length; ++i) {
        var x = intAt(s, i);
        if (x < 0) {
          if (s.charAt(i) == "-" && this.signum() == 0)
            mi = true;
          continue;
        }
        w = b * w + x;
        if (++j >= cs) {
          this.dMultiply(d);
          this.dAddOffset(w, 0);
          j = 0;
          w = 0;
        }
      }
      if (j > 0) {
        this.dMultiply(Math.pow(b, j));
        this.dAddOffset(w, 0);
      }
      if (mi)
        BigInteger.ZERO.subTo(this, this);
    }
    function bnpFromNumber(a, b, c) {
      if (typeof b == "number") {
        if (a < 2)
          this.fromInt(1);
        else {
          this.fromNumber(a, c);
          if (!this.testBit(a - 1))
            this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);
          if (this.isEven())
            this.dAddOffset(1, 0);
          while (!this.isProbablePrime(b)) {
            this.dAddOffset(2, 0);
            if (this.bitLength() > a)
              this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);
          }
        }
      } else {
        var x = new Array, t = a & 7;
        x.length = (a >> 3) + 1;
        b.nextBytes(x);
        if (t > 0)
          x[0] &= (1 << t) - 1;
        else
          x[0] = 0;
        this.fromString(x, 256);
      }
    }
    function bnToByteArray() {
      var i = this.t, r = new Array;
      r[0] = this.s;
      var p = this.DB - i * this.DB % 8, d, k = 0;
      if (i-- > 0) {
        if (p < this.DB && (d = this[i] >> p) != (this.s & this.DM) >> p)
          r[k++] = d | this.s << this.DB - p;
        while (i >= 0) {
          if (p < 8) {
            d = (this[i] & (1 << p) - 1) << 8 - p;
            d |= this[--i] >> (p += this.DB - 8);
          } else {
            d = this[i] >> (p -= 8) & 255;
            if (p <= 0) {
              p += this.DB;
              --i;
            }
          }
          if ((d & 128) != 0)
            d |= -256;
          if (k == 0 && (this.s & 128) != (d & 128))
            ++k;
          if (k > 0 || d != this.s)
            r[k++] = d;
        }
      }
      return r;
    }
    function bnEquals(a) {
      return this.compareTo(a) == 0;
    }
    function bnMin(a) {
      return this.compareTo(a) < 0 ? this : a;
    }
    function bnMax(a) {
      return this.compareTo(a) > 0 ? this : a;
    }
    function bnpBitwiseTo(a, op, r) {
      var i, f, m = Math.min(a.t, this.t);
      for (i = 0;i < m; ++i)
        r[i] = op(this[i], a[i]);
      if (a.t < this.t) {
        f = a.s & this.DM;
        for (i = m;i < this.t; ++i)
          r[i] = op(this[i], f);
        r.t = this.t;
      } else {
        f = this.s & this.DM;
        for (i = m;i < a.t; ++i)
          r[i] = op(f, a[i]);
        r.t = a.t;
      }
      r.s = op(this.s, a.s);
      r.clamp();
    }
    function op_and(x, y) {
      return x & y;
    }
    function bnAnd(a) {
      var r = nbi();
      this.bitwiseTo(a, op_and, r);
      return r;
    }
    function op_or(x, y) {
      return x | y;
    }
    function bnOr(a) {
      var r = nbi();
      this.bitwiseTo(a, op_or, r);
      return r;
    }
    function op_xor(x, y) {
      return x ^ y;
    }
    function bnXor(a) {
      var r = nbi();
      this.bitwiseTo(a, op_xor, r);
      return r;
    }
    function op_andnot(x, y) {
      return x & ~y;
    }
    function bnAndNot(a) {
      var r = nbi();
      this.bitwiseTo(a, op_andnot, r);
      return r;
    }
    function bnNot() {
      var r = nbi();
      for (var i = 0;i < this.t; ++i)
        r[i] = this.DM & ~this[i];
      r.t = this.t;
      r.s = ~this.s;
      return r;
    }
    function bnShiftLeft(n) {
      var r = nbi();
      if (n < 0)
        this.rShiftTo(-n, r);
      else
        this.lShiftTo(n, r);
      return r;
    }
    function bnShiftRight(n) {
      var r = nbi();
      if (n < 0)
        this.lShiftTo(-n, r);
      else
        this.rShiftTo(n, r);
      return r;
    }
    function lbit(x) {
      if (x == 0)
        return -1;
      var r = 0;
      if ((x & 65535) == 0) {
        x >>= 16;
        r += 16;
      }
      if ((x & 255) == 0) {
        x >>= 8;
        r += 8;
      }
      if ((x & 15) == 0) {
        x >>= 4;
        r += 4;
      }
      if ((x & 3) == 0) {
        x >>= 2;
        r += 2;
      }
      if ((x & 1) == 0)
        ++r;
      return r;
    }
    function bnGetLowestSetBit() {
      for (var i = 0;i < this.t; ++i)
        if (this[i] != 0)
          return i * this.DB + lbit(this[i]);
      if (this.s < 0)
        return this.t * this.DB;
      return -1;
    }
    function cbit(x) {
      var r = 0;
      while (x != 0) {
        x &= x - 1;
        ++r;
      }
      return r;
    }
    function bnBitCount() {
      var r = 0, x = this.s & this.DM;
      for (var i = 0;i < this.t; ++i)
        r += cbit(this[i] ^ x);
      return r;
    }
    function bnTestBit(n) {
      var j = Math.floor(n / this.DB);
      if (j >= this.t)
        return this.s != 0;
      return (this[j] & 1 << n % this.DB) != 0;
    }
    function bnpChangeBit(n, op) {
      var r = BigInteger.ONE.shiftLeft(n);
      this.bitwiseTo(r, op, r);
      return r;
    }
    function bnSetBit(n) {
      return this.changeBit(n, op_or);
    }
    function bnClearBit(n) {
      return this.changeBit(n, op_andnot);
    }
    function bnFlipBit(n) {
      return this.changeBit(n, op_xor);
    }
    function bnpAddTo(a, r) {
      var i = 0, c = 0, m = Math.min(a.t, this.t);
      while (i < m) {
        c += this[i] + a[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }
      if (a.t < this.t) {
        c += a.s;
        while (i < this.t) {
          c += this[i];
          r[i++] = c & this.DM;
          c >>= this.DB;
        }
        c += this.s;
      } else {
        c += this.s;
        while (i < a.t) {
          c += a[i];
          r[i++] = c & this.DM;
          c >>= this.DB;
        }
        c += a.s;
      }
      r.s = c < 0 ? -1 : 0;
      if (c > 0)
        r[i++] = c;
      else if (c < -1)
        r[i++] = this.DV + c;
      r.t = i;
      r.clamp();
    }
    function bnAdd(a) {
      var r = nbi();
      this.addTo(a, r);
      return r;
    }
    function bnSubtract(a) {
      var r = nbi();
      this.subTo(a, r);
      return r;
    }
    function bnMultiply(a) {
      var r = nbi();
      this.multiplyTo(a, r);
      return r;
    }
    function bnSquare() {
      var r = nbi();
      this.squareTo(r);
      return r;
    }
    function bnDivide(a) {
      var r = nbi();
      this.divRemTo(a, r, null);
      return r;
    }
    function bnRemainder(a) {
      var r = nbi();
      this.divRemTo(a, null, r);
      return r;
    }
    function bnDivideAndRemainder(a) {
      var q = nbi(), r = nbi();
      this.divRemTo(a, q, r);
      return new Array(q, r);
    }
    function bnpDMultiply(n) {
      this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
      ++this.t;
      this.clamp();
    }
    function bnpDAddOffset(n, w) {
      if (n == 0)
        return;
      while (this.t <= w)
        this[this.t++] = 0;
      this[w] += n;
      while (this[w] >= this.DV) {
        this[w] -= this.DV;
        if (++w >= this.t)
          this[this.t++] = 0;
        ++this[w];
      }
    }
    function NullExp() {}
    function nNop(x) {
      return x;
    }
    function nMulTo(x, y, r) {
      x.multiplyTo(y, r);
    }
    function nSqrTo(x, r) {
      x.squareTo(r);
    }
    NullExp.prototype.convert = nNop;
    NullExp.prototype.revert = nNop;
    NullExp.prototype.mulTo = nMulTo;
    NullExp.prototype.sqrTo = nSqrTo;
    function bnPow(e) {
      return this.exp(e, new NullExp);
    }
    function bnpMultiplyLowerTo(a, n, r) {
      var i = Math.min(this.t + a.t, n);
      r.s = 0;
      r.t = i;
      while (i > 0)
        r[--i] = 0;
      var j;
      for (j = r.t - this.t;i < j; ++i)
        r[i + this.t] = this.am(0, a[i], r, i, 0, this.t);
      for (j = Math.min(a.t, n);i < j; ++i)
        this.am(0, a[i], r, i, 0, n - i);
      r.clamp();
    }
    function bnpMultiplyUpperTo(a, n, r) {
      --n;
      var i = r.t = this.t + a.t - n;
      r.s = 0;
      while (--i >= 0)
        r[i] = 0;
      for (i = Math.max(n - this.t, 0);i < a.t; ++i)
        r[this.t + i - n] = this.am(n - i, a[i], r, 0, 0, this.t + i - n);
      r.clamp();
      r.drShiftTo(1, r);
    }
    function Barrett(m) {
      this.r2 = nbi();
      this.q3 = nbi();
      BigInteger.ONE.dlShiftTo(2 * m.t, this.r2);
      this.mu = this.r2.divide(m);
      this.m = m;
    }
    function barrettConvert(x) {
      if (x.s < 0 || x.t > 2 * this.m.t)
        return x.mod(this.m);
      else if (x.compareTo(this.m) < 0)
        return x;
      else {
        var r = nbi();
        x.copyTo(r);
        this.reduce(r);
        return r;
      }
    }
    function barrettRevert(x) {
      return x;
    }
    function barrettReduce(x) {
      x.drShiftTo(this.m.t - 1, this.r2);
      if (x.t > this.m.t + 1) {
        x.t = this.m.t + 1;
        x.clamp();
      }
      this.mu.multiplyUpperTo(this.r2, this.m.t + 1, this.q3);
      this.m.multiplyLowerTo(this.q3, this.m.t + 1, this.r2);
      while (x.compareTo(this.r2) < 0)
        x.dAddOffset(1, this.m.t + 1);
      x.subTo(this.r2, x);
      while (x.compareTo(this.m) >= 0)
        x.subTo(this.m, x);
    }
    function barrettSqrTo(x, r) {
      x.squareTo(r);
      this.reduce(r);
    }
    function barrettMulTo(x, y, r) {
      x.multiplyTo(y, r);
      this.reduce(r);
    }
    Barrett.prototype.convert = barrettConvert;
    Barrett.prototype.revert = barrettRevert;
    Barrett.prototype.reduce = barrettReduce;
    Barrett.prototype.mulTo = barrettMulTo;
    Barrett.prototype.sqrTo = barrettSqrTo;
    function bnModPow(e, m) {
      var i = e.bitLength(), k, r = nbv(1), z;
      if (i <= 0)
        return r;
      else if (i < 18)
        k = 1;
      else if (i < 48)
        k = 3;
      else if (i < 144)
        k = 4;
      else if (i < 768)
        k = 5;
      else
        k = 6;
      if (i < 8)
        z = new Classic(m);
      else if (m.isEven())
        z = new Barrett(m);
      else
        z = new Montgomery(m);
      var g = new Array, n = 3, k1 = k - 1, km = (1 << k) - 1;
      g[1] = z.convert(this);
      if (k > 1) {
        var g2 = nbi();
        z.sqrTo(g[1], g2);
        while (n <= km) {
          g[n] = nbi();
          z.mulTo(g2, g[n - 2], g[n]);
          n += 2;
        }
      }
      var j = e.t - 1, w, is1 = true, r2 = nbi(), t;
      i = nbits(e[j]) - 1;
      while (j >= 0) {
        if (i >= k1)
          w = e[j] >> i - k1 & km;
        else {
          w = (e[j] & (1 << i + 1) - 1) << k1 - i;
          if (j > 0)
            w |= e[j - 1] >> this.DB + i - k1;
        }
        n = k;
        while ((w & 1) == 0) {
          w >>= 1;
          --n;
        }
        if ((i -= n) < 0) {
          i += this.DB;
          --j;
        }
        if (is1) {
          g[w].copyTo(r);
          is1 = false;
        } else {
          while (n > 1) {
            z.sqrTo(r, r2);
            z.sqrTo(r2, r);
            n -= 2;
          }
          if (n > 0)
            z.sqrTo(r, r2);
          else {
            t = r;
            r = r2;
            r2 = t;
          }
          z.mulTo(r2, g[w], r);
        }
        while (j >= 0 && (e[j] & 1 << i) == 0) {
          z.sqrTo(r, r2);
          t = r;
          r = r2;
          r2 = t;
          if (--i < 0) {
            i = this.DB - 1;
            --j;
          }
        }
      }
      return z.revert(r);
    }
    function bnGCD(a) {
      var x = this.s < 0 ? this.negate() : this.clone();
      var y = a.s < 0 ? a.negate() : a.clone();
      if (x.compareTo(y) < 0) {
        var t = x;
        x = y;
        y = t;
      }
      var i = x.getLowestSetBit(), g = y.getLowestSetBit();
      if (g < 0)
        return x;
      if (i < g)
        g = i;
      if (g > 0) {
        x.rShiftTo(g, x);
        y.rShiftTo(g, y);
      }
      while (x.signum() > 0) {
        if ((i = x.getLowestSetBit()) > 0)
          x.rShiftTo(i, x);
        if ((i = y.getLowestSetBit()) > 0)
          y.rShiftTo(i, y);
        if (x.compareTo(y) >= 0) {
          x.subTo(y, x);
          x.rShiftTo(1, x);
        } else {
          y.subTo(x, y);
          y.rShiftTo(1, y);
        }
      }
      if (g > 0)
        y.lShiftTo(g, y);
      return y;
    }
    function bnpModInt(n) {
      if (n <= 0)
        return 0;
      var d = this.DV % n, r = this.s < 0 ? n - 1 : 0;
      if (this.t > 0)
        if (d == 0)
          r = this[0] % n;
        else
          for (var i = this.t - 1;i >= 0; --i)
            r = (d * r + this[i]) % n;
      return r;
    }
    function bnModInverse(m) {
      var ac = m.isEven();
      if (this.isEven() && ac || m.signum() == 0)
        return BigInteger.ZERO;
      var u = m.clone(), v = this.clone();
      var a = nbv(1), b = nbv(0), c = nbv(0), d = nbv(1);
      while (u.signum() != 0) {
        while (u.isEven()) {
          u.rShiftTo(1, u);
          if (ac) {
            if (!a.isEven() || !b.isEven()) {
              a.addTo(this, a);
              b.subTo(m, b);
            }
            a.rShiftTo(1, a);
          } else if (!b.isEven())
            b.subTo(m, b);
          b.rShiftTo(1, b);
        }
        while (v.isEven()) {
          v.rShiftTo(1, v);
          if (ac) {
            if (!c.isEven() || !d.isEven()) {
              c.addTo(this, c);
              d.subTo(m, d);
            }
            c.rShiftTo(1, c);
          } else if (!d.isEven())
            d.subTo(m, d);
          d.rShiftTo(1, d);
        }
        if (u.compareTo(v) >= 0) {
          u.subTo(v, u);
          if (ac)
            a.subTo(c, a);
          b.subTo(d, b);
        } else {
          v.subTo(u, v);
          if (ac)
            c.subTo(a, c);
          d.subTo(b, d);
        }
      }
      if (v.compareTo(BigInteger.ONE) != 0)
        return BigInteger.ZERO;
      if (d.compareTo(m) >= 0)
        return d.subtract(m);
      if (d.signum() < 0)
        d.addTo(m, d);
      else
        return d;
      if (d.signum() < 0)
        return d.add(m);
      else
        return d;
    }
    var lowprimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997];
    var lplim = (1 << 26) / lowprimes[lowprimes.length - 1];
    function bnIsProbablePrime(t) {
      var i, x = this.abs();
      if (x.t == 1 && x[0] <= lowprimes[lowprimes.length - 1]) {
        for (i = 0;i < lowprimes.length; ++i)
          if (x[0] == lowprimes[i])
            return true;
        return false;
      }
      if (x.isEven())
        return false;
      i = 1;
      while (i < lowprimes.length) {
        var m = lowprimes[i], j = i + 1;
        while (j < lowprimes.length && m < lplim)
          m *= lowprimes[j++];
        m = x.modInt(m);
        while (i < j)
          if (m % lowprimes[i++] == 0)
            return false;
      }
      return x.millerRabin(t);
    }
    function bnpMillerRabin(t) {
      var n1 = this.subtract(BigInteger.ONE);
      var k = n1.getLowestSetBit();
      if (k <= 0)
        return false;
      var r = n1.shiftRight(k);
      t = t + 1 >> 1;
      if (t > lowprimes.length)
        t = lowprimes.length;
      var a = nbi();
      for (var i = 0;i < t; ++i) {
        a.fromInt(lowprimes[Math.floor(Math.random() * lowprimes.length)]);
        var y = a.modPow(r, this);
        if (y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
          var j = 1;
          while (j++ < k && y.compareTo(n1) != 0) {
            y = y.modPowInt(2, this);
            if (y.compareTo(BigInteger.ONE) == 0)
              return false;
          }
          if (y.compareTo(n1) != 0)
            return false;
        }
      }
      return true;
    }
    BigInteger.prototype.chunkSize = bnpChunkSize;
    BigInteger.prototype.toRadix = bnpToRadix;
    BigInteger.prototype.fromRadix = bnpFromRadix;
    BigInteger.prototype.fromNumber = bnpFromNumber;
    BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
    BigInteger.prototype.changeBit = bnpChangeBit;
    BigInteger.prototype.addTo = bnpAddTo;
    BigInteger.prototype.dMultiply = bnpDMultiply;
    BigInteger.prototype.dAddOffset = bnpDAddOffset;
    BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
    BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
    BigInteger.prototype.modInt = bnpModInt;
    BigInteger.prototype.millerRabin = bnpMillerRabin;
    BigInteger.prototype.clone = bnClone;
    BigInteger.prototype.intValue = bnIntValue;
    BigInteger.prototype.byteValue = bnByteValue;
    BigInteger.prototype.shortValue = bnShortValue;
    BigInteger.prototype.signum = bnSigNum;
    BigInteger.prototype.toByteArray = bnToByteArray;
    BigInteger.prototype.equals = bnEquals;
    BigInteger.prototype.min = bnMin;
    BigInteger.prototype.max = bnMax;
    BigInteger.prototype.and = bnAnd;
    BigInteger.prototype.or = bnOr;
    BigInteger.prototype.xor = bnXor;
    BigInteger.prototype.andNot = bnAndNot;
    BigInteger.prototype.not = bnNot;
    BigInteger.prototype.shiftLeft = bnShiftLeft;
    BigInteger.prototype.shiftRight = bnShiftRight;
    BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
    BigInteger.prototype.bitCount = bnBitCount;
    BigInteger.prototype.testBit = bnTestBit;
    BigInteger.prototype.setBit = bnSetBit;
    BigInteger.prototype.clearBit = bnClearBit;
    BigInteger.prototype.flipBit = bnFlipBit;
    BigInteger.prototype.add = bnAdd;
    BigInteger.prototype.subtract = bnSubtract;
    BigInteger.prototype.multiply = bnMultiply;
    BigInteger.prototype.divide = bnDivide;
    BigInteger.prototype.remainder = bnRemainder;
    BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
    BigInteger.prototype.modPow = bnModPow;
    BigInteger.prototype.modInverse = bnModInverse;
    BigInteger.prototype.pow = bnPow;
    BigInteger.prototype.gcd = bnGCD;
    BigInteger.prototype.isProbablePrime = bnIsProbablePrime;
    BigInteger.prototype.square = bnSquare;
    BigInteger.prototype.Barrett = Barrett;
    var rng_state;
    var rng_pool;
    var rng_pptr;
    function rng_seed_int(x) {
      rng_pool[rng_pptr++] ^= x & 255;
      rng_pool[rng_pptr++] ^= x >> 8 & 255;
      rng_pool[rng_pptr++] ^= x >> 16 & 255;
      rng_pool[rng_pptr++] ^= x >> 24 & 255;
      if (rng_pptr >= rng_psize)
        rng_pptr -= rng_psize;
    }
    function rng_seed_time() {
      rng_seed_int(new Date().getTime());
    }
    if (rng_pool == null) {
      rng_pool = new Array;
      rng_pptr = 0;
      var t;
      if (typeof window !== "undefined" && window.crypto) {
        if (window.crypto.getRandomValues) {
          var ua = new Uint8Array(32);
          window.crypto.getRandomValues(ua);
          for (t = 0;t < 32; ++t)
            rng_pool[rng_pptr++] = ua[t];
        } else if (navigator.appName == "Netscape" && navigator.appVersion < "5") {
          var z = window.crypto.random(32);
          for (t = 0;t < z.length; ++t)
            rng_pool[rng_pptr++] = z.charCodeAt(t) & 255;
        }
      }
      while (rng_pptr < rng_psize) {
        t = Math.floor(65536 * Math.random());
        rng_pool[rng_pptr++] = t >>> 8;
        rng_pool[rng_pptr++] = t & 255;
      }
      rng_pptr = 0;
      rng_seed_time();
    }
    function rng_get_byte() {
      if (rng_state == null) {
        rng_seed_time();
        rng_state = prng_newstate();
        rng_state.init(rng_pool);
        for (rng_pptr = 0;rng_pptr < rng_pool.length; ++rng_pptr)
          rng_pool[rng_pptr] = 0;
        rng_pptr = 0;
      }
      return rng_state.next();
    }
    function rng_get_bytes(ba) {
      var i;
      for (i = 0;i < ba.length; ++i)
        ba[i] = rng_get_byte();
    }
    function SecureRandom() {}
    SecureRandom.prototype.nextBytes = rng_get_bytes;
    function Arcfour() {
      this.i = 0;
      this.j = 0;
      this.S = new Array;
    }
    function ARC4init(key) {
      var i, j, t;
      for (i = 0;i < 256; ++i)
        this.S[i] = i;
      j = 0;
      for (i = 0;i < 256; ++i) {
        j = j + this.S[i] + key[i % key.length] & 255;
        t = this.S[i];
        this.S[i] = this.S[j];
        this.S[j] = t;
      }
      this.i = 0;
      this.j = 0;
    }
    function ARC4next() {
      var t;
      this.i = this.i + 1 & 255;
      this.j = this.j + this.S[this.i] & 255;
      t = this.S[this.i];
      this.S[this.i] = this.S[this.j];
      this.S[this.j] = t;
      return this.S[t + this.S[this.i] & 255];
    }
    Arcfour.prototype.init = ARC4init;
    Arcfour.prototype.next = ARC4next;
    function prng_newstate() {
      return new Arcfour;
    }
    var rng_psize = 256;
    if (typeof exports !== "undefined") {
      exports = module.exports = {
        default: BigInteger,
        BigInteger,
        SecureRandom
      };
    } else {
      this.jsbn = {
        BigInteger,
        SecureRandom
      };
    }
  }).call(exports);
});

// node_modules/sm-crypto/src/sm2/asn1.js
var require_asn1 = __commonJS(function(exports, module) {
  var { BigInteger } = require_jsbn();
  function bigintToValue(bigint) {
    let h = bigint.toString(16);
    if (h[0] !== "-") {
      if (h.length % 2 === 1)
        h = "0" + h;
      else if (!h.match(/^[0-7]/))
        h = "00" + h;
    } else {
      h = h.substr(1);
      let len = h.length;
      if (len % 2 === 1)
        len += 1;
      else if (!h.match(/^[0-7]/))
        len += 2;
      let mask = "";
      for (let i = 0;i < len; i++)
        mask += "f";
      mask = new BigInteger(mask, 16);
      h = mask.xor(bigint).add(BigInteger.ONE);
      h = h.toString(16).replace(/^-/, "");
    }
    return h;
  }

  class ASN1Object {
    constructor() {
      this.tlv = null;
      this.t = "00";
      this.l = "00";
      this.v = "";
    }
    getEncodedHex() {
      if (!this.tlv) {
        this.v = this.getValue();
        this.l = this.getLength();
        this.tlv = this.t + this.l + this.v;
      }
      return this.tlv;
    }
    getLength() {
      const n = this.v.length / 2;
      let nHex = n.toString(16);
      if (nHex.length % 2 === 1)
        nHex = "0" + nHex;
      if (n < 128) {
        return nHex;
      } else {
        const head = 128 + nHex.length / 2;
        return head.toString(16) + nHex;
      }
    }
    getValue() {
      return "";
    }
  }

  class DERInteger extends ASN1Object {
    constructor(bigint) {
      super();
      this.t = "02";
      if (bigint)
        this.v = bigintToValue(bigint);
    }
    getValue() {
      return this.v;
    }
  }

  class DERSequence extends ASN1Object {
    constructor(asn1Array) {
      super();
      this.t = "30";
      this.asn1Array = asn1Array;
    }
    getValue() {
      this.v = this.asn1Array.map((asn1Object) => asn1Object.getEncodedHex()).join("");
      return this.v;
    }
  }
  function getLenOfL(str, start) {
    if (+str[start + 2] < 8)
      return 1;
    return +str.substr(start + 2, 2) & 127 + 1;
  }
  function getL(str, start) {
    const len = getLenOfL(str, start);
    const l = str.substr(start + 2, len * 2);
    if (!l)
      return -1;
    const bigint = +l[0] < 8 ? new BigInteger(l, 16) : new BigInteger(l.substr(2), 16);
    return bigint.intValue();
  }
  function getStartOfV(str, start) {
    const len = getLenOfL(str, start);
    return start + (len + 1) * 2;
  }
  module.exports = {
    encodeDer(r, s) {
      const derR = new DERInteger(r);
      const derS = new DERInteger(s);
      const derSeq = new DERSequence([derR, derS]);
      return derSeq.getEncodedHex();
    },
    decodeDer(input) {
      const start = getStartOfV(input, 0);
      const vIndexR = getStartOfV(input, start);
      const lR = getL(input, start);
      const vR = input.substr(vIndexR, lR * 2);
      const nextStart = vIndexR + vR.length;
      const vIndexS = getStartOfV(input, nextStart);
      const lS = getL(input, nextStart);
      const vS = input.substr(vIndexS, lS * 2);
      const r = new BigInteger(vR, 16);
      const s = new BigInteger(vS, 16);
      return { r, s };
    }
  };
});

// node_modules/sm-crypto/src/sm2/ec.js
var require_ec = __commonJS(function(exports, module) {
  var { BigInteger } = require_jsbn();
  var TWO = new BigInteger("2");
  var THREE = new BigInteger("3");

  class ECFieldElementFp {
    constructor(q, x) {
      this.x = x;
      this.q = q;
    }
    equals(other) {
      if (other === this)
        return true;
      return this.q.equals(other.q) && this.x.equals(other.x);
    }
    toBigInteger() {
      return this.x;
    }
    negate() {
      return new ECFieldElementFp(this.q, this.x.negate().mod(this.q));
    }
    add(b) {
      return new ECFieldElementFp(this.q, this.x.add(b.toBigInteger()).mod(this.q));
    }
    subtract(b) {
      return new ECFieldElementFp(this.q, this.x.subtract(b.toBigInteger()).mod(this.q));
    }
    multiply(b) {
      return new ECFieldElementFp(this.q, this.x.multiply(b.toBigInteger()).mod(this.q));
    }
    divide(b) {
      return new ECFieldElementFp(this.q, this.x.multiply(b.toBigInteger().modInverse(this.q)).mod(this.q));
    }
    square() {
      return new ECFieldElementFp(this.q, this.x.square().mod(this.q));
    }
  }

  class ECPointFp {
    constructor(curve, x, y, z) {
      this.curve = curve;
      this.x = x;
      this.y = y;
      this.z = z == null ? BigInteger.ONE : z;
      this.zinv = null;
    }
    getX() {
      if (this.zinv === null)
        this.zinv = this.z.modInverse(this.curve.q);
      return this.curve.fromBigInteger(this.x.toBigInteger().multiply(this.zinv).mod(this.curve.q));
    }
    getY() {
      if (this.zinv === null)
        this.zinv = this.z.modInverse(this.curve.q);
      return this.curve.fromBigInteger(this.y.toBigInteger().multiply(this.zinv).mod(this.curve.q));
    }
    equals(other) {
      if (other === this)
        return true;
      if (this.isInfinity())
        return other.isInfinity();
      if (other.isInfinity())
        return this.isInfinity();
      const u = other.y.toBigInteger().multiply(this.z).subtract(this.y.toBigInteger().multiply(other.z)).mod(this.curve.q);
      if (!u.equals(BigInteger.ZERO))
        return false;
      const v = other.x.toBigInteger().multiply(this.z).subtract(this.x.toBigInteger().multiply(other.z)).mod(this.curve.q);
      return v.equals(BigInteger.ZERO);
    }
    isInfinity() {
      if (this.x === null && this.y === null)
        return true;
      return this.z.equals(BigInteger.ZERO) && !this.y.toBigInteger().equals(BigInteger.ZERO);
    }
    negate() {
      return new ECPointFp(this.curve, this.x, this.y.negate(), this.z);
    }
    add(b) {
      if (this.isInfinity())
        return b;
      if (b.isInfinity())
        return this;
      const x1 = this.x.toBigInteger();
      const y1 = this.y.toBigInteger();
      const z1 = this.z;
      const x2 = b.x.toBigInteger();
      const y2 = b.y.toBigInteger();
      const z2 = b.z;
      const q = this.curve.q;
      const w1 = x1.multiply(z2).mod(q);
      const w2 = x2.multiply(z1).mod(q);
      const w3 = w1.subtract(w2);
      const w4 = y1.multiply(z2).mod(q);
      const w5 = y2.multiply(z1).mod(q);
      const w6 = w4.subtract(w5);
      if (BigInteger.ZERO.equals(w3)) {
        if (BigInteger.ZERO.equals(w6)) {
          return this.twice();
        }
        return this.curve.infinity;
      }
      const w7 = w1.add(w2);
      const w8 = z1.multiply(z2).mod(q);
      const w9 = w3.square().mod(q);
      const w10 = w3.multiply(w9).mod(q);
      const w11 = w8.multiply(w6.square()).subtract(w7.multiply(w9)).mod(q);
      const x3 = w3.multiply(w11).mod(q);
      const y3 = w6.multiply(w9.multiply(w1).subtract(w11)).subtract(w4.multiply(w10)).mod(q);
      const z3 = w10.multiply(w8).mod(q);
      return new ECPointFp(this.curve, this.curve.fromBigInteger(x3), this.curve.fromBigInteger(y3), z3);
    }
    twice() {
      if (this.isInfinity())
        return this;
      if (!this.y.toBigInteger().signum())
        return this.curve.infinity;
      const x1 = this.x.toBigInteger();
      const y1 = this.y.toBigInteger();
      const z1 = this.z;
      const q = this.curve.q;
      const a = this.curve.a.toBigInteger();
      const w1 = x1.square().multiply(THREE).add(a.multiply(z1.square())).mod(q);
      const w2 = y1.shiftLeft(1).multiply(z1).mod(q);
      const w3 = y1.square().mod(q);
      const w4 = w3.multiply(x1).multiply(z1).mod(q);
      const w5 = w2.square().mod(q);
      const w6 = w1.square().subtract(w4.shiftLeft(3)).mod(q);
      const x3 = w2.multiply(w6).mod(q);
      const y3 = w1.multiply(w4.shiftLeft(2).subtract(w6)).subtract(w5.shiftLeft(1).multiply(w3)).mod(q);
      const z3 = w2.multiply(w5).mod(q);
      return new ECPointFp(this.curve, this.curve.fromBigInteger(x3), this.curve.fromBigInteger(y3), z3);
    }
    multiply(k) {
      if (this.isInfinity())
        return this;
      if (!k.signum())
        return this.curve.infinity;
      const k3 = k.multiply(THREE);
      const neg = this.negate();
      let Q = this;
      for (let i = k3.bitLength() - 2;i > 0; i--) {
        Q = Q.twice();
        const k3Bit = k3.testBit(i);
        const kBit = k.testBit(i);
        if (k3Bit !== kBit) {
          Q = Q.add(k3Bit ? this : neg);
        }
      }
      return Q;
    }
  }

  class ECCurveFp {
    constructor(q, a, b) {
      this.q = q;
      this.a = this.fromBigInteger(a);
      this.b = this.fromBigInteger(b);
      this.infinity = new ECPointFp(this, null, null);
    }
    equals(other) {
      if (other === this)
        return true;
      return this.q.equals(other.q) && this.a.equals(other.a) && this.b.equals(other.b);
    }
    fromBigInteger(x) {
      return new ECFieldElementFp(this.q, x);
    }
    decodePointHex(s) {
      switch (parseInt(s.substr(0, 2), 16)) {
        case 0:
          return this.infinity;
        case 2:
        case 3:
          const x = this.fromBigInteger(new BigInteger(s.substr(2), 16));
          let y = this.fromBigInteger(x.multiply(x.square()).add(x.multiply(this.a)).add(this.b).toBigInteger().modPow(this.q.divide(new BigInteger("4")).add(BigInteger.ONE), this.q));
          if (!y.toBigInteger().mod(TWO).equals(new BigInteger(s.substr(0, 2), 16).subtract(TWO))) {
            y = y.negate();
          }
          return new ECPointFp(this, x, y);
        case 4:
        case 6:
        case 7:
          const len = (s.length - 2) / 2;
          const xHex = s.substr(2, len);
          const yHex = s.substr(len + 2, len);
          return new ECPointFp(this, this.fromBigInteger(new BigInteger(xHex, 16)), this.fromBigInteger(new BigInteger(yHex, 16)));
        default:
          return null;
      }
    }
  }
  module.exports = {
    ECPointFp,
    ECCurveFp
  };
});

// node_modules/sm-crypto/src/sm2/utils.js
var require_utils3 = __commonJS(function(exports, module) {
  var { BigInteger, SecureRandom } = require_jsbn();
  var { ECCurveFp } = require_ec();
  var rng = new SecureRandom;
  var { curve, G, n } = generateEcparam();
  function getGlobalCurve() {
    return curve;
  }
  function generateEcparam() {
    const p = new BigInteger("FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFF", 16);
    const a = new BigInteger("FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFC", 16);
    const b = new BigInteger("28E9FA9E9D9F5E344D5A9E4BCF6509A7F39789F515AB8F92DDBCBD414D940E93", 16);
    const curve = new ECCurveFp(p, a, b);
    const gxHex = "32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7";
    const gyHex = "BC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0";
    const G = curve.decodePointHex("04" + gxHex + gyHex);
    const n = new BigInteger("FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFF7203DF6B21C6052B53BBF40939D54123", 16);
    return { curve, G, n };
  }
  function generateKeyPairHex(a, b, c) {
    const random = a ? new BigInteger(a, b, c) : new BigInteger(n.bitLength(), rng);
    const d = random.mod(n.subtract(BigInteger.ONE)).add(BigInteger.ONE);
    const privateKey = leftPad(d.toString(16), 64);
    const P = G.multiply(d);
    const Px = leftPad(P.getX().toBigInteger().toString(16), 64);
    const Py = leftPad(P.getY().toBigInteger().toString(16), 64);
    const publicKey = "04" + Px + Py;
    return { privateKey, publicKey };
  }
  function compressPublicKeyHex(s) {
    if (s.length !== 130)
      throw new Error("Invalid public key to compress");
    const len = (s.length - 2) / 2;
    const xHex = s.substr(2, len);
    const y = new BigInteger(s.substr(len + 2, len), 16);
    let prefix = "03";
    if (y.mod(new BigInteger("2")).equals(BigInteger.ZERO))
      prefix = "02";
    return prefix + xHex;
  }
  function utf8ToHex(input) {
    input = unescape(encodeURIComponent(input));
    const length = input.length;
    const words = [];
    for (let i = 0;i < length; i++) {
      words[i >>> 2] |= (input.charCodeAt(i) & 255) << 24 - i % 4 * 8;
    }
    const hexChars = [];
    for (let i = 0;i < length; i++) {
      const bite = words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
      hexChars.push((bite >>> 4).toString(16));
      hexChars.push((bite & 15).toString(16));
    }
    return hexChars.join("");
  }
  function leftPad(input, num) {
    if (input.length >= num)
      return input;
    return new Array(num - input.length + 1).join("0") + input;
  }
  function arrayToHex(arr) {
    return arr.map((item) => {
      item = item.toString(16);
      return item.length === 1 ? "0" + item : item;
    }).join("");
  }
  function arrayToUtf8(arr) {
    const words = [];
    let j = 0;
    for (let i = 0;i < arr.length * 2; i += 2) {
      words[i >>> 3] |= parseInt(arr[j], 10) << 24 - i % 8 * 4;
      j++;
    }
    try {
      const latin1Chars = [];
      for (let i = 0;i < arr.length; i++) {
        const bite = words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
        latin1Chars.push(String.fromCharCode(bite));
      }
      return decodeURIComponent(escape(latin1Chars.join("")));
    } catch (e) {
      throw new Error("Malformed UTF-8 data");
    }
  }
  function hexToArray(hexStr) {
    const words = [];
    let hexStrLength = hexStr.length;
    if (hexStrLength % 2 !== 0) {
      hexStr = leftPad(hexStr, hexStrLength + 1);
    }
    hexStrLength = hexStr.length;
    for (let i = 0;i < hexStrLength; i += 2) {
      words.push(parseInt(hexStr.substr(i, 2), 16));
    }
    return words;
  }
  function verifyPublicKey(publicKey) {
    const point = curve.decodePointHex(publicKey);
    if (!point)
      return false;
    const x = point.getX();
    const y = point.getY();
    return y.square().equals(x.multiply(x.square()).add(x.multiply(curve.a)).add(curve.b));
  }
  function comparePublicKeyHex(publicKey1, publicKey2) {
    const point1 = curve.decodePointHex(publicKey1);
    if (!point1)
      return false;
    const point2 = curve.decodePointHex(publicKey2);
    if (!point2)
      return false;
    return point1.equals(point2);
  }
  module.exports = {
    getGlobalCurve,
    generateEcparam,
    generateKeyPairHex,
    compressPublicKeyHex,
    utf8ToHex,
    leftPad,
    arrayToHex,
    arrayToUtf8,
    hexToArray,
    verifyPublicKey,
    comparePublicKeyHex
  };
});

// node_modules/sm-crypto/src/sm2/sm3.js
var require_sm3 = __commonJS(function(exports, module) {
  var W = new Uint32Array(68);
  var M = new Uint32Array(64);
  function rotl(x, n) {
    const s = n & 31;
    return x << s | x >>> 32 - s;
  }
  function xor(x, y) {
    const result = [];
    for (let i = x.length - 1;i >= 0; i--)
      result[i] = (x[i] ^ y[i]) & 255;
    return result;
  }
  function P0(X) {
    return X ^ rotl(X, 9) ^ rotl(X, 17);
  }
  function P1(X) {
    return X ^ rotl(X, 15) ^ rotl(X, 23);
  }
  function sm3(array) {
    let len = array.length * 8;
    let k = len % 512;
    k = k >= 448 ? 512 - k % 448 - 1 : 448 - k - 1;
    const kArr = new Array((k - 7) / 8);
    const lenArr = new Array(8);
    for (let i = 0, len = kArr.length;i < len; i++)
      kArr[i] = 0;
    for (let i = 0, len = lenArr.length;i < len; i++)
      lenArr[i] = 0;
    len = len.toString(2);
    for (let i = 7;i >= 0; i--) {
      if (len.length > 8) {
        const start = len.length - 8;
        lenArr[i] = parseInt(len.substr(start), 2);
        len = len.substr(0, start);
      } else if (len.length > 0) {
        lenArr[i] = parseInt(len, 2);
        len = "";
      }
    }
    const m = new Uint8Array([...array, 128, ...kArr, ...lenArr]);
    const dataView = new DataView(m.buffer, 0);
    const n = m.length / 64;
    const V = new Uint32Array([1937774191, 1226093241, 388252375, 3666478592, 2842636476, 372324522, 3817729613, 2969243214]);
    for (let i = 0;i < n; i++) {
      W.fill(0);
      M.fill(0);
      const start = 16 * i;
      for (let j = 0;j < 16; j++) {
        W[j] = dataView.getUint32((start + j) * 4, false);
      }
      for (let j = 16;j < 68; j++) {
        W[j] = P1(W[j - 16] ^ W[j - 9] ^ rotl(W[j - 3], 15)) ^ rotl(W[j - 13], 7) ^ W[j - 6];
      }
      for (let j = 0;j < 64; j++) {
        M[j] = W[j] ^ W[j + 4];
      }
      const T1 = 2043430169;
      const T2 = 2055708042;
      let A = V[0];
      let B = V[1];
      let C = V[2];
      let D = V[3];
      let E = V[4];
      let F = V[5];
      let G = V[6];
      let H = V[7];
      let SS1;
      let SS2;
      let TT1;
      let TT2;
      let T;
      for (let j = 0;j < 64; j++) {
        T = j >= 0 && j <= 15 ? T1 : T2;
        SS1 = rotl(rotl(A, 12) + E + rotl(T, j), 7);
        SS2 = SS1 ^ rotl(A, 12);
        TT1 = (j >= 0 && j <= 15 ? A ^ B ^ C : A & B | A & C | B & C) + D + SS2 + M[j];
        TT2 = (j >= 0 && j <= 15 ? E ^ F ^ G : E & F | ~E & G) + H + SS1 + W[j];
        D = C;
        C = rotl(B, 9);
        B = A;
        A = TT1;
        H = G;
        G = rotl(F, 19);
        F = E;
        E = P0(TT2);
      }
      V[0] ^= A;
      V[1] ^= B;
      V[2] ^= C;
      V[3] ^= D;
      V[4] ^= E;
      V[5] ^= F;
      V[6] ^= G;
      V[7] ^= H;
    }
    const result = [];
    for (let i = 0, len = V.length;i < len; i++) {
      const word = V[i];
      result.push((word & 4278190080) >>> 24, (word & 16711680) >>> 16, (word & 65280) >>> 8, word & 255);
    }
    return result;
  }
  var blockLen = 64;
  var iPad = new Uint8Array(blockLen);
  var oPad = new Uint8Array(blockLen);
  for (let i = 0;i < blockLen; i++) {
    iPad[i] = 54;
    oPad[i] = 92;
  }
  function hmac(input, key) {
    if (key.length > blockLen)
      key = sm3(key);
    while (key.length < blockLen)
      key.push(0);
    const iPadKey = xor(key, iPad);
    const oPadKey = xor(key, oPad);
    const hash = sm3([...iPadKey, ...input]);
    return sm3([...oPadKey, ...hash]);
  }
  module.exports = {
    sm3,
    hmac
  };
});

// node_modules/sm-crypto/src/sm2/index.js
var require_sm2 = __commonJS(function(exports, module) {
  var { BigInteger } = require_jsbn();
  var { encodeDer, decodeDer } = require_asn1();
  var _ = require_utils3();
  var sm3 = require_sm3().sm3;
  var { G, curve, n } = _.generateEcparam();
  var C1C2C3 = 0;
  function doEncrypt(msg, publicKey, cipherMode = 1) {
    msg = typeof msg === "string" ? _.hexToArray(_.utf8ToHex(msg)) : Array.prototype.slice.call(msg);
    publicKey = _.getGlobalCurve().decodePointHex(publicKey);
    const keypair = _.generateKeyPairHex();
    const k = new BigInteger(keypair.privateKey, 16);
    let c1 = keypair.publicKey;
    if (c1.length > 128)
      c1 = c1.substr(c1.length - 128);
    const p = publicKey.multiply(k);
    const x2 = _.hexToArray(_.leftPad(p.getX().toBigInteger().toRadix(16), 64));
    const y2 = _.hexToArray(_.leftPad(p.getY().toBigInteger().toRadix(16), 64));
    const c3 = _.arrayToHex(sm3([].concat(x2, msg, y2)));
    let ct = 1;
    let offset = 0;
    let t = [];
    const z = [].concat(x2, y2);
    const nextT = () => {
      t = sm3([...z, ct >> 24 & 255, ct >> 16 & 255, ct >> 8 & 255, ct & 255]);
      ct++;
      offset = 0;
    };
    nextT();
    for (let i = 0, len = msg.length;i < len; i++) {
      if (offset === t.length)
        nextT();
      msg[i] ^= t[offset++] & 255;
    }
    const c2 = _.arrayToHex(msg);
    return cipherMode === C1C2C3 ? c1 + c2 + c3 : c1 + c3 + c2;
  }
  function doDecrypt(encryptData, privateKey, cipherMode = 1, {
    output = "string"
  } = {}) {
    privateKey = new BigInteger(privateKey, 16);
    let c3 = encryptData.substr(128, 64);
    let c2 = encryptData.substr(128 + 64);
    if (cipherMode === C1C2C3) {
      c3 = encryptData.substr(encryptData.length - 64);
      c2 = encryptData.substr(128, encryptData.length - 128 - 64);
    }
    const msg = _.hexToArray(c2);
    const c1 = _.getGlobalCurve().decodePointHex("04" + encryptData.substr(0, 128));
    const p = c1.multiply(privateKey);
    const x2 = _.hexToArray(_.leftPad(p.getX().toBigInteger().toRadix(16), 64));
    const y2 = _.hexToArray(_.leftPad(p.getY().toBigInteger().toRadix(16), 64));
    let ct = 1;
    let offset = 0;
    let t = [];
    const z = [].concat(x2, y2);
    const nextT = () => {
      t = sm3([...z, ct >> 24 & 255, ct >> 16 & 255, ct >> 8 & 255, ct & 255]);
      ct++;
      offset = 0;
    };
    nextT();
    for (let i = 0, len = msg.length;i < len; i++) {
      if (offset === t.length)
        nextT();
      msg[i] ^= t[offset++] & 255;
    }
    const checkC3 = _.arrayToHex(sm3([].concat(x2, msg, y2)));
    if (checkC3 === c3.toLowerCase()) {
      return output === "array" ? msg : _.arrayToUtf8(msg);
    } else {
      return output === "array" ? [] : "";
    }
  }
  function doSignature(msg, privateKey, {
    pointPool,
    der,
    hash,
    publicKey,
    userId
  } = {}) {
    let hashHex = typeof msg === "string" ? _.utf8ToHex(msg) : _.arrayToHex(msg);
    if (hash) {
      publicKey = publicKey || getPublicKeyFromPrivateKey(privateKey);
      hashHex = getHash(hashHex, publicKey, userId);
    }
    const dA = new BigInteger(privateKey, 16);
    const e = new BigInteger(hashHex, 16);
    let k = null;
    let r = null;
    let s = null;
    do {
      do {
        let point;
        if (pointPool && pointPool.length) {
          point = pointPool.pop();
        } else {
          point = getPoint();
        }
        k = point.k;
        r = e.add(point.x1).mod(n);
      } while (r.equals(BigInteger.ZERO) || r.add(k).equals(n));
      s = dA.add(BigInteger.ONE).modInverse(n).multiply(k.subtract(r.multiply(dA))).mod(n);
    } while (s.equals(BigInteger.ZERO));
    if (der)
      return encodeDer(r, s);
    return _.leftPad(r.toString(16), 64) + _.leftPad(s.toString(16), 64);
  }
  function doVerifySignature(msg, signHex, publicKey, { der, hash, userId } = {}) {
    let hashHex = typeof msg === "string" ? _.utf8ToHex(msg) : _.arrayToHex(msg);
    if (hash) {
      hashHex = getHash(hashHex, publicKey, userId);
    }
    let r;
    let s;
    if (der) {
      const decodeDerObj = decodeDer(signHex);
      r = decodeDerObj.r;
      s = decodeDerObj.s;
    } else {
      r = new BigInteger(signHex.substring(0, 64), 16);
      s = new BigInteger(signHex.substring(64), 16);
    }
    const PA = curve.decodePointHex(publicKey);
    const e = new BigInteger(hashHex, 16);
    const t = r.add(s).mod(n);
    if (t.equals(BigInteger.ZERO))
      return false;
    const x1y1 = G.multiply(s).add(PA.multiply(t));
    const R = e.add(x1y1.getX().toBigInteger()).mod(n);
    return r.equals(R);
  }
  function getHash(hashHex, publicKey, userId = "1234567812345678") {
    userId = _.utf8ToHex(userId);
    const a = _.leftPad(G.curve.a.toBigInteger().toRadix(16), 64);
    const b = _.leftPad(G.curve.b.toBigInteger().toRadix(16), 64);
    const gx = _.leftPad(G.getX().toBigInteger().toRadix(16), 64);
    const gy = _.leftPad(G.getY().toBigInteger().toRadix(16), 64);
    let px;
    let py;
    if (publicKey.length === 128) {
      px = publicKey.substr(0, 64);
      py = publicKey.substr(64, 64);
    } else {
      const point = G.curve.decodePointHex(publicKey);
      px = _.leftPad(point.getX().toBigInteger().toRadix(16), 64);
      py = _.leftPad(point.getY().toBigInteger().toRadix(16), 64);
    }
    const data = _.hexToArray(userId + a + b + gx + gy + px + py);
    const entl = userId.length * 4;
    data.unshift(entl & 255);
    data.unshift(entl >> 8 & 255);
    const z = sm3(data);
    return _.arrayToHex(sm3(z.concat(_.hexToArray(hashHex))));
  }
  function getPublicKeyFromPrivateKey(privateKey) {
    const PA = G.multiply(new BigInteger(privateKey, 16));
    const x = _.leftPad(PA.getX().toBigInteger().toString(16), 64);
    const y = _.leftPad(PA.getY().toBigInteger().toString(16), 64);
    return "04" + x + y;
  }
  function getPoint() {
    const keypair = _.generateKeyPairHex();
    const PA = curve.decodePointHex(keypair.publicKey);
    keypair.k = new BigInteger(keypair.privateKey, 16);
    keypair.x1 = PA.getX().toBigInteger();
    return keypair;
  }
  module.exports = {
    generateKeyPairHex: _.generateKeyPairHex,
    compressPublicKeyHex: _.compressPublicKeyHex,
    comparePublicKeyHex: _.comparePublicKeyHex,
    doEncrypt,
    doDecrypt,
    doSignature,
    doVerifySignature,
    getPublicKeyFromPrivateKey,
    getPoint,
    verifyPublicKey: _.verifyPublicKey
  };
});

// node_modules/sm-crypto/src/sm3/index.js
var require_sm32 = __commonJS(function(exports, module) {
  var { sm3, hmac } = require_sm3();
  function leftPad(input, num) {
    if (input.length >= num)
      return input;
    return new Array(num - input.length + 1).join("0") + input;
  }
  function ArrayToHex(arr) {
    return arr.map((item) => {
      item = item.toString(16);
      return item.length === 1 ? "0" + item : item;
    }).join("");
  }
  function hexToArray(hexStr) {
    const words = [];
    let hexStrLength = hexStr.length;
    if (hexStrLength % 2 !== 0) {
      hexStr = leftPad(hexStr, hexStrLength + 1);
    }
    hexStrLength = hexStr.length;
    for (let i = 0;i < hexStrLength; i += 2) {
      words.push(parseInt(hexStr.substr(i, 2), 16));
    }
    return words;
  }
  function utf8ToArray(str) {
    const arr = [];
    for (let i = 0, len = str.length;i < len; i++) {
      const point = str.codePointAt(i);
      if (point <= 127) {
        arr.push(point);
      } else if (point <= 2047) {
        arr.push(192 | point >>> 6);
        arr.push(128 | point & 63);
      } else if (point <= 55295 || point >= 57344 && point <= 65535) {
        arr.push(224 | point >>> 12);
        arr.push(128 | point >>> 6 & 63);
        arr.push(128 | point & 63);
      } else if (point >= 65536 && point <= 1114111) {
        i++;
        arr.push(240 | point >>> 18 & 28);
        arr.push(128 | point >>> 12 & 63);
        arr.push(128 | point >>> 6 & 63);
        arr.push(128 | point & 63);
      } else {
        arr.push(point);
        throw new Error("input is not supported");
      }
    }
    return arr;
  }
  module.exports = function(input, options) {
    input = typeof input === "string" ? utf8ToArray(input) : Array.prototype.slice.call(input);
    if (options) {
      const mode = options.mode || "hmac";
      if (mode !== "hmac")
        throw new Error("invalid mode");
      let key = options.key;
      if (!key)
        throw new Error("invalid key");
      key = typeof key === "string" ? hexToArray(key) : Array.prototype.slice.call(key);
      return ArrayToHex(hmac(input, key));
    }
    return ArrayToHex(sm3(input));
  };
});

// node_modules/sm-crypto/src/sm4/index.js
var require_sm4 = __commonJS(function(exports, module) {
  var DECRYPT = 0;
  var ROUND = 32;
  var BLOCK = 16;
  var Sbox = [
    214,
    144,
    233,
    254,
    204,
    225,
    61,
    183,
    22,
    182,
    20,
    194,
    40,
    251,
    44,
    5,
    43,
    103,
    154,
    118,
    42,
    190,
    4,
    195,
    170,
    68,
    19,
    38,
    73,
    134,
    6,
    153,
    156,
    66,
    80,
    244,
    145,
    239,
    152,
    122,
    51,
    84,
    11,
    67,
    237,
    207,
    172,
    98,
    228,
    179,
    28,
    169,
    201,
    8,
    232,
    149,
    128,
    223,
    148,
    250,
    117,
    143,
    63,
    166,
    71,
    7,
    167,
    252,
    243,
    115,
    23,
    186,
    131,
    89,
    60,
    25,
    230,
    133,
    79,
    168,
    104,
    107,
    129,
    178,
    113,
    100,
    218,
    139,
    248,
    235,
    15,
    75,
    112,
    86,
    157,
    53,
    30,
    36,
    14,
    94,
    99,
    88,
    209,
    162,
    37,
    34,
    124,
    59,
    1,
    33,
    120,
    135,
    212,
    0,
    70,
    87,
    159,
    211,
    39,
    82,
    76,
    54,
    2,
    231,
    160,
    196,
    200,
    158,
    234,
    191,
    138,
    210,
    64,
    199,
    56,
    181,
    163,
    247,
    242,
    206,
    249,
    97,
    21,
    161,
    224,
    174,
    93,
    164,
    155,
    52,
    26,
    85,
    173,
    147,
    50,
    48,
    245,
    140,
    177,
    227,
    29,
    246,
    226,
    46,
    130,
    102,
    202,
    96,
    192,
    41,
    35,
    171,
    13,
    83,
    78,
    111,
    213,
    219,
    55,
    69,
    222,
    253,
    142,
    47,
    3,
    255,
    106,
    114,
    109,
    108,
    91,
    81,
    141,
    27,
    175,
    146,
    187,
    221,
    188,
    127,
    17,
    217,
    92,
    65,
    31,
    16,
    90,
    216,
    10,
    193,
    49,
    136,
    165,
    205,
    123,
    189,
    45,
    116,
    208,
    18,
    184,
    229,
    180,
    176,
    137,
    105,
    151,
    74,
    12,
    150,
    119,
    126,
    101,
    185,
    241,
    9,
    197,
    110,
    198,
    132,
    24,
    240,
    125,
    236,
    58,
    220,
    77,
    32,
    121,
    238,
    95,
    62,
    215,
    203,
    57,
    72
  ];
  var CK = [
    462357,
    472066609,
    943670861,
    1415275113,
    1886879365,
    2358483617,
    2830087869,
    3301692121,
    3773296373,
    4228057617,
    404694573,
    876298825,
    1347903077,
    1819507329,
    2291111581,
    2762715833,
    3234320085,
    3705924337,
    4177462797,
    337322537,
    808926789,
    1280531041,
    1752135293,
    2223739545,
    2695343797,
    3166948049,
    3638552301,
    4110090761,
    269950501,
    741554753,
    1213159005,
    1684763257
  ];
  function hexToArray(str) {
    const arr = [];
    for (let i = 0, len = str.length;i < len; i += 2) {
      arr.push(parseInt(str.substr(i, 2), 16));
    }
    return arr;
  }
  function ArrayToHex(arr) {
    return arr.map((item) => {
      item = item.toString(16);
      return item.length === 1 ? "0" + item : item;
    }).join("");
  }
  function utf8ToArray(str) {
    const arr = [];
    for (let i = 0, len = str.length;i < len; i++) {
      const point = str.codePointAt(i);
      if (point <= 127) {
        arr.push(point);
      } else if (point <= 2047) {
        arr.push(192 | point >>> 6);
        arr.push(128 | point & 63);
      } else if (point <= 55295 || point >= 57344 && point <= 65535) {
        arr.push(224 | point >>> 12);
        arr.push(128 | point >>> 6 & 63);
        arr.push(128 | point & 63);
      } else if (point >= 65536 && point <= 1114111) {
        i++;
        arr.push(240 | point >>> 18 & 28);
        arr.push(128 | point >>> 12 & 63);
        arr.push(128 | point >>> 6 & 63);
        arr.push(128 | point & 63);
      } else {
        arr.push(point);
        throw new Error("input is not supported");
      }
    }
    return arr;
  }
  function arrayToUtf8(arr) {
    const str = [];
    for (let i = 0, len = arr.length;i < len; i++) {
      if (arr[i] >= 240 && arr[i] <= 247) {
        str.push(String.fromCodePoint(((arr[i] & 7) << 18) + ((arr[i + 1] & 63) << 12) + ((arr[i + 2] & 63) << 6) + (arr[i + 3] & 63)));
        i += 3;
      } else if (arr[i] >= 224 && arr[i] <= 239) {
        str.push(String.fromCodePoint(((arr[i] & 15) << 12) + ((arr[i + 1] & 63) << 6) + (arr[i + 2] & 63)));
        i += 2;
      } else if (arr[i] >= 192 && arr[i] <= 223) {
        str.push(String.fromCodePoint(((arr[i] & 31) << 6) + (arr[i + 1] & 63)));
        i++;
      } else {
        str.push(String.fromCodePoint(arr[i]));
      }
    }
    return str.join("");
  }
  function rotl(x, n) {
    const s = n & 31;
    return x << s | x >>> 32 - s;
  }
  function byteSub(a) {
    return (Sbox[a >>> 24 & 255] & 255) << 24 | (Sbox[a >>> 16 & 255] & 255) << 16 | (Sbox[a >>> 8 & 255] & 255) << 8 | Sbox[a & 255] & 255;
  }
  function l1(b) {
    return b ^ rotl(b, 2) ^ rotl(b, 10) ^ rotl(b, 18) ^ rotl(b, 24);
  }
  function l2(b) {
    return b ^ rotl(b, 13) ^ rotl(b, 23);
  }
  function sms4Crypt(input, output, roundKey) {
    const x = new Array(4);
    const tmp = new Array(4);
    for (let i = 0;i < 4; i++) {
      tmp[0] = input[4 * i] & 255;
      tmp[1] = input[4 * i + 1] & 255;
      tmp[2] = input[4 * i + 2] & 255;
      tmp[3] = input[4 * i + 3] & 255;
      x[i] = tmp[0] << 24 | tmp[1] << 16 | tmp[2] << 8 | tmp[3];
    }
    for (let r = 0, mid;r < 32; r += 4) {
      mid = x[1] ^ x[2] ^ x[3] ^ roundKey[r + 0];
      x[0] ^= l1(byteSub(mid));
      mid = x[2] ^ x[3] ^ x[0] ^ roundKey[r + 1];
      x[1] ^= l1(byteSub(mid));
      mid = x[3] ^ x[0] ^ x[1] ^ roundKey[r + 2];
      x[2] ^= l1(byteSub(mid));
      mid = x[0] ^ x[1] ^ x[2] ^ roundKey[r + 3];
      x[3] ^= l1(byteSub(mid));
    }
    for (let j = 0;j < 16; j += 4) {
      output[j] = x[3 - j / 4] >>> 24 & 255;
      output[j + 1] = x[3 - j / 4] >>> 16 & 255;
      output[j + 2] = x[3 - j / 4] >>> 8 & 255;
      output[j + 3] = x[3 - j / 4] & 255;
    }
  }
  function sms4KeyExt(key, roundKey, cryptFlag) {
    const x = new Array(4);
    const tmp = new Array(4);
    for (let i = 0;i < 4; i++) {
      tmp[0] = key[0 + 4 * i] & 255;
      tmp[1] = key[1 + 4 * i] & 255;
      tmp[2] = key[2 + 4 * i] & 255;
      tmp[3] = key[3 + 4 * i] & 255;
      x[i] = tmp[0] << 24 | tmp[1] << 16 | tmp[2] << 8 | tmp[3];
    }
    x[0] ^= 2746333894;
    x[1] ^= 1453994832;
    x[2] ^= 1736282519;
    x[3] ^= 2993693404;
    for (let r = 0, mid;r < 32; r += 4) {
      mid = x[1] ^ x[2] ^ x[3] ^ CK[r + 0];
      roundKey[r + 0] = x[0] ^= l2(byteSub(mid));
      mid = x[2] ^ x[3] ^ x[0] ^ CK[r + 1];
      roundKey[r + 1] = x[1] ^= l2(byteSub(mid));
      mid = x[3] ^ x[0] ^ x[1] ^ CK[r + 2];
      roundKey[r + 2] = x[2] ^= l2(byteSub(mid));
      mid = x[0] ^ x[1] ^ x[2] ^ CK[r + 3];
      roundKey[r + 3] = x[3] ^= l2(byteSub(mid));
    }
    if (cryptFlag === DECRYPT) {
      for (let r = 0, mid;r < 16; r++) {
        mid = roundKey[r];
        roundKey[r] = roundKey[31 - r];
        roundKey[31 - r] = mid;
      }
    }
  }
  function sm4(inArray, key, cryptFlag, {
    padding = "pkcs#7",
    mode,
    iv = [],
    output = "string"
  } = {}) {
    if (mode === "cbc") {
      if (typeof iv === "string")
        iv = hexToArray(iv);
      if (iv.length !== 128 / 8) {
        throw new Error("iv is invalid");
      }
    }
    if (typeof key === "string")
      key = hexToArray(key);
    if (key.length !== 128 / 8) {
      throw new Error("key is invalid");
    }
    if (typeof inArray === "string") {
      if (cryptFlag !== DECRYPT) {
        inArray = utf8ToArray(inArray);
      } else {
        inArray = hexToArray(inArray);
      }
    } else {
      inArray = [...inArray];
    }
    if ((padding === "pkcs#5" || padding === "pkcs#7") && cryptFlag !== DECRYPT) {
      const paddingCount = BLOCK - inArray.length % BLOCK;
      for (let i = 0;i < paddingCount; i++)
        inArray.push(paddingCount);
    }
    const roundKey = new Array(ROUND);
    sms4KeyExt(key, roundKey, cryptFlag);
    const outArray = [];
    let lastVector = iv;
    let restLen = inArray.length;
    let point = 0;
    while (restLen >= BLOCK) {
      const input = inArray.slice(point, point + 16);
      const output = new Array(16);
      if (mode === "cbc") {
        for (let i = 0;i < BLOCK; i++) {
          if (cryptFlag !== DECRYPT) {
            input[i] ^= lastVector[i];
          }
        }
      }
      sms4Crypt(input, output, roundKey);
      for (let i = 0;i < BLOCK; i++) {
        if (mode === "cbc") {
          if (cryptFlag === DECRYPT) {
            output[i] ^= lastVector[i];
          }
        }
        outArray[point + i] = output[i];
      }
      if (mode === "cbc") {
        if (cryptFlag !== DECRYPT) {
          lastVector = output;
        } else {
          lastVector = input;
        }
      }
      restLen -= BLOCK;
      point += BLOCK;
    }
    if ((padding === "pkcs#5" || padding === "pkcs#7") && cryptFlag === DECRYPT) {
      const len = outArray.length;
      const paddingCount = outArray[len - 1];
      for (let i = 1;i <= paddingCount; i++) {
        if (outArray[len - i] !== paddingCount)
          throw new Error("padding is invalid");
      }
      outArray.splice(len - paddingCount, paddingCount);
    }
    if (output !== "array") {
      if (cryptFlag !== DECRYPT) {
        return ArrayToHex(outArray);
      } else {
        return arrayToUtf8(outArray);
      }
    } else {
      return outArray;
    }
  }
  module.exports = {
    encrypt(inArray, key, options) {
      return sm4(inArray, key, 1, options);
    },
    decrypt(inArray, key, options) {
      return sm4(inArray, key, 0, options);
    }
  };
});

// node_modules/sm-crypto/src/index.js
var require_src = __commonJS(function(exports, module) {
  module.exports = {
    sm2: require_sm2(),
    sm3: require_sm32(),
    sm4: require_sm4()
  };
});

// index.ts
init_auth();
import { readFileSync as readFileSync3 } from "fs";
import { join as join4, dirname as dirname3 } from "path";
import { fileURLToPath } from "url";

// lib/qr-terminal.ts
import { mkdirSync as mkdirSync2 } from "fs";
import { dirname, resolve } from "path";

// node_modules/qrcode/lib/server.js
var canPromise = require_can_promise();
var QRCode = require_qrcode();
var PngRenderer = require_png2();
var Utf8Renderer = require_utf8();
var TerminalRenderer = require_terminal2();
var SvgRenderer = require_svg();
function checkParams(text, opts, cb) {
  if (typeof text === "undefined") {
    throw new Error("String required as first argument");
  }
  if (typeof cb === "undefined") {
    cb = opts;
    opts = {};
  }
  if (typeof cb !== "function") {
    if (!canPromise()) {
      throw new Error("Callback required as last argument");
    } else {
      opts = cb || {};
      cb = null;
    }
  }
  return {
    opts,
    cb
  };
}
function getTypeFromFilename(path) {
  return path.slice((path.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
}
function getRendererFromType(type) {
  switch (type) {
    case "svg":
      return SvgRenderer;
    case "txt":
    case "utf8":
      return Utf8Renderer;
    case "png":
    case "image/png":
    default:
      return PngRenderer;
  }
}
function getStringRendererFromType(type) {
  switch (type) {
    case "svg":
      return SvgRenderer;
    case "terminal":
      return TerminalRenderer;
    case "utf8":
    default:
      return Utf8Renderer;
  }
}
function render(renderFunc, text, params) {
  if (!params.cb) {
    return new Promise(function(resolve, reject) {
      try {
        const data = QRCode.create(text, params.opts);
        return renderFunc(data, params.opts, function(err, data) {
          return err ? reject(err) : resolve(data);
        });
      } catch (e) {
        reject(e);
      }
    });
  }
  try {
    const data = QRCode.create(text, params.opts);
    return renderFunc(data, params.opts, params.cb);
  } catch (e) {
    params.cb(e);
  }
}
var $toCanvas = require_browser().toCanvas;
var $toString = function toString(text, opts, cb) {
  const params = checkParams(text, opts, cb);
  const type = params.opts ? params.opts.type : undefined;
  const renderer = getStringRendererFromType(type);
  return render(renderer.render, text, params);
};
var $toFile = function toFile(path, text, opts, cb) {
  if (typeof path !== "string" || !(typeof text === "string" || typeof text === "object")) {
    throw new Error("Invalid argument");
  }
  if (arguments.length < 3 && !canPromise()) {
    throw new Error("Too few arguments provided");
  }
  const params = checkParams(text, opts, cb);
  const type = params.opts.type || getTypeFromFilename(path);
  const renderer = getRendererFromType(type);
  const renderToFile = renderer.renderToFile.bind(null, path);
  return render(renderToFile, text, params);
};

// lib/qr-terminal.ts
var XUEQIU_ORIGIN = "https://www.xueqiu.com";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json",
  Origin: XUEQIU_ORIGIN,
  Referer: `${XUEQIU_ORIGIN}/`,
  "X-Requested-With": "XMLHttpRequest"
};
function qrGenerateUrl() {
  return `${XUEQIU_ORIGIN}/snb/provider/generate-qr-code`;
}
function qrPollUrl(code) {
  return `${XUEQIU_ORIGIN}/snb/provider/query-qr-code-state?code=${encodeURIComponent(code)}`;
}
function interpretQRState(body) {
  const status = body?.data?.status;
  switch (status) {
    case 0:
      return { type: "pending" };
    case 1:
      return { type: "scanned" };
    case 2:
      return body?.data?.is_bind_tel ? { type: "confirmed", payload: body.data } : { type: "bindphone", payload: body.data };
    case 3:
      return { type: "cancelled" };
    case 4:
      return { type: "expired" };
    case 5:
      return { type: "login", payload: body.data };
    default:
      return { type: "invalid", status };
  }
}
function parseCookie(cookie) {
  const cookies = new Map;
  for (const part of cookie.split(";")) {
    const trimmed = part.trim();
    if (!trimmed)
      continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0)
      continue;
    cookies.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1));
  }
  return cookies;
}
function mergeCookies(base, override) {
  const cookies = parseCookie(base);
  for (const [key, value] of parseCookie(override))
    cookies.set(key, value);
  return [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}
function hasLoginCookie(cookie) {
  const cookies = parseCookie(cookie);
  const flag = cookies.get("xq_is_login");
  return Boolean(flag && flag !== "0" && cookies.get("xq_a_token") && cookies.get("u"));
}
function readSetCookie(res) {
  const headers = res.headers;
  if (typeof headers.getSetCookie === "function")
    return headers.getSetCookie();
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}
function cookiePairsFromSetCookie(setCookies) {
  return setCookies.map((line) => line.split(";")[0]?.trim()).filter((pair) => Boolean(pair && pair.includes("="))).join("; ");
}
function isXueqiuHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return host === "xueqiu.com" || host.endsWith(".xueqiu.com");
}
function assertXueqiuRedirect(currentUrl, location) {
  let next;
  try {
    next = new URL(location, currentUrl);
  } catch {
    throw new Error(`Refusing to follow invalid redirect: ${location}`);
  }
  if (next.protocol !== "https:" || !isXueqiuHostname(next.hostname)) {
    throw new Error(`Refusing to follow redirect to ${next.origin} with Xueqiu cookies`);
  }
  return next.toString();
}
async function fetchXueqiu(url, cookie, init = {}, redirects = 0) {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(HEADERS)) {
    if (!headers.has(key))
      headers.set(key, value);
  }
  if (cookie)
    headers.set("Cookie", cookie);
  const response = await fetch(url, { ...init, headers, redirect: "manual" });
  const extra = cookiePairsFromSetCookie(readSetCookie(response));
  const nextCookie = extra ? mergeCookies(cookie, extra) : cookie;
  if (response.status >= 300 && response.status < 400 && redirects < 5) {
    const location = response.headers.get("location");
    if (location) {
      const next = assertXueqiuRedirect(url, location);
      await response.arrayBuffer().catch(() => {});
      return fetchXueqiu(next, nextCookie, init, redirects + 1);
    }
  }
  return { response, cookie: nextCookie };
}
var DEFAULT_LOGIN_TIMEOUT_SEC = 600;
var DEFAULT_LOGIN_TIMEOUT_MS = DEFAULT_LOGIN_TIMEOUT_SEC * 1000;
var QR_REFRESH_MS = 120000;
function parseLoginTimeoutMs(raw) {
  if (raw === undefined || raw === "")
    return DEFAULT_LOGIN_TIMEOUT_MS;
  if (!/^\d+(\.\d+)?$/.test(raw.trim())) {
    throw new Error("--timeout expects seconds, for example --timeout 600 (default 600)");
  }
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("--timeout expects a positive number of seconds (default 600)");
  }
  return Math.round(seconds * 1000);
}
function shouldRefreshQr(result) {
  return result === "EXPIRED" || result === "TIMEOUT";
}
function cookiesFromTarget(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("CDP timeout"));
    }, 1e4);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: "Network.enable" }));
      ws.send(JSON.stringify({
        id: 2,
        method: "Network.getCookies",
        params: { urls: [XUEQIU_ORIGIN, "https://xueqiu.com"] }
      }));
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(typeof event.data === "string" ? event.data : "");
      if (msg.id === 2) {
        clearTimeout(timeout);
        ws.close();
        const cookies = msg.result?.cookies || [];
        const cookieStr = cookies.filter((cookie) => cookie.domain?.includes("xueqiu")).map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
        if (!cookieStr.includes("device_id")) {
          reject(new Error("No device_id cookie \u2014 page may not have loaded yet"));
          return;
        }
        resolve(cookieStr);
      }
    };
    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("CDP connection failed"));
    };
  });
}
async function getWafCookies(cdpUrl) {
  const targetsRes = await fetch(`${cdpUrl}/json`);
  const targets = await targetsRes.json();
  const pages = targets.filter((target) => target.type === "page" && target.url?.includes("xueqiu.com") && target.webSocketDebuggerUrl);
  if (pages.length === 0) {
    throw new Error("No xueqiu.com tab found in Chrome");
  }
  let lastError = "No device_id cookie \u2014 page may not have loaded yet";
  for (const page of pages) {
    try {
      return await cookiesFromTarget(page.webSocketDebuggerUrl);
    } catch (error) {
      lastError = error?.message ?? lastError;
    }
  }
  throw new Error(lastError);
}
async function generateQRCode(wafCookies) {
  const { response, cookie } = await fetchXueqiu(qrGenerateUrl(), wafCookies, { method: "POST" });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 180);
    throw new Error(`QR generate failed: HTTP ${response.status} ${detail}`);
  }
  const data = await response.json();
  if (!data.success || !data.data?.qr_code) {
    throw new Error(`QR generate failed: ${data.message || JSON.stringify(data)}`);
  }
  const qrUrl = data.data.qr_code;
  const codeMatch = qrUrl.match(/code=([a-f0-9]+)/i);
  if (!codeMatch) {
    throw new Error(`Could not parse QR code from URL: ${qrUrl}`);
  }
  return { qrUrl, code: codeMatch[1], cookie };
}
async function renderQRToTerminal(url) {
  const qrText = await $toString(url, {
    type: "terminal",
    small: true,
    margin: 1
  });
  console.log(qrText);
}
async function writeQRPng(url, filePath) {
  const absolute = resolve(filePath);
  mkdirSync2(dirname(absolute), { recursive: true });
  await $toFile(absolute, url, {
    type: "png",
    margin: 1,
    width: 360,
    errorCorrectionLevel: "M"
  });
  return absolute;
}
async function cookiesFromConfirm(cookie, payload, cdpUrl) {
  if (hasLoginCookie(cookie))
    return cookie;
  if (payload?.access_token) {
    const synthesized = mergeCookies(cookie, [
      `xq_a_token=${payload.access_token}`,
      payload.refresh_token ? `xq_r_token=${payload.refresh_token}` : "",
      payload.id_token ? `xq_id_token=${payload.id_token}` : "",
      payload.uid || payload.user_id ? `u=${payload.uid || payload.user_id}` : "",
      "xq_is_login=1"
    ].filter(Boolean).join("; "));
    if (hasLoginCookie(synthesized))
      return synthesized;
  }
  console.log(`
  Scan confirmed. Reading auth cookies from Chrome...`);
  await new Promise((r) => setTimeout(r, 1500));
  try {
    const fromChrome = await getWafCookies(cdpUrl);
    if (hasLoginCookie(fromChrome))
      return fromChrome;
  } catch {}
  throw new Error("Login was confirmed but xq_is_login was not in the response cookies. " + 'Try again, or paste a cookie with: snowball token "xq_a_token=...; u=..."');
}
async function pollQRStatus(code, wafCookies, cdpUrl, timeoutMs = QR_REFRESH_MS) {
  const startTime = Date.now();
  const pollInterval = 2500;
  let cookie = wafCookies;
  let announcedScan = false;
  while (Date.now() - startTime < timeoutMs) {
    const result = await fetchXueqiu(qrPollUrl(code), cookie);
    cookie = result.cookie;
    const res = result.response;
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 180);
      throw new Error(`Poll failed: HTTP ${res.status} ${detail}`);
    }
    const data = await res.json();
    const decision = interpretQRState(data);
    if (decision.type === "confirmed" || decision.type === "login") {
      return cookiesFromConfirm(cookie, decision.payload, cdpUrl);
    }
    if (decision.type === "bindphone") {
      throw new Error("Xueqiu asked this account to bind a phone number before QR login can finish. " + "Bind it in the Xueqiu app, then run snowball login again.");
    }
    if (decision.type === "cancelled") {
      throw new Error("Login cancelled in the Xueqiu app.");
    }
    if (decision.type === "expired")
      return "EXPIRED";
    if (decision.type === "invalid") {
      throw new Error(`Unexpected QR status: ${JSON.stringify(data).slice(0, 180)}`);
    }
    if (decision.type === "scanned" && !announcedScan) {
      announcedScan = true;
      process.stdout.write(`
  Scanned. Tap \u786E\u8BA4\u767B\u5F55 in the Xueqiu app.
  `);
    } else {
      process.stdout.write(decision.type === "scanned" ? "\u2713" : ".");
    }
    const remaining = timeoutMs - (Date.now() - startTime);
    if (remaining <= 0)
      break;
    await new Promise((r) => setTimeout(r, Math.min(pollInterval, remaining)));
  }
  return "TIMEOUT";
}
async function presentQR(qrUrl, options) {
  if (options.qrPngPath) {
    const absolute = await writeQRPng(qrUrl, options.qrPngPath);
    console.log(`  QR_PNG=${absolute}`);
  }
  const draw = options.drawTerminal !== false && Boolean(process.stdout.isTTY);
  if (draw) {
    await renderQRToTerminal(qrUrl);
  } else if (!options.qrPngPath) {
    console.log(`  QR_URL=${qrUrl}`);
  }
}
async function qrLogin(cdpUrl, options = {}) {
  console.log("  Waiting for WAF cookies");
  process.stdout.write("  ");
  let wafCookies = "";
  let lastError = "";
  for (let i = 0;i < 15; i++) {
    try {
      wafCookies = await getWafCookies(cdpUrl);
      break;
    } catch (error) {
      lastError = error?.message ?? String(error);
      process.stdout.write(".");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (!wafCookies) {
    throw new Error(`Could not get WAF cookies after 30s (${lastError || "no device_id"}). ` + "Xueqiu blocks headless Chrome. Start a real Chrome window " + "(on a server: install Xvfb, or import a token from a machine with a display).");
  }
  console.log(`
  \u2713 Got WAF cookies
`);
  const timeoutMs = options.timeoutMs ?? DEFAULT_LOGIN_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;
  let round = 0;
  while (Date.now() < deadline) {
    round++;
    if (round > 1) {
      console.log(`
  QR was not confirmed. Generating a new one.
`);
    }
    console.log("  Generating QR code...");
    const generated = await generateQRCode(wafCookies);
    wafCookies = generated.cookie;
    console.log(`  \u2713 QR code ready
`);
    if (round === 1) {
      const seconds = Math.round(timeoutMs / 1000);
      if (options.qrPngPath) {
        console.log("  Scan this image with the Xueqiu app, then tap \u786E\u8BA4\u767B\u5F55.");
        console.log("  This command waits until that finishes. No need to press ENTER.");
        console.log(`  The image is refreshed in place for ${seconds}s. Watch for a new QR_PNG= line.
`);
      } else if (process.stdout.isTTY) {
        console.log("  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
        console.log("  \u2502  Scan this QR with the Xueqiu app  \u2502");
        console.log(`  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
`);
      }
    }
    await presentQR(generated.qrUrl, options);
    const slice = Math.min(QR_REFRESH_MS, deadline - Date.now());
    if (slice <= 0)
      break;
    console.log("  Waiting for scan");
    process.stdout.write("  ");
    const cookie = await pollQRStatus(generated.code, wafCookies, cdpUrl, slice);
    if (shouldRefreshQr(cookie))
      continue;
    return { cookie, code: generated.code };
  }
  const minutes = Math.max(1, Math.round(timeoutMs / 60000));
  throw new Error(`Login timed out after ${minutes} min. The QR was refreshed until then. Run snowball login again.`);
}

// lib/browser.ts
init_private();
import { execFileSync, spawn } from "child_process";
import { randomBytes } from "crypto";
import { existsSync as existsSync2, rmSync, writeFileSync as writeFileSync2 } from "fs";
import { homedir as homedir2, hostname, platform, tmpdir } from "os";
import { dirname as dirname2, join as join2 } from "path";
var CHROME_PROFILE_DIR = join2(homedir2(), ".snowball-cli", "chrome-profile");
var CHROME_SINGLETON_FILES = ["SingletonLock", "SingletonCookie", "SingletonSocket"];
var LINUX_SANDBOX_ARGS = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];
function planChromeLaunch(ctx) {
  const args = [
    `--remote-debugging-port=${ctx.port}`,
    `--user-data-dir=${ctx.profileDir}`,
    "--no-first-run",
    "--no-default-browser-check"
  ];
  if (ctx.platform === "linux")
    args.push(...LINUX_SANDBOX_ARGS);
  if (ctx.platform === "linux" && !ctx.hasDisplay) {
    if (ctx.xvfbAvailable) {
      args.push("--disable-gpu");
      return { args, headless: false, mode: "xvfb" };
    }
    args.push("--headless=new", "--disable-gpu");
    return { args, headless: true, mode: "headless" };
  }
  return { args, headless: false, mode: "headed" };
}
function clearStaleChromeLocks(profileDir) {
  for (const name of CHROME_SINGLETON_FILES) {
    rmSync(join2(profileDir, name), { force: true });
  }
}
function debugPort(cdpUrl) {
  try {
    const port = new URL(cdpUrl).port;
    return port ? Number(port) : 9222;
  } catch {
    return 9222;
  }
}
function commandExists(name) {
  const found = Bun.which(name);
  return Boolean(found);
}
function chromeCandidates() {
  const os = platform();
  const defaults = {
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    ],
    win32: [
      join2(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
      join2(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
      join2(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
      join2(process.env.PROGRAMFILES ?? "C:\\Program Files", "Chromium", "Application", "chrome.exe"),
      join2(process.env.LOCALAPPDATA ?? "", "Chromium", "Application", "chrome.exe")
    ],
    linux: [
      "google-chrome",
      "google-chrome-stable",
      "chromium-browser",
      "chromium",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/snap/bin/chromium"
    ]
  };
  return defaults[os] ?? defaults.linux;
}
function findChrome(explicit) {
  if (explicit)
    return explicit;
  for (const candidate of chromeCandidates()) {
    if (candidate.includes("/") || candidate.includes("\\")) {
      if (existsSync2(candidate))
        return candidate;
    } else if (commandExists(candidate)) {
      return candidate;
    }
  }
  console.error(`
  Chrome / Chromium not found.
`);
  if (platform() === "linux") {
    console.error(`  Install Chromium:
`);
    console.error("    apt install -y chromium-browser   # Debian/Ubuntu");
    console.error("    yum install -y chromium           # CentOS/RHEL");
    console.error(`    snap install chromium             # Snap
`);
    console.error(`  On a server without a display, also install Xvfb (headless Chrome cannot pass Xueqiu's WAF):
`);
    console.error(`    apt install -y xvfb
`);
  } else if (platform() === "win32") {
    console.error(`  Set CHROME_PATH:
`);
    console.error(`    set CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
`);
  } else {
    console.error(`  Install Chrome or Chromium, or set CHROME_PATH:
`);
    console.error(`    export CHROME_PATH=/path/to/chrome
`);
  }
  console.error("  Or use --chrome flag:  snowball login --chrome /path/to/chrome");
  console.error(`  Or skip the browser:   snowball import $(snowball export)  # from another machine
`);
  throw new Error("Chrome / Chromium not found");
}
function stopProfileChrome(profileDir) {
  if (platform() === "win32")
    return;
  const pattern = `--user-data-dir=${profileDir}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    execFileSync("pkill", ["-9", "-f", pattern], { stdio: "ignore" });
  } catch {}
}
function stopSnowballChrome() {
  stopProfileChrome(CHROME_PROFILE_DIR);
}
var smsCleanupArmed = false;
function armSmsProcessCleanup() {
  if (smsCleanupArmed)
    return;
  smsCleanupArmed = true;
  process.on("exit", () => {
    stopSnowballChrome();
  });
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function cdpReady(cdpUrl) {
  try {
    const res = await fetch(`${cdpUrl}/json/version`);
    return res.ok;
  } catch {
    return false;
  }
}
function xvfbArgs(display, authFile) {
  return [display, "-screen", "0", "1280x800x24", "-nolisten", "tcp", "-auth", authFile];
}
function u16be(n) {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(n);
  return buf;
}
function xauthRecord(host, displayNumber, cookie) {
  const address = Buffer.from(host);
  const number = Buffer.from(displayNumber);
  const name = Buffer.from("MIT-MAGIC-COOKIE-1");
  return Buffer.concat([
    u16be(256),
    u16be(address.length),
    address,
    u16be(number.length),
    number,
    u16be(name.length),
    name,
    u16be(cookie.length),
    cookie
  ]);
}
function buildXauthority(display) {
  const displayNumber = display.replace(/^:/, "");
  const cookie = randomBytes(16);
  const records = [xauthRecord(hostname() || "localhost", displayNumber, cookie)];
  if ((hostname() || "") !== "localhost") {
    records.push(xauthRecord("localhost", displayNumber, cookie));
  }
  return Buffer.concat(records);
}
var startedXvfb = null;
var xvfbHookInstalled = false;
function installXvfbStopHook() {
  if (xvfbHookInstalled)
    return;
  xvfbHookInstalled = true;
  const halt = (code) => {
    stopStartedXvfb();
    process.exit(code);
  };
  process.on("exit", () => stopStartedXvfb());
  process.once("SIGINT", () => halt(130));
  process.once("SIGTERM", () => halt(143));
}
function stopStartedXvfb() {
  const started = startedXvfb;
  startedXvfb = null;
  if (!started)
    return;
  const pid = started.child.pid;
  if (pid) {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      try {
        started.child.kill("SIGTERM");
      } catch {}
    }
  }
  rmSync(started.authFile, { force: true });
}
async function startXvfb() {
  if (!commandExists("Xvfb"))
    return null;
  installXvfbStopHook();
  for (let n = 99;n <= 109; n++) {
    const display = `:${n}`;
    const sock = `/tmp/.X11-unix/X${n}`;
    if (existsSync2(sock))
      continue;
    const authFile = join2(tmpdir(), `snowball-xvfb-${process.pid}-${n}.xauth`);
    writeFileSync2(authFile, buildXauthority(display), { mode: 384 });
    secureFile(authFile);
    const child = spawn("Xvfb", xvfbArgs(display, authFile), {
      stdio: "ignore",
      detached: true
    });
    child.unref();
    let ready = false;
    for (let i = 0;i < 20; i++) {
      if (existsSync2(sock)) {
        ready = true;
        break;
      }
      if (child.exitCode !== null)
        break;
      await sleep(100);
    }
    if (!ready) {
      if (child.pid) {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {
          try {
            child.kill("SIGTERM");
          } catch {}
        }
      }
      rmSync(authFile, { force: true });
      continue;
    }
    startedXvfb = { child, authFile, display };
    return { display, authFile };
  }
  return null;
}
function spawnChrome(bin, args, display, xauthority) {
  const env = { ...process.env };
  if (display)
    env.DISPLAY = display;
  if (xauthority)
    env.XAUTHORITY = xauthority;
  let stderrText = "";
  const child = spawn(bin, args, {
    stdio: ["ignore", "ignore", "pipe"],
    detached: true,
    env
  });
  child.stderr?.on("data", (chunk) => {
    stderrText = (stderrText + chunk.toString("utf8")).slice(-2000);
  });
  child.stderr?.unref?.();
  child.unref();
  return { stderr: () => stderrText };
}
async function ensureChrome(cdpUrl, chromePath) {
  secureDirectory(dirname2(CHROME_PROFILE_DIR));
  if (existsSync2(CHROME_PROFILE_DIR))
    secureDirectory(CHROME_PROFILE_DIR);
  if (await cdpReady(cdpUrl))
    return;
  const profileDir = CHROME_PROFILE_DIR;
  secureDirectory(profileDir);
  const bin = findChrome(chromePath);
  const hasDisplay = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  const xvfbAvailable = platform() === "linux" && !hasDisplay && commandExists("Xvfb");
  const plan = planChromeLaunch({
    platform: platform(),
    hasDisplay,
    xvfbAvailable,
    profileDir,
    port: debugPort(cdpUrl)
  });
  let session = null;
  if (plan.mode === "xvfb") {
    session = await startXvfb();
    if (!session) {
      plan.args.push("--headless=new");
      plan.headless = true;
      plan.mode = "headless";
    }
  }
  if (plan.mode === "headless") {
    console.log("  No DISPLAY and Xvfb is not available \u2014 starting headless Chrome.");
    console.log("  Xueqiu's WAF blocks headless Chrome, so login will probably fail.");
    console.log("  Install Xvfb (`apt install -y xvfb`) or import a token from another machine.\n");
  } else if (plan.mode === "xvfb") {
    console.log(`  Starting Chrome on virtual display ${session?.display} (Xvfb).`);
    console.log(`  Headless Chrome cannot get Xueqiu WAF cookies; this is a real browser window.
`);
  } else {
    console.log("  Starting Chrome...");
  }
  let lastStderr = "";
  for (let attempt = 1;attempt <= 2; attempt++) {
    stopProfileChrome(profileDir);
    await sleep(attempt === 1 ? 200 : 500);
    clearStaleChromeLocks(profileDir);
    const child = spawnChrome(bin, plan.args, session?.display, session?.authFile);
    for (let i = 0;i < 20; i++) {
      await sleep(500);
      if (await cdpReady(cdpUrl))
        return;
    }
    lastStderr = child.stderr();
  }
  stopStartedXvfb();
  const tail = lastStderr.trim() ? `
${lastStderr.trim()}
` : "";
  throw new Error(`Chrome failed to start.${tail}` + "On Linux the launcher adds --no-sandbox and deletes Singleton* locks in " + "~/.snowball-cli/chrome-profile before each attempt. " + "Set CHROME_PATH / --chrome if the detected binary is wrong.");
}
var XUEQIU_HOME = "https://www.xueqiu.com/";
async function openXueqiuTab(cdpUrl) {
  const version = await (await fetch(`${cdpUrl}/json/version`)).json();
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("timeout"));
    }, 1e4);
    ws.onopen = () => ws.send(JSON.stringify({
      id: 1,
      method: "Target.createTarget",
      params: { url: XUEQIU_HOME }
    }));
    ws.onmessage = (event) => {
      const msg = JSON.parse(typeof event.data === "string" ? event.data : "");
      if (msg.id === 1) {
        clearTimeout(timer);
        ws.close();
        if (msg.error)
          reject(new Error(msg.error.message || "CDP failed"));
        else
          resolve();
      }
    };
    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error("CDP failed"));
    };
  });
}

// lib/sms.ts
import { writeFileSync as writeFileSync4 } from "fs";

// lib/cdp.ts
function messageText(data) {
  if (typeof data === "string")
    return data;
  if (data instanceof ArrayBuffer)
    return new TextDecoder().decode(data);
  if (ArrayBuffer.isView(data))
    return new TextDecoder().decode(data);
  return "";
}
async function connectCdp(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("CDP connection timed out"));
    }, 1e4);
    ws.onopen = () => {
      clearTimeout(timer);
      resolve();
    };
    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error("CDP connection failed"));
    };
  });
  let next = 1;
  const pending = new Map;
  const listeners = new Set;
  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(messageText(event.data));
    } catch {
      return;
    }
    if (msg.id && pending.has(msg.id)) {
      const waiter = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error)
        waiter.reject(new Error(msg.error.message || "CDP command failed"));
      else
        waiter.resolve(msg.result);
      return;
    }
    if (msg.method) {
      for (const listener of listeners)
        listener(msg.method, msg.params ?? {});
    }
  };
  const failPending = (error) => {
    for (const waiter of pending.values())
      waiter.reject(error);
    pending.clear();
  };
  ws.onclose = () => failPending(new Error("CDP connection closed"));
  return {
    send(method, params = {}, timeoutMs = 20000) {
      const id = next++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (!pending.has(id))
            return;
          pending.delete(id);
          reject(new Error(`CDP ${method} timed out`));
        }, timeoutMs);
        pending.set(id, {
          resolve: (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          }
        });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    onEvent(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    close() {
      ws.close();
    }
  };
}
async function connectXueqiuPage(cdpUrl) {
  const targets = await (await fetch(`${cdpUrl}/json/list`)).json();
  const pages = targets.filter((target) => target.type === "page" && /xueqiu\.com/.test(target.url || "") && target.webSocketDebuggerUrl);
  if (pages.length === 0)
    throw new Error("No xueqiu.com tab found in Chrome");
  pages.sort((a, b) => Number(/www\.xueqiu\.com/.test(b.url || "")) - Number(/www\.xueqiu\.com/.test(a.url || "")));
  const session = await connectCdp(pages[0].webSocketDebuggerUrl);
  await session.send("Network.enable");
  await session.send("Page.enable");
  await session.send("Runtime.enable");
  try {
    await session.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });
  } catch {}
  return session;
}

// lib/sms.ts
init_private();

// lib/sms-http.ts
init_private();
var import_sm_crypto = __toESM(require_src(), 1);
import { existsSync as existsSync3, readFileSync as readFileSync2, renameSync, rmSync as rmSync2, writeFileSync as writeFileSync3 } from "fs";
import { join as join3 } from "path";
var XUEQIU_SM4_KEY = "0123456789abcdeffedcba9876543210";
var SMS_SESSION_TTL_MS = 10 * 60 * 1000;
var SMS_CODE_ATTEMPTS = 4;
var SMS_CODE_PROMPT = "\u8BF7\u8F93\u5165\u77ED\u4FE1\u9A8C\u8BC1\u7801:";
var CAPTCHA_CLICK_PROMPT = "\u8BF7\u8F93\u5165\u70B9\u51FB\u5750\u6807 (x,y;x,y):";
function smsLoginPaths(dataDir) {
  const dir = join3(dataDir, "sms-login");
  return {
    dir,
    session: join3(dir, "session.json"),
    captcha: join3(dir, "captcha.png")
  };
}
function shouldPromptForSms(isTTY, noWait) {
  return Boolean(isTTY) && !noWait;
}
function wireAreaCode(areaCode) {
  return areaCode === "2" ? "1" : areaCode;
}
var GEETEST_KEYS = ["geetest_challenge", "geetest_validate", "geetest_seccode", "sid"];
function encryptXueqiu(plain, key = XUEQIU_SM4_KEY) {
  return import_sm_crypto.sm4.encrypt(plain, key, { mode: "cbc", padding: "pkcs#7", iv: key });
}
function decryptXueqiu(hex, key = XUEQIU_SM4_KEY) {
  return import_sm_crypto.sm4.decrypt(hex, key, { mode: "cbc", padding: "pkcs#7", iv: key });
}
function decryptDeviceInfo(cipher) {
  let parsed;
  try {
    parsed = JSON.parse(decryptXueqiu(cipher, XUEQIU_SM4_KEY) || "{}");
  } catch {
    throw new Error("Xueqiu device info could not be read");
  }
  if (typeof parsed.secret !== "string" || !parsed.secret || typeof parsed.device_id !== "string" || !parsed.device_id) {
    throw new Error("Xueqiu device info is missing");
  }
  return { secret: parsed.secret, deviceId: parsed.device_id };
}
function parseSendPost(raw) {
  const text = raw.trim();
  if (!text)
    return null;
  try {
    return JSON.parse(text);
  } catch {}
  if (!text.includes("="))
    return null;
  const params = new URLSearchParams(text);
  const record = {};
  for (const [key, value] of params.entries())
    record[key] = value;
  return Object.keys(record).length ? record : null;
}
function geetestFromSendBody(body) {
  if (!body || typeof body !== "object")
    return { xqGeetest: "", geetest: {} };
  const record = body;
  const geetest = {};
  for (const key of GEETEST_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value)
      geetest[key] = value;
  }
  const xq = record.xq_geetest;
  return { xqGeetest: typeof xq === "string" ? xq : "", geetest };
}
function buildLoginPlain(session, code, isRegister) {
  const plain = {
    remember_me: true,
    xq_geetest: session.xqGeetest,
    areacode: wireAreaCode(session.areaCode),
    telephone: session.phone,
    code,
    secret: session.deviceSecret,
    ee2eDid: session.deviceId
  };
  for (const [key, value] of Object.entries(session.geetest)) {
    if (!value)
      continue;
    if (key in plain)
      continue;
    plain[key] = value;
  }
  if (isRegister)
    plain.is_register = 1;
  return plain;
}
function loginRequestBodies(encryptData) {
  const json = JSON.stringify({ encryptData });
  return [
    { contentType: "application/json;charset=utf-8", body: json },
    { contentType: "application/x-www-form-urlencoded;charset=utf-8", body: json },
    { contentType: "application/x-www-form-urlencoded;charset=utf-8", body: `encryptData=${encodeURIComponent(encryptData)}` }
  ];
}
function looksLikeBodyMismatch(message) {
  return /decrypt|encrypt|padding|cipher|bad data|\u89E3\u5BC6|\u52A0\u5BC6|\u89E3\u6790/i.test(message);
}
function sessionProblemMessage(reason) {
  switch (reason) {
    case "missing":
      return "No SMS login session. Run snowball login --phone <number> first.";
    case "expired":
      return "The SMS login session expired after 10 minutes. Run snowball login --phone again.";
    case "invalid":
      return "The SMS login session file is unreadable. Run snowball login --phone again.";
  }
}
function captchaPhaseMessage() {
  return "The SMS has not been sent yet. Finish GeeTest with snowball login --captcha-click x,y";
}
function isSession(value) {
  if (!value || typeof value !== "object")
    return false;
  const session = value;
  return session.version === 1 && (session.phase === "captcha" || session.phase === "sent") && typeof session.createdAt === "number" && Number.isFinite(session.createdAt) && typeof session.areaCode === "string" && /^\d{1,4}$/.test(session.areaCode) && typeof session.phone === "string" && /^\d{6,14}$/.test(session.phone) && typeof session.maskedPhone === "string" && typeof session.cookie === "string" && typeof session.deviceId === "string" && typeof session.deviceSecret === "string" && typeof session.xqGeetest === "string" && !!session.geetest && typeof session.geetest === "object";
}
function saveSmsSession(dataDir, session) {
  const paths = smsLoginPaths(dataDir);
  secureDirectory(dataDir);
  secureDirectory(paths.dir);
  const tmp = `${paths.session}.${process.pid}.tmp`;
  writeFileSync3(tmp, JSON.stringify(session), { encoding: "utf-8", mode: 384 });
  secureFile(tmp);
  renameSync(tmp, paths.session);
  secureFile(paths.session);
}
function loadSmsSession(dataDir, now = Date.now()) {
  const paths = smsLoginPaths(dataDir);
  if (!existsSync3(paths.session))
    return { ok: false, reason: "missing" };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync2(paths.session, "utf-8"));
  } catch {
    rmSync2(paths.session, { force: true });
    return { ok: false, reason: "invalid" };
  }
  if (!isSession(parsed)) {
    rmSync2(paths.session, { force: true });
    return { ok: false, reason: "invalid" };
  }
  if (now - parsed.createdAt >= SMS_SESSION_TTL_MS) {
    clearSmsSession(dataDir);
    return { ok: false, reason: "expired" };
  }
  return { ok: true, session: parsed };
}
function clearSmsSession(dataDir) {
  const paths = smsLoginPaths(dataDir);
  rmSync2(paths.session, { force: true });
  rmSync2(paths.captcha, { force: true });
}

// lib/sms.ts
function normalizeAreaCode(raw) {
  const digits = (raw ?? "86").trim().replace(/^\+/, "");
  if (!/^\d{1,4}$/.test(digits) || digits === "0") {
    throw new Error("--area-code expects a calling code such as 86 or 45");
  }
  return digits;
}
function normalizePhone(raw, areaCode) {
  const digits = raw.trim().replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits))
    throw new Error("Phone number must be digits");
  if (areaCode === "86" && !/^\d{11}$/.test(digits)) {
    throw new Error("A +86 phone number must be 11 digits");
  }
  if (areaCode !== "86" && !/^\d{6,14}$/.test(digits)) {
    throw new Error("Phone number must be 6 to 14 digits for this area code");
  }
  return digits;
}
function maskPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 8)
    return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  if (digits.length >= 2)
    return `${digits.slice(0, 1)}****${digits.slice(-1)}`;
  return "****";
}
function phoneLogLabel(areaCode, phone) {
  return `+${areaCode} ${maskPhone(phone)}`;
}
function normalizeSmsCode(raw) {
  const digits = raw.trim();
  if (!/^\d{4,8}$/.test(digits))
    throw new Error("SMS code must be 4 to 8 digits");
  return digits;
}
function parseCaptchaClicks(spec) {
  const parts = spec.split(/[;\s]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    throw new Error("--captcha-click expects x,y pixel coordinates from the CAPTCHA_REQUIRED image");
  }
  return parts.map((part) => {
    const match = /^(\d{1,5}),(\d{1,5})$/.exec(part);
    if (!match)
      throw new Error("--captcha-click expects x,y pixel coordinates, for example 120,80");
    return { x: Number(match[1]), y: Number(match[2]) };
  });
}
function safeServerMessage(raw) {
  const text = typeof raw === "string" && raw.trim() ? raw.trim() : "Xueqiu rejected the request";
  return text.replace(/\d{4,}/g, "******").replace(/[\r\n]+/g, " ").slice(0, 180);
}
function scrubSecrets(message, secrets) {
  let out = message;
  for (const secret of secrets) {
    if (secret && secret.length >= 4)
      out = out.split(secret).join("******");
  }
  return out;
}
function classifySendBody(body) {
  if (!body || typeof body !== "object")
    return null;
  const record = body;
  if (record.success === true || record.success === 1)
    return { ok: true };
  if (record.success === false || record.error_description || record.error_code || record.message) {
    return { ok: false, message: safeServerMessage(record.error_description || record.message) };
  }
  return null;
}
function classifyLoginBody(body) {
  if (!body || typeof body !== "object")
    return null;
  const record = body;
  if (record.error_code === undefined && record.result_code === undefined && record.success === undefined) {
    return null;
  }
  const code = Number(record.error_code ?? record.result_code ?? (record.success === true ? 0 : NaN));
  if (!Number.isFinite(code))
    return null;
  if (code === 0)
    return { kind: "ok" };
  if (code === 20099)
    return { kind: "register" };
  const message = safeServerMessage(record.error_description || record.message || `Xueqiu login error ${code}`);
  if (code === 20094)
    return { kind: "image-captcha", message };
  return { kind: "reject", message };
}
var PAGE_API = `(() => {
  if (window.__snowballSms) return true;
  function notHidden(el) {
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      if (node.hasAttribute("hidden")) return false;
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
    }
    return true;
  }
  function score(el) {
    let z = 0;
    let fixed = false;
    let depth = 0;
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      depth += 1;
      const style = getComputedStyle(node);
      const value = Number(style.zIndex);
      if (Number.isFinite(value)) z = Math.max(z, value);
      if (style.position === "fixed" || style.position === "absolute") fixed = true;
    }
    return (fixed ? 1000000 : 0) + z * 1000 - depth;
  }
  function modal() {
    const mains = [...document.querySelectorAll('[class*="modal__login__main"]')].filter(notHidden);
    if (mains.length) return mains.reduce((best, node) => score(node) >= score(best) ? node : best);
    const blocks = [...document.querySelectorAll("div")].filter((node) => {
      const text = node.innerText || "";
      return text.includes("\u9A8C\u8BC1\u7801\u767B\u5F55") && text.includes("\u53D1\u9001\u9A8C\u8BC1\u7801") && notHidden(node);
    });
    blocks.sort((a, b) => (a.innerText || "").length - (b.innerText || "").length);
    return blocks[0] || null;
  }
  function setNativeValue(el, value) {
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (!setter) return false;
    const tracker = el._valueTracker;
    if (tracker) tracker.setValue("");
    setter.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
    return true;
  }
  function optionMatches(option, code) {
    if (option.value === code) return "value";
    const text = (option.textContent || "").replace(/\\s/g, "");
    return text.endsWith("+" + code) ? "label" : "";
  }
  window.__snowballSms = {
    notHidden,
    open() {
      const nodes = [...document.querySelectorAll("a,button,div,span")];
      const link = nodes.find((node) => (node.innerText || "").trim() === "\u7ACB\u5373\u767B\u5F55/\u6CE8\u518C" && notHidden(node) && node.children.length === 0)
        || nodes.find((node) => /btn--login/.test(String(node.className || "")) && notHidden(node));
      if (link) link.click();
      return Boolean(link || modal());
    },
    overlay() {
      const root = modal();
      return Boolean(root && score(root) >= 1000000);
    },
    status(areaCode, phone) {
      const root = modal();
      if (!root) {
        return { modal: false, areaValue: "", areaSupported: false, phoneFilled: false, agreementChecked: false, sendVisible: false };
      }
      const selects = [...root.querySelectorAll("select")].filter(notHidden);
      let supported = false;
      let areaValue = "";
      for (const select of selects) {
        const exact = [...select.options].find((option) => optionMatches(option, areaCode) === "value");
        const labeled = [...select.options].filter((option) => optionMatches(option, areaCode));
        const chosen = exact || (labeled.length === 1 ? labeled[0] : null);
        if (chosen) {
          supported = true;
          areaValue = select.value;
          break;
        }
      }
      const phoneInput = [...root.querySelectorAll("input")].find((input) => input.placeholder === "\u8BF7\u8F93\u5165\u624B\u673A\u53F7" && notHidden(input));
      const send = [...root.querySelectorAll("a,button,span")].find((node) => (node.textContent || "").trim() === "\u53D1\u9001\u9A8C\u8BC1\u7801" && notHidden(node));
      const unchecked = [...root.querySelectorAll('[class*="nochecked"]')].some(notHidden);
      return {
        modal: true,
        areaValue,
        areaSupported: supported,
        phoneFilled: Boolean(phoneInput && phoneInput.value === phone),
        agreementChecked: !unchecked,
        sendVisible: Boolean(send),
      };
    },
    setArea(areaCode) {
      const root = modal();
      if (!root) return { ok: false, reason: "no-modal" };
      const selects = [...root.querySelectorAll("select")].filter(notHidden);
      let match = null;
      for (const select of selects) {
        const exact = [...select.options].find((option) => optionMatches(option, areaCode) === "value");
        if (exact) { match = { select, option: exact }; break; }
        const labeled = [...select.options].filter((option) => optionMatches(option, areaCode));
        if (labeled.length === 1) match = { select, option: labeled[0] };
      }
      if (!match) return { ok: false, reason: "unsupported" };
      setNativeValue(match.select, match.option.value);
      return { ok: match.select.value === match.option.value, value: match.select.value };
    },
    setPhone(phone) {
      const root = modal();
      const input = root && [...root.querySelectorAll("input")].find((node) => node.placeholder === "\u8BF7\u8F93\u5165\u624B\u673A\u53F7" && notHidden(node));
      if (!input) return { ok: false, reason: "no-input" };
      setNativeValue(input, phone);
      return { ok: input.value === phone };
    },
    acceptAgreement() {
      const root = modal();
      if (!root) return { ok: false };
      const icon = [...root.querySelectorAll('[class*="nochecked"]')].find(notHidden);
      if (icon) icon.click();
      const still = [...root.querySelectorAll('[class*="nochecked"]')].some(notHidden);
      return { ok: !still };
    },
    clickSend() {
      const root = modal();
      const button = root && [...root.querySelectorAll("a,button,span")].find((node) => (node.textContent || "").trim() === "\u53D1\u9001\u9A8C\u8BC1\u7801" && notHidden(node) && node.children.length === 0);
      if (!button) return { ok: false };
      button.click();
      return { ok: true };
    },
    setCode(code) {
      const root = modal();
      const input = root && [...root.querySelectorAll("input")].find((node) => node.placeholder === "\u8BF7\u8F93\u5165\u9A8C\u8BC1\u7801" && notHidden(node));
      if (!input) return { ok: false, reason: "no-input" };
      setNativeValue(input, code);
      return { ok: input.value === code };
    },
    clickLogin() {
      const root = modal();
      const button = root && [...root.querySelectorAll('[class*="modal__login__btn"]')].find((node) => {
        const text = (node.innerText || "").replace(/\\s/g, "");
        return text === "\u767B\u5F55" && notHidden(node);
      });
      if (!button) return { ok: false };
      button.click();
      return { ok: true };
    },
    geetest() {
      const panel = document.querySelector(".geetest_panel");
      if (!panel) return { open: false, marker: "", text: "" };
      const style = getComputedStyle(panel);
      const box = panel.getBoundingClientRect();
      const open = style.display !== "none" && style.visibility !== "hidden" && box.width > 40 && box.height > 40;
      const image = panel.querySelector("img");
      const marker = image && image.src ? String(image.src).slice(0, 160) : (panel.className || "").slice(0, 160);
      const text = (panel.innerText || "").replace(/\\s+/g, " ").slice(0, 80);
      return { open, marker, text };
    },
    toast() {
      const text = document.body ? document.body.innerText || "" : "";
      const known = ["\u8BF7\u9605\u8BFB\u5E76\u52FE\u9009\u534F\u8BAE", "\u8BF7\u8F93\u5165\u624B\u673A\u53F7", "\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u624B\u673A\u53F7"];
      return known.find((item) => text.includes(item)) || "";
    },
  };
  return true;
})()`;
var LOGIN_URL = `${XUEQIU_ORIGIN}/snb/provider/login`;
function pathnameOf(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split("?")[0];
  }
}
function sleep2(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function evalValue(session, expression) {
  const result = await session.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text || "page script failed";
    throw new Error(String(description).split(`
`)[0]);
  }
  return result.result?.value;
}
function watchSms(session) {
  let xqGeetest = "";
  let geetest = {};
  let send = null;
  const pendingResp = [];
  const pendingReq = [];
  session.onEvent((method, params) => {
    if (method === "Network.requestWillBeSent") {
      const path = pathnameOf(String(params.request?.url || ""));
      if (!path.endsWith("/account/sms/send_verification_code.json"))
        return;
      pendingReq.push({
        requestId: String(params.requestId),
        postData: typeof params.request?.postData === "string" ? params.request.postData : ""
      });
      return;
    }
    if (method !== "Network.responseReceived")
      return;
    const path = pathnameOf(String(params.response?.url || ""));
    if (!/send_verification_code\.json$|\/gee_test\/get$/.test(path))
      return;
    pendingResp.push({
      requestId: String(params.requestId),
      url: path,
      status: Number(params.response?.status || 0)
    });
  });
  const seenResp = new Set;
  const seenReq = new Set;
  const respAttempts = new Map;
  return {
    async drain() {
      const requests = pendingReq.splice(0);
      for (const item of requests) {
        if (seenReq.has(item.requestId))
          continue;
        let post = item.postData;
        if (!post) {
          try {
            const result = await session.send("Network.getRequestPostData", { requestId: item.requestId }, 8000);
            post = String(result.postData || "");
          } catch {
            pendingReq.push(item);
            continue;
          }
        }
        seenReq.add(item.requestId);
        const fields = geetestFromSendBody(parseSendPost(post));
        if (fields.xqGeetest)
          xqGeetest = fields.xqGeetest;
        geetest = { ...geetest, ...fields.geetest };
      }
      const responses = pendingResp.splice(0);
      for (const item of responses) {
        if (seenResp.has(item.requestId))
          continue;
        try {
          const result = await session.send("Network.getResponseBody", { requestId: item.requestId }, 8000);
          seenResp.add(item.requestId);
          const text = result.base64Encoded ? Buffer.from(result.body, "base64").toString("utf8") : String(result.body ?? "");
          let body = null;
          try {
            body = JSON.parse(text);
          } catch {
            body = null;
          }
          if (item.url.endsWith("/gee_test/get")) {
            const record = body && typeof body === "object" ? body : null;
            if (!xqGeetest && record && typeof record.xq_geetest === "string")
              xqGeetest = record.xq_geetest;
            continue;
          }
          const classified = classifySendBody(body);
          if (classified)
            send = classified;
          else if (item.status >= 400)
            send = { ok: false, message: `Xueqiu refused the SMS request (HTTP ${item.status})` };
        } catch {
          const count = (respAttempts.get(item.requestId) ?? 0) + 1;
          respAttempts.set(item.requestId, count);
          if (count < 5)
            pendingResp.push(item);
        }
      }
      return { xqGeetest, geetest: { ...geetest }, send };
    }
  };
}
async function connectWhenReady(cdpUrl) {
  const deadline = Date.now() + 20000;
  let last = "No xueqiu.com tab found in Chrome";
  while (Date.now() < deadline) {
    try {
      const session = await connectXueqiuPage(cdpUrl);
      const ready = await evalValue(session, "document.readyState");
      const title = await evalValue(session, "document.title || ''");
      if (ready === "complete" && title && !/\u62E6\u622A|\u8BF7\u6C42\u5F02\u5E38/.test(title))
        return session;
      session.close();
    } catch (error) {
      last = error?.message || last;
    }
    await sleep2(400);
  }
  throw new Error(last);
}
async function preparePhoneForm(session, phone, areaCode) {
  await evalValue(session, PAGE_API);
  await evalValue(session, "window.__snowballSms.open()");
  const overlayDeadline = Date.now() + 8000;
  while (Date.now() < overlayDeadline) {
    if (await evalValue(session, "window.__snowballSms.overlay()"))
      break;
    await sleep2(200);
  }
  const deadline = Date.now() + 1e4;
  let status = await evalValue(session, `window.__snowballSms.status(${JSON.stringify(areaCode)}, ${JSON.stringify(phone)})`);
  while (!status.modal && Date.now() < deadline) {
    await sleep2(300);
    status = await evalValue(session, `window.__snowballSms.status(${JSON.stringify(areaCode)}, ${JSON.stringify(phone)})`);
  }
  if (!status.modal)
    throw new Error("Could not open the Xueqiu login modal");
  const area = await evalValue(session, `window.__snowballSms.setArea(${JSON.stringify(areaCode)})`);
  if (!area.ok) {
    throw new Error(area.reason === "unsupported" ? `Area code +${areaCode} is not in the Xueqiu login list` : "Could not set the area code on the login form");
  }
  const filled = await evalValue(session, `window.__snowballSms.setPhone(${JSON.stringify(phone)})`);
  if (!filled.ok)
    throw new Error("Could not fill the phone number on the login form");
  for (let attempt = 0;attempt < 4; attempt++) {
    const agreed = await evalValue(session, "window.__snowballSms.acceptAgreement()");
    if (agreed.ok)
      break;
    await sleep2(200);
  }
  status = await evalValue(session, `window.__snowballSms.status(${JSON.stringify(areaCode)}, ${JSON.stringify(phone)})`);
  if (!status.agreementChecked)
    throw new Error("Could not check the Xueqiu agreement box");
  if (!status.phoneFilled)
    throw new Error("The login form did not keep the phone number");
  if (!status.sendVisible)
    throw new Error("The \u53D1\u9001\u9A8C\u8BC1\u7801 button is not visible");
  return status;
}
async function readDeviceInfo(session) {
  const deadline = Date.now() + 8000;
  let last = "Xueqiu device info is missing";
  while (Date.now() < deadline) {
    const raw = await evalValue(session, "localStorage.getItem('DEVICE_INFO') || ''");
    if (raw) {
      try {
        return decryptDeviceInfo(raw);
      } catch (error) {
        last = error?.message || last;
      }
    }
    await sleep2(300);
  }
  throw new Error(last);
}
async function readCookie(cdpUrl) {
  const deadline = Date.now() + 8000;
  let last = "No device_id cookie \u2014 page may not have loaded yet";
  while (Date.now() < deadline) {
    try {
      return await getWafCookies(cdpUrl);
    } catch (error) {
      last = error?.message || last;
    }
    await sleep2(400);
  }
  throw new Error(last);
}
async function saveCaptchaPng(session, dataDir) {
  const paths = smsLoginPaths(dataDir);
  secureDirectory(dataDir);
  secureDirectory(paths.dir);
  const shot = await session.send("Page.captureScreenshot", { format: "png" });
  writeFileSync4(paths.captcha, Buffer.from(shot.data, "base64"), { mode: 384 });
  secureFile(paths.captcha);
  return paths.captcha;
}
async function dispatchPoints(session, points) {
  try {
    await session.send("Page.bringToFront");
  } catch {}
  for (const point of points) {
    await session.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: point.x,
      y: point.y,
      button: "left",
      clickCount: 1
    });
    await session.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: point.x,
      y: point.y,
      button: "left",
      clickCount: 1
    });
    await sleep2(150);
  }
}
async function readPromptLine(prompt) {
  if (!process.stdin.isTTY)
    return null;
  process.stdout.write(`${prompt} `);
  const stdin = process.stdin;
  stdin.setEncoding("utf8");
  return await new Promise((resolve) => {
    let buf = "";
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.off("end", onEnd);
      stdin.pause();
    };
    const onData = (chunk) => {
      buf += chunk;
      const newline = buf.indexOf(`
`);
      if (newline >= 0) {
        cleanup();
        resolve(buf.slice(0, newline).replace(/\r$/, ""));
      }
    };
    const onEnd = () => {
      cleanup();
      const line = buf.replace(/\r$/, "").trim();
      resolve(line ? line : null);
    };
    stdin.on("data", onData);
    stdin.on("end", onEnd);
    stdin.resume();
  });
}
function draftSession(phone, areaCode, phase, cookie, device, traffic) {
  return {
    version: 1,
    createdAt: Date.now(),
    phase,
    areaCode,
    phone,
    maskedPhone: maskPhone(phone),
    cookie,
    deviceId: device.deviceId,
    deviceSecret: device.secret,
    xqGeetest: traffic.xqGeetest,
    geetest: traffic.geetest
  };
}
async function driveUntilSmsSent(options) {
  const deadline = Date.now() + options.timeoutMs;
  const preset = options.presetClicks ?? [];
  let page = null;
  let released = false;
  const release = () => {
    if (released)
      return;
    released = true;
    try {
      page?.close();
    } catch {}
    stopSnowballChrome();
    stopStartedXvfb();
  };
  try {
    await ensureChrome(options.cdpUrl, options.chromePath);
    console.log(`  Opening xueqiu.com...
`);
    await openXueqiuTab(options.cdpUrl);
    await readCookie(options.cdpUrl);
    page = await connectWhenReady(options.cdpUrl);
    const traffic = watchSms(page);
    console.log(`  Opening the Xueqiu login modal for ${phoneLogLabel(options.areaCode, options.phone)}.`);
    await preparePhoneForm(page, options.phone, options.areaCode);
    const device = await readDeviceInfo(page);
    const cookie = await readCookie(options.cdpUrl);
    const clicked = await evalValue(page, "window.__snowballSms.clickSend()");
    if (!clicked.ok)
      throw new Error("Could not click \u53D1\u9001\u9A8C\u8BC1\u7801");
    const announced = new Set;
    const prompted = new Set;
    let presetUsed = false;
    let captchaPrompts = 0;
    let sawPanel = false;
    const firstSlice = Math.min(deadline, Date.now() + 20000);
    const persist = async (phase, snap) => {
      let current = cookie;
      try {
        current = await getWafCookies(options.cdpUrl);
      } catch {}
      saveSmsSession(options.dataDir, draftSession(options.phone, options.areaCode, phase, current, device, snap));
    };
    while (Date.now() < deadline) {
      const snap = await traffic.drain();
      if (snap.send?.ok) {
        await persist("sent", snap);
        return "sent";
      }
      if (snap.send && !snap.send.ok)
        throw new Error(snap.send.message);
      const panel = await evalValue(page, "window.__snowballSms.geetest()");
      if (panel.open) {
        sawPanel = true;
        const marker = panel.marker || "panel";
        if (!announced.has(marker)) {
          announced.add(marker);
          const png = await saveCaptchaPng(page, options.dataDir);
          console.log(`CAPTCHA_REQUIRED=${png}`);
          await persist("captcha", snap);
          if (!options.interactiveClicks && preset.length === 0) {
            console.log("  Session saved. Finish GeeTest with: snowball login --captcha-click x,y");
            return "captcha-pending";
          }
        }
        if (preset.length > 0 && !presetUsed) {
          presetUsed = true;
          await dispatchPoints(page, preset);
        } else if (options.interactiveClicks && !prompted.has(marker)) {
          prompted.add(marker);
          captchaPrompts += 1;
          if (captchaPrompts > 6) {
            throw new Error("GeeTest was not solved. The session is saved; run snowball login --captcha-click x,y");
          }
          const line = await readPromptLine(CAPTCHA_CLICK_PROMPT);
          if (line === null) {
            console.log("  stdin closed. Finish GeeTest with: snowball login --captcha-click x,y");
            return "captcha-pending";
          }
          let points;
          try {
            points = parseCaptchaClicks(line);
          } catch (error) {
            prompted.delete(marker);
            console.error(`  ${error?.message || "Could not read the click coordinates"}`);
            continue;
          }
          await dispatchPoints(page, points);
          const until = Date.now() + 3000;
          while (Date.now() < until) {
            const after = await traffic.drain();
            if (after.send?.ok) {
              await persist("sent", after);
              return "sent";
            }
            if (after.send && !after.send.ok)
              throw new Error(after.send.message);
            await sleep2(200);
          }
          const still = await evalValue(page, "window.__snowballSms.geetest()");
          if (still.open)
            prompted.delete(still.marker || marker);
        }
      }
      const toast = await evalValue(page, "window.__snowballSms.toast()");
      if (toast && !panel.open)
        throw new Error(toast);
      if (!sawPanel && Date.now() >= firstSlice) {
        const late = await traffic.drain();
        if (late.send?.ok) {
          await persist("sent", late);
          return "sent";
        }
        if (late.send && !late.send.ok)
          throw new Error(late.send.message);
        const latePanel = await evalValue(page, "window.__snowballSms.geetest()");
        if (!latePanel.open) {
          throw new Error("\u53D1\u9001\u9A8C\u8BC1\u7801 did not reach Xueqiu, and no GeeTest challenge appeared");
        }
      }
      await sleep2(300);
    }
    throw new Error(sawPanel ? "Timed out waiting for the GeeTest challenge before the SMS could be sent" : "Timed out waiting for Xueqiu to send the SMS");
  } finally {
    release();
  }
}
function cookieFromPayload(data) {
  if (!data || typeof data !== "object")
    return "";
  const record = data;
  if (typeof record.cookie === "string")
    return record.cookie;
  const pairs = [];
  for (const key of ["xq_is_login", "xq_a_token", "u", "xq_id_token"]) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number")
      pairs.push(`${key}=${value}`);
  }
  return pairs.join("; ");
}
function absorbLoginPayload(cookie, body, secret) {
  if (hasLoginCookie(cookie))
    return cookie;
  if (!body || typeof body !== "object" || !secret)
    return cookie;
  const data = body.data;
  if (typeof data !== "string" || !data)
    return cookie;
  try {
    const decoded = JSON.parse(decryptXueqiu(data, secret));
    return mergeCookies(cookie, cookieFromPayload(decoded));
  } catch {
    return cookie;
  }
}
async function postOnce(session, code, isRegister, fetchImpl, preferred) {
  const hex = encryptXueqiu(JSON.stringify(buildLoginPlain(session, code, isRegister)));
  const bodies = loginRequestBodies(hex);
  let cookie = session.cookie;
  let last = { kind: "transport" };
  for (let offset = 0;offset < bodies.length; offset++) {
    const index = (preferred.index + offset) % bodies.length;
    const spec = bodies[index];
    let posted;
    try {
      posted = await fetchImpl(LOGIN_URL, cookie, {
        method: "POST",
        headers: { "Content-Type": spec.contentType },
        body: spec.body
      });
    } catch (error) {
      throw new Error(error?.message || "Xueqiu login request failed");
    }
    cookie = posted.cookie;
    const raw = await posted.response.text();
    let json = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      json = null;
    }
    const outcome = classifyLoginBody(json);
    if (!outcome) {
      last = { kind: "transport" };
      continue;
    }
    if (outcome.kind === "reject" && looksLikeBodyMismatch(outcome.message)) {
      last = { kind: "reject", message: outcome.message };
      continue;
    }
    preferred.index = index;
    if (outcome.kind === "ok") {
      const next = absorbLoginPayload(cookie, json, session.deviceSecret);
      if (!hasLoginCookie(next)) {
        return { kind: "needs-browser", message: "Xueqiu accepted the login response but did not set xq_is_login" };
      }
      return { kind: "ok", cookie: next };
    }
    if (outcome.kind === "register")
      return { kind: "register", cookie };
    if (outcome.kind === "image-captcha")
      return { kind: "image-captcha", message: outcome.message };
    return { kind: "reject", message: outcome.message };
  }
  return last.kind === "reject" ? last : { kind: "transport" };
}
async function submitSmsLogin(session, code, fetchImpl = fetchXueqiu) {
  const preferred = { index: 0 };
  const first = await postOnce(session, code, false, fetchImpl, preferred);
  if (first.kind !== "register")
    return first;
  const second = await postOnce({ ...session, cookie: first.cookie }, code, true, fetchImpl, preferred);
  if (second.kind === "register") {
    return { kind: "error", message: "Xueqiu still returned 20099 after registering" };
  }
  return second;
}
function assertSendable(session) {
  if (!session.deviceSecret || !session.deviceId) {
    throw new Error("The SMS session is missing Xueqiu device info. Run snowball login --phone again.");
  }
}
function assertFresh(session, dataDir) {
  if (Date.now() - session.createdAt >= SMS_SESSION_TTL_MS) {
    clearSmsSession(dataDir);
    throw new Error(sessionProblemMessage("expired"));
  }
}
async function settleLogin(session, code, dataDir, fetchImpl) {
  assertFresh(session, dataDir);
  assertSendable(session);
  const outcome = await submitSmsLogin(session, code, fetchImpl);
  if (outcome.kind === "ok") {
    clearSmsSession(dataDir);
    return { status: "logged-in", cookie: outcome.cookie };
  }
  if (outcome.kind === "needs-browser" || outcome.kind === "error") {
    console.log(`SMS_ERROR=${safeServerMessage(outcome.message)}`);
    return { status: "rejected", reason: "incomplete" };
  }
  if (outcome.kind === "transport") {
    throw new Error("Xueqiu rejected the login request. The SMS session is still saved.");
  }
  console.log("SMS_CODE_REJECTED=1");
  console.log(`SMS_ERROR=${safeServerMessage(outcome.message)}`);
  return { status: "rejected", reason: "code" };
}
async function promptForCode(session, dataDir, secrets) {
  let attempts = 0;
  while (attempts < SMS_CODE_ATTEMPTS) {
    const line = await readPromptLine(SMS_CODE_PROMPT);
    if (line === null) {
      console.log("  stdin closed. Finish with: snowball login --sms-code <code>");
      return { status: "pending" };
    }
    let code;
    try {
      code = normalizeSmsCode(line);
    } catch (error) {
      console.error(`  ${error?.message || "SMS code must be 4 to 8 digits"}`);
      continue;
    }
    secrets.push(code);
    attempts += 1;
    let settled;
    try {
      settled = await settleLogin(session, code, dataDir, fetchXueqiu);
    } catch (error) {
      throw new Error(scrubSecrets(error?.message || "SMS login failed", secrets));
    }
    if (settled.status !== "rejected" || settled.reason !== "code")
      return settled;
    if (attempts >= SMS_CODE_ATTEMPTS) {
      console.error(`  The code was rejected ${SMS_CODE_ATTEMPTS} times. The session is still saved; run snowball login --sms-code <code> within 10 minutes.`);
      return settled;
    }
  }
  return { status: "rejected", reason: "code" };
}
function scrubbed(secrets, fn) {
  return fn().catch((error) => {
    throw new Error(scrubSecrets(error?.message || "SMS login failed", secrets));
  });
}
async function runPhoneLogin(cdpUrl, options) {
  const secrets = [options.phone];
  return scrubbed(secrets, async () => {
    const driven = await driveUntilSmsSent({
      cdpUrl,
      phone: options.phone,
      areaCode: options.areaCode,
      timeoutMs: options.timeoutMs,
      dataDir: options.dataDir,
      chromePath: options.chromePath,
      interactiveClicks: options.interactive
    });
    if (driven === "captcha-pending")
      return { status: "pending" };
    const loaded = loadSmsSession(options.dataDir);
    if (!loaded.ok || loaded.session.phase !== "sent") {
      throw new Error("The SMS was sent but the session file could not be read.");
    }
    console.log("SMS_SENT=1");
    console.log(`  SMS sent to ${phoneLogLabel(options.areaCode, options.phone)}.`);
    if (!options.interactive) {
      console.log("  Session saved. Finish with: snowball login --sms-code <code>");
      return { status: "pending" };
    }
    return promptForCode(loaded.session, options.dataDir, secrets);
  });
}
async function runCaptchaClick(cdpUrl, options) {
  const points = parseCaptchaClicks(options.spec);
  const loaded = loadSmsSession(options.dataDir);
  if (!loaded.ok)
    throw new Error(sessionProblemMessage(loaded.reason));
  if (loaded.session.phase === "sent") {
    throw new Error("The SMS was already sent. Run snowball login --sms-code <code>.");
  }
  const session = loaded.session;
  const secrets = [session.phone];
  return scrubbed(secrets, async () => {
    const driven = await driveUntilSmsSent({
      cdpUrl,
      phone: session.phone,
      areaCode: session.areaCode,
      timeoutMs: options.timeoutMs,
      dataDir: options.dataDir,
      chromePath: options.chromePath,
      interactiveClicks: false,
      presetClicks: points
    });
    if (driven === "captcha-pending") {
      throw new Error("GeeTest is still required. Run snowball login --captcha-click with coordinates from the new PNG.");
    }
    const sent = loadSmsSession(options.dataDir);
    if (!sent.ok || sent.session.phase !== "sent") {
      throw new Error("The SMS was sent but the session file could not be read.");
    }
    console.log("SMS_SENT=1");
    console.log(`  SMS sent to ${phoneLogLabel(sent.session.areaCode, sent.session.phone)}.`);
    console.log("  Session saved. Finish with: snowball login --sms-code <code>");
    return { status: "pending" };
  });
}
async function completeSavedLogin(dataDir, rawCode, fetchImpl = fetchXueqiu) {
  const code = normalizeSmsCode(rawCode);
  const loaded = loadSmsSession(dataDir);
  if (!loaded.ok)
    throw new Error(sessionProblemMessage(loaded.reason));
  if (loaded.session.phase !== "sent")
    throw new Error(captchaPhaseMessage());
  const secrets = [loaded.session.phone, code];
  try {
    return await settleLogin(loaded.session, code, dataDir, fetchImpl);
  } catch (error) {
    throw new Error(scrubSecrets(error?.message || "SMS login failed", secrets));
  }
}

// lib/api.ts
init_auth();
var STOCK_URL = "https://stock.xueqiu.com";
var XUEQIU_URL = "https://www.xueqiu.com";
var DANJUAN_URL = "https://danjuanapp.com";
var HEADERS2 = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  Origin: XUEQIU_URL,
  Referer: `${XUEQIU_URL}/`,
  "X-Requested-With": "XMLHttpRequest"
};
function parseApiBody(text, path) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Xueqiu returned a non-JSON response for ${path}`);
  }
  if (data == null || typeof data !== "object") {
    throw new Error(`Xueqiu returned a non-JSON response for ${path}`);
  }
  const record = data;
  if (record.error_code) {
    const description = record.error_description ? `: ${record.error_description}` : "";
    throw new Error(`API error ${record.error_code}${description}`);
  }
  return data;
}
function requireData(body, path, field) {
  if (body == null || typeof body !== "object" || body.data == null) {
    throw new Error(`Xueqiu response for ${path} had no data`);
  }
  if (field === undefined)
    return body.data;
  if (body.data[field] == null) {
    throw new Error(`Xueqiu response for ${path} had no data`);
  }
  return body.data[field];
}
async function readResponse(res, path) {
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    throw new Error(`Xueqiu redirected ${path} (${res.status}${location ? ` to ${location}` : ""}). Refusing to follow because fetch drops Cookie on redirect.`);
  }
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.replace(/\s+/g, " ").slice(0, 180)}`);
  }
  return parseApiBody(text, path);
}
function withParams(path, params, base) {
  const url = new URL(path, base);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}
async function request(path, params = {}, base = STOCK_URL) {
  const cookie = getCookie();
  const res = await fetch(withParams(path, params, base), {
    headers: { ...HEADERS2, Cookie: cookie },
    redirect: "manual"
  });
  return readResponse(res, path);
}
async function requestData(path, params = {}, base = STOCK_URL, field) {
  return requireData(await request(path, params, base), path, field);
}
async function requestPublic(path, params = {}, base = STOCK_URL) {
  const res = await fetch(withParams(path, params, base), {
    headers: { ...HEADERS2 },
    redirect: "manual"
  });
  return readResponse(res, path);
}
async function requestPublicData(path, params = {}, base = STOCK_URL, field) {
  return requireData(await requestPublic(path, params, base), path, field);
}
async function quote(symbols) {
  const sym = Array.isArray(symbols) ? symbols.join(",") : symbols;
  return requestPublicData("/v5/stock/realtime/quotec.json", { symbol: sym });
}
async function quoteDetail(symbol) {
  return requestData("/v5/stock/quote.json", { symbol, extend: "detail" }, STOCK_URL, "quote");
}
async function pankou(symbol) {
  return requestData("/v5/stock/realtime/pankou.json", { symbol });
}
async function minute(symbol) {
  return requestData("/v5/stock/chart/minute.json", { symbol, period: "1d" });
}
async function kline(symbol, period = "day", count = 120, type = "before") {
  return requestData("/v5/stock/chart/kline.json", {
    symbol,
    period,
    type,
    begin: Date.now(),
    count: -count,
    indicator: "kline,pe,pb,ps,pcf,market_capital"
  });
}
function detectRegion(symbol) {
  if (symbol.startsWith("SH") || symbol.startsWith("SZ"))
    return "cn";
  if (/^\d{5}$/.test(symbol))
    return "hk";
  return "us";
}
async function income(symbol, type = "all", count = 5) {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/finance/${region}/income.json`, {
    symbol,
    type,
    is_detail: "true",
    count
  }, STOCK_URL, "list");
}
async function balance(symbol, type = "all", count = 5) {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/finance/${region}/balance.json`, {
    symbol,
    type,
    is_detail: "true",
    count
  }, STOCK_URL, "list");
}
async function cashflow(symbol, type = "all", count = 5) {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/finance/${region}/cash_flow.json`, {
    symbol,
    type,
    is_detail: "true",
    count
  }, STOCK_URL, "list");
}
async function indicator(symbol, type = "all", count = 5) {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/finance/${region}/indicator.json`, {
    symbol,
    type,
    is_detail: "true",
    count
  }, STOCK_URL, "list");
}
async function business(symbol) {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/finance/${region}/business.json`, {
    symbol,
    is_detail: "true",
    count: 5
  }, STOCK_URL, "list");
}
async function capitalFlow(symbol) {
  return requestData("/v5/stock/capital/flow.json", { symbol });
}
async function capitalHistory(symbol, count = 20) {
  return requestData("/v5/stock/capital/history.json", { symbol, count });
}
async function capitalAssort(symbol) {
  return requestData("/v5/stock/capital/assort.json", { symbol });
}
async function margin(symbol, page = 1, size = 20) {
  return requestData("/v5/stock/capital/margin.json", { symbol, page, size });
}
async function blockTrans(symbol, page = 1, size = 20) {
  return requestData("/v5/stock/capital/blocktrans.json", { symbol, page, size });
}
async function company(symbol) {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/f10/${region}/company.json`, { symbol });
}
async function topHolders(symbol, circula = 0) {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/f10/${region}/top_holders.json`, { symbol, circula });
}
async function holders(symbol) {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/f10/${region}/holders.json`, { symbol });
}
async function bonus(symbol, page = 1, size = 20) {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/f10/${region}/bonus.json`, { symbol, page, size });
}
async function industry(symbol) {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/f10/${region}/industry.json`, { symbol });
}
async function orgHolding(symbol) {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/f10/${region}/org_holding/change.json`, { symbol });
}
async function forecast(symbol) {
  return requestData("/stock/report/earningforecast.json", { symbol });
}
async function search(query, count = 10) {
  return requestData("/query/v1/suggest_stock.json", { q: query, count }, XUEQIU_URL);
}
async function hotStocks(type = "cn", size = 10) {
  const typeMap = { global: 10, us: 11, cn: 12, hk: 13 };
  return requestData("/v5/stock/hot_stock/list.json", {
    type: typeMap[type],
    size
  });
}
async function indices() {
  return quote([
    "SH000001",
    "SZ399001",
    "SZ399006",
    "SH000300",
    "SH000016",
    "SH000905"
  ]);
}
async function feed(category = "headlines", count = 20) {
  const catMap = {
    headlines: -1,
    today: 0,
    "a-shares": 105,
    us: 101,
    hk: 102,
    funds: 104,
    private: 113,
    realestate: 111,
    auto: 114,
    live: 6
  };
  const catId = catMap[category] ?? -1;
  const data = await request("/v4/statuses/public_timeline_by_category.json", {
    since_id: -1,
    max_id: -1,
    category: catId,
    count
  }, XUEQIU_URL);
  const list = data.list || [];
  return list.map((item) => {
    try {
      return formatPost(JSON.parse(item.data));
    } catch {
      return item;
    }
  });
}
function formatPost(post) {
  return {
    id: post.id,
    title: post.title,
    description: (post.description || post.text || "").replace(/<[^>]+>/g, "").slice(0, 200),
    author: post.user?.screen_name,
    author_id: post.user?.id,
    author_followers: post.user?.followers_count,
    view_count: post.view_count,
    reply_count: post.reply_count,
    like_count: post.like_count ?? post.fav_count,
    retweet_count: post.retweet_count,
    created_at: post.created_at,
    url: post.target ? `${XUEQIU_URL}${post.target}` : null
  };
}
async function hotPosts(scope = "day", count = 10, page = 1) {
  const data = await request("/statuses/hots.json", {
    a: "1",
    count,
    page,
    scope,
    type: "status",
    meigu: "0"
  }, XUEQIU_URL);
  return (Array.isArray(data) ? data : []).map(formatPost);
}
async function liveNews(count = 20) {
  const data = await request("/statuses/livenews/list.json", {
    since_id: -1,
    max_id: -1,
    count
  }, XUEQIU_URL);
  return (data.items || []).map((item) => ({
    id: item.id,
    text: item.text,
    created_at: item.created_at,
    url: item.target,
    mark: item.mark,
    view_count: item.view_count,
    reply_count: item.reply_count
  }));
}
async function stockKOLs(symbol, count = 10) {
  const data = await request("/recommend/user/stock_hot_user.json", {
    symbol,
    start: 0,
    count
  }, XUEQIU_URL);
  return (Array.isArray(data) ? data : []).map((u) => ({
    id: u.id,
    screen_name: u.screen_name,
    description: u.description,
    followers_count: u.followers_count,
    friends_count: u.friends_count,
    status_count: u.status_count,
    gender: u.gender,
    province: u.province,
    city: u.city,
    verified: u.verified,
    verified_description: u.verified_description,
    url: `${XUEQIU_URL}/u/${u.id}`
  }));
}
async function userPosts(userId, count = 10, page = 1) {
  const data = await request("/statuses/user_timeline.json", {
    user_id: userId,
    page,
    count
  }, XUEQIU_URL);
  return (data.statuses || []).map(formatPost);
}
async function userProfile(userId) {
  const data = await request("/user/show.json", { id: userId }, XUEQIU_URL);
  return data;
}
async function searchUsers(query, count = 10, page = 1) {
  const data = await request("/users/search.json", { q: query, count, page }, XUEQIU_URL);
  return data.users ?? data;
}
async function liveNewsImportant(count = 20) {
  const data = await request("/statuses/livenews/mark/list.json", {
    since_id: -1,
    max_id: -1,
    size: count
  }, XUEQIU_URL);
  return (data.items || []).map((item) => ({
    id: item.id,
    text: item.text,
    created_at: item.created_at,
    url: item.target,
    mark: item.mark,
    view_count: item.view_count,
    reply_count: item.reply_count
  }));
}
async function postDetail(postId) {
  const data = await request("/statuses/show.json", { id: postId }, XUEQIU_URL);
  return data;
}
async function screen(market = "SH", orderby = "symbol", page = 1, size = 30) {
  return requestData("/stock/screener/screen.json", {
    category: market,
    orderby,
    order: "desc",
    page,
    size,
    current: "ALL",
    pct: "ALL"
  }, XUEQIU_URL);
}
async function fund(code) {
  return requestPublicData(`/djapi/fund/detail/${code}`, {}, DANJUAN_URL);
}
async function fundNav(code, page = 1, size = 30) {
  return requestPublicData(`/djapi/fund/nav/history/${code}`, { page, size }, DANJUAN_URL);
}
async function fundGrowth(code, period = "ty") {
  return requestPublicData(`/djapi/fund/growth/${code}`, { day: period }, DANJUAN_URL);
}

// index.ts
var __dirname2 = dirname3(fileURLToPath(import.meta.url));
var CDP_URL = process.argv.find((_, i, a) => a[i - 1] === "--cdp") ?? "http://127.0.0.1:9222";
var MODE = process.argv[2];
var VERSION = "0.3.2";
function showLogo() {
  for (const base of [__dirname2, join4(__dirname2, "..")]) {
    try {
      console.log(readFileSync3(join4(base, "lib", "logo.ansi"), "utf-8"));
      return;
    } catch {}
  }
}
function out(data) {
  console.log(JSON.stringify(data, null, 2));
}
function arg(n) {
  return process.argv[n + 2];
}
function flag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : undefined;
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}
function requireArg(n, usage) {
  const v = arg(n);
  if (!v || v.startsWith("-")) {
    console.error(`
  ${usage}
`);
    process.exit(1);
  }
  return v;
}
function count(def = 10) {
  return parseInt(flag("count") ?? String(def));
}
function symbols() {
  return process.argv.slice(4).filter((a) => !a.startsWith("-"));
}
async function readConfirmedLogin(cdpUrl) {
  const cookie = await getWafCookies(cdpUrl);
  if (!hasLoginCookie(cookie)) {
    throw new Error("missing xq_is_login");
  }
  return cookie;
}
async function waitForManualLogin(cdpUrl, timeoutMs) {
  if (process.stdin.isTTY) {
    console.log("  Please login in the Chrome window:");
    console.log(`    1. Click \u767B\u5F55 \u2192 2. Scan QR \u2192 3. Press ENTER
`);
    process.stdout.write("  Press ENTER > ");
    for await (const _ of console)
      break;
    try {
      return await readConfirmedLogin(cdpUrl);
    } catch {
      throw new Error("Chrome does not have a Xueqiu login yet (missing xq_is_login). " + "Confirm in the app, then press ENTER again.");
    }
  }
  console.log("  stdin is not a TTY, so there is no ENTER prompt.");
  console.log(`  Waiting until the Xueqiu login cookie appears in Chrome (${Math.round(timeoutMs / 1000)}s)...
`);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      return await readConfirmedLogin(cdpUrl);
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timed out waiting for Xueqiu login (stdin is not a TTY).");
}
function loginHelpText() {
  return `
  snowball login \u2014 Xueqiu login

  snowball login
  snowball login --qr-png <file.png> [--timeout 600]
  snowball login --manual [--timeout 600]
  snowball login --phone <number> [--area-code 86] [--no-wait] [--timeout 600]
  snowball login --sms-code <code>
  snowball login --captcha-click <x,y[;x,y]>

  --phone sends an SMS, then prompts \u8BF7\u8F93\u5165\u77ED\u4FE1\u9A8C\u8BC1\u7801:.
  A wrong code prompts again and does not send another SMS.
  GeeTest saves a PNG and prompts \u8BF7\u8F93\u5165\u70B9\u51FB\u5750\u6807 (x,y;x,y): while the widget is open.

  With no TTY, or with --no-wait, the command saves ~/.snowball-cli/sms-login/session.json
  (directory 0700, file 0600), prints SMS_SENT=1 or CAPTCHA_REQUIRED=<png>, and exits.
  snowball login --sms-code <code> finishes that saved session.
  If this process is killed after the SMS was sent, --sms-code still works.
  The session expires after 10 minutes. A wrong code leaves it in place.

  --help prints this text and does not start Chrome.
`.replace(/^\n/, "");
}
async function finishSms(result) {
  if (result.status === "logged-in") {
    saveToken({ cookie: result.cookie, extractedAt: new Date().toISOString(), source: "chrome-sms" });
    console.log("LOGIN_OK=1");
    console.log(`
  \u2713 Login successful! Token saved.
`);
    console.log(`  Try: snowball quote SH600519
`);
    return 0;
  }
  return result.status === "rejected" ? 1 : 0;
}
var commands = {
  Auth: {
    login: {
      usage: "login [--phone <n>] [--sms-code <c>] [--qr-png <path>] [--timeout <sec>]",
      desc: "QR login, or phone + SMS (prompts, or --no-wait)",
      run: async () => {
        if (process.argv.includes("--help") || process.argv.includes("-h")) {
          console.log(loginHelpText());
          return;
        }
        const qrPng = flag("qr-png");
        const phoneRaw = flag("phone");
        const smsCode = flag("sms-code");
        const captchaClick = flag("captcha-click");
        const areaRaw = flag("area-code");
        if (hasFlag("qr-png") && (!qrPng || qrPng.startsWith("-"))) {
          console.error(`
  Usage: snowball login --qr-png <path.png>
`);
          process.exit(1);
        }
        if (hasFlag("phone") && (!phoneRaw || phoneRaw.startsWith("-"))) {
          console.error(`
  Usage: snowball login --phone <number> [--area-code 86]
`);
          process.exit(1);
        }
        if (hasFlag("sms-code") && (!smsCode || smsCode.startsWith("-"))) {
          console.error(`
  Usage: snowball login --sms-code <code>
`);
          process.exit(1);
        }
        if (hasFlag("captcha-click") && (!captchaClick || captchaClick.startsWith("-"))) {
          console.error(`
  Usage: snowball login --captcha-click <x,y>
`);
          process.exit(1);
        }
        if (hasFlag("area-code") && (!areaRaw || areaRaw.startsWith("-"))) {
          console.error(`
  Usage: snowball login --area-code <code>   (default 86)
`);
          process.exit(1);
        }
        if ((smsCode || captchaClick) && (phoneRaw || hasFlag("manual") || qrPng)) {
          console.error(`
  Run --sms-code and --captcha-click in their own snowball login command.
`);
          process.exit(1);
        }
        if (smsCode && captchaClick) {
          console.error(`
  Pass --sms-code and --captcha-click as separate commands.
`);
          process.exit(1);
        }
        const timeoutRaw = flag("timeout");
        if (hasFlag("timeout") && (!timeoutRaw || timeoutRaw.startsWith("-"))) {
          console.error(`
  Usage: snowball login --timeout <seconds>   (default 600)
`);
          process.exit(1);
        }
        let timeoutMs;
        try {
          timeoutMs = parseLoginTimeoutMs(timeoutRaw);
        } catch (e) {
          console.error(`
  ${e.message}
`);
          process.exit(1);
        }
        let phone;
        let areaCode;
        if (phoneRaw) {
          if (hasFlag("manual") || qrPng) {
            throw new Error("--phone cannot be combined with --manual or --qr-png");
          }
          areaCode = normalizeAreaCode(areaRaw);
          phone = normalizePhone(phoneRaw, areaCode);
        }
        const chromePath = flag("chrome") ?? process.env.CHROME_PATH;
        let sms = false;
        let exitCode = 0;
        try {
          if (smsCode || captchaClick || phone) {
            sms = true;
            armSmsProcessCleanup();
          }
          if (smsCode) {
            exitCode = await finishSms(await completeSavedLogin(DATA_DIR, smsCode));
          } else if (captchaClick) {
            exitCode = await finishSms(await runCaptchaClick(CDP_URL, {
              spec: captchaClick,
              timeoutMs,
              dataDir: DATA_DIR,
              chromePath
            }));
          } else if (phone && areaCode) {
            showLogo();
            console.log(`  Snowball CLI \u2014 Login
`);
            exitCode = await finishSms(await runPhoneLogin(CDP_URL, {
              phone,
              areaCode,
              timeoutMs,
              dataDir: DATA_DIR,
              interactive: shouldPromptForSms(process.stdin.isTTY, hasFlag("no-wait")),
              chromePath
            }));
          } else {
            showLogo();
            console.log(`  Snowball CLI \u2014 Login
`);
            await ensureChrome(CDP_URL, chromePath);
            console.log(`  Opening xueqiu.com...
`);
            await openXueqiuTab(CDP_URL);
            if (hasFlag("manual")) {
              const cookie = await waitForManualLogin(CDP_URL, timeoutMs);
              saveToken({ cookie, extractedAt: new Date().toISOString(), source: "chrome" });
            } else {
              try {
                const { cookie } = await qrLogin(CDP_URL, { qrPngPath: qrPng, timeoutMs });
                saveToken({ cookie, extractedAt: new Date().toISOString(), source: "chrome-qr" });
              } catch (e) {
                if (qrPng || !process.stdin.isTTY) {
                  throw new Error(`QR failed: ${e.message}`);
                }
                console.error(`
  QR failed: ${e.message}
  Falling back to manual...
`);
                const cookie = await waitForManualLogin(CDP_URL, timeoutMs);
                saveToken({ cookie, extractedAt: new Date().toISOString(), source: "chrome" });
              }
            }
            console.log(`
  \u2713 Login successful! Token saved.
`);
            console.log(`  Try: snowball quote SH600519
`);
          }
        } finally {
          if (sms)
            stopSnowballChrome();
          stopStartedXvfb();
        }
        if (exitCode !== 0)
          process.exit(exitCode);
      }
    },
    token: {
      usage: "token <cookie-string>",
      desc: "Set token manually (from browser DevTools)",
      run: async () => {
        const cookie = requireArg(1, 'Usage: snowball token "xq_a_token=xxx; u=xxx"');
        if (!cookie.includes("xq_a_token")) {
          console.error(`
  Cookie must include xq_a_token.
`);
          process.exit(1);
        }
        saveToken({ cookie, extractedAt: new Date().toISOString(), source: "manual" });
        console.log(`
  Token saved!
`);
      }
    },
    logout: {
      usage: "logout",
      desc: "Remove saved token",
      run: async () => {
        const { existsSync, unlinkSync } = await import("fs");
        await Promise.resolve().then(() => init_auth());
        if (existsSync(TOKEN_PATH)) {
          unlinkSync(TOKEN_PATH);
          console.log(`
  Token removed.
`);
        } else {
          console.log(`
  Not logged in.
`);
        }
      }
    },
    export: {
      usage: "export",
      desc: "Print token as base64 (for transfer to VPS/headless server)",
      run: async () => {
        const token = loadToken();
        if (!token) {
          console.error(`
  Not logged in. Run: snowball login
`);
          process.exit(1);
        }
        const b64 = Buffer.from(JSON.stringify(token)).toString("base64");
        console.log(b64);
      }
    },
    import: {
      usage: "import <base64>",
      desc: "Import token from base64 (from snowball export)",
      run: async () => {
        const b64 = requireArg(1, `Usage: snowball import <base64-string>
  Get it from: snowball export`);
        try {
          const token = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
          if (!token.cookie?.includes("xq_a_token")) {
            console.error(`
  Invalid token: missing xq_a_token
`);
            process.exit(1);
          }
          saveToken(token);
          console.log(`
  Token imported!
`);
        } catch {
          console.error(`
  Invalid base64 string.
`);
          process.exit(1);
        }
      }
    },
    status: {
      usage: "status",
      desc: "Check login status and verify token",
      run: async () => {
        const token = loadToken();
        if (!token) {
          console.log(`
  Not logged in. Run: snowball login
`);
          return;
        }
        const days = Math.floor((Date.now() - new Date(token.extractedAt).getTime()) / 86400000);
        process.stdout.write(`
  Token: ${token.source}, saved ${days === 0 ? "today" : days + "d ago"}`);
        process.stdout.write(" \u2014 verifying...");
        const { valid } = await verifyToken(token.cookie);
        console.log(valid ? ` \u2713 active
` : ` \u2717 expired
  Run: snowball login
`);
      }
    }
  },
  Market: {
    quote: {
      usage: "quote <symbol> [symbol...] [--detail]",
      desc: "Real-time quote (no login needed)",
      run: async () => {
        const sym = requireArg(1, "Usage: snowball quote SH600519 [SZ000858...]");
        const all = [sym, ...symbols()];
        out(hasFlag("detail") ? await quoteDetail(all[0]) : await quote(all));
      }
    },
    pankou: {
      usage: "pankou <symbol>",
      desc: "Order book / bid-ask levels",
      run: async () => out(await pankou(requireArg(1, "Usage: snowball pankou SH600519")))
    },
    kline: {
      usage: "kline <symbol> [--period day] [--count 120]",
      desc: "K-line / candlestick data",
      run: async () => {
        const sym = requireArg(1, "Usage: snowball kline SH600519 [--period week --count 52]");
        out(await kline(sym, flag("period") ?? "day", count(120)));
      }
    },
    minute: {
      usage: "minute <symbol>",
      desc: "Minute-level chart data",
      run: async () => out(await minute(requireArg(1, "Usage: snowball minute SH600519")))
    },
    market: {
      usage: "market",
      desc: "Major indices overview (no login needed)",
      run: async () => out(await indices())
    }
  },
  Financials: {
    income: {
      usage: "income <symbol> [--count 5]",
      desc: "Income statement",
      run: async () => out(await income(requireArg(1, "Usage: snowball income SH600519"), "all", count(5)))
    },
    balance: {
      usage: "balance <symbol> [--count 5]",
      desc: "Balance sheet",
      run: async () => out(await balance(requireArg(1, "Usage: snowball balance SH600519"), "all", count(5)))
    },
    cashflow: {
      usage: "cashflow <symbol> [--count 5]",
      desc: "Cash flow statement",
      run: async () => out(await cashflow(requireArg(1, "Usage: snowball cashflow SH600519"), "all", count(5)))
    },
    indicator: {
      usage: "indicator <symbol> [--count 5]",
      desc: "Key financial indicators",
      run: async () => out(await indicator(requireArg(1, "Usage: snowball indicator SH600519"), "all", count(5)))
    },
    business: {
      usage: "business <symbol>",
      desc: "Revenue breakdown by segment",
      run: async () => out(await business(requireArg(1, "Usage: snowball business SH600519")))
    },
    forecast: {
      usage: "forecast <symbol>",
      desc: "Earnings forecast",
      run: async () => out(await forecast(requireArg(1, "Usage: snowball forecast SH600519")))
    }
  },
  Company: {
    company: {
      usage: "company <symbol>",
      desc: "Company profile",
      run: async () => out(await company(requireArg(1, "Usage: snowball company SH600519")))
    },
    holders: {
      usage: "holders <symbol> [--top]",
      desc: "Shareholder count history (--top for top 10)",
      run: async () => {
        const sym = requireArg(1, "Usage: snowball holders SH600519 [--top]");
        out(hasFlag("top") ? await topHolders(sym) : await holders(sym));
      }
    },
    bonus: {
      usage: "bonus <symbol>",
      desc: "Dividend & bonus history",
      run: async () => out(await bonus(requireArg(1, "Usage: snowball bonus SH600519")))
    },
    industry: {
      usage: "industry <symbol>",
      desc: "Industry & concept classification",
      run: async () => out(await industry(requireArg(1, "Usage: snowball industry SH600519")))
    },
    org: {
      usage: "org <symbol>",
      desc: "Institutional holding changes",
      run: async () => out(await orgHolding(requireArg(1, "Usage: snowball org SH600519")))
    }
  },
  Capital: {
    flow: {
      usage: "flow <symbol> [--history]",
      desc: "Capital flow (intraday or --history for daily)",
      run: async () => {
        const sym = requireArg(1, "Usage: snowball flow SH600519 [--history]");
        out(hasFlag("history") ? await capitalHistory(sym) : await capitalFlow(sym));
      }
    },
    assort: {
      usage: "assort <symbol>",
      desc: "Capital by order size (large/medium/small)",
      run: async () => out(await capitalAssort(requireArg(1, "Usage: snowball assort SH600519")))
    },
    margin: {
      usage: "margin <symbol> [--count 20]",
      desc: "Margin trading data",
      run: async () => out(await margin(requireArg(1, "Usage: snowball margin SH600519")))
    },
    block: {
      usage: "block <symbol> [--count 20]",
      desc: "Block (large) transactions",
      run: async () => out(await blockTrans(requireArg(1, "Usage: snowball block SH600519")))
    }
  },
  Social: {
    trending: {
      usage: "trending [day|week|month] [--count 10]",
      desc: "Hot posts / KOL articles",
      run: async () => out(await hotPosts(arg(1) ?? "day", count(10)))
    },
    live: {
      usage: "live [--count 20] [--important]",
      desc: "7x24 live news feed",
      run: async () => out(hasFlag("important") ? await liveNewsImportant(count(20)) : await liveNews(count(20)))
    },
    feed: {
      usage: "feed [category] [--count 20]",
      desc: "Feed: headlines|today|a-shares|us|hk|funds|private",
      run: async () => out(await feed(arg(1) ?? "headlines", count(20)))
    },
    hot: {
      usage: "hot [cn|us|hk|global]",
      desc: "Hot stocks by market",
      run: async () => out(await hotStocks(arg(1) ?? "cn"))
    },
    kol: {
      usage: "kol <symbol> [--count 10]",
      desc: "KOLs / influencers for a stock",
      run: async () => out(await stockKOLs(requireArg(1, "Usage: snowball kol SH600519"), count(10)))
    },
    user: {
      usage: "user <user_id> [--count 10]",
      desc: "A user's recent posts",
      run: async () => out(await userPosts(requireArg(1, "Usage: snowball user <user_id>"), count(10)))
    },
    profile: {
      usage: "profile <user_id>",
      desc: "User profile (bio, followers, verified)",
      run: async () => out(await userProfile(requireArg(1, "Usage: snowball profile <user_id>")))
    },
    post: {
      usage: "post <post_id>",
      desc: "Single post detail by ID",
      run: async () => out(await postDetail(requireArg(1, "Usage: snowball post <post_id>")))
    }
  },
  Discovery: {
    search: {
      usage: "search <keyword>",
      desc: "Search stocks by keyword",
      run: async () => out(await search(requireArg(1, "Usage: snowball search \u8305\u53F0")))
    },
    "search-user": {
      usage: "search-user <keyword> [--count 10]",
      desc: "Search users by keyword",
      run: async () => out(await searchUsers(requireArg(1, "Usage: snowball search-user \u4EF7\u6295"), count(10)))
    },
    screen: {
      usage: "screen [SH|HK|US] [--count 30]",
      desc: "Stock screener",
      run: async () => out(await screen(arg(1) ?? "SH", "symbol", 1, count(30)))
    }
  },
  Funds: {
    fund: {
      usage: "fund <code> [--nav] [--growth]",
      desc: "Fund detail, NAV history, or growth",
      run: async () => {
        const code = requireArg(1, "Usage: snowball fund 110011 [--nav] [--growth]");
        out(hasFlag("nav") ? await fundNav(code) : hasFlag("growth") ? await fundGrowth(code) : await fund(code));
      }
    }
  }
};
if (MODE === "--version" || MODE === "-v") {
  console.log(VERSION);
  process.exit(0);
}
for (const group of Object.values(commands)) {
  if (MODE && MODE in group) {
    try {
      await group[MODE].run();
    } catch (e) {
      console.error(`
  Error: ${e.message}
`);
      process.exit(1);
    }
    process.exit(0);
  }
}
showLogo();
console.log(`  Snowball CLI v${VERSION} \u2014 Xueqiu stock data for AI agents
`);
for (const [groupName, cmds] of Object.entries(commands)) {
  console.log(`  ${groupName}:`);
  for (const [, cmd] of Object.entries(cmds)) {
    const usage = `snowball ${cmd.usage}`;
    const pad = Math.max(2, 40 - usage.length);
    console.log(`    ${usage}${" ".repeat(pad)}${cmd.desc}`);
  }
  console.log();
}
console.log(`  Symbols:`);
console.log(`    SH600519  Shanghai (Maotai)      AAPL   US stock`);
console.log(`    SZ000858  Shenzhen (Wuliangye)   01810  HK stock (Xiaomi)
`);
console.log(`  All output is JSON \u2014 pipe to jq or use in agent scripts.
`);
