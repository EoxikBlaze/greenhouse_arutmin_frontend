import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import '@fontsource/inter/latin.css'
import '@fontsource/space-grotesk/latin.css'
import './index.css'
import './tema-gelap.otomatis.css'
import './tema-gelap.css'
import { router } from './router'
import { AuthProvider } from './lib/auth'
import { mulaiTema } from './lib/tema'

mulaiTema()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
