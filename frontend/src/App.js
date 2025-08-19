import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, CircularProgress } from '@mui/material';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import MyGachaList from './MyGachaList';
import UserGachaList from './UserGachaList';
import { authAPI } from './utils/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // ページロード時に認証状態を復元
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // ローカルストレージから認証情報を確認
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          // サーバーでトークンの有効性を確認
          const currentUser = await authAPI.getCurrentUser();
          setIsAuthenticated(true);
          setUser(currentUser);
        }
      } catch (error) {
        console.error('認証状態の復元に失敗:', error);
        // 無効なトークンの場合はローカルストレージをクリア
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    // ローカルストレージに保存
    localStorage.setItem('user', JSON.stringify(userData));
    navigate('/'); // ログイン後はホームページにリダイレクト
  };

  const handleRegister = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    // ローカルストレージに保存
    localStorage.setItem('user', JSON.stringify(userData));
    navigate('/'); // 登録後はホームページにリダイレクト
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('ログアウト処理でエラー:', error);
    }
    // ローカルストレージをクリア
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login');
  };

  // ログインが必要なページの保護
  const PrivateRoute = ({ children }) => {
    return isAuthenticated ? children : <Navigate to="/login" />;
  };

  // ログイン済みユーザーがログインページにアクセスした場合のリダイレクト
  const PublicRoute = ({ children }) => {
    return !isAuthenticated ? children : <Navigate to="/" />;
  };

  // 認証状態の復元中はローディング表示
  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div>
      {/* ナビゲーションバー */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Online Gacha
          </Typography>
          
          {isAuthenticated ? (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button color="inherit" onClick={() => navigate('/')}>
                ホーム
              </Button>
              <Button color="inherit" onClick={() => navigate('/gacha-list')}>
                ガチャ一覧
              </Button>
              <Button color="inherit" onClick={() => navigate('/my-gacha')}>
                マイガチャ
              </Button>
              <Button color="inherit" onClick={handleLogout}>
                ログアウト ({user?.name})
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button color="inherit" onClick={() => navigate('/gacha-list')}>
                ガチャ一覧
              </Button>
              <Button color="inherit" onClick={() => navigate('/login')}>
                ログイン
              </Button>
              <Button color="inherit" onClick={() => navigate('/register')}>
                新規登録
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* メインコンテンツ */}
      <Routes>
        {/* ホームページ */}
        <Route path="/" element={
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h3" gutterBottom>
              Welcome to Online Gacha
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {isAuthenticated 
                ? `こんにちは、${user?.name}さん！`
                : 'ログインしてガチャを楽しもう！'
              }
            </Typography>
          </Box>
        } />

        {/* ログイン・登録ページ（未認証ユーザーのみ） */}
        <Route path="/login" element={
          <PublicRoute>
            <LoginForm 
              onLogin={handleLogin}
              onSwitchToRegister={() => navigate('/register')}
            />
          </PublicRoute>
        } />
        
        <Route path="/register" element={
          <PublicRoute>
            <RegisterForm 
              onRegister={handleRegister}
              onSwitchToLogin={() => navigate('/login')}
            />
          </PublicRoute>
        } />

        {/* 公開ページ（誰でもアクセス可能） */}
        <Route path="/gacha-list" element={<UserGachaList />} />

        {/* 保護されたページ（認証が必要） */}
        <Route path="/my-gacha" element={
          <PrivateRoute>
            <MyGachaList />
          </PrivateRoute>
        } />

        {/* 404ページ */}
        <Route path="*" element={
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
              404 - ページが見つかりません
            </Typography>
            <Button variant="contained" onClick={() => navigate('/')}>
              ホームに戻る
            </Button>
          </Box>
        } />
      </Routes>
    </div>
  );
}

export default App;
