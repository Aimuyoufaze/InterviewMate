# Interview Mate 🎙️

AI Agent 模拟面试平台——为申请研究生项目的学生设计。

## 功能

- **🎭 多风格面试官**：严厉型 / 温和型 / 追问型 / 苏格拉底型
- **🎓 Persona Extraction（导师蒸馏）**：输入导师姓名和机构，提取其学术风格生成专属面试官
- **📚 多方向支持**：计算机科学、AI、NLP、CV、机器人学等
- **💬 多轮对话模拟**：基于 DeepSeek 的实时面试对话
- **📊 自动反馈报告**：面试结束后生成专业评估和改进建议

## 快速启动

### 1. 后端

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入你的 DeepSeek API Key

pip install -r requirements.txt
python main.py
```

后端默认运行在 `http://localhost:8000`

### 2. 前端

直接打开 `frontend/index.html`，或者用任意 HTTP 服务器：

```bash
cd frontend
python3 -m http.server 8080
```

浏览器访问 `http://localhost:8080`

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/personas | 获取所有面试官人格 |
| GET | /api/personas/{id} | 获取某个面试官详情 |
| POST | /api/personas/extract | 提取导师 Persona（蒸馏） |
| POST | /api/interview/start | 开始面试 |
| POST | /api/interview/respond | 继续面试（回复） |
| POST | /api/interview/end | 结束面试并获取反馈 |

## 项目结构

```
InterviewMate/
├── backend/
│   ├── main.py         # FastAPI 服务入口
│   ├── interview.py    # 面试引擎（DeepSeek 多轮对话）
│   ├── persona.py      # Persona 管理与提取模块
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   └── index.html      # 单页应用（vanilla JS）
└── README.md
```

## 下一步规划（Roadmap）

- [ ] Persona Extraction 真实版：通过 web_search + web_fetch 自动搜集导师论文/主页/访谈信息
- [ ] 支持用户上传聊天记录截图提取说话风格（参考 supervisor 项目的截图分析功能）
- [ ] 面试记录持久化（SQLite）
- [ ] 语音面试支持
- [ ] 多人面试模拟
