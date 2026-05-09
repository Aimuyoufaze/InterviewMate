# 🎙️ Interview Mate

**AI 模拟面试平台** —— 专为考研/保研/留学面试准备设计。

支持输入导师姓名，自动搜索论文和公开信息，生成专属面试官，进行模拟面试。

---

## 📦 快速上手（写给第一次用的人）

> 下面每一步都有详细说明，跟着做就行。

### 你需要准备什么？

1. **一台电脑**（Windows / macOS / Linux 都可以）
2. **Python 3.10 或更高版本**
   - 不知道有没有 Python？打开终端（Terminal），输入 `python3 --version` 回车
   - 如果显示 `Python 3.xx` 就说明有了
   - 没有的话去 https://python.org 下载安装
3. **DeepSeek API Key（免费的）**
   - 访问 https://platform.deepseek.com 注册账号
   - 登录后点左边「API Keys」→ 创建 Key → 复制（以 `sk-` 开头）
   - 记下来，等下要用

---

### 第 1 步：下载这个项目

打开终端（Terminal），粘贴下面这行，回车：

```bash
git clone https://github.com/aimuyoufaze/InterviewMate.git
cd InterviewMate
```

> 💡 这行命令会把整个项目下载到你电脑上，然后进入项目文件夹。

---

### 第 2 步：配置 API Key

```bash
cd backend
cp .env.example .env
```

> 💡 这行命令创建了一个配置文件 `.env`。

现在编辑这个 `.env` 文件。用下面的命令直接写入你的 Key：

```bash
echo "DEEPSEEK_API_KEY=这里填你的Key" > .env
echo "DEEPSEEK_BASE_URL=https://api.deepseek.com" >> .env
```

> ⚠️ 把 `这里填你的Key` 替换成刚才复制的 Key（比如 `sk-1234567890abcdef`）
>
> ✅ 完成后可以用 `cat .env` 查看一下，应该显示：
> ```
> DEEPSEEK_API_KEY=sk-你刚才复制的key
> DEEPSEEK_BASE_URL=https://api.deepseek.com
> ```

---

### 第 3 步：安装依赖

还是在 `backend` 文件夹里，继续执行：

```bash
python3 -m venv .venv
```

> 💡 创建一个独立的 Python 环境，不影响你电脑上其他程序。

```bash
source .venv/bin/activate
```

> 💡 激活这个环境。Windows 用户请执行 `.venv\Scripts\activate`

```bash
pip install -r requirements.txt
```

> 💡 安装本项目需要的 Python 包。可能需要几十秒，耐心等。

---

### 第 4 步：启动项目

回到项目根目录：

```bash
cd ..
```

一键启动：

```bash
bash start.sh
```

看到下面这样的输出就说明成功了：

```
🚀 启动 Interview Mate...
📡 启动后端 (port 8000)...
🌐 启动前端 (port 8080)...

✅ 一切就绪！
   前端: http://localhost:8080
   后端: http://localhost:8000
```

---

### 第 5 步：打开使用

1. 打开浏览器（Chrome / Safari / Edge 都可以）
2. 地址栏输入 `http://localhost:8080`
3. 按 **回车**

你会看到 Interview Mate 的界面 🎉

---

### 怎么停止？

回到终端，按 **`Ctrl + C`**（两个键同时按）。

下次想再用，只需要：

```bash
cd ~/Desktop/InterviewMate
bash start.sh
```

---

### 遇到问题怎么办？

| 问题 | 解决方法 |
|------|---------|
| `Address already in use` | 上次没关干净，执行 `lsof -ti:8000 -ti:8080 \| xargs kill -9` 再重新启动 |
| `DEEPSEEK_API_KEY not set` | 忘了配置 `.env`，回到第 2 步 |
| `command not found: python3` | 没有安装 Python，去 https://python.org 下载 |
| 界面打不开 | 确认启动成功后有 `http://localhost:8080` 的提示，地址栏别输错了 |

---

## 🔧 了解更多

### 4 种通用面试官

| 类型 | 说明 |
|------|------|
| 😤 严厉型 | 严格追问细节，不容易给好评 |
| 😊 温和型 | 鼓励式引导，会给提示 |
| 🔍 追问型 | 连环追问，测试知识深度 |
| 🧠 苏格拉底型 | 通过反问引导思考 |

### 导师蒸馏（🎓 核心功能）

左侧输入导师姓名和机构，点击「🎯 提取 Persona」：

1. 🔍 自动搜索 ArXiv 论文（最多 15 篇）
2. 🌐 搜索 Google Scholar / 维基百科 / 个人主页
3. 📄 读取网页内容
4. 🧠 DeepSeek AI 分析 → 生成导师画像
5. 💾 存入数据库（重启不丢）

提取完成后，选择该导师作为面试官，方向选择「🎓 该教授自身专业」即可开始面试。

### 如何删除导师？

点击导师卡片上的 🗑️ 按钮即可。

---

## 📁 项目结构

```
InterviewMate/
├── backend/                # 后端（Python）
│   ├── main.py            # 服务入口
│   ├── interview.py       # 面试引擎
│   ├── persona.py         # 导师管理 + 提取
│   ├── personas.db        # 数据库（自动生成）
│   ├── .env.example       # API Key 配置模板
│   └── requirements.txt   # 依赖清单
├── frontend/               # 前端（纯 HTML）
│   └── index.html         # 单页应用
├── start.sh                # 一键启动脚本
└── README.md               # 本文件
```

---

## 💡 小贴士

- 想**改代码**？用 VS Code 或任何编辑器打开项目文件夹
- 想**贡献代码**？Fork 这个仓库，改完后提 Pull Request
- 想**提问**？提 Issue：https://github.com/aimuyoufaze/InterviewMate/issues

---

*Happy Interviewing! 🎙️*
