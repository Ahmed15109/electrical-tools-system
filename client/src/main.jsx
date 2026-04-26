import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log("[CORE] main.jsx INITIALIZING...");

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log("[CORE] React Render Call Complete");
} else {
  console.error("[CORE] CRITICAL ERROR: #root element missing from index.html");
  document.body.innerHTML = '<h1 style="color:red; text-align:center; padding-top:20vh;">System Error: UI Root Not Found</h1>';
}
