import { useState, useRef, type KeyboardEvent } from 'react'
import { useTypingIndicator } from '@/hooks/useWebSocket'

interface Props { conversationId: number; onSend: (text: string) => Promise<void>; disabled?: boolean }

export function MessageInput({ conversationId, onSend, disabled = false }: Props) {
  const [text, setText]       = useState('')
  const [isSending, setIsSending] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const { sendTyping } = useTypingIndicator(conversationId)

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || isSending) return
    try {
      setIsSending(true)
      await onSend(trimmed)
      setText('')
      if (taRef.current) taRef.current.style.height = 'auto'
    } finally {
      setIsSending(false)
      taRef.current?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    sendTyping()
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }

  return (
    <div className="flex items-end gap-2 border-t border-gray-200 bg-white px-4 py-3">
      <textarea ref={taRef} rows={1} value={text} onChange={handleChange} onKeyDown={handleKeyDown}
        placeholder="Escribe un mensaje... (Enter para enviar)"
        disabled={disabled || isSending}
        className="flex-1 resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
        style={{ maxHeight: '120px' }} />

      <button onClick={handleSend} disabled={!text.trim() || isSending || disabled}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        aria-label="Enviar">
        {isSending
          ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 rotate-90">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>}
      </button>
    </div>
  )
}