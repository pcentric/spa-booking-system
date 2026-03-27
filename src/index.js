import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.js';
import { AuthProvider } from './contexts/AuthContext.js';
import { BookingProvider } from './contexts/BookingContext.js';
import { MasterDataProvider } from './contexts/MasterDataContext.js';
import { UIProvider } from './contexts/UIContext.js';
import reportWebVitals from './reportWebVitals.js';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <MasterDataProvider>
        <BookingProvider>
          <UIProvider>
            <App />
          </UIProvider>
        </BookingProvider>
      </MasterDataProvider>
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();
