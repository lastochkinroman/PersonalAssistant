import { useEffect, useMemo, useState } from 'react'
import type { AppSettings, MoneyData, MoneyTransaction, MoneyTxType, Account } from '../../lib/appData'
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
  const [category, setCategory] = useState<string>(money.categories?.[0] ?? 'Прочее')
  const [accountId, setAccountId] = useState<string>(money.accounts?.[0]?.id ?? '')
  const [note, setNote] = useState<string>('')
  const [month, setMonth] = useState<string>(monthKey(todayISO()))

  // Account creation state
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountIncludeInTotal, setNewAccountIncludeInTotal] = useState(true)

  // UI state for expandable sections
  const [showAccounts, setShowAccounts] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

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

  // Calculate account balances based on transactions
  const accountsWithBalances = useMemo(() => {
    if (!money.accounts || money.accounts.length === 0) return []
    const accountsMap = new Map(money.accounts.map(acc => [acc.id, { ...acc, calculatedBalance: acc.balance }]))

    // Apply transactions to account balances
    for (const tx of money.transactions) {
      if (!tx.accountId) continue
      const account = accountsMap.get(tx.accountId)
      if (!account) continue

      if (tx.type === 'income') {
        account.calculatedBalance += tx.amount
      } else {
        account.calculatedBalance -= tx.amount
      }
    }

    return Array.from(accountsMap.values())
  }, [money.accounts, money.transactions])

  // Calculate total balance (only accounts included in total)
  const totalBalance = useMemo(() => {
    return accountsWithBalances
      .filter(acc => acc.includeInTotal)
      .reduce((sum, acc) => sum + acc.calculatedBalance, 0)
  }, [accountsWithBalances])

  // Safety check - if no accounts, create default one
  useEffect(() => {
    if (!money.accounts || money.accounts.length === 0) {
      const now = new Date().toISOString()
      const defaultAccount = {
        id: 'default',
        name: 'Основной счёт',
        balance: 0,
        includeInTotal: true,
        createdAt: now,
        updatedAt: now,
      }
      onChange({
        ...money,
        accounts: [defaultAccount]
      })
    }
  }, [money, onChange])

  return (
    <div className="pageContainer">
      <div className="grid2">
      <section className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Финансы</div>
            <div className="muted" style={{ fontSize: 12 }}>Баланс и быстрый ввод операций</div>
          </div>
          <div className="row">
            <span className="pill">Месяц</span>
            <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        </div>

        <div className="grid2">
          <div className="item">
            <div className="muted">Общий баланс</div>
            <div className="itemTitle" style={{ color: totalBalance >= 0 ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)' }}>
              {fmt.format(totalBalance)}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              Только счета включённые в итог
            </div>
          </div>
          <div className="item">
            <div className="muted">За месяц</div>
            <div className="itemTitle" style={{ color: summary.net >= 0 ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)' }}>
              {fmt.format(summary.net)}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              {fmt.format(summary.income)} доход · {fmt.format(summary.expense)} расход
            </div>
          </div>
        </div>

        <hr className="hr" />

        {/* Quick access buttons */}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button
            className={`btn ${showCategories ? 'btnPrimary' : 'btnGhost'}`}
            onClick={() => setShowCategories(!showCategories)}
          >
            Категории ({byCategory.length})
          </button>
          <button
            className={`btn ${showAccounts ? 'btnPrimary' : 'btnGhost'}`}
            onClick={() => setShowAccounts(!showAccounts)}
          >
            Счета ({accountsWithBalances.length})
          </button>
          <button
            className={`btn ${showSettings ? 'btnPrimary' : 'btnGhost'}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            Настройки
          </button>
        </div>

        {/* Expandable sections */}
        {showCategories && (
          <>
            <hr className="hr" />
            <div className="item">
              <div className="itemTop">
                <div className="itemTitle">Категории расходов</div>
                <span className="pill">{byCategory.length}</span>
              </div>
              {byCategory.length === 0 ? (
                <div className="muted">Пока нет расходов за выбранный месяц.</div>
              ) : (
                <div className="list">
                  {byCategory.map(([cat, sum]) => (
                    <div key={cat} className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="pill">{cat}</span>
                      <span className="pill">{fmt.format(sum)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="field" style={{ marginTop: 12 }}>
                <div className="label">Новая категория</div>
                <div className="row">
                  <input
                    className="input"
                    placeholder="Название категории"
                    style={{ flex: 1 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = (e.target as HTMLInputElement).value.trim()
                        if (!value) return
                        if (money.categories.includes(value)) return
                        onChange({ ...money, categories: [...money.categories, value] })
                        ;(e.target as HTMLInputElement).value = ''
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {showAccounts && (
          <>
            <hr className="hr" />
            <div className="item">
              <div className="itemTop">
                <div className="itemTitle">Управление счетами</div>
                <span className="pill">{accountsWithBalances.length}</span>
              </div>
              <div className="list" style={{ maxHeight: 200, overflowY: 'auto' }}>
                {accountsWithBalances.map((account) => (
                  <div key={account.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="pill">{account.name}</span>
                      {!account.includeInTotal && (
                        <span className="pill" style={{ background: 'rgba(156, 163, 175, 0.5)', marginLeft: 4 }}>
                          Исключён
                        </span>
                      )}
                    </div>
                    <span className="pill" style={{
                      color: account.calculatedBalance >= 0 ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
                      fontWeight: 'bold'
                    }}>
                      {fmt.format(account.calculatedBalance)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <div className="label">Создать новый счёт</div>
                <div className="row">
                  <input
                    className="input"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    placeholder="Название счёта"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn"
                    onClick={() => {
                      const name = newAccountName.trim()
                      if (!name) return
                      const now = new Date().toISOString()
                      const newAccount: Account = {
                        id: uid('account'),
                        name,
                        balance: 0,
                        includeInTotal: newAccountIncludeInTotal,
                        createdAt: now,
                        updatedAt: now,
                      }
                      onChange({
                        ...money,
                        accounts: [...money.accounts, newAccount]
                      })
                      setNewAccountName('')
                      setAccountId(newAccount.id) // Select newly created account
                    }}
                  >
                    Создать
                  </button>
                </div>
                <div className="row" style={{ marginTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={newAccountIncludeInTotal}
                      onChange={(e) => setNewAccountIncludeInTotal(e.target.checked)}
                    />
                    <span className="muted" style={{ fontSize: 12 }}>
                      Включать в общий баланс
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </>
        )}

        {showSettings && (
          <>
            <hr className="hr" />
            <div className="item">
              <div className="itemTitle">Настройки приложения</div>
              <div className="grid2">
                <div className="field">
                  <div className="label">Локаль</div>
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
                Примеры: <span className="pill">ru-RU</span> + <span className="pill">RUB</span> | <span className="pill">en-US</span> + <span className="pill">USD</span>
              </div>
            </div>
          </>
        )}

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
                    <div>
                      <span className="pill" style={{ fontWeight: 800 }}>
                        {t.type === 'income' ? '+' : '-'}
                        {fmt.format(t.amount)}
                      </span>
                      {t.accountId && (
                        <span className="pill" style={{ marginLeft: 4, background: 'rgba(99, 102, 241, 0.2)' }}>
                          {money.accounts.find(a => a.id === t.accountId)?.name ?? 'Неизвестный счёт'}
                        </span>
                      )}
                    </div>
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
          <div className="label">Счёт</div>
          <select className="select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accountsWithBalances.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({fmt.format(account.calculatedBalance)})
              </option>
            ))}
          </select>
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
              setCategory(money.categories?.[0] ?? 'Прочее')
              setAccountId(money.accounts?.[0]?.id ?? '')
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
              if (!Number.isFinite(parsed) || parsed <= 0 || !accountId) return
              const now = new Date().toISOString()
              const tx: MoneyTransaction = {
                id: uid('tx'),
                date,
                type,
                amount: parsed,
                category: category.trim() || 'Прочее',
                accountId,
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
    </div>
  )
}

