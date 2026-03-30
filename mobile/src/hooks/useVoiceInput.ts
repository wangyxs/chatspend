import { useState, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

interface UseVoiceInputOptions {
  onResult?: (text: string) => void;
  onError?: (error: Error) => void;
}

interface UseVoiceInputReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

export function useVoiceInput(options?: UseVoiceInputOptions): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  
  // 请求录音权限
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Failed to request audio permission:', error);
      return false;
    }
  }, []);
  
  // 开始录音
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      // 检查权限
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          throw new Error('录音权限未授予');
        }
      }
      
      // 设置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });
      
      // 开始录音
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      options?.onError?.(error as Error);
      throw error;
    }
  }, [hasPermission, requestPermission, options]);
  
  // 停止录音并获取URI
  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!recording) {
        return null;
      }
      
      console.log('Stopping recording...');
      setIsRecording(false);
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      // 重置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false
      });
      
      setRecording(null);
      
      console.log('Recording stopped, URI:', uri);
      
      if (uri && options?.onResult) {
        // 这里可以调用语音识别API
        // 暂时返回URI，后续集成Whisper
        options.onResult(uri);
      }
      
      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      options?.onError?.(error as Error);
      setIsRecording(false);
      setRecording(null);
      return null;
    }
  }, [recording, options]);
  
  // 取消录音
  const cancelRecording = useCallback(async (): Promise<void> => {
    try {
      if (!recording) {
        return;
      }
      
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      
      // 重置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false
      });
      
      // 删除录音文件
      const uri = recording.getURI();
      if (uri) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
      
      setRecording(null);
      console.log('Recording cancelled');
    } catch (error) {
      console.error('Failed to cancel recording:', error);
      setIsRecording(false);
      setRecording(null);
    }
  }, [recording]);
  
  return {
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
    hasPermission,
    requestPermission
  };
}
