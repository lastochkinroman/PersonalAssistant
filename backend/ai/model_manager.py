"""
Менеджер для переключения между моделями
"""
from typing import Dict, Any, List, Optional
from .core import AIModel, Config
from .mistral_client import MistralModel
from .local_model import LocalModel
import torch
import psutil


class ModelManager:
    """Управление AI моделями"""
    
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.current_model: Optional[AIModel] = None
        self.current_provider = self.config.get('defaults.provider', 'api')
        self.current_model_name = self.config.get('defaults.model', 'mistral-small-latest')
        
        # Загружаем начальную модель
        self._load_initial_model()
    
    def _load_initial_model(self):
        """Загрузка начальной модель"""
        provider = self.current_provider
        model_name = self.current_model_name
        
        print(f"🎯 Инициализация модели: {model_name} ({provider})")
        
        if provider == "api":
            self.current_model = MistralModel(model_name, self.config)
            if not self.current_model.is_available():
                print("⚠️ Mistral API недоступен, переключаюсь на локальную модель...")
                self.switch_to_local("Qwen/Qwen2.5-0.5B-Instruct")
        else:  # local
            self.current_model = LocalModel(model_name, self.config)
            if not self.current_model.is_available():
                # Пробуем загрузить
                if isinstance(self.current_model, LocalModel):
                    self.current_model.load()
    
    def get_current_model(self) -> AIModel:
        """Получение текущей модели"""
        return self.current_model
    
    def switch_to_api(self, model_name: str = "mistral-small-latest") -> bool:
        """Переключение на API модель"""
        print(f"🔄 Переключение на API модель: {model_name}")
        
        new_model = MistralModel(model_name, self.config)
        
        if new_model.is_available():
            self.current_model = new_model
            self.current_provider = "api"
            self.current_model_name = model_name
            
            # Сохраняем в конфиг
            self.config.set('defaults.provider', 'api')
            self.config.set('defaults.model', model_name)
            
            print(f"✅ Переключено на {model_name}")
            return True
        else:
            print(f"❌ API модель {model_name} недоступна")
            return False
    
    def switch_to_local(self, model_name: str = "Qwen/Qwen2.5-0.5B-Instruct") -> bool:
        """Переключение на локальную модель"""
        print(f"🔄 Переключение на локальную модель: {model_name}")
        
        new_model = LocalModel(model_name, self.config)
        
        # Пробуем загрузить
        if new_model.load():
            self.current_model = new_model
            self.current_provider = "local"
            self.current_model_name = model_name
            
            # Сохраняем в конфиг
            self.config.set('defaults.provider', 'local')
            self.config.set('defaults.model', model_name)
            
            print(f"✅ Переключено на локальную модель {model_name}")
            return True
        else:
            print(f"❌ Не удалось загрузить локальную модель {model_name}")
            return False
    
    def get_available_models(self) -> Dict[str, List[Dict[str, Any]]]:
        """Получение списка доступных моделей"""
        available = {
            "api": [],
            "local": []
        }
        
        # API модели
        api_models = self.config.get('models.api.available', [])
        for model in api_models:
            model_info = model.copy()
            model_info['provider'] = 'api'
            model_info['type'] = 'api'
            model_info['current'] = (
                self.current_provider == 'api' and 
                self.current_model_name == model['name']
            )
            
            # Проверяем доступность Mistral
            if model['name'].startswith('mistral'):
                test_model = MistralModel(model['name'], self.config)
                model_info['available'] = test_model.is_available()
            
            available['api'].append(model_info)
        
        # Локальные модели
        local_models = self.config.get('models.local.available', [])
        for model in local_models:
            model_info = model.copy()
            model_info['provider'] = 'local'
            model_info['type'] = 'local'
            model_info['current'] = (
                self.current_provider == 'local' and 
                self.current_model_name == model['name']
            )
            
            # Проверяем совместимость
            model_info['compatible'] = self._check_local_compatibility(model['name'])
            available['local'].append(model_info)
        
        return available
    
    def _check_local_compatibility(self, model_name: str) -> bool:
        """Проверка совместимости локальной модели"""
        # Простая проверка - для CPU используем только легкие модели
        if not torch.cuda.is_available():
            return model_name in ["Qwen/Qwen2.5-0.5B-Instruct", "microsoft/phi-2"]
        return True
    
    def get_system_info(self) -> Dict[str, Any]:
        """Информация о системе"""
        info = {
            "system": {
                "cuda_available": torch.cuda.is_available(),
                "torch_version": torch.__version__,
                "cpu_cores": psutil.cpu_count(),
                "total_ram_gb": psutil.virtual_memory().total / 1e9,
            },
            "current_model": {
                "provider": self.current_provider,
                "name": self.current_model_name,
                "available": self.current_model.is_available() if self.current_model else False,
            }
        }
        
        if torch.cuda.is_available():
            info['system']['gpu_name'] = torch.cuda.get_device_name(0)
            info['system']['gpu_memory_gb'] = torch.cuda.get_device_properties(0).total_memory / 1e9
        
        return info