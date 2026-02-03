from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import uvicorn
import gc
import json

app = FastAPI(title="AI Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модели данных
class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None

class DailyContext(BaseModel):
    date: str
    tasks: List[Dict[str, Any]] = []
    finances: Optional[List[Dict[str, Any]]] = []
    money: Optional[List[Dict[str, Any]]] = []
    workouts: List[Dict[str, Any]] = []
    diary: List[Dict[str, Any]] = []
    events: List[Dict[str, Any]] = []
    notes: List[Dict[str, Any]] = []

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: DailyContext

# Глобальные переменные
MODEL_NAME = "Qwen/Qwen2.5-1.5B-Instruct"
model = None
tokenizer = None
model_loaded = False

def load_model():
    global model, tokenizer, model_loaded
    
    print(f"🤖 Загрузка модели {MODEL_NAME}...")
    
    try:
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        # Загружаем токенизатор с правильными настройками
        tokenizer = AutoTokenizer.from_pretrained(
            MODEL_NAME,
            trust_remote_code=True,
            padding_side="left"  # Важно для генерации!
        )
        
        # Устанавливаем pad_token если его нет
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        # Настройки для загрузки
        load_config = {
            "trust_remote_code": True,
            "low_cpu_mem_usage": True,
        }
        
        if torch.cuda.is_available():
            print("🎮 Используем GPU с квантованием для 4GB памяти")
            from transformers import BitsAndBytesConfig
            
            # Для 4GB GPU используем 4-битное квантование
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
            )
            
            load_config.update({
                "quantization_config": bnb_config,
                "device_map": "auto",
                "torch_dtype": torch.float16,
            })
        else:
            print("💻 Используем CPU")
            load_config.update({
                "device_map": "cpu",
                "torch_dtype": torch.float32,
            })
        
        # Загружаем модель
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME,
            **load_config
        )
        
        model.eval()
        model_loaded = True
        
        device = next(model.parameters()).device
        print(f"✅ Модель загружена на: {device}")
        
        if torch.cuda.is_available():
            allocated = torch.cuda.memory_allocated() / 1e9
            print(f"💾 Использовано памяти GPU: {allocated:.2f} GB")
        
    except Exception as e:
        print(f"❌ Ошибка загрузки модели: {e}")
        
        # Fallback на CPU версию
        try:
            print("🔄 Пробуем загрузить на CPU...")
            tokenizer = AutoTokenizer.from_pretrained(
                MODEL_NAME,
                trust_remote_code=True
            )
            
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_NAME,
                torch_dtype=torch.float32,
                device_map="cpu",
                trust_remote_code=True
            )
            
            model.eval()
            model_loaded = True
            print("✅ Модель загружена на CPU")
        except Exception as e2:
            print(f"❌ Критическая ошибка: {e2}")
            model_loaded = False

def create_chat_prompt(messages: List[ChatMessage], context: DailyContext) -> str:
    """Создает правильный промпт для чата"""
    
    # Формируем системное сообщение
    system_prompt = """Ты — полезный персональный AI-ассистент. У тебя есть данные о дне пользователя.

Данные пользователя:"""
    
    # Добавляем информацию о данных
    data_info = f"""
Дата: {context.date}

Статистика:
- Задачи: {len(context.tasks)}
- Финансы: {len(context.finances or context.money or [])}
- Тренировки: {len(context.workouts)}
- Дневник: {len(context.diary)}
- События: {len(context.events)}
- Заметки: {len(context.notes)}
"""
    
    # Формируем историю диалога
    chat_history = ""
    for msg in messages[-5:]:  # Берем последние 5 сообщений
        if msg.role == "user":
            chat_history += f"Пользователь: {msg.content}\n"
        elif msg.role == "assistant":
            chat_history += f"Ассистент: {msg.content}\n"
    
    # Собираем финальный промпт
    prompt = f"""<|im_start|>system
{system_prompt}
{data_info}

Твоя задача:
1. Отвечать на вопросы пользователя
2. Давать полезные советы на основе его данных
3. Быть дружелюбным и понятным
4. Отвечать кратко и по делу
5. Не выдумывать информацию
<|im_end|>

{chat_history}
<|im_start|>assistant
"""
    
    return prompt

@app.on_event("startup")
async def startup_event():
    print("=" * 60)
    print("🚀 Запуск исправленного AI бэкенда")
    print("=" * 60)
    
    print(f"\n📊 Информация о системе:")
    print(f"PyTorch: {torch.__version__}")
    print(f"CUDA доступно: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        memory = torch.cuda.get_device_properties(0).total_memory / 1e9
        print(f"Память GPU: {memory:.1f} GB")
    
    print(f"\n🤖 Модель: {MODEL_NAME}")
    print("\n" + "=" * 60)
    
    load_model()

@app.get("/")
async def root():
    return {
        "message": "Personal Assistant AI API",
        "model": MODEL_NAME,
        "loaded": model_loaded,
        "cuda": torch.cuda.is_available()
    }

@app.get("/api/health")
async def health():
    return {
        "status": "healthy" if model_loaded else "loading",
        "model_loaded": model_loaded,
        "model": MODEL_NAME,
        "cuda_available": torch.cuda.is_available()
    }

@app.get("/api/model/status")
async def model_status():
    return {
        "status": "loaded" if model_loaded else "loading",
        "model_loaded": model_loaded,
        "model": MODEL_NAME,
        "cuda_available": torch.cuda.is_available()
    }

@app.get("/api/model/info")
async def model_info():
    return {
        "model": MODEL_NAME,
        "loaded": model_loaded,
        "cuda_available": torch.cuda.is_available()
    }

@app.get("/api/model/available")
async def available_models():
    return {
        "models": [MODEL_NAME],
        "current": MODEL_NAME
    }

@app.post("/api/chat")
async def chat(request: ChatRequest):
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Модель еще не загружена")
    
    try:
        # Создаем правильный промпт
        prompt = create_chat_prompt(request.messages, request.context)
        
        print("\n📝 Промпт для модели:")
        print("-" * 40)
        print(prompt[-500:])  # Показываем последние 500 символов
        print("-" * 40)
        
        # Токенизация
        inputs = tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=2048,
            padding=True
        )
        
        # Перемещаем на правильное устройство
        device = next(model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        print(f"📏 Длина промпта: {inputs['input_ids'].shape[1]} токенов")
        
        # Генерация с правильными параметрами
        with torch.no_grad():
            # Очищаем кэш перед генерацией
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            outputs = model.generate(
                **inputs,
                max_new_tokens=300,  # Увеличиваем для более полных ответов
                temperature=0.8,     # Немного повышаем для разнообразия
                top_p=0.95,          # nucleus sampling
                top_k=50,           # ограничиваем топ-k
                do_sample=True,     # используем sampling
                repetition_penalty=1.1,  # штраф за повторения
                no_repeat_ngram_size=3,  # избегаем повторения n-грамм
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )
        
        # Декодируем ТОЛЬКО сгенерированную часть
        generated_ids = outputs[0][inputs['input_ids'].shape[1]:]
        response_text = tokenizer.decode(
            generated_ids,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=True
        )
        
        # Убираем возможные артефакты
        response_text = response_text.strip()
        
        # Обрезаем по стоп-символам если нужно
        stop_sequences = ["<|im_end|>", "</s>", "\n\nПользователь:", "\nПользователь:"]
        for stop_seq in stop_sequences:
            if stop_seq in response_text:
                response_text = response_text.split(stop_seq)[0]
        
        print(f"\n🤖 Ответ модели ({len(response_text)} символов):")
        print("-" * 40)
        print(response_text[:500])
        print("-" * 40)
        
        # Если ответ слишком короткий или странный
        if len(response_text) < 10:
            response_text = "Привет! Чем могу помочь? Вижу у тебя пока мало данных за сегодня. Расскажи, что планируешь сделать?"
        
        # Очищаем память
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        return {
            "success": True,
            "response": response_text,
            "model": MODEL_NAME,
            "prompt_length": inputs['input_ids'].shape[1],
            "response_length": len(response_text)
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Ошибка генерации: {error_details}")
        
        # Возвращаем запасной ответ
        return {
            "success": True,
            "response": "Привет! Я ваш AI-ассистент. Вижу, что сегодня у вас пока нет записей. Расскажите, чем могу помочь?",
            "error": str(e),
            "fallback": True
        }

@app.get("/api/debug/prompt")
async def debug_prompt():
    """Эндпоинт для отладки формата промпта"""
    test_messages = [
        ChatMessage(role="user", content="привет", timestamp="2024-01-01T10:00:00")
    ]
    
    test_context = DailyContext(
        date="2024-01-01",
        tasks=[],
        finances=[],
        workouts=[],
        diary=[],
        events=[],
        notes=[]
    )
    
    prompt = create_chat_prompt(test_messages, test_context)
    
    return {
        "prompt": prompt,
        "prompt_length": len(prompt),
        "model": MODEL_NAME
    }

if __name__ == "__main__":
    print("\n🌐 Сервер запускается...")
    print("📍 http://localhost:8000")
    print("📊 Проверка: http://localhost:8000/health")
    print("🐛 Отладка промпта: http://localhost:8000/api/debug/prompt")
    print("\nНажмите Ctrl+C для остановки\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False,  # Отключаем reload для стабильности
        log_level="info"
    )