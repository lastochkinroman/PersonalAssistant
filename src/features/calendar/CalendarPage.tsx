import { useMemo, useState } from 'react'
import type { Task, MoneyData, WorkoutSession, CalendarEvent, AppSettings } from '../../lib/appData'
import { todayISO, uid } from '../../lib/ids'
import { exportJson } from '../../lib/jsonIO'

type Props = {
  tasks: Task[]
  onTasksChange: (tasks: Task[]) => void
  money: MoneyData
  onMoneyChange: (money: MoneyData) => void
  workouts: WorkoutSession[]
  onWorkoutsChange: (workouts: WorkoutSession[]) => void
  events: CalendarEvent[]
  onEventsChange: (events: CalendarEvent[]) => void
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
  events,
  onEventsChange,
  settings,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const days = useMemo(() => getDaysInMonth(currentMonth.year, currentMonth.month), [currentMonth])

  const dayData = useMemo(() => {
    const map = new Map<string, {
      tasks: Task[]
      transactions: typeof money.transactions
      workouts: WorkoutSession[]
      events: CalendarEvent[]
    }>()

    // Tasks
    for (const task of tasks) {
      if (task.dueDate) {
        const existing = map.get(task.dueDate) || { tasks: [], transactions: [], workouts: [], events: [] }
        existing.tasks.push(task)
        map.set(task.dueDate, existing)
      }
    }

    // Transactions
    for (const tx of money.transactions) {
      const existing = map.get(tx.date) || { tasks: [], transactions: [], workouts: [], events: [] }
      existing.transactions.push(tx)
      map.set(tx.date, existing)
    }

    // Workouts
    for (const workout of workouts) {
      const existing = map.get(workout.date) || { tasks: [], transactions: [], workouts: [], events: [] }
      existing.workouts.push(workout)
      map.set(workout.date, existing)
    }

    // Events
    for (const event of events) {
      const existing = map.get(event.date) || { tasks: [], transactions: [], workouts: [], events: [] }
      existing.events.push(event)
      map.set(event.date, existing)
    }

    return map
  }, [tasks, money, workouts, events])

  const selectedDayData = selectedDate ? dayData.get(selectedDate) : null

  const fmt = useMemo(() => {
    try {
      return new Intl.NumberFormat(settings.locale, { style: 'currency', currency: settings.currency, maximumFractionDigits: 2 })
    } catch {
      return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })
    }
  }, [settings.currency, settings.locale])

  const exportDayData = () => {
    if (!selectedDate || !selectedDayData) return

    const transactionsWithAccounts = selectedDayData.transactions.map(tx => ({
      ...tx,
      account: money.accounts.find(acc => acc.id === tx.accountId)?.name || 'Неизвестный счёт'
    }))

    const dayData = {
      date: selectedDate,
      exportedAt: new Date().toISOString(),
      tasks: selectedDayData.tasks,
      transactions: transactionsWithAccounts,
      workouts: selectedDayData.workouts,
      events: selectedDayData.events,
      summary: {
        tasksCount: selectedDayData.tasks.length,
        transactionsCount: selectedDayData.transactions.length,
        workoutsCount: selectedDayData.workouts.length,
        eventsCount: selectedDayData.events.length
      }
    }

    const filename = `day-export-${selectedDate}.json`
    exportJson(dayData, filename)
  }

  return (
    <div className="pageContainer">
      <div className="grid2">
        {/* Calendar */}
        <section className="card">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">Календарь</div>
              <div className="muted" style={{ fontSize: 12 }}>
                Обзор задач, финансов, тренировок и мероприятий по датам
              </div>
            </div>
            <div className="row">
              <span className="pill">Месяц</span>
              <input
                className="input"
                type="month"
                value={`${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-').map(Number)
                  setCurrentMonth({ year, month: month - 1 })
                }}
              />
            </div>
          </div>

          <div className="calendar">
            <div className="calendarHeader">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                <div key={day} className="calendarDayHeader">{day}</div>
              ))}
            </div>
            <div className="calendarGrid">
              {days.map((date, index) => {
                const dateStr = formatDate(date)
                const data = dayData.get(dateStr)
                const isCurrentMonth = isSameMonth(date, currentMonth)
                const isToday = dateStr === todayISO()
                const isSelected = selectedDate === dateStr

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
                        {data.events.length > 0 && (
                          <div className="calendarIndicator calendarIndicatorEvents">
                            {data.events.length}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {selectedDayData && (
            selectedDayData.tasks.length > 0 ||
            selectedDayData.transactions.length > 0 ||
            selectedDayData.workouts.length > 0
          ) && (
            <button
              className="btn btnGhost"
              onClick={exportDayData}
              title="Экспортировать все данные за этот день"
            >
              Экспорт дня
            </button>
          )}
        </section>

        {/* Day details */}
        <section className="card">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString('ru-RU', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Выберите день'
                }
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {selectedDayData
                  ? `${selectedDayData.tasks.length} задач · ${selectedDayData.transactions.length} операций · ${selectedDayData.workouts.length} тренировок · ${selectedDayData.events.length} мероприятий`
                  : 'Нажмите на день в календаре, чтобы увидеть детали'
                }
              </div>
            </div>
          </div>

          {!selectedDayData ? null : (
            <>
              {/* Tasks section */}
              {selectedDayData.tasks.length > 0 && (
                <div className="field">
                  <div className="label">Задачи</div>
                  <div className="list">
                    {selectedDayData.tasks.map((task) => (
                      <div key={task.id} className="item">
                        <div className="itemTop">
                          <div className="itemTitle">{task.title}</div>
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={() => {
                              const updatedTasks = tasks.map(t =>
                                t.id === task.id ? { ...t, done: !t.done, updatedAt: new Date().toISOString() } : t
                              )
                              onTasksChange(updatedTasks)
                            }}
                          />
                        </div>
                        {task.notes && (
                          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                            {task.notes}
                          </div>
                        )}
                        {task.priority && (
                          <div className="pill" style={{ fontSize: 10, marginTop: 4 }}>
                            {task.priority === 'high' ? 'Высокий' :
                             task.priority === 'med' ? 'Средний' : 'Низкий'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions section */}
              {selectedDayData.transactions.length > 0 && (
                <div className="field">
                  <div className="label">Финансы</div>
                  <div className="list">
                    {selectedDayData.transactions.map((tx, index) => {
                      const account = money.accounts.find(acc => acc.id === tx.accountId)
                      return (
                        <div key={index} className="item">
                          <div className="itemTop">
                            <div className="itemTitle">
                              {tx.type === 'income' ? '+' : '-'}{fmt.format(tx.amount)}
                            </div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {account?.name || 'Неизвестный счёт'}
                            </div>
                          </div>
                          {tx.category && (
                            <div className="pill" style={{ fontSize: 10, marginTop: 4 }}>
                              {tx.category}
                            </div>
                          )}
                          {tx.note && (
                            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                              {tx.note}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Workouts section */}
              {selectedDayData.workouts.length > 0 && (
                <div className="field">
                  <div className="label">Тренировки</div>
                  <div className="list">
                    {selectedDayData.workouts.map((workout) => (
                      <div key={workout.id} className="item">
                        <div className="itemTop">
                          <div className="itemTitle">{workout.title}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {workout.exercises.length} упражнений
                          </div>
                        </div>
                        {workout.notes && (
                          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                            {workout.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Events section */}
              <div className="field">
                <div className="label">Мероприятия</div>

                {/* Existing events */}
                {selectedDayData.events.length > 0 && (
                  <div className="list" style={{ marginBottom: 12 }}>
                    {selectedDayData.events.map((event) => (
                      <div key={event.id} className="item">
                        <div className="itemTop">
                          <div className="itemTitle">{event.title}</div>
                          {event.time && (
                            <div className="muted" style={{ fontSize: 12 }}>
                              {event.time}
                            </div>
                          )}
                        </div>
                        {event.description && (
                          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                            {event.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                          {event.location && (
                            <div className="pill" style={{ fontSize: 10 }}>
                              📍 {event.location}
                            </div>
                          )}
                          {event.duration && (
                            <div className="pill" style={{ fontSize: 10 }}>
                              ⏱️ {event.duration} мин
                            </div>
                          )}
                        </div>
                        {event.tags.length > 0 && (
                          <div className="row" style={{ marginTop: 8, flexWrap: 'wrap', gap: 4 }}>
                            {event.tags.map((tag, index) => (
                              <span key={index} className="pill" style={{ fontSize: 10, padding: '2px 6px' }}>
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </>
          )}

          {/* Event editor - always show when date is selected */}
          {selectedDate && (
            <div className="field">
              <div className="label">Мероприятия</div>
              <EventEditor
                date={selectedDate}
                events={events}
                onChange={onEventsChange}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

type EventEditorProps = {
  date: string
  events: CalendarEvent[]
  onChange: (events: CalendarEvent[]) => void
}

function EventEditor({ date, events, onChange }: EventEditorProps) {
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [color, setColor] = useState('#8b5cf6')
  const [tags, setTags] = useState('')

  const createEvent = () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    const now = new Date().toISOString()
    const cleanTags = tags.split(',').map(t => t.trim()).filter(Boolean)

    const newEvent: CalendarEvent = {
      id: uid('event'),
      title: trimmedTitle,
      date,
      time: time || undefined,
      duration: duration ? parseInt(duration) : undefined,
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      color,
      tags: cleanTags,
      createdAt: now,
      updatedAt: now,
    }

    onChange([...events, newEvent])

    // Clear form
    setTitle('')
    setTime('')
    setDuration('')
    setDescription('')
    setLocation('')
    setTags('')
  }

  return (
    <div className="eventEditor">
      <hr className="hr" />
      <div className="cardHeader" style={{ marginBottom: 8 }}>
        <div className="cardTitle">Новое мероприятие</div>
        <div className="muted" style={{ fontSize: 12 }}>Встречи, события, напоминания</div>
      </div>

      <div className="field">
        <div className="label">Название *</div>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Например: Встреча с клиентом"
        />
      </div>

      <div className="grid2">
        <div className="field">
          <div className="label">Время</div>
          <input
            className="input"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div className="field">
          <div className="label">Длительность (мин)</div>
          <input
            className="input"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="60"
            min="1"
          />
        </div>
      </div>

      <div className="field">
        <div className="label">Описание</div>
        <textarea
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Подробности мероприятия..."
          rows={2}
        />
      </div>

      <div className="grid2">
        <div className="field">
          <div className="label">Место</div>
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Офис, кафе, дом..."
          />
        </div>
        <div className="field">
          <div className="label">Цвет</div>
          <input
            className="input"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <div className="label">Теги</div>
        <input
          className="input"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="работа, личное, здоровье"
        />
      </div>

      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
        <button
          className="btn btnPrimary"
          onClick={createEvent}
          disabled={!title.trim()}
        >
          Создать мероприятие
        </button>
      </div>
    </div>
  )
}