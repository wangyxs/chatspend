import { create } from 'zustand';
import { Transaction, Message, Statistics } from '@/types';

interface TransactionState {
  // 状态
  transactions: Transaction[];
  messages: Message[];
  statistics: Statistics | null;
  isLoading: boolean;
  error: string | null;
  
  // 交易操作
  addTransaction: (transaction: Transaction) => void;
  addTransactions: (transactions: Transaction[]) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  setTransactions: (transactions: Transaction[]) => void;
  
  // 消息操作
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  
  // 统计操作
  setStatistics: (statistics: Statistics) => void;
  
  // 加载状态
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 计算属性辅助
  getTransactionsByDate: (startDate: string, endDate: string) => Transaction[];
  getTransactionsByCategory: (category: string) => Transaction[];
  getTotalByCategory: (category: string) => number;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  // 初始状态
  transactions: [],
  messages: [],
  statistics: null,
  isLoading: false,
  error: null,
  
  // 添加单个交易
  addTransaction: (transaction) => set((state) => ({
    transactions: [transaction, ...state.transactions]
  })),
  
  // 批量添加交易
  addTransactions: (transactions) => set((state) => ({
    transactions: [...transactions, ...state.transactions]
  })),
  
  // 更新交易
  updateTransaction: (id, updates) => set((state) => ({
    transactions: state.transactions.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    )
  })),
  
  // 删除交易
  deleteTransaction: (id) => set((state) => ({
    transactions: state.transactions.filter((t) => t.id !== id)
  })),
  
  // 设置交易列表
  setTransactions: (transactions) => set({ transactions }),
  
  // 添加消息
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  // 设置消息列表
  setMessages: (messages) => set({ messages }),
  
  // 清空消息
  clearMessages: () => set({ messages: [] }),
  
  // 设置统计数据
  setStatistics: (statistics) => set({ statistics }),
  
  // 设置加载状态
  setLoading: (loading) => set({ isLoading: loading }),
  
  // 设置错误
  setError: (error) => set({ error }),
  
  // 按日期范围查询
  getTransactionsByDate: (startDate, endDate) => {
    const { transactions } = get();
    return transactions.filter((t) => {
      const date = t.transactionDate;
      return date >= startDate && date <= endDate;
    });
  },
  
  // 按类别查询
  getTransactionsByCategory: (category) => {
    const { transactions } = get();
    return transactions.filter((t) => t.category === category);
  },
  
  // 计算类别总额
  getTotalByCategory: (category) => {
    const { transactions } = get();
    return transactions
      .filter((t) => t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
  }
}));
