import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '@/types';
import TransactionCard from './TransactionCard';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === 'user';

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.botContainer,
      ]}
    >
      {/* 头像 */}
      <View
        style={[
          styles.avatar,
          isUser ? styles.userAvatar : styles.botAvatar,
        ]}
      >
        <Text style={styles.avatarText}>
          {isUser ? '👤' : '🤖'}
        </Text>
      </View>

      {/* 消息内容 */}
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.botBubble,
        ]}
      >
        <Text style={[styles.messageText, isUser && styles.userText]}>
          {message.content}
        </Text>

        {/* 如果有交易信息，显示交易卡片 */}
        {message.transaction && (
          <TransactionCard transaction={message.transaction} />
        )}

        {/* 时间戳 */}
        <Text
          style={[
            styles.timestamp,
            isUser ? styles.userTimestamp : styles.botTimestamp,
          ]}
        >
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

// 格式化时间
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 8,
    alignItems: 'flex-start',
  },
  userContainer: {
    justifyContent: 'flex-end',
    flexDirection: 'row-reverse',
  },
  botContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatar: {
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  botAvatar: {
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#1F2937',
  },
  userText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  botTimestamp: {
    color: '#9CA3AF',
    textAlign: 'left',
  },
});
