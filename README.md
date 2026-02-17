# Personal Assistant

Занимаясь своим бытом в Obsidian, я столкнулся с проблемой. Я заполняю много своих данных в md файл, а после чего отдаю это в ручную в LLM. А что если всё будет в удобном интерфейсе и мои данные будут сами подтягиваться для встроенного чата с персональным AI помощником. Так и появился мой проект. Использую его сам каждый день.

---

## Описание

**Personal Assistant** — это персональный веб-инструмент для ежедневного трекинга с встроенным AI-ассистентом. Приложение сочетает в себе функции органайзера и интеллектуального помощника на основе LLM (Large Language Model).

### Основные возможности

- **Задачи (Tasks)** — полноценный трекер задач с поддержкой:
  - Статусов (к выполнению, в работе, выполнено)
  - Приоритетов (высокий, средний, низкий)
  - Дедлайнов
  - Тегов
  - Поиска и фильтрации

- **Финансы (Money)** — учёт доходов и расходов:
  - Категории расходов
  - Суммы за месяц
  - Топ категорий расходов
  - Отслеживание бюджета

- **Тренировки (Workouts)** — дневник тренировок:
  - Запись тренировочных сессий
  - Упражнения с подходами (reps/weight)
  - Расчёт PR (оценка 1RM)
  - Прогресс по упражнениям

- **Календарь (Calendar)** — планирование событий и мероприятий

- **Дневник (Diary)** — личные заметки и мысли

- **Заметки (Notes)** — быстрые заметки и идеи

### AI Ассистент

Встроенный AI-ассистент с гибридной архитектурой:
- **API модели** — Mistral AI (Small, Medium, Large)
- **Локальные модели** — Qwen, Phi-2 (работают без интернета)
- **Контекст** — AI автоматически видит ваши данные (задачи, финансы, тренировки) и может анализировать их
- **Персонализация** — помощник знает ваши привычки и может давать релевантные советы

## Технологический стек

### Frontend
- **React 19** — UI фреймворк
- **TypeScript** — типизация
- **Vite** — сборщик
- **localForage** — работа с localStorage
- **React Markdown** — рендеринг Markdown

### Backend
- **FastAPI** — Python веб-фреймворк
- **PyTorch** — для локальных моделей
- **Transformers** — библиотека для работы с LLM
- **Mistral AI** — облачное API

## Установка и запуск

### Требования

- **Frontend**: Node.js 18+, npm
- **Backend**: Python 3.8+, pip

### Установка Frontend

```bash
# Клонирование репозитория
git clone https://github.com/lastochkinroman/PersonalAssistant
cd PersonalAssistant

# Установка зависимостей
npm install
```

### Установка Backend

```bash
cd backend

# Установка Python зависимостей (Windows)
pip install -r requirements.txt

# Или для Linux/MacOS
pip3 install -r requirements.txt
```

## Запуск приложения

### Запуск Frontend

```bash
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:5173`

### Запуск Backend

#### Windows
```bash
cd backend
start.bat
```

#### Linux/MacOS
```bash
cd backend
chmod +x start.sh
./start.sh
```

#### Или напрямую
```bash
python backend/main.py
```

Backend будет доступен по адресам:
- **Главный**: http://localhost:8000
- **Health check**: http://localhost:8000/health
- **Статус модели**: http://localhost:8000/api/model/status
- **Доступные модели**: http://localhost:8000/api/models/available
- **API документация**: http://localhost:8000/docs

## Настройка AI

### Конфигурация

Основные настройки находятся в файле `backend/config.yaml`:

```yaml
defaults:
  model: mistral-medium-latest
  provider: api

mistral:
  api_key: your_api_key_here  # Получить на https://console.mistral.ai/
  base_url: https://api.mistral.ai/v1
  timeout: 30

models:
  api:
    available:
      - mistral-small-latest  # Быстрая и недорогая
      - mistral-medium-latest # Баланс
      - mistral-large-latest  # Максимальное качество

  local:
    available:
      - Qwen/Qwen2.5-0.5B-Instruct  # 1 GB, для CPU
      - Qwen/Qwen2.5-1.5B-Instruct  # 3 GB
      - microsoft/phi-2            # 5 GB
```

### Переключение моделей

Через веб-интерфейс:
1. Откройте вкладку AI Assistant
2. Нажмите "Управление моделями"
3. Выберите провайдера (API/Local) и модель

Через API:
```bash
# Получить список моделей
curl http://localhost:8000/api/models/available

# Переключиться на API модель
curl -X POST http://localhost:8000/api/models/switch \
  -H "Content-Type: application/json" \
  -d '{"provider": "api", "model_name": "mistral-small-latest"}'

# Переключиться на локальную модель
curl -X POST http://localhost:8000/api/models/switch \
  -H "Content-Type: application/json" \
  -d '{"provider": "local", "model_name": "Qwen/Qwen2.5-0.5B-Instruct"}'
```

### Требования для локальных моделей

- **CPU**: Достаточно для Qwen 0.5B
- **GPU (NVIDIA)**: Рекомендуется 4GB+ VRAM для Qwen 1.5B, 6GB+ для Phi-2
- **Оперативная память**: 8GB+ рекомендуется

### Получение API ключа Mistral

1. Зарегистрируйтесь на https://console.mistral.ai/
2. Создайте новый API ключ
3. Добавьте ключ в `backend/.env`:
   ```
   MISTRAL_API_KEY=your_key_here
   ```
   Или измените `backend/config.yaml`:
   ```yaml
   mistral:
     api_key: your_key_here
   ```

## API Endpoints

### Чат с AI
```
POST /api/chat
{
  "messages": [
    {"role": "user", "content": "Привет!"}
  ],
  "context": {
    "date": "2024-01-15",
    "tasks": [...],
    "money": [...],
    "workouts": [...]
  }
}
```

### Управление моделями
```
GET  /api/models/available      # Список доступных моделей
POST /api/models/switch         # Переключить модель
GET  /api/models/current        # Текущая модель
GET  /api/system/info           # Информация о системе
```

### Система
```
GET /           # Информация об API
GET /health     # Проверка здоровья
```

## Хранение данных

- **Frontend**: Все данные хранятся в localStorage браузера
  - Ключ данных: `pa.data.v1`
  - Ключ вкладки: `pa.tab`

- **Экспорт/Импорт**: Встроенная функция резервного копирования в JSON

## Структура проекта

```
PersonalAssistant/
├── src/                      # Frontend (React)
│   ├── features/
│   │   ├── ai-assistant/    # AI чат
│   │   ├── calendar/        # Календарь
│   │   ├── diary/           # Дневник
│   │   ├── money/           # Финансы
│   │   ├── notes/           # Заметки
│   │   ├── tasks/           # Задачи
│   │   └── workouts/        # Тренировки
│   └── lib/                 # Утилиты
├── backend/                  # Backend (Python)
│   ├── ai/                  # AI модули
│   │   ├── core.py          # Конфигурация
│   │   ├── local_model.py   # Локальные модели
│   │   ├── mistral_client.py # Mistral API
│   │   └── model_manager.py # Управление моделями
│   ├── main.py              # FastAPI приложение
│   ├── config.yaml          # Конфигурация
│   └── requirements.txt     # Python зависимости
├── package.json             # Frontend зависимости
└── README.md               # Этот файл
```

## Лицензия

MIT License

---

Автор: Roman Lastochkin
GitHub: https://github.com/lastochkinroman/PersonalAssistant
