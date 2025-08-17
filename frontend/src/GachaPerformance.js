import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';

// 星アニメーション用コンポーネント
function StarAnimation({ color = 'gray', onEnd, repeat = 1, delay = 0 }) {
  const [running, setRunning] = useState(false);
  const starRef = useRef();

  useEffect(() => {
    let timeout;
    setRunning(true);
    if (onEnd) {
      timeout = setTimeout(() => {
        setRunning(false);
        onEnd();
      }, 1200 * repeat + delay);
    }
    return () => clearTimeout(timeout);
  }, [repeat, delay, onEnd]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 120, overflow: 'hidden', background: '#222', borderRadius: 2 }}>
      {[...Array(repeat)].map((_, i) => (
        <Box
          key={i}
          ref={starRef}
          sx={{
            position: 'absolute',
            top: 40 + i * 20,
            left: running ? '100%' : '-60px',
            width: 60,
            height: 60,
            transition: 'left 1.2s cubic-bezier(0.4,0,0.2,1)',
            transitionDelay: `${delay + i * 200}ms`,
            zIndex: 2,
          }}
        >
          <svg width="60" height="60" viewBox="0 0 60 60">
            <polygon
              points="30,5 36,22 54,22 39,33 45,50 30,39 15,50 21,33 6,22 24,22"
              fill={color}
              stroke="#fff"
              strokeWidth="2"
              filter={color === 'red' ? 'drop-shadow(0 0 8px #f00)' : 'drop-shadow(0 0 4px #fff)'}
            />
          </svg>
        </Box>
      ))}
    </Box>
  );
}

export default function GachaPerformance({ type: initialType = 'normal', onBack }) {
  const [type, setType] = useState(initialType);
  const [step, setStep] = useState(0); // 0: start, 1: reverse red, 2: done

  useEffect(() => {
    setType(initialType);
    setStep(0);
  }, [initialType]);

  const handleAnimationEnd = () => {
    if (type === 'reverse') {
      if (step === 0) {
        setStep(1); // 白黒星の後、赤星へ
      } else if (step === 1) {
        setStep(2); // 赤星の後、完了
      }
    } else {
      setStep(2); // 通常・確定は1回で完了
    }
  };

  const animationDone = step === 2;

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
        <StarAnimation color="gray" onEnd={handleAnimationEnd} />
      )}
      {type === 'reverse' && step === 1 && (
        <StarAnimation color="red" onEnd={handleAnimationEnd} />
      )}
      {animationDone && (
        <Typography color="#fff" sx={{ mt: 2, mb: 2 }}>演出が終了しました</Typography>
      )}
      <Box sx={{ mt: 4 }}>
        <Button variant="contained" color="secondary" onClick={onBack} disabled={!animationDone}>
          戻る
        </Button>
      </Box>
    </Box>
  );
}
