import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Person } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { authAPI } from './utils/api';

// バリデーションスキーマ
const registerSchema = yup.object({
  name: yup
    .string()
    .required('ユーザー名は必須です')
    .min(2, 'ユーザー名は2文字以上で入力してください')
    .max(64, 'ユーザー名は64文字以下で入力してください'),
  email: yup
    .string()
    .required('メールアドレスは必須です')
    .email('正しいメールアドレスを入力してください'),
  password: yup
    .string()
    .required('パスワードは必須です')
    .min(8, 'パスワードは8文字以上で入力してください')
    .matches(/(?=.*[a-zA-Z])(?=.*[0-9])/, 'パスワードは英数字を含む必要があります'),
  confirmPassword: yup
    .string()
    .required('パスワード確認は必須です')
    .oneOf([yup.ref('password')], 'パスワードが一致しません'),
  agreeToTerms: yup
    .boolean()
    .oneOf([true], '利用規約に同意してください')
});

export default function RegisterForm({ onRegister, onSwitchToLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false
    }
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setRegisterError('');
    
    try {
      // 実際のAPI呼び出し
      const userData = await authAPI.register(data.name, data.email, data.password);
      
      if (onRegister) {
        onRegister(userData);
      }
    } catch (error) {
      console.error('登録エラー:', error);
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        setRegisterError('このメールアドレスは既に登録されています');
      } else {
        setRegisterError('登録中にエラーが発生しました。もう一度お試しください');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="grey.100"
    >
      <Card sx={{ minWidth: 400, maxWidth: 500 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Online Gacha
          </Typography>
          
          <Typography variant="h5" component="h2" align="center" gutterBottom>
            新規登録
          </Typography>

          {registerError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {registerError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="ユーザー名"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="メールアドレス"
                  type="email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="パスワード"
                  type={showPassword ? 'text' : 'password'}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={togglePasswordVisibility}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="パスワード確認"
                  type={showConfirmPassword ? 'text' : 'password'}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={toggleConfirmPasswordVisibility}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="agreeToTerms"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      {...field}
                      checked={field.value}
                      color="primary"
                    />
                  }
                  label="利用規約に同意する"
                  sx={{ mt: 2 }}
                />
              )}
            />
            {errors.agreeToTerms && (
              <Typography variant="caption" color="error" display="block">
                {errors.agreeToTerms.message}
              </Typography>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mt: 3, mb: 2 }}
            >
              {isLoading ? '登録中...' : '登録'}
            </Button>

            <Box textAlign="center">
              <Typography variant="body2">
                すでにアカウントをお持ちの方は{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={onSwitchToLogin}
                  sx={{ textDecoration: 'none' }}
                >
                  ログインはこちら
                </Link>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
