# ChatSpend 💬📊

> 基于自然语言的智能记账助手 - 让记账像聊天一样简单

## ✨ 特性

- 🗣️ **自然语言记账** - 直接说"昨天午饭花了35元"，自动解析记录
- 📱 **移动优先** - React Native跨平台应用，支持iOS和Android
- 🔍 **智能分析** - 消费洞察、趋势预测、预算管理
- 🔒 **隐私优先** - 本地存储为主，数据完全掌控
- 🤖 **AI驱动** - 基于GPT-4的智能理解引擎

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────┐
│                   ChatSpend App                      │
├─────────────────────────────────────────────────────┤
│  Mobile (React Native)    │    Backend (FastAPI)    │
│  ┌───────────────────┐    │    ┌─────────────────┐  │
│  │   Home Screen     │    │    │ Orchestrator    │  │
│  │   Chat Interface  │◄───┼───►│ Recording Agent │  │
│  │   Transaction List│    │    │ Analysis Agent  │  │
│  │   Stats Dashboard │    │    │ Budget Agent    │  │
│  │   Settings        │    │    │ Reminder Agent  │  │
│  └───────────────────┘    │    └─────────────────┘  │
│           │               │           │             │
│    SQLite Storage          │    PostgreSQL          │
└─────────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 后端

```bash
cd backend

# 安装核心依赖
pip install aiosqlite openai pydantic-settings loguru sqlalchemy fastapi uvicorn

# 配置环境变量
cp .env.example .env
# 编辑 .env 配置你的API密钥

# 配置示例（使用智谱AI GLM-4）
# OPENAI_API_KEY=your-api-key
# OPENAI_MODEL=glm-4-plus
# OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4/

# 启动服务
python main.py
```

**支持的LLM提供商**：
- 智谱AI（GLM-4-Plus）- 推荐
- OpenAI（GPT-4）
- 其他兼容OpenAI API的服务

### 移动端

```bash
cd mobile

# 安装依赖
npm install

# 启动开发服务器
npx expo start

# 按 i 运行iOS模拟器
# 按 a 运行Android模拟器
# 扫描二维码在真机上运行
```

## 📁 项目结构

```
ChatSpend/
├── backend/                    # FastAPI后端
│   ├── app/
│   │   ├── agents/            # 5个AI Agent
│   │   │   ├── recording_agent.py
│   │   │   ├── analysis_agent.py
│   │   │   ├── budget_agent.py
│   │   │   ├── reminder_agent.py
│   │   │   └── orchestrator.py
│   │   ├── api/               # API路由
│   │   ├── models/            # 数据模型
│   │   ├── services/          # 业务服务
│   │   └── utils/             # 工具函数
│   ├── requirements.txt
│   └── main.py
│
├── mobile/                     # React Native移动端
│   ├── src/
│   │   ├── components/        # UI组件
│   │   ├── screens/           # 页面
│   │   ├── services/          # API服务
│   │   ├── stores/            # 状态管理
│   │   ├── types/             # TypeScript类型
│   │   └── navigation/        # 导航配置
│   ├── App.tsx
│   └── package.json
│
├── 技术方案.md                  # 完整技术设计文档
├── Agent角色定义.md             # 5个Agent的Prompt定义
├── 移动应用开发指南.md          # RN开发详细指南
└── 开发进度报告.md              # MVP进度报告
```

## 📅 开发路线

### ✅ Phase 1: MVP开发 (已完成)
- [x] 自然语言记账
- [x] SQLite本地存储
- [x] 交易列表展示
- [x] 基础统计分析
- [x] 设置页面
- [x] 离线模式支持

### ✅ Phase 2: 智能化增强 (已完成)
- [x] 编排器Agent开发
- [x] 意图识别与路由
- [x] 智能分类优化
- [x] 时间推理增强
- [x] Analysis Agent开发
- [x] Budget Agent开发
- [x] Reminder Agent开发

### ✅ Phase 3: 交互重构 (已完成)
- [x] 后端驱动渲染架构
- [x] 10种标准化UI组件
- [x] 薄客户端前端设计
- [x] LLM集成（智谱AI GLM-4-Plus）

### 🚧 Phase 4: 完善图表与优化 (进行中)
- [ ] 消费趋势图（折线图）
- [ ] 消费对比图（柱状图）
- [ ] 性能优化
- [ ] 动画效果

### 📝 Phase 5: 多模态与提醒 (待开始)
- [ ] 语音识别集成
- [ ] 图片识别集成
- [ ] 定期汇报功能
- [ ] 异常提醒功能

### 📝 Phase 6: 云端与发布 (待开始)
- [ ] 云端存储集成
- [ ] 数据同步机制
- [ ] 应用商店上架

## 🛠️ 技术栈

### 后端
- Python 3.11+
- FastAPI
- SQLAlchemy
- LangChain / OpenAI GPT-4
- PostgreSQL

### 移动端
- React Native 0.73+
- Expo
- TypeScript 5.0+
- Zustand
- React Navigation 6.x

## 📖 文档

- [技术方案](./技术方案.md) - 完整架构设计
- [Agent角色定义](./Agent角色定义.md) - AI Agent Prompt模板
- [移动应用开发指南](./移动应用开发指南.md) - React Native开发指南
- [开发进度报告](./开发进度报告.md) - MVP完成情况

## 📄 License

MIT

## 👤 Author

ChatSpend Team

---

**让记账更智能，让生活更简单** 💡
