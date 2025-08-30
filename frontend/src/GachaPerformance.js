import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Typography, Container, Paper, Chip, IconButton,
  useTheme, alpha, Backdrop, Fade, Zoom
} from '@mui/material';
import {
  Casino as CasinoIcon,
  Star as StarIcon,
  AutoAwesome as AutoAwesomeIcon,
  Celebration as CelebrationIcon,
  ArrowBack as ArrowBackIcon,
  VolumeUp as VolumeUpIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

// パーティクル効果コンポーネント
function ParticleEffect({ active, color = '#FFD700' }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (active) {
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 4,
        delay: Math.random() * 2,
        duration: Math.random() * 3 + 2
      }));
      setParticles(newParticles);
    }
  }, [active]);

  if (!active) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    >
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          initial={{ 
            opacity: 0, 
            scale: 0,
            x: `${particle.x}%`,
            y: `${particle.y}%`
          }}
          animate={{ 
            opacity: [0, 1, 0], 
            scale: [0, 1, 0],
            y: `${particle.y - 50}%`
          }}
          transition={{ 
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            repeatDelay: 1
          }}
          style={{
            position: 'absolute',
            width: particle.size,
            height: particle.size,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${particle.size * 2}px ${color}`
          }}
        />
      ))}
    </Box>
  );
}

// 改良された星アニメーション
function ModernStarAnimation({ color = 'gray', onEnd, stopInCenter = false, changeColor = null }) {
  const [phase, setPhase] = useState('start');
  const [starColor, setStarColor] = useState(color);
  const theme = useTheme();

  useEffect(() => {
    setStarColor(color);
    setPhase('start');
  }, [color, stopInCenter, changeColor]);

  useEffect(() => {
    let timeout;
    if (stopInCenter && phase === 'start') {
      timeout = setTimeout(() => {
        setPhase('stopped');
        if (changeColor) setStarColor(changeColor);
      }, 800);
    } else if (stopInCenter && phase === 'stopped' && changeColor) {
      timeout = setTimeout(() => {
        setPhase('resumed');
      }, 300);
    } else if (stopInCenter && phase === 'resumed') {
      timeout = setTimeout(() => {
        setPhase('end');
        if (onEnd) onEnd();
      }, 800);
    } else if (!stopInCenter && phase === 'start') {
      timeout = setTimeout(() => {
        setPhase('end');
        if (onEnd) onEnd();
      }, 1500);
    }
    return () => clearTimeout(timeout);
  }, [phase, stopInCenter, changeColor, onEnd]);

  const getStarGradient = (color) => {
    switch (color) {
      case 'red':
        return 'linear-gradient(45deg, #ff1744, #ff6b6b)';
      case 'gold':
        return 'linear-gradient(45deg, #ffd700, #ffeb3b)';
      default:
        return 'linear-gradient(45deg, #9e9e9e, #e0e0e0)';
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: 200,
        overflow: 'hidden',
        background: `radial-gradient(circle, ${alpha(theme.palette.primary.dark, 0.8)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <ParticleEffect active={phase === 'stopped' || phase === 'end'} color={starColor === 'red' ? '#ff1744' : '#ffd700'} />
      
      <AnimatePresence>
        {phase !== 'end' && (
          <motion.div
            initial={{ x: -200, scale: 0.5, rotate: -180 }}
            animate={{
              x: phase === 'stopped' ? 0 : phase === 'resumed' ? 200 : 200,
              scale: phase === 'stopped' ? 1.5 : 1,
              rotate: phase === 'stopped' ? 0 : 360
            }}
            exit={{ x: 200, scale: 0.5, rotate: 180 }}
            transition={{
              duration: phase === 'stopped' ? 0.8 : phase === 'resumed' ? 0.8 : 1.5,
              ease: "easeInOut"
            }}
            style={{
              position: 'relative',
              zIndex: 2
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))'
              }}
            >
              <StarIcon
                sx={{
                  fontSize: 80,
                  background: getStarGradient(starColor),
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: `drop-shadow(0 0 10px ${starColor === 'red' ? '#ff1744' : starColor === 'gold' ? '#ffd700' : '#9e9e9e'})`
                }}
              />
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}

export default function GachaPerformance({ 
  onBack, 
  result = null
}) {
  const [type, setType] = useState('normal'); // 'normal', 'sure', 'reverse'
  const [step, setStep] = useState(-1); // -1: ready, 0: start, 1: done
  const [showResult, setShowResult] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const theme = useTheme();
  
  // 音響効果用のref
  const audioRef = useRef(null);

  // デフォルトの結果データ（resultがnullの場合に使用）
  const defaultResult = { 
    item: {
      name: 'サンプルアイテム', 
      image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop', 
      description: 'ガチャで獲得したアイテムです'
    },
    rarity: 'N' // デフォルトレアリティ
  };

  const currentResult = result || defaultResult;

  useEffect(() => {
    if (currentResult && currentResult.rarity) {
      const rarity = currentResult.rarity;
      // レアリティに基づいて演出タイプを決定
      if (rarity === 'SSR' || rarity === 'SR') {
        setType('sure');
      } else { // R or N
        // 20%の確率で逆転演出
        if (Math.random() < 0.2) {
          setType('reverse');
        } else {
          setType('normal');
        }
      }
    }
    // ステートをリセット
    setStep(-1);
    setShowResult(false);
    setIsAnimating(false);
  }, [currentResult]);

  const handleAnimationEnd = () => {
    setStep(1);
    setIsAnimating(false);
    setTimeout(() => setShowResult(true), 500);
  };

  const startAnimation = () => {
    if (step !== -1) return;
    setStep(0);
    setIsAnimating(true);
    
    // 音響効果を再生
    playSound();
  };

  const playSound = () => {
    try {
      // Web Audio APIを使用して音響効果を生成
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // レアリティに基づいて音を変える
      const rarity = currentResult.rarity;
      
      if (rarity === 'SSR') {
        playSSRSound(audioContext);
      } else if (rarity === 'SR') {
        playSRSound(audioContext);
      } else if (rarity === 'R') {
        playRSound(audioContext);
      } else {
        playNormalSound(audioContext);
      }
    } catch (error) {
      console.warn('音響効果の再生に失敗しました:', error);
    }
  };

  // SSR用の豪華な音響効果
  const playSSRSound = (audioContext) => {
    const now = audioContext.currentTime;
    
    // メロディー部分
    const frequencies = [523, 659, 784, 1047]; // C5, E5, G5, C6
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, now + index * 0.2);
      oscillator.type = 'triangle';
      
      gainNode.gain.setValueAtTime(0, now + index * 0.2);
      gainNode.gain.linearRampToValueAtTime(0.2, now + index * 0.2 + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, now + index * 0.2 + 0.4);
      
      oscillator.start(now + index * 0.2);
      oscillator.stop(now + index * 0.2 + 0.4);
    });
    
    // キラキラエフェクト
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const sparkleOsc = audioContext.createOscillator();
        const sparkleGain = audioContext.createGain();
        
        sparkleOsc.connect(sparkleGain);
        sparkleGain.connect(audioContext.destination);
        
        sparkleOsc.frequency.setValueAtTime(1200 + Math.random() * 800, audioContext.currentTime);
        sparkleOsc.type = 'sine';
        
        sparkleGain.gain.setValueAtTime(0, audioContext.currentTime);
        sparkleGain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
        sparkleGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
        
        sparkleOsc.start(audioContext.currentTime);
        sparkleOsc.stop(audioContext.currentTime + 0.2);
      }, i * 100);
    }
  };

  // SR用の音響効果
  const playSRSound = (audioContext) => {
    const now = audioContext.currentTime;
    const frequencies = [440, 554, 659]; // A4, C#5, E5
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, now + index * 0.15);
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0, now + index * 0.15);
      gainNode.gain.linearRampToValueAtTime(0.15, now + index * 0.15 + 0.08);
      gainNode.gain.linearRampToValueAtTime(0, now + index * 0.15 + 0.3);
      
      oscillator.start(now + index * 0.15);
      oscillator.stop(now + index * 0.15 + 0.3);
    });
  };

  // R用の音響効果
  const playRSound = (audioContext) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(550, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(660, audioContext.currentTime + 0.5);
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.8);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);
  };

  // N用のシンプルな音響効果
  const playNormalSound = (audioContext) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.6);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.6);
  };

  const animationDone = step === 1;

  const getPerformanceConfig = (perfType) => {
    switch (perfType) {
      case 'sure':
        return {
          title: '確定演出',
          subtitle: '高レアリティ確定！',
          color: theme.palette.error.main,
          bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.2)} 0%, ${alpha(theme.palette.error.dark, 0.3)} 100%)`,
          icon: <AutoAwesomeIcon />
        };
      case 'reverse':
        return {
          title: '逆転演出',
          subtitle: 'まさかの大逆転！',
          color: theme.palette.warning.main,
          bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.2)} 0%, ${alpha(theme.palette.warning.dark, 0.3)} 100%)`,
          icon: <CelebrationIcon />
        };
      default:
        return {
          title: '通常演出',
          subtitle: 'どんなアイテムが出るかな？',
          color: theme.palette.primary.main,
          bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.dark, 0.3)} 100%)`,
          icon: <CasinoIcon />
        };
    }
  };

  const currentConfig = getPerformanceConfig(type);

  const getRarityConfig = (rarity) => {
    switch (rarity) {
      case 'SSR': return { color: '#ff1744', animColor: 'red', animHighlight: 'red' };
      case 'SR': return { color: '#ff9800', animColor: 'gold', animHighlight: 'gold' };
      case 'R': return { color: '#2196f3', animColor: 'gray', animHighlight: 'gold' };
      default: return { color: '#9e9e9e', animColor: 'gray', animHighlight: 'gold' };
    }
  };

  const rarityConfig = getRarityConfig(currentResult.rarity);

  return (
    <Backdrop
      open={true}
      sx={{
        zIndex: theme.zIndex.modal,
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
        backdropFilter: 'blur(20px)'
      }}
    >
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            elevation={24}
            sx={{
              p: 4,
              borderRadius: 4,
              background: currentConfig.bgGradient,
              border: `2px solid ${alpha(currentConfig.color, 0.3)}`,
              position: 'relative',
              overflow: 'hidden',
              textAlign: 'center',
              minHeight: 600
            }}
          >
            {/* 背景装飾 */}
            <Box
              sx={{
                position: 'absolute',
                top: -50,
                left: -50,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha(currentConfig.color, 0.1)} 0%, transparent 70%)`,
                pointerEvents: 'none'
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: -50,
                right: -50,
                width: 150,
                height: 150,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha(currentConfig.color, 0.15)} 0%, transparent 70%)`,
                pointerEvents: 'none'
              }}
            />

            {/* ヘッダー */}
            <Box sx={{ mb: 4, position: 'relative', zIndex: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <IconButton
                  onClick={onBack}
                  disabled={isAnimating}
                  sx={{
                    background: alpha(theme.palette.background.paper, 0.8),
                    '&:hover': {
                      background: alpha(theme.palette.background.paper, 0.9)
                    }
                  }}
                >
                  <ArrowBackIcon />
                </IconButton>

                <IconButton 
                  onClick={step === -1 ? startAnimation : playSound}
                  sx={{ 
                    color: currentConfig.color,
                    background: alpha(currentConfig.color, 0.1),
                    '&:hover': {
                      background: alpha(currentConfig.color, 0.2)
                    }
                  }}
                >
                  <VolumeUpIcon />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ color: currentConfig.color, fontSize: 40 }}>
                  {currentConfig.icon}
                </Box>
                <Typography 
                  variant="h4" 
                  component="h1"
                  sx={{ 
                    fontWeight: 700,
                    color: currentConfig.color
                  }}
                >
                  {currentConfig.title}
                </Typography>
              </Box>

              <Typography 
                variant="subtitle1" 
                sx={{ 
                  color: theme.palette.text.secondary,
                  mb: 3
                }}
              >
                {currentConfig.subtitle}
              </Typography>
            </Box>

            {/* アニメーション領域 */}
            <Box sx={{ mb: 4, position: 'relative', zIndex: 1, minHeight: 200 }}>
              {step === -1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Paper
                    sx={{
                      height: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `radial-gradient(circle, ${alpha(theme.palette.primary.dark, 0.1)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
                      borderRadius: 3,
                      border: `2px dashed ${alpha(currentConfig.color, 0.3)}`,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        border: `2px dashed ${alpha(currentConfig.color, 0.6)}`,
                        transform: 'scale(1.02)',
                        boxShadow: `0 8px 24px ${alpha(currentConfig.color, 0.2)}`
                      }
                    }}
                    onClick={startAnimation}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <CasinoIcon 
                          sx={{ 
                            fontSize: 80, 
                            color: currentConfig.color,
                            mb: 2,
                            filter: `drop-shadow(0 4px 8px ${alpha(currentConfig.color, 0.3)})`
                          }} 
                        />
                      </motion.div>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: currentConfig.color,
                          fontWeight: 600,
                          mb: 1
                        }}
                      >
                        ガチャを引く準備完了！
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: theme.palette.text.secondary,
                          fontStyle: 'italic'
                        }}
                      >
                        クリックして演出を開始
                      </Typography>
                    </Box>
                  </Paper>
                </motion.div>
              )}
              
              {step === 0 && type === 'normal' && (
                <ModernStarAnimation color={rarityConfig.animColor} onEnd={handleAnimationEnd} />
              )}
              {step === 0 && type === 'sure' && (
                <ModernStarAnimation color={rarityConfig.animColor} onEnd={handleAnimationEnd} />
              )}
              {step === 0 && type === 'reverse' && (
                <ModernStarAnimation color={rarityConfig.animColor} stopInCenter changeColor={rarityConfig.animHighlight} onEnd={handleAnimationEnd} />
              )}
            </Box>

            {/* 結果表示 */}
            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <Paper
                    elevation={8}
                    sx={{
                      p: 4,
                      mx: 'auto',
                      maxWidth: 400,
                      borderRadius: 3,
                      background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
                      border: `3px solid ${rarityConfig.color}`,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* レアリティ効果 */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `radial-gradient(circle, ${alpha(rarityConfig.color, 0.1)} 0%, transparent 70%)`,
                        pointerEvents: 'none'
                      }}
                    />

                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          mb: 3,
                          color: theme.palette.text.primary,
                          fontWeight: 600
                        }}
                      >
                        🎉 獲得アイテム 🎉
                      </Typography>

                      <Box sx={{ mb: 3 }}>
                        <motion.div
                          animate={{ 
                            rotateY: [0, 180, 360],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 3
                          }}
                        >
                          <Box
                            component="img"
                            src={currentResult.item?.image_url || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'}
                            alt={currentResult.item?.name || 'アイテム'}
                            sx={{
                              width: 150,
                              height: 150,
                              borderRadius: 3,
                              objectFit: 'cover',
                              border: `3px solid ${theme.palette.primary.main}`,
                              boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 100%)`
                            }}
                          />
                        </motion.div>
                      </Box>

                      <Typography 
                        variant="h5" 
                        component="h2"
                        sx={{ 
                          fontWeight: 700,
                          mb: 2,
                          color: theme.palette.text.primary
                        }}
                      >
                        {currentResult.item?.name || 'アイテム獲得！'}
                      </Typography>

                      {currentResult.item?.description && (
                        <Typography
                          variant="body1"
                          sx={{
                            textAlign: 'center',
                            color: theme.palette.text.secondary,
                            mb: 2,
                            fontWeight: 500
                          }}
                        >
                          {currentResult.item.description}
                        </Typography>
                      )}

                      <Chip
                        label="獲得完了！"
                        sx={{
                          background: `linear-gradient(45deg, ${theme.palette.success.main}, ${alpha(theme.palette.success.main, 0.8)})`,
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '1rem',
                          px: 2,
                          py: 1,
                          boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.4)}`
                        }}
                      />
                    </Box>
                  </Paper>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 戻るボタン */}
            {animationDone && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                <Box sx={{ mt: 4, position: 'relative', zIndex: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={onBack}
                    startIcon={<ArrowBackIcon />}
                    sx={{
                      borderRadius: 3,
                      px: 4,
                      py: 1.5,
                      background: `linear-gradient(45deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
                      boxShadow: `0 4px 12px ${alpha(theme.palette.secondary.main, 0.4)}`,
                      fontWeight: 600,
                      '&:hover': {
                        background: `linear-gradient(45deg, ${theme.palette.secondary.dark}, ${theme.palette.secondary.main})`,
                        transform: 'translateY(-2px)',
                        boxShadow: `0 6px 16px ${alpha(theme.palette.secondary.main, 0.5)}`
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    詳細画面に戻る
                  </Button>
                </Box>
              </motion.div>
            )}
          </Paper>
        </motion.div>
      </Container>
    </Backdrop>
  );
}
