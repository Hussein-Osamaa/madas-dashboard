import { AboutSectionData } from '../../../types/builder';

type Props = {
  data: AboutSectionData;
  style?: React.CSSProperties;
};

const AboutSection = ({ data, style }: Props) => {
  const { title = 'About Us', content = 'Your story here...', image } = data;

  return (
    <section 
      className="w-full py-12 sm:py-16 px-4 sm:px-6 bg-white transition-all duration-300"
      style={style}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="order-2 lg:order-1">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-4 sm:mb-6">{title}</h2>
            <div 
              className="prose max-w-none text-sm sm:text-base text-madas-text/80 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content || 'Your story here...' }}
            />
          </div>
          <div className="relative order-1 lg:order-2">
            {image ? (
              <img src={image} alt={title} className="w-full h-64 sm:h-80 lg:h-96 object-cover rounded-xl" />
            ) : (
              <div className="w-full h-64 sm:h-80 lg:h-96 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center">
                <span className="material-icons text-4xl sm:text-6xl text-primary/30">image</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;

