/**
 * UI组件渲染器
 * 
 * 参考王自如AI产品的薄客户端架构：
 * - 后端决定展示什么组件
 * - 前端只负责渲染
 * - 组件化、可复用
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';

const { width: screenWidth } = Dimensions.get('window');

// UI组件类型枚举
export enum UIComponentType {
  TEXT = 'text',
  TRANSACTION_CARD = 'transaction_card',
  SUMMARY_CARD = 'summary_card',
  LIST_CARD = 'list_card',
  CHART_CARD = 'chart_card',
  BUDGET_CARD = 'budget_card',
  INSIGHT_CARD = 'insight_card',
  QUICK_ACTIONS = 'quick_actions',
  DATE_PICKER = 'date_picker',
  CONFIRMATION = 'confirmation',
}

// 数据类型定义
export interface TransactionCardData {
  id: string;
  amount: number;
  category: string;
  category_icon: string;
  description: string;
  date: string;
  time?: string;
  tags?: string[];
  actions?: Array<{ label: string; action: string }>;
}

export interface SummaryCardData {
  title: string;
  total_amount: number;
  transaction_count: number;
  period: string;
  comparison?: {
    previous: number;
    change: string;
  };
  categories: Array<{
    name: string;
    icon: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartCardData {
  chart_type: 'line' | 'bar' | 'pie';
  title: string;
  data: ChartDataPoint[];
  x_axis_label?: string;
  y_axis_label?: string;
}

export interface BudgetCardData {
  category: string;
  category_icon: string;
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage: number;
  status: 'safe' | 'warning' | 'exceeded';
  days_remaining: number;
}

export interface InsightCardData {
  title: string;
  insight_type: 'trend' | 'anomaly' | 'suggestion' | 'alert';
  content: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  action?: { label: string; action: string };
}

export interface QuickAction {
  label: string;
  action: string;
  icon: string;
  params?: Record<string, any>;
}

export interface QuickActionsData {
  title: string;
  actions: QuickAction[];
}

export interface UIComponent {
  type: UIComponentType;
  data: any;
  animation?: {
    type: string;
    duration: number;
  };
}

// Props类型
interface UIComponentRendererProps {
  component: UIComponent;
  onAction?: (action: string, params?: any) => void;
}

/**
 * UI组件渲染器
 * 根据后端返回的组件类型，渲染对应的UI
 */
export default function UIComponentRenderer({ component, onAction }: UIComponentRendererProps) {
  switch (component.type) {
    case UIComponentType.TEXT:
      return renderText(component.data);
    
    case UIComponentType.TRANSACTION_CARD:
      return renderTransactionCard(component.data, onAction);
    
    case UIComponentType.SUMMARY_CARD:
      return renderSummaryCard(component.data);
    
    case UIComponentType.LIST_CARD:
      return renderListCard(component.data, onAction);
    
    case UIComponentType.CHART_CARD:
      return renderChartCard(component.data);
    
    case UIComponentType.BUDGET_CARD:
      return renderBudgetCard(component.data);
    
    case UIComponentType.INSIGHT_CARD:
      return renderInsightCard(component.data, onAction);
    
    case UIComponentType.QUICK_ACTIONS:
      return renderQuickActions(component.data, onAction);
    
    default:
      return null;
  }
}

// ============ 各组件渲染函数 ============

function renderText(data: string) {
  return (
    <View style={styles.textContainer}>
      <Text style={styles.textContent}>{data}</Text>
    </View>
  );
}

function renderTransactionCard(data: TransactionCardData, onAction?: (action: string) => void) {
  const categoryColors: Record<string, string> = {
    food: '#FF6B6B',
    transport: '#4ECDC4',
    shopping: '#FFE66D',
    entertainment: '#95E1D3',
    housing: '#C9B1FF',
    medical: '#FF8B94',
    education: '#87CEEB',
    salary: '#98D8C8',
    investment: '#F7DC6F',
    other: '#BDC3C7',
  };

  const color = categoryColors[data.category] || '#BDC3C7';

  return (
    <View style={[styles.card, styles.transactionCard, { borderLeftColor: color }]}>
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionIcon}>{data.category_icon}</Text>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>{data.description}</Text>
          <Text style={styles.transactionDate}>
            {data.date} {data.time || ''}
          </Text>
        </View>
        <Text style={[styles.transactionAmount, { color }]}>
          -¥{data.amount.toFixed(2)}
        </Text>
      </View>
      
      {data.tags && data.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {data.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
      
      {data.actions && data.actions.length > 0 && (
        <View style={styles.actionsContainer}>
          {data.actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionButton}
              onPress={() => onAction?.(action.action)}
            >
              <Text style={styles.actionButtonText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function renderSummaryCard(data: SummaryCardData) {
  return (
    <View style={[styles.card, styles.summaryCard]}>
      <Text style={styles.summaryTitle}>{data.title}</Text>
      
      <View style={styles.summaryAmountContainer}>
        <Text style={styles.summaryTotalAmount}>¥{data.total_amount.toFixed(2)}</Text>
        <Text style={styles.summaryTransactionCount}>
          共 {data.transaction_count} 笔记录
        </Text>
      </View>
      
      {data.comparison && (
        <View style={styles.comparisonContainer}>
          <Text style={styles.comparisonLabel}>环比上周</Text>
          <Text style={[
            styles.comparisonValue,
            { color: data.comparison.change.startsWith('+') ? '#EF4444' : '#10B981' }
          ]}>
            {data.comparison.change}
          </Text>
        </View>
      )}
      
      <View style={styles.categoriesContainer}>
        {data.categories.map((cat, index) => (
          <View key={index} style={styles.categoryRow}>
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text style={styles.categoryName}>{cat.name}</Text>
            <Text style={styles.categoryAmount}>¥{cat.amount.toFixed(2)}</Text>
            <Text style={styles.categoryPercentage}>{cat.percentage.toFixed(0)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function renderListCard(data: { title: string; items: TransactionCardData[]; has_more: boolean }, onAction?: (action: string) => void) {
  return (
    <View style={[styles.card, styles.listCard]}>
      <Text style={styles.listTitle}>{data.title}</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {data.items.map((item, index) => (
          <View key={item.id || index}>
            {renderTransactionCard(item, onAction)}
          </View>
        ))}
      </ScrollView>
      {data.has_more && (
        <TouchableOpacity style={styles.loadMoreButton}>
          <Text style={styles.loadMoreText}>查看更多</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function renderChartCard(data: ChartCardData) {
  if (data.chart_type === 'pie') {
    const chartData = {
      labels: data.data.map(d => d.label),
      datasets: [{
        data: data.data.map(d => d.value),
        colors: data.data.map((d, i) => () => d.color || getChartColor(i)),
      }],
    };

    return (
      <View style={[styles.card, styles.chartCard]}>
        <Text style={styles.chartTitle}>{data.title}</Text>
        <PieChart
          data={data.data.map((d, i) => ({
            name: d.label,
            population: d.value,
            color: d.color || getChartColor(i),
            legendFontColor: '#7F7F7F',
            legendFontSize: 12,
          }))}
          width={screenWidth - 64}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>
    );
  }

  // 其他图表类型待实现
  return (
    <View style={[styles.card, styles.chartCard]}>
      <Text style={styles.chartTitle}>{data.title}</Text>
      <Text style={styles.chartPlaceholder}>图表类型: {data.chart_type}</Text>
    </View>
  );
}

function renderBudgetCard(data: BudgetCardData) {
  const statusColors = {
    safe: '#10B981',
    warning: '#F59E0B',
    exceeded: '#EF4444',
  };

  const color = statusColors[data.status];

  return (
    <View style={[styles.card, styles.budgetCard]}>
      <View style={styles.budgetHeader}>
        <Text style={styles.budgetIcon}>{data.category_icon}</Text>
        <Text style={styles.budgetCategory}>{data.category}</Text>
        <Text style={[styles.budgetStatus, { color }]}>
          {data.status === 'exceeded' ? '已超支' : data.status === 'warning' ? '即将超支' : '状态良好'}
        </Text>
      </View>
      
      <View style={styles.budgetProgressContainer}>
        <View style={styles.budgetProgressBar}>
          <View style={[styles.budgetProgressFill, { width: `${data.percentage}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.budgetPercentage}>{data.percentage.toFixed(0)}%</Text>
      </View>
      
      <View style={styles.budgetStatsContainer}>
        <View style={styles.budgetStat}>
          <Text style={styles.budgetStatLabel}>预算</Text>
          <Text style={styles.budgetStatValue}>¥{data.budget_amount.toFixed(2)}</Text>
        </View>
        <View style={styles.budgetStat}>
          <Text style={styles.budgetStatLabel}>已用</Text>
          <Text style={styles.budgetStatValue}>¥{data.spent_amount.toFixed(2)}</Text>
        </View>
        <View style={styles.budgetStat}>
          <Text style={styles.budgetStatLabel}>剩余</Text>
          <Text style={[styles.budgetStatValue, { color }]}>
            ¥{data.remaining_amount.toFixed(2)}
          </Text>
        </View>
      </View>
      
      <Text style={styles.budgetDaysRemaining}>剩余 {data.days_remaining} 天</Text>
    </View>
  );
}

function renderInsightCard(data: InsightCardData, onAction?: (action: string) => void) {
  const priorityColors = {
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#10B981',
  };

  const insightColors = {
    trend: '#3B82F6',
    anomaly: '#F59E0B',
    suggestion: '#10B981',
    alert: '#EF4444',
  };

  const color = insightColors[data.insight_type];

  return (
    <View style={[styles.card, styles.insightCard, { borderLeftColor: color }]}>
      <View style={styles.insightHeader}>
        <Text style={styles.insightIcon}>{data.icon}</Text>
        <Text style={[styles.insightTitle, { color }]}>{data.title}</Text>
      </View>
      
      <Text style={styles.insightContent}>{data.content}</Text>
      
      {data.action && (
        <TouchableOpacity
          style={styles.insightActionButton}
          onPress={() => onAction?.(data.action!.action)}
        >
          <Text style={styles.insightActionText}>{data.action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function renderQuickActions(data: QuickActionsData, onAction?: (action: string, params?: any) => void) {
  return (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.quickActionsTitle}>{data.title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {data.actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickActionButton}
            onPress={() => onAction?.(action.action, action.params)}
          >
            <Text style={styles.quickActionIcon}>{action.icon}</Text>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ============ 工具函数 ============

function getChartColor(index: number): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#C9B1FF',
    '#FF8B94', '#87CEEB', '#98D8C8', '#F7DC6F', '#BDC3C7',
  ];
  return colors[index % colors.length];
}

// ============ 样式 ============

const styles = StyleSheet.create({
  // 基础卡片
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  // 文本组件
  textContainer: {
    padding: 12,
  },
  textContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },

  // 交易卡片
  transactionCard: {
    borderLeftWidth: 4,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  tagsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  actionButton: {
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },

  // 摘要卡片
  summaryCard: {
    // 特殊样式
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  summaryAmountContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTotalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  summaryTransactionCount: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  comparisonValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoriesContainer: {
    marginTop: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 12,
  },
  categoryPercentage: {
    fontSize: 14,
    color: '#6B7280',
    width: 50,
    textAlign: 'right',
  },

  // 列表卡片
  listCard: {
    maxHeight: 400,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },

  // 图表卡片
  chartCard: {
    // 特殊样式
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  chartPlaceholder: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 40,
  },

  // 预算卡片
  budgetCard: {
    // 特殊样式
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  budgetCategory: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  budgetStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  budgetProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetPercentage: {
    width: 50,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  budgetStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetStat: {
    alignItems: 'center',
  },
  budgetStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  budgetStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  budgetDaysRemaining: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },

  // 洞察卡片
  insightCard: {
    borderLeftWidth: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  insightContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  insightActionButton: {
    marginTop: 12,
  },
  insightActionText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },

  // 快捷操作
  quickActionsContainer: {
    marginTop: 8,
  },
  quickActionsTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  quickActionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  quickActionLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
});
