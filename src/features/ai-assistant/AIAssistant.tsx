import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import type { AppDataV1 } from '../../lib/appData'
import { apiClient } from '../../lib/api-client'
import type { ChatMessage } from '../../lib/api-types'
import { collectDailyContext } from '../../lib/daily-context'
import { todayISO, uid } from '../../lib/ids'
import { ModelManager } from './ModelManager'
import './AIAssistant.css'
import type { AvailableModels, CurrentModelInfo } from '../../lib/api-types'

interface AIAssistantProps {
  data: AppDataV1
  onDataUpdate?: () => void
}

export function AIAssistant({ data, onDataUpdate }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid('msg'),
      role: 'assistant',
      content: 'Привет! Я ваш AI-ассистент. Я анализирую данные из всех разделов приложения и могу давать персонализированные рекомендации по вашим задачам, финансам, тренировкам и многому другому!',
      timestamp: new Date().toISOString()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [modelStatus, setModelStatus] = useState<{
    loaded: boolean
    model_name: string
    device: string
    estimated_memory: string
    cuda_available: boolean
  } | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null)
  const [showModelManager, setShowModelManager] = useState(false)
  const [availableModels, setAvailableModels] = useState<AvailableModels | null>(null)
  const [currentModel, setCurrentModel] = useState<CurrentModelInfo | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Проверяем доступность сервера при монтировании
  useEffect(() => {
    const init = async () => {
      // Проверяем доступность сервера
      const available = await checkServerAvailability()
      if (available) {
        // Если сервер доступен, загружаем статус модели и информацию о моделях
        await Promise.all([
          checkModelStatus(),
          loadModelInfo()
        ])
      }
    }
    
    init()
  }, [])

  // Прокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const checkServerAvailability = async () => {
    try {
      const available = await apiClient.checkServerAvailability()
      setServerAvailable(available)
      
      if (!available) {
        addSystemMessage('⚠️ Бэкенд AI не доступен. Запустите сервер на localhost:8000')
      }
      
      return available
    } catch (error) {
      console.error('Ошибка при проверке сервера:', error)
      setServerAvailable(false)
      addSystemMessage('❌ Не удалось подключиться к AI-бэкенду')
      return false
    }
  }

  const checkModelStatus = async () => {
    try {
      const status = await apiClient.getModelStatus()
      setModelStatus(status)
      
      if (!status.loaded) {
        addSystemMessage('🤖 Модель AI еще загружается на сервере...')
      }
    } catch (error) {
      console.error('Ошибка при проверке статуса модели:', error)
      addSystemMessage('⚠️ Не удалось получить статус AI модели')
    }
  }

  const loadModelInfo = async () => {
    try {
      const [models, current] = await Promise.all([
        apiClient.getAvailableModels(),
        apiClient.getCurrentModel()
      ])
      setAvailableModels(models)
      setCurrentModel(current)
    } catch (error) {
      console.error('Ошибка загрузки информации о моделях:', error)
    }
  }

  const addSystemMessage = (content: string) => {
    const message: ChatMessage = {
      id: uid('msg'),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, message])
  }

  const reloadModel = async () => {
    try {
      setLoading(true)
      const result = await apiClient.reloadLocalModel()
      if (result.success) {
        addSystemMessage('♻️ Модель перезагружается...')
        await new Promise(resolve => setTimeout(resolve, 2000)) // Ждем 2 секунды
        await checkModelStatus()
        await loadModelInfo()
      }
    } catch (error) {
      console.error('Ошибка при перезагрузке модели:', error)
      addSystemMessage('❌ Ошибка при перезагрузке модели')
    } finally {
      setLoading(false)
    }
  }

  const analyzeDay = async () => {
    if (!serverAvailable) {
      addSystemMessage('⚠️ Сервер недоступен. Запустите бэкенд на localhost:8000')
      return
    }

    try {
      setIsAnalyzing(true)
      const context = collectDailyContext(data, selectedDate)
      
      const response = await apiClient.analyzeDay(context)

      if (response.success) {
        const analysis = response.data
        
        // Calculate expense ratio for financial analysis
        const expenseRatio = analysis.finances.income > 0 ? analysis.finances.expenses / analysis.finances.income : 0
        
        // Get event titles for display
        const eventTitles = context.events.map((event: any) => event.title || 'Событие')
        
        // Get note titles for display
        const noteTitles = context.notes.map((note: any) => note.title || 'Заметка')
        
        // Calculate total notes length
        const totalNotesLength = context.diary.reduce((sum: number, entry: any) => sum + (entry.text || '').length, 0)
        
        const analysisMessage: ChatMessage = {
          id: uid('msg'),
          role: 'assistant',
          content: `## 📊 Анализ дня ${selectedDate}

### ✅ Задачи:
- Всего задач: ${analysis.tasks.total_tasks}
- Выполнено: ${analysis.tasks.completed_tasks} (${Math.round(analysis.tasks.completion_rate * 100)}%)
- Высокий приоритет: ${analysis.tasks.high_priority_tasks}

### 💰 Финансы:
- Доход: ${analysis.finances.income.toFixed(1)}
- Расходы: ${analysis.finances.expenses.toFixed(1)}
- Баланс: ${analysis.finances.balance.toFixed(1)}
- ${expenseRatio > 0.7 ? '⚠️ Высокий расход' : '✓ Стабильные финансы'}

### 🏋️‍♂️ Тренировки:
- Сессий: ${analysis.workouts.sessions.length}
- Общий объем: ${analysis.workouts.total_volume.toFixed(0)} кг
${analysis.workouts.sessions.map((s: any) => `  - ${s.title}: ${s.exercises_count} упражнений, ${s.volume} кг`).join('\n')}

### 📔 Дневник:
- Записей: ${analysis.diary.entries_count}
- Общий объем: ${totalNotesLength} символов
${analysis.diary.moods.length ? `- Настроения: ${analysis.diary.moods.join(', ')}` : ''}

### 📅 События:
- Всего: ${analysis.events.events_count}
${eventTitles.length ? `- Последние: ${eventTitles.slice(0, 3).join(', ')}${eventTitles.length > 3 ? '...' : ''}` : ''}

### 📝 Заметки:
- Всего: ${analysis.notes.notes_count}
${noteTitles.length ? `- Активные: ${noteTitles.slice(0, 3).join(', ')}${noteTitles.length > 3 ? '...' : ''}` : ''}

---
*Используйте эти данные для более точных вопросов AI-ассистенту!*`,
          timestamp: new Date().toISOString()
        }

        setMessages(prev => [...prev, analysisMessage])
      }
    } catch (error) {
      console.error('Ошибка при анализе дня:', error)
      
      const errorMessage: ChatMessage = {
        id: uid('msg'),
        role: 'assistant',
        content: '❌ Ошибка при анализе дня. Проверьте соединение с бэкендом.',
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    // Проверяем доступность сервера
    if (!serverAvailable) {
      const checkMsg: ChatMessage = {
        id: uid('msg'),
        role: 'assistant',
        content: '🔌 Бэкенд AI не доступен. Запустите сервер на localhost:8000\n\n**Как запустить:**\n1. Установите Python зависимости\n2. Перейдите в папку backend\n3. Выполните: `python main.py`\n4. Подождите загрузки модели (1-5 минут)',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, checkMsg])
      return
    }

    const userMessage: ChatMessage = {
      id: uid('msg'),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Собираем контекст для выбранной даты
      const context = collectDailyContext(data, selectedDate)
      
      const request = {
        messages: [...messages, userMessage],
        context
      }

      const response = await apiClient.chat(request)

      if (response.success) {
        const assistantMessage: ChatMessage = {
          id: uid('msg'),
          role: 'assistant',
          content: response.response,
          timestamp: new Date().toISOString()
        }

        setMessages(prev => [...prev, assistantMessage])
        
        // Если есть анализ в ответе, можем его как-то использовать
        if (response.analysis && onDataUpdate) {
          onDataUpdate()
        }
      }
    } catch (error: any) {
      console.error('Ошибка при отправке сообщения:', error)
      
      let errorContent = '❌ Ошибка при подключении к AI-ассистенту. '
      
      if (error.message?.includes('503')) {
        errorContent += 'Модель не загружена на сервере. Попробуйте перезагрузить модель.'
      } else if (error.message?.includes('504')) {
        errorContent += 'Таймаут генерации ответа. Модель работает медленно или недоступна.'
      } else if (error.message?.includes('Failed to fetch')) {
        errorContent += 'Сервер недоступен. Убедитесь, что бэкенд запущен на http://localhost:8000'
      } else {
        errorContent += error.message || 'Неизвестная ошибка'
      }
      
      const errorMessage: ChatMessage = {
        id: uid('msg'),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: uid('msg'),
        role: 'assistant',
        content: 'Чат очищен. Чем могу помочь?',
        timestamp: new Date().toISOString()
      }
    ])
  }

  const handleQuickQuestion = async (question: string) => {
    if (loading) return
    
    setInput(question)
    
    // Даем время пользователю увидеть вопрос в поле ввода
    setTimeout(() => {
      handleSend()
    }, 100)
  }

  // Функция для оценки дня на основе анализа
  const getDaySummary = () => {
    const context = collectDailyContext(data, selectedDate)
    
    const completedTasks = context.tasks.filter((t: any) => t.completed).length
    const totalTasks = context.tasks.length
    const hasWorkout = context.workouts.length > 0
    const hasFinancialActivity = context.finances.length > 0
    const hasDiaryEntry = context.diary.length > 0
    
    let score = 0
    let summary = []
    
    if (totalTasks > 0) {
      const completionRate = completedTasks / totalTasks
      score += completionRate * 40 // 40% за задачи
      summary.push(`${completedTasks}/${totalTasks} задач выполнено`)
    }
    
    if (hasWorkout) {
      score += 20 // 20% за тренировку
      summary.push('Есть тренировка')
    }
    
    if (hasFinancialActivity) {
      score += 20 // 20% за финансовую активность
      summary.push('Есть финансовая активность')
    }
    
    if (hasDiaryEntry) {
      score += 20 // 20% за дневник
      summary.push('Есть запись в дневнике')
    }
    
    return {
      score: Math.round(score),
      summary: summary.join(', ')
    }
  }

  if (isMinimized) {
    const summary = getDaySummary()
    
    return (
      <div className="ai-assistant-minimized">
        <button 
          className="ai-toggle-button"
          onClick={() => setIsMinimized(false)}
          title="Открыть AI-ассистента"
        >
          🤖 AI
        </button>
        <span className={`status-dot ${
          serverAvailable === null ? 'loading' : 
          serverAvailable ? (modelStatus?.loaded ? 'loaded' : 'loading') : 
          'not-available'
        }`}></span>
        {selectedDate === todayISO() && (
          <div className="day-score">
            <span className="score-badge">{summary.score}%</span>
          </div>
        )}
      </div>
    )
  }

  const summary = getDaySummary()

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <div className="ai-header-left">
          <h3>🤖 AI-Ассистент</h3>
          <div className="ai-status">
            <span className={`status-dot ${
              serverAvailable === null ? 'loading' : 
              serverAvailable ? (modelStatus?.loaded ? 'loaded' : 'loading') : 
              'not-available'
            }`}></span>
            {serverAvailable === null ? 'Проверка соединения...' :
             serverAvailable ? (modelStatus?.loaded ? 'Модель загружена' : 'Модель загружается...') :
             'Сервер недоступен'
            }
            {currentModel && (
              <span className="model-info">
                ({currentModel.provider === 'api' ? 'Mistral' : 'Local'}, {currentModel.name.split('/').pop() || currentModel.name})
              </span>
            )}
          </div>
        </div>
        <div className="ai-header-right">
          <button 
            className="ai-header-button"
            onClick={checkServerAvailability}
            title="Проверить соединение"
          >
            🔄
          </button>
          {serverAvailable && modelStatus && (
            <button 
              className="ai-header-button"
              onClick={reloadModel}
              title="Перезагрузить модель"
              disabled={loading}
            >
              ♻️
            </button>
          )}
          <button 
            className="ai-header-button"
            onClick={() => setShowModelManager(true)}
            title="Управление моделями"
          >
            ⚙️
          </button>
          <button 
            className="ai-header-button"
            onClick={() => setIsMinimized(true)}
            title="Свернуть"
          >
            ➖
          </button>
        </div>
      </div>

      <div className="ai-controls">
        <div className="date-selector">
          <label htmlFor="ai-date">Данные за:</label>
          <input
            id="ai-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
          <div className="day-summary">
            <span className="score-badge">{summary.score}%</span>
            <span className="summary-text">{summary.summary || 'Нет данных'}</span>
          </div>
          <button 
            onClick={analyzeDay}
            disabled={isAnalyzing || !serverAvailable}
            className="analyze-button"
            title="Подробный анализ дня"
          >
            {isAnalyzing ? '📊 Анализ...' : '📊 Анализ'}
          </button>
        </div>
        <div className="context-info">
          <small>
            {selectedDate === todayISO() ? 'Сегодня' : selectedDate}: 
            {collectDailyContext(data, selectedDate).tasks.length} задач • 
            {collectDailyContext(data, selectedDate).finances.length} транзакций • 
            {collectDailyContext(data, selectedDate).workouts.length} тренировок
          </small>
        </div>
      </div>

      <div className="ai-messages">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`message ${message.role}`}
          >
            <div className="message-header">
              <strong>{message.role === 'user' ? '👤 Вы' : '🤖 Ассистент'}</strong>
              <small>
                {new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </small>
            </div>
            <div className="message-content">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <small style={{ color: '#64748b', display: 'block', marginTop: '8px' }}>
                AI анализирует ваши данные и генерирует ответ...
              </small>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-input-area">
        <div className="input-wrapper">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !serverAvailable 
                ? "Запустите бэкенд на localhost:8000 чтобы использовать AI..." 
                : "Спросите AI о ваших данных, попросите рекомендации или анализ..."
            }
            disabled={loading || !serverAvailable}
            rows={3}
          />
          <div className="input-actions">
            <button 
              onClick={clearChat}
              className="clear-button"
              title="Очистить историю чата"
            >
              🗑️ Очистить
            </button>
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim() || !serverAvailable}
              className="send-button"
            >
              {loading ? 'AI думает...' : 'Отправить'}
            </button>
          </div>
        </div>
        <div className="quick-actions">
          <small>Примеры запросов AI:</small>
          <button 
            onClick={() => handleQuickQuestion("Какие у меня невыполненные задачи с высоким приоритетом?")}
            className="quick-button"
            disabled={loading || !serverAvailable}
          >
            🔥 Срочные задачи
          </button>
          <button 
            onClick={() => handleQuickQuestion("Дайте рекомендации по моим финансам на сегодня")}
            className="quick-button"
            disabled={loading || !serverAvailable}
          >
            💰 Финансы
          </button>
          <button 
            onClick={() => handleQuickQuestion("Проанализируй мои тренировки и дай рекомендации")}
            className="quick-button"
            disabled={loading || !serverAvailable}
          >
            🏋️‍♂️ Тренировки
          </button>
          <button 
            onClick={() => handleQuickQuestion("Подведи итоги моего дня и дай совет на завтра")}
            className="quick-button"
            disabled={loading || !serverAvailable}
          >
            📊 Итоги дня
          </button>
        </div>
      </div>

      {showModelManager && (
        <ModelManager
          availableModels={availableModels}
          currentModel={currentModel}
          onModelChange={() => {
            checkModelStatus()
            checkServerAvailability()
            loadModelInfo()
          }}
          onClose={() => setShowModelManager(false)}
        />
      )}
    </div>
  )
}