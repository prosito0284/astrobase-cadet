import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fuentes guardadas dentro del sitio (no Google Fonts): Google no recibe la IP de
// cada niño que juega, la CSP queda más cerrada y funcionan sin internet.
import '@fontsource/plus-jakarta-sans/latin-400.css'
import '@fontsource/plus-jakarta-sans/latin-500.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'
import '@fontsource/plus-jakarta-sans/latin-700.css'
import '@fontsource/plus-jakarta-sans/latin-800.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import './index.css'
import Root from './Root.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)

// Jugar sin internet: guarda el juego en el navegador después de la primera visita.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* sin service worker el juego funciona igual, solo necesita internet */
    })
  })
}
