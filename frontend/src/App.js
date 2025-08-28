import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  CircularProgress,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Person as PersonIcon,
  Logout as LogoutIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import AdminGachaManage from './AdminGachaManage';
import AdminGachaEdit from './AdminGachaEdit';
import UserGachaList from './UserGachaList';
import UserGachaDetail from './UserGachaDetail';
import AdminGachaStatus from './AdminGachaStatus';

import UserProfile from './UserProfile';
import GachaHistory from './GachaHistory';
import { authAPI } from './utils/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [userAvatar, setUserAvatar] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const open = Boolean(anchorEl);

  // ページロード時に認証状態を復元
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // サーバーにセッションの有効性を確認
        const response = await authAPI.getCurrentUser();
        setIsAuthenticated(true);
        setUser(response.user);
        setUserAvatar(response.user.avatar_url);
      } catch (error) {
        // トークンが無効、または存在しない場合
        setIsAuthenticated(false);
        setUser(null);
        setUserAvatar(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    setUserAvatar(userData.avatar_url);
    navigate('/'); // ログイン後はホームページにリダイレクト
  };

  const handleRegister = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    setUserAvatar(userData.avatar_url);
    navigate('/'); // 登録後はホームページにリダイレクト
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('ログアウト処理でエラー:', error);
    }
    setIsAuthenticated(false);
    setUser(null);
    setUserAvatar(null);
    setAnchorEl(null);
    navigate('/login');
  };

  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleGachaHistoryClick = () => {
    handleMenuClose();
    navigate('/gacha-history');
  };

  const handleLogoutClick = () => {
    handleMenuClose();
    handleLogout();
  };

  // ルートコンポーネントのラッパー
  const GachaDetailWrapper = () => {
    const { id } = useParams();
    return <UserGachaDetail gachaId={id} />;
  };

  const GachaEditWrapper = () => {
    const { id } = useParams();
    return <AdminGachaEdit />;
  };

  const NewGachaWrapper = () => {
    return <AdminGachaEdit />;
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button color="inherit" onClick={() => navigate('/')}>
                ホーム
              </Button>
              <Button color="inherit" onClick={() => navigate('/gacha')}>
                ガチャ一覧
              </Button>
              <Button color="inherit" onClick={() => navigate('/my-gacha')}>
                マイガチャ管理
              </Button>
              
              {/* ユーザーアバターアイコン */}
              <Tooltip title="アカウントメニュー">
                <IconButton
                  onClick={handleAvatarClick}
                  size="small"
                  sx={{ ml: 1 }}
                  aria-controls={open ? 'account-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={open ? 'true' : undefined}
                >
                  <Avatar
                    src={userAvatar}
                    alt={user?.name}
                    sx={{ 
                      width: 32, 
                      height: 32,
                      bgcolor: userAvatar ? 'transparent' : 'primary.main'
                    }}
                  >
                    {!userAvatar && user?.name?.charAt(0)?.toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>
              
              {/* ユーザーアバタードロップダウンメニュー */}
              <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={open}
                onClose={handleMenuClose}
                onClick={handleMenuClose}
                PaperProps={{
                  elevation: 0,
                  sx: {
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                    mt: 1.5,
                    '& .MuiAvatar-root': {
                      width: 32,
                      height: 32,
                      ml: -0.5,
                      mr: 1,
                    },
                    '&:before': {
                      content: '""',
                      display: 'block',
                      position: 'absolute',
                      top: 0,
                      right: 14,
                      width: 10,
                      height: 10,
                      bgcolor: 'background.paper',
                      transform: 'translateY(-50%) rotate(45deg)',
                      zIndex: 0,
                    },
                  },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem>
                  <Avatar
                    src={userAvatar}
                    alt={user?.name}
                    sx={{ bgcolor: userAvatar ? 'transparent' : 'primary.main' }}
                  >
                    {!userAvatar && user?.name?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {user?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user?.email}
                    </Typography>
                  </Box>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleProfileClick}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>プロフィール</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleGachaHistoryClick}>
                  <ListItemIcon>
                    <HistoryIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>ガチャ履歴</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleLogoutClick}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>ログアウト</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button color="inherit" onClick={() => navigate('/gacha')}>
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
        <Route path="/gacha" element={<UserGachaList />} />
        <Route path="/gacha/:id" element={<GachaDetailWrapper />} />


        {/* 保護されたページ（認証が必要） */}
        <Route path="/my-gacha" element={
          <PrivateRoute>
            <AdminGachaManage />
          </PrivateRoute>
        } />
        <Route path="/my-gacha/new" element={
          <PrivateRoute>
            <NewGachaWrapper />
          </PrivateRoute>
        } />
        <Route path="/my-gacha/edit/:id" element={
          <PrivateRoute>
            <GachaEditWrapper />
          </PrivateRoute>
        } />
        <Route path="/my-gacha/:id/status" element={<AdminGachaStatus />} />
        <Route path="/profile" element={
          <PrivateRoute>
            <UserProfile onAvatarUpdate={setUserAvatar} />
          </PrivateRoute>
        } />
        <Route path="/gacha-history" element={
          <PrivateRoute>
            <GachaHistory />
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
