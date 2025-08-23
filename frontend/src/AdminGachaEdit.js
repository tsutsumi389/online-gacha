import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  Switch, TextField, IconButton, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, 
  DialogActions, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ImageIcon from '@mui/icons-material/Image';
import { myGachaAPI, adminGachaAPI } from './utils/api';
import ImageUpload from './components/ImageUpload';
import ImageManager from './components/ImageManager';

export default function AdminGachaEdit() {
  const { id: gachaId } = useParams();
  const navigate = useNavigate();
  const [gacha, setGacha] = useState(null);
  const [loading, setLoading] = useState(!!gachaId);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: 100,
    isPublic: true,
    displayFrom: '',
    displayTo: ''
  });
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const [openDeleteItem, setOpenDeleteItem] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);
  const [successMessage, setSuccessMessage] = useState(''); // 成功メッセージ
  const [imageManagerOpen, setImageManagerOpen] = useState(false); // 画像管理ダイアログ
  
  // ガチャ画像管理用のstate
  const [gachaImages, setGachaImages] = useState([]);
  const [gachaImagesLoading, setGachaImagesLoading] = useState(false);
  const [gachaImageError, setGachaImageError] = useState('');
  const [draggedImage, setDraggedImage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const isNewGacha = !gachaId;
  const currentGachaId = gachaId;

  // 既存ガチャデータを取得
  const fetchGacha = async () => {
    if (!gachaId) return;
    
    try {
      setLoading(true);
      const response = await myGachaAPI.getGacha(gachaId);
      const gachaData = response.gacha;
      setGacha(gachaData);
      setForm({
        name: gachaData.name || '',
        description: gachaData.description || '',
        price: gachaData.price || 100,
        isPublic: gachaData.isPublic || true,
        displayFrom: gachaData.displayFrom || '',
        displayTo: gachaData.displayTo || ''
      });
    } catch (err) {
      setError('ガチャの取得に失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ガチャアイテム一覧を取得
  const fetchItems = async () => {
    if (!currentGachaId) return;
    
    try {
      setItemsLoading(true);
      const response = await myGachaAPI.getGachaItems(currentGachaId);
      setItems(response.items || []);
    } catch (err) {
      setError('アイテム一覧の取得に失敗しました: ' + err.message);
    } finally {
      setItemsLoading(false);
    }
  };

  // ガチャ画像一覧を取得
  const fetchGachaImages = async () => {
    if (!currentGachaId) return;
    
    try {
      setGachaImagesLoading(true);
      setGachaImageError('');
      const response = await adminGachaAPI.getGachaImages(currentGachaId);
      setGachaImages(response.images || []);
    } catch (err) {
      // 404エラー（ガチャが見つからない、または画像が存在しない）の場合は空の配列を設定
      if (err.message.includes('Not Found') || err.message.includes('Gacha not found')) {
        setGachaImages([]);
        setGachaImageError(''); // エラーメッセージをクリア
      } else {
        setGachaImageError('ガチャ画像の取得に失敗しました: ' + err.message);
      }
    } finally {
      setGachaImagesLoading(false);
    }
  };

  // ガチャ画像アップロード
  const handleGachaImageUpload = async (file) => {
    if (!currentGachaId) {
      setGachaImageError('ガチャを保存してから画像をアップロードしてください');
      return;
    }

    // ファイル検証
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setGachaImageError('対応していないファイル形式です。JPEG、PNG、WebP形式のファイルを選択してください。');
      return;
    }

    if (file.size > maxSize) {
      setGachaImageError(`ファイルサイズが大きすぎます。最大サイズ: ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    try {
      setGachaImagesLoading(true);
      setGachaImageError('');
      
      console.log('アップロード開始:', { currentGachaId, file, gachaImages });
      
      // 新しいAPIを使用（fileを直接渡す）
      const response = await adminGachaAPI.uploadGachaImage(currentGachaId, file, {
        displayOrder: gachaImages.length + 1,
        isMain: gachaImages.length === 0 // 最初の画像をメインにする
      });
      
      console.log('アップロード結果:', response);
      
      if (response.success) {
        await fetchGachaImages(); // 画像一覧を再取得
        setSuccessMessage('画像がアップロードされました');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setGachaImageError('画像のアップロードに失敗しました: ' + err.message);
    } finally {
      setGachaImagesLoading(false);
    }
  };

  // ガチャ画像削除
  const handleGachaImageDelete = async (imageId) => {
    if (!window.confirm('この画像を削除しますか？')) return;

    try {
      setGachaImagesLoading(true);
      setGachaImageError('');
      
      await adminGachaAPI.deleteGachaImage(currentGachaId, imageId);
      await fetchGachaImages(); // 画像一覧を再取得
      setSuccessMessage('画像が削除されました');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setGachaImageError('画像の削除に失敗しました: ' + err.message);
    } finally {
      setGachaImagesLoading(false);
    }
  };

  // ガチャ画像の並び順変更
  const handleGachaImageReorder = async (dragIndex, hoverIndex) => {
    try {
      const reorderedImages = [...gachaImages];
      const draggedItem = reorderedImages[dragIndex];
      reorderedImages.splice(dragIndex, 1);
      reorderedImages.splice(hoverIndex, 0, draggedItem);

      // 表示順序を更新
      const imageOrders = reorderedImages.map((img, index) => ({
        id: img.id,
        display_order: index + 1
      }));

      setGachaImages(reorderedImages); // 先にUIを更新

      // TODO: 管理者用APIに画像並び順変更機能を追加
      // await adminGachaAPI.updateGachaImageOrder(currentGachaId, imageOrders);
      // await fetchGachaImages(); // 最新データを再取得
      console.log('画像並び順変更機能は未実装です');
    } catch (err) {
      setGachaImageError('画像の並び順変更に失敗しました: ' + err.message);
      await fetchGachaImages(); // エラー時は元に戻す
    }
  };

  // メイン画像設定
  const handleSetMainImage = async (imageId) => {
    try {
      setGachaImagesLoading(true);
      setGachaImageError('');
      
      // TODO: 管理者用APIにメイン画像設定機能を追加
      // await adminGachaAPI.setMainGachaImage(currentGachaId, imageId);
      // await fetchGachaImages(); // 画像一覧を再取得
      console.log('メイン画像設定機能は未実装です');
      setSuccessMessage('メイン画像設定機能は未実装です');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setGachaImageError('メイン画像の設定に失敗しました: ' + err.message);
    } finally {
      setGachaImagesLoading(false);
    }
  };

  // ドラッグ&ドロップ処理
  const handleDragOver = (e) => {
    e.preventDefault();
    if (!gachaImagesLoading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (gachaImagesLoading) return;
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => 
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    );
    
    if (imageFile) {
      handleGachaImageUpload(imageFile);
    } else {
      setGachaImageError('対応していないファイル形式です。JPEG、PNG、WebP形式のファイルを選択してください。');
      setTimeout(() => setGachaImageError(''), 3000);
    }
  };

  useEffect(() => {
    if (gachaId) {
      fetchGacha();
    }
  }, [gachaId]);

  useEffect(() => {
    if (currentGachaId) {
      fetchItems();
      fetchGachaImages();
    }
  }, [currentGachaId]);

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

      let result;
      if (isNewGacha) {
        result = await myGachaAPI.createGacha(gachaData);
        // 新規作成されたガチャのIDを保存して編集ページに移動
        if (result.gacha && result.gacha.id) {
          setSuccessMessage('ガチャが正常に作成されました。続けてアイテムを追加できます。');
          // 編集ページにリダイレクト
          navigate(`/my-gacha/edit/${result.gacha.id}`, { replace: true });
          return;
        }
      } else {
        result = await myGachaAPI.updateGacha(currentGachaId, gachaData);
        navigate('/my-gacha'); // 更新の場合は一覧に戻る
      }
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
        stock: parseInt(editItem.stock),
        imageUrl: editItem.imageUrl.trim(),
        isPublic: editItem.isPublic
      };

      if (isNewItem) {
        await myGachaAPI.createGachaItem(currentGachaId, itemData);
      } else {
        await myGachaAPI.updateGachaItem(currentGachaId, editItem.id, itemData);
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
      await myGachaAPI.deleteGachaItem(currentGachaId, deleteItemId);
      setOpenDeleteItem(false);
      setDeleteItemId(null);
      await fetchItems(); // アイテム一覧を再取得
    } catch (err) {
      setError('アイテムの削除に失敗しました: ' + err.message);
      setOpenDeleteItem(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', my: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {isNewGacha ? 'ガチャ新規作成' : 'ガチャ編集'}
      </Typography>
      
      <Button variant="outlined" sx={{ mb: 3 }} onClick={() => navigate('/my-gacha')}>
        一覧に戻る
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
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

      {/* ガチャ画像管理（ガチャが作成済みの場合） */}
      {currentGachaId && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>ガチャ画像管理</Typography>
          
          {gachaImageError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {gachaImageError}
            </Alert>
          )}

          {/* 画像アップロード */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>画像追加</Typography>
            <Paper
              sx={{
                p: 3,
                border: '2px dashed',
                borderColor: isDragOver ? 'primary.main' : 'divider',
                textAlign: 'center',
                cursor: gachaImagesLoading ? 'not-allowed' : 'pointer',
                bgcolor: gachaImagesLoading ? 'action.disabled' : 
                         isDragOver ? 'primary.light' : 'background.paper',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: gachaImagesLoading ? 'divider' : 'primary.main',
                  bgcolor: gachaImagesLoading ? 'action.disabled' : 'action.hover'
                }
              }}
              onClick={() => !gachaImagesLoading && document.getElementById('gacha-image-input').click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                id="gacha-image-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleGachaImageUpload(file);
                  }
                }}
                disabled={gachaImagesLoading}
              />
              
              {gachaImagesLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={40} />
                  <Typography color="text.secondary">アップロード中...</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <ImageIcon sx={{ fontSize: 48, color: isDragOver ? 'primary.main' : 'text.secondary' }} />
                  <Typography color={isDragOver ? 'primary.main' : 'text.primary'}>
                    {isDragOver ? 'ファイルをドロップしてください' : 'クリックまたはドラッグ&ドロップで画像をアップロード'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    JPEG, PNG, WebP形式（最大5MB）
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>

          {/* 画像一覧 */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              画像一覧 {gachaImages.length > 0 && `(${gachaImages.length}枚)`}
            </Typography>
            
            {gachaImagesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : gachaImages.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 2 }}>
                画像がアップロードされていません
              </Typography>
            ) : (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: 2 
              }}>
                {gachaImages.map((image, index) => (
                  <Box
                    key={image.id}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      overflow: 'hidden',
                      position: 'relative',
                      ...(image.isMain && {
                        border: 2,
                        borderColor: 'primary.main',
                      })
                    }}
                  >
                    {/* メイン画像バッジ */}
                    {image.isMain && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          bgcolor: 'primary.main',
                          color: 'white',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          zIndex: 1
                        }}
                      >
                        メイン
                      </Box>
                    )}
                    
                    {/* 画像 */}
                    <img
                      src={image.imageUrl}
                      alt={image.filename}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                    
                    {/* 画像情報と操作ボタン */}
                    <Box sx={{ p: 1 }}>
                      <Typography variant="caption" noWrap>
                        {image.filename}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {Math.round(image.size / 1024)}KB
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        順序: {image.displayOrder}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                        {!image.isMain && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleSetMainImage(image.id)}
                            disabled={gachaImagesLoading}
                          >
                            メイン設定
                          </Button>
                        )}
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleGachaImageDelete(image.id)}
                          disabled={gachaImagesLoading}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {gachaImages.length > 1 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              画像の並び順を変更するには、今後のアップデートで対応予定です。
              現在は最初にアップロードした画像がメイン画像として設定されます。
            </Alert>
          )}
        </Paper>
      )}

      {/* アイテム管理（ガチャが作成済みの場合） */}
      {currentGachaId && (
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
                    <TableCell>在庫</TableCell>
                    <TableCell>公開状態</TableCell>
                    <TableCell>画像</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        アイテムがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.stock}</TableCell>
                        <TableCell>
                          <Switch checked={item.is_public} disabled />
                        </TableCell>
                        <TableCell>
                          {item.image_url ? (
                            <Box
                              component="img"
                              src={item.image_url}
                              alt={item.name}
                              sx={{
                                width: 50,
                                height: 50,
                                objectFit: 'cover',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'grey.300'
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 50,
                                height: 50,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px dashed',
                                borderColor: 'grey.300',
                                borderRadius: 1,
                                color: 'text.secondary',
                                fontSize: '0.8rem'
                              }}
                            >
                              画像なし
                            </Box>
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
                <TextField 
                  label="在庫数" 
                  type="number" 
                  value={editItem.stock} 
                  onChange={e => setEditItem({ ...editItem, stock: Number(e.target.value) })} 
                  fullWidth 
                  inputProps={{ min: 0 }}
                />
                
                {/* 画像アップロード */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ImageIcon />
                    アイテム画像
                  </Typography>
                  <ImageUpload
                    value={editItem.imageUrl}
                    onChange={(url) => setEditItem({ ...editItem, imageUrl: url })}
                  />
                  <Box sx={{ mt: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setImageManagerOpen(true)}
                    >
                      アップロード済み画像から選択
                    </Button>
                  </Box>
                </Box>
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

      {/* 画像管理ダイアログ */}
      <ImageManager
        open={imageManagerOpen}
        onClose={() => setImageManagerOpen(false)}
        onSelect={(url) => setEditItem({ ...editItem, imageUrl: url })}
      />
    </Box>
  );
}
