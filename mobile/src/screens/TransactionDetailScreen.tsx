import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { Transaction } from '@/types';
import { useTransactionStore } from '@/stores/transactionStore';
import { localDB } from '@/services/storage';

// 类别配置
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

interface Props {
  route: {
    params: {
      transaction: Transaction;
    };
  };
}

export default function TransactionDetailScreen({ route }: Props) {
  const { transaction } = route.params;
  const navigation = useNavigation();
  const { deleteTransaction } = useTransactionStore();

  const config = CATEGORY_CONFIG[transaction.category] || CATEGORY_CONFIG['其他'];

  const handleDelete = () => {
    Alert.alert(
      '删除记录',
      '确定要删除这条消费记录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await localDB.deleteTransaction(transaction.id);
              deleteTransaction(transaction.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('错误', '删除失败，请重试');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 金额卡片 */}
        <View style={[styles.amountCard, { backgroundColor: config.color }]}>
          <View style={styles.categoryIcon}>
            <Text style={styles.iconText}>{config.icon}</Text>
          </View>
          <Text style={styles.amountText}>¥{transaction.amount.toFixed(2)}</Text>
          <Text style={styles.categoryText}>{transaction.category}</Text>
        </View>

        {/* 详情列表 */}
        <View style={styles.detailSection}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>日期</Text>
            <Text style={styles.detailValue}>{formatDate(transaction.transactionDate)}</Text>
          </View>

          {transaction.transactionTime && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>时间</Text>
              <Text style={styles.detailValue}>{transaction.transactionTime}</Text>
            </View>
          )}

          {transaction.subcategory && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>子类别</Text>
              <Text style={styles.detailValue}>{transaction.subcategory}</Text>
            </View>
          )}

          {transaction.description && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>描述</Text>
              <Text style={styles.detailValue}>{transaction.description}</Text>
            </View>
          )}

          {transaction.merchant && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>商家</Text>
              <Text style={styles.detailValue}>{transaction.merchant}</Text>
            </View>
          )}

          {transaction.paymentMethod && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>支付方式</Text>
              <Text style={styles.detailValue}>{transaction.paymentMethod}</Text>
            </View>
          )}

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>置信度</Text>
            <Text style={styles.detailValue}>
              {Math.round(transaction.confidenceScore * 100)}%
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>状态</Text>
            <Text style={styles.detailValue}>
              {transaction.isConfirmed ? '已确认' : '待确认'}
            </Text>
          </View>
        </View>

        {/* 操作按钮 */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color="#3B82F6" />
            <Text style={styles.editButtonText}>编辑</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>删除</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  amountCard: {
    margin: 20,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
  },
  amountText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
  detailSection: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  editButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
    marginLeft: 8,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
    marginLeft: 8,
  },
});
