import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AccessGate } from './components/AccessGate'
// 自托管字体（打包进构建，国内无需访问 Google Fonts）
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/jetbrains-mono/300.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/merriweather/300.css'
import '@fontsource/merriweather/400.css'
import '@fontsource/merriweather/700.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AccessGate>
      <App />
    </AccessGate>
  </React.StrictMode>,
)
