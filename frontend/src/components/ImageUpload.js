import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  Chip
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { imageAPI } from '../utils/api';

const ImageUpload = ({ 
  value, 
  onChange, 
  disabled = false, 
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(value || '');
  const fileInputRef = useRef(null);

  // ファイル選択ダイアログを開く
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // ファイル検証
  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'ファイルが選択されていません' };
    
    if (!acceptedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: `対応していないファイル形式です。対応形式: ${acceptedTypes.map(type => type.split('/')[1]).join(', ')}` 
      };
    }
    
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `ファイルサイズが大きすぎます。最大サイズ: ${(maxSize / 1024 / 1024).toFixed(1)}MB` 
      };
    }
    
    return { valid: true };
  };

  // ファイルアップロード処理
  const uploadFile = async (file) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    try {
      setUploading(true);
      setError('');
      
      const response = await imageAPI.uploadImage(file);
      
      if (response.url) {
        setPreview(response.url);
        onChange(response.url);
      } else {
        throw new Error('画像URLが取得できませんでした');
      }
    } catch (err) {
      console.error('Image upload error:', err);
      setError(`アップロードに失敗しました: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // ファイル選択時の処理
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    // inputをリセット（同じファイルを再選択可能にする）
    event.target.value = '';
  };

  // ドラッグ&ドロップ処理
  const handleDragOver = (event) => {
    event.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    
    if (disabled) return;
    
    const files = Array.from(event.dataTransfer.files);
    const imageFile = files.find(file => acceptedTypes.includes(file.type));
    
    if (imageFile) {
      uploadFile(imageFile);
    } else {
      setError('対応していないファイル形式です');
    }
  };

  // 画像削除
  const handleRemove = () => {
    setPreview('');
    onChange('');
    setError('');
  };

  // ファイルサイズを読みやすい形式に変換
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptedTypes.join(',')}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {/* アップロード済み画像の表示 */}
      {preview && (
        <Box mb={2}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 2, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              backgroundColor: 'grey.50'
            }}
          >
            <Box
              component="img"
              src={preview}
              alt="アップロード済み画像"
              sx={{
                width: 80,
                height: 80,
                objectFit: 'cover',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.300'
              }}
            />
            <Box flex={1}>
              <Typography variant="body2" color="text.primary">
                画像が設定されています
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {preview}
              </Typography>
            </Box>
            {!disabled && (
              <Tooltip title="画像を削除">
                <IconButton onClick={handleRemove} color="error" size="small">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
          </Paper>
        </Box>
      )}

      {/* アップロードエリア */}
      {!preview && (
        <Paper
          elevation={dragOver ? 4 : 1}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{
            p: 4,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: dragOver ? 'primary.main' : 'grey.300',
            backgroundColor: dragOver ? 'primary.50' : 'grey.50',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            '&:hover': !disabled ? {
              borderColor: 'primary.main',
              backgroundColor: 'primary.50'
            } : {}
          }}
          onClick={!disabled ? handleFileSelect : undefined}
        >
          {uploading ? (
            <Box>
              <CircularProgress size={40} />
              <Typography variant="body1" color="text.secondary" mt={2}>
                アップロード中...
              </Typography>
            </Box>
          ) : (
            <Box>
              <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" color="text.primary" mb={1}>
                画像をアップロード
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                ファイルをドラッグ&ドロップするか、クリックして選択してください
              </Typography>
              <Box display="flex" gap={1} justifyContent="center" flexWrap="wrap">
                <Chip 
                  label={`最大 ${formatFileSize(maxSize)}`} 
                  size="small" 
                  variant="outlined" 
                />
                <Chip 
                  label={acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} 
                  size="small" 
                  variant="outlined" 
                />
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* 手動アップロードボタン（画像がない場合） */}
      {!preview && !uploading && (
        <Box mt={2} textAlign="center">
          <Button
            variant="outlined"
            startIcon={<ImageIcon />}
            onClick={handleFileSelect}
            disabled={disabled}
          >
            ファイルを選択
          </Button>
        </Box>
      )}

      {/* エラー表示 */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setError('')}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default ImageUpload;
