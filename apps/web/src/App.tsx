import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import WorldsPage from './pages/WorldsPage';
import TablePage from './pages/TablePage';
import LoginPage from './pages/LoginPage';

export default function App() {
  const user = useAuthStore((s) => s.user);

  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/worlds" replace />} />
      <Route path="/worlds" element={<WorldsPage />} />
      <Route path="/worlds/:slug" element={<TablePage />} />
      <Route path="*" element={<Navigate to="/worlds" replace />} />
    </Routes>
  );
}
