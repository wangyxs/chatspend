"""
LLM客户端封装

提供统一的LLM调用接口，支持OpenAI API
"""
from typing import Optional, Dict, Any, List
from openai import AsyncOpenAI
from loguru import logger

from app.config import settings


class LLMClient:
    """LLM客户端"""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ):
        """
        初始化LLM客户端
        
        Args:
            api_key: OpenAI API密钥
            model: 模型名称
            base_url: 自定义API端点
            temperature: 温度参数
            max_tokens: 最大token数
        """
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.base_url = base_url or settings.OPENAI_BASE_URL
        self.temperature = temperature or settings.OPENAI_TEMPERATURE
        self.max_tokens = max_tokens or settings.OPENAI_MAX_TOKENS
        
        # 初始化客户端
        client_kwargs = {"api_key": self.api_key}
        if self.base_url:
            client_kwargs["base_url"] = self.base_url
        
        self.client = AsyncOpenAI(**client_kwargs)
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> str:
        """
        调用Chat Completion API
        
        Args:
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大token数
            **kwargs: 其他参数
            
        Returns:
            生成的文本内容
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature or self.temperature,
                max_tokens=max_tokens or self.max_tokens,
                **kwargs
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"LLM调用失败: {e}")
            raise
    
    async def parse_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        调用LLM并解析JSON响应
        
        Args:
            prompt: 用户提示
            system_prompt: 系统提示
            
        Returns:
            解析后的JSON对象
        """
        import json
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        response = await self.chat_completion(messages)
        
        try:
            # 尝试解析JSON
            return json.loads(response)
        except json.JSONDecodeError:
            # 如果解析失败，尝试提取JSON部分
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            raise ValueError(f"无法解析JSON响应: {response}")
    
    async def classify(
        self,
        text: str,
        labels: List[str],
        system_prompt: Optional[str] = None
    ) -> str:
        """
        文本分类
        
        Args:
            text: 待分类文本
            labels: 标签列表
            system_prompt: 系统提示
            
        Returns:
            分类标签
        """
        if not system_prompt:
            system_prompt = f"你是一个分类器。请从以下标签中选择最合适的一个：{', '.join(labels)}。只返回标签名称，不要返回其他内容。"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ]
        
        response = await self.chat_completion(messages, temperature=0.1)
        return response.strip()
    
    async def extract_entities(
        self,
        text: str,
        entity_types: List[str],
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        实体提取
        
        Args:
            text: 待提取文本
            entity_types: 实体类型列表
            system_prompt: 系统提示
            
        Returns:
            提取的实体字典
        """
        if not system_prompt:
            system_prompt = f"""你是一个实体提取器。请从文本中提取以下类型的实体：{', '.join(entity_types)}。

请以JSON格式返回，例如：
{{
    "amount": 35.5,
    "category": "餐饮",
    "date": "2024-01-15"
}}

如果某个实体不存在，请返回null。只返回JSON，不要返回其他内容。"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ]
        
        response = await self.chat_completion(messages, temperature=0.1)
        
        import json
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            logger.error(f"实体提取JSON解析失败: {response}")
            return {}
    
    async def transcribe_audio(self, audio_path: str) -> str:
        """
        语音转文字
        
        使用 OpenAI Whisper API
        
        Args:
            audio_path: 音频文件路径
            
        Returns:
            转录的文字
        """
        try:
            with open(audio_path, "rb") as audio_file:
                transcript = await self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="zh"
                )
            
            return transcript.text
            
        except Exception as e:
            logger.error(f"语音识别失败: {e}")
            raise
    
    async def recognize_image(self, image_data: bytes) -> Dict[str, Any]:
        """
        图片识别
        
        使用 GPT-4 Vision API
        
        Args:
            image_data: 图片二进制数据
            
        Returns:
            识别的交易信息
        """
        import base64
        import json
        
        try:
            # Base64编码图片
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            # 调用 GPT-4 Vision
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": """请识别这张图片中的交易信息（小票、账单、订单截图等）。

请以JSON格式返回：
{
    "transactions": [
        {
            "amount": 金额（数字）,
            "category": "消费类别（餐饮/交通/购物/娱乐/其他）",
            "description": "消费描述",
            "date": "日期（YYYY-MM-DD格式，如无法识别则为今天）"
        }
    ],
    "raw_text": "图片中的原始文字"
}

如果没有识别到交易信息，请返回：
{
    "transactions": [],
    "raw_text": "识别到的文字内容"
}

只返回JSON，不要返回其他内容。"""
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1000
            )
            
            # 解析响应
            result_text = response.choices[0].message.content
            
            # 尝试解析JSON
            try:
                return json.loads(result_text)
            except json.JSONDecodeError:
                # 提取JSON部分
                import re
                json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
                return {"transactions": [], "raw_text": result_text}
            
        except Exception as e:
            logger.error(f"图片识别失败: {e}")
            raise


# 全局LLM客户端实例
llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """获取LLM客户端实例"""
    global llm_client
    if llm_client is None:
        llm_client = LLMClient()
    return llm_client


def init_llm_client():
    """初始化LLM客户端"""
    global llm_client
    llm_client = LLMClient()
    logger.info(f"LLM客户端初始化完成，模型: {settings.OPENAI_MODEL}")
