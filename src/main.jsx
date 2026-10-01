import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const root = createRoot(document.getElementById('root'))
const render = (Component) => root.render(<StrictMode><Component /></StrictMode>)

if (import.meta.env.DEV && window.location.pathname === '/andin-preview') {
  import('./games/andin/DevPreview.jsx').then(({ default: Preview }) => render(Preview))
} else {
  render(App)
}
