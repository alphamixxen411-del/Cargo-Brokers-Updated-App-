import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Service Worker Registration logic.
 * We use an explicit construction of the URL to prevent origin mismatch errors
 * that can occur in proxied or sandboxed preview environments.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      // Determine the directory of the current page to ensure sw.js is located correctly
      const currentPath = window.location.pathname;
      const directoryPath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
      
      // Construct an absolute URL on the SAME origin as the current window
      // this bypasses issues where relative paths might resolve to a different origin (like ai.studio)
      const swUrl = new URL('sw.js', window.location.origin + directoryPath).href;
      
      console.log('CargoBroker: Initializing Service Worker registration at:', swUrl);
      
      navigator.serviceWorker.register(swUrl)
        .then(reg => {
          console.log('CargoBroker: Service Worker registered successfully', reg);
        })
        .catch(err => {
          // If registration fails, we warn but do not crash. 
          // SW registration is often blocked in specific dev/sandbox environments.
          console.warn('CargoBroker: Service Worker registration skipped or failed:', err.message);
        });
    } catch (e) {
      console.error('CargoBroker: Unexpected error during SW initialization:', e);
    }
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
