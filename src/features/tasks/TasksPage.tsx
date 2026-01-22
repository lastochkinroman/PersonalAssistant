import { useMemo, useState } from 'react'
import type { Task } from '../../lib/appData'
import { todayISO, uid } from '../../lib/ids'

type Props = {
  tasks: Task[]
  onChange: (tasks: Task[]) => void
}

type Filter = 'all' | 'open' | 'done'

function priorityLabel(p: Task['priority']) {
  if (p === 'high') return 'Высокий'
  if (p === 'med') return 'Средний'
  return 'Низкий'
}

export function TasksPage({ tasks, onChange }: Props) {
  const [filter, setFilter] = useState<Filter>('open')
  const [q, setQ] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('med')
  const [dueDate, setDueDate] = useState<string>(todayISO())
  const [tags, setTags] = useState<string>('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return tasks
      .filter((t) => {
        if (filter === 'open') return !t.done
        if (filter === 'done') return t.done
        return true
      })
      .filter((t) => {
        if (!needle) return true
        return (
          t.title.toLowerCase().includes(needle) ||
          (t.notes ?? '').toLowerCase().includes(needle) ||
          t.tags.join(' ').toLowerCase().includes(needle)
        )
      })
      .slice()
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1
        const ad = a.dueDate ?? '9999-12-31'
        const bd = b.dueDate ?? '9999-12-31'
        if (ad !== bd) return ad.localeCompare(bd)
        return b.updatedAt.localeCompare(a.updatedAt)
      })
  }, [tasks, filter, q])

  const stats = useMemo(() => {
    const total = tasks.length
    const doneCount = tasks.filter((t) => t.done).length
    const openCount = total - doneCount
    return { total, doneCount, openCount }
  }, [tasks])

  return (
    <div className="pageContainer">
      <div className="grid2">
      <section className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Задачи</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {stats.openCount} открыто · {stats.doneCount} выполнено · {stats.total} всего
            </div>
          </div>
          <div className="row">
            <span className="pill">Фильтр</span>
            <select className="select" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="open">Открытые</option>
              <option value="done">Выполненные</option>
              <option value="all">Все</option>
            </select>
          </div>
        </div>

        <div className="field">
          <div className="label">Поиск</div>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="текст, тег, заметка…" />
        </div>

        <hr className="hr" />

        <div className="list" aria-label="Список задач">
          {filtered.length === 0 ? (
            <div className="muted">Пока пусто. Добавь первую задачу справа.</div>
          ) : (
            filtered.map((t) => (
              <div key={t.id} className="item">
                <div className="itemTop">
                  <div className="row" style={{ gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => {
                        const now = new Date().toISOString()
                        onChange(tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done, updatedAt: now } : x)))
                      }}
                      aria-label="Выполнено"
                    />
                    <div className="itemTitle" style={{ textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.75 : 1 }}>
                      {t.title}
                    </div>
                  </div>

                  <div className="row">
                    <button
                      className="btn btnDanger"
                      type="button"
                      onClick={() => onChange(tasks.filter((x) => x.id !== t.id))}
                    >
                      Удалить
                    </button>
                  </div>
                </div>

                <div className="itemMeta">
                  <span className="pill">Приоритет: {priorityLabel(t.priority)}</span>
                  {t.dueDate ? <span className="pill">Дедлайн: {t.dueDate}</span> : null}
                  {t.tags.map((tag) => (
                    <span key={tag} className="pill">
                      #{tag}
                    </span>
                  ))}
                </div>

                {t.notes ? <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>{t.notes}</div> : null}
              </div>
            ))
          )}
        </div>
      </section>

      <aside className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Новая задача</div>
            <div className="muted" style={{ fontSize: 12 }}>Быстро добавь и вернись к делу.</div>
          </div>
        </div>

        <div className="field">
          <div className="label">Название</div>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: созвон в 15:00" />
        </div>

        <div className="field">
          <div className="label">Заметка</div>
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="контекст, ссылки, чеклист…" />
        </div>

        <div className="grid2">
          <div className="field">
            <div className="label">Приоритет</div>
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])}>
              <option value="low">Низкий</option>
              <option value="med">Средний</option>
              <option value="high">Высокий</option>
            </select>
          </div>
          <div className="field">
            <div className="label">Дедлайн</div>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <div className="label">Теги (через запятую)</div>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="работа, здоровье, дом" />
        </div>

        <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setTitle('')
              setNotes('')
              setTags('')
              setPriority('med')
              setDueDate(todayISO())
            }}
          >
            Очистить
          </button>

          <button
            className="btn btnPrimary"
            type="button"
            onClick={() => {
              const trimmed = title.trim()
              if (!trimmed) return
              const now = new Date().toISOString()
              const newTask: Task = {
                id: uid('task'),
                title: trimmed,
                notes: notes.trim() ? notes.trim() : undefined,
                done: false,
                priority,
                dueDate: dueDate || undefined,
                tags: tags
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean)
                  .map((x) => x.replace(/^#/, '')),
                createdAt: now,
                updatedAt: now,
              }
              onChange([newTask, ...tasks])
              setTitle('')
              setNotes('')
              setTags('')
            }}
          >
            Добавить
          </button>
        </div>
      </aside>
    </div>
    </div>
  )
}

