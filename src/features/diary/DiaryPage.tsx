import { useMemo, useState } from 'react'
import type { DiaryEntry } from '../../lib/appData'
import { todayISO } from '../../lib/ids'

type Props = {
  diary: DiaryEntry[]
  onChange: (diary: DiaryEntry[]) => void
}

export function DiaryPage({ diary, onChange }: Props) {
  const [selectedDate, setSelectedDate] = useState(todayISO())

  // Sort diary entries by date (newest first)
  const sortedDiary = useMemo(() => {
    return [...diary].sort((a, b) => b.date.localeCompare(a.date))
  }, [diary])

  return (
    <div className="pageContainer">
      <div className="grid2">
        {/* Date selector and current entry */}
        <section className="card">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">Дневник</div>
              <div className="muted" style={{ fontSize: 12 }}>
                Записывайте свои мысли и события дня
              </div>
            </div>
          </div>

          <div className="field">
            <div className="label">Выберите дату</div>
            <input
              type="date"
              className="input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <DiaryEditor
            date={selectedDate}
            diary={diary}
            onChange={onChange}
          />
        </section>

        {/* Diary entries list */}
        <section className="card">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">Записи</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {sortedDiary.length} записей
              </div>
            </div>
          </div>

          <div className="list" aria-label="Список записей дневника">
            {sortedDiary.length === 0 ? (
              <div className="muted">Пока нет записей. Выберите дату и начните писать.</div>
            ) : (
              sortedDiary.map((entry) => (
                <div
                  key={entry.id}
                  className={`item ${entry.date === selectedDate ? 'itemSelected' : ''}`}
                  onClick={() => setSelectedDate(entry.date)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="itemTop">
                    <div className="itemTitle">
                      {new Date(entry.date).toLocaleDateString('ru-RU', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    {entry.mood && (
                      <div className="pill" style={{ fontSize: 11 }}>
                        {entry.mood === 'great' && '😊'}
                        {entry.mood === 'good' && '🙂'}
                        {entry.mood === 'okay' && '😐'}
                        {entry.mood === 'bad' && '😞'}
                        {entry.mood === 'terrible' && '😢'}
                      </div>
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {entry.content.length > 100
                      ? `${entry.content.substring(0, 100)}...`
                      : entry.content || 'Пустая запись'
                    }
                  </div>
                  {entry.tags.length > 0 && (
                    <div className="row" style={{ marginTop: 8, flexWrap: 'wrap', gap: 4 }}>
                      {entry.tags.map((tag, index) => (
                        <span key={index} className="pill" style={{ fontSize: 10, padding: '2px 6px' }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
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
          rows={6}
        />
      </div>

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
        <div className="label">Теги (через запятую)</div>
        <input
          className="input"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="#работа, #семья, #здоровье"
        />
      </div>

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
        <button
          className="btn btnPrimary"
          onClick={saveEntry}
          disabled={!content.trim() && !mood && !tags.trim()}
        >
          {existingEntry ? 'Обновить' : 'Сохранить'}
        </button>

        {existingEntry && (
          <button
            className="btn btnDanger"
            onClick={deleteEntry}
            title="Удалить запись"
          >
            Удалить
          </button>
        )}
      </div>
    </div>
  )
}