import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerLocale } from 'react-datepicker';
import vi from 'date-fns/locale/vi';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// Register Vietnamese locale for date-fns
registerLocale('vi', vi);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
