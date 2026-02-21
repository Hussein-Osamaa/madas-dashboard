import { ContactSectionData } from '../../../types/builder';

type Props = {
  data: ContactSectionData;
  style?: React.CSSProperties;
};

const ContactSection = ({ data, style }: Props) => {
  const {
    title = 'Get in Touch',
    subtitle = "We'd love to hear from you",
    email = 'contact@example.com',
    phone = '+1 (555) 123-4567',
    address = '123 Main St, City, State 12345'
  } = data;

  return (
    <section 
      className="w-full py-12 sm:py-16 px-4 sm:px-6 bg-gray-50 transition-all duration-300"
      style={style}
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3 sm:mb-4">{title}</h2>
          {subtitle && <p className="text-base sm:text-lg text-madas-text/70 px-2">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="text-center p-4 sm:p-6 bg-white rounded-xl border border-gray-200">
            <span className="material-icons text-3xl sm:text-4xl text-primary mb-3 sm:mb-4">email</span>
            <h3 className="text-sm sm:text-base font-semibold text-primary mb-2">Email</h3>
            <p className="text-xs sm:text-sm text-madas-text/70 break-words">{email}</p>
          </div>
          <div className="text-center p-4 sm:p-6 bg-white rounded-xl border border-gray-200">
            <span className="material-icons text-3xl sm:text-4xl text-primary mb-3 sm:mb-4">phone</span>
            <h3 className="text-sm sm:text-base font-semibold text-primary mb-2">Phone</h3>
            <p className="text-xs sm:text-sm text-madas-text/70">{phone}</p>
          </div>
          <div className="text-center p-4 sm:p-6 bg-white rounded-xl border border-gray-200 sm:col-span-2 lg:col-span-1">
            <span className="material-icons text-3xl sm:text-4xl text-primary mb-3 sm:mb-4">location_on</span>
            <h3 className="text-sm sm:text-base font-semibold text-primary mb-2">Address</h3>
            <p className="text-xs sm:text-sm text-madas-text/70 break-words">{address}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;

