import { useEffect, useRef } from 'react'

function TelegramLogin({ botName, onAuth }) {
  const widgetRef = useRef(null)

  useEffect(() => {
    if (!botName || !widgetRef.current) return undefined

    const handleAuth = (user) => {
      onAuth?.(user)
    }

    window.handleTelegramAuth = handleAuth

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-userpic', 'false')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', 'handleTelegramAuth(user)')

    widgetRef.current.innerHTML = ''
    widgetRef.current.appendChild(script)

    return () => {
      delete window.handleTelegramAuth
      if (widgetRef.current) widgetRef.current.innerHTML = ''
    }
  }, [botName, onAuth])

  return <div className="tg-login" ref={widgetRef} />
}

export default TelegramLogin
