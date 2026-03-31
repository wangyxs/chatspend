/**
 * HomeScreen - 主屏幕（重构版）
 * 
 * 参考王自如AI产品的薄客户端架构：
 * - 后端决定展示什么组件
 * - 前端只负责渲染
 * - 无缝对话体验
 * - 支持多意图、批量操作
 */
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
import UIComponentRenderer, { UIComponent, UIComponentType } from '@/components/UIComponentRenderer';

import { useTransactionStore } from '@/stores/transactionStore';
import { api } from '@/services/api';
import { localDB } from '@/services/storage';

// 聊天响应类型（后端驱动）
interface ChatResponse {
  success: boolean;
  message: string;
  components: UIComponent[];
  conversation_id?: string;
  suggested_replies?: string[];
  emotion?: string;
  typing_duration?: number;
}

// 消息类型
interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  components?: UIComponent[];
  createdAt: string;
}

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
      const welcomeComponents: UIComponent[] = [
        {
          type: UIComponentType.TEXT,
          data: '你好！我是ChatSpend记账助手 👋\n\n你可以这样告诉我你的消费：',
        },
        {
          type: UIComponentType.QUICK_ACTIONS,
          data: {
            title: '试试这些：',
            actions: [
              { label: '午饭花了35元', action: 'demo_lunch', icon: '🍜' },
              { label: '打车去机场120', action: 'demo_taxi', icon: '🚗' },
              { label: '这个月花了多少', action: 'demo_query', icon: '📊' },
            ],
          },
        },
      ];
      
      addMessage({
        id: Date.now().toString(),
        type: 'bot',
        content: '你好！我是ChatSpend记账助手',
        components: welcomeComponents,
        createdAt: new Date().toISOString(),
      });
    }
  }, []);

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isProcessing) return;

    if (!text) {
      setInputText('');
    }
    setIsProcessing(true);
    setError(null);

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMessage);

    try {
      setLoading(true);
      
      // 调用新的统一对话API
      const response: ChatResponse = await api.chat(messageText);
      
      // 添加机器人消息（后端驱动的UI组件）
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response.message,
        components: response.components || [],
        createdAt: new Date().toISOString(),
      };
      addMessage(botMessage);
      
    } catch (error: any) {
      console.error('Chat error:', error);
      
      // 离线模式：尝试本地解析
      const localResult = parseLocally(messageText);
      if (localResult) {
        const transaction = {
          id: Date.now().toString(),
          ...localResult,
          confidenceScore: 0.5,
          isConfirmed: false,
          createdAt: new Date().toISOString(),
        };
        
        await localDB.insertTransaction(transaction);
        addTransaction(transaction);
        
        const offlineComponents: UIComponent[] = [
          {
            type: UIComponentType.TRANSACTION_CARD,
            data: {
              id: transaction.id,
              amount: transaction.amount,
              category: transaction.category,
              category_icon: getCategoryIcon(transaction.category),
              description: transaction.description,
              date: transaction.transactionDate,
            },
          },
          {
            type: UIComponentType.TEXT,
            data: '📱 离线模式已记录（联网后会同步）',
          },
        ];
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: '离线模式已记录',
          components: offlineComponents,
          createdAt: new Date().toISOString(),
        };
        addMessage(botMessage);
      } else {
        setError(error.message || '网络错误，请稍后重试');
        
        const errorComponents: UIComponent[] = [
          {
            type: UIComponentType.TEXT,
            data: '❌ 网络连接失败，请检查网络后重试',
          },
        ];
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: '网络连接失败',
          components: errorComponents,
          createdAt: new Date().toISOString(),
        };
        addMessage(botMessage);
      }
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  // 处理快捷操作
  const handleAction = (action: string, params?: any) => {
    // 快捷操作直接作为用户输入
    if (action === 'demo_lunch') {
      handleSend('午饭花了35元');
    } else if (action === 'demo_taxi') {
      handleSend('打车去机场120元');
    } else if (action === 'demo_query') {
      handleSend('这个月花了多少');
    } else if (action === 'suggested_reply') {
      // 建议回复直接发送
      handleSend(params?.text || action);
    } else {
      // 其他操作
      handleSend(action);
    }
  };

  // 简单的本地解析（离线备用）
  const parseLocally = (text: string) => {
    // 金额匹配
    const amountMatch = text.match(/(\d+(?:\.\d+)?)/);
    if (!amountMatch) return null;
    
    const amount = parseFloat(amountMatch[1]);
    
    // 类别推断
    const categoryMap: Record<string, string[]> = {
      'food': ['饭', '餐', '吃', '午饭', '晚饭', '早餐', '外卖', '肯德基', '麦当劳'],
      'transport': ['打车', '滴滴', '地铁', '公交', '加油', '停车'],
      'shopping': ['买', '购', '淘宝', '京东', '超市'],
      'entertainment': ['电影', '游戏', '唱歌', 'KTV'],
      'other': [],
    };
    
    let category = 'other';
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

  // 获取类别图标
  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      food: '🍜',
      transport: '🚗',
      shopping: '🛍️',
      entertainment: '🎮',
      housing: '🏠',
      medical: '🏥',
      education: '📚',
      salary: '💰',
      investment: '📈',
      other: '📦',
    };
    return icons[category] || '📦';
  };

  // 渲染消息
  const renderMessage = ({ item }: { item: Message }) => {
    if (item.type === 'user') {
      return <MessageBubble message={item} />;
    }
    
    // Bot消息：渲染后端驱动的UI组件
    return (
      <View style={styles.botMessageContainer}>
        {item.components?.map((component, index) => (
          <UIComponentRenderer
            key={`${item.id}-${index}`}
            component={component}
            onAction={handleAction}
          />
        ))}
      </View>
    );
  };

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
          onSend={() => handleSend()}
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
  botMessageContainer: {
    marginTop: 8,
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
