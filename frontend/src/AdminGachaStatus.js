import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Pagination, CircularProgress, Alert
} from '@mui/material';
import { myGachaAPI } from './utils/api';

export default function AdminGachaStatus() {
  const { id } = useParams();
  const [gacha, setGacha] = useState(null);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchGachaStatus = async () => {
      try {
        setLoading(true);
        const response = await myGachaAPI.getGachaStatus(id, page);
        setGacha(response.gacha);
        setWinners(response.winners);
        setTotalPages(response.pagination.total_pages);
      } catch (err) {
        setError(err.message || 'エラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchGachaStatus();
  }, [id, page]);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        ガチャ状況: {gacha?.name}
      </Typography>
      <Typography variant="body1" gutterBottom>
        {gacha?.description}
      </Typography>

      <Typography variant="h6" gutterBottom>
        アイテム在庫状況
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>アイテム名</TableCell>
              <TableCell align="right">残り数</TableCell>
              <TableCell align="right">初期在庫数</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gacha?.items?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell align="right">{item.stock}</TableCell>
                <TableCell align="right">{item.initial_stock}</TableCell>
              </TableRow>
            )) || (
              <TableRow>
                <TableCell colSpan={3} align="center">データがありません</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h6" gutterBottom sx={{ marginTop: 4 }}>
        当選者情報
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ユーザー名</TableCell>
              <TableCell>メールアドレス</TableCell>
              <TableCell>当選日時</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {winners?.map((winner, index) => (
              <TableRow key={index}>
                <TableCell>{winner.user?.name || '不明'}</TableCell>
                <TableCell>{winner.user?.email || '不明'}</TableCell>
                <TableCell>{winner.drawn_at ? new Date(winner.drawn_at).toLocaleString() : '不明'}</TableCell>
              </TableRow>
            )) || (
              <TableRow>
                <TableCell colSpan={3} align="center">当選者情報がありません</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Pagination
        count={totalPages}
        page={page}
        onChange={handlePageChange}
        sx={{ marginTop: 4 }}
      />
    </Box>
  );
}
