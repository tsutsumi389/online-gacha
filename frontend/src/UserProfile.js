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
  Chip,
  Container,
  Fade,
  Zoom,
  useTheme,
  alpha,
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  Person, 
  Email, 
  Lock,
  EditOutlined,
  SaveOutlined,
  Security,
  CheckCircleOutline,
  InfoOutlined,
  PhotoCamera,
  Delete,
  AccountCircle,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { authAPI } from './utils/api';

// バリデーションスキーマ
const profileValidationSchema = yup.object({
  avatarFile: yup
    .mixed()
    .nullable()
    .test('fileSize', '画像ファイルは5MB以下にしてください', (value) => {
      return !value || value.size <= 5 * 1024 * 1024; // 5MB
    })
    .test('fileType', 'JPEG、PNG、GIF形式のファイルを選択してください', (value) => {
      return !value || ['image/jpeg', 'image/png', 'image/gif'].includes(value.type);
    }),
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
  const theme = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
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
      avatarFile: null,
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
    const hasAvatarChange = watchedValues.avatarFile !== null;
    const hasNameChange = watchedValues.name?.trim() !== '';
    const hasEmailChange = watchedValues.email?.trim() !== '';
    const hasPasswordChange = watchedValues.newPassword?.trim() !== '';
    
    setHasChanges(hasAvatarChange || hasNameChange || hasEmailChange || hasPasswordChange);
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

  // アバターファイル選択
  const handleAvatarFileChange = (event, onChange) => {
    const file = event.target.files[0];
    if (file) {
      // プレビュー用のURL生成
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      onChange(file);
    }
  };

  // アバターアップロード
  const handleAvatarUpload = async (file) => {
    if (!file) return null;

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await authAPI.uploadAvatar(formData);
      
      // 成功メッセージは呼び出し元で表示するため、ここでは表示しない
      return response.avatarImage.id;
    } catch (error) {
      console.error('アバターアップロードエラー:', error);
      setSnackbar({
        open: true,
        message: 'アバターのアップロードに失敗しました',
        severity: 'error'
      });
      throw error;
    } finally {
      setAvatarUploading(false);
    }
  };

  // アバター削除
  const handleAvatarDelete = async () => {
    setAvatarDeleting(true);
    try {
      await authAPI.deleteAvatar();
      
      // ユーザー情報を再取得
      const response = await authAPI.getCurrentUser();
      setUser(response.user);
      
      setSnackbar({
        open: true,
        message: 'アバターが削除されました',
        severity: 'success'
      });
    } catch (error) {
      console.error('アバター削除エラー:', error);
      setSnackbar({
        open: true,
        message: 'アバターの削除に失敗しました',
        severity: 'error'
      });
    } finally {
      setAvatarDeleting(false);
    }
  };

  // アバタープレビューのクリーンアップ
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // フォーム送信処理
  const onSubmit = async (formValues) => {
    setSaving(true);
    clearErrors();

    try {
      // 変更されたフィールドのみを送信データに含める
      const updateData = {};
      let avatarChanged = false;
      
      // アバターファイルがある場合は先にアップロード
      if (formValues.avatarFile) {
        const avatarImageId = await handleAvatarUpload(formValues.avatarFile);
        updateData.avatarImageId = avatarImageId;
        avatarChanged = true;
      }
      
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

      // アバターのみの変更の場合は、アップロードで既に完了している
      if (avatarChanged && Object.keys(updateData).length === 1) {
        // アバターのみの変更の場合、ユーザー情報を再取得
        const response = await authAPI.getCurrentUser();
        setUser(response.user);
        
        // フォームをリセット
        reset({
          avatarFile: null,
          name: '',
          email: '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        // アバタープレビューをクリア
        if (avatarPreview) {
          URL.revokeObjectURL(avatarPreview);
          setAvatarPreview(null);
        }

        setSnackbar({
          open: true,
          message: 'プロフィールが正常に更新されました',
          severity: 'success'
        });
        
        return;
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
        avatarFile: null,
        name: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // アバタープレビューをクリア
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      
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
      <Container maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <Box textAlign="center">
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              プロフィール情報を読み込み中...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        {/* ヘッダーセクション */}
        <Fade in timeout={800}>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant="h3" component="h1" gutterBottom sx={{ 
              fontWeight: 700,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              プロフィール管理
            </Typography>
            <Typography variant="h6" color="text.secondary">
              アカウント情報の変更・更新
            </Typography>
          </Box>
        </Fade>

        {/* プロフィール変更フォーム */}
        <Zoom in timeout={600} style={{ transitionDelay: '400ms' }}>
          <Card 
            elevation={0}
            sx={{ 
              border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.01)}, ${alpha(theme.palette.secondary.main, 0.01)})`,
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <EditOutlined color="primary" sx={{ mr: 1 }} />
                <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                  プロフィール変更
                </Typography>
                {hasChanges && (
                  <Chip 
                    label="変更あり" 
                    size="small" 
                    color="warning" 
                    sx={{ ml: 'auto' }}
                  />
                )}
              </Box>
              
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={4}>
                  {/* ユーザーアバター変更セクション */}
                  <Grid item xs={12}>
                    <Box sx={{ 
                      p: 3, 
                      borderRadius: 2, 
                      bgcolor: alpha(theme.palette.secondary.main, 0.02),
                      border: `1px solid ${alpha(theme.palette.secondary.main, 0.08)}`
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PhotoCamera color="secondary" sx={{ mr: 1 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          ユーザーアイコン変更
                        </Typography>
                      </Box>
                      
                      <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              現在のアイコン
                            </Typography>
                            <Box
                              sx={{
                                width: 120,
                                height: 120,
                                borderRadius: '50%',
                                overflow: 'hidden',
                                border: `3px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                bgcolor: alpha(theme.palette.secondary.main, 0.1)
                              }}
                            >
                              {user?.avatarImageUrl ? (
                                <img
                                  src={user.avatarImageUrl}
                                  alt="Current Avatar"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                              ) : (
                                <AccountCircle 
                                  sx={{ 
                                    fontSize: 80, 
                                    color: alpha(theme.palette.secondary.main, 0.5) 
                                  }} 
                                />
                              )}
                            </Box>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={4}>
                          {avatarPreview && (
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                新しいアイコン（プレビュー）
                              </Typography>
                              <Box
                                sx={{
                                  width: 120,
                                  height: 120,
                                  borderRadius: '50%',
                                  overflow: 'hidden',
                                  border: `3px solid ${theme.palette.primary.main}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mx: 'auto'
                                }}
                              >
                                <img
                                  src={avatarPreview}
                                  alt="Avatar Preview"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                              </Box>
                            </Box>
                          )}
                        </Grid>
                        
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Controller
                              name="avatarFile"
                              control={control}
                              render={({ field: { onChange, ...field } }) => (
                                <Box>
                                  <input
                                    accept="image/jpeg,image/png,image/gif"
                                    style={{ display: 'none' }}
                                    id="avatar-upload"
                                    type="file"
                                    onChange={(e) => handleAvatarFileChange(e, onChange)}
                                  />
                                  <label htmlFor="avatar-upload">
                                    <Button
                                      component="span"
                                      variant="outlined"
                                      startIcon={<PhotoCamera />}
                                      disabled={avatarUploading}
                                      sx={{ mb: 1, width: '100%' }}
                                    >
                                      画像選択
                                    </Button>
                                  </label>
                                  {user?.avatarImageUrl && (
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      startIcon={<Delete />}
                                      onClick={handleAvatarDelete}
                                      disabled={avatarDeleting}
                                      sx={{ width: '100%' }}
                                    >
                                      {avatarDeleting ? (
                                        <CircularProgress size={16} />
                                      ) : (
                                        '削除'
                                      )}
                                    </Button>
                                  )}
                                </Box>
                              )}
                            />
                            {errors.avatarFile && (
                              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                                {errors.avatarFile.message}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                              JPEG/PNG/GIF（最大5MB）
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  </Grid>

                  {/* ユーザー名変更セクション */}
                  <Grid item xs={12}>
                    <Box sx={{ 
                      p: 3, 
                      borderRadius: 2, 
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Person color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          ユーザー名変更
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        p: 2, 
                        mb: 2, 
                        borderRadius: 1, 
                        bgcolor: alpha(theme.palette.info.main, 0.04),
                        border: `1px solid ${alpha(theme.palette.info.main, 0.08)}`
                      }}>
                        <Typography variant="body2" color="text.secondary">
                          現在のユーザー名: <strong>{user?.name}</strong>
                        </Typography>
                      </Box>
                      <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            placeholder="新しいユーザー名を入力してください"
                            error={!!errors.name}
                            helperText={errors.name?.message}
                            variant="outlined"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                                '&:hover': {
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: theme.palette.primary.main,
                                  },
                                },
                              },
                            }}
                          />
                        )}
                      />
                    </Box>
                  </Grid>

                  {/* メールアドレス変更セクション */}
                  <Grid item xs={12}>
                    <Box sx={{ 
                      p: 3, 
                      borderRadius: 2, 
                      bgcolor: alpha(theme.palette.success.main, 0.02),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.08)}`
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Email color="success" sx={{ mr: 1 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          メールアドレス変更
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        p: 2, 
                        mb: 2, 
                        borderRadius: 1, 
                        bgcolor: alpha(theme.palette.info.main, 0.04),
                        border: `1px solid ${alpha(theme.palette.info.main, 0.08)}`
                      }}>
                        <Typography variant="body2" color="text.secondary">
                          現在のメールアドレス: <strong>{user?.email}</strong>
                        </Typography>
                      </Box>
                      <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            type="email"
                            placeholder="新しいメールアドレスを入力してください"
                            error={!!errors.email}
                            helperText={errors.email?.message}
                            variant="outlined"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                                '&:hover': {
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: theme.palette.success.main,
                                  },
                                },
                              },
                            }}
                          />
                        )}
                      />
                    </Box>
                  </Grid>

                  {/* パスワード変更セクション */}
                  <Grid item xs={12}>
                    <Box sx={{ 
                      p: 3, 
                      borderRadius: 2, 
                      bgcolor: alpha(theme.palette.warning.main, 0.02),
                      border: `1px solid ${alpha(theme.palette.warning.main, 0.08)}`
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Security color="warning" sx={{ mr: 1 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          パスワード変更
                        </Typography>
                      </Box>
                      <Alert 
                        severity="info" 
                        sx={{ mb: 3, borderRadius: 2 }}
                        icon={<Lock />}
                      >
                        パスワードを変更する場合は、以下の3つのフィールドをすべて入力してください
                      </Alert>
                      
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
                                placeholder="現在のパスワードを入力"
                                error={!!errors.currentPassword}
                                helperText={errors.currentPassword?.message}
                                variant="outlined"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: 'background.paper',
                                  },
                                }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <IconButton
                                        onClick={() => togglePasswordVisibility('current')}
                                        edge="end"
                                        sx={{ color: theme.palette.warning.main }}
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
                        
                        <Grid item xs={12}>
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
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: 'background.paper',
                                  },
                                }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <IconButton
                                        onClick={() => togglePasswordVisibility('new')}
                                        edge="end"
                                        sx={{ color: theme.palette.warning.main }}
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
                        
                        <Grid item xs={12}>
                          <Controller
                            name="confirmPassword"
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                type={showPasswords.confirm ? 'text' : 'password'}
                                label="新しいパスワード確認"
                                placeholder="新しいパスワードを再入力"
                                error={!!errors.confirmPassword}
                                helperText={errors.confirmPassword?.message}
                                variant="outlined"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: 'background.paper',
                                  },
                                }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <IconButton
                                        onClick={() => togglePasswordVisibility('confirm')}
                                        edge="end"
                                        sx={{ color: theme.palette.warning.main }}
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
                    </Box>
                  </Grid>

                  {/* 保存ボタンセクション */}
                  <Grid item xs={12}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 3,
                      borderRadius: 2,
                      bgcolor: hasChanges ? alpha(theme.palette.success.main, 0.04) : alpha(theme.palette.grey[500], 0.04),
                      border: `1px solid ${hasChanges ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.grey[500], 0.12)}`,
                    }}>
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={!hasChanges || saving}
                        startIcon={saving ? <CircularProgress size={20} /> : <SaveOutlined />}
                        sx={{ 
                          minWidth: 200,
                          height: 56,
                          borderRadius: 3,
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          background: hasChanges ? `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` : undefined,
                          '&:hover': {
                            background: hasChanges ? `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})` : undefined,
                            transform: hasChanges ? 'translateY(-2px)' : undefined,
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {saving ? '保存中...' : '変更を保存'}
                      </Button>
                      
                      {!hasChanges && (
                        <Box sx={{ mt: 2 }}>
                          <Chip 
                            label="変更する項目を入力してください" 
                            color="default" 
                            variant="outlined"
                            icon={<InfoOutlined />}
                          />
                        </Box>
                      )}

                      {hasChanges && (
                        <Box sx={{ mt: 2 }}>
                          <Chip 
                            label="変更が検出されました" 
                            color="success" 
                            variant="outlined"
                            icon={<CheckCircleOutline />}
                          />
                        </Box>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Zoom>

        {/* スナックバー */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleSnackbarClose} 
            severity={snackbar.severity} 
            sx={{ 
              width: '100%',
              borderRadius: 2,
              '& .MuiAlert-icon': {
                fontSize: '1.5rem',
              },
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default UserProfile;
