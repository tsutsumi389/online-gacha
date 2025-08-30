import React, { useState, useEffect } from 'react';
import {
  Box,
  Rating,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Snackbar,
  Alert,
  Chip,
  Avatar,
  Divider,
  Pagination
} from '@mui/material';
import {
  Star as StarIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon
} from '@mui/icons-material';
import { apiCall } from './utils/api';

export default function GachaRatingComponent({ 
  gachaId, 
  currentUserRating = null, 
  onRatingUpdate,
  showReviews = false,
  compact = false 
}) {
  const [rating, setRating] = useState(currentUserRating || 0);
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [editingReview, setEditingReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    if (showReviews) {
      loadReviews();
    }
    loadUserRating();
  }, [gachaId]);

  const loadReviews = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await apiCall(`/api/gachas/${gachaId}/reviews?page=${pageNum}&limit=5`, 'GET');
      setReviews(response.data || []);
      setTotalPages(response.pagination?.total_pages || 1);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRating = async () => {
    try {
      const response = await apiCall(`/api/user/gacha-rating/${gachaId}`, 'GET');
      if (response.data) {
        setRating(response.data.rating);
        setUserReview(response.data.review_text || '');
        setReviewText(response.data.review_text || '');
      }
    } catch (error) {
      // ユーザーがまだ評価していない場合は404が返される
      if (error.response?.status !== 404) {
        console.error('Failed to load user rating:', error);
      }
    }
  };

  const handleRatingChange = async (event, newValue) => {
    if (!newValue) return;

    try {
      await apiCall('/api/user/gacha-rating', 'POST', {
        gacha_id: gachaId,
        rating: newValue,
        review_text: reviewText
      });

      setRating(newValue);
      setSnackbar({
        open: true,
        message: '評価を保存しました',
        severity: 'success'
      });

      if (onRatingUpdate) {
        onRatingUpdate(newValue);
      }

      if (showReviews) {
        loadReviews(page);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: '評価の保存に失敗しました',
        severity: 'error'
      });
      console.error('Failed to save rating:', error);
    }
  };

  const handleReviewSubmit = async () => {
    try {
      setLoading(true);
      await apiCall('/api/user/gacha-rating', 'POST', {
        gacha_id: gachaId,
        rating: rating,
        review_text: reviewText
      });

      setUserReview(reviewText);
      setDialogOpen(false);
      setSnackbar({
        open: true,
        message: editingReview ? 'レビューを更新しました' : 'レビューを投稿しました',
        severity: 'success'
      });

      if (showReviews) {
        loadReviews(page);
      }
      if (onRatingUpdate) {
        onRatingUpdate(rating);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'レビューの保存に失敗しました',
        severity: 'error'
      });
      console.error('Failed to save review:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDelete = async () => {
    try {
      await apiCall(`/api/user/gacha-rating/${gachaId}`, 'DELETE');
      setUserReview(null);
      setReviewText('');
      setRating(0);
      setDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'レビューを削除しました',
        severity: 'success'
      });

      if (showReviews) {
        loadReviews(page);
      }
      if (onRatingUpdate) {
        onRatingUpdate(0);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'レビューの削除に失敗しました',
        severity: 'error'
      });
      console.error('Failed to delete review:', error);
    }
  };

  const openReviewDialog = () => {
    setEditingReview(!!userReview);
    setReviewText(userReview || '');
    setDialogOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Rating
          value={rating}
          onChange={handleRatingChange}
          size="small"
          icon={<StarIcon fontSize="inherit" />}
        />
        <Typography variant="caption" color="text.secondary">
          {rating > 0 ? `${rating}/5` : '評価なし'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* ユーザーの評価セクション */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          このガチャを評価
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Rating
            value={rating}
            onChange={handleRatingChange}
            size="large"
            icon={<StarIcon fontSize="inherit" />}
            emptyIcon={<StarIcon fontSize="inherit" />}
          />
          <Typography variant="body2" color="text.secondary">
            {rating > 0 ? `${rating}/5` : '評価してください'}
          </Typography>
        </Box>
        
        {userReview && (
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="body2">
                あなたのレビュー: {userReview}
              </Typography>
              <IconButton size="small" onClick={openReviewDialog}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        )}

        <Button
          variant="outlined"
          size="small"
          onClick={openReviewDialog}
          sx={{ mt: 1 }}
        >
          {userReview ? 'レビューを編集' : 'レビューを書く'}
        </Button>
      </Box>

      {/* レビュー一覧セクション */}
      {showReviews && (
        <Box>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>
            みんなのレビュー
          </Typography>
          
          {reviews.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              まだレビューがありません
            </Typography>
          ) : (
            <Box sx={{ space: 2 }}>
              {reviews.map((review) => (
                <Box key={review.id} sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Avatar
                      src={review.user_avatar_url}
                      sx={{ width: 40, height: 40 }}
                    >
                      {review.user_name?.charAt(0) || 'U'}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {review.user_name || 'Anonymous'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(review.created_at)}
                        </Typography>
                      </Box>
                      <Rating value={review.rating} size="small" readOnly />
                      {review.review_text && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {review.review_text}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              ))}
              
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(event, value) => loadReviews(value)}
                    color="primary"
                  />
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* レビュー投稿/編集ダイアログ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingReview ? 'レビューを編集' : 'レビューを投稿'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography component="legend" gutterBottom>
              評価
            </Typography>
            <Rating
              value={rating}
              onChange={(event, newValue) => setRating(newValue)}
              size="large"
              icon={<StarIcon fontSize="inherit" />}
            />
          </Box>
          <TextField
            multiline
            rows={4}
            fullWidth
            label="レビュー（任意）"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="このガチャの感想を教えてください..."
            helperText="具体的な感想やおすすめポイントを書いてください"
          />
        </DialogContent>
        <DialogActions>
          {editingReview && (
            <Button
              onClick={handleReviewDelete}
              color="error"
              disabled={loading}
              startIcon={<DeleteIcon />}
            >
              削除
            </Button>
          )}
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>
            キャンセル
          </Button>
          <Button
            onClick={handleReviewSubmit}
            variant="contained"
            disabled={loading || rating === 0}
          >
            {editingReview ? '更新' : '投稿'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}