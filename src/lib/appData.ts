export type Priority = 'low' | 'med' | 'high'

export type Task = {
  id: string
  title: string
  notes?: string
  done: boolean
  priority: Priority
  tags: string[]
  dueDate?: string // YYYY-MM-DD
  createdAt: string
  updatedAt: string
}

export type MoneyTxType = 'income' | 'expense'

export type MoneyTransaction = {
  id: string
  date: string // YYYY-MM-DD
  type: MoneyTxType
  amount: number // in major units, e.g. RUB
  category: string
  note?: string
  createdAt: string
  updatedAt: string
}

export type MoneyData = {
  transactions: MoneyTransaction[]
  categories: string[]
  monthlyBudget?: number
}

export type WorkoutSet = {
  reps: number
  weight: number
}

export type WorkoutExercise = {
  name: string
  sets: WorkoutSet[]
}

export type WorkoutSession = {
  id: string
  date: string // YYYY-MM-DD
  title: string
  notes?: string
  exercises: WorkoutExercise[]
  createdAt: string
  updatedAt: string
}

export type AppSettings = {
  locale: string
  currency: string
}

export type AppDataV1 = {
  version: 1
  settings: AppSettings
  tasks: Task[]
  money: MoneyData
  workouts: WorkoutSession[]
}

export const APP_DATA_LS_KEY = 'pa.data.v1'

export function createEmptyAppDataV1(): AppDataV1 {
  return {
    version: 1,
    settings: { locale: 'ru-RU', currency: 'RUB' },
    tasks: [],
    money: {
      transactions: [],
      categories: ['Еда', 'Транспорт', 'Дом', 'Здоровье', 'Развлечения', 'Подписки', 'Прочее', 'Зарплата'],
    },
    workouts: [],
  }
}

