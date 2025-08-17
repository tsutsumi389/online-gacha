import React, { useState } from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Switch, TextField, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

// 商品モック
const mockItems = [
  { id: 1, name: 'SSRドラゴン', description: '最強のドラゴン', image_url: 'https://placehold.jp/100x100.png?text=SSR', stock: 2, is_public: true },
  { id: 2, name: 'SRナイト', description: '頼れるナイト', image_url: 'https://placehold.jp/100x100.png?text=SR', stock: 10, is_public: true },
  { id: 3, name: 'Rスライム', description: 'かわいいスライム', image_url: 'https://placehold.jp/100x100.png?text=R', stock: 100, is_public: true },
];

export default function AdminGachaEdit({ gacha, onBack }) {
  const [form, setForm] = useState(gacha || { name: '', price: 0, is_public: true, display_from: '', display_to: '', description: '', images: [] });
  const [items, setItems] = useState(mockItems);
  const [editItem, setEditItem] = useState(null);
  const [isNewItem, setIsNewItem] = useState(false);

  // ガチャ基本情報ハンドラ
  const handleFormChange = (key, value) => setForm(f => ({ ...f, [key]: value }));

  // 商品編集
  const handleItemEdit = (item) => {
    setEditItem(item);
    setIsNewItem(false);
  };
  const handleItemNew = () => {
    setEditItem({ id: Date.now(), name: '', description: '', image_url: '', stock: 0, is_public: true });
    setIsNewItem(true);
  };
  const handleItemSave = () => {
    if (isNewItem) setItems([...items, editItem]);
    else setItems(items.map(i => i.id === editItem.id ? editItem : i));
    setEditItem(null);
    setIsNewItem(false);
  };
  const handleItemDelete = (id) => setItems(items.filter(i => i.id !== id));

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', my: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>ガチャ編集</Typography>
      <Button variant="outlined" sx={{ mb: 2 }} onClick={onBack}>一覧に戻る</Button>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
        <TextField label="ガチャ名" value={form.name} onChange={e => handleFormChange('name', e.target.value)} fullWidth required />
        <TextField label="説明" value={form.description} onChange={e => handleFormChange('description', e.target.value)} fullWidth multiline minRows={2} />
        <TextField label="価格" type="number" value={form.price} onChange={e => handleFormChange('price', Number(e.target.value))} fullWidth required />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography>公開</Typography>
          <Switch checked={form.is_public} onChange={e => handleFormChange('is_public', e.target.checked)} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField label="表示開始日" type="date" value={form.display_from} onChange={e => handleFormChange('display_from', e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="表示終了日" type="date" value={form.display_to} onChange={e => handleFormChange('display_to', e.target.value)} InputLabelProps={{ shrink: true }} />
        </Box>
        {/* 画像アップロード欄は省略（実装時追加） */}
      </Box>
      <Typography variant="h5" sx={{ mb: 2 }}>商品一覧</Typography>
      <Button variant="contained" color="primary" sx={{ mb: 2 }} onClick={handleItemNew}>商品追加</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>商品名</TableCell>
              <TableCell>画像</TableCell>
              <TableCell>説明</TableCell>
              <TableCell>在庫</TableCell>
              <TableCell>公開</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell><img src={item.image_url} alt={item.name} width={40} /></TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.stock}</TableCell>
                <TableCell><Switch checked={item.is_public} disabled /></TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleItemEdit(item)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleItemDelete(item.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {/* 商品編集フォーム */}
      {editItem && (
        <Box sx={{ mt: 4, p: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{isNewItem ? '商品追加' : '商品編集'}</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="商品名" value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} fullWidth required />
            <TextField label="説明" value={editItem.description} onChange={e => setEditItem({ ...editItem, description: e.target.value })} fullWidth multiline minRows={2} />
            <TextField label="画像URL" value={editItem.image_url} onChange={e => setEditItem({ ...editItem, image_url: e.target.value })} fullWidth />
            <TextField label="在庫" type="number" value={editItem.stock} onChange={e => setEditItem({ ...editItem, stock: Number(e.target.value) })} fullWidth />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography>公開</Typography>
              <Switch checked={editItem.is_public} onChange={e => setEditItem({ ...editItem, is_public: e.target.checked })} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button variant="contained" onClick={handleItemSave}>保存</Button>
              <Button variant="outlined" onClick={() => { setEditItem(null); setIsNewItem(false); }}>キャンセル</Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
