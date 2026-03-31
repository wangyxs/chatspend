"""
Orchestrator Agent - 总指挥Agent

职责：
1. 用户意图识别（记账、查询、分析、预算设置等）
2. 任务分发到专项Agent
3. 多Agent协调
4. 结果汇总和回复生成

设计原则：
- Smart Agent: 负责推理决策
- Dumb Tools: 工具只做执行
- Plan-Execute: 先规划后执行
"""

from typing import Dict, List, Any, Optional, Literal
from enum import Enum
from datetime import datetime
import re
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

from app.config.settings import settings


class IntentType(str, Enum):
    """用户意图类型"""
    RECORD = "record"           # 记账
    QUERY = "query"             # 查询
    ANALYZE = "analyze"         # 分析
    BUDGET = "budget"           # 预算设置
    REMINDER = "reminder"       # 提醒设置
    HELP = "help"               # 帮助
    FEEDBACK = "feedback"       # 反馈
    UNKNOWN = "unknown"         # 未知意图


class OrchestratorAgent:
    """Orchestrator Agent - 总指挥"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            model=settings.openai_model,
            temperature=0.1,
            openai_api_key=settings.openai_api_key
        ) if settings.openai_api_key else None
        
        # 意图识别规则（无需LLM的快速识别）
        self.intent_rules = {
            IntentType.RECORD: [
                r'花了?[\d.]+',
                r'消费[\d.]+',
                r'支出[\d.]+',
                r'买了?.*[\d.]+元',
                r'[\d.]+元',
                r'记账',
                r'买.*花了',
                r'午餐|晚餐|早餐|打车|地铁|购物|电影',
            ],
            IntentType.QUERY: [
                r'查询',
                r'查看',
                r'显示.*记录',
                r'统计.*花费',
                r'这个月.*花',
                r'最近.*支出',
                r'花了?多少',
                r'总支出',
            ],
            IntentType.ANALYZE: [
                r'分析',
                r'报表',
                r'趋势',
                r'洞察',
                r'消费.*分析',
                r'支出.*分布',
                r'建议',
            ],
            IntentType.BUDGET: [
                r'预算',
                r'设定.*限额',
                r'每月.*限制',
                r'超支',
            ],
            IntentType.REMINDER: [
                r'提醒',
                r'通知',
                r'定期汇报',
                r'每周.*报告',
            ],
            IntentType.HELP: [
                r'怎么用',
                r'帮助',
                r'功能',
                r'能做什么',
                r'/help',
                r'？\s*$',
            ],
            IntentType.FEEDBACK: [
                r'分类.*错了',
                r'改.*分类',
                r'应该是.*类',
                r'不对',
                r'错误',
            ],
        }
    
    async def analyze_intent(self, user_input: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        分析用户意图
        
        Args:
            user_input: 用户输入
            context: 上下文信息（历史对话、用户偏好等）
            
        Returns:
            {
                "intent": IntentType,
                "confidence": float,
                "entities": dict,  # 提取的实体
                "sub_intent": str,  # 子意图
                "reasoning": str,   # 推理过程
            }
        """
        # 1. 快速规则匹配
        intent, confidence = self._rule_based_intent(user_input)
        
        # 2. 如果置信度不够，使用LLM
        if confidence < 0.8 and self.llm:
            llm_result = await self._llm_based_intent(user_input, context)
            if llm_result["confidence"] > confidence:
                return llm_result
        
        # 3. 提取实体
        entities = self._extract_entities(user_input, intent)
        
        return {
            "intent": intent,
            "confidence": confidence,
            "entities": entities,
            "sub_intent": None,
            "reasoning": "规则匹配",
        }
    
    def _rule_based_intent(self, user_input: str) -> tuple[IntentType, float]:
        """基于规则的意图识别"""
        scores: Dict[IntentType, int] = {}
        
        for intent_type, patterns in self.intent_rules.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, user_input, re.IGNORECASE):
                    score += 1
            if score > 0:
                scores[intent_type] = score
        
        if not scores:
            return IntentType.UNKNOWN, 0.0
        
        # 找出最高分的意图
        best_intent = max(scores, key=scores.get)
        max_score = scores[best_intent]
        
        # 计算置信度（基于匹配规则数量）
        confidence = min(0.9, max_score * 0.3)
        
        return best_intent, confidence
    
    async def _llm_based_intent(self, user_input: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """基于LLM的意图识别"""
        if not self.llm:
            return {"intent": IntentType.UNKNOWN, "confidence": 0.0, "entities": {}}
        
        system_prompt = """你是一个意图识别专家。分析用户的输入，识别其意图。

意图类型：
- record: 记账（描述消费、支出、花费）
- query: 查询（查看记录、统计花费）
- analyze: 分析（消费分析、趋势、洞察）
- budget: 预算（设置预算、超支提醒）
- reminder: 提醒（设置定期汇报）
- help: 帮助（询问功能、如何使用）
- feedback: 反馈（纠正分类、修改记录）
- unknown: 未知意图

返回JSON格式：
{
    "intent": "意图类型",
    "confidence": 0.0-1.0置信度,
    "entities": {"金额": xxx, "类别": xxx, "时间": xxx},
    "sub_intent": "子意图描述",
    "reasoning": "推理过程"
}"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"用户输入：{user_input}")
        ]
        
        try:
            response = await self.llm.ainvoke(messages)
            import json
            result = json.loads(response.content)
            result["intent"] = IntentType(result.get("intent", "unknown"))
            return result
        except Exception as e:
            return {"intent": IntentType.UNKNOWN, "confidence": 0.0, "entities": {}}
    
    def _extract_entities(self, user_input: str, intent: IntentType) -> Dict[str, Any]:
        """提取实体信息"""
        entities = {}
        
        if intent == IntentType.RECORD:
            # 提取金额
            amount_match = re.search(r'[\d,.]+', user_input)
            if amount_match:
                entities["amount"] = float(amount_match.group().replace(',', ''))
            
            # 提取时间
            time_patterns = {
                "今天": "today",
                "昨天": "yesterday",
                "前天": "day_before_yesterday",
                "本周": "this_week",
                "上周": "last_week",
                "本月": "this_month",
            }
            for cn, en in time_patterns.items():
                if cn in user_input:
                    entities["time"] = en
                    break
            
            # 提取类别关键词
            category_keywords = {
                "餐": "food",
                "吃": "food",
                "午餐": "food",
                "晚餐": "food",
                "交通": "transport",
                "打车": "transport",
                "地铁": "transport",
                "购物": "shopping",
                "买": "shopping",
                "娱乐": "entertainment",
                "电影": "entertainment",
            }
            for keyword, category in category_keywords.items():
                if keyword in user_input:
                    entities["category_hint"] = category
                    break
        
        elif intent == IntentType.QUERY:
            # 提取查询范围
            if "本月" in user_input:
                entities["time_range"] = "this_month"
            elif "本周" in user_input:
                entities["time_range"] = "this_week"
            elif "今天" in user_input:
                entities["time_range"] = "today"
            elif "最近" in user_input:
                entities["time_range"] = "recent"
            
            # 提取查询类型
            if "总" in user_input:
                entities["query_type"] = "total"
            elif "分类" in user_input:
                entities["query_type"] = "category"
        
        return entities
    
    async def route_to_agent(
        self,
        intent: IntentType,
        user_input: str,
        entities: Dict[str, Any],
        context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        路由到对应的Agent处理
        
        Args:
            intent: 用户意图
            user_input: 用户输入
            entities: 提取的实体
            context: 上下文
            
        Returns:
            Agent处理结果
        """
        from app.agents.recording_agent import RecordingAgent
        from app.agents.analysis_agent import AnalysisAgent
        from app.agents.budget_agent import BudgetAgent
        from app.agents.reminder_agent import ReminderAgent
        
        db = context.get("db_session") if context else None
        
        if intent == IntentType.RECORD:
            agent = RecordingAgent()
            return await agent.process(user_input, context)
        
        elif intent == IntentType.QUERY:
            if not db:
                return {"success": False, "message": "数据库连接错误", "data": None}
            
            # 简单查询逻辑
            time_range = entities.get("time_range", "this_month")
            
            # 使用Analysis Agent的summary功能
            analysis = AnalysisAgent()
            summary = await analysis.get_summary(db, time_range)
            
            return {
                "success": True,
                "message": f"查询完成：{time_range}共消费{summary['total']}元，{summary['count']}笔记录",
                "data": summary
            }
        
        elif intent == IntentType.ANALYZE:
            if not db:
                return {"success": False, "message": "数据库连接错误", "data": None}
            
            agent = AnalysisAgent()
            return await agent.analyze(db, time_range="this_month")
        
        elif intent == IntentType.BUDGET:
            if not db:
                return {"success": False, "message": "数据库连接错误", "data": None}
            
            agent = BudgetAgent()
            
            # 检查用户输入是设置预算还是查询预算
            if "设置" in user_input or "预算" in user_input:
                # 提取金额和类别
                import re
                amount_match = re.search(r'[\d.]+', user_input)
                if amount_match:
                    amount = float(amount_match.group())
                    # 简单推断类别
                    category = "total"  # 默认总预算
                    if "餐饮" in user_input or "吃" in user_input:
                        category = "food"
                    elif "交通" in user_input:
                        category = "transport"
                    elif "购物" in user_input:
                        category = "shopping"
                    
                    return await agent.set_budget(db, category, amount)
            
            # 查询预算状态
            return await agent.check_budget_status(db)
        
        elif intent == IntentType.REMINDER:
            if not db:
                return {"success": False, "message": "数据库连接错误", "data": None}
            
            agent = ReminderAgent()
            
            # 根据用户输入选择报告类型
            if "周报" in user_input:
                return await agent.generate_weekly_report(db)
            elif "月报" in user_input:
                return await agent.generate_monthly_report(db)
            else:
                # 默认返回记账提醒
                return await agent.check_daily_record_reminder(db)
        
        elif intent == IntentType.HELP:
            return {
                "success": True,
                "message": self._get_help_message(),
                "data": None
            }
        
        elif intent == IntentType.FEEDBACK:
            return {
                "success": True,
                "message": "感谢反馈！我会学习并改进。",
                "data": None
            }
        
        else:
            return {
                "success": False,
                "message": "抱歉，我不太理解你的意思。试试说'午饭花了35元'或'这个月花了多少'",
                "data": None
            }
    
    def _get_help_message(self) -> str:
        """获取帮助信息"""
        return """👋 我是ChatSpend，你的智能记账助手！

📝 **记账功能**
• 直接说："午饭花了35元"
• 支持模糊时间："昨天打车花了20"
• 多笔记账："早餐10元，午餐30元"

🔍 **查询功能**
• "这个月花了多少"
• "最近一周的消费"
• "查看餐饮支出"

📊 **分析功能**
• "分析我的消费"
• "生成月度报表"
• "给我理财建议"

💰 **预算管理**
• "设置每月预算5000"
• "餐饮预算1000"

🔔 **提醒功能**
• "每周日提醒我记账"
• "预算超支提醒我"

💡 **其他**
• 随时纠正分类："这应该是交通类"
• 问功能："你能做什么？"
"""
    
    async def process(
        self,
        user_input: str,
        context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        处理用户输入的主入口 - 后端驱动渲染版本
        
        实现Plan-Execute框架：
        1. Plan: 分析意图，规划任务
        2. Execute: 路由到Agent执行
        3. Respond: 使用ResponseBuilder生成UI响应
        
        参考王自如AI产品设计理念：
        - 后端决定展示什么组件
        - 前端只负责渲染
        - 无缝对话体验
        """
        from app.agents.response_builder import ResponseBuilder
        
        # 初始化ResponseBuilder
        builder = ResponseBuilder()
        
        # Step 1: 意图识别
        intent_result = await self.analyze_intent(user_input, context)
        intent = intent_result["intent"]
        
        # Step 2: 路由执行
        agent_result = await self.route_to_agent(
            intent,
            user_input,
            intent_result["entities"],
            context
        )
        
        # Step 3: 使用ResponseBuilder构建UI响应
        if intent == IntentType.RECORD:
            # 记账成功 -> 展示交易卡片
            if agent_result.get("success") and "transaction" in agent_result:
                response = builder.build_transaction_created_response(
                    agent_result["transaction"]
                )
            else:
                response = builder.build_error_response(
                    agent_result.get("message", "记账失败")
                )
        
        elif intent == IntentType.QUERY:
            # 查询结果 -> 展示摘要卡片
            if agent_result.get("success") and "data" in agent_result:
                response = builder.build_summary_response(
                    agent_result["data"],
                    period=intent_result["entities"].get("time_range", "本月")
                )
            else:
                response = builder.build_error_response(
                    agent_result.get("message", "查询失败")
                )
        
        elif intent == IntentType.ANALYZE:
            # 分析结果 -> 展示洞察卡片和图表
            if agent_result.get("success"):
                components = []
                
                # 如果有洞察
                if "insights" in agent_result.get("data", {}):
                    for insight in agent_result["data"]["insights"]:
                        response = builder.build_insight_response(
                            insight_type=insight.get("type", "trend"),
                            title=insight.get("title", ""),
                            content=insight.get("content", "")
                        )
                        components.extend(response.components)
                
                # 如果有趋势数据
                if "trend" in agent_result.get("data", {}):
                    response = builder.build_trend_chart_response(
                        agent_result["data"]["trend"]
                    )
                    components.extend(response.components)
                
                response = ChatResponse(
                    success=True,
                    message=agent_result.get("message", "分析完成"),
                    components=components,
                    conversation_id=builder.conversation_id
                )
            else:
                response = builder.build_error_response(
                    agent_result.get("message", "分析失败")
                )
        
        elif intent == IntentType.BUDGET:
            # 预算状态 -> 展示预算卡片
            if agent_result.get("success") and "budgets" in agent_result:
                response = builder.build_budget_status_response(
                    agent_result["budgets"]
                )
            elif agent_result.get("success") and "budget" in agent_result:
                # 单个预算设置成功
                response = builder.build_text_response(
                    agent_result.get("message", "预算设置成功"),
                    suggested_replies=["查看预算状态", "设置其他预算"]
                )
            else:
                response = builder.build_error_response(
                    agent_result.get("message", "预算操作失败")
                )
        
        elif intent == IntentType.HELP:
            # 帮助信息 -> 纯文本 + 快捷操作
            response = builder.build_text_response(
                self._get_help_message(),
                suggested_replies=["午饭花了35元", "这个月花了多少", "分析我的消费"]
            )
        
        elif intent == IntentType.FEEDBACK:
            # 反馈确认
            response = builder.build_text_response(
                "感谢反馈！我会学习并改进。",
                suggested_replies=["继续记账", "查看记录"]
            )
        
        else:
            # 未知意图 -> 引导用户
            response = builder.build_text_response(
                "抱歉，我不太理解你的意思。试试说'午饭花了35元'或'这个月花了多少'",
                suggested_replies=["午饭花了35元", "这个月花了多少", "你能做什么"]
            )
        
        # 返回字典格式（兼容旧API）
        return response.model_dump()
