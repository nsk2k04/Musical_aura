import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, Volume2, Sparkles, Music, Waves, Zap } from 'lucide-react';

export default function VoiceAura() {
  const [audioFile, setAudioFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const fileInputRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioContext]);

  const handleFileUpload = (file) => {
    if (file && file.type.startsWith('audio/')) {
      const url = URL.createObjectURL(file);
      setAudioFile({ name: file.name, url });
      setIsPlaying(false);
      setCurrentTime(0);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const initAudioContext = () => {
    if (!audioContext && audioRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyzerNode = ctx.createAnalyser();
      analyzerNode.fftSize = 512;
      analyzerNode.smoothingTimeConstant = 0.7;
      
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyzerNode);
      analyzerNode.connect(ctx.destination);
      
      setAudioContext(ctx);
      setAnalyser(analyzerNode);
    }
  };

  const togglePlay = async () => {
    if (!audioFile) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      if (!audioContext) {
        initAudioContext();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (audioContext?.state === 'suspended') {
        await audioContext.resume();
      }
      
      audioRef.current.play();
      setIsPlaying(true);
      visualize();
    }
  };

  const visualize = () => {
    if (!analyser || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.35;
    
    // Initialize particles once
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 100; i++) {
        particlesRef.current.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          size: Math.random() * 2 + 1,
          hue: Math.random() * 60 + 200
        });
      }
    }
    
    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = 'rgba(5, 5, 15, 0.25)';
      ctx.fillRect(0, 0, width, height);
      
      const bass = dataArray.slice(0, 10).reduce((a, b) => a + b) / 10 / 255;
      const mid = dataArray.slice(10, 50).reduce((a, b) => a + b) / 40 / 255;
      const treble = dataArray.slice(50, 100).reduce((a, b) => a + b) / 50 / 255;
      const avg = (bass + mid + treble) / 3;
      
      // Main aura
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * (1.2 + avg * 0.4));
      gradient.addColorStop(0, `hsla(${270 + bass * 80}, 85%, 65%, 0.9)`);
      gradient.addColorStop(0.4, `hsla(${230 + mid * 60}, 75%, 55%, 0.5)`);
      gradient.addColorStop(0.8, `hsla(${190 + treble * 50}, 65%, 50%, 0.2)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius * (1 + avg * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 30;
      ctx.shadowColor = `hsla(${250 + bass * 80}, 100%, 60%, 0.5)`;
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Frequency bars
      const bars = 48;
      const barWidth = (Math.PI * 2) / bars;
      
      for (let i = 0; i < bars; i++) {
        const index = Math.floor(i * (bufferLength / bars));
        const value = dataArray[index] / 255;
        const angle = (i * barWidth) - Math.PI / 2;
        const barLength = maxRadius * 0.4 * value;
        const startRadius = maxRadius * 0.7;
        
        const x1 = centerX + Math.cos(angle) * startRadius;
        const y1 = centerY + Math.sin(angle) * startRadius;
        const x2 = centerX + Math.cos(angle) * (startRadius + barLength);
        const y2 = centerY + Math.sin(angle) * (startRadius + barLength);
        
        const hue = (i / bars) * 120 + 200;
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.6 + value * 0.4})`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      
      // Particles
      particlesRef.current.forEach((p, i) => {
        const freq = dataArray[i % bufferLength] / 255;
        
        p.x += p.vx * (1 + freq * 2);
        p.y += p.vy * (1 + freq * 2);
        
        if (p.x < 0 || p.x > width) {
          p.vx *= -1;
          p.x = Math.max(0, Math.min(width, p.x));
        }
        if (p.y < 0 || p.y > height) {
          p.vy *= -1;
          p.y = Math.max(0, Math.min(height, p.y));
        }
        
        const size = p.size * (1 + freq * 1.2);
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue + freq * 60}, 90%, 70%, ${0.7 + freq * 0.3})`;
        ctx.shadowBlur = 10 + freq * 15;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 70%, 0.8)`;
        ctx.fill();
      });
      
      ctx.shadowBlur = 0;
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * duration;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white overflow-hidden relative">
      {/* Simplified background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
        {/* Header */}
        <div className="text-center mb-8 space-y-3 max-w-4xl">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Sparkles className="w-10 h-10 text-purple-400" />
            <h1 className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Musical Aura
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-purple-200">
            Turn Any Sound Into a Living Visual Identity
          </p>
          <p className="text-sm text-purple-300/60">
            Upload an audio file and witness your sound transform into mesmerizing visuals
          </p>
        </div>

        {/* Main Canvas Area */}
        <div className="w-full max-w-5xl">
          <div 
            className={`relative bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border-2 overflow-hidden transition-all duration-300 ${
              isDragging ? 'border-purple-400 scale-105' : 'border-purple-500/20'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-64 sm:h-80 lg:h-96 bg-gradient-to-br from-slate-950/90 to-purple-950/90"
            />
            
            {!audioFile && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center space-y-4 p-6">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border-2 border-purple-400/30">
                    <Music className="w-12 h-12 text-purple-300" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-purple-200 mb-2">Ready to Begin</h3>
                    <p className="text-purple-300/70 text-sm">Drop your audio file here or click upload</p>
                  </div>
                </div>
              </div>
            )}
            
            {isPlaying && (
              <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-xl px-3 py-2 rounded-full border border-purple-500/30 flex items-center gap-2">
                <Waves className="w-4 h-4 text-purple-400 animate-pulse" />
                <span className="text-purple-200 text-xs font-medium">Live</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileUpload(e.target.files[0])}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full font-semibold transition-all transform hover:scale-105 shadow-lg shadow-purple-500/50 text-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Audio</span>
              </button>

              <button
                onClick={togglePlay}
                disabled={!audioFile}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all transform hover:scale-105 shadow-lg text-sm ${
                  audioFile
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-blue-500/50'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Play</span>
                  </>
                )}
              </button>

              <div className="flex-1"></div>

              <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur-xl px-3 py-2 rounded-full border border-purple-500/20">
                <Zap className="w-3 h-3 text-purple-400" />
                <span className="text-purple-200 text-xs font-medium">Cosmic Mode</span>
              </div>
            </div>

            {audioFile && (
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Music className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-purple-200 text-sm font-medium truncate">
                      {audioFile.name}
                    </span>
                  </div>
                  <span className="text-purple-300/80 text-xs font-mono ml-4 flex-shrink-0">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                <div 
                  className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden cursor-pointer group"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full transition-all"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <div className="flex items-center justify-center gap-2 text-purple-300/50 text-xs">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
            <p>🔒 100% Private — Your audio never leaves your device</p>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => {
          setIsPlaying(false);
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
        }}
      />
    </div>
  );
}