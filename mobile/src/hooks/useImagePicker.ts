/**
 * 图片选择 Hook
 * 
 * 使用 expo-image-picker 和 expo-camera 实现图片选择
 */
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

interface UseImagePickerOptions {
  onImageSelected?: (uri: string) => void;
  onError?: (error: Error) => void;
  allowsEditing?: boolean;
  quality?: number;
}

interface UseImagePickerReturn {
  pickFromGallery: () => Promise<string | null>;
  takePhoto: () => Promise<string | null>;
  isLoading: boolean;
}

export function useImagePicker(options: UseImagePickerOptions = {}): UseImagePickerReturn {
  const {
    onImageSelected,
    onError,
    allowsEditing = false,
    quality = 0.8,
  } = options;

  const [isLoading, setIsLoading] = useState(false);

  // 请求相册权限
  const requestGalleryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  // 请求相机权限
  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  };

  // 从相册选择
  const pickFromGallery = useCallback(async (): Promise<string | null> => {
    try {
      setIsLoading(true);

      const hasPermission = await requestGalleryPermission();
      if (!hasPermission) {
        throw new Error('相册权限未授权');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing,
        quality,
        base64: false,
      });

      if (result.canceled) {
        setIsLoading(false);
        return null;
      }

      const uri = result.assets[0].uri;
      onImageSelected?.(uri);
      setIsLoading(false);
      
      return uri;

    } catch (error) {
      console.error('选择图片失败:', error);
      onError?.(error as Error);
      setIsLoading(false);
      return null;
    }
  }, [allowsEditing, quality, onImageSelected, onError]);

  // 拍照
  const takePhoto = useCallback(async (): Promise<string | null> => {
    try {
      setIsLoading(true);

      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        throw new Error('相机权限未授权');
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing,
        quality,
        base64: false,
      });

      if (result.canceled) {
        setIsLoading(false);
        return null;
      }

      const uri = result.assets[0].uri;
      onImageSelected?.(uri);
      setIsLoading(false);
      
      return uri;

    } catch (error) {
      console.error('拍照失败:', error);
      onError?.(error as Error);
      setIsLoading(false);
      return null;
    }
  }, [allowsEditing, quality, onImageSelected, onError]);

  return {
    pickFromGallery,
    takePhoto,
    isLoading,
  };
}
