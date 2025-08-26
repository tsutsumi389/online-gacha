import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Alert,
  Button,
  Pagination,
  Grid,
  Chip,
  Paper,
  useTheme,
  alpha
} from '@mui/material';
import {
  History as HistoryIcon,
  ArrowBack as ArrowBackIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from './utils/api';

export default function GachaHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });
  const navigate = useNavigate();
  const theme = useTheme();

  const fetchGachaHistory = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.getGachaHistory({
        page,
        limit: 20
      });
      
      setHistory(response.history || []);
      setPagination(response.pagination || {});
    } catch (error) {
      console.error('ガチャ履歴の取得に失敗しました:', error);
      setError('ガチャ履歴の取得に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGachaHistory(1);
  }, []);

  const handlePageChange = (event, page) => {
    fetchGachaHistory(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackClick = () => {
    navigate('/');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    }).format(date);
  };

  // ローディング表示
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh' 
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // エラー表示
  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper 
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
            backdropFilter: 'blur(20px)'
          }}
        >
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            onClick={() => fetchGachaHistory(pagination.currentPage)}
            sx={{ mr: 2 }}
          >
            再試行
          </Button>
          <Button
            variant="outlined"
            onClick={handleBackClick}
            startIcon={<ArrowBackIcon />}
          >
            ホームに戻る
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* ヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Button
            onClick={handleBackClick}
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 3 }}
          >
            戻る
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <HistoryIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" fontWeight="bold">
              ガチャ履歴
            </Typography>
          </Box>
        </Box>

        {/* 統計情報 */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CalendarIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" color="primary.main" fontWeight="600">
              総ガチャ実行回数: {pagination.totalItems}回
            </Typography>
          </Box>
        </Paper>
      </motion.div>

      {/* 履歴リスト */}
      {history.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
              backdropFilter: 'blur(20px)'
            }}
          >
            <HistoryIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="text.secondary">
              ガチャ履歴がありません
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              まだガチャを引いていません。ガチャ一覧からお気に入りのガチャを見つけて挑戦してみましょう！
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/gacha')}
            >
              ガチャ一覧を見る
            </Button>
          </Paper>
        </motion.div>
      ) : (
        <>
          <Grid container spacing={3}>
            {history.map((item, index) => (
              <Grid item xs={12} key={item.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 8px 40px ${alpha(theme.palette.primary.main, 0.12)}`
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                        {/* アイテム画像 */}
                        <Box sx={{ flexShrink: 0 }}>
                          <CardMedia
                            component="img"
                            sx={{
                              width: 80,
                              height: 80,
                              borderRadius: 2,
                              objectFit: 'cover',
                              border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`
                            }}
                            image={item.item_image_url}
                            alt={item.item_name}
                            onError={(e) => {
                              e.target.src = '/api/images/default-item.png';
                            }}
                          />
                        </Box>

                        {/* 履歴情報 */}
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                            <Typography 
                              variant="h6" 
                              component="h3" 
                              fontWeight="600"
                              sx={{ color: 'primary.main' }}
                            >
                              {item.item_name}
                            </Typography>
                            <Chip
                              label={formatDate(item.executed_at)}
                              size="small"
                              sx={{
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: 'primary.main',
                                fontWeight: 500
                              }}
                            />
                          </Box>

                          <Typography 
                            variant="body1" 
                            color="text.secondary" 
                            sx={{ mb: 1, fontWeight: 500 }}
                          >
                            ガチャ: {item.gacha_name}
                          </Typography>

                          {item.item_description && (
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ 
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                              }}
                            >
                              {item.item_description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* ページネーション */}
          {pagination.totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={pagination.totalPages}
                  page={pagination.currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </Box>
            </motion.div>
          )}
        </>
      )}
    </Container>
  );
}