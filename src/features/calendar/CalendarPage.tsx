import { useMemo, useState } from 'react'
import type { Task, MoneyData, WorkoutSession, DiaryEntry, AppSettings } from '../../lib/appData'
import { todayISO } from '../../lib/ids'

type Props = {
  tasks: Task[]
  onTasksChange: (tasks: Task[]) => void
  money: MoneyData
  onMoneyChange: (money: MoneyData) => void
  workouts: WorkoutSession[]
  onWorkoutsChange: (workouts: WorkoutSession[]) => void
  diary: DiaryEntry[]
  onDiaryChange: (diary: DiaryEntry[]) => void
  settings: AppSettings
}

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: Date[] = []

  // Add padding days from previous month
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  for (let d = new Date(startDate); d <= lastDay; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d))
  }

  return days
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isSameMonth(date: Date, currentMonth: { year: number; month: number }): boolean {
  return date.getFullYear() === currentMonth.year && date.getMonth() === currentMonth.month
}

export function CalendarPage({
  tasks,
  onTasksChange,
  money,
  workouts,
  diary,
  onDiaryChange,
  settings,
}: Props) {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const days = useMemo(() => getDaysInMonth(currentDate.year, currentDate.month), [currentDate])

  const dayData = useMemo(() => {
    const map = new Map<string, {
      tasks: Task[]
      transactions: typeof money.transactions
      workouts: WorkoutSession[]
      diaryEntry?: DiaryEntry
    }>()

    // Tasks
    for (const task of tasks) {
      if (!task.dueDate) continue
      const existing = map.get(task.dueDate) || { tasks: [], transactions: [], workouts: [] }
      existing.tasks.push(task)
      map.set(task.dueDate, existing)
    }

    // Transactions
    for (const tx of money.transactions) {
      const existing = map.get(tx.date) || { tasks: [], transactions: [], workouts: [] }
      existing.transactions.push(tx)
      map.set(tx.date, existing)
    }

    // Workouts
    for (const workout of workouts) {
      const existing = map.get(workout.date) || { tasks: [], transactions: [], workouts: [] }
      existing.workouts.push(workout)
      map.set(workout.date, existing)
    }

    // Diary
    for (const entry of diary) {
      const existing = map.get(entry.date) || { tasks: [], transactions: [], workouts: [] }
      existing.diaryEntry = entry
      map.set(entry.date, existing)
    }

    return map
  }, [tasks, money.transactions, workouts, diary])

  const selectedDayData = selectedDate ? dayData.get(selectedDate) : null

  const fmt = useMemo(() => {
    try {
      return new Intl.NumberFormat(settings.locale, { style: 'currency', currency: settings.currency, maximumFractionDigits: 2 })
    } catch {
      return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })
    }
  }, [settings.currency, settings.locale])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newMonth = direction === 'next' ? prev.month + 1 : prev.month - 1
      const newYear = newMonth > 11 ? prev.year + 1 : newMonth < 0 ? prev.year - 1 : prev.year
      const normalizedMonth = newMonth > 11 ? 0 : newMonth < 0 ? 11 : newMonth
      return { year: newYear, month: normalizedMonth }
    })
  }

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ]

  return (
    <div className="grid2">
      <section className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Календарь</div>
            <div className="muted" style={{ fontSize: 12 }}>
              Обзор задач, финансов, тренировок и дневника по датам
            </div>
          </div>
          <div className="row">
            <button className="btn" onClick={() => navigateMonth('prev')}>&lt;</button>
            <span className="pill">
              {monthNames[currentDate.month]} {currentDate.year}
            </span>
            <button className="btn" onClick={() => navigateMonth('next')}>&gt;</button>
          </div>
        </div>

        <div className="calendar">
          {/* Day headers */}
          <div className="calendarHeader">
            {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map(day => (
              <div key={day} className="calendarDayHeader">{day}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="calendarGrid">
            {days.map((date, index) => {
              const dateStr = formatDate(date)
              const data = dayData.get(dateStr)
              const isToday = dateStr === todayISO()
              const isSelected = selectedDate === dateStr
              const isCurrentMonth = isSameMonth(date, currentDate)

              return (
                <div
                  key={index}
                  className={`calendarDay ${!isCurrentMonth ? 'calendarDayOtherMonth' : ''} ${
                    isToday ? 'calendarDayToday' : ''
                  } ${isSelected ? 'calendarDaySelected' : ''}`}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                >
                  <div className="calendarDayNumber">{date.getDate()}</div>
                  {data && (
                    <div className="calendarDayContent">
                      {data.tasks.length > 0 && (
                        <div className="calendarIndicator calendarIndicatorTasks">
                          {data.tasks.length}
                        </div>
                      )}
                      {data.transactions.length > 0 && (
                        <div className="calendarIndicator calendarIndicatorMoney">
                          {data.transactions.length}
                        </div>
                      )}
                      {data.workouts.length > 0 && (
                        <div className="calendarIndicator calendarIndicatorWorkouts">
                          {data.workouts.length}
                        </div>
                      )}
                      {data.diaryEntry && (
                        <div className="calendarIndicator calendarIndicatorDiary">
                          Д
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <aside className="card">
        {selectedDate ? (
          <>
            <div className="cardHeader">
              <div className="cardTitle">
                {new Date(selectedDate).toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>

            {/* Diary section */}
            <div className="field">
              <div className="label">Дневник</div>
              <DiaryEditor
                date={selectedDate}
                diary={diary}
                onChange={onDiaryChange}
              />
            </div>

            <hr className="hr" />

            {/* Tasks for selected date */}
            {selectedDayData?.tasks && selectedDayData.tasks.length > 0 && (
              <div className="field">
                <div className="label">Задачи ({selectedDayData.tasks.length})</div>
                <div className="list">
                  {selectedDayData.tasks.map(task => (
                    <div key={task.id} className="item">
                      <div className="itemTop">
                        <div className="row">
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={() => {
                              const now = new Date().toISOString()
                              onTasksChange(tasks.map(t =>
                                t.id === task.id ? { ...t, done: !t.done, updatedAt: now } : t
                              ))
                            }}
                          />
                          <div className={`itemTitle ${task.done ? 'done' : ''}`}>
                            {task.title}
                          </div>
                        </div>
                      </div>
                      {task.notes && <div className="muted">{task.notes}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transactions for selected date */}
            {selectedDayData?.transactions && selectedDayData.transactions.length > 0 && (
              <div className="field">
                <div className="label">Финансы ({selectedDayData.transactions.length})</div>
                <div className="list">
                  {selectedDayData.transactions.map(tx => (
                    <div key={tx.id} className="item">
                      <div className="itemTop">
                        <span className="pill">{tx.category}</span>
                        <span className="pill" style={{
                          color: tx.type === 'income' ? '#10b981' : '#ef4444'
                        }}>
                          {tx.type === 'income' ? '+' : '-'}{fmt.format(tx.amount)}
                        </span>
                      </div>
                      {tx.note && <div className="muted">{tx.note}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Workouts for selected date */}
            {selectedDayData?.workouts && selectedDayData.workouts.length > 0 && (
              <div className="field">
                <div className="label">Тренировки ({selectedDayData.workouts.length})</div>
                <div className="list">
                  {selectedDayData.workouts.map(workout => (
                    <div key={workout.id} className="item">
                      <div className="itemTop">
                        <span className="pill">{workout.title}</span>
                        <span className="pill">{workout.exercises.length} упр.</span>
                      </div>
                      {workout.notes && <div className="muted">{workout.notes}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="cardHeader">
            <div className="cardTitle">Выберите дату</div>
            <div className="muted" style={{ fontSize: 12 }}>
              Нажмите на день в календаре, чтобы увидеть детали и дневник
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

type DiaryEditorProps = {
  date: string
  diary: DiaryEntry[]
  onChange: (diary: DiaryEntry[]) => void
}

function DiaryEditor({ date, diary, onChange }: DiaryEditorProps) {
  const existingEntry = diary.find(entry => entry.date === date)
  const [content, setContent] = useState(existingEntry?.content || '')
  const [mood, setMood] = useState<DiaryEntry['mood']>(existingEntry?.mood)
  const [tags, setTags] = useState(existingEntry?.tags.join(', ') || '')

  const saveEntry = () => {
    const now = new Date().toISOString()
    const cleanTags = tags.split(',').map(t => t.trim()).filter(Boolean)

    if (existingEntry) {
      // Update existing
      onChange(diary.map(entry =>
        entry.id === existingEntry.id
          ? { ...entry, content, mood, tags: cleanTags, updatedAt: now }
          : entry
      ))
    } else if (content.trim()) {
      // Create new
      const newEntry: DiaryEntry = {
        id: `diary-${Date.now()}`,
        date,
        content: content.trim(),
        mood,
        tags: cleanTags,
        createdAt: now,
        updatedAt: now,
      }
      onChange([...diary, newEntry])
    }
  }

  const deleteEntry = () => {
    if (existingEntry) {
      onChange(diary.filter(entry => entry.id !== existingEntry.id))
      setContent('')
      setMood(undefined)
      setTags('')
    }
  }

  return (
    <div className="diaryEditor">
      <div className="field">
        <textarea
          className="textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Как прошёл день? Что произошло интересного?"
          rows={4}
        />
      </div>

      <div className="grid2">
        <div className="field">
          <div className="label">Настроение</div>
          <select
            className="select"
            value={mood || ''}
            onChange={(e) => setMood(e.target.value as DiaryEntry['mood'] || undefined)}
          >
            <option value="">Не указано</option>
            <option value="great">Отличное 😊</option>
            <option value="good">Хорошее 🙂</option>
            <option value="okay">Нормальное 😐</option>
            <option value="bad">Плохое 😞</option>
            <option value="terrible">Ужасное 😢</option>
          </select>
        </div>

        <div className="field">
          <div className="label">Теги</div>
          <input
            className="input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="работа, здоровье, семья"
          />
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
        <button
          className="btn"
          onClick={deleteEntry}
          disabled={!existingEntry}
        >
          Удалить
        </button>
        <button
          className="btn btnPrimary"
          onClick={saveEntry}
          disabled={!content.trim() && !existingEntry}
        >
          Сохранить
        </button>
      </div>
    </div>
  )
}