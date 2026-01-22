export function uid(prefix: string) {
  const ts = Date.now().toString(16)
  let rand: string

  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    rand = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  } else {
    // Fallback for environments without crypto.randomUUID
    rand = Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10)
  }

  return `${prefix}_${ts}_${rand}`
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

