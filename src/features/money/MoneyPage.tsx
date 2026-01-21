import { useMemo, useState } from 'react'
import type { AppSettings, MoneyData, MoneyTransaction, MoneyTxType } from '../../lib/appData'
import { todayISO, uid } from '../../lib/ids'

type Props = {
  money: MoneyData
  onChange: (money: MoneyData) => void
  settings: AppSettings
  onSettingsChange: (settings: AppSettings) => void
}

function monthKey(dateISO: string) {
  return dateISO.slice(0, 7) // YYYY-MM
}

export function MoneyPage({ money, onChange, settings, onSettingsChange }: Props) {
  const [type, setType] = useState<MoneyTxType>('expense')
  const [amount, setAmount] = useState<string>('')
  const [date, setDate] = useState<string>(todayISO())
  const [category, setCategory] = useState<string>(money.categories[0] ?? 'Прочее')
  const [note, setNote] = useState<string>('')
  const [month, setMonth] = useState<string>(monthKey(todayISO()))

  const fmt = useMemo(() => {
    try {
      return new Intl.NumberFormat(settings.locale, { style: 'currency', currency: settings.currency, maximumFractionDigits: 2 })
    } catch {
      return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })
    }
  }, [settings.currency, settings.locale])

  const txsForMonth = useMemo(() => {
    return money.transactions
      .filter((t) => monthKey(t.date) === month)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
  }, [money.transactions, month])

  const summary = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of txsForMonth) {
      if (t.type === 'income') income += t.amount
      else expense += t.amount
    }
    const net = income - expense
    return { income, expense, net }
  }, [txsForMonth])

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of txsForMonth) {
      if (t.type !== 'expense') continue
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [txsForMonth])

  return (
    <div className="grid2">
      <section className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Финансы</div>
            <div className="muted" style={{ fontSize: 12 }}>Доходы/расходы по месяцам + быстрый ввод.</div>
          </div>
          <div className="row">
            <span className="pill">Месяц</span>
            <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        </div>

        <div className="grid3">
          <div className="item">
            <div className="muted">Доход</div>
            <div className="itemTitle">{fmt.format(summary.income)}</div>
          </div>
          <div className="item">
            <div className="muted">Расход</div>
            <div className="itemTitle">{fmt.format(summary.expense)}</div>
          </div>
          <div className="item">
            <div className="muted">Итого</div>
            <div className="itemTitle" style={{ color: summary.net >= 0 ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)' }}>
              {fmt.format(summary.net)}
            </div>
          </div>
        </div>

        <hr className="hr" />

        <div className="grid2">
          <div className="item">
            <div className="itemTop">
              <div className="itemTitle">Категории (расходы)</div>
              <span className="pill">{byCategory.length}</span>
            </div>
            {byCategory.length === 0 ? (
              <div className="muted">Пока нет расходов за выбранный месяц.</div>
            ) : (
              <div className="list">
                {byCategory.slice(0, 8).map(([cat, sum]) => (
                  <div key={cat} className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="pill">{cat}</span>
                    <span className="pill">{fmt.format(sum)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="item">
            <div className="itemTop">
              <div className="itemTitle">Настройки</div>
            </div>
            <div className="grid2">
              <div className="field">
                <div className="label">Locale</div>
                <input className="input" value={settings.locale} onChange={(e) => onSettingsChange({ ...settings, locale: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Валюта</div>
                <input
                  className="input"
                  value={settings.currency}
                  onChange={(e) => onSettingsChange({ ...settings, currency: e.target.value.toUpperCase() })}
                  placeholder="RUB"
                />
              </div>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Пример: <span className="pill">ru-RU</span> + <span className="pill">RUB</span>
            </div>
          </div>
        </div>

        <hr className="hr" />

        <div className="cardHeader" style={{ marginBottom: 8 }}>
          <div className="cardTitle">Операции</div>
          <span className="pill">{txsForMonth.length}</span>
        </div>

        <div className="list">
          {txsForMonth.length === 0 ? (
            <div className="muted">Операций нет.</div>
          ) : (
            txsForMonth.map((t) => (
              <div key={t.id} className="item">
                <div className="itemTop">
                  <div className="row">
                    <span className="pill">{t.date}</span>
                    <span className="pill">{t.type === 'income' ? 'Доход' : 'Расход'}</span>
                    <span className="pill">{t.category}</span>
                  </div>
                  <div className="row">
                    <span className="pill" style={{ fontWeight: 800 }}>
                      {t.type === 'income' ? '+' : '-'}
                      {fmt.format(t.amount)}
                    </span>
                    <button
                      className="btn btnDanger"
                      type="button"
                      onClick={() => onChange({ ...money, transactions: money.transactions.filter((x) => x.id !== t.id) })}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
                {t.note ? <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>{t.note}</div> : null}
              </div>
            ))
          )}
        </div>
      </section>

      <aside className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Добавить операцию</div>
            <div className="muted" style={{ fontSize: 12 }}>Доход или расход — в пару кликов.</div>
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <div className="label">Тип</div>
            <select className="select" value={type} onChange={(e) => setType(e.target.value as MoneyTxType)}>
              <option value="expense">Расход</option>
              <option value="income">Доход</option>
            </select>
          </div>
          <div className="field">
            <div className="label">Дата</div>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <div className="label">Сумма</div>
          <input
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="например 1200"
            inputMode="decimal"
          />
        </div>

        <div className="field">
          <div className="label">Категория</div>
          <div className="row">
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} style={{ flex: 1 }}>
              {money.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              className="btn"
              type="button"
              onClick={() => {
                const name = window.prompt('Новая категория (название):')
                const trimmed = (name ?? '').trim()
                if (!trimmed) return
                if (money.categories.includes(trimmed)) {
                  setCategory(trimmed)
                  return
                }
                onChange({ ...money, categories: [...money.categories, trimmed] })
                setCategory(trimmed)
              }}
            >
              + Категория
            </button>
          </div>
        </div>

        <div className="field">
          <div className="label">Заметка</div>
          <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="магазин, комментарий, ссылка…" />
        </div>

        <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setType('expense')
              setAmount('')
              setDate(todayISO())
              setCategory(money.categories[0] ?? 'Прочее')
              setNote('')
            }}
          >
            Очистить
          </button>

          <button
            className="btn btnPrimary"
            type="button"
            onClick={() => {
              const parsed = Number(String(amount).replace(',', '.'))
              if (!Number.isFinite(parsed) || parsed <= 0) return
              const now = new Date().toISOString()
              const tx: MoneyTransaction = {
                id: uid('tx'),
                date,
                type,
                amount: parsed,
                category: category.trim() || 'Прочее',
                note: note.trim() ? note.trim() : undefined,
                createdAt: now,
                updatedAt: now,
              }
              onChange({ ...money, transactions: [tx, ...money.transactions] })
              setAmount('')
              setNote('')
              setMonth(monthKey(date))
            }}
          >
            Добавить
          </button>
        </div>
      </aside>
    </div>
  )
}

