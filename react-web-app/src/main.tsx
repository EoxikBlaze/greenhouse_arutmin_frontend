import { StrictMode, startTransition } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/inter/latin-800.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-600.css'
import '@fontsource/space-grotesk/latin-700.css'
import './index.css'
import './tema-gelap.otomatis.css'
import './tema-gelap.css'
import { router } from './router'
import { AuthProvider } from './lib/auth'
import { mulaiTema } from './lib/tema'

mulaiTema()

const akar = createRoot(document.getElementById('root')!)

// Render pertama sebagai transisi: React memotongnya per ±5 ms (bisa menyela) sehingga tidak
// ada satu task panjang yang memblokir main thread di perangkat lambat. Kerangka statis di
// #root tetap tampil sampai hasil render siap.
startTransition(() => {
  akar.render(
    <StrictMode>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </StrictMode>,
  )
})
