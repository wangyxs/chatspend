"""
Analysis Agent - 分析师Agent

职责：
1. 消费统计分析（日/周/月/年）
2. 类别分布分析
3. 消费趋势预测
4. 异常消费检测
5. 智能洞察生成

设计原则：
- 基于数据的客观分析
- 洞察要有actionable价值
- 趋势预测要说明置信度
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from loguru import logger

from app.models import Transaction


class AnalysisAgent:
    """Analysis Agent - 消费分析师"""
    
    def __init__(self):
        # 类别中文名映射
        self.category_names = {
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
        
        # 洞察模板
        self.insight_templates = {
            "high_category": "你在{category}上花费最多，共{amount}元，占总支出的{percentage}%",
            "trend_up": "本周消费{week_total}元，比上周增加{change}%",
            "trend_down": "本周消费{week_total}元，比上周减少{change}%，继续加油！",
            "anomaly": "发现异常消费：{description}，金额{amount}元，远高于日常{category}支出",
            "saving_tip": "建议：{tip}",
            "budget_alert": "本月{category}已花费{spent}元，占预算{percentage}%",
        }
    
    async def analyze(
        self,
        db: AsyncSession,
        user_id: Optional[str] = None,
        time_range: str = "this_month"
    ) -> Dict[str, Any]:
        """
        执行消费分析
        
        Args:
            db: 数据库会话
            user_id: 用户ID（预留）
            time_range: 时间范围
            
        Returns:
            分析结果
        """
        # 1. 确定时间范围
        start_date, end_date = self._get_time_range(time_range)
        
        # 2. 获取交易数据
        transactions = await self._get_transactions(db, start_date, end_date)
        
        if not transactions:
            return {
                "success": True,
                "message": f"该时间段内没有消费记录",
                "data": None
            }
        
        # 3. 执行多维度分析
        total_spending = sum(t.amount for t in transactions)
        category_distribution = self._analyze_category_distribution(transactions)
        daily_trend = self._analyze_daily_trend(transactions)
        weekly_comparison = await self._compare_weekly(db, transactions)
        anomalies = self._detect_anomalies(transactions)
        
        # 4. 生成洞察
        insights = self._generate_insights(
            total_spending,
            category_distribution,
            weekly_comparison,
            anomalies
        )
        
        return {
            "success": True,
            "message": "分析完成",
            "data": {
                "time_range": time_range,
                "total_spending": total_spending,
                "transaction_count": len(transactions),
                "category_distribution": category_distribution,
                "daily_trend": daily_trend,
                "weekly_comparison": weekly_comparison,
                "anomalies": anomalies,
                "insights": insights,
            }
        }
    
    def _get_time_range(self, time_range: str) -> tuple[datetime, datetime]:
        """根据时间范围参数获取起止日期"""
        now = datetime.now()
        
        if time_range == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now
        elif time_range == "this_week":
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now
        elif time_range == "this_month":
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end = now
        elif time_range == "last_month":
            first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end = first_of_this_month - timedelta(seconds=1)
            start = end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif time_range == "this_year":
            start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            end = now
        else:
            # 默认本月
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end = now
        
        return start, end
    
    async def _get_transactions(
        self,
        db: AsyncSession,
        start_date: datetime,
        end_date: datetime
    ) -> List[Transaction]:
        """获取指定时间范围的交易记录"""
        query = select(Transaction).where(
            and_(
                Transaction.deleted_at.is_(None),
                Transaction.transaction_date >= start_date.date(),
                Transaction.transaction_date <= end_date.date()
            )
        ).order_by(Transaction.transaction_date.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
    
    def _analyze_category_distribution(self, transactions: List[Transaction]) -> Dict[str, Any]:
        """分析类别分布"""
        category_totals = defaultdict(float)
        category_counts = defaultdict(int)
        
        for t in transactions:
            category_totals[t.category] += t.amount
            category_counts[t.category] += 1
        
        total = sum(category_totals.values())
        
        distribution = []
        for category, amount in sorted(category_totals.items(), key=lambda x: x[1], reverse=True):
            distribution.append({
                "category": category,
                "category_name": self.category_names.get(category, category),
                "amount": round(amount, 2),
                "count": category_counts[category],
                "percentage": round(amount / total * 100, 1) if total > 0 else 0,
            })
        
        return {
            "total": round(total, 2),
            "distribution": distribution,
        }
    
    def _analyze_daily_trend(self, transactions: List[Transaction]) -> List[Dict[str, Any]]:
        """分析每日趋势"""
        daily_totals = defaultdict(float)
        
        for t in transactions:
            date_str = t.transaction_date.strftime("%Y-%m-%d")
            daily_totals[date_str] += t.amount
        
        trend = []
        for date_str in sorted(daily_totals.keys()):
            trend.append({
                "date": date_str,
                "amount": round(daily_totals[date_str], 2),
            })
        
        return trend[-30:]  # 返回最近30天
    
    async def _compare_weekly(
        self,
        db: AsyncSession,
        current_transactions: List[Transaction]
    ) -> Dict[str, Any]:
        """对比本周与上周"""
        now = datetime.now()
        
        # 本周
        this_week_start = now - timedelta(days=now.weekday())
        this_week_total = sum(
            t.amount for t in current_transactions
            if t.transaction_date >= this_week_start.date()
        )
        
        # 上周
        last_week_start = this_week_start - timedelta(days=7)
        last_week_end = this_week_start - timedelta(days=1)
        
        last_week_trans = await self._get_transactions(
            db,
            last_week_start,
            last_week_end
        )
        last_week_total = sum(t.amount for t in last_week_trans)
        
        # 计算变化
        if last_week_total > 0:
            change_percent = round((this_week_total - last_week_total) / last_week_total * 100, 1)
        else:
            change_percent = 0
        
        return {
            "this_week": round(this_week_total, 2),
            "last_week": round(last_week_total, 2),
            "change_percent": change_percent,
            "trend": "up" if change_percent > 0 else "down" if change_percent < 0 else "stable",
        }
    
    def _detect_anomalies(self, transactions: List[Transaction]) -> List[Dict[str, Any]]:
        """检测异常消费"""
        if len(transactions) < 10:
            return []
        
        anomalies = []
        
        # 1. 按类别统计平均值和标准差
        category_stats = defaultdict(list)
        for t in transactions:
            category_stats[t.category].append(t.amount)
        
        category_avg_std = {}
        for category, amounts in category_stats.items():
            avg = sum(amounts) / len(amounts)
            variance = sum((a - avg) ** 2 for a in amounts) / len(amounts)
            std = variance ** 0.5
            category_avg_std[category] = {"avg": avg, "std": std}
        
        # 2. 检测异常值（超过平均值+2倍标准差）
        for t in transactions[-20:]:  # 只检查最近20笔
            stats = category_avg_std.get(t.category)
            if stats and stats["std"] > 0:
                threshold = stats["avg"] + 2 * stats["std"]
                if t.amount > threshold:
                    anomalies.append({
                        "transaction_id": t.id,
                        "amount": t.amount,
                        "category": t.category,
                        "description": t.description,
                        "date": t.transaction_date.strftime("%Y-%m-%d"),
                        "reason": f"超过{self.category_names.get(t.category, t.category)}平均消费{round(stats['avg'], 2)}元的{round(t.amount/stats['avg'], 1)}倍",
                    })
        
        return anomalies[:3]  # 最多返回3个异常
    
    def _generate_insights(
        self,
        total_spending: float,
        category_distribution: Dict,
        weekly_comparison: Dict,
        anomalies: List
    ) -> List[str]:
        """生成智能洞察"""
        insights = []
        
        # 1. 最高消费类别
        if category_distribution["distribution"]:
            top_category = category_distribution["distribution"][0]
            insights.append(self.insight_templates["high_category"].format(
                category=top_category["category_name"],
                amount=top_category["amount"],
                percentage=top_category["percentage"]
            ))
        
        # 2. 周对比趋势
        if weekly_comparison["change_percent"] != 0:
            template = "trend_up" if weekly_comparison["trend"] == "up" else "trend_down"
            insights.append(self.insight_templates[template].format(
                week_total=weekly_comparison["this_week"],
                change=abs(weekly_comparison["change_percent"])
            ))
        
        # 3. 异常消费提醒
        for anomaly in anomalies:
            insights.append(self.insight_templates["anomaly"].format(
                description=anomaly["description"],
                amount=anomaly["amount"],
                category=self.category_names.get(anomaly["category"], anomaly["category"])
            ))
        
        # 4. 节省建议
        if category_distribution["distribution"]:
            top_category = category_distribution["distribution"][0]
            if top_category["category"] == "food":
                insights.append(self.insight_templates["saving_tip"].format(
                    tip="可以尝试每周自己做饭2-3次，预计每月可节省500-800元"
                ))
            elif top_category["category"] == "shopping":
                insights.append(self.insight_templates["saving_tip"].format(
                    tip="购物前先列出必需品清单，避免冲动消费"
                ))
        
        return insights
    
    async def get_summary(self, db: AsyncSession, time_range: str = "this_month") -> Dict[str, Any]:
        """获取快速摘要（用于Dashboard）"""
        result = await self.analyze(db, time_range=time_range)
        
        if not result["data"]:
            return {
                "total": 0,
                "count": 0,
                "top_category": None,
                "daily_average": 0,
            }
        
        data = result["data"]
        days = (datetime.now() - self._get_time_range(time_range)[0]).days + 1
        
        return {
            "total": data["total_spending"],
            "count": data["transaction_count"],
            "top_category": data["category_distribution"]["distribution"][0] if data["category_distribution"]["distribution"] else None,
            "daily_average": round(data["total_spending"] / days, 2) if days > 0 else 0,
        }
