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

export type Account = {
  id: string
  name: string
  balance: number // current balance in major units
  includeInTotal: boolean // whether to include in total balance calculation
  createdAt: string
  updatedAt: string
}

export type MoneyTransaction = {
  id: string
  date: string // YYYY-MM-DD
  type: MoneyTxType
  amount: number // in major units, e.g. RUB
  category: string
  accountId?: string // optional, for transactions tied to specific accounts
  note?: string
  createdAt: string
  updatedAt: string
}

export type MoneyData = {
  transactions: MoneyTransaction[]
  categories: string[]
  accounts: Account[]
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

export type DiaryEntry = {
  id: string
  date: string // YYYY-MM-DD
  content: string
  mood?: 'great' | 'good' | 'okay' | 'bad' | 'terrible'
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type CalendarEvent = {
  id: string
  title: string
  date: string // YYYY-MM-DD
  time?: string // HH:MM format, optional
  duration?: number // in minutes, optional
  description?: string
  location?: string
  color?: string // hex color for display
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type Note = {
  id: string
  title: string
  content: string // markdown content
  folder?: string // optional folder path
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type NoteFolder = {
  id: string
  name: string
  path: string // full path like "work/projects"
  parentId?: string // ID of parent folder, undefined for root folders
  level: number // nesting level (0 = root)
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
  diary: DiaryEntry[]
  events: CalendarEvent[]
  notes: Note[]
  noteFolders: NoteFolder[]
}

export const APP_DATA_LS_KEY = 'pa.data.v1'

export function createEmptyAppDataV1(): AppDataV1 {
  const now = new Date().toISOString()
  return {
    version: 1,
    settings: { locale: 'ru-RU', currency: 'RUB' },
    tasks: [],
    money: {
      transactions: [],
      categories: ['Еда', 'Транспорт', 'Дом', 'Здоровье', 'Развлечения', 'Подписки', 'Прочее', 'Зарплата'],
      accounts: [{
        id: 'default',
        name: 'Основной счёт',
        balance: 0,
        includeInTotal: true,
        createdAt: now,
        updatedAt: now,
      }],
    },
    workouts: [],
    diary: [],
    events: [],
    notes: [],
    noteFolders: [],
  }
}

