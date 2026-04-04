import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from '@/navigation/AppNavigator';
import { localDB } from '@/services/storage';
import { useTransactionStore } from '@/stores/transactionStore';
import { notificationService } from '@/services/notifications';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        // 初始化本地数据库
        await localDB.init();
        
        // 加载本地数据
        const transactions = await localDB.getAllTransactions();
        useTransactionStore.getState().setTransactions(transactions);
        
        // 初始化通知服务
        const hasPermission = await notificationService.requestPermissions();
        if (hasPermission) {
          // 安排每周消费报告
          await notificationService.scheduleWeeklyReport();
        }
        
        setIsReady(true);
      } catch (e) {
        console.error('Failed to initialize app:', e);
        setError('初始化失败，请重启应用');
      }
    }

    prepare();
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
