import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Grid, Card, CardContent, CardMedia, 
  Container, Chip, LinearProgress, Badge, IconButton, Paper,
  Avatar, Stack, Divider, useTheme, alpha, CircularProgress,
  Alert, Snackbar
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Casino as CasinoIcon,
  LocalOffer as LocalOfferIcon,
  Star as StarIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Share as ShareIcon,
  Info as InfoIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

// Mock data for testing SOLD OUT display
const mockGacha = {
  id: 1,
  name: 'テスト用ガチャ',
  description: 'SOLD OUT表示のテスト用ガチャです',
  price: 300,
  creator_name: '田中太郎',
  display_from: '2025-08-01',
  display_to: '2025-09-30',
  items: [
    {
      id: 1,
      name: 'あいてむA',
      description: '在庫ありのアイテム',
      stock: 5, // number
      initial_stock: 10,
      image_url: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=250&fit=crop'
    },
    {
      id: 2,
      name: 'あいてむB',
      description: '在庫切れのアイテム（文字列）',
      stock: "0", // string "0" - This should show SOLD OUT
      initial_stock: 1,
      image_url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=250&fit=crop'
    },
    {
      id: 3,
      name: 'あいてむC',
      description: '在庫切れのアイテム（数値）',
      stock: 0, // number 0 - This should also show SOLD OUT
      initial_stock: 1,
      image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250&fit=crop'
    }
  ]
};

export default function TestUserGachaDetail() {
  const navigate = useNavigate();
  const [gacha, setGacha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const theme = useTheme();

  // Mock loading the gacha data
  useEffect(() => {
    setTimeout(() => {
      setGacha(mockGacha);
      setLoading(false);
    }, 1000);
  }, []);

  const handleBackClick = () => {
    navigate('/gacha');
  };

  const getAvailableItemsCount = () => {
    if (!gacha?.items) return 0;
    return gacha.items.filter(item => Number(item.stock) > 0).length;
  };

  const getTotalItemsCount = () => {
    return gacha?.items?.length || 0;
  };

  const getTotalStockInfo = () => {
    if (!gacha?.items) return { remaining: 0, initial: 0 };
    const remaining = gacha.items.reduce((sum, item) => sum + (parseInt(item.stock) || 0), 0);
    const initial = gacha.items.reduce((sum, item) => sum + (parseInt(item.initial_stock) || 0), 0);
    return { remaining, initial };
  };

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`
        }}
      >
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
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">ガチャ詳細を読み込み中...</Typography>
        </Paper>
      </Box>
    );
  }

  if (!gacha) return null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 20%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 4,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <IconButton
                onClick={handleBackClick}
                sx={{
                  background: theme.palette.primary.main,
                  color: 'white',
                  '&:hover': {
                    background: theme.palette.primary.dark,
                    transform: 'scale(1.05)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <ArrowBackIcon />
              </IconButton>

              <Stack direction="row" spacing={1}>
                <IconButton
                  onClick={() => setIsFavorite(!isFavorite)}
                  sx={{ color: isFavorite ? theme.palette.error.main : theme.palette.text.secondary }}
                >
                  {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                </IconButton>
                <IconButton sx={{ color: theme.palette.text.secondary }}>
                  <ShareIcon />
                </IconButton>
                <IconButton sx={{ color: theme.palette.text.secondary }}>
                  <InfoIcon />
                </IconButton>
              </Stack>
            </Box>

            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 700,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2
              }}
            >
              {gacha.name}
            </Typography>

            <Typography 
              variant="body1" 
              sx={{ 
                color: theme.palette.text.secondary,
                lineHeight: 1.6,
                mb: 3
              }}
            >
              {gacha.description}
            </Typography>

            <Stack direction="row" spacing={2} flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
              <Chip
                icon={<LocalOfferIcon />}
                label={`${gacha.price}pt`}
                color="primary"
                variant="filled"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                icon={<PersonIcon />}
                label={`作成者: ${gacha.creator_name}`}
                color="secondary"
                variant="outlined"
              />
              <Chip
                label={`アイテム数: ${getTotalItemsCount()}種類`}
                color="info"
                variant="outlined"
              />
              <Chip
                label={`在庫あり: ${getAvailableItemsCount()}種類`}
                color={getAvailableItemsCount() > 0 ? "success" : "error"}
                variant="outlined"
              />
              <Chip
                label={`総在庫: ${getTotalStockInfo().remaining} / ${getTotalStockInfo().initial}個`}
                color="primary"
                variant="outlined"
              />
            </Stack>
          </Paper>

          {/* Item List */}
          <Typography 
            variant="h5" 
            component="h2" 
            sx={{ 
              fontWeight: 600, 
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <StarIcon sx={{ color: theme.palette.warning.main }} />
            商品ラインナップ
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <AnimatePresence>
              {gacha.items?.map((item, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    whileHover={{ y: -5 }}
                  >
                    <Card
                      sx={{
                        height: '100%',
                        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                        backdropFilter: 'blur(20px)',
                        border: `2px solid ${Number(item.stock) === 0 ? theme.palette.divider : theme.palette.primary.main}`,
                        borderRadius: 3,
                        overflow: 'hidden',
                        position: 'relative',
                        opacity: Number(item.stock) === 0 ? 0.6 : 1,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: Number(item.stock) > 0 ? 'translateY(-8px)' : 'none',
                          boxShadow: Number(item.stock) > 0 ? `0 12px 24px ${alpha(theme.palette.primary.main, 0.3)}` : 'none'
                        }
                      }}
                    >
                      {Number(item.stock) === 0 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            bgcolor: 'rgba(0, 0, 0, 0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2
                          }}
                        >
                          <Typography
                            variant="h5"
                            sx={{
                              color: 'white',
                              fontWeight: 'bold',
                              transform: 'rotate(-15deg)',
                              fontSize: '2rem',
                              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                            }}
                          >
                            SOLD OUT
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ position: 'relative' }}>
                        <CardMedia
                          component="img"
                          height="200"
                          image={item.image_url}
                          alt={item.name}
                          sx={{
                            objectFit: 'cover',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`
                          }}
                        />
                      </Box>

                      <CardContent sx={{ p: 2 }}>
                        <Typography 
                          variant="h6" 
                          component="h3"
                          sx={{ 
                            fontWeight: 600,
                            mb: 1,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {item.name}
                        </Typography>

                        {item.description && (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: theme.palette.text.secondary,
                              mb: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}
                          >
                            {item.description}
                          </Typography>
                        )}

                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              在庫状況
                            </Typography>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 600,
                                color: Number(item.stock) === 0 ? theme.palette.error.main : theme.palette.success.main
                              }}
                            >
                              {item.stock} / {item.initial_stock}個
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={item.initial_stock > 0 ? (Number(item.stock) / item.initial_stock) * 100 : 0}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: alpha(theme.palette.divider, 0.3),
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                background: Number(item.stock) > 0 
                                  ? `linear-gradient(45deg, ${theme.palette.success.main}, ${alpha(theme.palette.success.main, 0.8)})`
                                  : theme.palette.error.main
                              }
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </AnimatePresence>
          </Grid>

          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              textAlign: 'center'
            }}
          >
            <Typography 
              variant="h6" 
              component="h3" 
              sx={{ 
                fontWeight: 600, 
                mb: 2,
                color: theme.palette.text.primary
              }}
            >
              SOLD OUT表示のテスト結果
            </Typography>
            
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              上記のアイテムのうち、在庫が0のもの（文字列"0"と数値0の両方）に「SOLD OUT」が表示されているかを確認してください。
            </Typography>
          </Paper>
        </motion.div>
      </Container>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}