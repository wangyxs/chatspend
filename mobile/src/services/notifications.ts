/**
 * 推送通知服务
 * 
 * 使用 expo-notifications 实现本地推送
 * - 定期汇报（每周消费报告）
 * - 预算预警（超支提醒）
 * - 大额提醒
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { localDB } from './storage';

// 配置通知处理器
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // 请求通知权限
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('通知权限未授权');
      return false;
    }
    
    // Android 需要创建通知渠道
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'ChatSpend通知',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      });
    }
    
    return true;
  }

  // 发送本地通知
  async sendNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null, // 立即发送
    });
  }

  // 安排定期汇报（每周日晚上8点）
  async scheduleWeeklyReport(): Promise<void> {
    // 先取消之前的定期汇报
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // 安排每周汇报
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 本周消费报告',
        body: '点击查看您的本周消费情况',
        data: { type: 'weekly_report' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // 周日
        hour: 20, // 晚上8点
        minute: 0,
      },
    });
  }

  // 安排预算预警
  async scheduleBudgetAlert(
    category: string,
    percentage: number
  ): Promise<void> {
    let title = '💰 预算提醒';
    let body = '';

    if (percentage >= 100) {
      title = '⚠️ 预算超支';
      body = `您的${category}预算已超支！`;
    } else if (percentage >= 80) {
      body = `您的${category}预算已使用${Math.round(percentage)}%，请注意控制支出`;
    }

    await this.sendNotification(title, body, { type: 'budget_alert', category });
  }

  // 安排大额消费提醒
  async scheduleLargeExpenseAlert(
    amount: number,
    description: string
  ): Promise<void> {
    await this.sendNotification(
      '💸 大额消费提醒',
      `您刚刚消费了¥${amount}：${description}`,
      { type: 'large_expense', amount }
    );
  }

  // 检查并发送预算预警
  async checkBudgetAlerts(): Promise<void> {
    try {
      // 获取本月消费数据
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const transactions = await localDB.getTransactionsByDate(
        startOfMonth.toISOString().split('T')[0],
        now.toISOString().split('T')[0]
      );

      // 按类别统计
      const categorySpending: Record<string, number> = {};
      for (const trans of transactions) {
        if (trans.category) {
          categorySpending[trans.category] = (categorySpending[trans.category] || 0) + trans.amount;
        }
      }

      // 检查每个类别的预算
      // TODO: 从设置中获取预算配置
      const budgets: Record<string, number> = {
        food: 2000,
        transport: 500,
        shopping: 1000,
        entertainment: 300,
      };

      for (const [category, budget] of Object.entries(budgets)) {
        const spent = categorySpending[category] || 0;
        const percentage = (spent / budget) * 100;

        if (percentage >= 80) {
          await this.scheduleBudgetAlert(category, percentage);
        }
      }
    } catch (error) {
      console.error('检查预算预警失败:', error);
    }
  }

  // 取消所有通知
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // 获取所有已安排的通知
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }
}

// 单例实例
export const notificationService = NotificationService.getInstance();
