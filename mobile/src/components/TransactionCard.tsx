import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Transaction } from '@/types';

// 类别图标和颜色映射
const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  '餐饮': { icon: '🍔', color: '#F59E0B' },
  '交通': { icon: '🚗', color: '#3B82F6' },
  '购物': { icon: '🛒', color: '#EC4899' },
  '娱乐': { icon: '🎮', color: '#8B5CF6' },
  '日用': { icon: '🏠', color: '#10B981' },
  '医疗': { icon: '💊', color: '#EF4444' },
  '教育': { icon: '📚', color: '#6366F1' },
  '服饰': { icon: '👕', color: '#F472B6' },
  '美妆': { icon: '💄', color: '#F97316' },
  '其他': { icon: '📦', color: '#6B7280' },
};

interface TransactionCardProps {
  transaction: Transaction;
  compact?: boolean;
}

export default function TransactionCard({ transaction, compact = false }: TransactionCardProps) {
  const config = CATEGORY_CONFIG[transaction.category] || CATEGORY_CONFIG['其他'];

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.compactIcon, { backgroundColor: config.color + '20' }]}>
          <Text style={styles.iconText}>{config.icon}</Text>
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactCategory}>{transaction.category}</Text>
          <Text style={styles.compactDesc} numberOfLines={1}>
            {transaction.description || '无描述'}
          </Text>
        </View>
        <Text style={[styles.compactAmount, { color: config.color }]}>
          -¥{transaction.amount.toFixed(2)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 头部：类别和金额 */}
      <View style={styles.header}>
        <View style={styles.categoryContainer}>
          <View style={[styles.iconWrapper, { backgroundColor: config.color + '20' }]}>
            <Text style={styles.iconText}>{config.icon}</Text>
          </View>
          <View>
            <Text style={styles.category}>{transaction.category}</Text>
            {transaction.subcategory && (
              <Text style={styles.subcategory}>{transaction.subcategory}</Text>
            )}
          </View>
        </View>
        <Text style={[styles.amount, { color: config.color }]}>
          -¥{transaction.amount.toFixed(2)}
        </Text>
      </View>

      {/* 描述 */}
      {transaction.description && (
        <Text style={styles.description}>{transaction.description}</Text>
      )}

      {/* 底部信息 */}
      <View style={styles.footer}>
        <Text style={styles.date}>
          📅 {formatDate(transaction.transactionDate)}
        </Text>
        {transaction.confidenceScore < 0.8 && (
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>待确认</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// 格式化日期
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.setDate(now.getDate() - 1)).toDateString();
  const targetDate = date.toDateString();

  if (targetDate === today) {
    return '今天';
  } else if (targetDate === yesterday) {
    return '昨天';
  }

  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  // 完整卡片样式
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconText: {
    fontSize: 18,
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  subcategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 8,
    paddingLeft: 50,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingLeft: 50,
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  confidenceBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '500',
  },

  // 紧凑卡片样式
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
    marginLeft: 12,
  },
  compactCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  compactDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  compactAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
});
