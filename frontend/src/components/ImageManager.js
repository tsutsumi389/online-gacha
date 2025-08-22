import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { imageAPI } from '../utils/api';

const ImageManager = ({ open, onClose, onSelect }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [usage, setUsage] = useState({});

  // 画像一覧を取得
  const fetchImages = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await imageAPI.getImages();
      setImages(response.images || []);
    } catch (err) {
      console.error('Failed to fetch images:', err);
      setError(`画像の取得に失敗しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 画像使用状況を取得
  const fetchUsage = async (objectKey) => {
    try {
      const response = await imageAPI.getImageUsage(objectKey);
      setUsage(prev => ({
        ...prev,
        [objectKey]: response
      }));
    } catch (err) {
      console.error('Failed to fetch image usage:', err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchImages();
    }
  }, [open]);

  // 各画像の使用状況を取得
  useEffect(() => {
    images.forEach(image => {
      if (image.key && !usage[image.key]) {
        fetchUsage(image.key);
      }
    });
  }, [images]);

  // 画像削除
  const handleDelete = async () => {
    if (!selectedImage) return;

    try {
      await imageAPI.deleteImage(selectedImage.key);
      setImages(images.filter(img => img.key !== selectedImage.key));
      setDeleteDialogOpen(false);
      setSelectedImage(null);
    } catch (err) {
      console.error('Failed to delete image:', err);
      setError(`画像の削除に失敗しました: ${err.message}`);
    }
  };

  // 画像選択
  const handleSelectImage = (image) => {
    if (onSelect) {
      onSelect(image.url);
      onClose();
    }
  };

  // ファイルサイズを読みやすい形式に変換
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 日付をフォーマット
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">画像管理</Typography>
            <Button onClick={fetchImages} disabled={loading}>
              更新
            </Button>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {images.length === 0 ? (
                <Grid item xs={12}>
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary">
                      アップロードされた画像がありません
                    </Typography>
                  </Box>
                </Grid>
              ) : (
                images.map((image) => {
                  const imageUsage = usage[image.key];
                  const isUsed = imageUsage?.used || false;
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} key={image.key}>
                      <Card 
                        sx={{ 
                          cursor: onSelect ? 'pointer' : 'default',
                          '&:hover': onSelect ? { boxShadow: 4 } : {}
                        }}
                        onClick={() => onSelect && handleSelectImage(image)}
                      >
                        <CardMedia
                          component="img"
                          height="200"
                          image={image.url}
                          alt={image.originalName}
                          sx={{ objectFit: 'cover' }}
                        />
                        <CardContent>
                          <Typography variant="subtitle2" noWrap title={image.originalName}>
                            {image.originalName}
                          </Typography>
                          
                          <Box mt={1} mb={1}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {formatFileSize(image.size)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {formatDate(image.lastModified)}
                            </Typography>
                          </Box>

                          <Box display="flex" gap={1} alignItems="center" mb={1}>
                            {isUsed ? (
                              <Chip 
                                icon={<CheckCircleIcon />}
                                label="使用中" 
                                size="small" 
                                color="success"
                                variant="outlined"
                              />
                            ) : (
                              <Chip 
                                icon={<ErrorIcon />}
                                label="未使用" 
                                size="small" 
                                color="default"
                                variant="outlined"
                              />
                            )}
                          </Box>

                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Tooltip title="プレビュー">
                              <IconButton 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(image.url, '_blank');
                                }}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title={isUsed ? "使用中の画像は削除できません" : "画像を削除"}>
                              <span>
                                <IconButton 
                                  size="small"
                                  color="error"
                                  disabled={isUsed}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImage(image);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })
              )}
            </Grid>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>画像削除の確認</DialogTitle>
        <DialogContent>
          <Typography>
            「{selectedImage?.originalName}」を削除しますか？
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ImageManager;
