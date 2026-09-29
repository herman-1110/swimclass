import '@fontsource/figtree/400.css'
import '@fontsource/figtree/500.css'
import '@fontsource/figtree/600.css'
import '@/app/styles/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'

const root = document.getElementById('root')
if (!root) throw new Error('index.html is missing the <div id="root"> element.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
