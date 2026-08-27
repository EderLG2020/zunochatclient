/**
 * Id único generado en el cliente para reintentos idempotentes de envío de
 * mensajes (ver SendMessageRequest#clientMessageId en el backend) — si el
 * POST se reintenta (timeout de red, doble tap) con el mismo id, el backend
 * devuelve el mensaje ya creado en vez de duplicarlo.
 */
export function newClientMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
