"""
Budget Agent - 预算专家Agent

职责：
1. 预算设置与查询
2. 预算执行跟踪
3. 超支预警
4. 预算优化建议

设计原则：
- 预算要合理，避免过于激进
- 预警要提前，给用户调整空间
- 建议要具体，有可操作性
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from loguru import logger

from app.models import Transaction, Budget


class BudgetAgent:
    """Budget Agent - 预算专家"""
    
    def __init__(self):
        # 类别预算建议（基于常见消费水平）
        self.budget_suggestions = {
            "food": {"min": 1000, "max": 3000, "suggested": 1500},
            "transport": {"min": 300, "max": 1000, "suggested": 500},
            "shopping": {"min": 500, "max": 2000, "suggested": 800},
            "entertainment": {"min": 200, "max": 1000, "suggested": 400},
            "housing": {"min": 1000, "max": 5000, "suggested": 2000},
        }
        
        # 预警阈值
        self.warning_thresholds = [0.5, 0.8, 1.0, 1.2]  # 50%, 80%, 100%, 120%
    
    async def set_budget(
        self,
        db: AsyncSession,
        category: str,
        amount: float,
        period: str = "monthly",
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        设置预算
        
        Args:
            db: 数据库会话
            category: 消费类别
            amount: 预算金额
            period: 预算周期（daily/weekly/monthly）
            user_id: 用户ID
            
        Returns:
            设置结果
        """
        try:
            # 检查是否已存在预算
            query = select(Budget).where(
                and_(
                    Budget.category == category,
                    Budget.period == period,
                    Budget.deleted_at.is_(None)
                )
            )
            result = await db.execute(query)
            existing_budget = result.scalar_one_or_none()
            
            if existing_budget:
                # 更新预算
                existing_budget.amount = amount
                existing_budget.updated_at = datetime.now()
                message = f"已更新{self._get_category_name(category)}预算为{amount}元/{period}"
            else:
                # 创建新预算
                budget = Budget(
                    category=category,
                    amount=amount,
                    period=period,
                )
                db.add(budget)
                message = f"已设置{self._get_category_name(category)}预算为{amount}元/{period}"
            
            await db.commit()
            
            # 检查预算合理性
            suggestion = self._check_budget_reasonable(category, amount)
            
            return {
                "success": True,
                "message": message,
                "data": {
                    "category": category,
                    "amount": amount,
                    "period": period,
                    "suggestion": suggestion
                }
            }
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to set budget: {e}")
            return {
                "success": False,
                "message": f"设置预算失败：{str(e)}",
                "data": None
            }
    
    async def check_budget_status(
        self,
        db: AsyncSession,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        检查预算执行情况
        
        Args:
            db: 数据库会话
            category: 指定类别（可选，不指定则检查所有）
            
        Returns:
            预算执行情况
        """
        # 获取预算列表
        query = select(Budget).where(Budget.deleted_at.is_(None))
        if category:
            query = query.where(Budget.category == category)
        
        result = await db.execute(query)
        budgets = result.scalars().all()
        
        if not budgets:
            return {
                "success": True,
                "message": "暂无预算设置",
                "data": []
            }
        
        # 获取本月消费
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        trans_query = select(Transaction).where(
            and_(
                Transaction.deleted_at.is_(None),
                Transaction.transaction_date >= month_start.date()
            )
        )
        trans_result = await db.execute(trans_query)
        transactions = trans_result.scalars().all()
        
        # 计算各类别消费
        category_spending = {}
        for t in transactions:
            if t.category not in category_spending:
                category_spending[t.category] = 0
            category_spending[t.category] += t.amount
        
        # 检查每个预算
        budget_status = []
        alerts = []
        
        for budget in budgets:
            spent = category_spending.get(budget.category, 0)
            percentage = spent / budget.amount if budget.amount > 0 else 0
            
            status = {
                "category": budget.category,
                "category_name": self._get_category_name(budget.category),
                "budget": budget.amount,
                "spent": round(spent, 2),
                "remaining": round(budget.amount - spent, 2),
                "percentage": round(percentage * 100, 1),
                "status": self._get_budget_status(percentage),
            }
            
            budget_status.append(status)
            
            # 生成预警
            if percentage >= 0.8:
                alerts.append({
                    "category": budget.category,
                    "message": f"{self._get_category_name(budget.category)}预算已使用{round(percentage*100, 1)}%，剩余{round(budget.amount - spent, 2)}元",
                    "level": "warning" if percentage < 1.0 else "danger"
                })
        
        return {
            "success": True,
            "message": f"查询到{len(budget_status)}个预算",
            "data": {
                "budgets": budget_status,
                "alerts": alerts,
            }
        }
    
    async def get_optimization_suggestions(
        self,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        获取预算优化建议
        
        基于历史消费数据，提供预算调整建议
        """
        # 获取最近3个月的消费数据
        now = datetime.now()
        three_months_ago = now - timedelta(days=90)
        
        query = select(Transaction).where(
            and_(
                Transaction.deleted_at.is_(None),
                Transaction.transaction_date >= three_months_ago.date()
            )
        )
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        if len(transactions) < 30:
            return {
                "success": True,
                "message": "消费数据不足，无法提供建议",
                "data": []
            }
        
        # 计算各类别月均消费
        category_monthly = {}
        for t in transactions:
            if t.category not in category_monthly:
                category_monthly[t.category] = []
            category_monthly[t.category].append(t.amount)
        
        suggestions = []
        for category, amounts in category_monthly.items():
            monthly_avg = sum(amounts) / 3  # 3个月平均
            suggested_budget = round(monthly_avg * 1.1, 0)  # 建议+10%缓冲
            
            suggestion = {
                "category": category,
                "category_name": self._get_category_name(category),
                "monthly_average": round(monthly_avg, 2),
                "suggested_budget": suggested_budget,
                "reason": f"基于最近3个月消费，月均{round(monthly_avg, 2)}元",
            }
            
            suggestions.append(suggestion)
        
        # 按月均消费排序
        suggestions.sort(key=lambda x: x["monthly_average"], reverse=True)
        
        return {
            "success": True,
            "message": f"生成{len(suggestions)}条预算建议",
            "data": suggestions
        }
    
    def _get_category_name(self, category: str) -> str:
        """获取类别中文名"""
        names = {
            "food": "餐饮",
            "transport": "交通",
            "shopping": "购物",
            "entertainment": "娱乐",
            "housing": "居住",
            "healthcare": "医疗",
            "education": "教育",
            "investment": "投资",
            "other": "其他",
        }
        return names.get(category, category)
    
    def _check_budget_reasonable(self, category: str, amount: float) -> Optional[str]:
        """检查预算是否合理"""
        if category not in self.budget_suggestions:
            return None
        
        suggestion = self.budget_suggestions[category]
        
        if amount < suggestion["min"]:
            return f"⚠️ 预算偏低，建议至少{suggestion['min']}元"
        elif amount > suggestion["max"]:
            return f"💡 预算较高，建议{suggestion['suggested']}元左右"
        else:
            return f"✅ 预算合理，建议{suggestion['suggested']}元左右"
    
    def _get_budget_status(self, percentage: float) -> str:
        """获取预算状态"""
        if percentage < 0.5:
            return "good"
        elif percentage < 0.8:
            return "normal"
        elif percentage < 1.0:
            return "warning"
        else:
            return "danger"
