export function uid(prefix: string) {
  const rand = Math.random().toString(16).slice(2)
  const ts = Date.now().toString(16)
  return `${prefix}_${ts}_${rand}`
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

