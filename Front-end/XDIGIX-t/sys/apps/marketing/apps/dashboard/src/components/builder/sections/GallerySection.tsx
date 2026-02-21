import { useState } from 'react';
import { GallerySectionData } from '../../../types/builder';

type Props = {
  data: GallerySectionData;
  style?: React.CSSProperties;
};

const GallerySection = ({ data, style }: Props) => {
  const { 
    title = 'Our Gallery', 
    subtitle,
    layout = 'grid',
    columns = 4,
    images = [] 
  } = data;
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCaption, setSelectedCaption] = useState<string>('');

  const getGridCols = () => {
    switch (columns) {
      case 2: return 'grid-cols-1 sm:grid-cols-2';
      case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4:
      default: return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
    }
  };

  return (
    <section 
      className="w-full py-12 sm:py-16 px-4 sm:px-6 bg-white transition-all duration-300"
      style={style}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3 sm:mb-4">{title}</h2>
          {subtitle && <p className="text-base sm:text-lg text-madas-text/70 px-2">{subtitle}</p>}
        </div>
        <div className={`grid ${getGridCols()} gap-3 sm:gap-4 ${layout === 'masonry' ? 'items-start' : ''}`}>
          {images.length === 0 ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
              >
                <span className="material-icons text-4xl text-primary/30">image</span>
              </div>
            ))
          ) : (
            images.map((image, index) => (
              <div 
                key={index} 
                className={`rounded-lg overflow-hidden cursor-pointer group hover:scale-105 transition-transform duration-300 relative ${
                  layout === 'masonry' 
                    ? index % 3 === 0 ? 'aspect-[4/5]' : index % 3 === 1 ? 'aspect-square' : 'aspect-[4/3]'
                    : 'aspect-square'
                }`}
                onClick={() => {
                  setSelectedImage(image.url);
                  setSelectedCaption(image.caption || image.alt || '');
                }}
              >
                <img 
                  src={image.url} 
                  alt={image.alt} 
                  className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-300" 
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="material-icons text-white text-3xl mb-2">zoom_in</span>
                  {image.caption && (
                    <p className="text-white text-sm font-medium px-4 text-center line-clamp-2">{image.caption}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-6xl max-h-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedImage} 
              alt="Gallery view" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {selectedCaption && (
              <p className="text-white text-center mt-4 text-lg max-w-2xl">{selectedCaption}</p>
            )}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default GallerySection;

