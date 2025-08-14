"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Monitor, Maximize, Minimize, Volume2, VolumeX, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DesktopViewerProps {
  stream: MediaStream | null;
  isConnected: boolean;
  connectionCode?: string;
  onDisconnect: () => void;
}

export default function DesktopViewer({ 
  stream, 
  isConnected, 
  connectionCode, 
  onDisconnect 
}: DesktopViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoStats, setVideoStats] = useState<{
    resolution: string;
    fps: number;
  }>({ resolution: '0x0', fps: 0 });

  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 设置视频流
  useEffect(() => {
    if (videoRef.current && stream) {
      console.log('[DesktopViewer] 🎬 设置视频流，轨道数量:', stream.getTracks().length);
      stream.getTracks().forEach(track => {
        console.log('[DesktopViewer] 轨道详情:', track.kind, track.id, track.enabled, track.readyState);
      });
      
      videoRef.current.srcObject = stream;
      console.log('[DesktopViewer] ✅ 视频元素已设置流');
    } else if (videoRef.current && !stream) {
      console.log('[DesktopViewer] ❌ 清除视频流');
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // 监控视频统计信息
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const updateStats = () => {
      if (video.videoWidth && video.videoHeight) {
        setVideoStats({
          resolution: `${video.videoWidth}x${video.videoHeight}`,
          fps: 0, // 实际FPS需要更复杂的计算
        });
      }
    };

    video.addEventListener('loadedmetadata', updateStats);
    video.addEventListener('resize', updateStats);

    const interval = setInterval(updateStats, 1000);

    return () => {
      video.removeEventListener('loadedmetadata', updateStats);
      video.removeEventListener('resize', updateStats);
      clearInterval(interval);
    };
  }, []);

  // 全屏相关处理
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (isCurrentlyFullscreen) {
        // 全屏时自动隐藏控制栏，鼠标移动时显示
        setShowControls(false);
      } else {
        setShowControls(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 鼠标移动处理（全屏时）
  const handleMouseMove = useCallback(() => {
    if (isFullscreen) {
      setShowControls(true);
      
      // 清除之前的定时器
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      
      // 3秒后自动隐藏控制栏
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isFullscreen]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen();
          }
          break;
        case 'f':
        case 'F':
          if (event.ctrlKey) {
            event.preventDefault();
            toggleFullscreen();
          }
          break;
        case 'm':
        case 'M':
          if (event.ctrlKey) {
            event.preventDefault();
            toggleMute();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // 切换全屏
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (isFullscreen) {
        await document.exitFullscreen();
      } else {
        await containerRef.current.requestFullscreen();
      }
    } catch (error) {
      console.error('[DesktopViewer] 全屏切换失败:', error);
    }
  }, [isFullscreen]);

  // 退出全屏
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('[DesktopViewer] 退出全屏失败:', error);
    }
  }, []);

  // 切换静音
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  if (!stream) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-slate-900 rounded-xl text-white">
        <Monitor className="w-16 h-16 opacity-50 mb-4" />
        <p className="text-lg opacity-75">
          {isConnected ? '等待桌面共享流...' : '等待桌面共享连接...'}
        </p>
        {connectionCode && (
          <p className="text-sm opacity-50 mt-2">连接码: {connectionCode}</p>
        )}
        <div className="mt-4 flex items-center space-x-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`}></div>
          <span>{isConnected ? '已连接，等待视频流' : '正在建立连接'}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-xl overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'w-full'}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => isFullscreen && setShowControls(true)}
    >
      {/* 主视频显示 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className={`w-full h-full object-contain ${isFullscreen ? 'cursor-none' : ''}`}
        style={{ 
          aspectRatio: isFullscreen ? 'unset' : '16/9',
          minHeight: isFullscreen ? '100vh' : '400px'
        }}
      />

      {/* 连接状态覆盖层 */}
      {!isConnected && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-lg">正在连接桌面共享...</p>
          {connectionCode && (
            <p className="text-sm opacity-75 mt-2">连接码: {connectionCode}</p>
          )}
        </div>
      )}

      {/* 控制栏 */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-all duration-300 ${
          showControls || !isFullscreen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between">
          {/* 左侧信息 */}
          <div className="flex items-center space-x-4 text-white text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>桌面共享中</span>
            </div>
            {videoStats.resolution !== '0x0' && (
              <>
                <div className="w-px h-4 bg-white/30"></div>
                <span>{videoStats.resolution}</span>
              </>
            )}
            {connectionCode && (
              <>
                <div className="w-px h-4 bg-white/30"></div>
                <span className="font-mono">{connectionCode}</span>
              </>
            )}
          </div>

          {/* 右侧控制按钮 */}
          <div className="flex items-center space-x-2">
            {/* 音频控制 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="text-white hover:bg-white/20"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>

            {/* 设置 */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <Settings className="w-4 h-4" />
            </Button>

            {/* 全屏切换 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
              title={isFullscreen ? "退出全屏 (Esc)" : "全屏 (Ctrl+F)"}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </Button>

            {/* 断开连接 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              className="text-white hover:bg-red-500/30"
              title="断开连接"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 快捷键提示（仅全屏时显示） */}
        {isFullscreen && showControls && (
          <div className="mt-2 text-xs text-white/60 text-center">
            <p>快捷键: Esc 退出全屏 | Ctrl+F 切换全屏 | Ctrl+M 切换静音</p>
          </div>
        )}
      </div>

      {/* 加载状态 */}
      {stream && !isConnected && (
        <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-2 rounded-lg text-sm flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>建立连接中...</span>
        </div>
      )}

      {/* 网络状态指示器 */}
      <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-2 rounded-lg text-xs">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
          }`}></div>
          <span>{isConnected ? '已连接' : '连接中'}</span>
        </div>
      </div>
    </div>
  );
}
