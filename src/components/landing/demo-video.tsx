'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, X, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { fadeInScale } from './animations';

interface DemoVideoProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  duration?: string;
}

export default function DemoVideo({
  videoUrl = '/demo-video.mp4',
  thumbnailUrl = '/demo-thumbnail.jpg',
  title = 'See Moistus AI in Action',
  duration = '2:34',
}: DemoVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <motion.div
      ref={containerRef}
      variants={fadeInScale}
      initial="hidden"
      animate="visible"
      className="relative w-full max-w-4xl mx-auto"
    >
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
        {/* Thumbnail and Play Button Overlay */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 z-10"
            >
              {/* Thumbnail */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-violet-900/20">
                {/* Placeholder for thumbnail - in production, use next/image */}
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                  <span className="text-zinc-600 text-sm">Video Thumbnail</span>
                </div>
              </div>

              {/* Play Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePlayPause}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center group hover:bg-white/20 transition-colors"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 group-hover:shadow-xl group-hover:shadow-blue-500/60 transition-shadow">
                  <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                </div>
              </motion.button>

              {/* Title and Duration */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-xl font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-zinc-300">{duration}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted={isMuted}
          onEnded={handleVideoEnd}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
          playsInline
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Custom Controls */}
        <AnimatePresence>
          {isPlaying && showControls && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Play/Pause */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePlayPause}
                    className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                  >
                    {isPlaying ? (
                      <div className="w-4 h-4 flex items-center gap-1">
                        <div className="w-1 h-4 bg-white rounded-sm" />
                        <div className="w-1 h-4 bg-white rounded-sm" />
                      </div>
                    ) : (
                      <Play className="w-4 h-4 text-white" fill="currentColor" />
                    )}
                  </motion.button>

                  {/* Mute/Unmute */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleMuteToggle}
                    className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-white" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-white" />
                    )}
                  </motion.button>
                </div>

                <div className="flex items-center gap-4">
                  {/* Fullscreen */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleFullscreen}
                    className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4 text-white" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-white" />
                    )}
                  </motion.button>

                  {/* Close */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setIsPlaying(false);
                      if (videoRef.current) {
                        videoRef.current.pause();
                        videoRef.current.currentTime = 0;
                      }
                    }}
                    className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Video Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 grid grid-cols-3 gap-4 text-center"
      >
        <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
          <div className="text-2xl font-bold text-blue-500 mb-1">HD</div>
          <p className="text-xs text-zinc-500">High Quality</p>
        </div>
        <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
          <div className="text-2xl font-bold text-violet-500 mb-1">CC</div>
          <p className="text-xs text-zinc-500">Subtitles Available</p>
        </div>
        <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
          <div className="text-2xl font-bold text-emerald-500 mb-1">⚡</div>
          <p className="text-xs text-zinc-500">Quick Demo</p>
        </div>
      </motion.div>
    </motion.div>
  );
}