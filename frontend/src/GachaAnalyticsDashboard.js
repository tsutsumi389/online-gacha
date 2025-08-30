import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Tab, Tabs,
  CircularProgress, Alert, Chip, TableContainer, Table, TableHead, 
  TableRow, TableCell, TableBody, Button, Select, MenuItem, FormControl,
  InputLabel
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from 'recharts';
import { api } from './utils/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function GachaAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [categoryStats, setCategoryStats] = useState([]);
  const [userBehavior, setUserBehavior] = useState([]);
  const [selectedGachaId, setSelectedGachaId] = useState(null);
  const [gachaDetails, setGachaDetails] = useState(null);
  const [dateRange, setDateRange] = useState('30days');

  useEffect(() => {
    loadDashboardData();
    loadCategoryStats();
    loadUserBehavior();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await api.get('/api/admin/analytics/dashboard');
      setDashboardData(response.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('ダッシュボードデータの取得に失敗しました');
    }
  };

  const loadCategoryStats = async () => {
    try {
      const response = await api.get('/api/admin/analytics/category-stats');
      setCategoryStats(response.data);
    } catch (err) {
      console.error('Failed to load category stats:', err);
    }
  };

  const loadUserBehavior = async () => {
    try {
      const response = await api.get('/api/admin/analytics/user-behavior', {
        params: { days: 7 }
      });
      setUserBehavior(response.data);
    } catch (err) {
      console.error('Failed to load user behavior:', err);
    }
  };

  const loadGachaDetails = async (gachaId, range = '30days') => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/analytics/gacha-analytics/${gachaId}`, {
        params: { dateRange: range }
      });
      setGachaDetails(response.data);
    } catch (err) {
      console.error('Failed to load gacha details:', err);
      setError('ガチャ詳細データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleGachaSelect = (gachaId) => {
    setSelectedGachaId(gachaId);
    loadGachaDetails(gachaId, dateRange);
    setActiveTab(1);
  };

  const handleDateRangeChange = (event) => {
    const newRange = event.target.value;
    setDateRange(newRange);
    if (selectedGachaId) {
      loadGachaDetails(selectedGachaId, newRange);
    }
  };

  const updateStats = async () => {
    try {
      setLoading(true);
      await api.post('/api/admin/analytics/update-stats');
      // データを再読み込み
      await loadDashboardData();
      await loadCategoryStats();
      await loadUserBehavior();
      if (selectedGachaId) {
        await loadGachaDetails(selectedGachaId, dateRange);
      }
    } catch (err) {
      console.error('Failed to update stats:', err);
      setError('統計の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('ja-JP').format(value);
  };

  useEffect(() => {
    if (dashboardData && categoryStats.length && userBehavior.length) {
      setLoading(false);
    }
  }, [dashboardData, categoryStats, userBehavior]);

  if (loading && !dashboardData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="ダッシュボード" />
          <Tab label="ガチャ詳細分析" />
          <Tab label="カテゴリ統計" />
          <Tab label="ユーザー行動" />
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          ガチャ分析ダッシュボード
        </Typography>
        <Button variant="contained" onClick={updateStats} disabled={loading}>
          統計を更新
        </Button>
      </Box>

      {/* ダッシュボードタブ */}
      <TabPanel value={activeTab} index={0}>
        {dashboardData && (
          <Grid container spacing={3}>
            {/* サマリーカード */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="textSecondary">
                    総ガチャ数
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(dashboardData.total_gachas)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="textSecondary">
                    総抽選回数
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(dashboardData.total_draws)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="textSecondary">
                    総ユーザー数
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(dashboardData.total_users)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="textSecondary">
                    今月の売上
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(dashboardData.revenue_summary?.this_month || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 売上サマリー */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  売上サマリー
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" color="textSecondary">今日</Typography>
                    <Typography variant="h6">
                      {formatCurrency(dashboardData.revenue_summary?.today || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" color="textSecondary">今週</Typography>
                    <Typography variant="h6">
                      {formatCurrency(dashboardData.revenue_summary?.this_week || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" color="textSecondary">今月</Typography>
                    <Typography variant="h6">
                      {formatCurrency(dashboardData.revenue_summary?.this_month || 0)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* 人気ガチャ */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  人気ガチャ TOP5
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ランク</TableCell>
                        <TableCell>ガチャ名</TableCell>
                        <TableCell align="right">抽選回数</TableCell>
                        <TableCell align="right">ユーザー数</TableCell>
                        <TableCell>詳細</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboardData.popular_gachas?.map((gacha) => (
                        <TableRow key={gacha.id}>
                          <TableCell>
                            <Chip 
                              label={gacha.ranking} 
                              size="small" 
                              color={gacha.ranking <= 3 ? 'primary' : 'default'}
                            />
                          </TableCell>
                          <TableCell>{gacha.name}</TableCell>
                          <TableCell align="right">{formatNumber(gacha.total_draws)}</TableCell>
                          <TableCell align="right">{formatNumber(gacha.unique_users)}</TableCell>
                          <TableCell>
                            <Button 
                              size="small" 
                              onClick={() => handleGachaSelect(gacha.id)}
                            >
                              詳細
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      {/* ガチャ詳細分析タブ */}
      <TabPanel value={activeTab} index={1}>
        <Box sx={{ mb: 2 }}>
          <FormControl sx={{ minWidth: 200, mr: 2 }}>
            <InputLabel>期間</InputLabel>
            <Select
              value={dateRange}
              onChange={handleDateRangeChange}
              label="期間"
            >
              <MenuItem value="7days">過去7日</MenuItem>
              <MenuItem value="30days">過去30日</MenuItem>
              <MenuItem value="all">全期間</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {gachaDetails && (
          <Grid container spacing={3}>
            {/* 基本統計 */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  基本統計 (ガチャID: {gachaDetails.gacha_id})
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Typography variant="subtitle2" color="textSecondary">総抽選回数</Typography>
                    <Typography variant="h5">
                      {formatNumber(gachaDetails.statistics?.total_draws || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="subtitle2" color="textSecondary">ユニークユーザー</Typography>
                    <Typography variant="h5">
                      {formatNumber(gachaDetails.statistics?.unique_users || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="subtitle2" color="textSecondary">総収益</Typography>
                    <Typography variant="h5">
                      {formatCurrency(gachaDetails.statistics?.total_revenue || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="subtitle2" color="textSecondary">平均抽選回数/人</Typography>
                    <Typography variant="h5">
                      {(gachaDetails.statistics?.avg_draws_per_user || 0).toFixed(1)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* デモグラフィック分析 */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  性別分布
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(gachaDetails.demographics?.gender_breakdown || {}).map(([key, value]) => ({
                        name: key === 'male' ? '男性' : key === 'female' ? '女性' : key === 'other' ? 'その他' : '不明',
                        value: value.draws || 0
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(gachaDetails.demographics?.gender_breakdown || {}).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  年齢別分布
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(gachaDetails.demographics?.age_breakdown || {}).map(([key, value]) => ({
                    age_group: key,
                    draws: value.draws || 0,
                    users: value.users || 0
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age_group" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="draws" fill="#8884d8" name="抽選回数" />
                    <Bar dataKey="users" fill="#82ca9d" name="ユーザー数" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* 時間別統計 */}
            {gachaDetails.hourly_stats?.length > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    時間別活動 (過去24時間)
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={gachaDetails.hourly_stats.map(stat => ({
                      ...stat,
                      hour: new Date(stat.hour_bucket).getHours() + ':00'
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="draws_count" stroke="#8884d8" name="抽選回数" />
                      <Line type="monotone" dataKey="unique_users" stroke="#82ca9d" name="ユニークユーザー" />
                    </LineChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </TabPanel>

      {/* カテゴリ統計タブ */}
      <TabPanel value={activeTab} index={2}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            カテゴリ別統計
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>カテゴリ名</TableCell>
                  <TableCell align="right">ガチャ数</TableCell>
                  <TableCell align="right">総抽選回数</TableCell>
                  <TableCell align="right">ユニークユーザー</TableCell>
                  <TableCell align="right">総収益</TableCell>
                  <TableCell align="right">平均評価</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categoryStats.map((category) => (
                  <TableRow key={category.category_id}>
                    <TableCell>{category.category_name}</TableCell>
                    <TableCell align="right">{formatNumber(category.total_gachas)}</TableCell>
                    <TableCell align="right">{formatNumber(category.total_draws)}</TableCell>
                    <TableCell align="right">{formatNumber(category.unique_users)}</TableCell>
                    <TableCell align="right">{formatCurrency(category.total_revenue)}</TableCell>
                    <TableCell align="right">
                      {category.avg_rating ? category.avg_rating.toFixed(1) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* ユーザー行動タブ */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                デバイス別アクセス
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={userBehavior.device_breakdown?.map(device => ({
                      name: device.device_type,
                      value: device.activity_count
                    })) || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(userBehavior.device_breakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                ブラウザ別アクセス
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ブラウザ</TableCell>
                      <TableCell align="right">アクティビティ</TableCell>
                      <TableCell align="right">ユーザー数</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {userBehavior.device_breakdown?.map((device, index) => (
                      <TableRow key={index}>
                        <TableCell>{device.browser_type}</TableCell>
                        <TableCell align="right">{formatNumber(device.activity_count)}</TableCell>
                        <TableCell align="right">{formatNumber(device.unique_users)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}

export default GachaAnalyticsDashboard;