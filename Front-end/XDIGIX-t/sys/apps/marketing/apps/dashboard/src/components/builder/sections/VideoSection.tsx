import { memo } from 'react';
import { VideoSectionData } from '../../../types/builder';

type Props = { data: VideoSectionData; style?: React.CSSProperties };

const VideoSection = ({ data, style }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const heading = d.heading ?? d.title ?? '';
  const headingSize = d.heading_size ?? 'h1';
  const videoUrl = d.video_url ?? d.videoUrl ?? '';
  const coverImage = d.cover_image ?? d.thumbnailUrl ?? '';
  const enableLooping = d.enable_looping ?? d.autoplay ?? false;
  const fullWidth = d.full_width ?? false;
  const description = d.description ?? d.subtitle ?? '';
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const headingSizeMap: Record<string, string> = {
    h2: 'text-2xl md:text-3xl',
    h1: 'text-3xl md:text-4xl',
    h0: 'text-4xl md:text-5xl',
    hxl: 'text-5xl md:text-6xl',
  };

  // Parse YouTube/Vimeo URLs
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&loop=${enableLooping ? 1 : 0}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?loop=${enableLooping ? 1 : 0}`;
    return url;
  };

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className={`${fullWidth ? 'w-full' : 'max-w-[1200px]'} mx-auto px-4 sm:px-6`}>
        {heading && (
          <h2 className={`${headingSizeMap[headingSize] || headingSizeMap.h1} font-bold text-center mb-6`}>
            {heading}
          </h2>
        )}
        <div className="relative w-full aspect-video bg-[#F3F3F3] overflow-hidden">
          {embedUrl ? (
            <iframe src={embedUrl} className="absolute inset-0 w-full h-full" frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          ) : coverImage ? (
            <div className="relative w-full h-full">
              <img src={coverImage} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                  <span className="material-icons text-3xl text-[#121212]/80 ml-1">play_arrow</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-[#F3F3F3] flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-[#E8E8E8] flex items-center justify-center">
                  <span className="material-icons text-4xl text-[#ccc] ml-1">play_arrow</span>
                </div>
                <p className="text-sm" style={{ opacity: 0.5 }}>Add a video URL to display</p>
              </div>
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs text-center mt-3" style={{ opacity: 0.6 }}>{description}</p>
        )}
      </div>
    </section>
  );
};

export default memo(VideoSection);
