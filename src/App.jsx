import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Circulos from './pages/Circulos';
import Taller from './pages/Taller';
import Riego from './pages/Riego';
import Ventas from './pages/Ventas';
import Estadisticas from './pages/Estadisticas';
import Admin from './pages/Admin';
import Mapa from './pages/Mapa';

import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/circulos" element={<Circulos />} />
                  <Route path="/taller" element={<Taller />} />
                  <Route path="/riego" element={<Riego />} />
                  <Route path="/ventas" element={<Ventas />} />
                  <Route path="/estadisticas" element={<Estadisticas />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/mapa" element={<Mapa />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
