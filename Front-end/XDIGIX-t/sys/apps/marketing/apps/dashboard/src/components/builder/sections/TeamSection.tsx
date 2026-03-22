import { memo } from 'react';
import { TeamSectionData } from '../../../types/builder';
import BlockWrapper from '../BlockWrapper';

type Props = { data: TeamSectionData; style?: React.CSSProperties; isSelected?: boolean; onEditBlock?: (dataKey: string, blockIndex: number) => void; onDeleteBlock?: (dataKey: string, blockIndex: number) => void };

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
];

const TeamSection = ({ data, style, isSelected, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const title = d.title || 'Our Team';
  const subtitle = d.subtitle || '';
  const columns = d.columns ?? 4;
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const members = d.members ?? [];

  const colsMap: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  };

  const defaultMembers = [
    { name: 'Team Member', role: 'Position', image: '', bio: '' },
    { name: 'Team Member', role: 'Position', image: '', bio: '' },
    { name: 'Team Member', role: 'Position', image: '', bio: '' },
    { name: 'Team Member', role: 'Position', image: '', bio: '' },
  ];

  const displayMembers = members.length > 0 ? members : defaultMembers;

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">{title}</h2>
          {subtitle && <p className="text-sm" style={{ opacity: 0.75 }}>{subtitle}</p>}
        </div>
        <div className={`grid ${colsMap[columns] || colsMap[4]} gap-6 sm:gap-8`}>
          {displayMembers.map((member: any, index: number) => (
            <BlockWrapper key={index} dataKey="members" blockIndex={index} blockType="team_member" isSelected={!!isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
            <div className="text-center">
              <div className="aspect-square bg-[#F3F3F3] overflow-hidden mb-4">
                <img src={member.image || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]} alt={member.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-base font-bold">{member.name}</h3>
              {member.role && <p className="text-sm mt-0.5" style={{ opacity: 0.6 }}>{member.role}</p>}
              {member.bio && <p className="text-sm mt-2 leading-relaxed" style={{ opacity: 0.75 }}>{member.bio}</p>}
            </div>
            </BlockWrapper>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(TeamSection);
