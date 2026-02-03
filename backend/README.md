# AI Backend Setup

## Установка зависимостей

```bash
# Рекомендуется использовать Python 3.8+
pip install fastapi uvicorn torch transformers pydantic
```

## Запуск бэкенда

```bash
# Перейдите в директорию backend
cd backend

# Запустите сервер
python main.py

# Или используйте uvicorn напрямую
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Сервер будет доступен по адресу: http://localhost:8000

## Эндпоинты

- `GET /` - Основная страница API
- `GET /health` - Проверка здоровья
- `GET /api/model/status` - Статус модели
- `POST /api/model/reload` - Перезагрузка модели
- `POST /api/analyze/day` - Анализ дня
- `POST /api/chat` - Чат с AI (полная версия)
- `POST /api/chat/simple` - Чат с AI (упрощенная версия)

## Модель AI

По умолчанию используется модель `Qwen/Qwen2.5-0.5B-Instruct` - легкая модель (0.5B параметров), которая работает на CPU.

Для использования более мощных моделей (например, на GPU) измените `model_name` в `main.py`.