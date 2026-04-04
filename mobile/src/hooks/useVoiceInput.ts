/**
 * 语音输入 Hook
 * 
 * 使用 expo-av 实现录音功能
 */
import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

interface UseVoiceInputOptions {
  onResult?: (text: string) => void;
  onError?: (error: Error) => void;
  maxDuration?: number; // 最大录音时长（毫秒）
}

interface UseVoiceInputReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
  recordingDuration: number;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { onResult, onError, maxDuration = 60000 } = options;
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // 请求录音权限
  const requestPermission = async (): Promise<boolean> => {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  };

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      // 检查权限
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        throw new Error('麦克风权限未授权');
      }

      // 设置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 创建录音实例
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      startTimeRef.current = Date.now();

      // 更新录音时长
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setRecordingDuration(elapsed);

        // 达到最大时长自动停止
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 100);

    } catch (error) {
      console.error('开始录音失败:', error);
      onError?.(error as Error);
      setIsRecording(false);
    }
  }, [maxDuration, onError]);

  // 停止录音
  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!recordingRef.current) return null;

      // 停止录音
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // 清除计时器
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      setIsRecording(false);
      setRecordingDuration(0);

      // 恢复音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      if (!uri) {
        throw new Error('录音文件获取失败');
      }

      // 返回录音文件 URI
      return uri;

    } catch (error) {
      console.error('停止录音失败:', error);
      onError?.(error as Error);
      setIsRecording(false);
      return null;
    }
  }, [onError]);

  // 取消录音
  const cancelRecording = useCallback(async () => {
    try {
      if (!recordingRef.current) return;

      // 停止并删除录音
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;

      // 清除计时器
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      setIsRecording(false);
      setRecordingDuration(0);

      // 恢复音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

    } catch (error) {
      console.error('取消录音失败:', error);
      onError?.(error as Error);
    }
  }, [onError]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
    recordingDuration,
  };
}
