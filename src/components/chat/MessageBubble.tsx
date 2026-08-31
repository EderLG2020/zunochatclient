import { memo, useState } from 'react'
import type { MessageResponse } from '@/types'
import { messageService } from '@/services'
import { useChatStore } from '@/store/chatstore'
import { useChatColorStore } from '@/store/chatColorStore'
import { getChatColor } from '@/lib/chatColors'

function StatusIcon({ status }: { status: MessageResponse['status'] }) {
  if (status === 'READ')      return <span className="text-blue-400 text-xs">✓✓</span>
  if (status === 'DELIVERED') return <span className="text-gray-400 dark:text-gray-500 text-xs">✓✓</span>
  return <span className="text-gray-400 dark:text-gray-500 text-xs">✓</span>
}

interface Props { message: MessageResponse; currentUserId: number; isGroupStart?: boolean }

export const MessageBubble = memo(function MessageBubble({ message, currentUserId, isGroupStart = true }: Props) {
  const updateMessage = useChatStore((s) => s.updateMessage)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(message.textContent ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const isMine = message.senderId === currentUserId
  const time   = new Date(message.sentAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  // Color de "mis" burbujas — elegible por el usuario (por defecto azul, ver ChatColorPicker)
  const chatColorKey = useChatColorStore((s) => s.color)
  const chatColor = getChatColor(chatColorKey)

  // La ventana de 15 min para editar la valida el backend (MSG_EDIT_WINDOW_EXPIRED);
  // aquí solo se filtra por tipo/propiedad — evita depender de Date.now() en el
  // render (impuro) solo para una comprobación que igual se repite del lado servidor.
  const canEdit = isMine && !message.deleted && message.type === 'TEXT'
  const canDelete = isMine && !message.deleted

  const handleDelete = async () => {
    setMenuOpen(false)
    if (!confirm('¿Eliminar este mensaje?')) return
    const updated = await messageService.delete(message.messageId)
    updateMessage(updated)
  }

  const handleSaveEdit = async () => {
    const trimmed = editText.trim()
    if (!trimmed || trimmed === message.textContent) { setIsEditing(false); return }
    try {
      setIsSaving(true)
      setEditError(null)
      const updated = await messageService.edit(message.messageId, { textContent: trimmed })
      updateMessage(updated)
      setIsEditing(false)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setEditError(e.response?.data?.message ?? 'No se pudo editar el mensaje.')
    } finally {
      setIsSaving(false)
    }
  }

  if (message.deleted) {
    return (
      <div className={`animate-fade-in flex ${isMine ? 'justify-end' : 'justify-start'} ${isGroupStart ? 'mt-3' : 'mt-0.5'} mb-0.5`}>
        <div className="max-w-[70%] rounded-2xl px-3 py-2 italic text-xs text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 dark:text-gray-500">
          🚫 Mensaje eliminado
        </div>
      </div>
    )
  }

  return (
    <div className={`animate-fade-in-up group flex ${isMine ? 'justify-end' : 'justify-start'} ${isGroupStart ? 'mt-3' : 'mt-0.5'} mb-0.5`}>
      {isMine && (canEdit || canDelete) && !isEditing && (
        <div className="relative mr-1 self-center opacity-0 transition group-hover:opacity-100">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            aria-label="Opciones del mensaje"
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="animate-scale-in absolute right-0 top-full z-20 mt-1 w-32 origin-top-right overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {canEdit && (
                  <button
                    onClick={() => { setMenuOpen(false); setEditError(null); setIsEditing(true) }}
                    className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    ✏️ Editar
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    🗑️ Eliminar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className={`max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${isMine
        ? `rounded-tr-sm ${chatColor.bubble} text-white ${isGroupStart ? '' : 'rounded-tr-2xl'}`
        : `rounded-tl-sm bg-white text-gray-800 border border-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 ${isGroupStart ? '' : 'rounded-tl-2xl'}`}`}>

        {isEditing ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit() } if (e.key === 'Escape') setIsEditing(false) }}
              rows={2}
              className="w-full resize-none rounded-lg bg-white/10 px-2 py-1 text-sm text-inherit outline-none placeholder:text-current"
            />
            {editError && <p className="text-[11px] text-red-200">{editError}</p>}
            <div className="flex justify-end gap-2 text-[11px]">
              <button onClick={() => setIsEditing(false)} className="opacity-80 hover:opacity-100">Cancelar</button>
              <button onClick={handleSaveEdit} disabled={isSaving} className="font-semibold opacity-80 hover:opacity-100 disabled:opacity-40">
                {isSaving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {message.type === 'TEXT' && (
              <p className="text-sm leading-relaxed break-words">{message.textContent}</p>
            )}
            {message.type === 'FILE' && message.fileUrls?.length > 0 && (
              <div className="flex flex-col gap-1">
                {message.fileUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className={`text-sm underline ${isMine ? chatColor.bubbleTint : 'text-blue-500 dark:text-blue-400'}`}>
                    📎 Archivo {i + 1}
                  </a>
                ))}
              </div>
            )}
            {message.type === 'AUDIO' && message.fileUrls?.length > 0 && (
              <audio controls src={message.fileUrls[0]} className="h-10 max-w-full" style={{ minWidth: '220px' }} />
            )}
            {message.type === 'IMAGE' && message.fileUrls?.length > 0 && (
              <div className={`grid gap-1 ${message.fileUrls.length > 1 ? 'grid-cols-2' : ''}`}>
                {message.fileUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Imagen ${i + 1}`} className="max-h-64 w-full rounded-lg object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            )}
            {message.type === 'PAYLOAD' && (
              <pre className={`text-xs ${isMine ? chatColor.bubbleTint : 'text-gray-500 dark:text-gray-400'}`}>
                {JSON.stringify(message.payload, null, 2)}
              </pre>
            )}
          </>
        )}

        <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
          {message.editedAt && (
            <span className={`text-[10px] italic ${isMine ? chatColor.bubbleTint : 'text-gray-400 dark:text-gray-500'}`}>editado</span>
          )}
          {message.expiresAt && (
            <span title="Chat temporal — se autoelimina" className={isMine ? chatColor.bubbleTint : 'text-gray-400 dark:text-gray-500'}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3 w-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          )}
          <span className={`text-[10px] ${isMine ? chatColor.bubbleTint : 'text-gray-400 dark:text-gray-500'}`}>{time}</span>
          {isMine && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  )
})
