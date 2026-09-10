/**
 * Main application component with routing.
 * @module App
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import type { ReactElement } from 'react';
import { Home } from './pages/Home';
import { SessionPage } from './pages/Session';

/**
 * Root application component.
 * Sets up React Router with Home and Session routes.
 *
 * @returns Application component tree
 */
function App(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
