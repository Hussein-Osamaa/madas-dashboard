import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { ImageComparisonSectionData } from '../../../types/builder';

type Props = {
  data: ImageComparisonSectionData;
  style?: React.CSSProperties;
};

const ImageComparisonSection = ({ data, style }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const title = d.title || '';
  const subtitle = d.subtitle || '';
  const beforeImage = d.beforeImage || '';
  const afterImage = d.afterImage || '';
  const beforeLabel = d.beforeLabel || 'Before';
  const afterLabel = d.afterLabel || 'After';
  const sliderPosition = d.sliderPosition ?? 50;
  const sliderColor = d.sliderColor || '#FFFFFF';
  const showLabels = d.showLabels ?? true;
  const orientation = d.orientation || 'horizontal';
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const [position, setPosition] = useState(sliderPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    if ('clientX' in e) {
      handleMove(e.clientX, e.clientY);
    } else if (e.touches[0]) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    if (orientation === 'horizontal') {
      const x = clientX - rect.left;
      const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
      setPosition(percentage);
    } else {
      const y = clientY - rect.top;
      const percentage = Math.min(Math.max((y / rect.height) * 100, 0), 100);
      setPosition(percentage);
    }
  }, [orientation]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX, e.clientY);
    }
  }, [isDragging, handleMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging && e.touches[0]) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [isDragging, handleMove]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleTouchMove]);

  useEffect(() => {
    setPosition(sliderPosition);
  }, [sliderPosition]);

  const hasImages = beforeImage && afterImage;

  return (
    <section
      className="w-full"
      style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {(title || subtitle) && (
          <div className="text-center mb-8">
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm" style={{ opacity: 0.75 }}>
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div
          ref={containerRef}
          className="relative overflow-hidden cursor-ew-resize select-none max-w-4xl mx-auto"
          style={{ aspectRatio: '16/9' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          {hasImages ? (
            <>
              {/* After Image (full background) */}
              <div className="absolute inset-0">
                <img
                  src={afterImage}
                  alt={afterLabel}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>

              {/* Before Image (clipped) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={
                  orientation === 'horizontal'
                    ? { width: `${position}%` }
                    : { height: `${position}%` }
                }
              >
                <img
                  src={beforeImage}
                  alt={beforeLabel}
                  className="absolute top-0 left-0 h-full object-cover"
                  style={
                    orientation === 'horizontal'
                      ? {
                          width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%',
                          maxWidth: 'none'
                        }
                      : {
                          height: containerRef.current ? `${containerRef.current.offsetHeight}px` : '100%',
                          width: '100%'
                        }
                  }
                  draggable={false}
                />
              </div>

              {/* Slider Line */}
              <div
                className="absolute"
                style={{
                  backgroundColor: sliderColor,
                  ...(orientation === 'horizontal'
                    ? {
                        top: 0,
                        bottom: 0,
                        width: '2px',
                        left: `${position}%`,
                        transform: 'translateX(-50%)'
                      }
                    : {
                        left: 0,
                        right: 0,
                        height: '2px',
                        top: `${position}%`,
                        transform: 'translateY(-50%)'
                      }
                  )
                }}
              />

              {/* Handle */}
              <div
                className="absolute flex items-center justify-center cursor-grab active:cursor-grabbing"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: sliderColor,
                  border: '2px solid rgba(0,0,0,0.1)',
                  ...(orientation === 'horizontal'
                    ? { left: `${position}%`, top: '50%', transform: 'translate(-50%, -50%)' }
                    : { top: `${position}%`, left: '50%', transform: 'translate(-50%, -50%)' }
                  )
                }}
              >
                <span className="material-icons" style={{ fontSize: '16px' }}>
                  {orientation === 'horizontal' ? 'code' : 'unfold_more'}
                </span>
              </div>

              {/* Labels */}
              {showLabels && (
                <>
                  <div className="absolute bottom-4 left-4 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white bg-[#121212]/60">
                    {beforeLabel}
                  </div>
                  <div className="absolute bottom-4 right-4 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white bg-[#121212]/60">
                    {afterLabel}
                  </div>
                </>
              )}
            </>
          ) : (
            /* Placeholder */
            <div className="absolute inset-0 flex items-center justify-center bg-[#F3F3F3]">
              <div className="text-center">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="w-24 h-24 bg-[#E8E8E8] flex items-center justify-center">
                    <span className="material-icons text-3xl text-[#ccc]">image</span>
                  </div>
                  <div className="w-0.5 h-32 bg-[#121212]/15"></div>
                  <div className="w-24 h-24 bg-[#E8E8E8] flex items-center justify-center">
                    <span className="material-icons text-3xl text-[#ccc]">image</span>
                  </div>
                </div>
                <p className="text-sm" style={{ opacity: 0.5 }}>Add before and after images to compare</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default memo(ImageComparisonSection);
