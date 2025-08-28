import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  Pagination, CircularProgress, Alert, Card, CardContent, Chip, Grid, Avatar, Stack,
  LinearProgress, Divider, Container, IconButton, Tooltip
} from '@mui/material';
import { 
  Inventory as InventoryIcon, 
  People as PeopleIcon, 
  Timeline as TimelineIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { myGachaAPI } from './utils/api';

export default function AdminGachaStatus() {
  const { id } = useParams();
  const [gacha, setGacha] = useState(null);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchGachaStatus = async () => {
    try {
      setLoading(true);
      const response = await myGachaAPI.getGachaStatus(id, page);
      setGacha(response.gacha);
      setWinners(response.winners);
      setTotalPages(response.pagination.total_pages);
    } catch (err) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGachaStatus();
  }, [id, page]);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleRefresh = () => {
    fetchGachaStatus();
  };

  // アイテム在庫の統計計算
  const stockStats = gacha?.items ? {
    totalItems: gacha.items.length,
    totalStock: gacha.items.reduce((sum, item) => sum + item.stock, 0),
    totalInitialStock: gacha.items.reduce((sum, item) => sum + item.initial_stock, 0),
    outOfStockItems: gacha.items.filter(item => item.stock === 0).length
  } : null;

  const stockRatio = stockStats ? 
    (stockStats.totalStock / stockStats.totalInitialStock * 100) : 0;


  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* ヘッダー */}
        <Box sx={{ mb: 4, mt: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                ガチャ状況分析
              </Typography>
              <Typography variant="h5" color="primary" fontWeight="medium">
                {gacha?.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: '600px' }}>
                {gacha?.description}
              </Typography>
            </Box>
            <Tooltip title="データを更新">
              <IconButton 
                onClick={handleRefresh} 
                sx={{ 
                  backgroundColor: 'primary.main', 
                  color: 'white',
                  '&:hover': { backgroundColor: 'primary.dark' }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* 統計サマリーカード */}
        {stockStats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  height: '120px'
                }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <InventoryIcon sx={{ fontSize: 40, mr: 2, opacity: 0.9 }} />
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        総アイテム数
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {stockStats.totalItems}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            <Grid item xs={12} md={3}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  height: '120px'
                }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <TrendingUpIcon sx={{ fontSize: 40, mr: 2, opacity: 0.9 }} />
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        残り在庫
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {stockStats.totalStock}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            <Grid item xs={12} md={3}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  height: '120px'
                }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <PeopleIcon sx={{ fontSize: 40, mr: 2, opacity: 0.9 }} />
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        当選者数
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {winners?.length || 0}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            <Grid item xs={12} md={3}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Card sx={{ 
                  background: stockRatio > 50 ? 
                    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' :
                    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                  color: 'white',
                  height: '120px'
                }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                      在庫率
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                      {stockRatio.toFixed(1)}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={stockRatio} 
                      sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: 'white'
                        }
                      }}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>
        )}

        {/* アイテム在庫状況 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card sx={{ mb: 4, overflow: 'hidden' }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ 
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                p: 3
              }}>
                <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
                  <InventoryIcon sx={{ mr: 1 }} />
                  アイテム在庫状況
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                  各アイテムの在庫数と消費状況を確認できます
                </Typography>
              </Box>
              
              <TableContainer>
                <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>アイテム名</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>残り数</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>初期在庫数</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>消費率</TableCell>
                      </TableRow>
                    </TableHead>
                  <TableBody>
                    {gacha?.items?.map((item, index) => {
                      const consumedRatio = ((item.initial_stock - item.stock) / item.initial_stock * 100);
                      const isOutOfStock = item.stock === 0;
                      
                      return (
                        <motion.tr
                          key={item.id}
                          component={TableRow}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          sx={{ 
                            backgroundColor: isOutOfStock ? '#ffebee' : 'transparent',
                            '&:hover': { backgroundColor: '#f5f5f5' }
                          }}
                        >
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              fontWeight={isOutOfStock ? 'bold' : 'normal'}
                              color={isOutOfStock ? 'error' : 'inherit'}
                            >
                              {item.name}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={item.stock}
                              size="small"
                              color={isOutOfStock ? 'error' : item.stock < 10 ? 'warning' : 'success'}
                              variant={isOutOfStock ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {item.initial_stock}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <Typography variant="body2" sx={{ mr: 1, minWidth: '45px' }}>
                                {consumedRatio.toFixed(1)}%
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={consumedRatio}
                                sx={{ 
                                  width: 60, 
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor: '#e0e0e0',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: isOutOfStock ? '#f44336' : 
                                      consumedRatio > 80 ? '#ff9800' : '#4caf50'
                                  }
                                }}
                              />
                            </Box>
                          </TableCell>
                        </motion.tr>
                      );
                    }) || (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography variant="body1" color="text.secondary">
                            データがありません
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* 当選者情報 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card sx={{ overflow: 'hidden' }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ 
                background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                p: 3
              }}>
                <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
                  <PeopleIcon sx={{ mr: 1 }} />
                  当選者情報
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                  ガチャで当選したユーザーの一覧
                </Typography>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>ユーザー</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>メールアドレス</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>当選日時</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {winners?.map((winner, index) => (
                      <motion.tr
                        key={index}
                        component={TableRow}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}
                      >
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar sx={{ width: 32, height: 32, backgroundColor: 'primary.main' }}>
                              {winner.user?.name?.charAt(0) || '?'}
                            </Avatar>
                            <Typography variant="body2" fontWeight="medium">
                              {winner.user?.name || '不明'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {winner.user?.email || '不明'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {winner.drawn_at ? 
                              new Date(winner.drawn_at).toLocaleString('ja-JP') : '不明'}
                          </Typography>
                        </TableCell>
                      </motion.tr>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                          <Typography variant="body1" color="text.secondary">
                            当選者情報がありません
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </motion.div>
    </Container>
  );
}
