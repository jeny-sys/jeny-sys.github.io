---
title: "手机远程控制电脑完整教程 — SSH + Tailscale + Termius"
date: 2026-05-03
draft: false
categories: ["教程"]
tags: ["SSH", "Tailscale", "Termius", "远程控制", "Windows"]
description: "SSH + Tailscale + Termius，三步实现随时随地访问你的电脑"
---

## 你会得到什么

完成本教程后，你将拥有一个**安全、稳定、零成本**的远程控制方案：

-  **随时随地连接**：不管电脑在哪，手机有网就能连
-  **端到端加密**：WireGuard 协议，不暴露任何端口
-  **完全免费**：所有工具均为免费版本，无隐藏收费

## 前置条件

| 项目 | 要求 |
|------|------|
| 电脑系统 | Windows 10（1809+）或 Windows 11 |
| 手机系统 | iOS 15+ 或 Android 8+ |
| 网络要求 | 电脑和手机各自能上网即可（不需要同一局域网） |
| 管理员权限 | 安装 OpenSSH 需要管理员 PowerShell |
| 账号准备 | 一个 Google / Microsoft / Apple / GitHub 账号（用于 Tailscale 登录） |

## 整体架构

整个方案由三个组件组成，各司其职：

```
 手机 (Termius) →  Tailscale (WireGuard 加密隧道) →  电脑 (OpenSSH Server)
```

- **OpenSSH Server**：电脑上的 SSH 服务端，提供远程终端访问能力
- **Tailscale**：虚拟组网工具，让手机和电脑在任意网络下互通
- **Termius**：手机上的 SSH 客户端，提供图形化终端操作界面

---

## 第一部分：电脑端配置

### 1. 安装 OpenSSH Server

先检查系统是否已有 SSH 服务端。以**管理员身份**打开 PowerShell，运行：

```powershell
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'
```

如果显示 `State : Installed`，跳到第 2 步。如果报错或未安装，按以下方式手动安装：

```powershell
# 方式一：通过 Windows 功能安装（推荐先试这个）
Add-WindowsCapability -Online -Name "OpenSSH.Server~~~~0.0.1.0"
```

> ⚠️ **Windows Home 用户注意：** 上面的命令可能因 COM 异常失败。如果失败，从 GitHub 手动下载。

```powershell
# 方式二：从 GitHub 下载（方式一失败时使用）
curl -sL "https://github.com/PowerShell/Win32-OpenSSH/releases/download/v9.8.1.0p1-Preview/OpenSSH-Win64.zip" -o $env:TEMP\openssh.zip
Expand-Archive $env:TEMP\openssh.zip -DestinationPath C:\ProgramData\OpenSSH -Force

# 安装服务
& "C:\ProgramData\OpenSSH\install-sshd.ps1"
```

安装完成后，设置开机自启并启动服务：

```powershell
Set-Service -Name sshd -StartupType Automatic
Start-Service sshd

# 验证服务状态（应显示 RUNNING）
sc query sshd
```

### 2. 配置防火墙

SSH 默认使用 22 端口，需要在防火墙中放行：

```powershell
New-NetFirewallRule -Name sshd -DisplayName "OpenSSH Server (sshd)" `
  -Enabled True -Direction Inbound -Protocol TCP `
  -Action Allow -LocalPort 22
```

> ✅ 验证：运行 `netstat -an | findstr ":22"`，看到 `LISTENING` 就成功了。

### 3. 配置 SSH 密钥认证

密钥认证是 SSH 最佳实践 —— 无需输入密码，且安全性远高于密码。

**第 1 步：生成密钥对**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""

# 生成后会看到公钥路径，通常是：
#   ~/.ssh/id_ed25519      (私钥 —— 传到手机)
#   ~/.ssh/id_ed25519.pub  (公钥 —— 留在电脑)
```

**第 2 步：将公钥添加到 authorized_keys**

```bash
mkdir -p ~/.ssh
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
```

>  **管理员用户必须注意！**
> 如果你的用户在 `administrators` 组中，OpenSSH 不会读取 `~/.ssh/authorized_keys`，而是读取 `C:\ProgramData\ssh\administrators_authorized_keys`。需要额外操作：

```powershell
# 复制公钥到系统级位置
Copy-Item "$env:USERPROFILE\.ssh\authorized_keys" `
  "C:\ProgramData\ssh\administrators_authorized_keys"

# 设置严格的文件权限（必须！否则 SSH 会拒绝读取）
icacls "C:\ProgramData\ssh\administrators_authorized_keys" /inheritance:r `
  /grant:r "$env:USERNAME:F" /grant:r "Administrators:F" /grant:r "SYSTEM:F"
```

**第 3 步：配置 sshd 并重启**

```powershell
# 编辑 sshd_config，确保以下配置未被注释：
#   PubkeyAuthentication yes
#   PasswordAuthentication yes  （可选，作为备用）

# 用记事本编辑（可选）
notepad C:\ProgramData\ssh\sshd_config

# 重启服务使配置生效
Restart-Service sshd
```

> ✅ 验证：在电脑上运行 `ssh -o BatchMode=yes %USERNAME%@127.0.0.1 "echo OK"`，看到 `OK` 就成功了。

---

## 第二部分：组网配置

### 4. 安装 Tailscale

Tailscale 基于 WireGuard 协议，**不需要路由器端口转发**，不需要公网 IP，两台设备登录同一账号即可互通。

**电脑端：**

```powershell
# 安装
winget install Tailscale.Tailscale

# 安装后会弹出登录窗口，用 Google/Microsoft/GitHub 账号登录
# 登录后查看分配的虚拟 IP
tailscale ip
```

> ℹ️ **输出示例：** `100.x.x.x` 就是你的 Tailscale 地址，这个地址**不会变**，不管电脑在哪个网络。

**手机端：**

-  **iOS**：App Store 搜索 **Tailscale**，安装后用**同一账号**登录
-  **Android**：Google Play 搜索 **Tailscale**，安装后用**同一账号**登录

登录成功后，两台设备会在 Tailscale 管理后台看到彼此：

```powershell
# 查看所有设备及其 IP
tailscale status

# 输出示例：
# 100.91.248.99   my-pc      username@  windows  -
# 100.112.7.106   my-phone   username@  iOS      -
```

### 5. 配置 Termius

**第 1 步：安装 Termius**

在 App Store 或 Google Play 搜索 **Termius** 并安装（免费版即可）。

**第 2 步：导入 SSH 私钥**

将电脑上的私钥文件 `~/.ssh/id_ed25519` 传到手机（微信文件传输 / 邮件 / AirDrop 均可），然后在 Termius 中：

1. 打开 Termius → 底部 Keychain
2. 点击左上角 **+** → Import Key
3. 选择传过来的 `id_ed25519` 文件导入

**第 3 步：添加主机**

1. 底部 HOSTS → 右下角 **+** → New Host
2. 填写连接信息（见下方表格）
3. 点击右上角 **√** 保存

| 字段 | 填写内容 |
|------|----------|
| Title | 随意，如 `My PC` |
| SSH | 保持开启（绿色） |
| Hostname | 填写 Tailscale 分配的 IP，如 `100.91.248.99` |
| Port | `22` |
| Username | 你的 Windows 用户名 |
| Password | **不填**（使用密钥认证） |

>  **常见错误：** Hostname 只填 IP 地址，不要填成 `用户名@IP`。Username 在单独的 Username 字段填写。

**第 4 步：连接**

点击保存好的 Host，首次连接会提示 **Host Key Verification**，点击 **Continue**，进入终端界面即表示连接成功。

---

## 附录

### 快速参考

```bash
# 内网直连（电脑和手机在同一 WiFi 时可用）
ssh @username@192.168.x.x

# Tailscale 远程连接（任意网络）
ssh @username@100.x.x.x

# 查看 sshd 服务状态
sc query sshd

# 查看 Tailscale 状态
tailscale status

# 查看电脑局域网 IP
ipconfig | findstr "IPv4"
```

### 故障排查

| 问题 | 解决方法 |
|------|----------|
| Permission denied (publickey) | 1. 检查 `authorized_keys` 文件权限，用 `icacls` 修复<br>2. 管理员用户需检查 `C:\ProgramData\ssh\administrators_authorized_keys`<br>3. 确保私钥已正确导入 Termius |
| Connection refused | 1. 运行 `Start-Service sshd` 启动服务<br>2. 检查防火墙规则是否存在：`Get-NetFirewallRule -Name sshd`<br>3. 确认 Tailscale 两台设备都在线 |
| Address resolution failure | Hostname 填了 `user@ip` 格式，改为只填 `ip` |
| openssh-events.man 缺失 | 手动下载安装时，确保所有文件都从 zip 解压到了安装目录，包括 `.man` 文件 |
| Tailscale 连不上 | 1. 确认两台设备登录了同一 Tailscale 账号<br>2. 运行 `tailscale status` 确认双方在线<br>3. 检查手机 Tailscale 是否开启了 VPN |

### 安全建议

**✅ 你已经很安全**：WireGuard 端到端加密 + 密钥认证 + 零公网暴露，安全性远超传统 VPN 方案

**⚠️ 还可以更安全**：给 Termius 设置面容锁/指纹锁，防止手机丢失后密钥泄露

**最佳实践：**
- 不要把 SSH 端口（22）直接暴露到公网，始终通过 Tailscale 访问
- 定期在 Tailscale 管理后台检查已授权设备列表
- 不再使用的设备及时从 Tailscale 移除

---

## Agent 部署指令

> 以下内容供 AI Agent（Claude / ChatGPT / Copilot 等）自动执行部署。人类读者可以跳过此节。

### 执行规则

1. **每一步执行前**：先用检测命令确认当前状态，避免重复操作
2. **每一步执行后**：运行验证命令确认成功，再进入下一步
3. **需要管理员权限时**：明确告知用户，并给出需要手动执行的命令（带 `# MANUAL: admin` 标记）
4. **遇到错误时**：查阅"Agent 错误处理"章节
5. **所有命令必须逐条执行**：不要合并多条命令到一行

### 环境变量

执行前确认或让用户填写：

```
WINDOWS_USERNAME = <运行 whoami 的输出，取 \ 后的部分>
INSTALL_DIR      = C:\ProgramData\OpenSSH
SSH_CONFIG_DIR   = C:\ProgramData\ssh
Tailscale_IP     = <运行 tailscale ip 后的输出>
```

### Step 1：安装 OpenSSH Server

```powershell
# 检测
Test-Path "C:\Windows\System32\OpenSSH\sshd.exe"
Get-Service sshd -ErrorAction SilentlyContinue
```

- `sshd.exe` 存在且服务 RUNNING → 跳到 Step 2
- 服务存在但未运行 → `Start-Service sshd` → 跳到 Step 2
- 都不存在 → 继续：

```powershell
# 尝试系统安装
# MANUAL: admin
Add-WindowsCapability -Online -Name "OpenSSH.Server~~~~0.0.1.0"
```

- 成功 → 跳到安装服务
- 失败 → 手动下载：

```powershell
$url = "https://github.com/PowerShell/Win32-OpenSSH/releases/download/v9.8.1.0p1-Preview/OpenSSH-Win64.zip"
Invoke-WebRequest -Uri $url -OutFile "$env:TEMP\openssh.zip"
Expand-Archive "$env:TEMP\openssh.zip" -DestinationPath "$env:TEMP\openssh" -Force
New-Item -ItemType Directory -Path "$env:INSTALL_DIR" -Force | Out-Null
Copy-Item "$env:TEMP\openssh\OpenSSH-Win64\*" "$env:INSTALL_DIR" -Recurse -Force

# 确认关键文件
$required = @("sshd.exe", "sshd-session.exe", "ssh-shellhost.exe", "openssh-events.man", "install-sshd.ps1")
foreach ($f in $required) { if (-not (Test-Path "$env:INSTALL_DIR\$f")) { Write-Error "Missing: $f" } }
```

安装并启动：

```powershell
# MANUAL: admin
& "$env:INSTALL_DIR\install-sshd.ps1"
Set-Service -Name sshd -StartupType Automatic
Start-Service sshd
```

验证：

```powershell
Get-Service sshd | Select-Object Status, StartType   # 应 RUNNING
netstat -an | Select-String ":22\s+LISTENING"          # 应 LISTENING
```

### Step 2：配置防火墙

```powershell
# 检测
Get-NetFirewallRule -Name sshd -ErrorAction SilentlyContinue | Select-Object Name, Enabled, Action
```

- 已存在且 Enabled=True, Action=Allow → 跳到 Step 3
- 不存在 →

```powershell
# MANUAL: admin
New-NetFirewallRule -Name sshd -DisplayName "OpenSSH Server (sshd)" `
  -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

验证：

```powershell
Get-NetFirewallRule -Name sshd
netstat -an | Select-String ":22"
```

### Step 3：配置 SSH 密钥认证

```bash
# 检测是否已有密钥
ls ~/.ssh/id_ed25519 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND"
```

- `EXISTS` → 跳到配置 authorized_keys
- `NOT_FOUND` → 生成：

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N "" -q
```

配置 authorized_keys：

```bash
mkdir -p ~/.ssh
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
sort -u ~/.ssh/authorized_keys -o ~/.ssh/authorized_keys
```

检测是否管理员用户：

```powershell
$isAdmin = (Get-LocalGroupMember -Group "Administrators" | Where-Object { $_.Name -like "*\$env:USERNAME" }) -ne $null
Write-Host "Is admin: $isAdmin"
```

- `True` → 必须执行管理员专用配置：
```powershell
# MANUAL: admin
Copy-Item "$env:USERPROFILE\.ssh\authorized_keys" "$env:SSH_CONFIG_DIR\administrators_authorized_keys"
icacls "$env:SSH_CONFIG_DIR\administrators_authorized_keys" /inheritance:r `
  /grant:r "$env:USERNAME:F" /grant:r "Administrators:F" /grant:r "SYSTEM:F"
```
- `False` → 跳过

确保 sshd_config 启用密钥认证：

```powershell
$config = Get-Content "$env:SSH_CONFIG_DIR\sshd_config"
if (-not ($config | Select-String "^[^#]*PubkeyAuthentication\s+yes")) {
    $config = $config -replace '#PubkeyAuthentication yes', 'PubkeyAuthentication yes'
    $config | Set-Content "$env:SSH_CONFIG_DIR\sshd_config"
}
```

重启并验证：

```powershell
# MANUAL: admin
Restart-Service sshd
```

```bash
ssh -o BatchMode=yes -o StrictHostKeyChecking=no $USERNAME@127.0.0.1 "echo KEY_AUTH_OK"
```

- 输出 `KEY_AUTH_OK` → 继续 Step 4
- `Permission denied` → 查阅错误处理

### Step 4：安装 Tailscale

```powershell
Get-Command tailscale -ErrorAction SilentlyContinue | Select-Object Source
```

- 已安装 → 跳到确认登录
- 未安装 →

```powershell
winget install Tailscale.Tailscale --accept-package-agreements --accept-source-agreements
```

> 安装后会弹出浏览器窗口，用户需用 Google/Microsoft/Apple/GitHub 账号登录。

确认登录：

```powershell
$tailscaleIP = tailscale ip 2>&1
if ($tailscaleIP -match "^100\.") { Write-Host "Tailscale OK: $tailscaleIP" }
else { Write-Host "Tailscale not logged in. Please open Tailscale app and log in." }
```

告诉用户 Tailscale IP，用于手机 Termius Hostname。

### Step 5：生成 Termius 配置

输出给用户：

```
=== Termius 配置 ===
Title:      My PC
Hostname:   <Tailscale_IP>
Port:       22
Username:   <WINDOWS_USERNAME>

=== 导入密钥 ===
1. 将 ~/.ssh/id_ed25519 传到手机
2. Termius → Keychain → + → Import Key
3. Termius → HOSTS → + → New Host → 填入上方信息
4. 点击 Host 连接

⚠️ Hostname 只填 IP，不要填成 username@ip
```

### Agent 错误处理

**Permission denied (publickey)**：

```powershell
# 1. 确认用户是否在 administrators 组
net localgroup administrators
# 2. 如果是，检查 administrators_authorized_keys 权限
icacls "$env:SSH_CONFIG_DIR\administrators_authorized_keys"
# 3. verbose 模式
ssh -vvv $USERNAME@127.0.0.1 "echo test" 2>&1 | Select-String "debug" | Select-Object -Last 30
```

**Connection refused**：

```powershell
Get-Service sshd
netstat -an | Select-String ":22"
Get-NetFirewallRule -Name sshd | Get-NetFirewallPortFilter
# MANUAL: admin
Start-Service sshd
```

**Tailscale 连不通**：

```powershell
tailscale status
tailscale ping <对方Tailscale_IP>
```

### Agent 最终验证

```
□ sc query sshd                  → STATE: RUNNING
□ netstat -an                    → :22 LISTENING
□ ssh %USERNAME%@127.0.0.1 "echo OK" → OK
□ tailscale ip                   → 100.x.x.x
□ 手机 Tailscale                 → VPN 已开启
□ 手机 Termius 连接              → 成功进入终端
```

---

*2026-05-03 · Tested on Windows 11 Home · OpenSSH 9.8.1 · Tailscale + Termius*