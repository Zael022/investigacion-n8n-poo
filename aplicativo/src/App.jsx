import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Subir from './pages/Subir.jsx';
import Chat from './pages/Chat.jsx';
import Aprobaciones from './pages/Aprobaciones.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="subir" element={<Subir />} />
        <Route path="chat" element={<Chat />} />
        <Route path="aprobaciones" element={<Aprobaciones />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
