import type {
  ChatRequest,
  ChatResponse,
  ModelStatus,
  HealthCheck,
  AvailableModelsResponse,
  SwitchModelResponse
} from './api-types'
import type { CurrentModelInfo, AvailableModels, SwitchModelRequestNew } from './api-types'

const API_BASE_URL = 'http://localhost:8000'

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
        // Преобразуем данные для совместимости с бэкендом
        const { money, ...contextWithoutMoney } = request.context;
        const compatibleRequest = {
            ...request,
            context: {
                ...contextWithoutMoney,
                // Если есть поле 'money', переименовываем его в 'finances'
                ...(money && { finances: money })
            }
        };
        
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(compatibleRequest),
        });

        if (!response.ok) {
            let errorDetail = `API error (${response.status}): ${response.statusText}`;
            
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    if (Array.isArray(errorData.detail)) {
                        errorDetail = errorData.detail.map((err: any) => 
                            `${err.loc?.join('.')}: ${err.msg}`
                        ).join(', ');
                    } else {
                        errorDetail = errorData.detail;
                    }
                }
            } catch {
                // Не удалось распарсить JSON, используем текст ответа
                const text = await response.text();
                if (text) errorDetail = text;
            }
            
            throw new Error(errorDetail);
        }

        return response.json();
    } catch (error) {
        console.error('Chat API error:', error);
        throw error;
    }
  }

  async analyzeDay(context: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/analyze/day`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(context),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error (${response.status}): ${errorText}`)
      }

      return response.json()
    } catch (error) {
      console.error('Analyze API error:', error)
      throw error
    }
  }

  async getModelStatus(): Promise<ModelStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/model/status`)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error (${response.status}): ${errorText}`)
      }

      return response.json()
    } catch (error) {
      console.error('Model status API error:', error)
      throw error
    }
  }

  async getModelInfo(): Promise<CurrentModelInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/models/current`)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error (${response.status}): ${errorText}`)
      }

      return response.json()
    } catch (error) {
      console.error('Model info API error:', error)
      throw error
    }
  }

  async getAvailableModels(): Promise<AvailableModels> {
    try {
      const response = await fetch(`${this.baseUrl}/api/models/available`)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      console.error('Available models API error:', error)
      throw error
    }
  }

  async getCurrentModel(): Promise<CurrentModelInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/models/current`)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      console.error('Current model API error:', error)
      throw error
    }
  }

  async switchModel(request: SwitchModelRequestNew): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/models/switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error (${response.status}): ${errorText}`)
      }

      return response.json()
    } catch (error) {
      console.error('Switch model API error:', error)
      throw error
    }
  }

  async getSystemInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/info`)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      console.error('System info API error:', error)
      throw error
    }
  }

  async reloadLocalModel(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/models/reload`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      console.error('Reload model API error:', error)
      throw error
    }
  }

  async healthCheck(): Promise<HealthCheck> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error (${response.status}): ${errorText}`)
      }

      return response.json()
    } catch (error) {
      console.error('Health check API error:', error)
      throw error
    }
  }

  // Проверка доступности сервера
  async checkServerAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000) // 3 секунды таймаут
      })
      return response.ok
    } catch {
      return false
    }
  }
}

// Singleton instance
export const apiClient = new ApiClient()