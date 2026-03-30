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

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 添加你的 OPENAI_API_KEY

# 启动服务
python main.py
```

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

## 🎯 MVP功能 (Phase 1)

- [x] 自然语言记账
- [x] SQLite本地存储
- [x] 交易列表展示
- [x] 基础统计分析
- [x] 设置页面
- [x] 离线模式支持

## 📅 开发路线

### Phase 2: 智能化增强 (2周)
- [ ] 编排器Agent开发
- [ ] 意图识别与路由
- [ ] 智能分类优化
- [ ] 时间推理增强

### Phase 3: 分析与预算 (2周)
- [ ] Analysis Agent完善
- [ ] Budget Agent开发
- [ ] 可视化图表
- [ ] 消费洞察生成

### Phase 4: 多模态与提醒 (2周)
- [ ] 语音识别集成
- [ ] 图片识别集成
- [ ] Reminder Agent开发
- [ ] 定期汇报功能

### Phase 5: 云端与优化 (2周)
- [ ] 云端存储集成
- [ ] 数据同步机制
- [ ] 性能优化
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
