import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Paper,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, Person, Email, Lock } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { authAPI } from './utils/api';

// バリデーションスキーマ
const profileValidationSchema = yup.object({
  name: yup
    .string()
    .test('name-validation', 'ユーザー名は2文字以上64文字以下で入力してください', function(value) {
      if (!value || value.trim() === '') return true; // 空の場合はOK
      return value.length >= 2 && value.length <= 64;
    }),
  email: yup
    .string()
    .test('email-validation', '正しいメールアドレスを入力してください', function(value) {
      if (!value || value.trim() === '') return true; // 空の場合はOK
      return yup.string().email().isValidSync(value);
    }),
  currentPassword: yup
    .string()
    .test('current-password-validation', 'パスワード変更時は現在のパスワードが必要です', function(value) {
      const { newPassword } = this.parent;
      if (newPassword && newPassword.trim() !== '') {
        return value && value.trim() !== '';
      }
      return true;
    }),
  newPassword: yup
    .string()
    .test('new-password-validation', 'パスワードは8文字以上で英数字を含む必要があります', function(value) {
      if (!value || value.trim() === '') return true; // 空の場合はOK
      return value.length >= 8 && /^(?=.*[a-zA-Z])(?=.*[0-9])/.test(value);
    }),
  confirmPassword: yup
    .string()
    .test('confirm-password-validation', 'パスワードが一致しません', function(value) {
      const { newPassword } = this.parent;
      if (newPassword && newPassword.trim() !== '') {
        return value === newPassword;
      }
      return true;
    })
});

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
    setError,
    clearErrors
  } = useForm({
    resolver: yupResolver(profileValidationSchema),
    defaultValues: {
      name: '',
      email: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  const watchedValues = watch();

  // ユーザー情報を取得
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authAPI.getCurrentUser();
        setUser(response.user);
      } catch (error) {
        console.error('ユーザー情報の取得に失敗:', error);
        setSnackbar({
          open: true,
          message: 'ユーザー情報の取得に失敗しました',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // 変更検知
  const detectChanges = useCallback(() => {
    const hasNameChange = watchedValues.name?.trim() !== '';
    const hasEmailChange = watchedValues.email?.trim() !== '';
    const hasPasswordChange = watchedValues.newPassword?.trim() !== '';
    
    setHasChanges(hasNameChange || hasEmailChange || hasPasswordChange);
  }, [watchedValues]);

  useEffect(() => {
    detectChanges();
  }, [detectChanges]);

  // パスワード表示切り替え
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // フォーム送信処理
  const onSubmit = async (formValues) => {
    setSaving(true);
    clearErrors();

    try {
      // 変更されたフィールドのみを送信データに含める
      const updateData = {};
      
      if (formValues.name?.trim()) {
        updateData.name = formValues.name.trim();
      }
      
      if (formValues.email?.trim()) {
        updateData.email = formValues.email.trim();
      }
      
      if (formValues.newPassword?.trim()) {
        updateData.currentPassword = formValues.currentPassword;
        updateData.newPassword = formValues.newPassword;
      }

      // 何も変更されていない場合は送信しない
      if (Object.keys(updateData).length === 0) {
        setSnackbar({
          open: true,
          message: '変更する項目を入力してください',
          severity: 'warning'
        });
        return;
      }

      const response = await authAPI.updateProfile(updateData);
      
      // ユーザー情報を更新
      setUser(response.user);
      
      // フォームをリセット
      reset({
        name: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // 成功メッセージ
      const changedFieldsJapanese = response.changedFields.map(field => {
        switch(field) {
          case 'name': return 'ユーザー名';
          case 'email': return 'メールアドレス';
          case 'password': return 'パスワード';
          default: return field;
        }
      });

      setSnackbar({
        open: true,
        message: `プロフィールが更新されました (${changedFieldsJapanese.join(', ')})`,
        severity: 'success'
      });

    } catch (error) {
      console.error('プロフィール更新エラー:', error);
      
      if (error.data?.details) {
        // フィールド別エラーを設定
        Object.entries(error.data.details).forEach(([field, message]) => {
          setError(field, { type: 'server', message });
        });
      } else {
        setSnackbar({
          open: true,
          message: error.data?.message || 'エラーが発生しました',
          severity: 'error'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        プロフィール管理
      </Typography>

      {/* 現在の登録情報 */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="primary">
          現在の登録情報
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              ユーザーID
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {user?.id}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              ユーザー名
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {user?.name}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              メールアドレス
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {user?.email}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              登録日時
            </Typography>
            <Typography variant="body1">
              {user?.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              最終更新日時
            </Typography>
            <Typography variant="body1">
              {user?.updatedAt ? new Date(user.updatedAt).toLocaleString() : '-'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* プロフィール変更フォーム */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            プロフィール変更
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              {/* ユーザー名変更 */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person color="action" />
                  ユーザー名変更
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  現在: {user?.name}
                </Typography>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      placeholder="変更する場合のみ入力してください"
                      error={!!errors.name}
                      helperText={errors.name?.message}
                      variant="outlined"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* メールアドレス変更 */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Email color="action" />
                  メールアドレス変更
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  現在: {user?.email}
                </Typography>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="email"
                      placeholder="変更する場合のみ入力してください"
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      variant="outlined"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* パスワード変更 */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Lock color="action" />
                  パスワード変更
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  パスワードを変更する場合は、以下の3つのフィールドをすべて入力してください
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Controller
                      name="currentPassword"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          type={showPasswords.current ? 'text' : 'password'}
                          label="現在のパスワード"
                          placeholder="変更する場合のみ入力"
                          error={!!errors.currentPassword}
                          helperText={errors.currentPassword?.message}
                          variant="outlined"
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => togglePasswordVisibility('current')}
                                  edge="end"
                                >
                                  {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="newPassword"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          type={showPasswords.new ? 'text' : 'password'}
                          label="新しいパスワード"
                          placeholder="8文字以上、英数字を含む"
                          error={!!errors.newPassword}
                          helperText={errors.newPassword?.message}
                          variant="outlined"
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => togglePasswordVisibility('new')}
                                  edge="end"
                                >
                                  {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="confirmPassword"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          type={showPasswords.confirm ? 'text' : 'password'}
                          label="新しいパスワード確認"
                          placeholder="新しいパスワードと同じ内容"
                          error={!!errors.confirmPassword}
                          helperText={errors.confirmPassword?.message}
                          variant="outlined"
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => togglePasswordVisibility('confirm')}
                                  edge="end"
                                >
                                  {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* 保存ボタン */}
              <Grid item xs={12}>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={!hasChanges || saving}
                    sx={{ minWidth: 200 }}
                  >
                    {saving ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        保存中...
                      </>
                    ) : (
                      '保存'
                    )}
                  </Button>
                </Box>
                
                {!hasChanges && (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                    変更する項目を入力してください
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserProfile;
