import type { AppDataV1 } from './appData'
import type { DailyContext } from './api-types'
import { todayISO } from './ids'

export function collectDailyContext(data: AppDataV1, date?: string): any {
  const targetDate = date || todayISO()
  
  // Фильтруем данные по дате (сегодня по умолчанию)
  const tasks = data.tasks.filter(task => {
    if (!task.dueDate) return false
    return task.dueDate.startsWith(targetDate)
  })

  const workouts = data.workouts.filter(workout => 
    workout.date === targetDate
  )

  const money = data.money.transactions.filter(transaction =>
    transaction.date === targetDate
  )

  const diary = data.diary.filter(entry =>
    entry.date === targetDate
  )

  const events = data.events.filter(event =>
    event.date === targetDate
  )

  // Для заметок берем последние 10 за сегодня
  const notes = data.notes
    .filter(note => {
      const noteDate = new Date(note.createdAt).toISOString().split('T')[0]
      return noteDate === targetDate
    })
    .slice(0, 10)

  // Создаем контекст, совместимый с бэкендом
  // Используем 'finances' вместо 'money' для совместимости
  const context = {
    date: targetDate,
    tasks: tasks.map(task => ({
      id: task.id,
      title: task.title,
      notes: task.notes,
      completed: task.done, // Используем completed вместо done
      priority: task.priority,
      tags: task.tags || [],
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    })),
    finances: money.map(transaction => ({ // Используем finances вместо money
      id: transaction.id,
      date: transaction.date,
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      accountId: transaction.accountId,
      note: transaction.note,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    })),
    workouts: workouts.map(workout => ({
      id: workout.id,
      date: workout.date,
      title: workout.title,
      notes: workout.notes,
      exercises: workout.exercises.map(exercise => ({
        name: exercise.name,
        weight: exercise.sets[0]?.weight || 0,
        reps: exercise.sets[0]?.reps || 0,
        sets: exercise.sets.length
      })),
      createdAt: workout.createdAt,
      updatedAt: workout.updatedAt
    })),
    diary: diary.map(entry => ({
      id: entry.id,
      date: entry.date,
      content: entry.content,
      mood: entry.mood,
      tags: entry.tags || [],
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    })),
    events: events.map(event => ({
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
      duration: event.duration,
      description: event.description,
      location: event.location,
      color: event.color,
      tags: event.tags || [],
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    })),
    notes: notes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      folder: note.folder,
      tags: note.tags || [],
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    }))
  }

  return context
}

export function collectContextForDateRange(data: AppDataV1, days: number = 7): DailyContext[] {
  const contexts: DailyContext[] = []
  const today = new Date()
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    contexts.push(collectDailyContext(data, dateStr))
  }
  
  return contexts
}