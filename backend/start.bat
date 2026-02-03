@echo off
echo 🚀 Запуск AI бэкенда...

REM Проверяем наличие Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python не найден. Установите Python 3.8+
    pause
    exit /b 1
)

echo 🔍 Устанавливаем зависимости Python...
pip install -r requirements.txt --quiet

echo 🤖 Загружаем AI модель (это может занять несколько минут)...
echo 📡 Сервер будет доступен по адресу: http://localhost:8000
echo 📊 Проверка здоровья: http://localhost:8000/health
echo 🤖 Статус модели: http://localhost:8000/api/model/status

REM Запускаем сервер
python main.py
pause