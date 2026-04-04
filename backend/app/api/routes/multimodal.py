"""
多模态API路由 - 语音识别、图片识别
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
from datetime import datetime
import os
import tempfile

from app.core import get_db
from app.core.llm import LLMClient
from app.agents import RecordingAgent
from app.agents.orchestrator import OrchestratorAgent

router = APIRouter(tags=["multimodal"])
recording_agent = RecordingAgent()
orchestrator = OrchestratorAgent()
llm_client = LLMClient()


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
):
    """
    语音转文字
    
    使用 OpenAI Whisper API 将语音转换为文字
    """
    try:
        logger.info(f"Transcribing audio: {audio.filename}")
        
        # 保存临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix=".m4a") as tmp_file:
            content = await audio.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            # 使用 OpenAI Whisper API 转录
            text = await llm_client.transcribe_audio(tmp_path)
            
            return {
                "text": text,
                "success": True
            }
        finally:
            # 清理临时文件
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"语音识别失败: {str(e)}"
        )


@router.post("/recognize")
async def recognize_image(
    image: UploadFile = File(...),
):
    """
    图片识别
    
    使用 GPT-4 Vision 识别图片中的交易信息（小票、账单等）
    """
    try:
        logger.info(f"Recognizing image: {image.filename}")
        
        # 读取图片
        image_data = await image.read()
        
        # 使用 GPT-4 Vision 识别
        result = await llm_client.recognize_image(image_data)
        
        return {
            "transactions": result.get("transactions", []),
            "raw_text": result.get("raw_text", ""),
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Image recognition failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"图片识别失败: {str(e)}"
        )


@router.post("/transactions/voice")
async def create_transaction_from_voice(
    audio: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    语音识别并创建交易
    
    流程：
    1. 语音转文字（Whisper）
    2. 文字解析为交易信息（LLM）
    3. 创建交易记录
    """
    try:
        logger.info(f"Creating transaction from voice: {audio.filename}")
        
        # 保存临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix=".m4a") as tmp_file:
            content = await audio.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            # 1. 语音转文字
            text = await llm_client.transcribe_audio(tmp_path)
            logger.info(f"Transcribed text: {text}")
            
            # 2. 解析交易信息
            context = {
                "current_time": datetime.now(),
                "input_type": "voice"
            }
            
            result = await orchestrator.process(text, context)
            
            return result
            
        finally:
            # 清理临时文件
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        
    except Exception as e:
        logger.error(f"Voice transaction creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"语音记账失败: {str(e)}"
        )


@router.post("/transactions/image")
async def create_transaction_from_image(
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    图片识别并创建交易
    
    流程：
    1. 图片识别（GPT-4 Vision）
    2. 提取交易信息
    3. 创建交易记录
    """
    try:
        logger.info(f"Creating transaction from image: {image.filename}")
        
        # 读取图片
        image_data = await image.read()
        
        # 1. 图片识别
        result = await llm_client.recognize_image(image_data)
        logger.info(f"Recognized transactions: {result}")
        
        # 2. 通过 Orchestrator 处理
        context = {
            "current_time": datetime.now(),
            "input_type": "image",
            "db_session": db
        }
        
        # 将识别结果转为文本描述
        transactions = result.get("transactions", [])
        if not transactions:
            return {
                "success": False,
                "message": "未能识别出交易信息",
                "components": []
            }
        
        # 构造描述文本
        descriptions = []
        for trans in transactions:
            desc = f"{trans.get('description', '消费')} {trans.get('amount', 0)}元"
            descriptions.append(desc)
        
        text = "，".join(descriptions)
        
        # 3. 创建交易记录
        response = await orchestrator.process(text, context)
        
        return response
        
    except Exception as e:
        logger.error(f"Image transaction creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"图片记账失败: {str(e)}"
        )
