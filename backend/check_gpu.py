import torch
import sys

print("=" * 60)
print("ПОСЛЕ УСТАНОВКИ - ПРОВЕРКА")
print("=" * 60)

print(f"\n1. PyTorch версия: {torch.__version__}")
print(f"2. CUDA доступно: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    print(f"3. GPU устройств: {torch.cuda.device_count()}")
    for i in range(torch.cuda.device_count()):
        print(f"   GPU {i}: {torch.cuda.get_device_name(i)}")
        props = torch.cuda.get_device_properties(i)
        print(f"     Память: {props.total_memory / 1e9:.1f} GB")
        print(f"     CUDA Capability: {props.major}.{props.minor}")
    
    print(f"\n4. CUDA версия PyTorch: {torch.version.cuda}")
    print(f"5. Текущее устройство: {torch.cuda.current_device()}")
    
    # Тест памяти
    print("\n6. Тест памяти GPU:")
    torch.cuda.reset_peak_memory_stats()
    
    # Создаем тензор на GPU
    x = torch.randn(1000, 1000, device='cuda')
    y = torch.randn(1000, 1000, device='cuda')
    z = x @ y  # Матричное умножение
    
    allocated = torch.cuda.memory_allocated() / 1e9
    reserved = torch.cuda.memory_reserved() / 1e9
    total = torch.cuda.get_device_properties(0).total_memory / 1e9
    
    print(f"   Выделено: {allocated:.2f} GB")
    print(f"   Зарезервировано: {reserved:.2f} GB")
    print(f"   Всего: {total:.1f} GB")
    print(f"   Свободно: {total - allocated:.1f} GB")
    
    # Очищаем
    del x, y, z
    torch.cuda.empty_cache()
    
    print("\n✅ GPU работает корректно!")
else:
    print("\n❌ CUDA недоступна. Возможные причины:")
    print("   - Не установлен CUDA Toolkit")
    print("   - Неправильная версия PyTorch")
    print("   - Проблемы с драйверами")
    print("\nПроверьте: python -c \"import torch; print(torch.cuda.is_available())\"")

print("\n" + "=" * 60)