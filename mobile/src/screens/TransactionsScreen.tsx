import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import TransactionCard from '@/components/TransactionCard';
import TransactionActionModal from '@/components/TransactionActionModal';
import Toast from '@/components/Toast';
import { useTransactionStore } from '@/stores/transactionStore';
import { useToastStore } from '@/stores/toastStore';
import { localDB } from '@/services/storage';
import { Transaction, TimeRange } from '@/types';

export default function TransactionsScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { transactions, setTransactions, updateTransaction, deleteTransaction } = useTransactionStore();
  const { visible, message, type, hide } = useToastStore();

  // 获取日期范围
  const getDateRange = useCallback((range: TimeRange): { start: string; end: string } => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: string;

    switch (range) {
      case 'today':
        start = end;
        break;
      case 'week':
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        start = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        start = monthAgo.toISOString().split('T')[0];
        break;
      case 'year':
        const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
        start = yearAgo.toISOString().split('T')[0];
        break;
      default:
        start = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
    }

    return { start, end };
  }, []);

  // 加载交易数据
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange(timeRange);
      const data = await localDB.getTransactionsByDate(start, end);
      setTransactions(data.reverse());
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, getDateRange, setTransactions]);

  // 初始加载
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // 下拉刷新
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, [loadTransactions]);

  // 计算总金额
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  // 点击交易卡片
  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setModalVisible(true);
  };

  // 更新交易
  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    await localDB.updateTransaction(id, updates);
    updateTransaction(id, updates);
    useToastStore.getState().show('已更新', 'success');
  };

  // 删除交易
  const handleDeleteTransaction = async (id: string) => {
    await localDB.deleteTransaction(id);
    deleteTransaction(id);
    useToastStore.getState().show('已删除', 'success');
  };

  // 按日期分组
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = transaction.transactionDate;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);

  // 转换为列表数据
  const listData = Object.entries(groupedTransactions)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({
      date,
      data: items,
      total: items.reduce((sum, t) => sum + t.amount, 0),
    }));

  // 渲染时间范围选择器
  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      {(['today', 'week', 'month', 'year'] as TimeRange[]).map((range) => (
        <TouchableOpacity
          key={range}
          style={[
            styles.timeRangeButton,
            timeRange === range && styles.timeRangeButtonActive,
          ]}
          onPress={() => setTimeRange(range)}
        >
          <Text
            style={[
              styles.timeRangeText,
              timeRange === range && styles.timeRangeTextActive,
            ]}
          >
            {getRangeLabel(range)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // 渲染日期分组头部
  const renderSectionHeader = ({ item }: { item: { date: string; total: number } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionDate}>{formatDisplayDate(item.date)}</Text>
      <Text style={styles.sectionTotal}>¥{item.total.toFixed(2)}</Text>
    </View>
  );

  // 渲染交易项
  const renderTransaction = ({ item, section }: any) => (
    <TransactionCard transaction={item} compact onPress={handleTransactionPress} />
  );

  // 空状态
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyText}>暂无消费记录</Text>
      <Text style={styles.emptySubtext}>去首页告诉我你的消费吧！</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 头部 */}
      <View style={styles.header}>
        <Text style={styles.title}>消费记录</Text>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>总支出</Text>
          <Text style={styles.summaryAmount}>¥{totalAmount.toFixed(2)}</Text>
        </View>
      </View>

      {/* 时间范围选择 */}
      {renderTimeRangeSelector()}

      {/* 交易列表 */}
      <FlatList
        data={listData}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => (
          <View style={styles.section}>
            {renderSectionHeader({ item })}
            {item.data.map((transaction: Transaction) => (
              <TransactionCard 
                key={transaction.id} 
                transaction={transaction} 
                compact 
                onPress={handleTransactionPress}
              />
            ))}
          </View>
        )}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* 编辑模态框 */}
      <TransactionActionModal
        visible={modalVisible}
        transaction={selectedTransaction}
        onClose={() => {
          setModalVisible(false);
          setSelectedTransaction(null);
        }}
        onUpdate={handleUpdateTransaction}
        onDelete={handleDeleteTransaction}
      />

      {/* Toast 提示 */}
      <Toast
        visible={visible}
        message={message}
        type={type}
        onHide={hide}
      />
    </SafeAreaView>
  );
}

// 获取时间范围标签
function getRangeLabel(range: TimeRange): string {
  const labels: Record<TimeRange, string> = {
    today: '今天',
    week: '本周',
    month: '本月',
    year: '今年',
    custom: '自定义',
  };
  return labels[range];
}

// 格式化显示日期
function formatDisplayDate(dateString: string): string {
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
    weekday: 'short',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#3B82F6',
  },
  timeRangeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  sectionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  sectionTotal: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 8,
  },
});
