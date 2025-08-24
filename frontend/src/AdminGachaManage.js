import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Switch, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ImageIcon from '@mui/icons-material/Image';
import { myGachaAPI } from './utils/api';
import ImageManager from './components/ImageManager';

export default function AdminGachaManage() {
  const navigate = useNavigate();
  const [gachas, setGachas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [imageManagerOpen, setImageManagerOpen] = useState(false); // 画像管理ダイアログ

  // ガチャ一覧を取得
  const fetchGachas = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await myGachaAPI.getGachas({ page, limit: 10 });
      setGachas(response.gachas || []);
      setPagination(response.pagination || null);
    } catch (err) {
      setError('ガチャ一覧の取得に失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGachas();
  }, [page]);

  // 公開状態切り替え
  const handleTogglePublic = async (id) => {
    try {
      await myGachaAPI.toggleGachaPublic(id);
      await fetchGachas(); // 一覧を再取得
    } catch (err) {
      setError('公開状態の変更に失敗しました: ' + err.message);
    }
  };

  const handleEdit = (gacha) => {
    navigate(`/my-gacha/edit/${gacha.id}`);
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setOpenDelete(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await myGachaAPI.deleteGacha(deleteId);
      setOpenDelete(false);
      setDeleteId(null);
      await fetchGachas(); // 一覧を再取得
    } catch (err) {
      setError('ガチャの削除に失敗しました: ' + err.message);
      setOpenDelete(false);
    }
  };

  const handleNew = () => {
    navigate('/my-gacha/new');
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', my: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>マイガチャ管理</Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="contained" color="primary" onClick={handleNew}>
          新規作成
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<ImageIcon />}
          onClick={() => setImageManagerOpen(true)}
        >
          画像管理
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ガチャ名</TableCell>
                  <TableCell>価格</TableCell>
                  <TableCell>公開状態</TableCell>
                  <TableCell>表示期間</TableCell>
                  <TableCell>総在庫数</TableCell>
                  <TableCell>プレイ回数</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gachas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      ガチャがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  gachas.map(gacha => (
                    <TableRow key={gacha.id}>
                      <TableCell>{gacha.name}</TableCell>
                      <TableCell>{gacha.price} pt</TableCell>
                      <TableCell>
                        <Switch 
                          checked={gacha.isPublic || gacha.is_public} 
                          onChange={() => handleTogglePublic(gacha.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const toDate = (val) => {
                            if (!val) return '';
                            const d = new Date(val);
                            if (isNaN(d.getTime())) return '';
                            return d.toISOString().slice(0, 10);
                          };
                          if (gacha.displayFrom && gacha.displayTo) {
                            return `${toDate(gacha.displayFrom)} ～ ${toDate(gacha.displayTo)}`;
                          } else if (gacha.displayFrom) {
                            return `${toDate(gacha.displayFrom)} ～`;
                          } else if (gacha.displayTo) {
                            return `～ ${toDate(gacha.displayTo)}`;
                          } else {
                            return '期間設定なし';
                          }
                        })()}
                      </TableCell>
                      <TableCell>
                        {gacha.itemCount || 0} 個
                      </TableCell>
                      <TableCell>
                        {gacha.playCount || 0} 回
                      </TableCell>
                      <TableCell align="right">
                        <IconButton onClick={() => handleEdit(gacha)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(gacha.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* ページネーション */}
          {pagination && pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                sx={{ mr: 1 }}
              >
                前のページ
              </Button>
              <Typography sx={{ mx: 2, alignSelf: 'center' }}>
                {page} / {pagination.totalPages}
              </Typography>
              <Button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                sx={{ ml: 1 }}
              >
                次のページ
              </Button>
            </Box>
          )}
        </>
      )}

      {/* 削除確認ダイアログ */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>ガチャ削除</DialogTitle>
        <DialogContent>
          本当にこのガチャを削除しますか？この操作は取り消すことができません。
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>キャンセル</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 画像管理ダイアログ */}
      <ImageManager
        open={imageManagerOpen}
        onClose={() => setImageManagerOpen(false)}
      />
    </Box>
  );
}
