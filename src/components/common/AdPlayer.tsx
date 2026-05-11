import React, { useState, useEffect, useRef } from 'react';
import { admin } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface Advertisement {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  video_type: 'url' | 'upload';
  video_file_path: string | null;
  is_active: boolean;
  brand_name: string;
  rate_per_display: number;
  currency: string;
}

interface AdPlayerProps {
  userId: string;
  adsEnabled: boolean;
}

export function AdPlayer({ userId, adsEnabled }: AdPlayerProps) {
  const { user } = useAuth();
  const [currentAd, setCurrentAd] = useState<Advertisement | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [allAds, setAllAds] = useState<Advertisement[]>([]);
  const [impressionRecorded, setImpressionRecorded] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hasShownInitialAd = useRef(false);
  const sessionKey = 'ad_session_' + userId;
  const lastAdKey = 'last_ad_shown_' + userId;

  useEffect(() => {
    if (adsEnabled) {
      loadActiveAds();
    }
  }, [adsEnabled]);

  useEffect(() => {
    if (adsEnabled && allAds.length > 0 && !hasShownInitialAd.current) {
      hasShownInitialAd.current = true;

      const currentSession = sessionStorage.getItem(sessionKey);
      const lastAdTime = localStorage.getItem(lastAdKey);
      const now = Date.now();

      if (!currentSession) {
        sessionStorage.setItem(sessionKey, 'active');
        scheduleNextAd(true);
      } else if (lastAdTime) {
        const timeSinceLastAd = now - parseInt(lastAdTime);
        const minInterval = 5 * 60 * 1000;
        const maxInterval = 10 * 60 * 1000;

        if (timeSinceLastAd >= minInterval) {
          scheduleNextAd(true);
        } else {
          const remainingTime = minInterval + Math.random() * (maxInterval - minInterval) - timeSinceLastAd;
          timeoutRef.current = setTimeout(() => {
            showRandomAd();
          }, Math.max(0, remainingTime));
        }
      } else {
        scheduleNextAd();
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [adsEnabled, allAds]);

  useEffect(() => {
    if (videoRef.current && showAd) {
      const video = videoRef.current;

      const playVideo = async () => {
        try {
          video.muted = true;
          await video.play();
          video.muted = false;
          setIsPlaying(true);
          setShowPlayButton(false);
        } catch (error) {
          console.log('Autoplay prevented, showing play button');
          setShowPlayButton(true);
        }
      };

      const handleLoadedMetadata = () => {
        setVideoDuration(video.duration);
        playVideo();
      };

      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
      };

      const handlePlay = () => {
        setIsPlaying(true);
        setShowPlayButton(false);
      };

      const handlePause = () => {
        setIsPlaying(false);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
    }
  }, [showAd, videoRef.current]);

  const loadActiveAds = async () => {
    try {
      const { data, error } = await admin.ads.list();
      if (!error && data) {
        setAllAds(data.filter((ad: Advertisement) => ad.is_active));
      }
    } catch (error) {
      console.error('Error loading ads:', error);
    }
  };

  const scheduleNextAd = (immediate = false) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (immediate) {
      showRandomAd();
      return;
    }

    const minInterval = 5 * 60 * 1000;
    const maxInterval = 10 * 60 * 1000;
    const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;

    timeoutRef.current = setTimeout(() => {
      showRandomAd();
    }, randomInterval);
  };

  const showRandomAd = () => {
    if (allAds.length === 0) return;

    localStorage.setItem(lastAdKey, Date.now().toString());

    const randomIndex = Math.floor(Math.random() * allAds.length);
    setCurrentAd(allAds[randomIndex]);
    setShowAd(true);
    setImpressionRecorded(false);
    setCanClose(false);
    setVideoDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setShowPlayButton(false);
  };

  const recordImpression = async (adId: string) => {
    if (!user?.id || impressionRecorded) return;

    try {
      const { error } = await admin.ads.recordView(adId);
      if (!error) {
        setImpressionRecorded(true);
      }
    } catch (error) {
      console.error('Error recording ad impression:', error);
    }
  };

  useEffect(() => {
    if (showAd && currentAd && !impressionRecorded) {
      const timer = setTimeout(() => {
        recordImpression(currentAd.id);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [showAd, currentAd, impressionRecorded]);

  const closeAd = () => {
    if (!canClose) return;
    setShowAd(false);
    setCurrentAd(null);
    setCanClose(false);
    setVideoDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setShowPlayButton(false);
    scheduleNextAd();
  };

  const handleVideoEnd = () => {
    setCanClose(true);
    setTimeout(() => {
      closeAd();
    }, 1000);
  };

  const handlePlayClick = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.play();
        setIsPlaying(true);
        setShowPlayButton(false);
      } catch (error) {
        console.error('Failed to play video:', error);
      }
    }
  };

  const getVideoSource = (ad: Advertisement) => {
    if (ad.video_type === 'upload' && ad.video_file_path) {
      const API_URL = import.meta.env.VITE_API_URL || 'https://kuki-api-prod.azurewebsites.net';
      return { type: 'upload', url: `${API_URL}/storage/ad-videos/${ad.video_file_path}` };
    }

    if (ad.video_url.includes('youtube.com') || ad.video_url.includes('youtu.be')) {
      const videoId = ad.video_url.includes('youtu.be')
        ? ad.video_url.split('youtu.be/')[1]?.split('?')[0]
        : ad.video_url.split('v=')[1]?.split('&')[0];
      return { type: 'embed', url: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0` };
    }

    if (ad.video_url.includes('vimeo.com')) {
      const videoId = ad.video_url.split('vimeo.com/')[1]?.split('?')[0];
      return { type: 'embed', url: `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=0&controls=0` };
    }

    return { type: 'embed', url: ad.video_url };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!adsEnabled || !showAd || !currentAd) {
    return null;
  }

  const videoSource = getVideoSource(currentAd);
  const remainingTime = videoDuration - currentTime;

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center">
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start">
        <div className="bg-black bg-opacity-50 rounded-lg p-3 backdrop-blur-sm">
          <h3 className="font-semibold text-white text-sm">{currentAd.brand_name}</h3>
          <p className="text-xs text-gray-300 mt-1">{currentAd.title}</p>
        </div>

        {videoSource.type === 'upload' && videoDuration > 0 && (
          <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2 backdrop-blur-sm">
            <p className="text-white font-mono text-lg font-bold">
              {formatTime(remainingTime)}
            </p>
          </div>
        )}
      </div>

      {videoSource.type === 'upload' ? (
        <>
          <video
            ref={videoRef}
            src={videoSource.url}
            className="w-full h-full object-cover"
            playsInline
            onEnded={handleVideoEnd}
            onContextMenu={(e) => e.preventDefault()}
            controlsList="nodownload nofullscreen noremoteplayback"
            disablePictureInPicture
            muted={false}
          />

          {showPlayButton && (
            <button
              onClick={handlePlayClick}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-30"
            >
              <div className="bg-white rounded-full p-8 shadow-2xl hover:scale-110 transition-transform">
                <svg
                  className="w-16 h-16 text-gray-900"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </button>
          )}
        </>
      ) : (
        <iframe
          ref={iframeRef}
          src={videoSource.url}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          style={{
            border: 'none'
          }}
        />
      )}

      {canClose && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={closeAd}
            className="bg-white hover:bg-gray-100 text-gray-900 px-8 py-3 rounded-full font-semibold shadow-2xl transition-all transform hover:scale-105"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
