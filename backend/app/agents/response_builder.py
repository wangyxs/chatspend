"""
UI响应构建器
根据业务数据构建UI组件，实现后端驱动渲染
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from .api.schemas.response import (
    ChatResponse,
    UIComponent,
    UIComponentType,
    TransactionCardData,
    SummaryCardData,
    ListCardData,
    ChartCardData,
    BudgetCardData,
    InsightCardData,
    QuickActionsData,
    QuickAction,
    ConfirmationData,
    ChartDataPoint,
)


class ResponseBuilder:
    """
    响应构建器
    
    参考优质AI产品设计理念：
    - 后端决定展示什么组件
    - 前端只负责渲染
    - 组件化、可复用
    """
    
    # 类别图标映射
    CATEGORY_ICONS = {
        "food": "🍜",
        "transport": "🚗",
        "shopping": "🛍️",
        "entertainment": "🎮",
        "housing": "🏠",
        "medical": "🏥",
        "education": "📚",
        "salary": "💰",
        "investment": "📈",
        "other": "📦"
    }
    
    # 类别名称映射
    CATEGORY_NAMES = {
        "food": "餐饮",
        "transport": "交通",
        "shopping": "购物",
        "entertainment": "娱乐",
        "housing": "住房",
        "medical": "医疗",
        "education": "教育",
        "salary": "工资",
        "investment": "投资",
        "other": "其他"
    }
    
    # 颜色映射
    CATEGORY_COLORS = {
        "food": "#FF6B6B",
        "transport": "#4ECDC4",
        "shopping": "#FFE66D",
        "entertainment": "#95E1D3",
        "housing": "#C9B1FF",
        "medical": "#FF8B94",
        "education": "#87CEEB",
        "salary": "#98D8C8",
        "investment": "#F7DC6F",
        "other": "#BDC3C7"
    }
    
    def __init__(self, conversation_id: Optional[str] = None):
        self.conversation_id = conversation_id or self._generate_conversation_id()
    
    @staticmethod
    def _generate_conversation_id() -> str:
        import uuid
        return f"conv_{uuid.uuid4().hex[:12]}"
    
    def build_text_response(
        self,
        message: str,
        suggested_replies: List[str] = None
    ) -> ChatResponse:
        """构建纯文本响应"""
        components = [
            UIComponent(
                type=UIComponentType.TEXT,
                data=message
            )
        ]
        
        if suggested_replies:
            components.append(
                UIComponent(
                    type=UIComponentType.QUICK_ACTIONS,
                    data=QuickActionsData(
                        title="你可以这样问：",
                        actions=[
                            QuickAction(label=reply, action="suggested_reply", icon="💬")
                            for reply in suggested_replies[:3]
                        ]
                    )
                )
            )
        
        return ChatResponse(
            success=True,
            message=message,
            components=components,
            conversation_id=self.conversation_id,
            suggested_replies=suggested_replies or []
        )
    
    def build_transaction_created_response(
        self,
        transaction: Dict[str, Any],
        show_quick_actions: bool = True
    ) -> ChatResponse:
        """构建交易创建成功响应"""
        # 格式化金额
        amount = float(transaction.get("amount", 0))
        category = transaction.get("category", "other")
        description = transaction.get("description", "")
        tx_date = transaction.get("date", datetime.now().strftime("%Y-%m-%d"))
        tx_time = transaction.get("time")
        
        # 构建交易卡片
        card_data = TransactionCardData(
            id=transaction.get("id", ""),
            amount=amount,
            category=category,
            category_icon=self.CATEGORY_ICONS.get(category, "📦"),
            description=description,
            date=tx_date,
            time=tx_time,
            tags=transaction.get("tags", []),
            actions=[
                {"label": "修改", "action": f"edit_{transaction.get('id', '')}"},
                {"label": "删除", "action": f"delete_{transaction.get('id', '')}"}
            ]
        )
        
        components = [
            UIComponent(
                type=UIComponentType.TRANSACTION_CARD,
                data=card_data,
                animation={"type": "slide_in", "duration": 300}
            )
        ]
        
        # 添加快捷操作
        if show_quick_actions:
            components.append(
                UIComponent(
                    type=UIComponentType.QUICK_ACTIONS,
                    data=QuickActionsData(
                        title="接下来要做什么？",
                        actions=[
                            QuickAction(
                                label="查看今天消费",
                                action="query_today",
                                icon="📊"
                            ),
                            QuickAction(
                                label="查看本月统计",
                                action="stats_month",
                                icon="📈"
                            ),
                            QuickAction(
                                label="设置预算",
                                action="set_budget",
                                icon="💰"
                            )
                        ]
                    )
                )
            )
        
        # 构建语音播报消息
        category_name = self.CATEGORY_NAMES.get(category, "其他")
        message = f"好的，已记录{description or category_name}消费{amount}元"
        
        return ChatResponse(
            success=True,
            message=message,
            components=components,
            conversation_id=self.conversation_id,
            suggested_replies=["查看今天消费", "查看本月统计"]
        )
    
    def build_summary_response(
        self,
        summary_data: Dict[str, Any],
        period: str = "本月"
    ) -> ChatResponse:
        """构建摘要卡片响应"""
        total_amount = summary_data.get("total_amount", 0)
        transaction_count = summary_data.get("transaction_count", 0)
        categories = summary_data.get("categories", [])
        
        # 构建摘要卡片
        summary_card = SummaryCardData(
            title=f"{period}消费概览",
            total_amount=total_amount,
            transaction_count=transaction_count,
            period=period,
            comparison=summary_data.get("comparison"),
            categories=[
                {
                    "name": self.CATEGORY_NAMES.get(cat["category"], cat["category"]),
                    "icon": self.CATEGORY_ICONS.get(cat["category"], "📦"),
                    "amount": cat["amount"],
                    "count": cat["count"],
                    "percentage": cat.get("percentage", 0)
                }
                for cat in categories[:5]  # 只展示前5个
            ]
        )
        
        components = [
            UIComponent(
                type=UIComponentType.SUMMARY_CARD,
                data=summary_card
            )
        ]
        
        # 构建饼图
        if categories:
            chart_data = ChartCardData(
                chart_type="pie",
                title="消费分布",
                data=[
                    ChartDataPoint(
                        label=self.CATEGORY_NAMES.get(cat["category"], cat["category"]),
                        value=cat["amount"],
                        color=self.CATEGORY_COLORS.get(cat["category"], "#BDC3C7")
                    )
                    for cat in categories[:5]
                ]
            )
            components.append(
                UIComponent(
                    type=UIComponentType.CHART_CARD,
                    data=chart_data
                )
            )
        
        message = f"{period}共消费{total_amount:.2f}元，{transaction_count}笔记录"
        
        return ChatResponse(
            success=True,
            message=message,
            components=components,
            conversation_id=self.conversation_id
        )
    
    def build_transaction_list_response(
        self,
        transactions: List[Dict[str, Any]],
        title: str = "交易记录",
        has_more: bool = False
    ) -> ChatResponse:
        """构建交易列表响应"""
        # 转换为卡片数据
        items = []
        for tx in transactions:
            card = TransactionCardData(
                id=tx.get("id", ""),
                amount=float(tx.get("amount", 0)),
                category=tx.get("category", "other"),
                category_icon=self.CATEGORY_ICONS.get(tx.get("category", "other"), "📦"),
                description=tx.get("description", ""),
                date=tx.get("date", ""),
                time=tx.get("time"),
                tags=tx.get("tags", [])
            )
            items.append(card)
        
        list_card = ListCardData(
            title=title,
            items=items,
            has_more=has_more
        )
        
        components = [
            UIComponent(
                type=UIComponentType.LIST_CARD,
                data=list_card
            )
        ]
        
        message = f"找到{len(transactions)}笔记录"
        
        return ChatResponse(
            success=True,
            message=message,
            components=components,
            conversation_id=self.conversation_id
        )
    
    def build_budget_status_response(
        self,
        budget_data: List[Dict[str, Any]]
    ) -> ChatResponse:
        """构建预算状态响应"""
        budget_cards = []
        
        for budget in budget_data:
            card = BudgetCardData(
                category=budget["category"],
                category_icon=self.CATEGORY_ICONS.get(budget["category"], "📦"),
                budget_amount=budget["budget_amount"],
                spent_amount=budget["spent_amount"],
                remaining_amount=budget["remaining_amount"],
                percentage=budget["percentage"],
                status=budget["status"],
                days_remaining=budget.get("days_remaining", 30)
            )
            budget_cards.append(
                UIComponent(
                    type=UIComponentType.BUDGET_CARD,
                    data=card
                )
            )
        
        # 添加洞察
        insights = []
        for budget in budget_data:
            if budget["status"] == "exceeded":
                insights.append(
                    UIComponent(
                        type=UIComponentType.INSIGHT_CARD,
                        data=InsightCardData(
                            title="⚠️ 预算超支提醒",
                            insight_type="alert",
                            content=f"{self.CATEGORY_NAMES.get(budget['category'], budget['category'])}预算已超支{abs(budget['remaining_amount']):.2f}元",
                            priority="high",
                            icon="⚠️"
                        )
                    )
                )
            elif budget["status"] == "warning":
                insights.append(
                    UIComponent(
                        type=UIComponentType.INSIGHT_CARD,
                        data=InsightCardData(
                            title="💡 预算提醒",
                            insight_type="alert",
                            content=f"{self.CATEGORY_NAMES.get(budget['category'], budget['category'])}预算已使用{budget['percentage']:.0f}%，还剩{budget['remaining_amount']:.2f}元",
                            priority="medium",
                            icon="💡"
                        )
                    )
                )
        
        components = budget_cards + insights
        
        message = f"当前{len(budget_data)}项预算跟踪中"
        
        return ChatResponse(
            success=True,
            message=message,
            components=components,
            conversation_id=self.conversation_id
        )
    
    def build_insight_response(
        self,
        insight_type: str,
        title: str,
        content: str,
        priority: str = "medium",
        action: Optional[Dict[str, str]] = None
    ) -> ChatResponse:
        """构建洞察卡片响应"""
        icon_map = {
            "trend": "📈",
            "anomaly": "⚠️",
            "suggestion": "💡",
            "alert": "🚨"
        }
        
        insight_card = InsightCardData(
            title=title,
            insight_type=insight_type,
            content=content,
            priority=priority,
            icon=icon_map.get(insight_type, "📊"),
            action=action
        )
        
        components = [
            UIComponent(
                type=UIComponentType.INSIGHT_CARD,
                data=insight_card
            )
        ]
        
        return ChatResponse(
            success=True,
            message=content,
            components=components,
            conversation_id=self.conversation_id
        )
    
    def build_confirmation_response(
        self,
        title: str,
        message: str,
        confirm_action: str,
        cancel_action: str = "cancel"
    ) -> ChatResponse:
        """构建确认对话框响应"""
        confirmation = ConfirmationData(
            title=title,
            message=message,
            confirm_action=confirm_action,
            cancel_action=cancel_action
        )
        
        components = [
            UIComponent(
                type=UIComponentType.CONFIRMATION,
                data=confirmation
            )
        ]
        
        return ChatResponse(
            success=True,
            message=message,
            components=components,
            conversation_id=self.conversation_id
        )
    
    def build_trend_chart_response(
        self,
        trend_data: List[Dict[str, Any]],
        title: str = "消费趋势",
        chart_type: str = "line"
    ) -> ChatResponse:
        """构建趋势图表响应"""
        data_points = [
            ChartDataPoint(
                label=point["date"],
                value=point["amount"]
            )
            for point in trend_data
        ]
        
        chart_card = ChartCardData(
            chart_type=chart_type,
            title=title,
            data=data_points,
            x_axis_label="日期",
            y_axis_label="金额 (元)"
        )
        
        components = [
            UIComponent(
                type=UIComponentType.CHART_CARD,
                data=chart_card
            )
        ]
        
        return ChatResponse(
            success=True,
            message=f"为您展示{title}",
            components=components,
            conversation_id=self.conversation_id
        )
    
    def build_batch_response(
        self,
        results: List[Dict[str, Any]]
    ) -> ChatResponse:
        """构建批量操作响应"""
        success_count = sum(1 for r in results if r.get("success"))
        total_count = len(results)
        
        components = []
        
        # 成功的记录
        success_results = [r for r in results if r.get("success")]
        if success_results:
            for result in success_results[:3]:  # 只展示前3个
                if "transaction" in result:
                    card_data = TransactionCardData(
                        id=result["transaction"].get("id", ""),
                        amount=float(result["transaction"].get("amount", 0)),
                        category=result["transaction"].get("category", "other"),
                        category_icon=self.CATEGORY_ICONS.get(result["transaction"].get("category", "other"), "📦"),
                        description=result["transaction"].get("description", ""),
                        date=result["transaction"].get("date", "")
                    )
                    components.append(
                        UIComponent(
                            type=UIComponentType.TRANSACTION_CARD,
                            data=card_data
                        )
                    )
        
        message = f"成功处理{success_count}/{total_count}条记录"
        
        return ChatResponse(
            success=success_count > 0,
            message=message,
            components=components,
            conversation_id=self.conversation_id
        )
    
    def build_error_response(
        self,
        error_message: str,
        suggested_actions: List[str] = None
    ) -> ChatResponse:
        """构建错误响应"""
        components = [
            UIComponent(
                type=UIComponentType.TEXT,
                data=f"❌ {error_message}"
            )
        ]
        
        if suggested_actions:
            components.append(
                UIComponent(
                    type=UIComponentType.QUICK_ACTIONS,
                    data=QuickActionsData(
                        title="你可以试试：",
                        actions=[
                            QuickAction(label=action, action="suggested_action", icon="💡")
                            for action in suggested_actions[:3]
                        ]
                    )
                )
            )
        
        return ChatResponse(
            success=False,
            message=error_message,
            components=components,
            conversation_id=self.conversation_id
        )
