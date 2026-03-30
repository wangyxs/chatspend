import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTransactionStore } from '@/stores/transactionStore';
import { localDB } from '@/services/storage';
import { CategoryBreakdown, DailySpending } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 40;

// 类别颜色
const CATEGORY_COLORS: Record<string, string> = {
  '餐饮': '#F59E0B',
  '交通': '#3B82F6',
  '购物': '#EC4899',
  '娱乐': '#8B5CF6',
  '日用': '#10B981',
  '医疗': '#EF4444',
  '教育': '#6366F1',
  '服饰': '#F472B6',
  '美妆': '#F97316',
  '其他': '#6B7280',
};

export default function StatsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [dailySpending, setDailySpending] = useState<DailySpending[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);

  const { transactions, setTransactions } = useTransactionStore();

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);

      // 获取本月数据
      const now = new Date();
      const end = now.toISOString().split('T')[0];
      const start = new Date(now.setDate(1)).toISOString().split('T')[0];

      // 加载交易
      const data = await localDB.getTransactionsByDate(start, end);
      setTransactions(data.reverse());

      // 计算类别统计
      const categoryMap = new Map<string, { amount: number; count: number }>();
      let total = 0;

      data.forEach((t) => {
        total += t.amount;
        const current = categoryMap.get(t.category) || { amount: 0, count: 0 };
        categoryMap.set(t.category, {
          amount: current.amount + t.amount,
          count: current.count + 1,
        });
      });

      setTotalSpent(total);

      // 转换为数组并计算百分比
      const breakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count,
          percentage: total > 0 ? (data.amount / total) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      setCategoryBreakdown(breakdown);

      // 计算每日消费（最近7天）
      const dailyMap = new Map<string, { amount: number; count: number }>();
      const last7Days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(date);
        dailyMap.set(dateStr, { amount: 0, count: 0 });
      }

      data.forEach((t) => {
        if (dailyMap.has(t.transactionDate)) {
          const current = dailyMap.get(t.transactionDate)!;
          dailyMap.set(t.transactionDate, {
            amount: current.amount + t.amount,
            count: current.count + 1,
          });
        }
      });

      const daily: DailySpending[] = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          amount: data.amount,
          count: data.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailySpending(daily);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }, [setTransactions]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  // 渲染类别条目
  const renderCategoryItem = (item: CategoryBreakdown, index: number) => (
    <View key={item.category} style={styles.categoryItem}>
      <View style={styles.categoryLeft}>
        <View
          style={[
            styles.categoryDot,
            { backgroundColor: CATEGORY_COLORS[item.category] || '#6B7280' },
          ]}
        />
        <View>
          <Text style={styles.categoryName}>{item.category}</Text>
          <Text style={styles.categoryCount}>{item.count}笔</Text>
        </View>
      </View>
      <View style={styles.categoryRight}>
        <Text style={styles.categoryAmount}>¥{item.amount.toFixed(2)}</Text>
        <Text style={styles.categoryPercent}>{item.percentage.toFixed(1)}%</Text>
      </View>
    </View>
  );

  // 渲染简单的条形图
  const renderBarChart = () => {
    const maxAmount = Math.max(...dailySpending.map((d) => d.amount), 1);

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>近7日消费趋势</Text>
        <View style={styles.barsContainer}>
          {dailySpending.map((day, index) => {
            const barHeight = (day.amount / maxAmount) * 120;
            const dayName = new Date(day.date).toLocaleDateString('zh-CN', {
              weekday: 'short',
            });

            return (
              <View key={day.date} style={styles.barWrapper}>
                <View style={styles.barColumn}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(barHeight, 4),
                        backgroundColor: day.amount > 0 ? '#3B82F6' : '#E5E7EB',
                      },
                    ]}
                  />
                  <Text style={styles.barValue}>
                    {day.amount > 0 ? `${Math.round(day.amount)}` : ''}
                  </Text>
                </View>
                <Text style={styles.barLabel}>{dayName}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 头部统计 */}
        <View style={styles.header}>
          <Text style={styles.title">统计分析</Text>
          <View style={styles.totalCard}>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>本月支出</Text>
              <Text style={styles.totalAmount}>¥{totalSpent.toFixed(2)}</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>消费笔数</Text>
              <Text style={styles.totalAmount}>{transactions.length}</Text>
            </View>
          </View>
        </View>

        {/* 条形图 */}
        {dailySpending.length > 0 && renderBarChart()}

        {/* 类别分布 */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>类别分布</Text>
          {categoryBreakdown.length > 0 ? (
            categoryBreakdown.map((item, index) => renderCategoryItem(item, index))
          ) : (
            <View style={styles.emptyCategory}>
              <Ionicons name="pie-chart-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>暂无消费数据</Text>
            </View>
          )}
        </View>

        {/* 智能洞察 */}
        {categoryBreakdown.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>智能洞察</Text>
            <View style={styles.insightCard}>
              <Ionicons name="bulb" size={20} color="#F59E0B" />
              <Text style={styles.insightText}>
                {generateInsight(categoryBreakdown, totalSpent)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// 生成智能洞察
function generateInsight(breakdown: CategoryBreakdown[], total: number): string {
  if (breakdown.length === 0) {
    return '还没有消费数据，快去记录第一笔吧！';
  }

  const topCategory = breakdown[0];
  const insights = [
    `本月"${topCategory.category}"支出最多，占总消费的${topCategory.percentage.toFixed(1)}%，共${topCategory.count}笔。`,
    `建议关注${topCategory.category}类消费，合理规划预算能帮助更好地控制支出。`,
    total > 3000
      ? '本月消费较高，建议检查各类别支出是否合理。'
      : '本月消费控制在合理范围内，继续保持！',
  ];

  return insights.join('\n\n');
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
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  totalCard: {
    flexDirection: 'row',
    marginTop: 16,
    padding: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  totalDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  chartContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 140,
  },
  bar: {
    width: 20,
    borderRadius: 4,
  },
  barValue: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  barLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
  },
  categorySection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  categoryCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  categoryPercent: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyCategory: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  insightsSection: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 22,
    marginLeft: 8,
  },
});
