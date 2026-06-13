const { ipcRenderer } = require('electron');
const { marked } = require('marked');
const hljs = require('highlight.js');
const fs = require('fs');

// 日志转发到主进程（终端可见）
function logToMain(msg) {
  ipcRenderer.send('renderer-log', msg);
}

// GFM Emoji 映射表（常用 emoji）
const EMOJI_MAP = {
  rocket: '\u{1F680}', smile: '\u{1F604}', laugh: '\u{1F606}',
  heart: '\u{2764}\u{FE0F}', thumbsup: '\u{1F44D}', thumbsdown: '\u{1F44E}',
  fire: '\u{1F525}', star: '\u{2B50}', check: '\u{2705}', cross: '\u{274C}',
  warning: '\u{26A0}\u{FE0F}', info: '\u{2139}\u{FE0F}', question: '\u{2753}',
  lightbulb: '\u{1F4A1}', eyes: '\u{1F440}', ok_hand: '\u{1F44C}',
  clap: '\u{1F44F}', wave: '\u{1F44B}', point_up: '\u{261D}\u{FE0F}',
  point_down: '\u{1F447}', point_left: '\u{1F448}', point_right: '\u{1F449}',
  sparkles: '\u{2728}', boom: '\u{1F4A5}', zap: '\u{26A1}',
  gift: '\u{1F381}', party: '\u{1F389}',tada: '\u{1F389}', confetti: '\u{1F38A}',
  coffee: '\u{2615}', beer: '\u{1F37A}', pizza: '\u{1F355}', hamburger: '\u{2B06}',
  cookie: '\u{1F36A}', icecream: '\u{1F366}', cake: '\u{1F382}',
  apple: '\u{1F34E}', cherry: '\u{1F352}', grape: '\u{1F347}',
  cat: '\u{1F431}', dog: '\u{1F436}', mouse: '\u{1F42D}', rabbit: '\u{1F430}',
  panda: '\u{1F43C}', monkey: '\u{1F412}', pig: '\u{1F437}', cow: '\u{1F404}',
  horse: '\u{1F434}', frog: '\u{1F438}', snake: '\u{1F40D}', fish: '\u{1F41F}',
  bird: '\u{1F426}', chicken: '\u{1F414}', penguin: '\u{1F427}', bug: '\u{1F41B}',
  bee: '\u{1F41D}', ant: '\u{1F41C}', snail: '\u{1F40C}', shell: '\u{1F41A}',
  flower: '\u{1F337}', cactus: '\u{1F335}', tree: '\u{1F332}', seedling: '\u{1F33F}',
  sun: '\u{2600}\u{FE0F}', moon: '\u{1F314}', cloud: '\u{2601}\u{FE0F}',
  rainbow: '\u{1F308}', snowflake: '\u{2744}\u{FE0F}', umbrella: '\u{2602}\u{FE0F}',
  phone: '\u{260E}\u{FE0F}', email: '\u{2709}\u{FE0F}', mail: '\u{2709}\u{FE0F}',
  computer: '\u{1F4BB}', keyboard: '\u{2328}\u{FE0F}', mouse2: '\u{1F5B1}',
  camera: '\u{1F4F7}', video_camera: '\u{1F4F9}', tv: '\u{1F4FA}', radio: '\u{1F4FB}',
  clock: '\u{1F550}', hourglass: '\u{231B}\u{FE0F}', stopwatch: '\u{23F1}\u{FE0F}',
  calendar: '\u{1F4C5}', bookmark: '\u{1F516}', tag: '\u{1F3F7}\u{FE0F}',
  pencil: '\u{270F}\u{FE0F}', pen: '\u{1F4DD}', scissors: '\u{2702}\u{FE0F}',
  paperclip: '\u{1F4CE}', lock: '\u{1F512}', key: '\u{1F511}',
  hammer: '\u{1F528}', wrench: '\u{1F527}', gear: '\u{2699}\u{FE0F}',
  magnet: '\u{1F9DC}\u{200D}\u{2642}\u{FE0F}', tool: '\u{1F527}',
  broom: '\u{1F9F9}', nail_care: '\u{1F485}', lipstick: '\u{1F484}',
  crown: '\u{1F451}', ring: '\u{1F48D}', gem: '\u{1F48E}',
  moneybag: '\u{1F4B0}', dollar: '\u{1F4B5}', euro: '\u{1F4B6}', yen: '\u{1F4B4}',
  credit_card: '\u{1F4B3}', receipt: '\u{1F9FE}', ticket: '\u{1F3AB}',
  shopping_cart: '\u{1F6D2}', package: '\u{1F4E6}', box: '\u{1F4E6}',
  house: '\u{1F3E0}', school: '\u{1F3EB}', office: '\u{1F3E2}', hospital: '\u{1F3E5}',
  factory: '\u{1F3ED}', bank: '\u{3F51}', hotel: '\u{1F3E8}', church: '\u{26EA}',
  car: '\u{1F697}', bus: '\u{1F68C}', train: '\u{1F686}', airplane: '\u{2708}\u{FE0F}',
  ship: '\u{26F4}\u{FE0F}', bicycle: '\u{1F6B2}', motorcycle: '\u{1F3CD}',
  helicopter: '\u{1F681}', rocket_ship: '\u{1F680}', satellite: '\u{1F6F0}',
  globe: '\u{1F310}', map: '\u{1F5FA}', compass: '\u{1F9ED}',
  flag: '\u{1F3C1}', pin: '\u{1F4CD}', location: '\u{1F4CC}',
  musical_note: '\u{1F3B5}', notes: '\u{1F3B6}', headphones: '\u{1F3A7}',
  microphone: '\u{1F3A4}', speaker: '\u{1F50A}', sound: '\u{1F50A}',
  book: '\u{1F4D6}', books: '\u{1F4DA}', open_book: '\u{1F4D6}',
  newspaper: '\u{1F4F0}', magazine: '\u{1F4D3}', memo: '\u{1F4DD}',
  art: '\u{1F3A8}', frame: '\u{1F5BC}\u{FE0F}', microscope: '\u{1F52C}',
  telescope: '\u{1F52D}', pill: '\u{1F48A}', syringe: '\u{1F489}',
  DNA: '\u{1F9EC}', atom: '\u{269B}\u{FE0F}', chart: '\u{1F4C8}',
  bar_chart: '\u{1F4CA}', clipboard: '\u{1F4CB}', file_folder: '\u{1F4C1}',
  trash: '\u{1F5D1}\u{FE0F}', recycle: '\u{267B}\u{FE0F}', toilet: '\u{1F6BD}',
  shower: '\u{1F6BF}', bath: '\u{1F6C0}', bed: '\u{1F6CF}\u{FE0F}',
  door: '\u{1F6AA}', window: '\u{1FA9F}', chair: '\u{1F4BA}', couch: '\u{1F6CB}',
  lamp: '\u{1F4A1}', candle: '\u{1F56F}\u{FE0F}', bulb: '\u{1F4A1}',
  battery: '\u{1F506}', plug: '\u{1F50C}', wifi: '\u{1F4F6}',
  bluetooth: '\u{1F499}', usb: '\u{1FAA1}', cd: '\u{1F4BF}', dvd: '\u{1F5FF}',
  floppy_disk: '\u{1F4BE}', hard_disk: '\u{1F4BD}', sd_card: '\u{1F4C3}',
  sim_card: '\u{1F4FE}', chip: '\u{1F9E0}', robot: '\u{1F916}',
  alien: '\u{1F47D}', ghost: '\u{1F47B}', skull: '\u{1F480}', bone: '\u{1F4B0}',
  poop: '\u{1F4A9}', pile_of_poo: '\u{1F4A9}', hankey: '\u{1F4A9}',
  smiley: '\u{1F603}', grin: '\u{1F600}', laughing: '\u{1F606}',
  wink: '\u{1F609}', blush: '\u{1F60A}', heart_eyes: '\u{1F60D}',
  smirk: '\u{1F60F}', neutral_face: '\u{1F610}', expressionless: '\u{1F611}',
  unamused: '\u{1F612}', sweat_smile: '\u{1F605}', cold_sweat: '\u{1F630}',
  joy: '\u{1F602}', sob: '\u{1F622}', angry: '\u{1F620}', rage: '\u{1F621}',
  cry: '\u{1F622}', disappointed: '\u{1F61E}', worried: '\u{1F61F}',
  fearful: '\u{1F628}', weary: '\u{1F62A}', sleepy: '\u{1F62A}',
  tired_face: '\u{1F62B}', grimacing: '\u{1F62C}', frowning: '\u{1F626}',
  persevere: '\u{1F620}', triumphant: '\u{1F624}', pensive: '\u{1F614}',
  relieved: '\u{1F60C}', kiss: '\u{1F618}', tongue: '\u{1F61B}',
  sunglasses: '\u{1F60E}', stuck_out_tongue: '\u{1F61D}',
  stuck_out_tongue_wink: '\u{1F61C}', yum: '\u{1F60B}', mask: '\u{1F637}',
  thermometer: '\u{1F912}', head_bandage: '\u{1F915}', sleeping: '\u{1F634}',
  zzz: '\u{1F4A4}', dizzy: '\u{1F6AB}', speech_balloon: '\u{1F4AC}',
  thought_balloon: '\u{1F4AD}', anger: '\u{1F4A2}', exclamation: '\u{2757}\u{FE0F}',
  heavy_check_mark: '\u{2714}\u{FE0F}', x: '\u{274C}', o: '\u{2B55}',
  plus: '\u{2795}', minus: '\u{2796}', divide: '\u{2797}', multiply: '\u{2716}\u{FE0F}',
  arrow_up: '\u{2B06}\u{FE0F}', arrow_down: '\u{2B07}\u{FE0F}',
  arrow_left: '\u{2B05}\u{FE0F}', arrow_right: '\u{27A1}\u{FE0F}',
  arrow_forward: '\u{25B6}\u{FE0F}', arrow_backward: '\u{25C0}\u{FE0F}',
  arrows_counterclockwise: '\u{1F504}', arrows_clockwise: '\u{1F503}',
  rewind: '\u{23EB}', fast_forward: '\u{23E9}', play_or_pause: '\u{23EF}',
  top: '\u{1F51D}', end: '\u{1F51A}', soon: '\u{1F51C}', on: '\u{1F7E2}',
  off: '\u{1F534}', white_circle: '\u{26AA}\u{FE0F}', black_circle: '\u{26AB}\u{FE0F}',
  red_circle: '\u{1F534}', green_circle: '\u{1F7E2}', blue_circle: '\u{1F535}',
  yellow_circle: '\u{1F7E1}', purple_circle: '\u{1F7E3}', orange_circle: '\u{1F7E0}',
  large_blue_diamond: '\u{1F537}', large_orange_diamond: '\u{1F536}',
  small_red_triangle: '\u{1F53A}', small_red_triangle_down: '\u{1F53B}',
  one: '\u{31}\u{20E3}', two: '\u{32}\u{20E3}', three: '\u{33}\u{20E3}',
  four: '\u{34}\u{20E3}', five: '\u{35}\u{20E3}', six: '\u{36}\u{20E3}',
  seven: '\u{37}\u{20E3}', eight: '\u{38}\u{20E3}', nine: '\u{39}\u{20E3}',
  zero: '\u{30}\u{20E3}', hash: '\u{23}\u{20E3}', asterisk: '\u{2A}\u{20E3}',
  keycap_ten: '\u{1F51F}', abc: '\u{1F520}', abcd: '\u{1F521}',
  accept: '\u{1F251}', secret: '\u{3299}\u{FE0F}', congratulations: '\u{3297}\u{FE0F}',
  new: '\u{1F195}', free: '\u{1F193}', ng: '\u{1F196}', ok: '\u{1F197}',
  sos: '\u{1F198}', up: '\u{1F199}', vs: '\u{1F19A}',
  recycle_symbol: '\u{267B}\u{FE0F}', copyright: '\u{00A9}\u{FE0F}',
  registered: '\u{00AE}\u{FE0F}', tm: '\u{2122}\u{FE0F}',
};

// 将 :emoji_name: 替换为 Unicode 字符
function replaceEmoji(text) {
  return text.replace(/:([a-z][a-z0-9_+-]*?):/g, (match, name) => {
    const lower = name.toLowerCase();
    if (EMOJI_MAP[lower]) return EMOJI_MAP[lower];
    return match; // 未匹配的保留原样
  });
}

// GFM 脚注解析：将 [^n] 引用和 [^n]: 定义转换为 HTML
function renderFootnotes(text) {
  const definitions = {};
  let defIndex = 0;

  // 提取所有脚注定义 [^id]: content（支持多行，缩进续行）
  const cleaned = text.replace(
    /^\[\^(\w+)\]:\s*((?:[^\n]*(?:\n\s{2,}[^\n]*)*)?)/gm,
    (_, id, content) => {
      definitions[id] = { index: ++defIndex, content: content.trim() };
      return '';
    }
  );

  // 将引用 [^id] 替换为上标链接
  const body = cleaned.replace(/\[\^(\w+)\]/g, (_, id) => {
    if (!definitions[id]) return '[^' + id + ']';
    return '<sup class="footnote-ref"><a href="#fn-' + id + '" id="fnref-' + id + '">[' + definitions[id].index + ']</a></sup>';
  });

  // 如果没有定义则直接返回
  if (Object.keys(definitions).length === 0) return text;

  // 构建脚注区域 HTML
  let fnHTML = '\n\n<hr class="footnotes-sep">\n<section class="footnotes">\n<ol class="footnotes-list">\n';
  Object.keys(definitions).forEach((id) => {
    const d = definitions[id];
    fnHTML += '<li class="footnote-item" id="fn-' + id + '">';
    fnHTML += marked(d.content);
    fnHTML += ' <a href="#fnref-' + id + '" class="footnote-backref">↩</a>';
    fnHTML += '</li>\n';
  });
  fnHTML += '</ol>\n</section>';

  return body + fnHTML;
}

// Toast 提示框
const TOAST_ICONS = {
  error: '\u274C',
  success: '\u2705',
  info: '\u2139\uFE0F',
  warning: '\u26A0\uFE0F'
};

let toastCounter = 0;

function showToast(message, type = 'error', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) { alert(message); return; }

  toastCounter++;
  const id = 'toast-' + toastCounter;
  const icon = TOAST_ICONS[type] || TOAST_ICONS.error;

  const el = document.createElement('div');
  el.id = id;
  el.className = 'toast toast-' + type;
  el.innerHTML =
    '<span class="toast-icon">' + icon + '</span>' +
    '<span>' + message + '</span>' +
    '<span class="toast-close" onclick="document.getElementById(\'' + id + '\').remove()">&times;</span>';

  container.appendChild(el);

  setTimeout(() => {
    if (!el.parentNode) return;
    el.style.animation = 'toast-out 0.25s ease-in forwards';
    setTimeout(() => el.remove(), 250);
  }, duration);
}
let initialArgFromMain = null;
// 从主进程获取首次传入的文件路径（如果有）作为回退解析基准
ipcRenderer.invoke('get-initial-arg').then((p) => {
  if (p) initialArgFromMain = p;
}).catch(() => {});
const path = require('path');
const { pathToFileURL } = require('url');

marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (__) {}
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true,
});

// 显式启用 GFM 任务列表
marked.use({ gfm: { tasklists: true } });

// 扩展 marked：支持 ==高亮== (mark) 语法
const originalText = marked.Renderer.prototype.text;
marked.use({
  extensions: [{
    name: 'mark',
    level: 'inline',
    start(src) { return src.indexOf('=='); },
    tokenizer(src) {
      const rule = /^==([^=]+?)==/;
      const match = rule.exec(src);
      if (match) {
        return {
          type: 'mark',
          raw: match[0],
          text: match[1].trim(),
        };
      }
    },
    renderer(token) {
      return '<mark>' + token.text + '</mark>';
    }
  }]
});

// 自定义 image 渲染：将相对路径解析为基于当前打开文件的 file:// URL
const renderer = new marked.Renderer();
const originalImage = renderer.image;
renderer.image = function(href, title, text) {
  try {
    if (href) {
      // 排除已是协议的 URL (http, https, data, file)
      if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) {
        // 仅基于打开的 Markdown 文件解析相对路径
        // 如果找不到基准（currentFilePath/initialArgFromMain），保留原 href
        const base = currentFilePath || initialArgFromMain || null;
        if (base) {
          const resolved = path.resolve(path.dirname(base), href);
          const exists = fs.existsSync(resolved);
          ipcRenderer.send('renderer-log', `resolve image: ${href} -> ${resolved} exists=${exists} base=${base}`);
          href = pathToFileURL(resolved).href;
        } else {
          ipcRenderer.send('renderer-log', `no base to resolve image, keeping href as-is: ${href}`);
        }
      }
    }
  } catch (e) {
    // ignore and fall back to original href
  }
  // 使用 marked 默认 image 渲染逻辑，但传入已转换的 href
  return originalImage.call(this, href, title, text);
};

// 将自定义 renderer 应用到 marked
marked.use({ renderer });

// 监听图片加载结果，帮助调试哪些 src 失败
function attachImageDiagnostics() {
  document.querySelectorAll('#preview img').forEach((img) => {
    ipcRenderer.send('renderer-log', `preview img element src=${img.src}`);
    img.addEventListener('load', () => {
      ipcRenderer.send('renderer-log', `img loaded: ${img.src} (w=${img.naturalWidth} h=${img.naturalHeight})`);
    });
    img.addEventListener('error', () => {
      ipcRenderer.send('renderer-log', `img ERROR: ${img.src}`);
    });
  });
}

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const editorPanel = document.getElementById('editor-panel');
const previewPanel = document.getElementById('preview-panel');

let currentFilePath = null;
let currentFileEncoding = 'utf-8'; // 当前文件编码
let currentLineEnding = 'lf';      // 当前换行符: lf | crlf
let replaceExistingLineEndings = true; // 切换换行符时是否替换现有内容
const ENCODINGS = ['utf-8', 'ansi', 'gbk', 'gb2312', 'big5', 'shift_jis', 'euc_kr', 'iso-8859-1', 'utf-16le', 'utf-16be'];
const ENCODING_LABELS = {
  'utf-8': 'UTF-8', 'ansi': 'ANSI (GBK)', 'gbk': 'GBK', 'gb2312': 'GB2312', 'big5': 'Big5',
  'shift_jis': 'Shift-JIS', 'euc_kr': 'EUC-KR', 'iso-8859-1': 'ISO-8859-1',
  'utf-16le': 'UTF-16 LE', 'utf-16be': 'UTF-16 BE'
};
// ANSI 在 Windows 上映射为 gbk（iconv-lite 实际使用的编码名）
const ENCODING_ICONV_MAP = { 'ansi': 'gbk' };
const LINE_ENDING_LABELS = { 'lf': 'LF', 'crlf': 'CRLF' };
const LINE_ENDING_CHARS = { 'lf': '\n', 'crlf': '\r\n' };
let isMarkdownFile = true; // 当前打开的文件是否为 Markdown 文件
let isHtmlFile = false;    // 当前打开的文件是否为 HTML 文件
const MARKDOWN_EXTS = ['.md', '.markdown', '.mkd', '.mdown'];
const HTML_EXTS = ['.html', '.htm', '.xhtml'];

// 检测文件类型
function getFileType(filePath) {
  if (!filePath) return 'markdown'; // 新建默认 markdown
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  if (MARKDOWN_EXTS.includes(ext)) return 'markdown';
  if (HTML_EXTS.includes(ext)) return 'html';
  return 'text'; // 其他所有文本文件
}
let currentMode = 'split'; // split | editor | preview
let lastSavedContent = '';  // 用于检测未保存修改

// 检测是否有未保存的修改
function isDirty() {
  return editor.value !== lastSavedContent;
}

// 暴露给主进程通过 executeJavaScript 调用
window.__isDirty = isDirty;
window.__autoSaveInfo = () => ({
  enabled: autoSaveEnabled,
  filePath: currentFilePath
});

// 标记内容已保存（打开/保存后调用）
function markSaved() {
  lastSavedContent = editor.value;
  updateStatusbar();
}

// ========== 状态栏 ==========
function updateStatusbar() {
  const filenameEl = document.getElementById('statusbar-filename');
  const encodingEl = document.getElementById('statusbar-encoding');
  const lineendingEl = document.getElementById('statusbar-lineending');
  const positionEl = document.getElementById('statusbar-position');
  const charsEl = document.getElementById('statusbar-chars');

  // 文件名
  if (currentFilePath) {
    filenameEl.textContent = path.basename(currentFilePath);
    filenameEl.title = currentFilePath;
    if (isDirty()) {
      filenameEl.classList.add('modified');
    } else {
      filenameEl.classList.remove('modified');
    }
  } else {
    filenameEl.textContent = '未打开文件';
    filenameEl.title = '';
    filenameEl.classList.remove('modified');
  }

  // 编码
  encodingEl.textContent = ENCODING_LABELS[currentFileEncoding] || currentFileEncoding.toUpperCase();

  // 换行符 - 直接使用当前值（用户选择优先，不重新检测覆盖）
  lineendingEl.textContent = LINE_ENDING_LABELS[currentLineEnding];

  // 光标位置和字符数
  updateCursorPosition();
}

// 仅在打开文件时调用一次，用于检测文件的原始换行符
function detectLineEnding() {
  const content = editor.value;
  const crlfCount = (content.match(/\r\n/g) || []).length;
  const lfCount = (content.match(/(?<!\r)\n/g) || []).length;

  if (crlfCount > lfCount) {
    currentLineEnding = 'crlf';
  } else {
    currentLineEnding = 'lf';
  }
}

function updateCursorPosition() {
  const positionEl = document.getElementById('statusbar-position');
  const linesEl = document.getElementById('statusbar-lines');
  const charsEl = document.getElementById('statusbar-chars');

  const text = editor.value;
  const selStart = editor.selectionStart;

  // 计算行列号（基于当前换行符）
  const lines = text.substring(0, selStart).split(/\r?\n/);
  const lineNum = lines.length;
  const colNum = lines[lines.length - 1].length + 1;

  // 总行数
  const totalLines = text ? text.split(/\r?\n/).length : 0;

  positionEl.textContent = `Ln ${lineNum}, Col ${colNum}`;
  linesEl.textContent = `${totalLines} 行`;
  charsEl.textContent = `${text.length} 字符`;
}

// 编码下拉菜单
function toggleEncodingMenu() {
  closeAllStatusMenus();
  const menu = document.getElementById('encoding-menu');

  if (menu.classList.contains('open')) {
    menu.classList.remove('open');
    return;
  }

  let html = '';
  ENCODINGS.forEach(enc => {
    const label = ENCODING_LABELS[enc];
    const active = enc === currentFileEncoding ? ' active' : '';
    html += `<button class="statusbar-menu-item${active}" onclick="selectEncoding('${enc}')">${label}</button>`;
  });
  menu.innerHTML = html;
  menu.classList.add('open');
}

function selectEncoding(enc) {
  if (editor.value) {
    const iconv = require('iconv-lite');
    try {
      // 使用映射后的编码名（ansi -> gbk）
      const srcEnc = ENCODING_ICONV_MAP[currentFileEncoding] || currentFileEncoding;
      const dstEnc = ENCODING_ICONV_MAP[enc] || enc;
      const buffer = iconv.encode(editor.value, srcEnc);
      const newContent = iconv.decode(buffer, dstEnc);
      editor.value = newContent;
      lastSavedContent = newContent;
      updatePreview();
    } catch (e) {
      showToast(`编码转换失败: ${e.message}`, 'error');
      closeAllStatusMenus();
      return;
    }
  }

  currentFileEncoding = enc;
  document.getElementById('statusbar-encoding').textContent = ENCODING_LABELS[enc];
  closeAllStatusMenus();
  showToast(`编码: ${ENCODING_LABELS[enc]}`, 'success', 1500);
}

// 换行符下拉菜单
function toggleLineEndingMenu() {
  closeAllStatusMenus();
  const menu = document.getElementById('lineending-menu');

  if (menu.classList.contains('open')) {
    menu.classList.remove('open');
    return;
  }

  const items = [
    { key: 'lf', label: 'LF (Unix/macOS)' },
    { key: 'crlf', label: 'CRLF (Windows)' }
  ];

  let html = '';
  items.forEach(item => {
    const active = item.key === currentLineEnding ? ' active' : '';
    html += `<button class="statusbar-menu-item${active}" onclick="selectLineEnding('${item.key}')">${item.label}</button>`;
  });
  menu.innerHTML = html;
  menu.classList.add('open');
}

function selectLineEnding(type) {
  const oldChar = LINE_ENDING_CHARS[currentLineEnding];
  const newChar = LINE_ENDING_CHARS[type];

  // 替换现有换行符（如果开关开启）
  if (replaceExistingLineEndings && editor.value) {
    // 统一替换所有 \r\n 和单独的 \n 为目标格式
    let normalized = editor.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (type === 'crlf') {
      normalized = normalized.replace(/\n/g, '\r\n');
    }
    if (normalized !== editor.value) {
      editor.value = normalized;
      lastSavedContent = editor.value;
      updatePreview();
    }
  }

  currentLineEnding = type;
  document.getElementById('statusbar-lineending').textContent = LINE_ENDING_LABELS[type];
  closeAllStatusMenus();
  showToast(`换行符: ${LINE_ENDING_LABELS[type]}`, 'success', 1500);
}

// 输入时将新换行符统一为目标格式
function normalizeInputLineEndings() {
  if (currentLineEnding !== 'lf') return;
  const el = document.getElementById('editor');
  const selStart = el.selectionStart;
  const val = el.value;
  // 检查是否有新插入的 \r\n（Windows 粘贴或某些输入法）
  if (val.includes('\r\n')) {
    el.value = val.replace(/\r\n/g, '\n');
    // 恢复光标位置（减去被替换掉的 \r 数量）
    const crCount = (val.substring(0, selStart).match(/\r\n/g) || []).length;
    el.selectionStart = el.selectionEnd = selStart - crCount;
  }
}

function toggleReplaceLineEndings() {
  replaceExistingLineEndings = !replaceExistingLineEndings;
  const sw = document.getElementById('replace-le-switch');
  if (replaceExistingLineEndings) sw.classList.add('active');
  else sw.classList.remove('active');
}

function closeAllStatusMenus() {
  document.querySelectorAll('.statusbar-menu').forEach(m => m.classList.remove('open'));
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.statusbar-dropdown')) {
    closeAllStatusMenus();
  }
});

// 自动保存功能
let autoSaveEnabled = false;
let autoSaveTimer = null;
const AUTO_SAVE_DELAY = 1500; // 停止输入 1.5 秒后自动保存

function toggleAutoSave() {
  const toggle = document.getElementById('autosave-toggle');
  autoSaveEnabled = !autoSaveEnabled;

  if (autoSaveEnabled) {
    toggle.classList.add('active');
    // 从 state.json 恢复状态时也持久化开关
    try {
      const fs = require('fs');
      const path = require('path');
      const statePath = path.join(process.env.APPDATA || '', 'Mrarviher', 'state.json');
      if (statePath && fs.existsSync(statePath)) {
        const raw = fs.readFileSync(statePath, 'utf-8');
        const state = JSON.parse(raw);
        state.autoSaveEnabled = true;
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
      }
    } catch (e) {}
    showToast('已开启自动保存', 'success', 2000);
  } else {
    toggle.classList.remove('active');
    // 清除定时器
    if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null; }
    try {
      const fs = require('fs');
      const path = require('path');
      const statePath = path.join(process.env.APPDATA || '', 'Mrarviher', 'state.json');
      if (statePath && fs.existsSync(statePath)) {
        const raw = fs.readFileSync(statePath, 'utf-8');
        const state = JSON.parse(raw);
        state.autoSaveEnabled = false;
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
      }
    } catch (e) {}
    showToast('已关闭自动保存', 'info', 2000);
  }
}

// 自动保存：编辑器输入后延迟保存
editor.addEventListener('input', () => {
  if (!autoSaveEnabled || !currentFilePath) return;
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    if (isDirty()) {
      try {
        const fs = require('fs');
        fs.writeFileSync(currentFilePath, editor.value, 'utf-8');
        markSaved();
      } catch (e) {
        showToast('自动保存失败: ' + e.message, 'error');
      }
    }
  }, AUTO_SAVE_DELAY);
});

// 恢复自动保存开关状态
try {
  const fs = require('fs');
  const path = require('path');
  const statePath = path.join(process.env.APPDATA || '', 'Mrarviher', 'state.json');
  if (statePath && fs.existsSync(statePath)) {
    const raw = fs.readFileSync(statePath, 'utf-8');
    const state = JSON.parse(raw);
    if (state.autoSaveEnabled) {
      autoSaveEnabled = true;
      document.getElementById('autosave-toggle').classList.add('active');
    }
  }
} catch (e) {}

// 关闭前确认未保存修改
window.addEventListener('beforeunload', (e) => {
  if (isDirty()) {
    e.returnValue = true; // 触发浏览器/Electron 的关闭确认对话框
    return true;
  }
});

// 主进程要求保存并关闭
ipcRenderer.on('save-and-close', async () => {
  if (currentFilePath) {
    try {
      const fs = require('fs');
      fs.writeFileSync(currentFilePath, editor.value, 'utf-8');
      markSaved();
    } catch (e) {
      // 保存失败也关闭，避免卡死
    }
  } else {
    // 没有文件路径，弹出另存为对话框
    const result = await ipcRenderer.invoke('show-save-dialog');
    if (!result.canceled && result.filePath) {
      const filePath = result.filePath.endsWith('.md') ? result.filePath : result.filePath + '.md';
      const fs = require('fs');
      fs.writeFileSync(filePath, editor.value, 'utf-8');
      markSaved();
    }
  }
  // 保存完成后关闭窗口
  ipcRenderer.send('request-close');
});

// 初始化分割线拖拽
function initResizer() {
  const resizer = document.getElementById('resizer');
  const editorPanel = document.getElementById('editor-panel');
  const previewPanel = document.getElementById('preview-panel');

  let isDragging = false;
  let startX = 0;
  let startEditorWidth = 0;

  resizer.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startEditorWidth = editorPanel.offsetWidth;
    resizer.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const containerWidth = editorPanel.parentElement.offsetWidth;
    let newWidth = startEditorWidth + dx;

    // 限制最小/最大宽度（容器宽度的15%~85%）
    const minWidth = containerWidth * 0.15;
    const maxWidth = containerWidth * 0.85;
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

    editorPanel.style.flex = 'none';
    editorPanel.style.width = newWidth + 'px';
    previewPanel.style.flex = 'none';
    previewPanel.style.width = (containerWidth - newWidth - 5) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    resizer.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    // 拖拽结束后恢复编辑器焦点
    editor.focus();
  });
}

// 根据文件类型控制视图切换器可见性
function updateModeSwitcherVisibility() {
  const switcher = document.getElementById('mode-switcher');
  if (switcher) {
    // Markdown 和 HTML 文件显示视图切换，纯文本模式隐藏
    switcher.style.display = (isMarkdownFile || isHtmlFile) ? '' : 'none';
  }
}

// 三模式切换: split(分屏) | editor(仅编辑) | preview(仅预览)
function switchMode(mode) {
  // 纯文本模式禁止切换视图（但允许强制设置为编辑模式）
  if (!isMarkdownFile && !isHtmlFile && mode !== 'editor') return;

  currentMode = mode;
  const editorPanel = document.getElementById('editor-panel');
  const previewPanel = document.getElementById('preview-panel');
  const resizer = document.getElementById('resizer');
  const appContainer = document.querySelector('.app-container');

  // 预览模式时隐藏工具栏
  if (mode === 'preview') {
    appContainer.classList.add('preview-only');
  } else {
    appContainer.classList.remove('preview-only');
  }

  // 更新按钮激活状态（仅Markdown/HTML文件）
  if (isMarkdownFile || isHtmlFile) {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }

  // 重置 flex 样式，移除之前的拖拽固定宽度
  editorPanel.style.flex = '';
  editorPanel.style.width = '';
  previewPanel.style.flex = '';
  previewPanel.style.width = '';

  switch (mode) {
    case 'editor':
      editorPanel.style.display = 'flex';
      editorPanel.style.flex = '1';
      previewPanel.style.display = 'none';
      resizer.style.display = 'none';
      // 切到编辑模式时自动聚焦
      requestAnimationFrame(() => { editor.focus(); });
      break;
    case 'preview':
      editorPanel.style.display = 'none';
      previewPanel.style.display = 'flex';
      previewPanel.style.flex = '1';
      resizer.style.display = 'none';
      break;
    case 'split':
    default:
      editorPanel.style.display = 'flex';
      editorPanel.style.width = 'calc(50% - 2.5px)';
      editorPanel.style.flex = 'none';
      previewPanel.style.display = 'flex';
      previewPanel.style.width = 'calc(50% - 2.5px)';
      previewPanel.style.flex = 'none';
      resizer.style.display = 'block';
      break;
  }
}

function updatePreview() {
  // 纯文本模式：不显示预览
  if (!isMarkdownFile && !isHtmlFile) {
    return;
  }

  // HTML文件：直接渲染HTML内容
  if (isHtmlFile) {
    // 保存光标位置
    const selectionStart = editor.selectionStart;
    const selectionEnd = editor.selectionEnd;
    const wasFocused = document.activeElement === editor;

    try {
      // 将HTML内容包裹在容器中，确保内容可滚动
      preview.innerHTML =
        '<div class="html-preview-wrapper" style="width:100%;min-height:100%;position:relative;overflow:auto;">' +
        editor.value +
        '</div>';

      // 注入样式重置，防止HTML文件的固定高度/定位影响布局
      const styleReset = document.createElement('style');
      styleReset.textContent = `
        .html-preview-wrapper > * {
          max-width: 100% !important;
        }
        .html-preview-wrapper html,
        .html-preview-wrapper body {
          height: auto !important;
          min-height: auto !important;
          overflow: visible !important;
        }
      `;
      preview.insertBefore(styleReset, preview.firstChild);
    } catch (err) {
      preview.innerHTML = '<pre style="color:var(--text-secondary)">HTML渲染出错: ' + err.message + '</pre>';
      return;
    }

    // 恢复焦点和光标位置
    if (wasFocused) {
      editor.focus();
      editor.setSelectionRange(selectionStart, selectionEnd);
    }
    return;
  }

  // Markdown文件：使用marked渲染（原有逻辑）
  // 保存光标位置，防止 innerHTML 重绘抢走焦点
  const selectionStart = editor.selectionStart;
  const selectionEnd = editor.selectionEnd;
  const wasFocused = document.activeElement === editor;

  // 预处理：兼容 - [] 无空格的 todo 写法 -> 转为标准 - [ ]
  let markdownText = editor.value.replace(/^(\s*[-*+])\[\]\s/gm, '$1[ ] ');

  try {
    preview.innerHTML = marked(replaceEmoji(renderFootnotes(markdownText)));
  } catch (err) {
    preview.innerHTML = '<pre style="color:var(--text-secondary)">渲染出错: ' + err.message + '</pre>';
    return;
  }

  // 调试：检查 todo checkbox 渲染情况
  const checkboxes = preview.querySelectorAll('input[type="checkbox"]');
  if (checkboxes.length > 0) {
    logToMain(`[Todo] 检测到 ${checkboxes.length} 个 checkbox (checked=${preview.querySelectorAll('input[type="checkbox"]:checked').length})`);
  }
  
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block);
  });

  // 为每个代码块添加复制按钮
  document.querySelectorAll('#preview pre').forEach((pre) => {
    if (pre.querySelector('.code-copy-btn')) return;
    const codeEl = pre.querySelector('code');
    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 复制';
    btn.addEventListener('click', async () => {
      const text = codeEl ? codeEl.textContent : pre.textContent;
      try {
        await navigator.clipboard.writeText(text);
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> 已复制';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 复制';
          btn.classList.remove('copied');
        }, 1500);
      } catch (e) {
        // fallback: 用 textarea 复制
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> 已复制';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 复制';
          btn.classList.remove('copied');
        }, 1500);
      }
    });
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });

  // 附加图片加载诊断（在 DOM 更新后调用）
  attachImageDiagnostics();

  // 脚注锚点跳转：确保在 overflow 容器内正确滚动
  preview.querySelectorAll('a[href^="#fn-"], a[href^="#fnref-"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        const previewPanel = document.getElementById('preview-panel');
        if (previewPanel) {
          const offsetTop = target.offsetTop - previewPanel.offsetTop - 16;
          previewPanel.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
      }
    });
  });

  // 徽章图片横排：把连续的纯图片段落合并到 flex 容器
  const children = Array.from(preview.children);
  let badgeGroup = null;
  let groupCount = 0;
  children.forEach((child) => {
    const imgs = child.querySelectorAll('img');
    const txt = child.textContent.trim();
    const isBadgeParagraph = child.tagName === 'P' &&
      imgs.length > 0 &&
      txt === '';
    if (isBadgeParagraph) {
      if (!badgeGroup) {
        badgeGroup = document.createElement('div');
        badgeGroup.className = 'badge-row';
        preview.insertBefore(badgeGroup, child);
      }
      // 把 p 内的所有 a/img 直接提取为 flex 子元素
      Array.from(child.children).forEach(el => {
        if (el.tagName === 'A' || el.tagName === 'IMG') {
          badgeGroup.appendChild(el);
        }
      });
      child.remove();
      groupCount++;
    } else {
      badgeGroup = null;
      groupCount = 0;
    }
  });

  // 恢复焦点和光标位置（防止 innerHTML 重绘导致焦点丢失）
  if (wasFocused) {
    editor.focus();
    editor.setSelectionRange(selectionStart, selectionEnd);
  }
}

// 设置或移除 <base>，让相对 URL 相对于 Markdown 文件目录解析
function setPreviewBase(filePath) {
  const existing = document.querySelector('base[data-md-base]');
  if (!filePath) {
    if (existing) existing.remove();
    return;
  }

  try {
    const baseHref = pathToFileURL(require('path').dirname(filePath)).href + '/';
    if (existing) {
      existing.setAttribute('href', baseHref);
    } else {
      const b = document.createElement('base');
      b.setAttribute('href', baseHref);
      b.setAttribute('data-md-base', '1');
      // 插入到 head 的第一个位置
      const head = document.head || document.getElementsByTagName('head')[0];
      if (head.firstChild) head.insertBefore(b, head.firstChild);
      else head.appendChild(b);
    }
    ipcRenderer.send('renderer-log', `set <base> to ${baseHref}`);
  } catch (e) {
    ipcRenderer.send('renderer-log', `failed to set <base>: ${e.message}`);
  }
}

// 在预览区域捕获链接点击，交由主进程在系统默认浏览器中打开
preview.addEventListener('click', (e) => {
  const anchor = e.target.closest && e.target.closest('a');
  if (anchor && anchor.href) {
    e.preventDefault();
    ipcRenderer.send('open-external', anchor.href);
  }
});

function insertFormat(type) {
  const textarea = editor;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  let before = textarea.value.substring(0, start);
  let after = textarea.value.substring(end);
  
  switch (type) {
    case 'bold':
      textarea.value = before + '**' + selectedText + '**' + after;
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = end + 2;
      break;
    case 'italic':
      textarea.value = before + '*' + selectedText + '*' + after;
      textarea.selectionStart = start + 1;
      textarea.selectionEnd = end + 1;
      break;
    case 'strikethrough':
      textarea.value = before + '~~' + selectedText + '~~' + after;
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = end + 2;
      break;
    case 'code':
      textarea.value = before + '`' + selectedText + '`' + after;
      textarea.selectionStart = start + 1;
      textarea.selectionEnd = end + 1;
      break;
    case 'codeblock':
      textarea.value = before + '\n```\n' + selectedText + '\n```\n' + after;
      textarea.selectionStart = start + 4;
      textarea.selectionEnd = end + 4;
      break;
    case 'link':
      const linkText = selectedText || '链接文本';
      textarea.value = before + '[' + linkText + '](https://)' + after;
      textarea.selectionStart = start + linkText.length + 3;
      textarea.selectionEnd = start + linkText.length + 14;
      break;
    case 'h1':
      textarea.value = before + '# ' + selectedText + '\n' + after;
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = end + 2;
      break;
    case 'h2':
      textarea.value = before + '## ' + selectedText + '\n' + after;
      textarea.selectionStart = start + 3;
      textarea.selectionEnd = end + 3;
      break;
    case 'h3':
      textarea.value = before + '### ' + selectedText + '\n' + after;
      textarea.selectionStart = start + 4;
      textarea.selectionEnd = end + 4;
      break;
    case 'h4':
      textarea.value = before + '#### ' + selectedText + '\n' + after;
      textarea.selectionStart = start + 5;
      textarea.selectionEnd = end + 5;
      break;
    case 'h5':
      textarea.value = before + '##### ' + selectedText + '\n' + after;
      textarea.selectionStart = start + 6;
      textarea.selectionEnd = end + 6;
      break;
    case 'h6':
      textarea.value = before + '###### ' + selectedText + '\n' + after;
      textarea.selectionStart = start + 7;
      textarea.selectionEnd = end + 7;
      break;
    case 'ul':
      textarea.value = before + '\n- ' + selectedText + '\n' + after;
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = end + 2;
      break;
    case 'todo':
      textarea.value = before + '\n- [ ] ' + selectedText + '\n' + after;
      textarea.selectionStart = start + 6;
      textarea.selectionEnd = start + 6 + (selectedText || '').length;
      break;
    case 'ol':
      textarea.value = before + '\n1. ' + selectedText + '\n' + after;
      textarea.selectionStart = start + 3;
      textarea.selectionEnd = start + 3 + (selectedText || '').length;
      break;
    case 'quote':
      textarea.value = before + '\n> ' + selectedText + '\n' + after;
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = end + 2;
      break;
    case 'new':
      newFile();
      return;
    case 'open':
      ipcRenderer.send('open-file-manual');
      return;
    case 'save':
      saveFile();
      return;
    case 'saveas':
      saveAsFile();
      return;
    case 'export':
      exportAsHTML();
      return;
    case 'preview':
      cycleMode();
      return;
    case 'theme':
      toggleTheme();
      return;
  }
  
  textarea.focus();
  updatePreview();
}

function newFile() {
  if (editor.value && !confirm('当前文件未保存，确定要新建吗？')) {
    return;
  }
  editor.value = '';
  currentFilePath = null;
  currentFileEncoding = 'utf-8';
  currentLineEnding = 'lf';
  isMarkdownFile = true; // 新建文档默认为 Markdown 模式
  document.title = 'Mrarviher - 新建文档';
  setPreviewBase(null);
  updatePreview();
  updateStatusbar();
}

async function openFile(filePath) {
  try {
    // 二进制文件检测 + 编码检测
    const fs = require('fs');
    const iconv = require('iconv-lite');
    const buffer = fs.readFileSync(filePath);
    const isBinary = buffer.includes(0x00);
    if (isBinary) {
      showToast('无法打开二进制文件: ' + filePath.split('\\').pop(), 'error');
      return;
    }

    // 编码检测：尝试 UTF-8 解码再编码，如果一致则是 UTF-8
    let content, encoding = 'utf-8';
    try {
      const asUtf8 = iconv.decode(buffer, 'utf-8');
      const reEncoded = iconv.encode(asUtf8, 'utf-8');
      if (Buffer.compare(buffer, reEncoded) === 0) {
        content = asUtf8; // 确认是 UTF-8
      } else {
        throw new Error('not-utf8');
      }
    } catch (e) {
      // 不是 UTF-8，默认用 GBK (ANSI) 解码
      encoding = 'ansi';
      try {
        content = iconv.decode(buffer, 'gbk');
      } catch (e2) {
        // GBK 也失败，回退到 latin1
        encoding = 'iso-8859-1';
        content = iconv.decode(buffer, 'iso-8859-1');
      }
    }

    editor.value = content;
    currentFilePath = filePath;
    currentFileEncoding = encoding;

    // 检测文件原始换行符（仅此一次）
    detectLineEnding();

    // 使用新的文件类型检测
    const fileType = getFileType(filePath);
    isMarkdownFile = (fileType === 'markdown');
    isHtmlFile = (fileType === 'html');

    markSaved();
    ipcRenderer.send('file-path-changed', filePath);
    document.title = 'Mrarviher - ' + filePath.split('\\').pop();
    setPreviewBase(filePath);

    // 更新视图切换器可见性
    updateModeSwitcherVisibility();

    if (isHtmlFile) {
      // HTML文件：允许切换视图，预览区显示渲染后的HTML
      switchMode('split');
      updatePreview();
    } else if (!isMarkdownFile) {
      // 纯文本文件：强制编辑模式，隐藏预览面板
      switchMode('editor');
    } else {
      // Markdown文件：正常渲染
      updatePreview();
    }
  } catch (error) {
    showToast('打开文件失败: ' + error.message, 'error');
  }
}

async function saveFile() {
  const fs = require('fs');
  const iconv = require('iconv-lite');

  if (currentFilePath) {
    try {
      // 使用当前编码保存（ansi 映射为 gbk）
      const enc = ENCODING_ICONV_MAP[currentFileEncoding] || currentFileEncoding;
      if (enc === 'utf-8') {
        fs.writeFileSync(currentFilePath, editor.value, 'utf-8');
      } else {
        const buffer = iconv.encode(editor.value, enc);
        fs.writeFileSync(currentFilePath, buffer);
      }
      markSaved();
      document.title = 'Mrarviher - ' + currentFilePath.split('\\').pop();
    } catch (error) {
      showToast('保存文件失败: ' + error.message, 'error');
    }
  } else {
    saveAsFile();
  }
}

async function saveAsFile() {
  const fs = require('fs');
  const iconv = require('iconv-lite');

  try {
    // 第一步：选择保存路径
    const result = await ipcRenderer.invoke('show-save-dialog');
    if (result.canceled || !result.filePath) return;

    // 第二步：选择编码
    const selectedEnc = await ipcRenderer.invoke('select-save-encoding', currentFileEncoding);
    if (selectedEnc === null) return; // 用户取消

    const filePath = result.filePath;

    // 使用选择的编码保存
    const enc = ENCODING_ICONV_MAP[selectedEnc] || selectedEnc;
    if (enc === 'utf-8') {
      fs.writeFileSync(filePath, editor.value, 'utf-8');
    } else {
      const buffer = iconv.encode(editor.value, enc);
      fs.writeFileSync(filePath, buffer);
    }

    currentFilePath = filePath;
    currentFileEncoding = selectedEnc;

    // 使用新的文件类型检测
    const fileType = getFileType(filePath);
    isMarkdownFile = (fileType === 'markdown');
    isHtmlFile = (fileType === 'html');

    markSaved();
    ipcRenderer.send('file-path-changed', filePath);
    document.title = 'Mrarviher - ' + filePath.split('\\').pop();
    setPreviewBase(filePath);
    updateModeSwitcherVisibility();
    updateStatusbar();

    if (!isMarkdownFile && !isHtmlFile) {
      switchMode('editor');
    } else {
      updatePreview();
    }

    showToast(`已保存: ${path.basename(filePath)} (${ENCODING_LABELS[currentFileEncoding]})`, 'success');
  } catch (error) {
    showToast('保存文件失败: ' + error.message, 'error');
  }
}

async function exportAsHTML() {
  const fs = require('fs');
  const path = require('path');
  
  const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mrarviher Export</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background-color: #1e1e1e;
      color: #e4e4;
      line-height: 1.8;
    }
    h1, h2, h3 { color: #4ade80; }
    h1 { border-bottom: 2px solid #22c55e; padding-bottom: 8px; }
    a { color: #22c55e; text-decoration: none; }
    code { background-color: #252526; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #fbbf24; }
    pre { background-color: #141414; padding: 16px; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 4px solid #22c55e; padding-left: 16px; color: #9d9d9d; font-style: italic; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #3c3c3c; padding: 8px 12px; }
    th { background-color: #252526; }
    img { max-width: 100%; border-radius: 8px; }
  </style>
</head>
<body>
${marked(editor.value)}
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
<script>hljs.highlightAll();</script>
</body>
</html>`;
  
  try {
    const result = await ipcRenderer.invoke('show-save-dialog');
    if (!result.canceled && result.filePath) {
      const filePath = result.filePath.endsWith('.html') ? result.filePath : result.filePath + '.html';
      fs.writeFileSync(filePath, htmlContent, 'utf-8');
    }
  } catch (error) {
    showToast('导出失败: ' + error.message, 'error');
  }
}

function cycleMode() {
  const modes = ['split', 'editor', 'preview'];
  const idx = modes.indexOf(currentMode);
  switchMode(modes[(idx + 1) % modes.length]);
}

function toggleTheme() {
  const root = document.documentElement;
  const currentBg = getComputedStyle(root).getPropertyValue('--bg-dark');
  
  if (currentBg === '#1e1e1e') {
    root.style.setProperty('--bg-dark', '#ffffff');
    root.style.setProperty('--bg-darker', '#f5f5f5');
    root.style.setProperty('--bg-light', '#e0e0e0');
    root.style.setProperty('--text-primary', '#1e1e1e');
    root.style.setProperty('--text-secondary', '#666666');
    root.style.setProperty('--border-color', '#cccccc');
  } else {
    root.style.setProperty('--bg-dark', '#1e1e1e');
    root.style.setProperty('--bg-darker', '#141414');
    root.style.setProperty('--bg-light', '#252526');
    root.style.setProperty('--text-primary', '#e4e4e4');
    root.style.setProperty('--text-secondary', '#9d9d9d');
    root.style.setProperty('--border-color', '#3c3c3c');
  }
}

editor.addEventListener('input', updatePreview);
// 状态栏实时更新
editor.addEventListener('input', updateStatusbar);
editor.addEventListener('input', normalizeInputLineEndings);
editor.addEventListener('keyup', updateCursorPosition);
editor.addEventListener('click', updateCursorPosition);
editor.addEventListener('select', updateCursorPosition);

// 打字音效 - 按键触发
editor.addEventListener('keydown', (e) => {
  if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Tab' || e.key === 'Delete') {
    playTypewriterSound();
  }
});

// 初始化状态栏
updateStatusbar();

// 彩蛋变量声明（必须在启动恢复之前）
let typewriterEnabled = false;
let audioCtx = null;
let particlesEnabled = false;
let particleCanvas = null;
let particleCtx = null;
let particles = [];
let particleAnimId = null;

// 根据标题栏模式隐藏/显示自定义标题栏
if (localStorage.getItem('native-titlebar') === 'true') {
  const tb = document.getElementById('titlebar');
  if (tb) tb.style.display = 'none';
}

// 恢复彩蛋状态
if (localStorage.getItem('typewriter-sound') === 'true') {
  typewriterEnabled = true;
  document.getElementById('typewriter-switch').classList.add('active');
  document.getElementById('typewriter-toggle').classList.add('active');
}
if (localStorage.getItem('particles-bg') === 'true') {
  particlesEnabled = true;
  document.getElementById('particles-switch').classList.add('active');
  document.getElementById('particles-toggle').classList.add('active');
  // 延迟启动粒子（等 DOM 完全渲染）
  requestAnimationFrame(() => startParticles());
}

ipcRenderer.on('new-file', newFile);
ipcRenderer.on('open-file', (event, filePath) => {
  openFile(filePath);
});
ipcRenderer.on('open-file-with-encoding', (event, filePath, content, encoding) => {
  currentFileEncoding = encoding || 'utf-8';
  // 直接使用已解码的内容
  currentFilePath = filePath;
  const editor = document.getElementById('editor');
  editor.value = content;
  lastSavedContent = content;

  // 检测文件原始换行符（仅此一次）
  detectLineEnding();

  // 更新文件类型和UI
  const fileType = getFileType(filePath);
  isMarkdownFile = (fileType === 'markdown');
  isHtmlFile = (fileType === 'html');
  updateModeSwitcherVisibility();

  if (!isMarkdownFile && !isHtmlFile) {
    switchMode('editor');
  } else if (currentMode === 'editor') {
    switchMode('split');
  }

  updatePreview();
  updateTitle();
  updateStatusbar();
  showToast(`已打开: ${path.basename(filePath)} (${currentFileEncoding})`, 'success');

  // 保存状态
  ipcRenderer.send('file-path-changed', filePath);
});
ipcRenderer.on('open-file-manual', () => {
  ipcRenderer.send('open-file-manual');
});
ipcRenderer.on('save-file', saveFile);
ipcRenderer.on('save-as-file', saveAsFile);
ipcRenderer.on('toggle-preview', cycleMode);
ipcRenderer.on('toggle-theme', toggleTheme);

document.addEventListener('keydown', (e) => {
  // 编辑器内 Tab 插入空格或制表符
  if (e.key === 'Tab' && document.activeElement.id === 'editor') {
    e.preventDefault();
    const editor = document.getElementById('editor');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const insertStr = tabUseChar ? '\t' : ' '.repeat(tabSizeValue);
    editor.value = editor.value.substring(0, start) + insertStr + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + insertStr.length;
    updatePreview();
    triggerAutoSave();
  }

  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 's':
        e.preventDefault();
        if (e.shiftKey) {
          saveAsFile(); // Ctrl+Shift+S: 另存为
        } else {
          saveFile();  // Ctrl+S: 保存
        }
        break;
      case 'n':
        e.preventDefault();
        newFile();
        break;
      case 'p':
        e.preventDefault();
        cycleMode();
        break;
      case 'b':
        e.preventDefault();
        insertFormat('bold');
        break;
      case 'i':
        e.preventDefault();
        insertFormat('italic');
        break;
    }
  }
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't') {
    e.preventDefault();
    toggleTheme();
  }
});

// 初始化分割线拖拽
initResizer();
updatePreview();

/* ========== 设置相关变量（必须在 restoreAllSettings 之前声明） ========== */
let editorFontSize = 14;
let previewFontSize = 16;
let tabSizeValue = 2;
let wordWrapEnabled = true;
let restoreFileEnabled = true;
let appThemeMode = 'dark';
let fontFamily = ''; // 空字符串表示使用系统默认
let tabUseChar = false; // false=空格, true=\t制表符

// 字体相关常量（必须在 restoreFontFamily 之前定义）
const DEFAULT_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif";
const RECOMMENDED_FONTS = [
  { name: '系统默认', value: '' },
  { name: '微软雅黑 (Microsoft YaHei)', value: "'Microsoft YaHei', sans-serif" },
  { name: '思源黑体 (Source Han Sans)', value: "'Source Han Sans CN', 'Noto Sans CJK SC', sans-serif" },
  { name: '等线 (DengXian)', value: "DengXian, sans-serif" },
  { name: 'Consolas (等宽)', value: "Consolas, 'Courier New', monospace" },
  { name: 'Cascadia Code (等宽)', value: "'Cascadia Code', Consolas, monospace" },
];

// 恢复所有用户设置（主题、字号、Tab、换行等）
restoreAllSettings();

/* ========== 自定义标题栏控制 ========== */
document.getElementById('win-minimize').addEventListener('click', () => {
  ipcRenderer.send('window-minimize');
});
document.getElementById('win-maximize').addEventListener('click', () => {
  ipcRenderer.send('window-maximize');
});
document.getElementById('win-close').addEventListener('click', () => {
  ipcRenderer.send('window-close');
});

// 双击标题栏最大化/还原
document.getElementById('titlebar').addEventListener('dblclick', (e) => {
  if (e.target.closest('.titlebar-controls')) return;
  ipcRenderer.send('window-maximize');
});

/* ========== 设置面板 ========== */
function openSettings() {
  const overlay = document.getElementById('settings-overlay');
  overlay.classList.add('open');
  syncSettingsUI();
  // 异步加载系统字体列表
  loadSystemFonts();
}

function closeSettings() {
  document.getElementById('settings-overlay').classList.remove('open');
}

// ========== 彩蛋设置 ==========
let rainbowActive = false;
let rainbowTimer = null;
const RAINBOW_COLORS = [
  { color: '#ef4444', dark: '#dc2626', light: '#f87171' },
  { color: '#f97316', dark: '#ea580c', light: '#fb923c' },
  { color: '#eab308', dark: '#ca8a04', light: '#facc15' },
  { color: '#22c55e', dark: '#16a34a', light: '#4ade80' },
  { color: '#14b8a6', dark: '#0d9488', light: '#2dd4bf' },
  { color: '#3b82f6', dark: '#2563eb', light: '#60a5fa' },
  { color: '#a855f7', dark: '#9333ea', light: '#c084fc' },
  { color: '#ec4899', dark: '#db2777', light: '#f472b6' },
];
let rainbowIndex = 0;

function onSettingsClick(e) {
  if (e.shiftKey) {
    openEasterEgg();
  } else {
    openSettings();
  }
}

function openEasterEgg() {
  const overlay = document.getElementById('easter-egg-overlay');
  overlay.classList.add('open');
  syncEasterEggUI();
}

function closeEasterEgg() {
  document.getElementById('easter-egg-overlay').classList.remove('open');
}

function syncEasterEggUI() {
  const sw = document.getElementById('rainbow-switch');
  const tg = document.getElementById('rainbow-toggle');
  if (rainbowActive) { sw.classList.add('active'); tg.classList.add('active'); }
  else { sw.classList.remove('active'); tg.classList.remove('active'); }

  const nsw = document.getElementById('native-titlebar-switch');
  const ntg = document.getElementById('native-titlebar-toggle');
  const useNative = localStorage.getItem('native-titlebar') === 'true';
  if (useNative) { nsw.classList.add('active'); ntg.classList.add('active'); }
  else { nsw.classList.remove('active'); ntg.classList.remove('active'); }
}

function toggleRainbowTheme() {
  rainbowActive = !rainbowActive;
  const sw = document.getElementById('rainbow-switch');
  const tg = document.getElementById('rainbow-toggle');

  if (rainbowActive) {
    sw.classList.add('active'); tg.classList.add('active');
    startRainbow();
    showToast('彩虹模式已开启', 'success', 1500);
  } else {
    sw.classList.remove('active'); tg.classList.remove('active');
    stopRainbow();
    // 恢复默认绿色主题
    applyThemeColor({ color: '#22c55e', dark: '#16a34a', light: '#4ade80' });
    showToast('彩虹模式已关闭', 'success', 1500);
  }
}

function startRainbow() {
  if (rainbowTimer) return;
  rainbowIndex = 0;
  stepRainbow();
}

function stepRainbow() {
  if (!rainbowActive) return;
  applyThemeColor(RAINBOW_COLORS[rainbowIndex]);
  rainbowIndex = (rainbowIndex + 1) % RAINBOW_COLORS.length;
  rainbowTimer = setTimeout(stepRainbow, 800);
}

function stopRainbow() {
  if (rainbowTimer) { clearTimeout(rainbowTimer); rainbowTimer = null; }
}

function applyThemeColor(c) {
  document.documentElement.style.setProperty('--primary-color', c.color);
  document.documentElement.style.setProperty('--primary-dark', c.dark);
  document.documentElement.style.setProperty('--primary-light', c.light);
}

function toggleNativeTitlebar() {
  const current = localStorage.getItem('native-titlebar') === 'true';
  const newValue = !current;
  localStorage.setItem('native-titlebar', String(newValue));

  const sw = document.getElementById('native-titlebar-switch');
  const tg = document.getElementById('native-titlebar-toggle');
  if (newValue) { sw.classList.add('active'); tg.classList.add('active'); }
  else { sw.classList.remove('active'); tg.classList.remove('active'); }

  showToast(newValue ? '切换为系统标题栏，正在重启...' : '切换为自定义标题栏，正在重启...', 'success', 2000);

  // 通知主进程切换标题栏并重启
  ipcRenderer.send('switch-titlebar-mode', newValue);
}

// ==================== 打字音效 ====================

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTypewriterSound() {
  if (!typewriterEnabled) return;
  try {
    initAudioContext();

    const now = audioCtx.currentTime;

    // 主音 - 模拟机械键盘敲击
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.05);

    // 余音 - 轻微共鸣
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200 + Math.random() * 300, now);
    gain2.gain.setValueAtTime(0.02, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now);
    osc2.stop(now + 0.03);
  } catch(e) {
    // 静默失败
  }
}

function toggleTypewriterSound() {
  typewriterEnabled = !typewriterEnabled;
  localStorage.setItem('typewriter-sound', String(typewriterEnabled));

  const sw = document.getElementById('typewriter-switch');
  const tg = document.getElementById('typewriter-toggle');
  if (typewriterEnabled) { sw.classList.add('active'); tg.classList.add('active'); }
  else { sw.classList.remove('active'); tg.classList.remove('active'); }

  if (typewriterEnabled) {
    initAudioContext(); // 预初始化（需要用户交互）
    playTypewriterSound(); // 试听
    showToast('打字音效已开启', 'success', 1500);
  } else {
    showToast('打字音效已关闭', 'info', 1500);
  }
}

// ==================== 粒子背景 ====================

const PARTICLE_COUNT = 40;
const PARTICLE_COLORS = ['#ff6b35', '#f7c948', '#4ecdc4', '#ff6b6b', '#a855f7', '#3b82f6'];

class Particle {
  constructor(canvasW, canvasH) {
    this.reset(canvasW, canvasH, true);
  }

  reset(canvasW, canvasH, initial) {
    this.x = Math.random() * canvasW;
    this.y = initial ? Math.random() * canvasH : canvasH + 10;
    this.size = Math.max(1.5, 1.5 + Math.random() * 3);
    this.speedY = -(0.3 + Math.random() * 1.2);
    this.speedX = (Math.random() - 0.5) * 0.6;
    this.opacity = 0.3 + Math.random() * 0.5;
    this.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.01 + Math.random() * 0.02;
  }

  update(canvasW, canvasH) {
    this.wobblePhase += this.wobbleSpeed;
    this.x += this.speedX + Math.sin(this.wobblePhase) * 0.3;
    this.y += this.speedY;
    this.opacity -= 0.0008;

    if (this.y < -10 || this.opacity <= 0) {
      this.reset(canvasW, canvasH, false);
    }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = Math.max(0, this.opacity);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function initParticles() {
  particleCanvas = document.getElementById('particle-canvas');
  if (!particleCanvas) return;

  particleCtx = particleCanvas.getContext('2d');
  resizeParticleCanvas();

  const panel = document.getElementById('editor-panel');
  if (panel) {
    new ResizeObserver(resizeParticleCanvas).observe(panel);
  }
}

function resizeParticleCanvas() {
  if (!particleCanvas) return;
  const panel = document.getElementById('editor-panel');
  if (!panel) return;
  particleCanvas.width = panel.clientWidth;
  particleCanvas.height = panel.clientHeight;
}

function startParticles() {
  if (!particleCanvas) initParticles();
  if (!particleCanvas) return;

  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle(particleCanvas.width, particleCanvas.height));
  }

  particleCanvas.classList.add('active');

  function animate() {
    if (!particlesEnabled || !particleCtx) return;
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

    particles.forEach(p => {
      p.update(particleCanvas.width, particleCanvas.height);
      p.draw(particleCtx);
    });

    particleAnimId = requestAnimationFrame(animate);
  }

  animate();
}

function stopParticles() {
  particlesEnabled = false;
  if (particleAnimId) { cancelAnimationFrame(particleAnimId); particleAnimId = null; }
  if (particleCanvas) particleCanvas.classList.remove('active');
  if (particleCtx && particleCanvas) particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  particles = [];
}

function toggleParticles() {
  const wasEnabled = particlesEnabled;
  particlesEnabled = !particlesEnabled;
  localStorage.setItem('particles-bg', String(particlesEnabled));

  const sw = document.getElementById('particles-switch');
  const tg = document.getElementById('particles-toggle');
  if (particlesEnabled) { sw.classList.add('active'); tg.classList.add('active'); }
  else { sw.classList.remove('active'); tg.classList.remove('active'); }

  if (particlesEnabled) {
    startParticles();
    showToast('粒子背景已开启', 'success', 1500);
  } else {
    stopParticles();
    showToast('粒子背景已关闭', 'info', 1500);
  }
}

// 同步设置面板 UI 状态（从当前状态同步到面板）
function syncSettingsUI() {
  // 同步主题色选中状态
  const currentColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
  document.querySelectorAll('.color-option').forEach(el => {
    el.classList.toggle('active', el.dataset.color === currentColor);
  });

  // 同步应用主题按钮
  document.getElementById('app-theme-dark').classList.toggle('active', appThemeMode === 'dark');
  document.getElementById('app-theme-light').classList.toggle('active', appThemeMode === 'light');

  // 同步字号显示
  document.getElementById('editor-font-size-val').textContent = editorFontSize + 'px';
  document.getElementById('preview-font-size-val').textContent = previewFontSize + 'px';
  document.getElementById('tab-size-val').textContent = tabSizeValue + ' 空格';

  // 同步自动换行
  document.getElementById('wordwrap-toggle').classList.toggle('active', wordWrapEnabled);

  // 同步 Tab 制表符
  document.getElementById('tab-char-toggle').classList.toggle('active', tabUseChar);

  // 字体选择器在 loadSystemFonts 中异步填充，这里只同步预览文字
  const fontPreview = document.getElementById('font-preview-text');
  if (fontPreview) fontPreview.style.fontFamily = fontFamily || DEFAULT_FONT;

  // 同步恢复文件开关
  document.getElementById('restore-file-toggle').classList.toggle('active', restoreFileEnabled);

  // 同步 Tab 制表符开关
  document.getElementById('tab-char-toggle').classList.toggle('active', tabUseChar);
}

// ESC 关闭设置面板
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('settings-overlay');
    if (overlay.classList.contains('open')) {
      closeSettings();
    }
  }
});

/* ========== 主题色切换 ========== */
const COLOR_VARIANTS = {
  '#22c55e': { dark: '#16a34a', light: '#4ade80' },
  '#f97316': { dark: '#ea580c', light: '#fb923c' },
  '#3b82f6': { dark: '#2563eb', light: '#60a5fa' },
  '#a855f7': { dark: '#9333ea', light: '#c084fc' },
  '#ec4899': { dark: '#db2777', light: '#f472b6' },
  '#14b8a6': { dark: '#0d9488', light: '#2dd4bf' },
  '#eab308': { dark: '#ca8a04', light: '#facc15' },
  '#ef4444': { dark: '#dc2626', light: '#f87171' },
};

document.querySelectorAll('.color-option').forEach(el => {
  el.addEventListener('click', () => {
    const color = el.dataset.color;
    const v = COLOR_VARIANTS[color];
    if (!v) return;

    document.documentElement.style.setProperty('--primary-color', color);
    document.documentElement.style.setProperty('--primary-dark', v.dark);
    document.documentElement.style.setProperty('--primary-light', v.light);
    document.documentElement.style.setProperty('--success', color);

    // 更新选中状态
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
    el.classList.add('active');

    // 持久化
    try {
      const fs = require('fs');
      const path = require('path');
      const statePath = path.join(process.env.APPDATA || '', 'Mrarviher', 'state.json');
      if (statePath && fs.existsSync(statePath)) {
        const raw = fs.readFileSync(statePath, 'utf-8');
        const state = JSON.parse(raw);
        state.themeColor = color;
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
      }
    } catch (e) {}

    showToast('主题色已更改', 'success', 1500);
  });
});

// 恢复保存的主题色
try {
  const fs = require('fs');
  const path = require('path');
  const statePath = path.join(process.env.APPDATA || '', 'Mrarviher', 'state.json');
  if (statePath && fs.existsSync(statePath)) {
    const raw = fs.readFileSync(statePath, 'utf-8');
    const state = JSON.parse(raw);
    if (state.themeColor && COLOR_VARIANTS[state.themeColor]) {
      const c = state.themeColor;
      const v = COLOR_VARIANTS[c];
      document.documentElement.style.setProperty('--primary-color', c);
      document.documentElement.style.setProperty('--primary-dark', v.dark);
      document.documentElement.style.setProperty('--primary-light', v.light);
      document.documentElement.style.setProperty('--success', c);
    }
  }
} catch (e) {}

/* ========== 全局应用主题切换（深色/浅色） ========== */
function setAppTheme(mode) {
  appThemeMode = mode;
  const body = document.body;
  const previewEl = document.getElementById('preview');

  if (mode === 'light') {
    body.classList.add('app-light');
    previewEl.classList.add('preview-light');
  } else {
    body.classList.remove('app-light');
    previewEl.classList.remove('preview-light');
  }

  // 更新按钮状态
  document.getElementById('app-theme-dark').classList.toggle('active', mode === 'dark');
  document.getElementById('app-theme-light').classList.toggle('active', mode === 'light');

  // 持久化
  saveSetting({ appTheme: mode });
}

/* ========== 编辑器/预览字号调节 ========== */
function adjustFontSize(target, delta) {
  if (target === 'editor') {
    editorFontSize = Math.max(10, Math.min(28, editorFontSize + delta));
    document.getElementById('editor').style.fontSize = editorFontSize + 'px';
    document.getElementById('editor-font-size-val').textContent = editorFontSize + 'px';
    saveSetting({ editorFontSize });
  } else {
    previewFontSize = Math.max(12, Math.min(24, previewFontSize + delta));
    document.getElementById('preview').style.fontSize = previewFontSize + 'px';
    document.getElementById('preview-font-size-val').textContent = previewFontSize + 'px';
    saveSetting({ previewFontSize });
  }
}

/* ========== Tab 缩进大小 ========== */
function adjustTabSize(delta) {
  tabSizeValue = Math.max(2, Math.min(8, tabSizeValue + delta));
  document.getElementById('editor').style.tabSize = tabSizeValue;
  document.getElementById('tab-size-val').textContent = tabSizeValue + ' 空格';
  saveSetting({ tabSize: tabSizeValue });
}

/* ========== Tab 输出制表符开关 ========== */
function toggleTabChar() {
  tabUseChar = !tabUseChar;
  const el = document.getElementById('tab-char-toggle');
  el.classList.toggle('active', tabUseChar);
  saveSetting({ tabUseChar });
}

/* ========== 编辑器自动换行 ========== */
function toggleWordWrap() {
  wordWrapEnabled = !wordWrapEnabled;
  const el = document.getElementById('wordwrap-toggle');
  el.classList.toggle('active', wordWrapEnabled);
  document.getElementById('editor').style.whiteSpace = wordWrapEnabled ? 'pre-wrap' : 'pre';
  saveSetting({ wordWrap: wordWrapEnabled });
}

/* ========== 字体选择 ========== */
let systemFonts = [];

async function loadSystemFonts() {
  const select = document.getElementById('font-family-select');
  // 先填充推荐字体
  select.innerHTML = '';
  RECOMMENDED_FONTS.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.value;
    opt.textContent = f.name;
    if (f.value === fontFamily) opt.selected = true;
    select.appendChild(opt);
  });
  // 添加分隔
  const sep = document.createElement('option');
  sep.disabled = true;
  sep.textContent = '── 系统已安装字体 ──';
  select.appendChild(sep);
  // 异步加载系统字体
  try {
    systemFonts = await ipcRenderer.invoke('get-system-fonts');
    systemFonts.forEach(fname => {
      const opt = document.createElement('option');
      opt.value = `'${fname}', ${DEFAULT_FONT}`;
      opt.textContent = fname;
      opt.style.fontFamily = `'${fname}', ${DEFAULT_FONT}`;
      if (fontFamily && fontFamily.includes(fname)) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (e) {
    logToMain(`[Font] 加载系统字体失败: ${e.message}`);
  }
}

function setFontFamily(font) {
  fontFamily = font;
  const cssVal = font || DEFAULT_FONT;
  document.documentElement.style.setProperty('--font-family', cssVal);
  // 更新预览文字
  const previewEl = document.getElementById('font-preview-text');
  if (previewEl) previewEl.style.fontFamily = cssVal;
  saveSetting({ font: font });
}

function restoreFontFamily(saved) {
  const val = saved !== undefined ? saved : '';
  fontFamily = val;
  document.documentElement.style.setProperty('--font-family', val || DEFAULT_FONT);
  const previewEl = document.getElementById('font-preview-text');
  if (previewEl) previewEl.style.fontFamily = val || DEFAULT_FONT;
  // 同步下拉框（延迟等待选项加载完成）
  setTimeout(() => {
    const sel = document.getElementById('font-family-select');
    if (sel) sel.value = val;
  }, 500);
}

/* ========== 启动时恢复上次文件 ========== */
function toggleRestoreFile() {
  restoreFileEnabled = !restoreFileEnabled;
  const el = document.getElementById('restore-file-toggle');
  el.classList.toggle('active', restoreFileEnabled);
  saveSetting({ restoreFile: restoreFileEnabled });
}

/* ========== 设置持久化工具函数 ========== */
function saveSetting(obj) {
  try {
    const fs = require('fs');
    const p = require('path');
    const sp = p.join(process.env.APPDATA || '', 'Mrarviher', 'state.json');
    let state = {};
    if (sp && fs.existsSync(sp)) {
      state = JSON.parse(fs.readFileSync(sp, 'utf-8'));
    }
    Object.assign(state, obj);
    fs.writeFileSync(sp, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {}
}

function loadSettings() {
  try {
    const fs = require('fs');
    const p = require('path');
    const sp = p.join(process.env.APPDATA || '', 'Mrarviher', 'state.json');
    if (!sp || !fs.existsSync(sp)) return {};
    return JSON.parse(fs.readFileSync(sp, 'utf-8'));
  } catch (e) { return {}; }
}

// 恢复所有设置（启动时调用）
function restoreAllSettings() {
  const s = loadSettings();

  // 应用主题
  if (s.appTheme === 'light') setAppTheme('light');

  // 编辑器字号
  if (s.editorFontSize) {
    editorFontSize = s.editorFontSize;
    document.getElementById('editor').style.fontSize = editorFontSize + 'px';
    document.getElementById('editor-font-size-val').textContent = editorFontSize + 'px';
  }

  // 预览字号
  if (s.previewFontSize) {
    previewFontSize = s.previewFontSize;
    document.getElementById('preview').style.fontSize = previewFontSize + 'px';
    document.getElementById('preview-font-size-val').textContent = previewFontSize + 'px';
  }

  // Tab 缩进
  if (s.tabSize) {
    tabSizeValue = s.tabSize;
    document.getElementById('editor').style.tabSize = tabSizeValue;
    document.getElementById('tab-size-val').textContent = tabSizeValue + ' 空格';
  }

  // 自动换行
  if (typeof s.wordWrap === 'boolean') {
    wordWrapEnabled = s.wordWrap;
    document.getElementById('wordwrap-toggle').classList.toggle('active', wordWrapEnabled);
    document.getElementById('editor').style.whiteSpace = wordWrapEnabled ? 'pre-wrap' : 'pre';
  }

  // 恢复上次文件开关
  if (typeof s.restoreFile === 'boolean') {
    restoreFileEnabled = s.restoreFile;
    document.getElementById('restore-file-toggle').classList.toggle('active', restoreFileEnabled);
  }

  // Tab 制表符开关
  if (typeof s.tabUseChar === 'boolean') {
    tabUseChar = s.tabUseChar;
    document.getElementById('tab-char-toggle').classList.toggle('active', tabUseChar);
  }

  // 字体
  if (s.font !== undefined) {
    restoreFontFamily(s.font);
  }
}

/* ========== 清除所有数据并恢复默认 ========== */
function clearAllData() {
  try {
    const fs = require('fs');
    const p = require('path');
    const stateDir = p.join(process.env.APPDATA || '', 'Mrarviher');
    if (stateDir && fs.existsSync(stateDir)) {
      const stateFile = p.join(stateDir, 'state.json');
      if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
    }

    // 恢复所有默认值
    resetToDefaults();
    showToast('已清除所有数据，已恢复默认设置', 'success', 2000);
  } catch (e) {
    showToast('清除失败: ' + e.message, 'error');
  }
}

function resetToDefaults() {
  // 应用主题 -> 深色
  setAppTheme('dark');

  // 主题色 -> 绿色
  const defaultColor = '#22c55e';
  const v = COLOR_VARIANTS[defaultColor];
  document.documentElement.style.setProperty('--primary-color', defaultColor);
  document.documentElement.style.setProperty('--primary-dark', v.dark);
  document.documentElement.style.setProperty('--primary-light', v.light);
  document.documentElement.style.setProperty('--success', defaultColor);
  document.querySelectorAll('.color-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.color === defaultColor);
  });

  // 编辑器字号 -> 14
  editorFontSize = 14;
  document.getElementById('editor').style.fontSize = editorFontSize + 'px';
  document.getElementById('editor-font-size-val').textContent = editorFontSize + 'px';

  // 预览字号 -> 16
  previewFontSize = 16;
  document.getElementById('preview').style.fontSize = previewFontSize + 'px';
  document.getElementById('preview-font-size-val').textContent = previewFontSize + 'px';

  // Tab 缩进 -> 2
  tabSizeValue = 2;
  document.getElementById('editor').style.tabSize = tabSizeValue;
  document.getElementById('tab-size-val').textContent = tabSizeValue + ' 空格';

  // 自动换行 -> 关闭
  wordWrapEnabled = true;
  document.getElementById('wordwrap-toggle').classList.remove('active');
  document.getElementById('editor').style.whiteSpace = 'pre';

  // 恢复上次文件 -> 开启
  restoreFileEnabled = true;
  document.getElementById('restore-file-toggle').classList.add('active');

  // Tab 制表符 -> 关闭（默认空格）
  tabUseChar = false;
  document.getElementById('tab-char-toggle').classList.remove('active');

  // 自动保存 -> 关闭
  autoSaveEnabled = false;
  document.getElementById('autosave-toggle').classList.remove('active');
  if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null; }

  // 字体 -> 系统默认
  restoreFontFamily('');
  const sel = document.getElementById('font-family-select');
  if (sel) sel.value = '';
}