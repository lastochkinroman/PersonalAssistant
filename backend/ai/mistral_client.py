"""
Клиент для Mistral API
"""
import os
import httpx
from typing import List, Dict, Any, Optional
import json
from .core import AIModel, Config


class MistralModel(AIModel):
    """Реализация модели через Mistral API"""
    
    def __init__(self, model_name: str = "mistral-small-latest", config: Optional[Config] = None):
        self.model_name = model_name
        self.config = config or Config()
        self.api_key = self.config.get('mistral.api_key') or os.environ.get('MISTRAL_API_KEY')
        self.base_url = self.config.get('mistral.base_url', 'https://api.mistral.ai/v1')
        self.timeout = self.config.get('mistral.timeout', 30)
        self.client = None
        
    def _get_client(self) -> httpx.Client:
        """Получение HTTP клиента"""
        if self.client is None:
            self.client = httpx.Client(
                base_url=self.base_url,
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout=self.timeout
            )
        return self.client
    
    def is_available(self) -> bool:
        """Проверка доступности API"""
        if not self.api_key:
            return False
        
        try:
            client = self._get_client()
            response = client.get('/models')
            return response.status_code == 200
        except:
            return False
    
    def generate(self, messages: List[Dict[str, str]], context: Dict[str, Any]) -> str:
        """Генерация ответа через Mistral API"""
        if not self.api_key:
            return "❌ Ошибка: Mistral API ключ не установлен. Добавьте MISTRAL_API_KEY в переменные окружения или config.yaml"
        
        try:
            # Формируем системное сообщение с контекстом
            system_message = self._create_system_prompt(context)
            
            # Добавляем системное сообщение в начало
            all_messages = [{"role": "system", "content": system_message}] + messages
            
            client = self._get_client()
            
            response = client.post(
                '/chat/completions',
                json={
                    "model": self.model_name,
                    "messages": all_messages,
                    "temperature": 0.7,
                    "max_tokens": 1000,
                    "top_p": 0.95,
                    "stream": False
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return data['choices'][0]['message']['content'].strip()
            else:
                error_msg = f"❌ Ошибка API: {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f" - {error_data.get('error', {}).get('message', 'Неизвестная ошибка')}"
                except:
                    error_msg += f" - {response.text}"
                return error_msg
                
        except httpx.TimeoutException:
            return "❌ Таймаут при обращении к Mistral API. Проверьте интернет-соединение."
        except Exception as e:
            return f"❌ Ошибка при обращении к Mistral API: {str(e)}"
    
    def _create_system_prompt(self, context: Dict[str, Any]) -> str:
        """Создание системного промпта с контекстом"""
        prompt = """Ты — полезный персональный AI-ассистент. У тебя есть данные о дне пользователя.

Данные пользователя:"""
        
        # Детализированный контекст
        detailed_context = f"""
Дата: {context.get('date', 'Не указана')}

### Задачи:
"""
        tasks = context.get('tasks', [])
        if tasks:
            for task in tasks:
                status = "✅ Выполнено" if task.get('completed') or task.get('done') else "❌ Не выполнено"
                priority = task.get('priority', 'средний')
                detailed_context += f"- {status} [{priority}]: {task.get('title', 'Без названия')}"
                if task.get('notes'):
                    detailed_context += f" — {task['notes']}"
                detailed_context += "\n"
        else:
            detailed_context += "Нет задач\n"
        
        detailed_context += "\n### Финансы (детали):\n"
        finances = context.get('finances', context.get('money', []))
        if finances:
            # По категориям
            income_by_category = {}
            expenses_by_category = {}
            
            for f in finances:
                category = f.get('category', 'Без категории')
                amount = f.get('amount', 0)
                if f.get('type') == 'income':
                    if category not in income_by_category:
                        income_by_category[category] = 0
                    income_by_category[category] += amount
                elif f.get('type') == 'expense':
                    if category not in expenses_by_category:
                        expenses_by_category[category] = 0
                    expenses_by_category[category] += amount
            
            # Доходы
            if income_by_category:
                detailed_context += "Доходы:\n"
                for cat, amt in income_by_category.items():
                    detailed_context += f"  • {cat}: {amt} ₽\n"
            
            # Расходы
            if expenses_by_category:
                detailed_context += "Расходы:\n"
                for cat, amt in expenses_by_category.items():
                    detailed_context += f"  • {cat}: {amt} ₽\n"
            
            # Итого
            income = sum(f.get('amount', 0) for f in finances if f.get('type') == 'income')
            expenses = sum(f.get('amount', 0) for f in finances if f.get('type') == 'expense')
            balance = income - expenses
            detailed_context += f"Итого: доход {income} ₽, расход {expenses} ₽, баланс {balance} ₽\n"
        else:
            detailed_context += "Нет финансовых транзакций\n"
        
        detailed_context += "\n### Тренировки:\n"
        workouts = context.get('workouts', [])
        if workouts:
            for workout in workouts:
                detailed_context += f"- {workout.get('title', 'Без названия')}"
                if workout.get('exercises'):
                    detailed_context += f" ({len(workout['exercises'])} упражнений):\n"
                    for exercise in workout['exercises']:
                        detailed_context += f"  • {exercise.get('name', 'Упражнение')}: {exercise.get('sets', 0)} подходов, {exercise.get('reps', 0)} повторений, {exercise.get('weight', 0)} кг\n"
                detailed_context += "\n"
        else:
            detailed_context += "Нет тренировок\n"
        
        detailed_context += "\n### Дневник:\n"
        diary = context.get('diary', [])
        if diary:
            for entry in diary:
                detailed_context += f"- Настроение: {entry.get('mood', 'Не указано')}\n"
                detailed_context += f"  {entry.get('content', 'Нет содержимого')}\n"
                if entry.get('tags'):
                    detailed_context += f"  Теги: {', '.join(entry['tags'])}\n"
        else:
            detailed_context += "Нет записей в дневнике\n"
        
        detailed_context += "\n### События:\n"
        events = context.get('events', [])
        if events:
            for event in events:
                detailed_context += f"- {event.get('time', '')} {event.get('title', 'Без названия')}\n"
                if event.get('description'):
                    detailed_context += f"  {event['description']}\n"
                if event.get('location'):
                    detailed_context += f"  Местоположение: {event['location']}\n"
        else:
            detailed_context += "Нет событий\n"
        
        detailed_context += "\n### Заметки:\n"
        notes = context.get('notes', [])
        if notes:
            for note in notes:
                detailed_context += f"- {note.get('title', 'Без названия')}\n"
                if note.get('content'):
                    detailed_context += f"  {note['content'][:100]}..." if len(note['content']) > 100 else f"  {note['content']}\n"
                if note.get('tags'):
                    detailed_context += f"  Теги: {', '.join(note['tags'])}\n"
        else:
            detailed_context += "Нет заметок\n"
        
        prompt += detailed_context
        
        prompt += """

Инструкции:
1. Используй данные пользователя для персонализированных ответов
2. Будь дружелюбным и полезным
3. Отвечай кратко и по делу
4. Если данных мало, спроси у пользователя подробности
5. Предлагай конкретные советы и рекомендации
"""
        
        return prompt
    
    def get_info(self) -> Dict[str, Any]:
        """Информация о модели"""
        return {
            "name": self.model_name,
            "provider": "mistral",
            "type": "api",
            "available": self.is_available(),
            "description": "Mistral AI через API",
            "requires_api_key": True,
            "api_key_set": bool(self.api_key)
        }