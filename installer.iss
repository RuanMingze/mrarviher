; Mrarviher 安装程序脚本 (Inno Setup)
; 使用方法: 先运行 pnpm run build:win，然后双击本脚本或用 Inno Setup Compiler 编译

#define MyAppName "Mrarviher"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Ruanftrix"
#define MyAppExeName "mrarviher.exe"
#define MyAppSourceDir "dist\win-unpacked"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; 输出设置
OutputDir=installer
OutputBaseFilename=Mrarviher-Setup-{#MyAppVersion}
SetupIconFile=Assets\favicon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardSizePercent=120
WizardStyle=modern
; 权限
PrivilegesRequired=admin

[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"
; 注意：运行前需先从 https://github.com/kira-96/Inno-Setup-Chinese-Simplified-Translation/blob/main/ChineseSimplified.isl 下载中文isl放到Inno Setup的Languages目录

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

[Files]
Source: "{#MyAppSourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; 注意: 运行前请确保 {#MyAppSourceDir} 目录存在（先执行 pnpm run build:win）

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\卸载 {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

; ==================== 注册表 - 文件关联 ====================
[Registry]
; --- .md 文件关联 ---
Root: HKCR; Subkey: ".md"; ValueType: string; ValueName: ""; ValueData: "mrarviher.md"; Flags: uninsdeletevalue
Root: HKCR; Subkey: ".md"; ValueType: string; ValueName: "Content Type"; ValueData: "text/markdown"; Flags: uninsdeletevalue
Root: HKCR; Subkey: ".md"; ValueType: string; ValueName: "PerceivedType"; ValueData: "text"; Flags: uninsdeletevalue
Root: HKCR; Subkey: "mrarviher.md"; ValueType: string; ValueName: ""; ValueData: "Markdown 文档"; Flags: uninsdeletekey
Root: HKCR; Subkey: "mrarviher.md\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#MyAppExeName},0"
Root: HKCR; Subkey: "mrarviher.md\shell"; ValueType: string; ValueName: ""; ValueData: "open"
Root: HKCR; Subkey: "mrarviher.md\shell\open"; ValueType: string; ValueName: ""; ValueData: "用 Mrarviher 打开"
Root: HKCR; Subkey: "mrarviher.md\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""

; --- .markdown 文件关联 ---
Root: HKCR; Subkey: ".markdown"; ValueType: string; ValueName: ""; ValueData: "mrarviher.md"; Flags: uninsdeletevalue
Root: HKCR; Subkey: ".markdown"; ValueType: string; ValueName: "Content Type"; ValueData: "text/markdown"; Flags: uninsdeletevalue
Root: HKCR; Subkey: ".markdown"; ValueType: string; ValueName: "PerceivedType"; ValueData: "text"; Flags: uninsdeletevalue

; --- .txt 文件关联 ---
Root: HKCR; Subkey: ".txt"; ValueType: string; ValueName: ""; ValueData: "mrarviher.txt"; Flags: uninsdeletevalue
Root: HKCR; Subkey: ".txt"; ValueType: string; ValueName: "Content Type"; ValueData: "text/plain"; Flags: uninsdeletevalue
Root: HKCR; Subkey: ".txt"; ValueType: string; ValueName: "PerceivedType"; ValueData: "text"; Flags: uninsdeletevalue
Root: HKCR; Subkey: "mrarviher.txt"; ValueType: string; ValueName: ""; ValueData: "文本文件"; Flags: uninsdeletekey
Root: HKCR; Subkey: "mrarviher.txt\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#MyAppExeName},0"
Root: HKCR; Subkey: "mrarviher.txt\shell"; ValueType: string; ValueName: ""; ValueData: "open"
Root: HKCR; Subkey: "mrarviher.txt\shell\open"; ValueType: string; ValueName: ""; ValueData: "用 Mrarviher 打开"
Root: HKCR; Subkey: "mrarviher.txt\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""

; --- 当前用户 Open With 列表 ---
Root: HKCU; Subkey: "Software\Classes\.md"; ValueType: string; ValueName: ""; ValueData: "mrarviher.md"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.markdown"; ValueType: string; ValueName: ""; ValueData: "mrarviher.md"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.txt"; ValueType: string; ValueName: ""; ValueData: "mrarviher.txt"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\mrarviher.md"; ValueType: string; ValueName: ""; ValueData: "Mrarviher"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\mrarviher.md\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#MyAppExeName},0"
Root: HKCU; Subkey: "Software\Classes\mrarviher.md\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""
