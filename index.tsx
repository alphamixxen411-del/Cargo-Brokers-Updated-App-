
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Register Service Worker for PWA functionality (Android "APK" feel)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Ensuring we use the correct relative path for the sw.js file
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('CargoBroker: Service Worker active', reg))
      .catch(err => console.error('CargoBroker: Service Worker failed', err));
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
