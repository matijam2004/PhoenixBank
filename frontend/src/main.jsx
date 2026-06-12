import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '/src/app.jsx';
import './styles/style.css';      
import './styles/navbar.css';     
import 'animejs';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);