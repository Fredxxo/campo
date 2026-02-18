import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Circulos from './pages/Circulos';
import Taller from './pages/Taller';
import Riego from './pages/Riego';
import Ventas from './pages/Ventas';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/circulos" element={<Circulos />} />
          <Route path="/taller" element={<Taller />} />
          <Route path="/riego" element={<Riego />} />
          <Route path="/ventas" element={<Ventas />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
