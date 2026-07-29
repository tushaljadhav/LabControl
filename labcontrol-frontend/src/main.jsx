/**
 * main.jsx — Entry point for the React app
 *
 * This file mounts the App component into the HTML page.
 * React.StrictMode enables extra development warnings.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
