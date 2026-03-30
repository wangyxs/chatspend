import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        {/* 语音按钮（预留） */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {}}
          disabled={true}
        >
          <Ionicons name="mic-outline" size={22} color="#9CA3AF" />
        </TouchableOpacity>

        {/* 文本输入 */}
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

        {/* 相机按钮（预留） */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {}}
          disabled={true}
        >
          <Ionicons name="camera-outline" size={22} color="#9CA3AF" />
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
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
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
});
