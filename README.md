# Interview Mate 🎙️

AI Agent 模拟面试平台——为申请研究生项目的学生设计。支持**真实导师蒸馏**：输入姓名即可自动搜索论文 + 公开信息，用 AI 生成专属面试官。

## 快速启动

### 前置条件

- Python 3.10+
- DeepSeek API Key（[点此获取](https://platform.deepseek.com)）

### 1. 克隆项目

```bash
git clone https://github.com/aimuyoufaze/InterviewMate.git
cd InterviewMate
```

### 2. 配置后端

```bash
cd backend
cp .env.example .env
```

编辑 `.env`，填入你的 DeepSeek API Key：

```
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

创建虚拟环境并安装依赖：

```bash
python3 -m venv .venv
source .venv/bin/activate      # macOS / Linux
# 或 .venv\Scripts\activate    # Windows
pip install -r requirements.txt
```

### 3. 启动

**方式一：一键启动**

```bash
# 回到项目根目录
cd ..
bash start.sh
```

**方式二：分步启动**

终端 1 — 启动后端（端口 8000）：

```bash
cd backend
.venv/bin/python main.py
```

终端 2 — 启动前端（端口 8080）：

```bash
cd frontend
python3 -m http.server 8080
```

### 4. 打开浏览器

访问 **http://localhost:8080**

---

## 功能

| 功能 | 说明 |
|------|------|
| 🎭 **4 种通用面试官** | 严厉型 / 温和型 / 追问型 / 苏格拉底型 |
| 🎓 **导师蒸馏** | 输入导师姓名和机构，自动搜索 ArXiv 论文 + 网络公开信息，用 AI 生成真实画像 |
| 💬 **多轮面试模拟** | 基于 DeepSeek 的实时对话 |
| 📊 **自动反馈报告** | 面试结束后生成专业评估和改进建议 |
| 💾 **导师永久留存** | 蒸馏后的导师存入 SQLite，重启不丢 |
| 🗑️ **导师管理** | 可查看详情或删除不需要的导师 |

### 关于导师蒸馏

当你输入导师姓名后，后台会自动：

1. 🔍 搜索 ArXiv 获取最新论文
2. 🌐 搜索网络获取主页、Google Scholar 等公开信息
3. 📄 抓取最有价值的网页内容
4. 🧠 用 DeepSeek 综合分析，生成包含以下内容的导师画像：
   - 研究领域与风格
   - 教学/指导风格
   - 性格特征
   - 典型面试问题
   - 面试官风格指令

> 整个过程约 30-60 秒（取决于搜索和 AI 分析速度）。

---

## API 参考

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/personas` | 获取所有面试官人格 |
| GET | `/api/personas/{id}` | 获取某个面试官详情 |
| POST | `/api/personas/extract` | 提取导师 Persona（蒸馏） |
| DELETE | `/api/personas/{id}` | 删除已提取的导师 |
| POST | `/api/interview/start` | 开始面试 |
| POST | `/api/interview/respond` | 继续面试（回复） |
| POST | `/api/interview/end` | 结束面试并获取反馈 |

---

## 项目结构

```
InterviewMate/
├── backend/
│   ├── main.py         # FastAPI 服务入口
│   ├── interview.py    # 面试引擎（DeepSeek 多轮对话）
│   ├── persona.py      # Persona 管理 / 提取 / SQLite 持久化
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   └── index.html      # 单页应用（vanilla JS）
├── start.sh            # 一键启动脚本
└── README.md
```

---

## 常见问题

**Q: 提取导师时进度很慢？**
A: 需要同时搜索 ArXiv 和网页，大约 30-60 秒是正常的。

**Q: 导师图像重启后还在吗？**
A: 在的。数据存储在 `backend/personas.db`（SQLite），重启不丢失。

**Q: 用什么 AI 模型？**
A: 推荐DeepSeek，在 `.env` 中配置 API Key。也可以换成其他兼容 OpenAI 接口的模型。

---

## 下一步规划

- [ ] 通过 web_search + web_fetch 自动搜集导师论文/主页/访谈信息 ✅ *已实现*
- [ ] 面试记录持久化（SQLite）
- [ ] 语音面试支持
- [ ] 多人面试模拟
