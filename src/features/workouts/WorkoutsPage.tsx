import { useMemo, useState } from 'react'
import type { WorkoutExercise, WorkoutSession, WorkoutSet } from '../../lib/appData'
import { todayISO, uid } from '../../lib/ids'

type Props = {
  workouts: WorkoutSession[]
  onChange: (workouts: WorkoutSession[]) => void
}

function emptyExercise(): WorkoutExercise {
  return { name: '', sets: [{ reps: 10, weight: 0 }] }
}

function parseNum(v: string) {
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function WorkoutsPage({ workouts, onChange }: Props) {
  const [date, setDate] = useState(todayISO())
  const [title, setTitle] = useState('Тренировка')
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<WorkoutExercise[]>([emptyExercise()])
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = workouts.slice().sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
    if (!needle) return list
    return list.filter((w) => {
      if (w.title.toLowerCase().includes(needle)) return true
      if ((w.notes ?? '').toLowerCase().includes(needle)) return true
      return w.exercises.some((e) => e.name.toLowerCase().includes(needle))
    })
  }, [workouts, q])

  const prs = useMemo(() => {
    const best = new Map<string, number>() // exercise -> best estimated 1RM (Epley)
    for (const w of workouts) {
      for (const e of w.exercises) {
        let bestForExercise = best.get(e.name) ?? 0
        for (const s of e.sets) {
          const e1rm = s.weight * (1 + s.reps / 30)
          if (e1rm > bestForExercise) bestForExercise = e1rm
        }
        best.set(e.name, bestForExercise)
      }
    }
    return [...best.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [workouts])

  return (
    <div className="pageContainer">
      <div className="grid2">
      <section className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Дневник тренировок</div>
            <div className="muted" style={{ fontSize: 12 }}>Сессии + упражнения + подходы. Без усложнений.</div>
          </div>
        </div>

        <div className="field">
          <div className="label">Поиск по истории</div>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="присед, жим, кардио…" />
        </div>

        <hr className="hr" />

        <div className="grid2">
          <div className="item">
            <div className="itemTop">
              <div className="itemTitle">Последние тренировки</div>
              <span className="pill">{filtered.length}</span>
            </div>
            {filtered.length === 0 ? (
              <div className="muted">История пуста.</div>
            ) : (
              <div className="list">
                {filtered.slice(0, 10).map((w) => (
                  <div key={w.id} className="item">
                    <div className="itemTop">
                      <div className="row">
                        <span className="pill">{w.date}</span>
                        <span className="pill">{w.title}</span>
                        <span className="pill">{w.exercises.length} упр.</span>
                      </div>
                      <button className="btn btnDanger" type="button" onClick={() => onChange(workouts.filter((x) => x.id !== w.id))}>
                        Удалить
                      </button>
                    </div>
                    <div className="itemMeta">
                      {w.exercises.slice(0, 4).map((e) => (
                        <span key={e.name} className="pill">
                          {e.name || 'Без названия'}
                        </span>
                      ))}
                      {w.exercises.length > 4 ? <span className="pill">…</span> : null}
                    </div>
                    {w.notes ? <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>{w.notes}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="item">
            <div className="itemTop">
              <div className="itemTitle">PR (оценка 1RM, топ)</div>
            </div>
            {prs.length === 0 ? (
              <div className="muted">PR появятся после первых записей.</div>
            ) : (
              <div className="list">
                {prs.map(([name, e1rm]) => (
                  <div key={name} className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="pill">{name}</span>
                    <span className="pill">{Math.round(e1rm)} кг</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Новая тренировка</div>
            <div className="muted" style={{ fontSize: 12 }}>Заполни по факту — подходы можно быстро добавлять.</div>
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <div className="label">Дата</div>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Название</div>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ноги / Верх / Кардио…" />
          </div>
        </div>

        <div className="field">
          <div className="label">Заметки</div>
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="самочувствие, пульс, техника…" />
        </div>

        <hr className="hr" />

        <div className="cardHeader" style={{ marginBottom: 8 }}>
          <div className="cardTitle">Упражнения</div>
          <button className="btn" type="button" onClick={() => setExercises([...exercises, emptyExercise()])}>
            + Упражнение
          </button>
        </div>

        <div className="list">
          {exercises.map((e, ei) => (
            <div key={ei} className="item">
              <div className="itemTop">
                <input
                  className="input"
                  value={e.name}
                  onChange={(ev) => {
                    const next = exercises.slice()
                    next[ei] = { ...e, name: ev.target.value }
                    setExercises(next)
                  }}
                  placeholder="Название упражнения"
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btnDanger"
                  type="button"
                  onClick={() => setExercises(exercises.filter((_, idx) => idx !== ei))}
                  title="Удалить упражнение"
                >
                  Удалить
                </button>
              </div>

              <div className="list">
                {e.sets.map((s, si) => (
                  <div key={si} className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="pill">Подход {si + 1}</span>
                    <div className="row">
                      <input
                        className="input"
                        value={String(s.reps)}
                        onChange={(ev) => {
                          const next = exercises.slice()
                          const sets = next[ei].sets.slice()
                          const updated: WorkoutSet = { ...s, reps: Math.max(0, Math.round(parseNum(ev.target.value))) }
                          sets[si] = updated
                          next[ei] = { ...next[ei], sets }
                          setExercises(next)
                        }}
                        placeholder="reps"
                        style={{ width: 88 }}
                        inputMode="numeric"
                      />
                      <input
                        className="input"
                        value={String(s.weight)}
                        onChange={(ev) => {
                          const next = exercises.slice()
                          const sets = next[ei].sets.slice()
                          const updated: WorkoutSet = { ...s, weight: Math.max(0, parseNum(ev.target.value)) }
                          sets[si] = updated
                          next[ei] = { ...next[ei], sets }
                          setExercises(next)
                        }}
                        placeholder="kg"
                        style={{ width: 88 }}
                        inputMode="decimal"
                      />
                      <button
                        className="btn btnDanger"
                        type="button"
                        onClick={() => {
                          const next = exercises.slice()
                          const sets = next[ei].sets.filter((_, idx) => idx !== si)
                          next[ei] = { ...next[ei], sets: sets.length ? sets : [{ reps: 10, weight: 0 }] }
                          setExercises(next)
                        }}
                        title="Удалить подход"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="row" style={{ justifyContent: 'space-between' }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    const next = exercises.slice()
                    const sets = next[ei].sets.slice()
                    sets.push({ reps: sets[sets.length - 1]?.reps ?? 10, weight: sets[sets.length - 1]?.weight ?? 0 })
                    next[ei] = { ...next[ei], sets }
                    setExercises(next)
                  }}
                >
                  + Подход
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setDate(todayISO())
              setTitle('Тренировка')
              setNotes('')
              setExercises([emptyExercise()])
            }}
          >
            Очистить
          </button>

          <button
            className="btn btnPrimary"
            type="button"
            onClick={() => {
              const cleanExercises = exercises
                .map((ex) => ({
                  ...ex,
                  name: ex.name.trim(),
                  sets: ex.sets.filter((s) => s.reps > 0 || s.weight > 0),
                }))
                .filter((ex) => ex.name || ex.sets.length)
              if (!cleanExercises.length) return
              const now = new Date().toISOString()
              const w: WorkoutSession = {
                id: uid('wo'),
                date,
                title: title.trim() || 'Тренировка',
                notes: notes.trim() ? notes.trim() : undefined,
                exercises: cleanExercises.map((ex) => ({ ...ex, sets: ex.sets.length ? ex.sets : [{ reps: 10, weight: 0 }] })),
                createdAt: now,
                updatedAt: now,
              }
              onChange([w, ...workouts])
              setNotes('')
              setExercises([emptyExercise()])
            }}
          >
            Сохранить
          </button>
        </div>
      </aside>
    </div>
    </div>
  )
}

