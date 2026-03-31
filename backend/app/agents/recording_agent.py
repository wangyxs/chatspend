"""
Recording Agent - Natural language transaction parser
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import re
import json
from loguru import logger

from app.core.config import settings
from app.core.llm import get_llm_client, LLMClient
from app.models import Transaction


class RecordingAgent:
    """
    Recording Agent for parsing natural language into transactions
    
    Capabilities:
    - Parse natural language descriptions
    - Extract amount, category, date, time
    - Handle fuzzy time expressions
    - Intelligent categorization
    - Multi-transaction parsing
    """
    
    def __init__(self):
        """初始化Recording Agent"""
        # 获取LLM客户端
        self.llm_client = get_llm_client() if settings.OPENAI_API_KEY else None
        self.category_rules = self._load_category_rules()
    
    def _load_category_rules(self) -> Dict[str, Any]:
        """Load category classification rules"""
        return {
            "餐饮美食": {
                "keywords": ["饭", "餐", "吃", "外卖", "美团", "饿了么", "午饭", "晚饭", "早餐", "夜宵", "点餐"],
                "subcategories": {
                    "早餐": ["早餐", "早饭", "包子", "豆浆", "油条"],
                    "午餐": ["午餐", "午饭", "中午", "工作餐"],
                    "晚餐": ["晚餐", "晚饭", "晚上", "聚餐"],
                    "夜宵": ["夜宵", "宵夜", "烧烤", "小龙虾"],
                    "外卖": ["外卖", "美团", "饿了么", "点餐"],
                    "零食饮料": ["奶茶", "咖啡", "零食", "饮料", "水果"],
                }
            },
            "交通出行": {
                "keywords": ["打车", "滴滴", "地铁", "公交", "出租", "加油", "停车", "高铁", "火车", "飞机", "机票"],
                "subcategories": {
                    "打车": ["打车", "滴滴", "出租", "网约车", "快车"],
                    "公共交通": ["地铁", "公交", "地铁卡", "公交卡"],
                    "自驾": ["加油", "停车", "过路费", "洗车", "保养"],
                    "长途交通": ["高铁", "火车", "飞机", "机票", "车票"],
                }
            },
            "购物消费": {
                "keywords": ["买", "购物", "淘宝", "京东", "超市", "商场", "网购", "下单"],
                "subcategories": {
                    "网购": ["淘宝", "京东", "拼多多", "天猫", "网购", "下单"],
                    "线下购物": ["超市", "商场", "便利店", "菜市场"],
                    "服饰": ["衣服", "鞋", "包", "服装", "外套"],
                    "数码": ["手机", "电脑", "耳机", "数码", "电子"],
                }
            },
            "娱乐休闲": {
                "keywords": ["电影", "游戏", "KTV", "酒吧", "旅游", "景点", "门票", "演唱会"],
                "subcategories": {
                    "电影": ["电影", "影院", "观影"],
                    "游戏": ["游戏", "充值", "会员"],
                    "旅游": ["旅游", "景点", "门票", "酒店"],
                    "夜生活": ["KTV", "酒吧", "夜店"],
                }
            },
            "生活服务": {
                "keywords": ["理发", "洗衣", "快递", "充值", "缴费", "水电", "物业"],
                "subcategories": {
                    "美容美发": ["理发", "美发", "美容", "美甲"],
                    "快递物流": ["快递", "物流", "邮寄"],
                    "生活缴费": ["充值", "缴费", "水电", "物业", "话费"],
                }
            },
            "医疗健康": {
                "keywords": ["医院", "药店", "体检", "看病", "药"],
                "subcategories": {
                    "就医": ["医院", "看病", "挂号", "检查"],
                    "购药": ["药店", "买药", "药品"],
                    "体检": ["体检", "健康"],
                }
            },
            "教育学习": {
                "keywords": ["书", "课程", "培训", "学费", "学习", "教育"],
                "subcategories": {
                    "书籍": ["书", "书籍", "教材"],
                    "培训": ["课程", "培训", "学习"],
                    "学费": ["学费", "教育"],
                }
            },
            "人情往来": {
                "keywords": ["红包", "礼物", "请客", "份子钱", "礼金"],
                "subcategories": {
                    "红包": ["红包", "转账", "礼金"],
                    "礼物": ["礼物", "礼品"],
                    "请客": ["请客", "请吃饭"],
                }
            },
            "收入": {
                "keywords": ["工资", "奖金", "收入", "进账", "收到"],
                "subcategories": {
                    "工资": ["工资", "薪水"],
                    "奖金": ["奖金", "年终奖"],
                    "其他收入": ["收入", "进账", "收到"],
                }
            },
        }
    
    async def parse_transaction(
        self,
        text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Parse natural language text into transaction(s)
        
        Args:
            text: Natural language description (e.g., "今天午饭花了35块")
            context: Additional context (current time, user preferences, etc.)
        
        Returns:
            List of parsed transactions
        """
        logger.info(f"Parsing transaction: {text}")
        
        # 1. Extract basic information with rules
        rule_result = self._rule_based_parse(text, context)
        
        # 2. If confidence is low, use LLM for better parsing
        if rule_result.get("confidence", 0) < 0.8:
            llm_result = await self._llm_based_parse(text, context)
            return llm_result
        
        return [rule_result]
    
    def _rule_based_parse(
        self,
        text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Rule-based transaction parsing (fast)
        """
        current_time = context.get("current_time", datetime.now()) if context else datetime.now()
        
        # Extract amount
        amount = self._extract_amount(text)
        
        # Extract time
        transaction_date, transaction_time = self._extract_time(text, current_time)
        
        # Extract category
        category, subcategory = self._infer_category(text)
        
        # Extract description
        description = self._extract_description(text)
        
        # Calculate confidence
        confidence = self._calculate_confidence(amount, category, transaction_date)
        
        return {
            "amount": amount,
            "category": category,
            "subcategory": subcategory,
            "transaction_date": transaction_date,
            "transaction_time": transaction_time,
            "description": description,
            "confidence": confidence,
            "requires_confirmation": confidence < 0.8,
        }
    
    def _extract_amount(self, text: str) -> Optional[float]:
        """Extract amount from text"""
        # Pattern 1: 数字+单位 (35块, 35元, 35块钱)
        pattern1 = r'(\d+(?:\.\d{1,2})?)\s*(块|元|块钱|元钱)'
        match1 = re.search(pattern1, text)
        if match1:
            return float(match1.group(1))
        
        # Pattern 2: 中文数字 (一百二, 两百五)
        chinese_nums = {
            "零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4,
            "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
            "百": 100, "千": 1000, "万": 10000
        }
        
        # Pattern 3: 纯数字
        pattern3 = r'(\d+(?:\.\d{1,2})?)'
        match3 = re.search(pattern3, text)
        if match3:
            return float(match3.group(1))
        
        return None
    
    def _extract_time(
        self,
        text: str,
        current_time: datetime
    ) -> tuple[str, Optional[str]]:
        """
        Extract transaction date and time from text
        
        Returns:
            (date: YYYY-MM-DD, time: HH:MM:SS)
        """
        date = current_time.strftime("%Y-%m-%d")
        time = None
        
        # Time keywords
        if "今天" in text:
            date = current_time.strftime("%Y-%m-%d")
        elif "昨天" in text:
            yesterday = current_time - timedelta(days=1)
            date = yesterday.strftime("%Y-%m-%d")
        elif "前天" in text:
            day_before_yesterday = current_time - timedelta(days=2)
            date = day_before_yesterday.strftime("%Y-%m-%d")
        
        # Specific time
        if "早上" in text or "早晨" in text:
            time = "08:00:00"
        elif "中午" in text:
            time = "12:00:00"
        elif "下午" in text:
            time = "15:00:00"
        elif "晚上" in text or "今晚" in text:
            time = "18:00:00"
        elif "夜宵" in text:
            time = "22:00:00"
        
        return date, time
    
    def _infer_category(self, text: str) -> tuple[str, Optional[str]]:
        """
        Infer category from text using keyword matching
        
        Returns:
            (category, subcategory)
        """
        for category, config in self.category_rules.items():
            # Check main keywords
            if any(keyword in text for keyword in config["keywords"]):
                # Check subcategories
                for subcategory, sub_keywords in config.get("subcategories", {}).items():
                    if any(keyword in text for keyword in sub_keywords):
                        return category, subcategory
                
                # Return main category if no subcategory matched
                return category, None
        
        # Default category
        return "其他", None
    
    def _extract_description(self, text: str) -> str:
        """Extract description from text"""
        # Remove common verbs and particles
        desc = text
        for word in ["花了", "买了", "消费", "块", "元", "块钱", "今天", "昨天", "前天"]:
            desc = desc.replace(word, "")
        
        return desc.strip()
    
    def _calculate_confidence(
        self,
        amount: Optional[float],
        category: str,
        date: str
    ) -> float:
        """Calculate parsing confidence score"""
        confidence = 1.0
        
        if amount is None:
            confidence *= 0.5
        
        if category == "其他":
            confidence *= 0.7
        
        return confidence
    
    async def _llm_based_parse(
        self,
        text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        LLM-based transaction parsing (accurate)
        """
        current_time = context.get("current_time", datetime.now()) if context else datetime.now()
        
        prompt = f"""你是一个记账助手。请从以下自然语言中提取交易信息。

用户输入: "{text}"
当前时间: {current_time.strftime("%Y-%m-%d %H:%M:%S")}

请提取以下信息:
1. 金额(amount): 数字,单位为元
2. 类别(category): 餐饮美食、交通出行、购物消费、娱乐休闲、生活服务、医疗健康、教育学习、人情往来、收入、其他
3. 子类别(subcategory): 根据描述细分
4. 日期(transaction_date): YYYY-MM-DD格式
5. 时间(transaction_time): HH:MM:SS格式,可选
6. 描述(description): 简洁的描述

返回JSON数组格式,如果包含多笔交易请分别列出:
[
  {{
    "amount": 35.00,
    "category": "餐饮美食",
    "subcategory": "午餐",
    "transaction_date": "2026-03-30",
    "transaction_time": "12:00:00",
    "description": "午饭",
    "confidence": 0.95
  }}
]

只返回JSON数组,不要其他说明文字。"""

        try:
            # 使用LLM客户端调用
            result_text = await self.llm_client.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=500
            )
            
            # Parse JSON
            transactions = json.loads(result_text)
            
            return transactions
            
        except Exception as e:
            logger.error(f"LLM parsing failed: {e}")
            # Fallback to rule-based result
            return [self._rule_based_parse(text, context)]
    
    async def parse_multiple(
        self,
        texts: List[str],
        context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Parse multiple transactions from text
        Example: "今天午饭花了35块，打车回来花了28"
        """
        # Split by common separators
        combined_text = " ".join(texts)
        
        # Try to split by common patterns
        separators = ["，", "、", "；", ",", ";"]
        
        # Use LLM to parse multiple transactions
        transactions = await self._llm_based_parse(combined_text, context)
        
        return transactions
