import { TeamSectionData } from '../../../types/builder';

type Props = {
  data: TeamSectionData;
  style?: React.CSSProperties;
};

const TeamSection = ({ data, style }: Props) => {
  const {
    title = 'Meet Our Team',
    subtitle = 'The people behind our success',
    members = [],
    layout = 'grid'
  } = data;

  type TeamMember = {
    name: string;
    role: string;
    image?: string;
    bio?: string;
    socialLinks?: Array<{ platform: string; link: string }>;
  };

  const defaultMembers: TeamMember[] = [
    { name: 'John Doe', role: 'CEO & Founder', image: '', bio: 'Visionary leader with 10+ years experience' },
    { name: 'Jane Smith', role: 'CTO', image: '', bio: 'Tech innovator and problem solver' },
    { name: 'Mike Johnson', role: 'Lead Designer', image: '', bio: 'Creative mind behind our designs' },
    { name: 'Sarah Wilson', role: 'Marketing Head', image: '', bio: 'Growth strategist and brand expert' }
  ];

  const displayMembers: TeamMember[] = members.length > 0 ? members : defaultMembers;

  const getSocialIcon = (platform: string) => {
    const icons: Record<string, string> = {
      twitter: '𝕏',
      linkedin: 'in',
      facebook: 'f',
      instagram: '📷',
      github: '⚫'
    };
    return icons[platform.toLowerCase()] || '🔗';
  };

  return (
    <section
      className="w-full py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white transition-all duration-300"
      style={style}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3 sm:mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-base sm:text-lg text-madas-text/70 px-2">{subtitle}</p>
          )}
        </div>

        <div
          className={`grid gap-6 sm:gap-8 ${
            layout === 'grid'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-2'
          }`}
        >
          {displayMembers.map((member, index) => (
            <div
              key={index}
              className="group text-center p-6 rounded-2xl border border-gray-200 hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-2"
            >
              {/* Avatar */}
              <div className="relative mb-4 mx-auto w-24 h-24 sm:w-32 sm:h-32">
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full rounded-full object-cover border-4 border-primary/20 group-hover:border-primary/40 transition-colors"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-4 border-primary/20 group-hover:border-primary/40 transition-colors">
                    <span className="text-3xl sm:text-4xl text-primary font-bold">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                )}
                {/* Decorative ring */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30 scale-110 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500" />
              </div>

              {/* Info */}
              <h3 className="text-lg sm:text-xl font-bold text-primary mb-1 group-hover:text-primary/80 transition-colors">
                {member.name}
              </h3>
              <p className="text-sm text-accent font-medium mb-3">{member.role}</p>
              {member.bio && (
                <p className="text-sm text-madas-text/70 mb-4 line-clamp-2">{member.bio}</p>
              )}

              {/* Social Links */}
              {member.socialLinks && member.socialLinks.length > 0 && (
                <div className="flex justify-center gap-2">
                  {member.socialLinks.map((social: { platform: string; link: string }, i: number) => (
                    <a
                      key={i}
                      href={social.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-primary hover:text-white flex items-center justify-center text-sm font-medium transition-all"
                    >
                      {getSocialIcon(social.platform)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamSection;

