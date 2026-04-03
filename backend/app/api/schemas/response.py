"""
后端驱动的UI响应Schema
参考优质AI产品的薄客户端架构
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
from enum import Enum
from datetime import datetime


class UIComponentType(str, Enum):
    """UI组件类型"""
    TEXT = "text"                      # 纯文本消息
    TRANSACTION_CARD = "transaction_card"  # 交易卡片
    SUMMARY_CARD = "summary_card"       # 摘要卡片
    LIST_CARD = "list_card"             # 列表卡片
    CHART_CARD = "chart_card"           # 图表卡片
    BUDGET_CARD = "budget_card"         # 预算卡片
    INSIGHT_CARD = "insight_card"       # 洞察卡片
    QUICK_ACTIONS = "quick_actions"     # 快捷操作按钮
    DATE_PICKER = "date_picker"         # 日期选择器
    CONFIRMATION = "confirmation"       # 确认对话框


class TransactionCardData(BaseModel):
    """交易卡片数据"""
    id: str
    amount: float
    category: str
    category_icon: str
    description: str
    date: str
    time: Optional[str] = None
    tags: List[str] = []
    
    # 操作按钮
    actions: List[Dict[str, str]] = []  # [{"label": "修改", "action": "edit"}, ...]


class SummaryCardData(BaseModel):
    """摘要卡片数据"""
    title: str
    total_amount: float
    transaction_count: int
    period: str  # "本周", "本月", "本年"
    
    # 对比数据
    comparison: Optional[Dict[str, Any]] = None  # {"previous": 1000, "change": "+15%"}
    
    # 分类统计
    categories: List[Dict[str, Any]] = []


class ListCardData(BaseModel):
    """列表卡片数据"""
    title: str
    items: List[TransactionCardData]
    has_more: bool = False
    next_page_token: Optional[str] = None


class ChartDataPoint(BaseModel):
    """图表数据点"""
    label: str
    value: float
    color: Optional[str] = None


class ChartCardData(BaseModel):
    """图表卡片数据"""
    chart_type: str  # "line", "bar", "pie"
    title: str
    data: List[ChartDataPoint]
    x_axis_label: Optional[str] = None
    y_axis_label: Optional[str] = None


class BudgetCardData(BaseModel):
    """预算卡片数据"""
    category: str
    category_icon: str
    budget_amount: float
    spent_amount: float
    remaining_amount: float
    percentage: float
    status: str  # "safe", "warning", "exceeded"
    days_remaining: int


class InsightCardData(BaseModel):
    """洞察卡片数据"""
    title: str
    insight_type: str  # "trend", "anomaly", "suggestion", "alert"
    content: str
    priority: str  # "high", "medium", "low"
    icon: str
    action: Optional[Dict[str, str]] = None  # {"label": "查看详情", "action": "..."}
    
    # 模式: "用户-问题-对策-结论"
    pattern_data: Optional[Dict[str, Any]] = None


class QuickAction(BaseModel):
    """快捷操作按钮"""
    label: str
    action: str
    icon: str
    params: Dict[str, Any] = {}


class QuickActionsData(BaseModel):
    """快捷操作数据"""
    title: str
    actions: List[QuickAction]


class ConfirmationData(BaseModel):
    """确认对话框数据"""
    title: str
    message: str
    confirm_label: str = "确认"
    cancel_label: str = "取消"
    confirm_action: str
    cancel_action: str


class UIComponent(BaseModel):
    """UI组件"""
    type: UIComponentType
    data: Union[
        str,  # TEXT类型直接是字符串
        TransactionCardData,
        SummaryCardData,
        ListCardData,
        ChartCardData,
        BudgetCardData,
        InsightCardData,
        QuickActionsData,
        ConfirmationData
    ]
    animation: Optional[Dict[str, Any]] = None  # 动画配置


class ChatResponse(BaseModel):
    """
    统一对话响应格式
    
    参考优质AI产品设计理念：
    - 后端驱动渲染
    - 前端薄客户端
    - 组件化响应
    """
    success: bool
    message: str  # 语音播报的文本
    components: List[UIComponent] = []  # UI组件列表
    
    # 对话上下文
    conversation_id: Optional[str] = None
    suggested_replies: List[str] = []  # 建议回复
    
    # 视觉反馈
    emotion: Optional[str] = None  # "happy", "neutral", "thinking"
    typing_duration: float = 0.5  # 模拟打字延迟
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "好的，已经记录了午饭消费35元",
                "components": [
                    {
                        "type": "transaction_card",
                        "data": {
                            "id": "tx_123",
                            "amount": 35.0,
                            "category": "food",
                            "category_icon": "🍜",
                            "description": "午饭",
                            "date": "2026-03-31",
                            "time": "12:30"
                        }
                    },
                    {
                        "type": "quick_actions",
                        "data": {
                            "title": "接下来要做什么？",
                            "actions": [
                                {"label": "查看今天消费", "action": "query_today", "icon": "📊"},
                                {"label": "设置预算", "action": "set_budget", "icon": "💰"}
                            ]
                        }
                    }
                ],
                "suggested_replies": ["查看今天消费", "设置餐饮预算"]
            }
        }


# 批量操作响应
class BatchOperationResult(BaseModel):
    """批量操作结果"""
    total: int
    succeeded: int
    failed: int
    details: List[Dict[str, Any]]


class BatchResponse(ChatResponse):
    """批量操作响应"""
    batch_result: Optional[BatchOperationResult] = None


# 多意图响应
class MultiIntentResponse(ChatResponse):
    """多意图响应（支持一个请求多个意图）"""
    intents_processed: List[Dict[str, Any]] = []
    partial_failures: List[Dict[str, Any]] = []
