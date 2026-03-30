"""
Reminder Agent - 管家Agent

职责：
1. 定期汇报（周报、月报）
2. 预算预警通知
3. 异常消费提醒
4. 习惯养成提醒（记账提醒）

设计原则：
- 提醒要恰到好处，不打扰用户
- 内容要有价值，不是噪音
- 支持用户自定义频率和偏好
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from loguru import logger

from app.models import Transaction, Budget


class ReminderAgent:
    """Reminder Agent - 智能管家"""
    
    def __init__(self):
        # 提醒类型
        self.reminder_types = [
            "daily_record",      # 每日记账提醒
            "weekly_report",     # 周报
            "monthly_report",    # 月报
            "budget_warning",    # 预算预警
            "anomaly_alert",     # 异常消费
        ]
        
        # 提醒时间偏好
        self.default_times = {
            "daily_record": "21:00",     # 晚上9点
            "weekly_report": "sunday_20:00",  # 周日晚上8点
            "monthly_report": "1st_10:00",    # 每月1号上午10点
        }
    
    async def generate_weekly_report(
        self,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        生成周报
        
        Returns:
            周报内容
        """
        now = datetime.now()
        
        # 本周起止时间
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = now
        
        # 上周起止时间
        last_week_start = week_start - timedelta(days=7)
        last_week_end = week_start - timedelta(seconds=1)
        
        # 获取本周交易
        this_week_trans = await self._get_transactions(db, week_start, week_end)
        last_week_trans = await self._get_transactions(db, last_week_start, last_week_end)
        
        # 计算数据
        this_week_total = sum(t.amount for t in this_week_trans)
        last_week_total = sum(t.amount for t in last_week_trans)
        
        change_percent = 0
        if last_week_total > 0:
            change_percent = round((this_week_total - last_week_total) / last_week_total * 100, 1)
        
        # 类别分布
        category_dist = self._get_category_distribution(this_week_trans)
        
        # 生成报告
        report = f"""📊 **本周消费周报**

📅 时间：{week_start.strftime('%m月%d日')} - {week_end.strftime('%m月%d日')}

💰 **总支出**：{round(this_week_total, 2)}元
   本周记账：{len(this_week_trans)}笔

📈 **环比变化**：{self._get_change_emoji(change_percent)} {abs(change_percent)}%

🏷️ **消费分布**：
"""
        for cat in category_dist[:5]:
            report += f"   • {cat['name']}：{cat['amount']}元 ({cat['percentage']}%)\n"
        
        # 添加洞察
        insights = self._generate_weekly_insights(
            this_week_total,
            last_week_total,
            change_percent,
            category_dist
        )
        
        if insights:
            report += f"\n💡 **洞察**：\n"
            for insight in insights:
                report += f"   {insight}\n"
        
        return {
            "success": True,
            "message": "周报生成成功",
            "data": {
                "report_type": "weekly",
                "period": f"{week_start.strftime('%Y-%m-%d')} to {week_end.strftime('%Y-%m-%d')}",
                "content": report,
                "summary": {
                    "total": round(this_week_total, 2),
                    "count": len(this_week_trans),
                    "change_percent": change_percent,
                }
            }
        }
    
    async def generate_monthly_report(
        self,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        生成月报
        """
        now = datetime.now()
        
        # 本月起止时间
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_end = now
        
        # 上月起止时间
        first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_end = first_of_this_month - timedelta(seconds=1)
        last_month_start = last_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # 获取交易数据
        this_month_trans = await self._get_transactions(db, month_start, month_end)
        last_month_trans = await self._get_transactions(db, last_month_start, last_month_end)
        
        # 计算数据
        this_month_total = sum(t.amount for t in this_month_trans)
        last_month_total = sum(t.amount for t in last_month_trans)
        
        change_percent = 0
        if last_month_total > 0:
            change_percent = round((this_month_total - last_month_total) / last_month_total * 100, 1)
        
        # 类别分布
        category_dist = self._get_category_distribution(this_month_trans)
        
        # 日均消费
        days_passed = (now - month_start).days + 1
        daily_avg = this_month_total / days_passed if days_passed > 0 else 0
        
        # 生成报告
        report = f"""📊 **本月消费月报**

📅 时间：{month_start.strftime('%Y年%m月')}

💰 **总支出**：{round(this_month_total, 2)}元
   本月记账：{len(this_month_trans)}笔
   日均消费：{round(daily_avg, 2)}元

📈 **环比变化**：{self._get_change_emoji(change_percent)} {abs(change_percent)}%

🏷️ **消费分布**：
"""
        for cat in category_dist:
            report += f"   • {cat['name']}：{cat['amount']}元 ({cat['percentage']}%)\n"
        
        # 预算执行情况
        budget_status = await self._get_budget_status(db, this_month_trans)
        if budget_status:
            report += f"\n💵 **预算执行**：\n"
            for status in budget_status:
                report += f"   • {status['name']}：{status['spent']}/{status['budget']}元 ({status['percentage']}%)\n"
        
        return {
            "success": True,
            "message": "月报生成成功",
            "data": {
                "report_type": "monthly",
                "period": month_start.strftime('%Y-%m'),
                "content": report,
                "summary": {
                    "total": round(this_month_total, 2),
                    "count": len(this_month_trans),
                    "daily_avg": round(daily_avg, 2),
                    "change_percent": change_percent,
                }
            }
        }
    
    async def check_daily_record_reminder(
        self,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        检查是否需要记账提醒
        
        规则：
        - 今天还没记账，且现在时间>提醒时间
        - 昨天也没记账
        """
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 检查今天是否有记账
        query = select(Transaction).where(
            and_(
                Transaction.deleted_at.is_(None),
                Transaction.created_at >= today_start
            )
        )
        result = await db.execute(query)
        today_transactions = result.scalars().all()
        
        if len(today_transactions) > 0:
            return {
                "success": True,
                "message": "今天已记账，无需提醒",
                "data": {"need_reminder": False}
            }
        
        # 检查昨天
        yesterday_start = today_start - timedelta(days=1)
        yesterday_query = select(Transaction).where(
            and_(
                Transaction.deleted_at.is_(None),
                Transaction.created_at >= yesterday_start,
                Transaction.created_at < today_start
            )
        )
        yesterday_result = await db.execute(yesterday_query)
        yesterday_transactions = yesterday_result.scalars().all()
        
        consecutive_days = 0 if len(yesterday_transactions) == 0 else 1
        
        # 生成提醒内容
        reminder = {
            "need_reminder": True,
            "type": "daily_record",
            "message": "今天还没记账哦，快记录一下今天的消费吧！📝",
            "streak_info": f"已连续{consecutive_days}天记账" if consecutive_days > 0 else "开始记账打卡吧！",
        }
        
        return {
            "success": True,
            "message": "生成记账提醒",
            "data": reminder
        }
    
    async def _get_transactions(
        self,
        db: AsyncSession,
        start_date: datetime,
        end_date: datetime
    ) -> List[Transaction]:
        """获取指定时间范围的交易"""
        query = select(Transaction).where(
            and_(
                Transaction.deleted_at.is_(None),
                Transaction.transaction_date >= start_date.date(),
                Transaction.transaction_date <= end_date.date()
            )
        )
        result = await db.execute(query)
        return result.scalars().all()
    
    def _get_category_distribution(self, transactions: List[Transaction]) -> List[Dict]:
        """计算类别分布"""
        from collections import defaultdict
        
        category_totals = defaultdict(float)
        for t in transactions:
            category_totals[t.category] += t.amount
        
        total = sum(category_totals.values())
        
        category_names = {
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
        
        distribution = []
        for cat, amount in sorted(category_totals.items(), key=lambda x: x[1], reverse=True):
            distribution.append({
                "category": cat,
                "name": category_names.get(cat, cat),
                "amount": round(amount, 2),
                "percentage": round(amount / total * 100, 1) if total > 0 else 0,
            })
        
        return distribution
    
    def _get_change_emoji(self, change_percent: float) -> str:
        """获取变化emoji"""
        if change_percent > 10:
            return "📈"
        elif change_percent > 0:
            return "↗️"
        elif change_percent == 0:
            return "➡️"
        elif change_percent > -10:
            return "↘️"
        else:
            return "📉"
    
    def _generate_weekly_insights(
        self,
        this_week_total: float,
        last_week_total: float,
        change_percent: float,
        category_dist: List[Dict]
    ) -> List[str]:
        """生成周报洞察"""
        insights = []
        
        # 趋势洞察
        if change_percent > 20:
            insights.append(f"本周消费增加较多，主要来自{category_dist[0]['name']}")
        elif change_percent < -20:
            insights.append("消费控制得很好，继续保持！")
        
        # 类别洞察
        if category_dist:
            top_category = category_dist[0]
            if top_category['percentage'] > 50:
                insights.append(f"{top_category['name']}支出占比较高，可适当控制")
        
        return insights
    
    async def _get_budget_status(
        self,
        db: AsyncSession,
        transactions: List[Transaction]
    ) -> List[Dict]:
        """获取预算执行状态"""
        # 查询预算
        query = select(Budget).where(Budget.deleted_at.is_(None))
        result = await db.execute(query)
        budgets = result.scalars().all()
        
        if not budgets:
            return []
        
        # 计算各类别消费
        category_spending = {}
        for t in transactions:
            if t.category not in category_spending:
                category_spending[t.category] = 0
            category_spending[t.category] += t.amount
        
        category_names = {
            "food": "餐饮",
            "transport": "交通",
            "shopping": "购物",
            "entertainment": "娱乐",
            "housing": "居住",
        }
        
        status_list = []
        for budget in budgets:
            spent = category_spending.get(budget.category, 0)
            percentage = spent / budget.amount if budget.amount > 0 else 0
            
            status_list.append({
                "category": budget.category,
                "name": category_names.get(budget.category, budget.category),
                "budget": budget.amount,
                "spent": round(spent, 2),
                "percentage": round(percentage * 100, 1),
            })
        
        return status_list
