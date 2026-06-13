import { app, BrowserWindow, Menu, ipcMain, dialog, shell, globalShortcut } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';
import iconv from 'iconv-lite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 状态持久化：记住上次打开的文件路径
const statePath = path.join(app.getPath('userData'), 'state.json');

function loadState() {
  try {
    if (fs.existsSync(statePath)) {
      const raw = fs.readFileSync(statePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.log('loadState failed:', e.message);
  }
  return {};
}

function saveState(state) {
  try {
    // 确保 userData 目录存在
    const dir = path.dirname(statePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.log('saveState failed:', e.message);
  }
}

// 记住上次打开的文件
function rememberFile(filePath) {
  if (filePath) {
    const state = loadState();
    state.lastOpenedFile = filePath;
    saveState(state);
  }
}

// 获取上次打开的文件
function getLastOpenedFile() {
  const state = loadState();
  return state.lastOpenedFile || null;
}

// 调试日志：打印启动参数，方便定位传入的文件路径
console.log('main.js starting. process.argv:', process.argv);

// 检查命令行参数是否包含要打开的文件（例如：npx electron . "path/to/file.md"）
let initialArgPath = null;
let initialArgDetected = null;
for (const a of process.argv.slice(1)) {
  try {
    if (!a.startsWith('-') && a !== '.' ) {
      const possible = path.resolve(a);
      if (fs.existsSync(possible) && fs.statSync(possible).isFile()) {
        initialArgPath = possible;
        initialArgDetected = possible;
        console.log('Detected initialArgPath:', initialArgPath);
        break;
      }
    }
  } catch (e) {
    // ignore
  }
}

let mainWindow = null;
let pendingOpenPath = null;

function createWindow() {
  // 读取标题栏模式偏好
  let useNativeTitlebar = false;
  try {
    const storePath = path.join(app.getPath('userData'), 'titlebar-mode.json');
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      useNativeTitlebar = !!data.native;
    }
  } catch (e) { /* 忽略 */ }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Mrarviher',
    icon: path.join(__dirname, '../Assets/favicon.ico'),
    frame: useNativeTitlebar,
    titleBarStyle: useNativeTitlebar ? 'default' : 'hidden',
    trafficLightPosition: { x: 10, y: 10 },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../index.html'));
  mainWindow.setMenu(null);
  // DevTools: Press F12 to open (or via menu)
  mainWindow.once('ready-to-show', () => {
    console.log('mainWindow ready-to-show. pendingOpenPath =', pendingOpenPath, 'initialArgPath =', initialArgPath);
    // 优先处理命令行传入的文件（支持文本文件）
    if (initialArgPath) {
      const ext = path.extname(initialArgPath).toLowerCase();
      // 支持的文本文件类型
      const textExts = ['.md', '.markdown', '.txt', '.log', '.json', '.xml', '.html', '.css', '.js', '.ts', '.py', '.c', '.cpp', '.h', '.java', '.go', '.rs', '.sh', '.bat', '.ps1', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.env', '.gitignore'];
      if (textExts.includes(ext)) {
        console.log('Opening initialArgPath in renderer:', initialArgPath);
        mainWindow.webContents.send('open-file', initialArgPath);
        rememberFile(initialArgPath);
      } else {
        console.log('Initial arg is not a supported text file, ignoring:', initialArgPath);
      }
      initialArgPath = null;
    } else if (pendingOpenPath && mainWindow) {
      console.log('Sending open-file to renderer for', pendingOpenPath);
      mainWindow.webContents.send('open-file', pendingOpenPath);
      rememberFile(pendingOpenPath);
      pendingOpenPath = null;
    } else {
      // 没有外部文件参数时，检查是否允许恢复上次文件
      const state = loadState();
      if (state.restoreFile !== false) {
        const lastFile = getLastOpenedFile();
        if (lastFile && fs.existsSync(lastFile)) {
          console.log('Restoring last opened file:', lastFile);
          mainWindow.webContents.send('open-file', lastFile);
        }
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  let forceClose = false;

  // 关闭前检查是否有未保存的修改
  mainWindow.on('close', async (e) => {
    if (forceClose) return;
    if (mainWindow && !mainWindow.isDestroyed()) {
      let dirty = false;
      try {
        dirty = await mainWindow.webContents.executeJavaScript(
          'window.__isDirty ? window.__isDirty() : false'
        );
      } catch (err) {
        console.log('check-unsaved failed:', err.message);
      }
      if (dirty) {
        // 检查是否开启了自动保存且有文件路径，如果是则直接静默保存
        const autoSave = await mainWindow.webContents.executeJavaScript(
          'window.__autoSaveInfo ? window.__autoSaveInfo() : null'
        );
        if (autoSave && autoSave.enabled && autoSave.filePath) {
          // 自动保存开启 + 有文件路径 -> 直接保存并关闭
          e.preventDefault();
          mainWindow.webContents.send('save-and-close');
          return;
        }
        // 否则弹出确认对话框
        e.preventDefault();
        const result = dialog.showMessageBoxSync(mainWindow, {
          type: 'warning',
          buttons: ['保存', '不保存', '取消'],
          defaultId: 0,
          cancelId: 2,
          title: 'Mrarviher',
          message: '当前文件有未保存的修改，是否保存？',
        });
        if (result === 0) {
          // 用户选择"保存"，发送保存命令给渲染进程
          forceClose = true;
          mainWindow.webContents.send('save-and-close');
        } else if (result === 1) {
          // 用户选择"不保存"，强制销毁窗口
          mainWindow.destroy();
        }
        // result === 2 表示取消，e.preventDefault() 已经阻止了关闭
      }
    }
  });

  mainWindow.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });
}

const template = [
  {
    label: '文件',
    submenu: [
      {
        label: '新建',
        accelerator: 'Ctrl+N',
        click: () => {
          mainWindow && mainWindow.webContents.send('new-file');
        },
      },
      {
        label: '打开',
        accelerator: 'Ctrl+O',
        click: async () => {
          if (!mainWindow) return;
          const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [
              { name: '文本文件', extensions: ['md', 'markdown', 'txt', 'log', 'json', 'xml', 'html', 'css', 'js', 'ts', 'py', 'c', 'cpp', 'h', 'java', 'go', 'rs', 'sh', 'bat', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'env'] },
              { name: '所有文件', extensions: ['*'] }
            ],
          });
          if (!result.canceled && result.filePaths.length > 0) {
            mainWindow.webContents.send('open-file', result.filePaths[0]);
          }
        },
      },
      {
        label: '保存',
        accelerator: 'Ctrl+S',
        click: () => {
          mainWindow && mainWindow.webContents.send('save-file');
        },
      },
      {
        label: '另存为',
        accelerator: 'Ctrl+Shift+S',
        click: () => {
          mainWindow && mainWindow.webContents.send('save-as-file');
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        accelerator: 'Ctrl+Q',
        click: () => {
          app.quit();
        },
      },
    ],
  },
  {
    label: '编辑',
    submenu: [
      { label: '撤销', accelerator: 'Ctrl+Z', role: 'undo' },
      { label: '重做', accelerator: 'Ctrl+Y', role: 'redo' },
      { type: 'separator' },
      { label: '剪切', accelerator: 'Ctrl+X', role: 'cut' },
      { label: '复制', accelerator: 'Ctrl+C', role: 'copy' },
      { label: '粘贴', accelerator: 'Ctrl+V', role: 'paste' },
      { label: '全选', accelerator: 'Ctrl+A', role: 'selectAll' },
    ],
  },
  {
    label: '视图',
    submenu: [
      {
        label: '切换视图',
        accelerator: 'Ctrl+P',
        click: () => {
          mainWindow && mainWindow.webContents.send('toggle-preview');
        },
      },
      {
        label: '切换主题',
        accelerator: 'Ctrl+Shift+T',
        click: () => {
          mainWindow && mainWindow.webContents.send('toggle-theme');
        },
      },
      { type: 'separator' },
      { label: '刷新', accelerator: 'F5', role: 'reload' },
      { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
    ],
  },
  {
    label: '帮助',
    submenu: [
      {
        label: '关于',
        click: () => {
          if (!mainWindow) return;
          dialog.showMessageBox(mainWindow, {
            title: '关于 Mrarviher',
            message: 'Mrarviher v1.0.0\n\n一个简洁高效的文本编辑器，支持 Markdown 渲染与纯文本编辑。\n\n作者: Ruanftrix',
          });
        },
      },
    ],
  },
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  console.log('app.open-file event received for:', filePath, 'mainWindow exists:', !!mainWindow);
  pendingOpenPath = filePath;
  rememberFile(filePath);
});

ipcMain.handle('show-save-dialog', async () => {
  if (!mainWindow) return {};
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: '文本文件', extensions: ['md', 'txt', 'log', 'json', 'xml', 'html', 'css', 'js', 'ts'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    defaultPath: 'untitled.txt',
  });
  return result;
});

// 另存为时选择编码
ipcMain.handle('select-save-encoding', async (event, currentEncoding) => {
  if (!mainWindow) return currentEncoding;
  const encodings = [
    { label: 'UTF-8 (推荐)', value: 'utf-8' },
    { label: 'ANSI (GBK/系统默认)', value: 'ansi' },
    { label: 'GBK (中文)', value: 'gbk' },
    { label: 'GB2312 (简体中文)', value: 'gb2312' },
    { label: 'Big5 (繁体中文)', value: 'big5' },
    { label: 'UTF-16 LE', value: 'utf-16le' },
    { label: 'UTF-16 BE', value: 'utf-16be' }
  ];

  // 找到当前编码的索引，作为默认选中项
  let defaultIndex = encodings.findIndex(e => e.value === currentEncoding);
  if (defaultIndex < 0) defaultIndex = 0;

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: '选择保存编码',
    message: '请选择文件保存时使用的编码',
    buttons: [...encodings.map(e => e.label), '取消'],
    cancelId: encodings.length,
    defaultId: defaultIndex,
  });

  if (result.response === encodings.length) return null; // 取消
  return encodings[result.response].value;
});

ipcMain.on('open-external', (event, url) => {
  if (!url) return;
  shell.openExternal(url).catch(() => {});
});

// 彩蛋：切换标题栏模式并重启
ipcMain.on('switch-titlebar-mode', (event, useNative) => {
  const storePath = path.join(app.getPath('userData'), 'titlebar-mode.json');
  fs.writeFileSync(storePath, JSON.stringify({ native: !!useNative }));
  app.relaunch();
  app.exit(0);
});

ipcMain.on('open-file-manual', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '文本文件', extensions: ['md', 'markdown', 'txt', 'log', 'json', 'xml', 'html', 'css', 'js', 'ts', 'py', 'c', 'cpp'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  if (!res.canceled && res.filePaths.length) {
    const filePath = res.filePaths[0];
    console.log('open-file-manual selected:', filePath);

    // 读取文件并检测/选择编码
    let content;
    let encoding = 'utf-8';
    const rawBuffer = fs.readFileSync(filePath);

    // 检测是否为纯UTF-8
    const isUtf8 = iconv.decode(rawBuffer, 'utf-8');
    const reEncoded = iconv.encode(isUtf8, 'utf-8');

    if (Buffer.compare(rawBuffer, reEncoded) !== 0) {
      // 不是UTF-8，弹出编码选择对话框
      const encodings = [
        { label: 'ANSI (GBK/系统默认)', value: 'ansi' },
        { label: 'GBK (中文)', value: 'gbk' },
        { label: 'GB2312 (简体中文)', value: 'gb2312' },
        { label: 'Big5 (繁体中文)', value: 'big5' },
        { label: 'Shift-JIS (日文)', value: 'shift_jis' },
        { label: 'EUC-KR (韩文)', value: 'euc_kr' },
        { label: 'ISO-8859-1 (西欧)', value: 'iso-8859-1' },
        { label: 'UTF-16 LE', value: 'utf-16le' },
        { label: 'UTF-16 BE', value: 'utf-16be' }
      ];

      const encodingRes = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: '选择文件编码',
        message: `文件 "${path.basename(filePath)}" 可能不是 UTF-8 编码`,
        detail: '请选择正确的编码以正确显示内容',
        buttons: encodings.map(e => e.label),
        cancelId: -1
      });

      if (encodingRes.response >= 0 && encodingRes.response < encodings.length) {
        encoding = encodings[encodingRes.response].value;
      } else {
        return; // 用户取消
      }

      content = iconv.decode(rawBuffer, encoding === 'ansi' ? 'gbk' : encoding);
    } else {
      content = isUtf8;
    }

    mainWindow.webContents.send('open-file-with-encoding', filePath, content, encoding);
    rememberFile(filePath);
  }
})

// 接收来自 renderer 的调试日志并打印到主进程终端
ipcMain.on('renderer-log', (event, msg) => {
  try {
    console.log('renderer-log:', msg);
  } catch (e) {}
});

// 提供 renderer 查询首次检测到的 CLI 文件路径（只注册一次）
ipcMain.handle('get-initial-arg', () => {
  return initialArgDetected || null;
});

// renderer 通知主进程当前文件路径变更（保存/另存为/打开时）
ipcMain.on('file-path-changed', (event, filePath) => {
  rememberFile(filePath);
});

// 渲染进程请求关闭窗口（保存完成后）
ipcMain.on('request-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

// 窗口控制 IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

// 渲染进程日志转发
ipcMain.on('renderer-log', (_event, msg) => {
  console.log('[Renderer]', msg);
});

// 读取系统已安装字体列表
ipcMain.handle('get-system-fonts', async () => {
  console.log('[Main] get-system-fonts: 开始读取系统字体...');
  try {
    // Windows: 通过 PowerShell 从注册表读取字体名称
    const result = execSync(
      `powershell -NoProfile -Command "Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts','HKCU:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts' -ErrorAction SilentlyContinue | ForEach-Object { $_.PSObject.Properties } | Where-Object { $_.Name -notmatch 'PS(Path|ParentPath|Children|Drive|Provider|CimClass|TypeNames)' } | ForEach-Object { ($_.Name -split '\\(')[0].Trim() } | Sort-Object -Unique"`,
      { encoding: 'utf-8', maxBuffer: 1024 * 1024 }
    );
    const fonts = result.split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 1 && !f.startsWith('('));
    console.log(`[Main] get-system-fonts: 成功读取 ${fonts.length} 个字体`);
    return [...new Set(fonts)];
  } catch (e) {
    console.error('[Main] get-system-fonts: 失败 -', e.message);
    return [];
  }
});

// F11 全屏切换
app.on('ready', () => {
  globalShortcut.register('F11', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });
});