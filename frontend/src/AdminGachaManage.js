import React, { useState } from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Switch, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AdminGachaEdit from './AdminGachaEdit';

// モックデータ
const mockGachas = [
  {
    id: 1,
    name: 'サマーくじ',
    price: 300,
    is_public: true,
    display_from: '2025-08-01',
    display_to: '2025-08-31',
  },
  {
    id: 2,
    name: 'レアアイテムガチャ',
    price: 500,
    is_public: false,
    display_from: '2025-09-01',
    display_to: '2025-09-30',
  },
];

export default function AdminGachaManage({ gacha, onBack }) {
  const [gachas, setGachas] = useState(mockGachas);
  const [showEdit, setShowEdit] = useState(!!gacha);
  const [editGacha, setEditGacha] = useState(gacha || null);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const handleEdit = (gacha) => {
    setEditGacha(gacha);
    setShowEdit(true);
  };
  const handleEditSave = () => {
    setGachas(gachas.map(g => g.id === editGacha.id ? editGacha : g));
    setShowEdit(false);
  };
  const handleDelete = (id) => {
    setDeleteId(id);
    setOpenDelete(true);
  };
  const handleDeleteConfirm = () => {
    setGachas(gachas.filter(g => g.id !== deleteId));
    setOpenDelete(false);
  };
  const handleNew = () => {
    setEditGacha({ id: Date.now(), name: '', price: 0, is_public: true, display_from: '', display_to: '' });
    setShowEdit(true);
  };

  if (showEdit) {
    return <AdminGachaEdit gacha={editGacha} onBack={() => { setShowEdit(false); setEditGacha(null); }} />;
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', my: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>ガチャ管理</Typography>
      <Button variant="contained" color="primary" sx={{ mb: 2 }} onClick={handleNew}>新規作成</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ガチャ名</TableCell>
              <TableCell>価格</TableCell>
              <TableCell>公開</TableCell>
              <TableCell>表示期間</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gachas.map(gacha => (
              <TableRow key={gacha.id}>
                <TableCell>{gacha.name}</TableCell>
                <TableCell>{gacha.price} pt</TableCell>
                <TableCell>
                  <Switch checked={gacha.is_public} disabled />
                </TableCell>
                <TableCell>{gacha.display_from} ～ {gacha.display_to}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleEdit(gacha)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(gacha.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 削除ダイアログ */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>ガチャ削除</DialogTitle>
        <DialogContent>本当に削除しますか？</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>キャンセル</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">削除</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
