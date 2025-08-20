import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  Switch, TextField, IconButton, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, 
  DialogActions, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { myGachaAPI } from './utils/api';

export default function AdminGachaEdit({ gacha, onBack }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: 100,
    isPublic: true,
    displayFrom: '',
    displayTo: '',
    ...gacha
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const [openDeleteItem, setOpenDeleteItem] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);

  const isNewGacha = !gacha || !gacha.id;

  // ガチャアイテム一覧を取得
  const fetchItems = async () => {
    if (isNewGacha) return;
    
    try {
      setItemsLoading(true);
      const response = await myGachaAPI.getGachaItems(gacha.id);
      setItems(response.items || []);
    } catch (err) {
      setError('アイテム一覧の取得に失敗しました: ' + err.message);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    if (!isNewGacha) {
      fetchItems();
    }
  }, [gacha.id, isNewGacha]);

  // ガチャ基本情報変更ハンドラ
  const handleFormChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // ガチャ保存
  const handleSaveGacha = async () => {
    try {
      setLoading(true);
      setError('');

      if (!form.name.trim()) {
        setError('ガチャ名は必須です');
        return;
      }

      if (form.price < 1) {
        setError('価格は1以上である必要があります');
        return;
      }

      const gachaData = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseInt(form.price),
        isPublic: form.isPublic,
        displayFrom: form.displayFrom || null,
        displayTo: form.displayTo || null,
      };

      console.log('Sending gacha data:', gachaData); // デバッグ用

      if (isNewGacha) {
        await myGachaAPI.createGacha(gachaData);
      } else {
        await myGachaAPI.updateGacha(gacha.id, gachaData);
      }

      onBack(); // 一覧に戻る
    } catch (err) {
      console.error('Gacha save error:', err); // デバッグ用
      
      // APIエラーレスポンスの詳細を表示
      let errorMessage = 'ガチャの保存に失敗しました';
      
      if (err.message) {
        try {
          // エラーメッセージがJSONの場合
          const errorData = JSON.parse(err.message);
          if (errorData.details) {
            errorMessage += ': ' + errorData.details;
          } else {
            errorMessage += ': ' + err.message;
          }
        } catch {
          // JSONでない場合はそのまま表示
          errorMessage += ': ' + err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // アイテム編集
  const handleItemEdit = (item) => {
    setEditItem({
      id: item.id,
      name: item.name,
      description: item.description || '',
      rarity: item.rarity || 'common',
      stock: item.stock || 0,
      imageUrl: item.image_url || '',
      isPublic: item.is_public !== false
    });
    setIsNewItem(false);
  };

  const handleItemNew = () => {
    setEditItem({
      id: null,
      name: '',
      description: '',
      rarity: 'common',
      stock: 0,
      imageUrl: '',
      isPublic: true
    });
    setIsNewItem(true);
  };

  const handleItemSave = async () => {
    try {
      if (!editItem.name.trim()) {
        setError('アイテム名は必須です');
        return;
      }

      if (editItem.stock < 0) {
        setError('在庫数は0以上である必要があります');
        return;
      }

      const itemData = {
        name: editItem.name.trim(),
        description: editItem.description.trim(),
        rarity: editItem.rarity,
        stock: parseInt(editItem.stock),
        imageUrl: editItem.imageUrl.trim(),
        isPublic: editItem.isPublic
      };

      if (isNewItem) {
        await myGachaAPI.createGachaItem(gacha.id, itemData);
      } else {
        await myGachaAPI.updateGachaItem(gacha.id, editItem.id, itemData);
      }

      setEditItem(null);
      setIsNewItem(false);
      await fetchItems(); // アイテム一覧を再取得
    } catch (err) {
      setError('アイテムの保存に失敗しました: ' + err.message);
    }
  };

  const handleItemDelete = (itemId) => {
    setDeleteItemId(itemId);
    setOpenDeleteItem(true);
  };

  const handleItemDeleteConfirm = async () => {
    try {
      await myGachaAPI.deleteGachaItem(gacha.id, deleteItemId);
      setOpenDeleteItem(false);
      setDeleteItemId(null);
      await fetchItems(); // アイテム一覧を再取得
    } catch (err) {
      setError('アイテムの削除に失敗しました: ' + err.message);
      setOpenDeleteItem(false);
    }
  };

  const rarityOptions = [
    { value: 'common', label: 'コモン', color: '#666' },
    { value: 'rare', label: 'レア', color: '#2196f3' },
    { value: 'srare', label: 'スーパーレア', color: '#ff9800' },
    { value: 'ssr', label: 'SSR', color: '#f44336' }
  ];

  const getRarityLabel = (rarity) => {
    const option = rarityOptions.find(opt => opt.value === rarity);
    return option ? option.label : rarity;
  };

  const getRarityColor = (rarity) => {
    const option = rarityOptions.find(opt => opt.value === rarity);
    return option ? option.color : '#666';
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', my: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {isNewGacha ? 'ガチャ新規作成' : 'ガチャ編集'}
      </Typography>
      
      <Button variant="outlined" sx={{ mb: 3 }} onClick={onBack}>
        一覧に戻る
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* ガチャ基本情報 */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 3 }}>基本情報</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField 
            label="ガチャ名" 
            value={form.name} 
            onChange={e => handleFormChange('name', e.target.value)} 
            fullWidth 
            required 
          />
          <TextField 
            label="説明" 
            value={form.description} 
            onChange={e => handleFormChange('description', e.target.value)} 
            fullWidth 
            multiline 
            minRows={2} 
          />
          <TextField 
            label="価格" 
            type="number" 
            value={form.price} 
            onChange={e => handleFormChange('price', Number(e.target.value))} 
            fullWidth 
            required 
            inputProps={{ min: 1 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography>公開状態</Typography>
            <Switch 
              checked={form.isPublic} 
              onChange={e => handleFormChange('isPublic', e.target.checked)} 
            />
            <Typography>{form.isPublic ? '公開' : '非公開'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField 
              label="表示開始日" 
              type="date" 
              value={form.displayFrom} 
              onChange={e => handleFormChange('displayFrom', e.target.value)} 
              InputLabelProps={{ shrink: true }} 
              sx={{ flex: 1 }}
            />
            <TextField 
              label="表示終了日" 
              type="date" 
              value={form.displayTo} 
              onChange={e => handleFormChange('displayTo', e.target.value)} 
              InputLabelProps={{ shrink: true }} 
              sx={{ flex: 1 }}
            />
          </Box>
          <Button 
            variant="contained" 
            onClick={handleSaveGacha} 
            disabled={loading}
            sx={{ alignSelf: 'flex-start' }}
          >
            {loading ? <CircularProgress size={24} /> : (isNewGacha ? '作成' : '保存')}
          </Button>
        </Box>
      </Paper>

      {/* アイテム管理（既存ガチャのみ） */}
      {!isNewGacha && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>アイテム管理</Typography>
          <Button variant="contained" color="primary" sx={{ mb: 2 }} onClick={handleItemNew}>
            アイテム追加
          </Button>
          
          {itemsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>アイテム名</TableCell>
                    <TableCell>レアリティ</TableCell>
                    <TableCell>在庫</TableCell>
                    <TableCell>公開状態</TableCell>
                    <TableCell>画像</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        アイテムがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>
                          <Typography sx={{ color: getRarityColor(item.rarity), fontWeight: 'bold' }}>
                            {getRarityLabel(item.rarity)}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.stock}</TableCell>
                        <TableCell>
                          <Switch checked={item.is_public} disabled />
                        </TableCell>
                        <TableCell>
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} width={40} height={40} style={{ objectFit: 'cover' }} />
                          ) : (
                            '画像なし'
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton onClick={() => handleItemEdit(item)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handleItemDelete(item.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* アイテム編集フォーム */}
          {editItem && (
            <Box sx={{ mt: 4, p: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {isNewItem ? 'アイテム追加' : 'アイテム編集'}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField 
                  label="アイテム名" 
                  value={editItem.name} 
                  onChange={e => setEditItem({ ...editItem, name: e.target.value })} 
                  fullWidth 
                  required 
                />
                <TextField 
                  label="説明" 
                  value={editItem.description} 
                  onChange={e => setEditItem({ ...editItem, description: e.target.value })} 
                  fullWidth 
                  multiline 
                  minRows={2} 
                />
                <FormControl fullWidth>
                  <InputLabel>レアリティ</InputLabel>
                  <Select
                    value={editItem.rarity}
                    label="レアリティ"
                    onChange={e => setEditItem({ ...editItem, rarity: e.target.value })}
                  >
                    {rarityOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        <Typography sx={{ color: option.color, fontWeight: 'bold' }}>
                          {option.label}
                        </Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField 
                  label="在庫数" 
                  type="number" 
                  value={editItem.stock} 
                  onChange={e => setEditItem({ ...editItem, stock: Number(e.target.value) })} 
                  fullWidth 
                  inputProps={{ min: 0 }}
                />
                <TextField 
                  label="画像URL" 
                  value={editItem.imageUrl} 
                  onChange={e => setEditItem({ ...editItem, imageUrl: e.target.value })} 
                  fullWidth 
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography>公開状態</Typography>
                  <Switch 
                    checked={editItem.isPublic} 
                    onChange={e => setEditItem({ ...editItem, isPublic: e.target.checked })} 
                  />
                  <Typography>{editItem.isPublic ? '公開' : '非公開'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button variant="contained" onClick={handleItemSave}>
                    保存
                  </Button>
                  <Button variant="outlined" onClick={() => { setEditItem(null); setIsNewItem(false); }}>
                    キャンセル
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* アイテム削除確認ダイアログ */}
      <Dialog open={openDeleteItem} onClose={() => setOpenDeleteItem(false)}>
        <DialogTitle>アイテム削除</DialogTitle>
        <DialogContent>
          本当にこのアイテムを削除しますか？この操作は取り消すことができません。
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteItem(false)}>キャンセル</Button>
          <Button onClick={handleItemDeleteConfirm} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
