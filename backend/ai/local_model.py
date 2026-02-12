"""
Локальная модель на Transformers
"""
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from typing import List, Dict, Any, Optional
import gc
from .core import AIModel, Config


class LocalModel(AIModel):
    """Локальная модель на Transformers"""
    
    def __init__(self, model_name: str = "Qwen/Qwen2.5-0.5B-Instruct", config: Optional[Config] = None):
        self.model_name = model_name
        self.config = config or Config()
        self.tokenizer = None
        self.model = None
        self.loaded = False
        
        # Настройки из конфигурации
        self.device = self.config.get('local.device', 'auto')
        self.quantization = self.config.get('local.quantization', '4bit')
        self.max_memory = self.config.get('local.max_memory', '4GB')
        
    def load(self) -> bool:
        """Загрузка модели"""
        try:
            print(f"🤖 Загрузка локальной модели: {self.model_name}")
            
            # Очистка памяти
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            # Загружаем токенизатор
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                trust_remote_code=True,
                padding_side="left"
            )
            
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            # Определяем устройство
            device_map = "auto"
            if self.device == "cpu":
                device_map = "cpu"
                torch_dtype = torch.float32
            elif self.device == "cuda" and torch.cuda.is_available():
                device_map = "cuda:0"
                torch_dtype = torch.float16
            else:  # auto
                torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
            
            # Настройки квантования
            quantization_config = None
            if self.quantization == "4bit" and torch.cuda.is_available():
                try:
                    quantization_config = BitsAndBytesConfig(
                        load_in_4bit=True,
                        bnb_4bit_quant_type="nf4",
                        bnb_4bit_compute_dtype=torch.float16,
                        bnb_4bit_use_double_quant=True,
                    )
                except ImportError:
                    print("⚠️ bitsandbytes не найден, загружаем модель без квантования")
                    self.quantization = "none"
            elif self.quantization == "8bit" and torch.cuda.is_available():
                try:
                    quantization_config = BitsAndBytesConfig(
                        load_in_8bit=True,
                        llm_int8_threshold=6.0,
                    )
                except ImportError:
                    print("⚠️ bitsandbytes не найден, загружаем модель без квантования")
                    self.quantization = "none"
            
            # Загружаем модель
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                trust_remote_code=True,
                torch_dtype=torch_dtype,
                device_map=device_map,
                quantization_config=quantization_config,
                low_cpu_mem_usage=True,
            )
            
            self.model.eval()
            self.loaded = True
            
            print(f"✅ Модель загружена на: {next(self.model.parameters()).device}")
            
            if torch.cuda.is_available():
                allocated = torch.cuda.memory_allocated() / 1e9
                print(f"💾 Использовано памяти GPU: {allocated:.2f} GB")
            
            return True
            
        except Exception as e:
            print(f"❌ Ошибка загрузки модели: {e}")
            self.loaded = False
            return False
    
    def is_available(self) -> bool:
        """Проверка доступности модели"""
        return self.loaded
    
    def generate(self, messages: List[Dict[str, str]], context: Dict[str, Any]) -> str:
        """Генерация ответа локальной моделью"""
        if not self.loaded:
            if not self.load():
                return "❌ Локальная модель не загружена"
        
        try:
            # Формируем промпт
            prompt = self._create_prompt(messages, context)
            
            # Токенизация
            inputs = self.tokenizer(
                prompt,
                return_tensors="pt",
                truncation=True,
                max_length=2048,
                padding=True
            )
            
            # Перемещаем на устройство модели
            device = next(self.model.parameters()).device
            inputs = {k: v.to(device) for k, v in inputs.items()}
            
            # Генерация
            with torch.no_grad():
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=512,
                    temperature=0.7,
                    top_p=0.9,
                    do_sample=True,
                    pad_token_id=self.tokenizer.pad_token_id,
                    eos_token_id=self.tokenizer.eos_token_id,
                    repetition_penalty=1.1,
                )
            
            # Декодируем ответ
            generated_ids = outputs[0][inputs['input_ids'].shape[1]:]
            response = self.tokenizer.decode(generated_ids, skip_special_tokens=True)
            
            # Очистка памяти
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            return response.strip()
            
        except Exception as e:
            return f"❌ Ошибка генерации локальной моделью: {str(e)}"
    
    def _create_prompt(self, messages: List[Dict[str, str]], context: Dict[str, Any]) -> str:
        """Создание промпта для локальной модели"""
        # Системное сообщение
        system_msg = """Ты — полезный персональный AI-ассистент. У тебя есть данные о дне пользователя.

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
        
        # История диалога
        chat_history = ""
        for msg in messages[-3:]:
            role = "Пользователь" if msg['role'] == 'user' else "Ассистент"
            chat_history += f"{role}: {msg['content']}\n"
        
        # Финальный промпт
        prompt = f"""{system_msg}
{detailed_context}

{chat_history}
Ассистент: """
        
        return prompt
    
    def get_info(self) -> Dict[str, Any]:
        """Информация о модели"""
        device = "Не загружена"
        if self.model:
            device = str(next(self.model.parameters()).device)
        
        return {
            "name": self.model_name,
            "provider": "local",
            "type": "local",
            "available": self.loaded,
            "device": device,
            "quantization": self.quantization,
            "description": "Локальная модель Transformers",
            "requires_gpu": torch.cuda.is_available()
        }