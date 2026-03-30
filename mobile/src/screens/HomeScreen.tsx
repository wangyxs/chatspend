import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ChatInput from '@/components/ChatInput';
import MessageBubble from '@/components/MessageBubble';
import TransactionCard from '@/components/TransactionCard';

import { useTransactionStore } from '@/stores/transactionStore';
import { api } from '@/services/api';
import { localDB } from '@/services/storage';
import { Message, Transaction, ParseResponse } from '@/types';

export default function HomeScreen() {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  
  const { 
    messages, 
    addMessage, 
    addTransaction, 
    setLoading, 
    setError,
    isLoading 
  } = useTransactionStore();

  // 自动滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // 欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      addMessage({
        id: Date.now().toString(),
        type: 'bot',
        content: '你好！我是ChatSpend记账助手 👋\n\n你可以这样告诉我你的消费：\n• "昨天午饭花了35元"\n• "打车去机场花了120"\n• "买了件外套299块"\n\n试试看吧！',
        createdAt: new Date().toISOString(),
      });
    }
  }, []);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isProcessing) return;

    setInputText('');
    setIsProcessing(true);
    setError(null);

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMessage);

    try {
      // 调用后端API解析
      setLoading(true);
      const response: ParseResponse = await api.parseTransaction(text);
      
      if (response.success && response.transactions.length > 0) {
        // 创建交易
        const createResponse = await api.createTransaction(text);
        
        // 保存到本地数据库
        for (const transaction of createResponse.transactions) {
          await localDB.insertTransaction(transaction);
          addTransaction(transaction);
        }

        // 添加成功消息
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: '✅ 已成功记录！',
          transaction: createResponse.transactions[0],
          createdAt: new Date().toISOString(),
        };
        addMessage(botMessage);
      } else {
        // 解析失败
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: response.message || '抱歉，我没太理解你的意思。能再说详细一点吗？比如"午饭花了50元"',
          createdAt: new Date().toISOString(),
        };
        addMessage(botMessage);
      }
    } catch (error: any) {
      console.error('Parse error:', error);
      
      // 离线模式：尝试本地解析
      const localResult = parseLocally(text);
      if (localResult) {
        const transaction: Transaction = {
          id: Date.now().toString(),
          ...localResult,
          confidenceScore: 0.5,
          isConfirmed: false,
          createdAt: new Date().toISOString(),
        };
        
        await localDB.insertTransaction(transaction);
        addTransaction(transaction);
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: '📱 离线模式已记录（联网后会同步）',
          transaction,
          createdAt: new Date().toISOString(),
        };
        addMessage(botMessage);
      } else {
        setError(error.message || '网络错误，请稍后重试');
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: '❌ 网络连接失败，请检查网络后重试',
          createdAt: new Date().toISOString(),
        };
        addMessage(botMessage);
      }
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  // 简单的本地解析（离线备用）
  const parseLocally = (text: string): Omit<Transaction, 'id' | 'confidenceScore' | 'isConfirmed' | 'createdAt'> | null => {
    // 金额匹配
    const amountMatch = text.match(/(\d+(?:\.\d+)?)/);
    if (!amountMatch) return null;
    
    const amount = parseFloat(amountMatch[1]);
    
    // 类别推断
    const categoryMap: Record<string, string[]> = {
      '餐饮': ['饭', '餐', '吃', '午饭', '晚饭', '早餐', '外卖', '肯德基', '麦当劳'],
      '交通': ['打车', '滴滴', '地铁', '公交', '加油', '停车'],
      '购物': ['买', '购', '淘宝', '京东', '超市'],
      '娱乐': ['电影', '游戏', '唱歌', 'KTV'],
      '日用': ['水电', '话费', '网费', '理发'],
    };
    
    let category = '其他';
    for (const [cat, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(k => text.includes(k))) {
        category = cat;
        break;
      }
    }
    
    return {
      amount,
      category,
      description: text,
      transactionDate: new Date().toISOString().split('T')[0],
    };
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble message={item} />
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={90}
      >
        {/* 消息列表 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />

        {/* 加载指示器 */}
        {(isLoading || isProcessing) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.loadingText}>正在分析...</Text>
          </View>
        )}

        {/* 输入区域 */}
        <ChatInput
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          disabled={isProcessing}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
});
