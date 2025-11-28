import { useCallback, useEffect, useMemo, useState } from 'react'
import TelegramLogin from './components/TelegramLogin'
import { supabase } from './supabaseClient'
import './App.css'

const mockGroups = [
  { id: 1, title: 'Новости города', type: 'channel', members: 12840, unread: 3 },
  { id: 2, title: 'Работа / Вакансии', type: 'group', members: 870, unread: 12 },
  { id: 3, title: 'Клиенты и заявки', type: 'group', members: 143, unread: 0 },
  { id: 4, title: 'Маркетинг инсайды', type: 'channel', members: 4560, unread: 1 },
  { id: 5, title: 'Соседи дома 8', type: 'group', members: 63, unread: 4 },
  { id: 6, title: 'Курсы по продукту', type: 'channel', members: 920, unread: 0 },
]

const views = {
  auth: 'auth',
  menu: 'menu',
  groups: 'groups',
  keywords: 'keywords',
}

function App() {
  const botName = import.meta.env.VITE_TELEGRAM_BOT
  const [user, setUser] = useState(null)
  const [view, setView] = useState(views.auth)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [groups, setGroups] = useState(mockGroups)
  const [selectedGroupIds, setSelectedGroupIds] = useState(new Set())
  const [keywords, setKeywords] = useState([])
  const [newKeyword, setNewKeyword] = useState('')
  const [loadingData, setLoadingData] = useState(false)

  const handleAuth = useCallback((tgUser) => {
    setUser(tgUser)
    setView(views.menu)
  }, [])

  useEffect(() => {
    const webApp = window.Telegram?.WebApp
    const tgUser = webApp?.initDataUnsafe?.user
    if (tgUser && !user) {
      webApp.ready?.()
      handleAuth(tgUser)
    }
  }, [handleAuth, user])

  useEffect(() => {
    if (!user || !supabase) return
    const loadData = async () => {
      try {
        setLoadingData(true)
        const { data: groupRows, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (!groupError && groupRows) {
          setGroups(
            groupRows.map((g) => ({
              ...g,
              id: g.id,
              members: g.members || 0,
              unread: g.unread || 0,
              selected: g.selected || false,
            })),
          )
          setSelectedGroupIds(new Set(groupRows.filter((g) => g.selected).map((g) => g.id)))
        }

        const { data: keywordRows, error: keywordError } = await supabase
          .from('keywords')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (!keywordError && keywordRows) {
          setKeywords(keywordRows)
        }
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [user])

  const persistGroupSelection = async (nextGroups) => {
    if (!supabase || !user) return
    const rows = nextGroups.map((g) => ({
      id: g.id > 1000000 ? null : g.id,
      user_id: user.id,
      title: g.title,
      type: g.type,
      members: g.members || 0,
      unread: g.unread || 0,
      selected: g.selected || false,
    }))
    await supabase.from('groups').upsert(rows, { onConflict: 'id' })
  }

  const persistKeyword = async (value) => {
    if (!supabase || !user) return null
    const { data } = await supabase
      .from('keywords')
      .insert({ user_id: user.id, value })
      .select()
      .single()
    return data
  }

  const removeKeyword = async (id) => {
    if (!supabase || !user) return
    await supabase.from('keywords').delete().eq('id', id).eq('user_id', user.id)
  }

  const filteredGroups = useMemo(() => {
    if (filter === 'channels') {
      return groups.filter((g) => g.type === 'channel')
    }
    if (filter === 'groups') {
      return groups.filter((g) => g.type === 'group')
    }
    return groups
  }, [filter, groups])

  const searchedGroups = useMemo(() => {
    if (!search.trim()) return filteredGroups
    const term = search.toLowerCase()
    return filteredGroups.filter((g) => g.title.toLowerCase().includes(term))
  }, [filteredGroups, search])

  const handleMockAuth = () => {
    handleAuth({
      id: 0,
      first_name: 'Demo',
      username: 'demo_user',
    })
  }

  const reset = () => {
    setUser(null)
    setView(views.auth)
    setGroups(mockGroups)
    setSelectedGroupIds(new Set())
    setKeywords([])
    setSearch('')
  }

  const toggleSelect = (id) => {
    const next = new Set(selectedGroupIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedGroupIds(next)
    const nextGroups = groups.map((g) =>
      g.id === id ? { ...g, selected: next.has(id) } : g,
    )
    setGroups(nextGroups)
    persistGroupSelection(nextGroups)
  }

  const addManualGroup = async () => {
    const title = window.prompt('Введите название группы или канала')
    if (!title) return
    const type = window.prompt('Тип: group или channel', 'group')
    const cleanType = type === 'channel' ? 'channel' : 'group'
    const newItem = {
      id: Date.now(),
      title,
      type: cleanType,
      members: 0,
      unread: 0,
      selected: true,
    }
    const nextGroups = [newItem, ...groups]
    setGroups(nextGroups)
    const nextSelected = new Set(selectedGroupIds)
    nextSelected.add(newItem.id)
    setSelectedGroupIds(nextSelected)

    if (supabase && user) {
      const { data } = await supabase
        .from('groups')
        .insert({
          user_id: user.id,
          title,
          type: cleanType,
          members: 0,
          unread: 0,
          selected: true,
        })
        .select()
        .single()
      if (data?.id) {
        const mapped = nextGroups.map((g) =>
          g.id === newItem.id ? { ...g, id: data.id } : g,
        )
        setGroups(mapped)
        const updatedSelected = new Set(
          Array.from(nextSelected).map((val) => (val === newItem.id ? data.id : val)),
        )
        setSelectedGroupIds(updatedSelected)
      }
    }
  }

  const addKeyword = async () => {
    const value = newKeyword.trim()
    if (!value) return
    if (supabase && user) {
      const saved = await persistKeyword(value)
      if (saved) {
        setKeywords((prev) => [saved, ...prev])
      }
    } else {
      setKeywords((prev) => [{ id: Date.now(), value }, ...prev])
    }
    setNewKeyword('')
  }

  const deleteKeyword = async (id) => {
    if (supabase && user) {
      await removeKeyword(id)
    }
    setKeywords((prev) => prev.filter((k) => k.id !== id))
  }

  const renderAuth = () => (
    <div className="card">
      <div className="eyebrow">Вход</div>
      <h1>Авторизуйтесь через Telegram</h1>
      <p className="subtitle">
        После входа вы перейдёте к меню с группами, каналами и настройками ключевых
        слов. Укажите имя бота в переменной <code>VITE_TELEGRAM_BOT</code>, чтобы
        отрисовать официальный виджет авторизации.
      </p>
      {botName ? (
        <TelegramLogin botName={botName} onAuth={handleAuth} />
      ) : (
        <div className="warning">
          Не задан <code>VITE_TELEGRAM_BOT</code>. Добавьте имя бота в .env, чтобы
          включить вход через Telegram.
        </div>
      )}
      <button className="ghost" type="button" onClick={handleMockAuth}>
        Пропустить и посмотреть демо
      </button>
    </div>
  )

  const renderMenu = () => (
    <div className="card">
      <div className="eyebrow">Меню</div>
      <div className="user-strip">
        <div className="avatar">{(user?.first_name || 'T')[0]}</div>
        <div>
          <div className="user-name">
            {user?.first_name} {user?.last_name}
          </div>
          <div className="user-username">@{user?.username || 'demo_user'}</div>
        </div>
        <button className="text-btn" type="button" onClick={reset}>
          Выйти
        </button>
      </div>
      <div className="menu-grid">
        <button className="primary" type="button" onClick={() => setView(views.groups)}>
          Группы / Каналы
          <span className="hint">Список подписок</span>
        </button>
        <button
          className="secondary"
          type="button"
          onClick={() => setView(views.keywords)}
        >
          Ключевые слова
          <span className="hint">Настройки скоро</span>
        </button>
      </div>
    </div>
  )

  const renderGroups = () => (
    <div className="card">
      <div className="section-head">
        <div>
          <div className="eyebrow clickable" onClick={() => setView(views.menu)}>
            ← Назад к меню
          </div>
          <h2>Ваши группы и каналы</h2>
          <p className="subtitle">
            Сейчас показаны демо-данные. Подключите запрос к Telegram API, чтобы
            вывести реальные подписки пользователя.
          </p>
        </div>
        <div className="filters">
          <div className="chip-row">
            <button
              className={filter === 'all' ? 'chip active' : 'chip'}
              type="button"
              onClick={() => setFilter('all')}
            >
              Все
            </button>
            <button
              className={filter === 'groups' ? 'chip active' : 'chip'}
              type="button"
              onClick={() => setFilter('groups')}
            >
              Группы
            </button>
            <button
              className={filter === 'channels' ? 'chip active' : 'chip'}
              type="button"
              onClick={() => setFilter('channels')}
            >
              Каналы
            </button>
          </div>
          <div className="actions-row">
            <input
              className="search"
              placeholder="Поиск по названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="ghost" type="button" onClick={addManualGroup}>
              + Добавить группу/канал вручную
            </button>
          </div>
        </div>
      </div>
      {loadingData && <div className="muted">Загружаем данные...</div>}
      <div className="list">
        {searchedGroups.map((item) => (
          <label key={item.id} className="list-item selectable">
            <input
              type="checkbox"
              checked={selectedGroupIds.has(item.id)}
              onChange={() => toggleSelect(item.id)}
            />
            <div className="pill">{item.type === 'channel' ? 'Канал' : 'Группа'}</div>
            <div className="item-main">
              <div className="item-title">{item.title}</div>
              <div className="meta">
                {item.members.toLocaleString('ru-RU')} участников · {item.unread} непр.
              </div>
            </div>
          </label>
        ))}
        {!searchedGroups.length && (
          <div className="empty">
            Ничего не найдено. Попробуйте изменить запрос или добавить группу.
          </div>
        )}
      </div>
      <div className="actions-row end">
        <div className="muted">
          Отмечено: {selectedGroupIds.size} · сохраняется автоматически{''}
          {supabase ? ' в Supabase' : ' локально'}
        </div>
        <button
          className="primary compact"
          type="button"
          disabled={!selectedGroupIds.size}
          onClick={() => persistGroupSelection(groups)}
        >
          Сохранить выбор
        </button>
      </div>
    </div>
  )

  const renderKeywords = () => (
    <div className="card">
      <div className="section-head">
        <div>
          <div className="eyebrow clickable" onClick={() => setView(views.menu)}>
            ← Назад к меню
          </div>
          <h2>Ключевые слова</h2>
          <p className="subtitle">
            Подготовлено место под настройки ключевых слов (поиск, уведомления, правила
            фильтрации). Добавьте форму или интеграцию, когда будет готов сервер.
          </p>
        </div>
      </div>
      <div className="keyword-row">
        <input
          className="search"
          placeholder="Добавьте ключевое слово"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
        />
        <button className="primary compact" type="button" onClick={addKeyword}>
          Добавить
        </button>
      </div>
      <div className="list">
        {keywords.map((k) => (
          <div key={k.id} className="list-item keyword">
            <div className="item-title">{k.value}</div>
            <button className="text-btn danger" type="button" onClick={() => deleteKeyword(k.id)}>
              Удалить
            </button>
          </div>
        ))}
        {!keywords.length && <div className="empty">Пока нет ключевых слов.</div>}
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="hero">
        <div>
          <div className="eyebrow muted">Лид-магнит</div>
          <h1>Мини-приложение с входом через Telegram</h1>
          <p className="subtitle">
            Авторизуйтесь, чтобы посмотреть демо-страницы: меню, список групп и задел
            под ключевые слова.
          </p>
        </div>
        <div className="glow" />
      </div>
      {view === views.auth && renderAuth()}
      {view === views.menu && renderMenu()}
      {view === views.groups && renderGroups()}
      {view === views.keywords && renderKeywords()}
    </div>
  )
}

export default App
