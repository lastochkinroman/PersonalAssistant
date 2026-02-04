import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { TasksPage } from './features/tasks/TasksPage'
import { MoneyPage } from './features/money/MoneyPage'
import { WorkoutsPage } from './features/workouts/WorkoutsPage'
import { CalendarPage } from './features/calendar/CalendarPage'
import { DiaryPage } from './features/diary/DiaryPage'
import { NotesPage } from './features/notes/NotesPage'
import { AIAssistant } from './features/ai-assistant/AIAssistant'
import './features/ai-assistant/AIAssistant.css'
import type { AppDataV1 } from './lib/appData'
import { APP_DATA_LS_KEY, createEmptyAppDataV1 } from './lib/appData'
import { exportJson, importJsonFromFile } from './lib/jsonIO'
import { usePersistentStoreState } from './lib/usePersistentStore'

type TabKey = 'tasks' | 'money' | 'workouts' | 'calendar' | 'diary' | 'notes'

export default function App() {
  const [tab, setTab, tabReady] = usePersistentStoreState<TabKey>('pa.tab', 'tasks')
  const [data, setData, dataReady] = usePersistentStoreState<AppDataV1>(
    APP_DATA_LS_KEY,
    createEmptyAppDataV1(),
  )
  const [status, setStatus] = useState<string | null>(null)
  const hydrated = tabReady && dataReady

  // Migrate data structure if needed
  useEffect(() => {
    if (!hydrated) return

    let needsMigration = false
    const migratedData = { ...data }

    // Add accounts field if missing
    if (!migratedData.money.accounts) {
      migratedData.money = {
        ...migratedData.money,
        accounts: [{
          id: 'default',
          name: 'Основной счёт',
          balance: 0,
          includeInTotal: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]
      }
      needsMigration = true
    }

    // Add diary field if missing
    if (!migratedData.diary) {
      migratedData.diary = []
      needsMigration = true
    }

    // Add events field if missing
    if (!migratedData.events) {
      migratedData.events = []
      needsMigration = true
    }

    // Add notes fields if missing
    if (!migratedData.notes) {
      migratedData.notes = []
      needsMigration = true
    }
    if (!migratedData.noteFolders) {
      migratedData.noteFolders = []
      needsMigration = true
    }

    // Add welcome note if no notes exist
    if (migratedData.notes.length === 0) {
      const welcomeNote = {
        id: 'welcome-note',
        title: 'Добро пожаловать в Заметки',
        content: `# Добро пожаловать в Заметки! 🎉

Это ваша персональная база знаний в стиле **Obsidian**, встроенная прямо в приложение.

## 📝 Как пользоваться

### Создание заметок и папок
- **Создать папку**: введите название в поле "Новая папка..." и нажмите 📁
- **Создать заметку**: нажмите **+** в левом меню или в папке "Новая заметка"
- **Режимы**: ✏️ редактирование, 👁️ просмотр с форматированием

### Форматирование текста
Используйте панель инструментов или пишите Markdown:
- **H₁ H₂ H₃** - заголовки разных уровней (# ## ###)
- **B** - **жирный текст** (**текст**)
- **I** - *курсив* (*текст*)
- **</>** - \`код\` (\`код\`)
- **🔗** - [ссылки](url) ([текст](url))
- **•** - списки (- элемент)
- **1.** - нумерованные списки (1. элемент)
- **"** - цитаты (> цитата)

### Live Preview
- Переключайтесь между режимами **✏️** и **👁️**
- В режиме просмотра видите отформатированный текст
- В режиме редактирования - чистый Markdown

### Организация
- **Папки**: создавайте иерархию через селект "Корень" или внутри папок
- **Вложенность**: папки внутри папок с отступами
- **Теги**: добавляйте #теги через запятую
- **Поиск**: ищите по названию, содержимому или тегам

### Файловая структура
Слева находится дерево файлов:
- 📁 - свернутые папки (кликните чтобы развернуть)
- 📂 - развернутые папки
- 📄 - заметки
- ➕ - создать заметку в папке
- 📁 - создать подпапку в папке

## 💡 Советы

- Используйте **двойные пробелы** в конце строки для перевода
- **[[Название заметки]]** - для ссылок на другие заметки (пока не реализовано)
- Автосохранение работает автоматически

---

*Удалите эту заметку когда ознакомитесь с функционалом*`,
        folder: 'welcome',
        tags: ['добро-пожаловать', 'инструкция', 'markdown'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      migratedData.notes = [welcomeNote]
      needsMigration = true
    }

    if (needsMigration) {
      console.log('Мигрирую данные к новой версии...')
      setData(migratedData)
    }
  }, [hydrated, data, setData])

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
            events={data.events}
            onEventsChange={(events) => setData({ ...data, events })}
            settings={data.settings}
          />
        )
      case 'diary':
        return (
          <DiaryPage
            diary={data.diary}
            onChange={(diary) => setData({ ...data, diary })}
          />
        )
      case 'notes':
        return (
          <NotesPage
            notes={data.notes}
            onNotesChange={(notes) => setData({ ...data, notes })}
            noteFolders={data.noteFolders}
            onNoteFoldersChange={(noteFolders) => setData({ ...data, noteFolders })}
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
            <div className="brandSub">таски · финансы · тренировки · календарь · дневник · заметки</div>
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
          <button
            className={tab === 'diary' ? 'tab tabActive' : 'tab'}
            onClick={() => setTab('diary')}
            type="button"
          >
            Дневник
          </button>
          <button
            className={tab === 'notes' ? 'tab tabActive' : 'tab'}
            onClick={() => setTab('notes')}
            type="button"
          >
            Заметки
          </button>
        </nav>

        <div className="actions">
          <button
            className="btn btnGhost"
            type="button"
            title="Экспортировать все данные. Данные хранятся локально в IndexedDB (офлайн)."
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
      
      {/* AI Assistant */}
      <AIAssistant 
        data={data} 
        onDataUpdate={() => {
          // При обновлении данных можно выполнить дополнительные действия
          console.log('Данные обновлены, AI может пересчитать контекст')
        }}
      />
    </div>
  )
}
