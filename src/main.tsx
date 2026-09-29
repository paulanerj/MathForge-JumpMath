import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import LevelStudio from './studio/LevelStudio.tsx';
import './index.css';

const studio = new URLSearchParams(window.location.search).get('levelStudio') === '1';
createRoot(document.getElementById('root')!).render(studio ? <LevelStudio /> : <App />);
