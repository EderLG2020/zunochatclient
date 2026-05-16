import type { MessageResponse } from '@/types'

function StatusIcon({ status }: { status: MessageResponse['status'] }) {
  if (status === 'READ')      return <span className="text-blue-400 text-xs">✓✓</span>
  if (status === 'DELIVERED') return <span className="text-gray-400 text-xs">✓✓</span>
  return <span className="text-gray-400 text-xs">✓</span>
}

interface Props { message: MessageResponse; currentUserId: number }

export function MessageBubble({ message, currentUserId }: Props) {
  const isMine = message.senderId === currentUserId
  const time   = new Date(message.sentAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
      <div className={`max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${isMine ? 'rounded-tr-sm bg-blue-500 text-white' : 'rounded-tl-sm bg-white text-gray-800 border border-gray-100'}`}>

        {message.type === 'TEXT' && (
          <p className="text-sm leading-relaxed break-words">{message.textContent}</p>
        )}
        {message.type === 'FILE' && message.fileUrls?.length > 0 && (
          <div className="flex flex-col gap-1">
            {message.fileUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                className={`text-sm underline ${isMine ? 'text-blue-100' : 'text-blue-500'}`}>
                📎 Archivo {i + 1}
              </a>
            ))}
          </div>
        )}
        {message.type === 'PAYLOAD' && (
          <pre className={`text-xs ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
            {JSON.stringify(message.payload, null, 2)}
          </pre>
        )}

        <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>{time}</span>
          {isMine && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  )
}