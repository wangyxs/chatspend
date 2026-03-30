import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useUserStore } from '@/stores/userStore';
import { localDB } from '@/services/storage';

interface SettingItemProps {
  icon: string;
  label: string;
  value?: string;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  onPress?: () => void;
  showArrow?: boolean;
}

function SettingItem({
  icon,
  label,
  value,
  showSwitch = false,
  switchValue = false,
  onSwitchChange,
  onPress,
  showArrow = true,
}: SettingItemProps) {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress && !showSwitch}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={22} color="#3B82F6" />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {showSwitch && (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
            thumbColor="#FFFFFF"
          />
        )}
        {showArrow && !showSwitch && (
          <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { settings, updateSettings } = useUserStore();

  // 处理开关切换
  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    updateSettings({ [key]: value });
  };

  // 清除数据
  const handleClearData = () => {
    Alert.alert(
      '清除数据',
      '确定要清除所有本地数据吗？此操作不可恢复。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            try {
              await localDB.clearAll();
              Alert.alert('成功', '数据已清除');
            } catch (error) {
              Alert.alert('错误', '清除数据失败');
            }
          },
        },
      ]
    );
  };

  // 导出数据
  const handleExportData = () => {
    Alert.alert('导出数据', '此功能即将上线，敬请期待！');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 头部 */}
        <View style={styles.header}>
          <Text style={styles.title}>设置</Text>
        </View>

        {/* 偏好设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>偏好设置</Text>
          <View style={styles.card}>
            <SettingItem
              icon="moon"
              label="深色模式"
              showSwitch
              switchValue={settings.isDarkMode}
              onSwitchChange={(value) => handleToggle('isDarkMode', value)}
              showArrow={false}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="notifications"
              label="消息通知"
              showSwitch
              switchValue={settings.enableNotifications}
              onSwitchChange={(value) => handleToggle('enableNotifications', value)}
              showArrow={false}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="mic"
              label="语音输入"
              showSwitch
              switchValue={settings.enableVoiceInput}
              onSwitchChange={(value) => handleToggle('enableVoiceInput', value)}
              showArrow={false}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="camera"
              label="相机识别"
              showSwitch
              switchValue={settings.enableCameraInput}
              onSwitchChange={(value) => handleToggle('enableCameraInput', value)}
              showArrow={false}
            />
          </View>
        </View>

        {/* 安全设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>安全与隐私</Text>
          <View style={styles.card}>
            <SettingItem
              icon="finger-print"
              label="生物识别"
              showSwitch
              switchValue={settings.biometricEnabled}
              onSwitchChange={(value) => handleToggle('biometricEnabled', value)}
              showArrow={false}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="cloud"
              label="云端同步"
              showSwitch
              switchValue={settings.cloudSyncEnabled}
              onSwitchChange={(value) => handleToggle('cloudSyncEnabled', value)}
              showArrow={false}
            />
          </View>
        </View>

        {/* 数据管理 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>数据管理</Text>
          <View style={styles.card}>
            <SettingItem
              icon="download"
              label="导出数据"
              onPress={handleExportData}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="trash"
              label="清除本地数据"
              onPress={handleClearData}
            />
          </View>
        </View>

        {/* 关于 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>关于</Text>
          <View style={styles.card}>
            <SettingItem
              icon="information-circle"
              label="版本"
              value="1.0.0"
              showArrow={false}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="document-text"
              label="用户协议"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="shield-checkmark"
              label="隐私政策"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="star"
              label="给我们评分"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* 底部 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>ChatSpend v1.0.0</Text>
          <Text style={styles.footerSubtext}>让记账更简单</Text>
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
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    color: '#9CA3AF',
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 34,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 4,
  },
});
