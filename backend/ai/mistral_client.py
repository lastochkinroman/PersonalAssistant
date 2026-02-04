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
        
        # Добавляем статистику
        stats = f"""
Дата: {context.get('date', 'Не указана')}

Статистика:
- Задачи: {len(context.get('tasks', []))}
- Финансы: {len(context.get('finances', context.get('money', [])))}
- Тренировки: {len(context.get('workouts', []))}
- Дневник: {len(context.get('diary', []))}
- События: {len(context.get('events', []))}
- Заметки: {len(context.get('notes', []))}
"""
        
        prompt += stats
        
        # Добавляем конкретные данные если они есть
        if context.get('tasks'):
            completed = len([t for t in context['tasks'] if t.get('completed') or t.get('done')])
            prompt += f"\nВыполнено задач: {completed}/{len(context['tasks'])}"
        
        if context.get('finances') or context.get('money'):
            finances = context.get('finances', context.get('money', []))
            income = sum(f.get('amount', 0) for f in finances if f.get('type') == 'income')
            expenses = sum(f.get('amount', 0) for f in finances if f.get('type') == 'expense')
            prompt += f"\nФинансы: доход {income}, расход {expenses}, баланс {income - expenses}"
        
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