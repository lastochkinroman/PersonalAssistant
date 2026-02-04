// Типы для обмена с бэкендом
export interface Task {
  id: string
  title: string
  notes?: string
  done: boolean
  priority: string
  tags: string[]
  dueDate?: string
  createdAt: string
  updatedAt: string
}

export interface WorkoutExercise {
  name: string
  sets: Array<{ [key: string]: any }>
}

export interface WorkoutSession {
  id: string
  date: string
  title: string
  notes?: string
  exercises: WorkoutExercise[]
  createdAt: string
  updatedAt: string
}

export interface MoneyTransaction {
  id: string
  date: string
  type: string
  amount: number
  category: string
  accountId?: string
  note?: string
  createdAt: string
  updatedAt: string
}

export interface DiaryEntry {
  id: string
  date: string
  content: string
  mood?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  time?: string
  duration?: number
  description?: string
  location?: string
  color?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  title: string
  content: string
  folder?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface DailyContext {
  date: string
  tasks: Task[]
  workouts: WorkoutSession[]
  money: MoneyTransaction[]
  diary: DiaryEntry[]
  events: CalendarEvent[]
  notes: Note[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  context: DailyContext
}

export interface ChatResponse {
  success: boolean
  response: string
  analysis: any
  model: {
    provider: string
    name: string
  }
  timestamp: string
}

export interface ModelStatus {
  loaded: boolean
  model_name: string
  device: string
  estimated_memory: string
  cuda_available: boolean
}

export interface HealthCheck {
  status: string
  timestamp: string
  model_loaded: boolean
  memory_info: {
    allocated: number
    cached: number
    max_allocated: number
  }
}

export interface ModelInfoFromBackend {
  model: {
    name: string
    loaded: boolean
    estimated_size: string
  }
  system: {
    cuda_available: boolean
    cuda_version: string | null
    torch_version: string
  }
  gpu: any
  memory: {
    system: {
      total: number
      available: number
      percent: number
    }
  }
}

export interface AvailableModel {
  id: string
  name: string
  description: string
  size_gb: number
  requirements: string
  recommended_for: string
  compatible: boolean
  current: boolean
}

export interface AvailableModelsResponse {
  models: AvailableModel[]
  current_gpu_memory: number
  recommendation: string
}

export interface SwitchModelRequest {
  model_name: string
}

export interface SwitchModelResponse {
  success: boolean
  message: string
  model_info: {
    name: string
    loaded: boolean
  }
}

// Новые типы для гибридной системы
export interface CurrentModelInfo {
  provider: 'api' | 'local'
  name: string
  info: {
    available: boolean
    description: string
    provider: string
    type: string
    [key: string]: any
  }
  available: boolean
}

export interface AvailableModels {
  api: Array<{
    id: string
    name: string
    description: string
    provider: string
    type: string
    available: boolean
    current: boolean
  }>
  local: Array<{
    id: string
    name: string
    description: string
    provider: string
    type: string
    compatible: boolean
    current: boolean
  }>
  current: {
    provider: string
    name: string
  }
  system: {
    cuda_available: boolean
    torch_version: string
    cpu_cores: number
    total_ram_gb: number
    gpu_name?: string
    gpu_memory_gb?: number
  }
}

export interface SwitchModelRequestNew {
  provider: 'api' | 'local'
  model_name: string
}