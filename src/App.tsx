import { useMemo, useState } from 'react'
import './App.css'
import { TasksPage } from './features/tasks/TasksPage'
import { MoneyPage } from './features/money/MoneyPage'
import { WorkoutsPage } from './features/workouts/WorkoutsPage'
import { CalendarPage } from './features/calendar/CalendarPage'
import type { AppDataV1 } from './lib/appData'
import { APP_DATA_LS_KEY, createEmptyAppDataV1 } from './lib/appData'
import { exportJson, importJsonFromFile } from './lib/jsonIO'
import { usePersistentStoreState } from './lib/usePersistentStore'

type TabKey = 'tasks' | 'money' | 'workouts' | 'calendar'

export default function App() {
  const [tab, setTab, tabReady] = usePersistentStoreState<TabKey>('pa.tab', 'tasks')
  const [data, setData, dataReady] = usePersistentStoreState<AppDataV1>(
    APP_DATA_LS_KEY,
    createEmptyAppDataV1(),
  )
  const [status, setStatus] = useState<string | null>(null)
  const hydrated = tabReady && dataReady

  const content = useMemo(() => {
    switch (tab) {
      case 'tasks':
        return <TasksPage tasks={data.tasks} onChange={(tasks) => setData({ ...data, tasks })} />
      case 'money':
        return (
          <MoneyPage
            money={data.money}
            onChange={(money) => setData({ ...data, money })}
            settings={data.settings}
            onSettingsChange={(settings) => setData({ ...data, settings })}
          />
        )
      case 'workouts':
        return (
          <WorkoutsPage
            workouts={data.workouts}
            onChange={(workouts) => setData({ ...data, workouts })}
          />
        )
      case 'calendar':
        return (
          <CalendarPage
            tasks={data.tasks}
            onTasksChange={(tasks) => setData({ ...data, tasks })}
            money={data.money}
            onMoneyChange={(money) => setData({ ...data, money })}
            workouts={data.workouts}
            onWorkoutsChange={(workouts) => setData({ ...data, workouts })}
            diary={data.diary}
            onDiaryChange={(diary) => setData({ ...data, diary })}
            settings={data.settings}
          />
        )
      default:
        return null
    }
  }, [tab, data, setData])

  if (!hydrated) {
    return (
      <div className="appShell">
        <header className="topBar">
          <div className="brand">
            <div className="brandMark">PA</div>
            <div className="brandText">
              <div className="brandTitle">Личный помощник</div>
              <div className="brandSub">таски · финансы · тренировки</div>
            </div>
          </div>
        </header>
        <main className="main">
          <div className="card" style={{ textAlign: 'center' }}>
            Загружаем данные из хранилища…
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="brand">
          <div className="brandMark">PA</div>
          <div className="brandText">
            <div className="brandTitle">Личный помощник</div>
            <div className="brandSub">таски · финансы · тренировки · календарь</div>
          </div>
        </div>

        <nav className="tabs" aria-label="Разделы">
          <button
            className={tab === 'tasks' ? 'tab tabActive' : 'tab'}
            onClick={() => setTab('tasks')}
            type="button"
          >
            Задачи
          </button>
          <button
            className={tab === 'money' ? 'tab tabActive' : 'tab'}
            onClick={() => setTab('money')}
            type="button"
          >
            Деньги
          </button>
          <button
            className={tab === 'workouts' ? 'tab tabActive' : 'tab'}
            onClick={() => setTab('workouts')}
            type="button"
          >
            Тренировки
          </button>
          <button
            className={tab === 'calendar' ? 'tab tabActive' : 'tab'}
            onClick={() => setTab('calendar')}
            type="button"
          >
            Календарь
          </button>
        </nav>

        <div className="actions">
          <button
            className="btn btnGhost"
            type="button"
            onClick={() => {
              exportJson(data, `personal-assistant-backup-${new Date().toISOString().slice(0, 10)}.json`)
              setStatus('Экспортировано в JSON.')
              window.setTimeout(() => setStatus(null), 2500)
            }}
          >
            Экспорт
          </button>
          <label className="btn btnGhost" role="button" tabIndex={0}>
            Импорт
            <input
              className="fileInput"
              type="file"
              accept="application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const imported = await importJsonFromFile<AppDataV1>(file)
                  if (!imported || imported.version !== 1) {
                    throw new Error('Неподдерживаемый формат бэкапа.')
                  }
                  setData(imported)
                  setStatus('Импортировано.')
                  window.setTimeout(() => setStatus(null), 2500)
                } catch (err) {
                  setStatus(err instanceof Error ? err.message : 'Ошибка импорта.')
                  window.setTimeout(() => setStatus(null), 3500)
                } finally {
                  e.target.value = ''
                }
              }}
            />
          </label>
        </div>
      </header>

      {status ? <div className="statusBar">{status}</div> : null}

      <main className="main">{content}</main>

      <footer className="footer">
        <span>Данные хранятся в IndexedDB (офлайн, не привязаны к вкладке).</span>
      </footer>
    </div>
  )
}
