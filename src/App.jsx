import { useCallback, useMemo, useState } from 'react'
import TelegramLogin from './components/TelegramLogin'
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

  const filteredGroups = useMemo(() => {
    if (filter === 'channels') {
      return mockGroups.filter((g) => g.type === 'channel')
    }
    if (filter === 'groups') {
      return mockGroups.filter((g) => g.type === 'group')
    }
    return mockGroups
  }, [filter])

  const handleAuth = useCallback((tgUser) => {
    setUser(tgUser)
    setView(views.menu)
  }, [])

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
      </div>
      <div className="list">
        {filteredGroups.map((item) => (
          <div key={item.id} className="list-item">
            <div className="pill">{item.type === 'channel' ? 'Канал' : 'Группа'}</div>
            <div className="item-main">
              <div className="item-title">{item.title}</div>
              <div className="meta">
                {item.members.toLocaleString('ru-RU')} участников · {item.unread} непр.
              </div>
            </div>
          </div>
        ))}
        {!filteredGroups.length && (
          <div className="empty">Здесь появятся подписки после подключения API.</div>
        )}
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
      <div className="empty">Пока пусто, но всё готово к расширению.</div>
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
