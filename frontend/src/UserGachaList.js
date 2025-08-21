import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  TextField,
  Box,
  Chip,
  Avatar,
  LinearProgress,
  IconButton,
  InputAdornment,
  Container,
  Fab,
  CardMedia,
  CardActionArea,
  Rating,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  LocalAtm as CoinIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y, Autoplay, EffectCoverflow } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';
import { motion, AnimatePresence } from 'framer-motion';
import { gachaAPI, handleApiError } from './utils/api';

// 実際のシードデータに基づくモックデータ
const mockGachas = [
  {
    id: 1,
    name: '田中のお楽しみガチャ',
    description: '田中太郎が作成したガチャです！',
    price: 300,
    creator: '田中太郎',
    creatorAvatar: 'https://api.dicebear.com/7.x/personas/svg?seed=tanaka',
    rating: 4.2,
    totalPlays: 127,
    images: [
      'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=250&fit=crop',
      'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=250&fit=crop',
    ],
    items: [
      { id: 1, name: 'レアアイテムA', stock: 10, rarity: 'SSR' },
      { id: 2, name: 'ノーマルアイテムB', stock: 50, rarity: 'SR' },
      { id: 3, name: 'コモンアイテムC', stock: 100, rarity: 'R' },
    ],
    category: 'アイテム',
    isHot: true,
    endDate: '2025-09-16'
  },
  {
    id: 2,
    name: '佐藤のプレミアムガチャ',
    description: '佐藤花子の特別なガチャ',
    price: 500,
    creator: '佐藤花子',
    creatorAvatar: 'https://api.dicebear.com/7.x/personas/svg?seed=sato',
    rating: 4.8,
    totalPlays: 89,
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250&fit=crop',
      'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&h=250&fit=crop',
    ],
    items: [
      { id: 1, name: 'プレミアムジュエル', stock: 5, rarity: 'SSR' },
      { id: 2, name: 'シルバーコイン', stock: 20, rarity: 'SR' },
      { id: 3, name: 'ブロンズメダル', stock: 75, rarity: 'R' },
    ],
    category: 'ジュエル',
    isNew: true,
    endDate: '2025-10-16'
  },
  {
    id: 3,
    name: '管理者の限定ガチャ',
    description: '管理者が作成した限定ガチャ',
    price: 1000,
    creator: '山田管理者',
    creatorAvatar: 'https://api.dicebear.com/7.x/personas/svg?seed=admin',
    rating: 4.9,
    totalPlays: 245,
    images: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=250&fit=crop',
      'https://images.unsplash.com/photo-1555991220-9419a3518548?w=400&h=250&fit=crop',
    ],
    items: [
      { id: 1, name: '限定フィギュア', stock: 3, rarity: 'UR' },
      { id: 2, name: '特別カード', stock: 15, rarity: 'SSR' },
      { id: 3, name: '記念品', stock: 30, rarity: 'SR' },
    ],
    category: 'コレクション',
    isLimited: true,
    endDate: '2025-08-24'
  },
  {
    id: 4,
    name: '鈴木店長のお得ガチャ',
    description: '鈴木店長のお得なガチャです',
    price: 200,
    creator: '鈴木店長',
    creatorAvatar: 'https://api.dicebear.com/7.x/personas/svg?seed=suzuki',
    rating: 4.0,
    totalPlays: 198,
    images: [
      'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=250&fit=crop',
      'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=400&h=250&fit=crop',
    ],
    items: [
      { id: 1, name: '店長のオススメ', stock: 8, rarity: 'SR' },
      { id: 2, name: 'お得な詰め合わせ', stock: 25, rarity: 'R' },
      { id: 3, name: '日用品', stock: 67, rarity: 'N' },
    ],
    category: '日用品',
    isPopular: true,
    endDate: '2025-08-31'
  },
];

export default function UserGachaList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState(new Set());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [gachas, setGachas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const categories = ['all', 'アイテム', 'ジュエル', 'コレクション', '日用品'];

  // ガチャ一覧を取得
  const fetchGachas = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await gachaAPI.getGachas();
      setGachas(response.gachas || []);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGachas();
  }, []);

  const filtered = gachas.filter((gacha) => {
    const matchesSearch = gacha.name?.toLowerCase().includes(search.toLowerCase()) ||
                         gacha.creator?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || gacha.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return (b.totalPlays || 0) - (a.totalPlays || 0);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'price-low':
        return (a.price || 0) - (b.price || 0);
      case 'price-high':
        return (b.price || 0) - (a.price || 0);
      case 'newest':
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      default:
        return 0;
    }
  });

  const toggleFavorite = (gachaId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(gachaId)) {
      newFavorites.delete(gachaId);
    } else {
      newFavorites.add(gachaId);
    }
    setFavorites(newFavorites);
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'UR': return '#ff6b35';
      case 'SSR': return '#ffd700';
      case 'SR': return '#c0c0c0';
      case 'R': return '#cd7f32';
      case 'N': return '#808080';
      default: return '#808080';
    }
  };

  const getStockProgress = (items) => {
    if (!items || items.length === 0) return 0;
    const totalStock = items.reduce((sum, item) => sum + (item.stock || 0), 0);
    const maxStock = 200; // 仮の最大値
    return (totalStock / maxStock) * 100;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          ガチャ一覧を読み込み中...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* ヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ガチャコレクション
          </Typography>
          <Typography variant="h6" color="text.secondary">
            最高のガチャ体験をお楽しみください
          </Typography>
        </Box>
      </motion.div>

      {/* 検索・フィルター */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="ガチャ名または作成者で検索..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ borderRadius: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {categories.map((category) => (
                    <Chip
                      key={category}
                      label={category === 'all' ? 'すべて' : category}
                      onClick={() => setSelectedCategory(category)}
                      color={selectedCategory === category ? 'primary' : 'default'}
                      variant={selectedCategory === category ? 'filled' : 'outlined'}
                      sx={{ borderRadius: 3 }}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </motion.div>

      {/* ガチャグリッド */}
      <AnimatePresence>
        <Grid container spacing={3}>
          {sorted.map((gacha, index) => {
            const totalStock = gacha.items ? gacha.items.reduce((sum, item) => sum + (item.stock || 0), 0) : 0;
            const stockProgress = getStockProgress(gacha.items);
            const daysLeft = gacha.display_to ? 
              Math.ceil((new Date(gacha.display_to) - new Date()) / (1000 * 60 * 60 * 24)) : 
              30; // デフォルト値

            return (
              <Grid item xs={12} sm={6} lg={4} key={gacha.id}>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                >
                  <Card 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 3,
                      boxShadow: 4,
                      overflow: 'visible',
                      position: 'relative',
                      '&:hover': {
                        boxShadow: 8,
                        transform: 'translateY(-4px)',
                        transition: 'all 0.3s ease'
                      }
                    }}
                  >
                    {/* バッジ */}
                    <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 2 }}>
                      {gacha.isHot && (
                        <Chip label="🔥 HOT" size="small" color="error" sx={{ mr: 1, fontWeight: 'bold' }} />
                      )}
                      {gacha.isNew && (
                        <Chip label="✨ NEW" size="small" color="success" sx={{ mr: 1, fontWeight: 'bold' }} />
                      )}
                      {gacha.isLimited && (
                        <Chip label="⭐ 限定" size="small" color="warning" sx={{ mr: 1, fontWeight: 'bold' }} />
                      )}
                    </Box>

                    {/* お気に入りボタン */}
                    <IconButton
                      sx={{ position: 'absolute', top: 16, right: 16, zIndex: 2, bgcolor: 'rgba(255,255,255,0.9)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(gacha.id);
                      }}
                    >
                      {favorites.has(gacha.id) ? (
                        <FavoriteIcon color="error" />
                      ) : (
                        <FavoriteBorderIcon />
                      )}
                    </IconButton>

                    <CardActionArea onClick={() => navigate(`/gacha/${gacha.id}`)}>
                      {/* 画像スライダー */}
                      <Box sx={{ position: 'relative', height: 250 }}>
                        {gacha.images && gacha.images.length > 0 ? (
                          <Swiper
                            modules={[Navigation, Pagination, A11y, Autoplay, EffectCoverflow]}
                            navigation
                            pagination={{ clickable: true }}
                            autoplay={{ delay: 4000, disableOnInteraction: false }}
                            effect="coverflow"
                            coverflowEffect={{
                              rotate: 30,
                              stretch: 10,
                              depth: 60,
                              modifier: 1,
                            }}
                            spaceBetween={8}
                            slidesPerView={1}
                            style={{ height: '100%' }}
                          >
                            {gacha.images.map((img, idx) => (
                              <SwiperSlide key={idx}>
                                <CardMedia
                                  component="img"
                                  height="250"
                                  image={img}
                                  alt={gacha.name + '-' + (idx + 1)}
                                  sx={{ objectFit: 'cover' }}
                                />
                              </SwiperSlide>
                            ))}
                          </Swiper>
                        ) : (
                          <CardMedia
                            component="div"
                            height="250"
                            sx={{ 
                              backgroundColor: 'grey.200',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              画像なし
                            </Typography>
                          </CardMedia>
                        )}
                      </Box>

                      <CardContent sx={{ flexGrow: 1, p: 3 }}>
                        {/* タイトルと評価 */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', flex: 1 }}>
                            {gacha.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                            <Rating value={gacha.rating || 0} precision={0.1} size="small" readOnly />
                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                              ({gacha.totalPlays || 0})
                            </Typography>
                          </Box>
                        </Box>

                        {/* 説明 */}
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {gacha.description || 'ガチャの説明がありません'}
                        </Typography>

                        {/* 作成者情報 */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Avatar src={gacha.creatorAvatar} sx={{ width: 32, height: 32, mr: 1 }}>
                            {gacha.creator ? gacha.creator.charAt(0) : 'U'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {gacha.creator || '不明'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              クリエイター
                            </Typography>
                          </Box>
                        </Box>

                        {/* 価格と残り時間 */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CoinIcon color="primary" sx={{ mr: 0.5 }} />
                            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                              {gacha.price || 0}pt
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <ScheduleIcon color="action" sx={{ mr: 0.5, fontSize: 16 }} />
                            <Typography variant="caption" color={daysLeft <= 3 ? 'error.main' : 'text.secondary'}>
                              あと{daysLeft}日
                            </Typography>
                          </Box>
                        </Box>

                        {/* レアリティ表示 */}
                        {gacha.items && gacha.items.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" gutterBottom>
                              レアリティ構成:
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {gacha.items.map((item) => (
                                <Chip
                                  key={item.id}
                                  label={item.rarity || 'N'}
                                  size="small"
                                  sx={{
                                    bgcolor: getRarityColor(item.rarity),
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '0.7rem'
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}

                        {/* 在庫プログレス */}
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption">
                              残り在庫
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                              {totalStock}個
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={stockProgress}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                bgcolor: stockProgress > 50 ? 'success.main' : stockProgress > 20 ? 'warning.main' : 'error.main'
                              }
                            }}
                          />
                        </Box>
                      </CardContent>
                    </CardActionArea>

                    <CardActions sx={{ p: 3, pt: 0 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate(`/gacha/${gacha.id}`)}
                        sx={{ borderRadius: 2 }}
                      >
                        詳細を見る
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<PlayIcon />}
                        sx={{
                          ml: 'auto',
                          borderRadius: 2,
                          background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #FE6B8B 60%, #FF8E53 100%)',
                          }
                        }}
                      >
                        ガチャを引く
                      </Button>
                    </CardActions>
                  </Card>
                </motion.div>
              </Grid>
            );
          })}
        </Grid>
      </AnimatePresence>

      {/* フローティングアクションボタン */}
      <Fab
        color="primary"
        aria-label="refresh"
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
        }}
        onClick={fetchGachas}
      >
        <RefreshIcon />
      </Fab>
    </Container>
  );
}
