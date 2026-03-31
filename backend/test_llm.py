"""
测试LLM集成
"""
import asyncio
import sys
import io

# 设置UTF-8编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.core import get_llm_client, init_llm_client
from app.config import settings


async def test_llm():
    """测试LLM客户端"""
    print(f"检查配置...")
    print(f"  OPENAI_API_KEY: {'已配置' if settings.OPENAI_API_KEY else '未配置'}")
    print(f"  OPENAI_MODEL: {settings.OPENAI_MODEL}")
    print(f"  OPENAI_BASE_URL: {settings.OPENAI_BASE_URL or '默认'}")
    
    if not settings.OPENAI_API_KEY:
        print("\n请在backend/.env文件中配置OPENAI_API_KEY")
        return
    
    # 初始化LLM客户端
    init_llm_client()
    client = get_llm_client()
    
    print(f"\nLLM客户端已初始化")
    
    # 测试1: 简单对话
    print("\n测试1: 简单对话")
    try:
        response = await client.chat_completion([
            {"role": "user", "content": "你好，请用一句话介绍自己"}
        ])
        print(f"  响应: {response}")
        print("  成功")
    except Exception as e:
        print(f"  失败: {e}")
    
    # 测试2: JSON解析
    print("\n测试2: JSON解析")
    try:
        result = await client.parse_json(
            prompt="用户输入：午饭花了35元",
            system_prompt="请从文本中提取金额和类别，返回JSON格式：{\"amount\": 数字, \"category\": \"类别\"}"
        )
        print(f"  结果: {result}")
        print("  成功")
    except Exception as e:
        print(f"  失败: {e}")
    
    # 测试3: 实体提取
    print("\n测试3: 实体提取")
    try:
        entities = await client.extract_entities(
            text="昨天打车花了25块钱去公司",
            entity_types=["amount", "category", "date", "description"]
        )
        print(f"  实体: {entities}")
        print("  成功")
    except Exception as e:
        print(f"  失败: {e}")
    
    print("\n测试完成")


if __name__ == "__main__":
    asyncio.run(test_llm())
