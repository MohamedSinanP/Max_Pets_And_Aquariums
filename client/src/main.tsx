import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { Provider } from 'react-redux'
import { persistor, store } from './store/index.ts'
import { PersistGate } from 'redux-persist/integration/react'
import AuthBootstrap from './components/auth/AuthBootstrap.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <AuthBootstrap>
            <App />
          </AuthBootstrap>
        </PersistGate>
      </Provider>
    </BrowserRouter>
  </StrictMode>,
)