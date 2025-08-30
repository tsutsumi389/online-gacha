import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Grid,
  Button,
  Slider,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Category as CategoryIcon,
  Notifications as NotificationsIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { apiCall } from './utils/api';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`preferences-tabpanel-${index}`}
      aria-labelledby={`preferences-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function UserPreferences() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // 設定データ
  const [preferences, setPreferences] = useState({
    display_preferences: {
      theme: 'auto',
      items_per_page: 12,
      default_sort: 'popularity',
      show_completed_gachas: true,
      enable_animations: true
    },
    notification_preferences: {
      email_notifications: true,
      new_gacha_alerts: false,
      favorite_gacha_updates: true,
      weekly_digest: false
    },
    privacy_preferences: {
      public_profile: false,
      show_activity: true,
      allow_friend_requests: true
    }
  });
  
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 10000]);

  useEffect(() => {
    loadPreferences();
    loadCategories();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/api/user/preferences', 'GET');
      if (response.preferences) {
        setPreferences(response.preferences);
      }
      if (response.favorite_categories) {
        setSelectedCategories(response.favorite_categories.map(cat => cat.category_id));
      }
      if (response.price_range) {
        setPriceRange([response.price_range.min_price || 0, response.price_range.max_price || 10000]);
      }
    } catch (error) {
      setError('設定の読み込みに失敗しました');
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiCall('/api/user/categories', 'GET');
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handlePreferenceChange = (section, key, value) => {
    setPreferences(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handlePriceRangeChange = (event, newValue) => {
    setPriceRange(newValue);
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      
      await apiCall('/api/user/preferences', 'PUT', {
        preferences,
        favorite_categories: selectedCategories,
        price_range: {
          min_price: priceRange[0],
          max_price: priceRange[1]
        }
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('設定の保存に失敗しました');
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="preferences tabs">
            <Tab
              icon={<SettingsIcon />}
              label="表示設定"
              id="preferences-tab-0"
              aria-controls="preferences-tabpanel-0"
            />
            <Tab
              icon={<CategoryIcon />}
              label="カテゴリ設定"
              id="preferences-tab-1"
              aria-controls="preferences-tabpanel-1"
            />
            <Tab
              icon={<NotificationsIcon />}
              label="通知設定"
              id="preferences-tab-2"
              aria-controls="preferences-tabpanel-2"
            />
            <Tab
              icon={<VisibilityIcon />}
              label="プライバシー設定"
              id="preferences-tab-3"
              aria-controls="preferences-tabpanel-3"
            />
          </Tabs>
        </Box>

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ m: 2 }}>
            設定を保存しました
          </Alert>
        )}

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h5" gutterBottom>
            表示設定
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    基本設定
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <FormControl fullWidth>
                      <InputLabel>テーマ</InputLabel>
                      <Select
                        value={preferences.display_preferences.theme}
                        label="テーマ"
                        onChange={(e) => handlePreferenceChange('display_preferences', 'theme', e.target.value)}
                      >
                        <MenuItem value="light">ライト</MenuItem>
                        <MenuItem value="dark">ダーク</MenuItem>
                        <MenuItem value="auto">自動</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <FormControl fullWidth>
                      <InputLabel>1ページの表示件数</InputLabel>
                      <Select
                        value={preferences.display_preferences.items_per_page}
                        label="1ページの表示件数"
                        onChange={(e) => handlePreferenceChange('display_preferences', 'items_per_page', e.target.value)}
                      >
                        <MenuItem value={6}>6件</MenuItem>
                        <MenuItem value={12}>12件</MenuItem>
                        <MenuItem value={24}>24件</MenuItem>
                        <MenuItem value={48}>48件</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <FormControl fullWidth>
                      <InputLabel>デフォルトソート</InputLabel>
                      <Select
                        value={preferences.display_preferences.default_sort}
                        label="デフォルトソート"
                        onChange={(e) => handlePreferenceChange('display_preferences', 'default_sort', e.target.value)}
                      >
                        <MenuItem value="popularity">人気順</MenuItem>
                        <MenuItem value="newest">新着順</MenuItem>
                        <MenuItem value="price_asc">価格の安い順</MenuItem>
                        <MenuItem value="price_desc">価格の高い順</MenuItem>
                        <MenuItem value="personalized">おすすめ順</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    表示オプション
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.display_preferences.show_completed_gachas}
                          onChange={(e) => handlePreferenceChange('display_preferences', 'show_completed_gachas', e.target.checked)}
                        />
                      }
                      label="完売したガチャも表示する"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.display_preferences.enable_animations}
                          onChange={(e) => handlePreferenceChange('display_preferences', 'enable_animations', e.target.checked)}
                        />
                      }
                      label="アニメーションを有効にする"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h5" gutterBottom>
            カテゴリ設定
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    お気に入りカテゴリ
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    選択したカテゴリのガチャが優先的に表示されます
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {categories.map((category) => (
                      <Chip
                        key={category.id}
                        label={category.name}
                        clickable
                        color={selectedCategories.includes(category.id) ? 'primary' : 'default'}
                        onClick={() => handleCategoryToggle(category.id)}
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    価格範囲
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    表示するガチャの価格範囲を設定
                  </Typography>
                  
                  <Box sx={{ px: 2 }}>
                    <Slider
                      value={priceRange}
                      onChange={handlePriceRangeChange}
                      valueLabelDisplay="auto"
                      min={0}
                      max={10000}
                      step={100}
                      valueLabelFormat={(value) => `¥${value.toLocaleString()}`}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption">¥{priceRange[0].toLocaleString()}</Typography>
                      <Typography variant="caption">¥{priceRange[1].toLocaleString()}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h5" gutterBottom>
            通知設定
          </Typography>
          
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    メール通知
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.notification_preferences.email_notifications}
                          onChange={(e) => handlePreferenceChange('notification_preferences', 'email_notifications', e.target.checked)}
                        />
                      }
                      label="メール通知を有効にする"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.notification_preferences.new_gacha_alerts}
                          onChange={(e) => handlePreferenceChange('notification_preferences', 'new_gacha_alerts', e.target.checked)}
                          disabled={!preferences.notification_preferences.email_notifications}
                        />
                      }
                      label="新着ガチャのお知らせ"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.notification_preferences.favorite_gacha_updates}
                          onChange={(e) => handlePreferenceChange('notification_preferences', 'favorite_gacha_updates', e.target.checked)}
                          disabled={!preferences.notification_preferences.email_notifications}
                        />
                      }
                      label="お気に入りガチャの更新通知"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.notification_preferences.weekly_digest}
                          onChange={(e) => handlePreferenceChange('notification_preferences', 'weekly_digest', e.target.checked)}
                          disabled={!preferences.notification_preferences.email_notifications}
                        />
                      }
                      label="週間ダイジェスト"
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h5" gutterBottom>
            プライバシー設定
          </Typography>
          
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    公開設定
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.privacy_preferences.public_profile}
                          onChange={(e) => handlePreferenceChange('privacy_preferences', 'public_profile', e.target.checked)}
                        />
                      }
                      label="プロフィールを公開する"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.privacy_preferences.show_activity}
                          onChange={(e) => handlePreferenceChange('privacy_preferences', 'show_activity', e.target.checked)}
                        />
                      }
                      label="ガチャ活動を表示する"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.privacy_preferences.allow_friend_requests}
                          onChange={(e) => handlePreferenceChange('privacy_preferences', 'allow_friend_requests', e.target.checked)}
                        />
                      }
                      label="フレンドリクエストを許可する"
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
          <Button
            variant="contained"
            onClick={savePreferences}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : null}
            size="large"
          >
            {saving ? '保存中...' : '設定を保存'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}