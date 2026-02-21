import { useState, useRef, useEffect, useCallback } from 'react';
import { ImageComparisonSectionData } from '../../../types/builder';

type Props = {
  data: ImageComparisonSectionData;
  style?: React.CSSProperties;
};

const ImageComparisonSection = ({ data, style }: Props) => {
  const {
    title,
    subtitle,
    beforeImage = '',
    afterImage = '',
    beforeLabel = 'Before',
    afterLabel = 'After',
    sliderPosition = 50,
    sliderColor = '#FFFFFF',
    showLabels = true,
    orientation = 'horizontal'
  } = data;

  const [position, setPosition] = useState(sliderPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    // Immediately update position on click
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

  // Update position when sliderPosition prop changes
  useEffect(() => {
    setPosition(sliderPosition);
  }, [sliderPosition]);

  const hasImages = beforeImage && afterImage;

  return (
    <section 
      className="w-full py-12 sm:py-16 px-4 sm:px-6 bg-white transition-all duration-300"
      style={style}
    >
      <div className="max-w-4xl mx-auto">
        {(title || subtitle) && (
          <div className="text-center mb-8 sm:mb-12">
            {title && (
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3 sm:mb-4">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-base sm:text-lg text-madas-text/70 px-2">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div 
          ref={containerRef}
          className="relative overflow-hidden rounded-xl cursor-ew-resize select-none"
          style={{ aspectRatio: '4/5' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          {hasImages ? (
            <>
              {/* After Image (Right side - full background) */}
              <div className="absolute inset-0">
                <img
                  src={afterImage}
                  alt={afterLabel}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>

              {/* Before Image (Left side - clipped) */}
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

              {/* Slider Line with Handle */}
              <div 
                className="absolute"
                style={{
                  backgroundColor: sliderColor,
                  boxShadow: '0 0 8px rgba(0,0,0,0.4)',
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
              
              {/* Small Circular Handle */}
              <div
                className="absolute flex items-center justify-center rounded-full shadow-lg cursor-grab active:cursor-grabbing"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: sliderColor,
                  border: '2px solid rgba(0,0,0,0.2)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  ...(orientation === 'horizontal'
                    ? { left: `${position}%`, top: '50%', transform: 'translate(-50%, -50%)' }
                    : { top: `${position}%`, left: '50%', transform: 'translate(-50%, -50%)' }
                  )
                }}
              >
                <span className="material-icons text-gray-600" style={{ fontSize: '16px' }}>
                  {orientation === 'horizontal' ? 'code' : 'unfold_more'}
                </span>
              </div>

              {/* Labels */}
              {showLabels && (
                <>
                  <div 
                    className="absolute bottom-4 left-4 px-4 py-2 rounded-lg text-sm font-semibold shadow-lg backdrop-blur-sm"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                  >
                    {beforeLabel}
                  </div>
                  <div 
                    className="absolute bottom-4 right-4 px-4 py-2 rounded-lg text-sm font-semibold shadow-lg backdrop-blur-sm"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                  >
                    {afterLabel}
                  </div>
                </>
              )}
            </>
          ) : (
            /* Placeholder */
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20">
              <div className="text-center">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="w-24 h-24 bg-primary/20 rounded-lg flex items-center justify-center">
                    <span className="material-icons text-3xl text-primary/50">image</span>
                  </div>
                  <div className="w-1 h-32 bg-white shadow-lg rounded-full"></div>
                  <div className="w-24 h-24 bg-accent/20 rounded-lg flex items-center justify-center">
                    <span className="material-icons text-3xl text-primary/50">image</span>
                  </div>
                </div>
                <p className="text-sm text-madas-text/60">Add before and after images to compare</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ImageComparisonSection;
