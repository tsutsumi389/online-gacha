
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  CircularProgress,
  Pagination
} from '@mui/material';
import { Edit, Delete, Visibility, Search } from '@mui/icons-material';
import AdminGachaManage from './AdminGachaManage';
import { myGachaAPI, handleApiError } from './utils/api';

export default function MyGachaList() {
  const [showManage, setShowManage] = useState(false);
  const [selectedGacha, setSelectedGacha] = useState(null);
  const [gachas, setGachas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gachaToDelete, setGachaToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  // ガチャ一覧を取得
  const fetchGachas = async (params = {}) => {
    try {
      setLoading(true);
      const response = await myGachaAPI.getGachas({
        search: searchTerm,
        page: currentPage,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc',
        ...params
      });
      
      setGachas(response.gachas || []);
      setPagination(response.pagination || {});
      setError('');
    } catch (err) {
      setError(handleApiError(err));
      setGachas([]);
    } finally {
      setLoading(false);
    }
  };

  // コンポーネントマウント時にデータを取得
  useEffect(() => {
    fetchGachas();
  }, [currentPage]);

  // 検索実行
  const handleSearch = () => {
    setCurrentPage(1);
    fetchGachas({ page: 1 });
  };

  // Enterキーで検索
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  // ガチャ削除の確認ダイアログを開く
  const handleDeleteClick = (gacha) => {
    setGachaToDelete(gacha);
    setDeleteDialogOpen(true);
  };

  // ガチャ削除の実行
  const handleDeleteConfirm = async () => {
    try {
      await myGachaAPI.deleteGacha(gachaToDelete.id);
      setDeleteDialogOpen(false);
      setGachaToDelete(null);
      fetchGachas(); // 一覧を再取得
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  // ページ変更
  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  // 日付フォーマット
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  if (showManage) {
    return (
      <AdminGachaManage 
        gacha={selectedGacha} 
        onBack={() => { 
          setShowManage(false); 
          setSelectedGacha(null);
          fetchGachas(); // 管理画面から戻った時にリストを更新
        }} 
      />
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, margin: '2rem auto', p: 2 }}>
      <Typography variant="h4" gutterBottom>
        マイガチャ管理
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 検索・新規作成エリア */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="ガチャ名で検索"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{ minWidth: 200 }}
          />
          <Button 
            variant="outlined" 
            startIcon={<Search />}
            onClick={handleSearch}
          >
            検索
          </Button>
        </Box>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => { 
            setSelectedGacha(null); 
            setShowManage(true); 
          }}
        >
          新規作成
        </Button>
      </Box>

      {/* ローディング表示 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* ガチャ一覧テーブル */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>No</TableCell>
                  <TableCell>ガチャ名</TableCell>
                  <TableCell>価格</TableCell>
                  <TableCell>公開状態</TableCell>
                  <TableCell>作成日</TableCell>
                  <TableCell>アクション</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gachas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      ガチャが見つかりませんでした
                    </TableCell>
                  </TableRow>
                ) : (
                  gachas.map((gacha, index) => (
                    <TableRow key={gacha.id} hover>
                      <TableCell>
                        {(currentPage - 1) * pagination.itemsPerPage + index + 1}
                      </TableCell>
                      <TableCell>{gacha.name}</TableCell>
                      <TableCell>{gacha.price}円</TableCell>
                      <TableCell>
                        {gacha.isPublic || gacha.isActive ? '公開' : '非公開'}
                      </TableCell>
                      <TableCell>{formatDate(gacha.createdAt)}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => { 
                            setSelectedGacha(gacha); 
                            setShowManage(true); 
                          }}
                          title="編集"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(gacha)}
                          title="削除"
                        >
                          <Delete />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="info"
                          title="詳細"
                        >
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* ページネーション */}
          {pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={pagination.totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>ガチャの削除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            「{gachaToDelete?.name}」を削除しますか？
            <br />
            この操作は取り消せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
