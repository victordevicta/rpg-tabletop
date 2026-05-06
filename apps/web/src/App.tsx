import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { handleSpotifyCallback } from './lib/spotify';
import WorldsPage from './pages/WorldsPage';
import TablePage from './pages/TablePage';
import LoginPage from './pages/LoginPage';

export default function App() {
  const user = useAuthStore((s) => s.user);
  const [handlingSpotifyAuth, setHandlingSpotifyAuth] = useState(
    () => !!new URLSearchParams(window.location.search).get('code'),
  );

  useEffect(() => {
    if (!handlingSpotifyAuth) return;
    handleSpotifyCallback()
      .then((pendingUrl) => {
        if (pendingUrl) sessionStorage.setItem('sp_return_url', pendingUrl);
      })
      .finally(() => setHandlingSpotifyAuth(false));
  }, []);

  if (!user) return <LoginPage />;
  if (handlingSpotifyAuth) return null;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/worlds" replace />} />
      <Route path="/worlds" element={<WorldsPage />} />
      <Route path="/worlds/:slug" element={<TablePage />} />
      <Route path="*" element={<Navigate to="/worlds" replace />} />
    </Routes>
  );
}
