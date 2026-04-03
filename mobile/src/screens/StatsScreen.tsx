import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

import { useTransactionStore } from '@/stores/transactionStore';
import { localDB } from '@/services/storage';
import { CategoryBreakdown, DailySpending } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;

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

const CHART_CONFIG = {
  backgroundColor: '#FFFFFF',
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: { borderRadius: 12 },
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#3B82F6' },
  propsForBackgroundLines: { stroke: '#F3F4F6', strokeDasharray: '' },
};

// ============ 骨架屏组件 ============
function SkeletonBlock({ width, height, style }: { width: number | string; height: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, backgroundColor: '#E5E7EB', borderRadius: 8, opacity },
        style,
      ]}
    />
  );
}

function StatsSkeleton() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }} scrollEnabled={false}>
      {/* Header */}
      <View style={styles.header}>
        <SkeletonBlock width={120} height={28} />
        <View style={[styles.totalCard, { backgroundColor: '#E5E7EB' }]}>
          <SkeletonBlock width={80} height={16} style={{ marginBottom: 8 }} />
          <SkeletonBlock width={120} height={28} />
        </View>
      </View>
      {/* Chart */}
      <View style={styles.section}>
        <SkeletonBlock width={140} height={20} style={{ marginBottom: 16 }} />
        <SkeletonBlock width={CHART_WIDTH} height={180} />
      </View>
      {/* Category */}
      <View style={styles.section}>
        <SkeletonBlock width={100} height={20} style={{ marginBottom: 16 }} />
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={styles.categoryItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <SkeletonBlock width={12} height={12} style={{ borderRadius: 6, marginRight: 12 }} />
              <SkeletonBlock width={60} height={14} />
            </View>
            <SkeletonBlock width={70} height={14} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ============ 主组件 ============
type TabType = 'week' | 'month';

export default function StatsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('month');
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [dailySpending, setDailySpending] = useState<DailySpending[]>([]);
  const [weeklyComparison, setWeeklyComparison] = useState<{ label: string; amount: number }[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { setTransactions } = useTransactionStore();

  const loadStats = useCallback(async () => {
    try {
      const now = new Date();

      // 本月数据
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split('T')[0];
      const monthEnd = now.toISOString().split('T')[0];
      const monthData = await localDB.getTransactionsByDate(monthStart, monthEnd);
      setTransactions(monthData.reverse());

      let total = 0;
      const categoryMap = new Map<string, { amount: number; count: number }>();
      monthData.forEach((t) => {
        total += t.amount;
        const c = categoryMap.get(t.category) || { amount: 0, count: 0 };
        categoryMap.set(t.category, { amount: c.amount + t.amount, count: c.count + 1 });
      });
      setTotalSpent(total);
      setTransactionCount(monthData.length);

      const breakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
        .map(([category, d]) => ({
          category,
          amount: d.amount,
          count: d.count,
          percentage: total > 0 ? (d.amount / total) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);
      setCategoryBreakdown(breakdown);

      // 近7日趋势
      const dailyMap = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dailyMap.set(d.toISOString().split('T')[0], 0);
      }
      monthData.forEach((t) => {
        if (dailyMap.has(t.transactionDate)) {
          dailyMap.set(t.transactionDate, (dailyMap.get(t.transactionDate) || 0) + t.amount);
        }
      });
      const daily: DailySpending[] = Array.from(dailyMap.entries())
        .map(([date, amount]) => ({
          date,
          amount,
          count: 0,
        }));
      setDailySpending(daily);

      // 近4周对比
      const weeks: { label: string; amount: number }[] = [];
      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        const wStart = weekStart.toISOString().split('T')[0];
        const wEnd = weekEnd.toISOString().split('T')[0];
        const wData = await localDB.getTransactionsByDate(wStart, wEnd);
        const wTotal = wData.reduce((s, t) => s + t.amount, 0);
        weeks.push({ label: `第${4 - i}周`, amount: wTotal });
      }
      setWeeklyComparison(weeks);

    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [setTransactions, fadeAnim]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  if (loading) return <StatsSkeleton />;

  // 折线图数据
  const lineLabels = dailySpending.map(d => {
    const date = new Date(d.date);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });
  const lineValues = dailySpending.map(d => d.amount);

  // 柱状图数据（周对比）
  const barLabels = weeklyComparison.map(w => w.label);
  const barValues = weeklyComparison.map(w => w.amount);

  // 饼图数据
  const pieData = categoryBreakdown.slice(0, 5).map((c, i) => ({
    name: c.category,
    population: Math.round(c.amount),
    color: CATEGORY_COLORS[c.category] || CHART_CONFIG.color(1),
    legendFontColor: '#6B7280',
    legendFontSize: 12,
  }));

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* 顶部标题 + 汇总 */}
          <View style={styles.header}>
            <Text style={styles.pageTitle}>统计分析</Text>
            <View style={styles.totalCard}>
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>本月支出</Text>
                <Text style={styles.totalAmount}>¥{totalSpent.toFixed(2)}</Text>
              </View>
              <View style={styles.totalDivider} />
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>消费笔数</Text>
                <Text style={styles.totalAmount}>{transactionCount}</Text>
              </View>
              <View style={styles.totalDivider} />
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>日均消费</Text>
                <Text style={styles.totalAmount}>
                  ¥{transactionCount > 0 ? (totalSpent / new Date().getDate()).toFixed(0) : '0'}
                </Text>
              </View>
            </View>
          </View>

          {/* Tab 切换 */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'week' && styles.tabActive]}
              onPress={() => setActiveTab('week')}
            >
              <Text style={[styles.tabText, activeTab === 'week' && styles.tabTextActive]}>
                近7日趋势
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'month' && styles.tabActive]}
              onPress={() => setActiveTab('month')}
            >
              <Text style={[styles.tabText, activeTab === 'month' && styles.tabTextActive]}>
                周度对比
              </Text>
            </TouchableOpacity>
          </View>

          {/* 折线图 / 柱状图 */}
          <View style={styles.section}>
            {activeTab === 'week' ? (
              <>
                <Text style={styles.sectionTitle}>近7日消费趋势</Text>
                {lineValues.some(v => v > 0) ? (
                  <LineChart
                    data={{
                      labels: lineLabels,
                      datasets: [{ data: lineValues }],
                    }}
                    width={CHART_WIDTH}
                    height={200}
                    chartConfig={CHART_CONFIG}
                    bezier
                    style={styles.chartStyle}
                    withInnerLines={true}
                    withOuterLines={false}
                    withDots={true}
                    withShadow={false}
                    fromZero
                  />
                ) : (
                  <View style={styles.emptyChart}>
                    <Ionicons name="trending-up-outline" size={40} color="#D1D5DB" />
                    <Text style={styles.emptyText}>近7日暂无消费数据</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>近4周消费对比</Text>
                {barValues.some(v => v > 0) ? (
                  <BarChart
                    data={{
                      labels: barLabels,
                      datasets: [{ data: barValues }],
                    }}
                    width={CHART_WIDTH}
                    height={200}
                    chartConfig={{
                      ...CHART_CONFIG,
                      color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                    }}
                    style={styles.chartStyle}
                    showValuesOnTopOfBars={true}
                    withInnerLines={true}
                    yAxisLabel="¥"
                    yAxisSuffix=""
                    fromZero
                  />
                ) : (
                  <View style={styles.emptyChart}>
                    <Ionicons name="bar-chart-outline" size={40} color="#D1D5DB" />
                    <Text style={styles.emptyText}>暂无消费数据</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* 类别饼图 */}
          {pieData.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>消费类别分布</Text>
              <PieChart
                data={pieData}
                width={CHART_WIDTH}
                height={200}
                chartConfig={CHART_CONFIG}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          )}

          {/* 类别明细列表 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>类别明细</Text>
            {categoryBreakdown.length > 0 ? (
              categoryBreakdown.map((item) => (
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
                    <View style={styles.categoryBarWrap}>
                      <View
                        style={[
                          styles.categoryBar,
                          {
                            width: `${item.percentage}%` as any,
                            backgroundColor: CATEGORY_COLORS[item.category] || '#6B7280',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.categoryPercent}>{item.percentage.toFixed(1)}%</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyChart}>
                <Ionicons name="pie-chart-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>暂无消费数据</Text>
              </View>
            )}
          </View>

          {/* 智能洞察 */}
          {categoryBreakdown.length > 0 && (
            <View style={[styles.section, styles.insightSection]}>
              <View style={styles.insightHeader}>
                <Ionicons name="bulb" size={18} color="#F59E0B" />
                <Text style={styles.insightTitle}>智能洞察</Text>
              </View>
              <Text style={styles.insightText}>
                {generateInsight(categoryBreakdown, totalSpent)}
              </Text>
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

function generateInsight(breakdown: CategoryBreakdown[], total: number): string {
  if (breakdown.length === 0) return '还没有消费数据，快去记录第一笔吧！';
  const top = breakdown[0];
  const lines = [
    `本月「${top.category}」支出最高，占总消费 ${top.percentage.toFixed(1)}%，共 ${top.count} 笔。`,
  ];
  if (total > 5000) {
    lines.push('本月消费偏高，建议回顾各类别支出，适当控制非必要开销。');
  } else if (total > 2000) {
    lines.push('消费节奏正常，继续保持良好的记账习惯。');
  } else {
    lines.push('本月消费较少，理财意识很棒！');
  }
  return lines.join('\n\n');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  totalCard: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 16,
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  totalDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#EFF6FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  section: {
    margin: 16,
    marginBottom: 0,
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
  chartStyle: {
    borderRadius: 8,
    marginLeft: -8,
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  categoryCount: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  categoryRight: {
    alignItems: 'flex-end',
    minWidth: 110,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  categoryBarWrap: {
    width: 80,
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    marginBottom: 2,
  },
  categoryBar: {
    height: 4,
    borderRadius: 2,
  },
  categoryPercent: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  insightSection: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 6,
  },
  insightText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 22,
  },
});
