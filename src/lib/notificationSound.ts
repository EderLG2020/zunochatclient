import messageReceivedMp3 from "@/assets/sounds/message-received.mp3";

// Un solo <audio> reutilizado para todos los mensajes entrantes — Vite empaqueta
// el mp3 como asset con hash de contenido (dist/assets/message-received-<hash>.mp3),
// así que el navegador lo descarga UNA sola vez y lo sirve desde caché (immutable)
// en todas las visitas siguientes; no se vuelve a pedir al servidor en cada mensaje
// ni en cada apertura del navegador, salvo que el archivo cambie (el hash cambiaría).
const audio = new Audio(messageReceivedMp3);
audio.preload = "auto";
audio.volume = 0.5;

/**
 * Reproduce el sonido de "mensaje nuevo". Si el navegador todavía no
 * desbloqueó el audio (política de autoplay — hace falta al menos una
 * interacción previa del usuario en la página), play() rechaza la promesa;
 * no es un error real, así que se ignora en silencio.
 */
export function playMessageReceivedSound() {
  audio.currentTime = 0;
  void audio.play().catch(() => {});
}
