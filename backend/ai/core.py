"""
Базовые интерфейсы для AI моделей
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import yaml
import os


class AIModel(ABC):
    """Абстрактный класс для AI моделей"""
    
    @abstractmethod
    def generate(self, messages: List[Dict[str, str]], context: Dict[str, Any]) -> str:
        """Генерация ответа"""
        pass
    
    @abstractmethod
    def get_info(self) -> Dict[str, Any]:
        """Информация о модели"""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Доступность модели"""
        pass


class Config:
    """Конфигурация AI системы"""
    
    def __init__(self, config_path: str = "config.yaml"):
        self.config_path = config_path
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Загрузка конфигурации"""
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        else:
            return self._default_config()
    
    def _default_config(self) -> Dict[str, Any]:
        """Конфигурация по умолчанию"""
        return {
            'models': {
                'local': {
                    'default': 'Qwen/Qwen2.5-0.5B-Instruct',
                    'available': [
                        {'name': 'Qwen/Qwen2.5-0.5B-Instruct', 'id': 'qwen-0.5b'},
                        {'name': 'Qwen/Qwen2.5-1.5B-Instruct', 'id': 'qwen-1.5b'},
                    ]
                },
                'api': {
                    'default': 'mistral-small-latest',
                    'available': [
                        {'name': 'mistral-small-latest', 'id': 'mistral-small'},
                        {'name': 'mistral-medium-latest', 'id': 'mistral-medium'},
                    ]
                }
            },
            'defaults': {
                'provider': 'api',
                'model': 'mistral-small-latest'
            },
            'mistral': {
                'api_key': os.environ.get('MISTRAL_API_KEY', ''),
                'base_url': 'https://api.mistral.ai/v1',
                'timeout': 30
            }
        }
    
    def save(self):
        """Сохранение конфигурации"""
        with open(self.config_path, 'w', encoding='utf-8') as f:
            yaml.dump(self.config, f, default_flow_style=False, allow_unicode=True)
    
    def get(self, key: str, default: Any = None) -> Any:
        """Получение значения из конфигурации"""
        keys = key.split('.')
        value = self.config
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        return value
    
    def set(self, key: str, value: Any):
        """Установка значения в конфигурации"""
        keys = key.split('.')
        config = self.config
        for i, k in enumerate(keys[:-1]):
            if k not in config:
                config[k] = {}
            config = config[k]
        config[keys[-1]] = value
        self.save()