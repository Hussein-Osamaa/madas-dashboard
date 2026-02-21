import { useState } from 'react';
import { VideoSectionData } from '../../../types/builder';

type Props = {
  data: VideoSectionData;
  style?: React.CSSProperties;
};

const VideoSection = ({ data, style }: Props) => {
  const {
    title,
    subtitle,
    videoUrl = '',
    videoType = 'youtube',
    thumbnailUrl,
    autoplay = false,
    showControls = true
  } = data;

  const [isPlaying, setIsPlaying] = useState(autoplay);

  const getEmbedUrl = () => {
    if (!videoUrl) return '';

    if (videoType === 'youtube') {
      // Extract video ID from various YouTube URL formats
      const match = videoUrl.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&?/\s]{11})/);
      const videoId = match ? match[1] : videoUrl;
      return `https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&controls=${showControls ? 1 : 0}&rel=0`;
    }

    if (videoType === 'vimeo') {
      const match = videoUrl.match(/vimeo\.com\/(\d+)/);
      const videoId = match ? match[1] : videoUrl;
      return `https://player.vimeo.com/video/${videoId}?autoplay=${isPlaying ? 1 : 0}&controls=${showControls ? 1 : 0}`;
    }

    return videoUrl;
  };

  const handlePlayClick = () => {
    setIsPlaying(true);
  };

  return (
    <section
      className="w-full py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gray-900 transition-all duration-300"
      style={style}
    >
      <div className="max-w-5xl mx-auto">
        {(title || subtitle) && (
          <div className="text-center mb-10 sm:mb-14">
            {title && (
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-base sm:text-lg text-white/70 px-2">{subtitle}</p>
            )}
          </div>
        )}

        <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl">
          {!isPlaying && thumbnailUrl ? (
            <div className="relative w-full h-full cursor-pointer group" onClick={handlePlayClick}>
              <img
                src={thumbnailUrl}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-xl">
                  <span className="material-icons text-primary text-3xl sm:text-4xl md:text-5xl ml-1">
                    play_arrow
                  </span>
                </div>
              </div>
            </div>
          ) : videoUrl ? (
            videoType === 'custom' ? (
              <video
                src={videoUrl}
                className="w-full h-full object-cover"
                controls={showControls}
                autoPlay={isPlaying}
                playsInline
              />
            ) : (
              <iframe
                src={getEmbedUrl()}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex flex-col items-center justify-center">
              <span className="material-icons text-6xl sm:text-8xl text-white/30 mb-4">
                play_circle
              </span>
              <p className="text-white/50 text-sm sm:text-base">Add a video URL to display</p>
            </div>
          )}
        </div>

        {/* Video info/caption */}
        {(title || subtitle) && (
          <div className="mt-6 text-center">
            <p className="text-white/50 text-sm">Click to play</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default VideoSection;

