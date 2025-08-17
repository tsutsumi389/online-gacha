import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';

// 星アニメーション用コンポーネント
function StarAnimation({ color = 'gray', onEnd, stopInCenter = false, changeColor = null }) {
  const [phase, setPhase] = useState('start'); // start, stopped, resumed, end
  const [starColor, setStarColor] = useState(color);
  const starRef = useRef();

  useEffect(() => {
    setStarColor(color); // color propが変わったらリセット
    setPhase('start');
    // eslint-disable-next-line
  }, [color, stopInCenter, changeColor]);

  useEffect(() => {
    let timeout;
    if (stopInCenter && phase === 'start') {
      // 0.6sで中央停止
      timeout = setTimeout(() => {
        setPhase('stopped');
        if (changeColor) setStarColor(changeColor);
      }, 600);
    } else if (stopInCenter && phase === 'stopped' && changeColor) {
      // 色変化後、0.2s待って再始動
      timeout = setTimeout(() => {
        setPhase('resumed');
      }, 200);
    } else if (stopInCenter && phase === 'resumed') {
      // 再始動後0.6sで終了
      timeout = setTimeout(() => {
        setPhase('end');
        if (onEnd) onEnd();
      }, 600);
    } else if (!stopInCenter && phase === 'start') {
      // 通常アニメ
      timeout = setTimeout(() => {
        setPhase('end');
        if (onEnd) onEnd();
      }, 1200);
    }
    return () => clearTimeout(timeout);
  }, [phase, stopInCenter, changeColor, onEnd]);

  // 位置計算
  let left = '-60px';
  if (phase === 'start') left = '100%';
  else if (phase === 'stopped') left = 'calc(50% - 30px)';
  else if (phase === 'resumed') left = '100%';
  else if (phase === 'end') left = '100%';

  let transition = 'left 0.6s cubic-bezier(0.4,0,0.2,1)';
  if (phase === 'stopped') transition = 'left 0.2s linear';

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 120, overflow: 'hidden', background: '#222', borderRadius: 2 }}>
      {(phase !== 'end' || left === '100%') && (
        <Box
          ref={starRef}
          sx={{
            position: 'absolute',
            top: 40,
            left,
            width: 60,
            height: 60,
            transition,
            zIndex: 2,
          }}
        >
          <svg width="60" height="60" viewBox="0 0 60 60">
            <polygon
              points="30,5 36,22 54,22 39,33 45,50 30,39 15,50 21,33 6,22 24,22"
              fill={starColor}
              stroke="#fff"
              strokeWidth="2"
              filter={starColor === 'red' ? 'drop-shadow(0 0 8px #f00)' : 'drop-shadow(0 0 4px #fff)'}
            />
          </svg>
        </Box>
      )}
    </Box>
  );
}

export default function GachaPerformance({ type: initialType = 'normal', onBack, result = { name: 'SSRドラゴン', image: 'https://placehold.jp/100x100.png?text=SSR', rarity: 'SSR' } }) {
  const [type, setType] = useState(initialType);
  const [step, setStep] = useState(0); // 0: start, 1: done

  useEffect(() => {
    setType(initialType);
    setStep(0);
  }, [initialType]);

  const handleAnimationEnd = () => {
    setStep(1);
  };

  const animationDone = step === 1;

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', my: 6, p: 3, bgcolor: '#111', borderRadius: 3, boxShadow: 3, textAlign: 'center' }}>
      <Typography variant="h6" color="#fff" sx={{ mb: 2 }}>
        {type === 'normal' && '一般演出'}
        {type === 'sure' && '確定演出'}
        {type === 'reverse' && '逆転演出'}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
        <Button variant={type === 'normal' ? 'contained' : 'outlined'} onClick={() => { setType('normal'); setStep(0); }}>一般</Button>
        <Button variant={type === 'sure' ? 'contained' : 'outlined'} onClick={() => { setType('sure'); setStep(0); }}>確定</Button>
        <Button variant={type === 'reverse' ? 'contained' : 'outlined'} onClick={() => { setType('reverse'); setStep(0); }}>逆転</Button>
      </Box>
      {type === 'normal' && step === 0 && (
        <StarAnimation color="gray" onEnd={handleAnimationEnd} />
      )}
      {type === 'sure' && step === 0 && (
        <StarAnimation color="red" onEnd={handleAnimationEnd} />
      )}
      {type === 'reverse' && step === 0 && (
        <StarAnimation color="gray" stopInCenter changeColor="red" onEnd={handleAnimationEnd} />
      )}
      {animationDone && (
        <Box sx={{ mt: 3, mb: 2 }}>
          <Typography color="#fff" sx={{ mb: 1 }}>当選商品</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <img src={result.image} alt={result.name} style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: 8, background: '#fff' }} />
            <Typography color="#fff" variant="h6">{result.name}</Typography>
            <Typography color="gold" fontWeight="bold">{result.rarity}</Typography>
          </Box>
        </Box>
      )}
      <Box sx={{ mt: 4 }}>
        <Button variant="contained" color="secondary" onClick={onBack} disabled={!animationDone}>
          戻る
        </Button>
      </Box>
    </Box>
  );
}
