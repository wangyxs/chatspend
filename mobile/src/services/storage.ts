import * as SQLite from 'expo-sqlite';
import { Transaction, Budget, Reminder } from '@/types';

const DB_NAME = 'chatspend.db';

export class LocalDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  
  // 初始化数据库
  async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }
  
  // 创建表
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    // 交易表
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT,
        transaction_date TEXT NOT NULL,
        transaction_time TEXT,
        description TEXT,
        merchant TEXT,
        payment_method TEXT,
        tags TEXT,
        location TEXT,
        receipt_image TEXT,
        voice_note TEXT,
        confidence_score REAL,
        is_confirmed INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        synced_at TEXT
      );
    `);
    
    // 创建索引
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date 
      ON transactions(transaction_date DESC);
      
      CREATE INDEX IF NOT EXISTS idx_transactions_category 
      ON transactions(category);
    `);
    
    // 预算表
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        budget_type TEXT NOT NULL,
        category TEXT,
        amount REAL NOT NULL,
        period TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT
      );
    `);
    
    // 提醒表
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        reminder_type TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        trigger_config TEXT NOT NULL,
        message_template TEXT,
        is_active INTEGER DEFAULT 1,
        last_triggered_at TEXT,
        next_trigger_at TEXT,
        created_at TEXT NOT NULL
      );
    `);
    
    console.log('Tables created successfully');
  }
  
  // ==================== 交易操作 ====================
  
  // 插入交易
  async insertTransaction(transaction: Transaction): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync(
      `INSERT OR REPLACE INTO transactions (
        id, amount, category, subcategory, transaction_date, transaction_time,
        description, merchant, payment_method, tags, location, receipt_image,
        voice_note, confidence_score, is_confirmed, created_at, updated_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.id,
        transaction.amount,
        transaction.category,
        transaction.subcategory || null,
        transaction.transactionDate,
        transaction.transactionTime || null,
        transaction.description || null,
        transaction.merchant || null,
        transaction.paymentMethod || null,
        transaction.tags ? JSON.stringify(transaction.tags) : null,
        transaction.location || null,
        transaction.receiptImage || null,
        transaction.voiceNote || null,
        transaction.confidenceScore,
        transaction.isConfirmed ? 1 : 0,
        transaction.createdAt,
        transaction.updatedAt || null,
        null
      ]
    );
  }
  
  // 批量插入交易
  async insertTransactions(transactions: Transaction[]): Promise<void> {
    for (const transaction of transactions) {
      await this.insertTransaction(transaction);
    }
  }
  
  // 获取所有交易
  async getAllTransactions(): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM transactions ORDER BY transaction_date DESC, created_at DESC`
    );
    
    return rows.map(this.rowToTransaction);
  }
  
  // 按日期范围查询交易
  async getTransactionsByDate(startDate: string, endDate: string): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM transactions 
       WHERE transaction_date >= ? AND transaction_date <= ?
       ORDER BY transaction_date DESC, created_at DESC`,
      [startDate, endDate]
    );
    
    return rows.map(this.rowToTransaction);
  }
  
  // 按类别查询交易
  async getTransactionsByCategory(category: string): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM transactions 
       WHERE category = ?
       ORDER BY transaction_date DESC, created_at DESC`,
      [category]
    );
    
    return rows.map(this.rowToTransaction);
  }
  
  // 获取单个交易
  async getTransactionById(id: string): Promise<Transaction | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM transactions WHERE id = ?`,
      [id]
    );
    
    return row ? this.rowToTransaction(row) : null;
  }
  
  // 更新交易
  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.subcategory !== undefined) {
      fields.push('subcategory = ?');
      values.push(updates.subcategory);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.isConfirmed !== undefined) {
      fields.push('is_confirmed = ?');
      values.push(updates.isConfirmed ? 1 : 0);
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    await this.db.runAsync(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }
  
  // 删除交易
  async deleteTransaction(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync(`DELETE FROM transactions WHERE id = ?`, [id]);
  }
  
  // 获取未同步的交易
  async getUnsyncedTransactions(): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM transactions WHERE synced_at IS NULL`
    );
    
    return rows.map(this.rowToTransaction);
  }
  
  // 标记为已同步
  async markAsSynced(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync(
      `UPDATE transactions SET synced_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );
  }
  
  // ==================== 预算操作 ====================
  
  // 插入预算
  async insertBudget(budget: Budget): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync(
      `INSERT OR REPLACE INTO budgets (
        id, budget_type, category, amount, period, start_date, end_date,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        budget.id,
        budget.budgetType,
        budget.category || null,
        budget.amount,
        budget.period,
        budget.startDate,
        budget.endDate || null,
        budget.isActive ? 1 : 0,
        budget.createdAt,
        budget.updatedAt || null
      ]
    );
  }
  
  // 获取活跃预算
  async getActiveBudgets(): Promise<Budget[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM budgets WHERE is_active = 1`
    );
    
    return rows.map(this.rowToBudget);
  }
  
  // ==================== 统计操作 ====================
  
  // 获取类别统计
  async getCategoryStats(startDate: string, endDate: string): Promise<Map<string, number>> {
    if (!this.db) throw new Error('Database not initialized');
    
    const rows = await this.db.getAllAsync<{ category: string; total: number }>(
      `SELECT category, SUM(amount) as total 
       FROM transactions 
       WHERE transaction_date >= ? AND transaction_date <= ?
       GROUP BY category
       ORDER BY total DESC`,
      [startDate, endDate]
    );
    
    const stats = new Map<string, number>();
    rows.forEach((row) => {
      stats.set(row.category, row.total);
    });
    
    return stats;
  }
  
  // 获取总支出
  async getTotalSpending(startDate: string, endDate: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    
    const row = await this.db.getFirstAsync<{ total: number }>(
      `SELECT SUM(amount) as total 
       FROM transactions 
       WHERE transaction_date >= ? AND transaction_date <= ?`,
      [startDate, endDate]
    );
    
    return row?.total || 0;
  }
  
  // 获取交易数量
  async getTransactionCount(startDate: string, endDate: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    
    const row = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM transactions 
       WHERE transaction_date >= ? AND transaction_date <= ?`,
      [startDate, endDate]
    );
    
    return row?.count || 0;
  }
  
  // ==================== 辅助方法 ====================
  
  // 数据库行转Transaction对象
  private rowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      amount: row.amount,
      category: row.category,
      subcategory: row.subcategory || undefined,
      transactionDate: row.transaction_date,
      transactionTime: row.transaction_time || undefined,
      description: row.description || undefined,
      merchant: row.merchant || undefined,
      paymentMethod: row.payment_method || undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      location: row.location || undefined,
      receiptImage: row.receipt_image || undefined,
      voiceNote: row.voice_note || undefined,
      confidenceScore: row.confidence_score,
      isConfirmed: row.is_confirmed === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined
    };
  }
  
  // 数据库行转Budget对象
  private rowToBudget(row: any): Budget {
    return {
      id: row.id,
      budgetType: row.budget_type,
      category: row.category || undefined,
      amount: row.amount,
      period: row.period,
      startDate: row.start_date,
      endDate: row.end_date || undefined,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined
    };
  }
  
  // 清空所有数据（用于测试）
  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.execAsync(`
      DELETE FROM transactions;
      DELETE FROM budgets;
      DELETE FROM reminders;
    `);
  }
  
  // 关闭数据库
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

// 单例实例
export const localDB = new LocalDatabase();
