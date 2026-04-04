import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  Text,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useImagePicker } from '@/hooks/useImagePicker';
import { api } from '@/services/api';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  value,
  onChangeText,
  onSend,
  disabled = false,
  placeholder = '说说你的消费，如"午饭花了35元"...',
}: ChatInputProps) {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceText, setVoiceText] = useState('按住说话');
  const [pulseAnim] = useState(new Animated.Value(1));

  // 语音输入
  const {
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
    recordingDuration,
  } = useVoiceInput({
    maxDuration: 60000,
    onError: (error) => {
      Alert.alert('录音错误', error.message);
    },
  });

  // 图片选择
  const { pickFromGallery, takePhoto, isLoading: isImageLoading } = useImagePicker({
    onError: (error) => {
      Alert.alert('图片选择错误', error.message);
    },
  });

  // 录音动画
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // 更新录音状态文本
  useEffect(() => {
    if (isRecording) {
      const seconds = Math.floor(recordingDuration / 1000);
      setVoiceText(`录音中 ${seconds}s`);
    } else {
      setVoiceText('按住说话');
    }
  }, [isRecording, recordingDuration]);

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend();
    }
  };

  // 处理语音按钮长按
  const handleVoicePressIn = async () => {
    if (disabled) return;
    await startRecording();
  };

  const handleVoicePressOut = async () => {
    const uri = await stopRecording();
    if (uri) {
      // 发送语音到后端识别
      try {
        const result = await api.transcribeAudio(uri);
        if (result.text) {
          onChangeText(result.text);
          // 自动发送
          setTimeout(() => {
            if (result.text.trim()) {
              onSend();
            }
          }, 100);
        }
      } catch (error) {
        console.error('语音识别失败:', error);
        Alert.alert('语音识别失败', '请重试或使用文字输入');
      }
    }
  };

  // 切换语音模式
  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
  };

  // 处理图片选择
  const handleImagePick = async () => {
    Alert.alert(
      '选择图片来源',
      '',
      [
        {
          text: '拍照',
          onPress: async () => {
            const uri = await takePhoto();
            if (uri) {
              await handleImageSelected(uri);
            }
          },
        },
        {
          text: '从相册选择',
          onPress: async () => {
            const uri = await pickFromGallery();
            if (uri) {
              await handleImageSelected(uri);
            }
          },
        },
        { text: '取消', style: 'cancel' },
      ]
    );
  };

  // 图片选中后处理
  const handleImageSelected = async (uri: string) => {
    try {
      // 发送图片到后端识别
      const result = await api.recognizeImage(uri);
      if (result.transactions && result.transactions.length > 0) {
        // 显示识别结果
        onChangeText(`识别到 ${result.transactions.length} 笔交易，确认记账吗？`);
        // 可以自动发送或等待用户确认
        setTimeout(() => {
          if (result.transactions.length > 0) {
            onSend();
          }
        }, 100);
      } else {
        Alert.alert('识别失败', '未能识别出交易信息，请重试或使用文字输入');
      }
    } catch (error) {
      console.error('图片识别失败:', error);
      Alert.alert('图片识别失败', '请重试或使用文字输入');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        {/* 语音/键盘切换按钮 */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={toggleVoiceMode}
          disabled={disabled}
        >
          <Ionicons
            name={isVoiceMode ? 'keyboard-outline' : 'mic-outline'}
            size={22}
            color={disabled ? '#9CA3AF' : '#3B82F6'}
          />
        </TouchableOpacity>

        {/* 语音模式：录音按钮 */}
        {isVoiceMode ? (
          <TouchableOpacity
            style={[
              styles.voiceButton,
              isRecording && styles.voiceButtonActive,
            ]}
            onPressIn={handleVoicePressIn}
            onPressOut={handleVoicePressOut}
            disabled={disabled}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons
                name={isRecording ? 'mic' : 'mic-outline'}
                size={24}
                color={isRecording ? '#FFFFFF' : '#3B82F6'}
              />
            </Animated.View>
            <Text style={[styles.voiceText, isRecording && styles.voiceTextActive]}>
              {voiceText}
            </Text>
          </TouchableOpacity>
        ) : (
          // 文本输入模式
          <>
            <TextInput
              style={styles.textInput}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
              editable={!disabled}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />

            {/* 相机按钮 */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleImagePick}
              disabled={disabled || isImageLoading}
            >
              <Ionicons
                name="camera-outline"
                size={22}
                color={disabled || isImageLoading ? '#9CA3AF' : '#3B82F6'}
              />
            </TouchableOpacity>

            {/* 发送按钮 */}
            <TouchableOpacity
              style={[
                styles.sendButton,
                value.trim() && !disabled ? styles.sendButtonActive : null,
              ]}
              onPress={handleSend}
              disabled={!value.trim() || disabled}
            >
              <Ionicons
                name="send"
                size={18}
                color={value.trim() && !disabled ? '#FFFFFF' : '#9CA3AF'}
              />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    minHeight: 44,
  },
  iconButton: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 0 : 8,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
    marginLeft: 4,
  },
  sendButtonActive: {
    backgroundColor: '#3B82F6',
  },
  voiceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
  },
  voiceButtonActive: {
    backgroundColor: '#3B82F6',
  },
  voiceText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#3B82F6',
  },
  voiceTextActive: {
    color: '#FFFFFF',
  },
});
