import { useState } from 'react'
import { apiClient } from '../../lib/api-client'
import type { AvailableModels, CurrentModelInfo } from '../../lib/api-types'
import './ModelManager.css'

interface ModelManagerProps {
  availableModels: AvailableModels | null
  currentModel: CurrentModelInfo | null
  onModelChange: () => void
  onClose: () => void
}

export function ModelManager({ availableModels, currentModel, onModelChange, onClose }: ModelManagerProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleModelSwitch = async (provider: 'api' | 'local', modelName: string) => {
    try {
      setLoading(modelName)
      setError(null)
      
      await apiClient.switchModel({ provider, model_name: modelName })
      onModelChange()
    } catch (err: any) {
      setError(err.message || 'Не удалось переключить модель')
    } finally {
      setLoading(null)
    }
  }

  if (!availableModels || !currentModel) {
    return (
      <div className="model-manager-overlay">
        <div className="model-manager">
          <div className="model-manager-header">
            <h2>⚙️ Управление моделями</h2>
            <button 
              className="close-button" 
              onClick={onClose}
              title="Закрыть"
            >
              ✕
            </button>
          </div>
          <div className="loading">Загрузка информации о моделях...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="model-manager-overlay">
      <div className="model-manager">
        <div className="model-manager-header">
          <h2>⚙️ Управление моделями</h2>
          <button 
            className="close-button" 
            onClick={onClose}
            title="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="model-manager-content">
          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <div className="model-sections">
            {/* API модели */}
            <div className="model-section">
              <h3>🔗 API модели (Mistral)</h3>
              <div className="models-list">
                {availableModels.api.map((model) => (
                  <div 
                    key={model.id} 
                    className={`model-item ${model.current ? 'active' : ''}`}
                  >
                    <div className="model-info">
                      <div className="model-name">
                        {model.name}
                        {model.current && <span className="current-badge">Текущая</span>}
                      </div>
                      <div className="model-description">{model.description}</div>
                      <div className="model-status">
                        {model.available ? (
                          <span className="status-available">🟢 Доступна</span>
                        ) : (
                          <span className="status-unavailable">🔴 Недоступна</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleModelSwitch('api', model.name)}
                      disabled={model.current || !model.available || loading !== null}
                      className="switch-button"
                    >
                      {loading === model.name ? '🔄 Переключение...' : 'Переключить'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Локальные модели */}
            <div className="model-section">
              <h3>🖥️ Локальные модели</h3>
              <div className="models-list">
                {availableModels.local.map((model) => (
                  <div 
                    key={model.id} 
                    className={`model-item ${model.current ? 'active' : ''}`}
                  >
                    <div className="model-info">
                      <div className="model-name">
                        {model.name}
                        {model.current && <span className="current-badge">Текущая</span>}
                      </div>
                      <div className="model-description">{model.description}</div>
                      <div className="model-status">
                        {model.compatible ? (
                          <span className="status-available">🟢 Совместима</span>
                        ) : (
                          <span className="status-unavailable">🔴 Несовместима</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleModelSwitch('local', model.name)}
                      disabled={model.current || !model.compatible || loading !== null}
                      className="switch-button"
                    >
                      {loading === model.name ? '🔄 Загрузка...' : 'Переключить'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Информация о системе */}
          <div className="system-info">
            <h3>📊 Информация о системе</h3>
            <div className="system-details">
              <div className="system-item">
                <span className="label">CUDA доступно:</span>
                <span className={availableModels.system.cuda_available ? 'value-success' : 'value-warning'}>
                  {availableModels.system.cuda_available ? 'Да' : 'Нет'}
                </span>
              </div>
              {availableModels.system.cuda_available && availableModels.system.gpu_name && (
                <div className="system-item">
                  <span className="label">GPU:</span>
                  <span className="value">{availableModels.system.gpu_name}</span>
                </div>
              )}
              {availableModels.system.cuda_available && availableModels.system.gpu_memory_gb && (
                <div className="system-item">
                  <span className="label">Память GPU:</span>
                  <span className="value">{availableModels.system.gpu_memory_gb.toFixed(1)} GB</span>
                </div>
              )}
              <div className="system-item">
                <span className="label">CPU cores:</span>
                <span className="value">{availableModels.system.cpu_cores}</span>
              </div>
              <div className="system-item">
                <span className="label">RAM:</span>
                <span className="value">{availableModels.system.total_ram_gb.toFixed(1)} GB</span>
              </div>
              <div className="system-item">
                <span className="label">PyTorch:</span>
                <span className="value">{availableModels.system.torch_version}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}