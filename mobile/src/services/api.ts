import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  Transaction,
  CreateTransactionRequest,
  ParseResponse,
  CreateTransactionResponse,
  TransactionListResponse,
  TransactionQueryParams
} from '@/types';
import Constants from 'expo-constants';

class APIService {
  private client: AxiosInstance;
  private baseURL: string;
  
  constructor() {
    // 从app.json的extra配置中获取API地址
    this.baseURL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000/api/v1';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 可以在这里添加认证token
        // const token = await SecureStore.getItemAsync('authToken');
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          // 服务器返回错误
          const message = (error.response.data as any)?.detail || error.message;
          throw new Error(message);
        } else if (error.request) {
          // 请求已发出但没有响应
          throw new Error('网络连接失败，请检查网络设置');
        } else {
          // 其他错误
          throw new Error(error.message);
        }
      }
    );
  }
  
  // ==================== 交易接口 ====================
  
  /**
   * 统一对话接口（后端驱动渲染）
   * @param input 用户输入
   * @param context 上下文信息
   */
  async chat(input: string, context?: any): Promise<any> {
    const response = await this.client.post('/transactions/chat', {
      input,
      context
    });
    return response.data;
  }
  
  /**
   * 解析自然语言输入
   * @param input 用户输入的文本
   */
  async parseTransaction(input: string): Promise<ParseResponse> {
    const response = await this.client.post<ParseResponse>('/transactions/parse', {
      input
    });
    return response.data;
  }
  
  /**
   * 创建交易
   * @param input 用户输入
   * @param inputType 输入类型
   */
  async createTransaction(
    input: string,
    inputType: 'text' | 'voice' | 'image' = 'text'
  ): Promise<CreateTransactionResponse> {
    const response = await this.client.post<CreateTransactionResponse>('/transactions', {
      input,
      input_type: inputType
    });
    return response.data;
  }
  
  /**
   * 获取交易列表
   * @param params 查询参数
   */
  async getTransactions(params?: TransactionQueryParams): Promise<TransactionListResponse> {
    const response = await this.client.get<TransactionListResponse>('/transactions', {
      params
    });
    return response.data;
  }
  
  /**
   * 获取单个交易详情
   * @param id 交易ID
   */
  async getTransaction(id: string): Promise<Transaction> {
    const response = await this.client.get<Transaction>(`/transactions/${id}`);
    return response.data;
  }
  
  /**
   * 更新交易
   * @param id 交易ID
   * @param updates 更新内容
   */
  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const response = await this.client.put<Transaction>(`/transactions/${id}`, updates);
    return response.data;
  }
  
  /**
   * 删除交易
   * @param id 交易ID
   */
  async deleteTransaction(id: string): Promise<void> {
    await this.client.delete(`/transactions/${id}`);
  }
  
  // ==================== 语音和图片接口 ====================
  
  /**
   * 语音转文字（仅识别，不创建交易）
   * @param audioUri 音频文件URI
   */
  async transcribeAudio(audioUri: string): Promise<{ text: string }> {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a'
    } as any);
    
    const response = await this.client.post<{ text: string }>(
      '/transcribe',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return response.data;
  }
  
  /**
   * 语音识别并创建交易
   * @param audioUri 音频文件URI
   */
  async createTransactionFromVoice(audioUri: string): Promise<CreateTransactionResponse> {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a'
    } as any);
    
    const response = await this.client.post<CreateTransactionResponse>(
      '/transactions/voice',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return response.data;
  }
  
  /**
   * 图片识别（仅识别，不创建交易）
   * @param imageUri 图片URI
   */
  async recognizeImage(imageUri: string): Promise<{ transactions: any[] }> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'receipt.jpg'
    } as any);
    
    const response = await this.client.post<{ transactions: any[] }>(
      '/recognize',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return response.data;
  }
  
  /**
   * 图片识别并创建交易
   * @param imageUri 图片URI
   */
  async createTransactionFromImage(imageUri: string): Promise<CreateTransactionResponse> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'receipt.jpg'
    } as any);
    
    const response = await this.client.post<CreateTransactionResponse>(
      '/transactions/image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return response.data;
  }
  
  // ==================== 分析接口 ====================
  
  /**
   * 获取消费分析
   * @param period 时间周期
   */
  async getAnalysis(period: string): Promise<any> {
    const response = await this.client.get('/analysis', {
      params: { period }
    });
    return response.data;
  }
  
  // ==================== 预算接口 ====================
  
  /**
   * 创建预算
   */
  async createBudget(budget: any): Promise<any> {
    const response = await this.client.post('/budgets', budget);
    return response.data;
  }
  
  /**
   * 获取预算列表
   */
  async getBudgets(): Promise<any[]> {
    const response = await this.client.get('/budgets');
    return response.data;
  }
  
  /**
   * 更新预算
   */
  async updateBudget(id: string, updates: any): Promise<any> {
    const response = await this.client.put(`/budgets/${id}`, updates);
    return response.data;
  }
  
  /**
   * 删除预算
   */
  async deleteBudget(id: string): Promise<void> {
    await this.client.delete(`/budgets/${id}`);
  }
  
  // ==================== 健康检查 ====================
  
  /**
   * 检查API连接状态
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 获取API版本
   */
  async getVersion(): Promise<string> {
    const response = await this.client.get('/version');
    return response.data.version;
  }
}

// 单例实例
export const api = new APIService();
