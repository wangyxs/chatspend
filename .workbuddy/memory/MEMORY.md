# ChatSpend 项目长期记忆

## 项目概况
- **项目名称**: ChatSpend - 自然语言记账Agent应用
- **项目类型**: 个人智能记账助手
- **架构理念**: 基于王自如的DDD + 多智能体架构 + Plan-and-Execute框架
- **开发模式**: 个人项目，从零构建

## 技术决策

### 架构设计
- **领域驱动设计（DDD）**: 4个业务域独立演进
  - 交易管理（核心域）
  - 分析洞察（支撑域）
  - 预算管理（支撑域）
  - 提醒服务（通用域）

- **多智能体架构**: 5个专项Agent
  - Orchestrator Agent: 总指挥，意图识别、任务分发
  - Recording Agent: 记账员，自然语言解析、多模态处理
  - Analysis Agent: 分析师，消费分析、趋势预测
  - Budget Agent: 预算专家，预算管理、超支预警
  - Reminder Agent: 管家，定期汇报、异常提醒

- **核心原则**: Smart Agent, Dumb Tools
  - Agent负责推理决策
  - 工具只做简单执行
  - 避免工具层复杂业务逻辑

### 技术栈
- **后端**: Python 3.11+ / FastAPI / LangChain或AutoGen / SQLAlchemy
- **移动端**: React Native 0.73+ / Expo / TypeScript 5.0+ / React Navigation 6.x / Zustand
- **数据库**: SQLite（本地）+ PostgreSQL（云端）
- **AI**: OpenAI GPT-4 / Whisper / GPT-4 Vision
- **部署**: 
  - iOS: App Store Connect + TestFlight
  - Android: Google Play + 国内应用商店（应用宝、华为、小米、OPPO、vivo）
  - 后端: Docker + 阿里云/腾讯云

## 用户偏好
- **功能优先级**:
  1. 自然语言记账（核心）
  2. 智能分析洞察
  3. 多模态输入（语音/图片）
  4. 预算管理和提醒
  5. 云端同步

- **用户体验要求**:
  - 简洁友好的交互
  - 快速响应（<1.5s）
  - 智能推断，减少用户输入
  - 主动服务，定期汇报

## 项目规范

### 代码规范
- Python: PEP 8 + Type Hints
- TypeScript: ESLint + Prettier
- 提交信息: Conventional Commits
- API: RESTful + OpenAPI文档

### 数据库设计原则
- UUID作为主键
- 软删除（deleted_at字段）
- 时间字段自动维护
- JSONB存储灵活数据（tags、config等）

### Agent Prompt设计原则
- 角色定位清晰
- 职责边界明确
- 提供丰富示例
- 输出格式标准化
- 包含约束条件

## 关键技术难点及解决方案

### 1. 自然语言理解
**难点**: 模糊时间、金额、类别的准确提取
**方案**: 
- 规则引擎 + LLM混合推理
- 上下文感知
- 置信度机制，低置信度主动确认

### 2. 多轮对话状态管理
**难点**: 跨轮次的上下文维护
**方案**:
- 会话状态机
- 向量数据库存储历史对话
- LangChain的ConversationChain

### 3. 智能分类准确性
**难点**: 新兴消费场景、自定义分类
**方案**:
- 可学习的分类规则库
- 用户反馈机制优化
- Few-shot learning快速适应

### 4. 性能优化
**难点**: 复杂分析查询的性能
**方案**:
- 预聚合统计数据
- 异步任务处理
- 缓存热点数据

## 开发里程碑

### Phase 1: MVP开发 ✅ 已完成 (2026-03-30)
- ✅ 后端架构搭建（FastAPI + SQLAlchemy）
- ✅ Recording Agent实现（混合推理引擎）
- ✅ 移动端完整开发（React Native + Expo）
- ✅ 对话记账界面
- ✅ 交易列表页
- ✅ 统计分析页
- ✅ 设置页面
- ✅ SQLite本地存储
- ✅ API服务封装
- ✅ 离线模式支持

### Phase 2: 智能化增强（2周）
- 编排器Agent开发
- 意图识别与路由
- 智能分类模块
- 时间推理模块
- Plan-Execute框架实现

### Phase 3: 分析与预算（2周）
- Analysis Agent开发
- Budget Agent开发
- 消费洞察生成
- 可视化图表
- 报表导出

### Phase 4: 多模态与提醒（2周）
- 语音识别集成
- 图片识别集成
- Reminder Agent开发
- 定期汇报功能
- 异常提醒功能

### Phase 5: 云端与优化（2周）
- 云端存储集成
- 数据同步机制
- 性能优化
- 用户体验优化
- 完整测试

## 重要文档
- `技术方案.md` - 完整技术方案和架构设计（含移动应用架构和应用商店上架流程）
- `Agent角色定义.md` - 5个Agent的Prompt模板
- `移动应用开发指南.md` - React Native开发详细指南、代码示例、上架流程
- `王自如AI_导读.docx` - 架构理念参考资料
- `王自如AI_原文.docx` - 原始视频文稿
- `开发进度报告.md` - 最新开发进度报告（MVP已完成）

## 应用商店上架要求

### iOS App Store
- Apple Developer账号 ($99/年)
- 必须提供 Sign in with Apple（如有第三方登录）
- 隐私政策和用户协议
- 支持iOS 13.0+
- 审核周期: 1-3天

### Android应用商店
- Google Play开发者账号 ($25一次性)
- 国内应用商店需要**软件著作权证书**（提前2-3个月申请）
- 支持Android 6.0+
- 各厂商推送服务集成（小米、华为、OPPO、vivo）

## 移动应用特有考虑
- 离线优先策略：本地SQLite存储 + 后台云同步
- 数据加密：敏感数据使用 expo-secure-store
- 生物识别：Face ID / 指纹识别保护隐私
- 本地推送：定期汇报、预算预警、大额提醒
- 性能优化：列表虚拟化、图片缓存、原生动画驱动

## 注意事项
- 避免过度设计，MVP优先核心功能
- Agent Prompt要清晰明确，避免歧义
- 数据隐私优先，本地存储为主
- 性能和用户体验同等重要
- 代码质量和技术债务平衡
