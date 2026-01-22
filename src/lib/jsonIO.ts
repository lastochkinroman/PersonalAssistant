export function exportJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function importJsonFromFile<T>(file: File): Promise<T> {
  const raw = await file.text()
  try {
    return JSON.parse(raw) as T
  } catch (error) {
    throw new Error(`Неверный формат JSON файла: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`)
  }
}

