import React, { useState } from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, CardMedia } from '@mui/material';
import GachaPerformance from './GachaPerformance';

export default function UserGachaDetail({ gacha, onBack }) {
  const [showPerformance, setShowPerformance] = useState(false);
  const [performanceType, setPerformanceType] = useState('normal');
  const handleDraw = (type) => {
    setPerformanceType(type);
    setShowPerformance(true);
  };
  if (!gacha) return null;
  if (showPerformance) {
    return (
      <GachaPerformance
        type={performanceType}
        onBack={() => setShowPerformance(false)}
      />
    );
  }
  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', my: 4, fontFamily: 'sans-serif' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">{gacha.name}</Typography>
        <Button variant="outlined" onClick={onBack}>戻る</Button>
      </Box>
      <Typography sx={{ mb: 1 }}>{gacha.description || 'ガチャの説明文が入ります。'}</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        価格: {gacha.price}pt　提供割合: {gacha.rates}
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>商品リスト</Typography>
      <Grid container spacing={2}>
        {gacha.items.map(item => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Card sx={{ opacity: item.stock === 0 ? 0.4 : 1 }}>
              <CardMedia
                component="img"
                height="100"
                image={item.image_url || 'https://placehold.jp/100x100.png?text=ITEM'}
                alt={item.name}
                sx={{ objectFit: 'contain', background: '#fafafa' }}
              />
              <CardContent sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="body1">{item.name}</Typography>
                <Typography color="primary" sx={{ fontWeight: 'bold' }}>
                  残り数: {item.stock} / {item.initial_stock || 1}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
        <Button variant="contained" size="large" onClick={() => handleDraw('normal')}>1回引く</Button>
        <Button variant="contained" size="large" onClick={() => handleDraw('normal')}>10連引く</Button>
      </Box>
    </Box>
  );
}
