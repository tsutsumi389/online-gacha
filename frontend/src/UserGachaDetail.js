import React, { useState } from 'react';
import {
  Box, Typography, Button, Grid, Card, CardContent, CardMedia, 
  Container, Chip, LinearProgress, Badge, IconButton, Paper,
  Avatar, Stack, Divider, useTheme, alpha
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Casino as CasinoIcon,
  LocalOffer as LocalOfferIcon,
  Star as StarIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Share as ShareIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import GachaPerformance from './GachaPerformance';

export default function UserGachaDetail({ gacha, onBack }) {
  const [showPerformance, setShowPerformance] = useState(false);
  const [performanceType, setPerformanceType] = useState('normal');
  const [isFavorite, setIsFavorite] = useState(false);
  const theme = useTheme();

  const handleDraw = (type) => {
    setPerformanceType(type);
    setShowPerformance(true);
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'SR': return theme.palette.warning.main;
      case 'SSR': return theme.palette.error.main;
      case 'UR': return '#9c27b0';
      default: return theme.palette.info.main;
    }
  };

  const getStockPercentage = (current, initial) => {
    if (!initial || initial === 0) return 0;
    return (current / initial) * 100;
  };
  if (!gacha) return null;
  
  if (showPerformance) {
    return (
      <GachaPerformance
        type={performanceType}
        onBack={() => setShowPerformance(false)}
      />
    );
  }

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
          {/* ヘッダー部分 */}
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
                onClick={onBack}
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
              {gacha.description || 'ガチャの説明文が入ります。このガチャには素晴らしいアイテムが含まれています。'}
            </Typography>

            <Stack direction="row" spacing={2} flexWrap="wrap" gap={1}>
              <Chip
                icon={<LocalOfferIcon />}
                label={`${gacha.price}pt`}
                color="primary"
                variant="filled"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`提供割合: ${gacha.rates}`}
                color="secondary"
                variant="outlined"
              />
              {gacha.isLimited && (
                <Chip
                  label="期間限定"
                  color="error"
                  variant="filled"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Stack>
          </Paper>

          {/* アイテムリスト */}
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
              {gacha.items.map((item, index) => (
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
                        border: `2px solid ${item.stock === 0 ? theme.palette.divider : getRarityColor(item.rarity || 'N')}`,
                        borderRadius: 3,
                        overflow: 'hidden',
                        position: 'relative',
                        opacity: item.stock === 0 ? 0.6 : 1,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: item.stock > 0 ? 'translateY(-8px)' : 'none',
                          boxShadow: item.stock > 0 ? `0 12px 24px ${alpha(getRarityColor(item.rarity || 'N'), 0.3)}` : 'none'
                        }
                      }}
                    >
                      {item.stock === 0 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{
                              color: 'white',
                              fontWeight: 600,
                              transform: 'rotate(-15deg)'
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
                          image={item.image_url || `https://images.unsplash.com/photo-1555991220-9419a3518548?w=400&h=250&fit=crop&seed=${item.id}`}
                          alt={item.name}
                          sx={{
                            objectFit: 'cover',
                            background: `linear-gradient(135deg, ${alpha(getRarityColor(item.rarity || 'N'), 0.1)} 0%, ${alpha(getRarityColor(item.rarity || 'N'), 0.05)} 100%)`
                          }}
                        />
                        
                        <Badge
                          badgeContent={item.rarity || 'N'}
                          color="primary"
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            '& .MuiBadge-badge': {
                              background: getRarityColor(item.rarity || 'N'),
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              minWidth: 24,
                              height: 24
                            }
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

                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              在庫状況
                            </Typography>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 600,
                                color: item.stock === 0 ? theme.palette.error.main : theme.palette.success.main
                              }}
                            >
                              {item.stock} / {item.initial_stock || 1}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={getStockPercentage(item.stock, item.initial_stock || 1)}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: alpha(theme.palette.divider, 0.3),
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                background: `linear-gradient(45deg, ${getRarityColor(item.rarity || 'N')}, ${alpha(getRarityColor(item.rarity || 'N'), 0.8)})`
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

          {/* ガチャ実行ボタン */}
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
              variant="h5" 
              component="h3" 
              sx={{ 
                fontWeight: 600, 
                mb: 3,
                color: theme.palette.text.primary
              }}
            >
              ガチャを引く
            </Typography>

            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={3} 
              justifyContent="center"
              alignItems="center"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<CasinoIcon />}
                  onClick={() => handleDraw('normal')}
                  sx={{
                    minWidth: 200,
                    height: 56,
                    borderRadius: 3,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    '&:hover': {
                      background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                      boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.5)}`
                    }
                  }}
                >
                  1回引く ({gacha.price}pt)
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<CasinoIcon />}
                  onClick={() => handleDraw('normal')}
                  sx={{
                    minWidth: 200,
                    height: 56,
                    borderRadius: 3,
                    background: `linear-gradient(45deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
                    boxShadow: `0 4px 12px ${alpha(theme.palette.secondary.main, 0.4)}`,
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    '&:hover': {
                      background: `linear-gradient(45deg, ${theme.palette.secondary.dark}, ${theme.palette.secondary.main})`,
                      boxShadow: `0 6px 16px ${alpha(theme.palette.secondary.main, 0.5)}`
                    }
                  }}
                >
                  10連引く ({gacha.price * 10}pt)
                </Button>
              </motion.div>
            </Stack>

            <Typography 
              variant="body2" 
              sx={{ 
                mt: 2, 
                color: theme.palette.text.secondary 
              }}
            >
              ※ ポイントが不足している場合は実行できません
            </Typography>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
}
