import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './styles/base.css';
import './styles/form.css';
import './styles/components.css';
import './styles/job-cards.css';
import './styles/loader.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
