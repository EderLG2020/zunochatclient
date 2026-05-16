# 1. Crear el proyecto

cp -r zunochat-frontend/ mi-proyecto/ && cd mi-proyecto/

# 2. Configurar las URLs del backend

cp .env.example .env

# Edita .env si tu backend NO corre en localhost:8080

# 3. Instalar dependencias

npm install

# 4. Levantar en desarrollo

npm run dev

# → Abre http://localhost:5173

RESUMEN DE ARQUITECTURA
src/
├── types/index.ts ← Todos los tipos/interfaces (espejo exacto de DTOs Java)
├── services/
│ ├── api.config.ts ← Axios + interceptors JWT + URL del backend ⭐
│ ├── auth.service.ts ← login, register, verify-otp
│ ├── conversation.service.ts ← list, create
│ ├── message.service.ts ← list, send, markRead
│ └── websocket.service.ts ← STOMP/SockJS singleton con todos los topics ⭐
├── context/
│ ├── AuthContext.tsx ← JWT + localStorage + conexión WS
│ └── ChatContext.tsx ← conversación activa + mensajes en memoria
├── hooks/
│ ├── useConversations.ts ← fetch + estado + refetch
│ ├── useMessages.ts ← fetch paginado + loadMore + inversión de orden
│ └── useWebSocket.ts ← suscripciones STOMP + debounce typing
├── routes/
│ ├── ProtectedRoute.tsx ← redirige a /login si no autenticado
│ └── PublicRoute.tsx ← redirige a /chat si ya autenticado
├── components/
│ ├── ui/ ← Spinner, Input, Button, ErrorMessage
│ ├── chat/ ← ConversationItem, MessageBubble, MessageInput
│ └── layout/ ← AppLayout (sidebar + main)
└── pages/
├── LoginPage.tsx ← formulario + manejo de errores del backend
├── RegisterPage.tsx ← flujo 2 pasos: register → verify-otp
├── ChatPage.tsx ← página principal (sidebar + chat activo)
└── NotFoundPage.tsx
