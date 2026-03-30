// 交易类型
export interface Transaction {
  id: string;
  amount: number;
  category: string;
  subcategory?: string;
  transactionDate: string;
  transactionTime?: string;
  description?: string;
  merchant?: string;
  paymentMethod?: string;
  tags?: string[];
  location?: string;
  receiptImage?: string;
  voiceNote?: string;
  confidenceScore: number;
  isConfirmed: boolean;
  createdAt: string;
  updatedAt?: string;
}

// 交易创建请求
export interface CreateTransactionRequest {
  input: string;
  inputType: 'text' | 'voice' | 'image';
  context?: Record<string, any>;
}

// 交易解析结果
export interface ParsedTransaction {
  amount: number;
  category: string;
  subcategory?: string;
  transactionDate: string;
  transactionTime?: string;
  description?: string;
  confidence: number;
  requiresConfirmation: boolean;
}

// 解析响应
export interface ParseResponse {
  success: boolean;
  transactions: ParsedTransaction[];
  message: string;
  requiresConfirmation: boolean;
}

// 创建交易响应
export interface CreateTransactionResponse {
  transactions: Transaction[];
  total: number;
  message: string;
}

// 查询参数
export interface TransactionQueryParams {
  startDate?: string;
  endDate?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

// 交易列表响应
export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  message: string;
}

// 预算类型
export interface Budget {
  id: string;
  budgetType: 'total' | 'category' | 'custom';
  category?: string;
  amount: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// 预算进度
export interface BudgetProgress {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

// 提醒类型
export interface Reminder {
  id: string;
  reminderType: string;
  triggerType: 'time' | 'event' | 'condition';
  triggerConfig: Record<string, any>;
  messageTemplate?: string;
  isActive: boolean;
  lastTriggeredAt?: string;
  nextTriggerAt?: string;
  createdAt: string;
}

// 消费分析
export interface SpendingAnalysis {
  totalAmount: number;
  categoryBreakdown: CategoryBreakdown[];
  dailyTrend: DailySpending[];
  topMerchants: MerchantSpending[];
  insights: string[];
}

// 类别分析
export interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

// 每日消费
export interface DailySpending {
  date: string;
  amount: number;
  count: number;
}

// 商家消费
export interface MerchantSpending {
  merchant: string;
  amount: number;
  count: number;
}

// 消息类型（对话界面）
export interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  createdAt: string;
  transaction?: Transaction;
}

// 用户设置
export interface UserSettings {
  isDarkMode: boolean;
  currency: string;
  language: string;
  enableNotifications: boolean;
  enableVoiceInput: boolean;
  enableCameraInput: boolean;
  biometricEnabled: boolean;
  cloudSyncEnabled: boolean;
}

// API响应包装
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  transactions?: ParsedTransaction[];
  requiresConfirmation?: boolean;
}

// 图表数据类型
export interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }>;
}

// 统计数据
export interface Statistics {
  totalSpent: number;
  totalIncome: number;
  transactionCount: number;
  averageDaily: number;
  topCategory: string;
  topCategoryAmount: number;
}

// 分类配置
export interface Category {
  id: string;
  name: string;
  parentId?: string;
  icon: string;
  color: string;
  keywords: string[];
  isSystem: boolean;
}

// 时间范围
export type TimeRange = 'today' | 'week' | 'month' | 'year' | 'custom';

// 排序方式
export type SortOrder = 'date_asc' | 'date_desc' | 'amount_asc' | 'amount_desc';

// 导航参数类型
export type RootStackParamList = {
  Main: undefined;
  TransactionDetail: { transactionId: string };
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Transactions: undefined;
  Analysis: undefined;
  Budget: undefined;
  Settings: undefined;
};
