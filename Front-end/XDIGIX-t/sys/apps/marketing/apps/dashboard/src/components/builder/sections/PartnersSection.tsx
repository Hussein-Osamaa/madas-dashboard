import { memo } from 'react';
import { PartnersSectionData } from '../../../types/builder';
import BlockWrapper from '../BlockWrapper';

type Props = { data: PartnersSectionData; style?: React.CSSProperties; isSelected?: boolean; onEditBlock?: (dataKey: string, blockIndex: number) => void; onDeleteBlock?: (dataKey: string, blockIndex: number) => void };

const PartnersSection = ({ data, style, isSelected, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const title = d.title || '';
  const subtitle = d.subtitle || '';
  const grayscale = d.grayscale ?? true;
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const partners = d.partners ?? [];

  const defaultPartners = [
    { name: 'Brand', logo: '', link: '' },
    { name: 'Brand', logo: '', link: '' },
    { name: 'Brand', logo: '', link: '' },
    { name: 'Brand', logo: '', link: '' },
    { name: 'Brand', logo: '', link: '' },
  ];

  const displayPartners = partners.length > 0 ? partners : defaultPartners;

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {(title || subtitle) && (
          <div className="text-center mb-8">
            {title && <h2 className="text-xl font-bold mb-1">{title}</h2>}
            {subtitle && <p className="text-sm" style={{ opacity: 0.75 }}>{subtitle}</p>}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {displayPartners.map((partner: any, index: number) => (
            <BlockWrapper key={index} dataKey="partners" blockIndex={index} blockType="partner" isSelected={!!isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
            <div className={`flex items-center justify-center ${grayscale ? 'grayscale hover:grayscale-0' : ''} opacity-60 hover:opacity-100 transition-all`}>
              {partner.logo ? (
                <img src={partner.logo} alt={partner.name} className="h-10 md:h-12 w-auto object-contain" />
              ) : (
                <div className="h-10 w-24 bg-[#F3F3F3] flex items-center justify-center text-xs text-[#999]">
                  {partner.name}
                </div>
              )}
            </div>
            </BlockWrapper>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(PartnersSection);
