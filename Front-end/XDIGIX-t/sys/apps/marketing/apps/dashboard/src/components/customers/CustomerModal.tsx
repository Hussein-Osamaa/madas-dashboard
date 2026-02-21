import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Customer, CustomerDraft, CustomerStatus } from '../../services/customersService';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CustomerDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitting?: boolean;
  deleting?: boolean;
  initialValue?: Customer | null;
};

const STATUS_OPTIONS: { value: CustomerStatus; label: string; color: string; icon: string }[] = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700 border-green-200', icon: 'check_circle' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: 'pause_circle' },
  { value: 'vip', label: 'VIP', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'star' }
];

// Location data: Country > Governorate > Neighborhood > District
type LocationData = {
  [country: string]: {
    [governorate: string]: {
      [neighborhood: string]: string[];
    };
  };
};

const LOCATION_DATA: LocationData = {
  'Egypt': {
    'Cairo': {
      'Nasr City': ['1st District', '2nd District', '3rd District', '4th District', '5th District', '6th District', '7th District', '8th District', '9th District', '10th District'],
      'Heliopolis': ['Almaza', 'Ard El Golf', 'Korba', 'Roxy', 'Sheraton', 'Triumph'],
      'Maadi': ['Degla', 'Sarayat', 'Old Maadi', 'New Maadi', 'Zahraa Maadi', 'Maadi Corniche'],
      'New Cairo': ['1st Settlement', '3rd Settlement', '5th Settlement', 'Beit Al Watan', 'Al Narges', 'Al Yasmin', 'Al Lotus', 'South Academy', 'North 90th', 'South 90th'],
      'Downtown': ['Abdeen', 'Bab El Louk', 'Garden City', 'Kasr El Nil', 'Mounira', 'Tahrir'],
      'Zamalek': ['Gezira', 'Zamalek'],
      'Mohandessin': ['Arab League St', 'Gameat El Dewal', 'Lebanon Square', 'Sphinx Square'],
      'Dokki': ['Dokki', 'Agouza', 'Mesaha Square', 'Tahrir Square Dokki'],
      'Shubra': ['Shubra', 'Rod El Farag', 'Sahel', 'Shubra El Kheima'],
      'Ain Shams': ['Ain Shams', 'El Zaytoun', 'Hadayek El Kobba'],
      'October': ['1st District', '2nd District', '3rd District', '4th District', '5th District', '6th District', '7th District', 'Sheikh Zayed', 'Al Ashgar', 'Palm Hills', 'Dreamland'],
    },
    'Giza': {
      'Dokki': ['Dokki Square', 'Mesaha', 'Behoos', 'Gamaa'],
      'Mohandessin': ['Shehab St', 'Sudan St', 'Wadi El Nile', 'Makram Ebeid'],
      'Agouza': ['Agouza', 'Kit Kat', 'Imbaba Bridge'],
      'Haram': ['Faisal', 'Haram', 'Marioutia', 'Remaya Square', 'Pyramids'],
      '6th of October': ['1st District', '2nd District', '3rd District', '4th District', '5th District', '6th District', '7th District', '8th District', '9th District', '10th District', '11th District', '12th District'],
      'Sheikh Zayed': ['1st Neighborhood', '2nd Neighborhood', '3rd Neighborhood', '4th Neighborhood', 'Beverly Hills', 'Allegria', 'Casa', 'Zayed 2000'],
    },
    'Alexandria': {
      'Montazah': ['Mandara', 'Mamoura', 'Miami', 'Asafra', 'Sidi Bishr'],
      'El Raml': ['Raml Station', 'Manshiyya', 'Attarin', 'Camp Shezar'],
      'Sidi Gaber': ['Sidi Gaber', 'Cleopatra', 'Sporting', 'Ibrahimia'],
      'Smouha': ['Smouha', 'Kafr Abdo', 'Zizinia'],
      'Glym': ['Glym', 'San Stefano', 'Stanley'],
    },
    'Dakahlia': {
      'Mansoura': ['Toreel', 'Gedida', 'El Mashaya', 'University Area'],
      'Talkha': ['Talkha City', 'Industrial Area'],
    },
    'Sharqia': {
      'Zagazig': ['Zagazig City', 'Nasar City', 'University Area'],
      '10th of Ramadan': ['1st District', '2nd District', '3rd District', 'Industrial Zone'],
    },
  },
};

const CustomerModal = ({ open, onClose, onSubmit, onDelete, submitting, deleting, initialValue }: Props) => {
  const isEditing = !!initialValue?.id;

  const defaultDraft = useMemo<CustomerDraft>(
    () => ({
      firstName: '',
      lastName: '',
      name: '',
      email: '',
      phone: '',
      status: 'active',
      orderCount: 0,
      activeOrders: 0,
      canceledOrders: 0,
      totalSpent: 0,
      pendingAmount: 0,
      avgOrderValue: 0,
      addressDetails: {
        line: '',
        addressLine2: '',
        neighborhood: '',
        governorate: '',
        district: '',
        country: 'Egypt',
        postalCode: '',
        addressClarification: '',
        apartment: '',
        floor: '',
        building: ''
      }
    }),
    []
  );

  const [draft, setDraft] = useState<CustomerDraft>(defaultDraft);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'contact' | 'address' | 'notes'>('contact');

  useEffect(() => {
    if (!initialValue) {
      setDraft(defaultDraft);
      setError(null);
      setActiveSection('contact');
      return;
    }

    const {
      id,
      firstName,
      lastName,
      name,
      email,
      phone,
      status,
      orderCount,
      activeOrders,
      canceledOrders,
      totalSpent,
      pendingAmount,
      avgOrderValue,
      addressDetails
    } = initialValue;

    setDraft({
      id,
      firstName: firstName ?? name?.split(' ')[0] ?? '',
      lastName: lastName ?? name?.split(' ').slice(1).join(' ') ?? '',
      name: name ?? '',
      email: email ?? '',
      phone: phone ?? '',
      status: status ?? 'active',
      orderCount: orderCount ?? 0,
      activeOrders: activeOrders ?? 0,
      canceledOrders: canceledOrders ?? 0,
      totalSpent: totalSpent ?? 0,
      pendingAmount: pendingAmount ?? 0,
      avgOrderValue: avgOrderValue ?? 0,
      addressDetails: {
        line: addressDetails?.line ?? '',
        addressLine2: addressDetails?.addressLine2 ?? '',
        neighborhood: addressDetails?.neighborhood ?? '',
        governorate: addressDetails?.governorate ?? '',
        district: addressDetails?.district ?? '',
        country: addressDetails?.country ?? 'Egypt',
        postalCode: addressDetails?.postalCode ?? '',
        addressClarification: addressDetails?.addressClarification ?? '',
        apartment: addressDetails?.apartment ?? '',
        floor: addressDetails?.floor ?? '',
        building: addressDetails?.building ?? ''
      }
    });
    setError(null);
  }, [defaultDraft, initialValue]);

  const handleChange =
    (field: keyof CustomerDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setDraft((prev) => ({
        ...prev,
        [field]: value
      }));
    };

  const handleAddressChange =
    (field: keyof NonNullable<CustomerDraft['addressDetails']>) =>
    (value: string) => {
      setDraft((prev) => ({
        ...prev,
        addressDetails: {
          ...prev.addressDetails,
          [field]: value
        }
      }));
    };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const first = draft.firstName?.trim();
    const last = draft.lastName?.trim();
    if (!first && !last) {
      setError('Customer name is required.');
      return;
    }

    if (!draft.phone?.trim()) {
      setError('Phone number is required.');
      return;
    }

    const name = [first, last].filter(Boolean).join(' ');
    try {
      await onSubmit({
        ...draft,
        name,
        firstName: first,
        lastName: last
      });
      setError(null);
    } catch (submitError) {
      console.error('[CustomerModal] Failed to save customer', submitError);
      setError(submitError instanceof Error ? submitError.message : 'Failed to save customer.');
    }
  };

  // Validation helpers
  const isValidPhone = (draft.phone?.length ?? 0) >= 10;
  const hasName = !!(draft.firstName?.trim());
  const canSubmit = hasName && isValidPhone;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-icons text-primary text-2xl">
                {isEditing ? 'edit' : 'person_add'}
              </span>
            </div>
          <div>
              <h2 className="text-xl font-bold text-primary">
                {isEditing ? 'Edit Customer' : 'New Customer'}
            </h2>
              <p className="text-sm text-madas-text/60">
                {isEditing ? 'Update customer information' : 'Add a new customer to your database'}
            </p>
            </div>
          </div>
          <button
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center text-madas-text/50 hover:bg-gray-100 transition-colors"
            onClick={onClose}
            disabled={submitting}
          >
            <span className="material-icons">close</span>
          </button>
        </header>

        {/* Section Tabs */}
        <div className="flex border-b border-gray-100 px-6 bg-gray-50">
          {[
            { id: 'contact', label: 'Contact', icon: 'person' },
            { id: 'address', label: 'Address', icon: 'location_on' },
            { id: 'notes', label: 'Notes', icon: 'note' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as typeof activeSection)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSection === tab.id
                  ? 'border-primary text-primary bg-white -mb-[1px] rounded-t-lg'
                  : 'border-transparent text-madas-text/60 hover:text-madas-text'
              }`}
            >
              <span className="material-icons text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Contact Section */}
            {activeSection === 'contact' && (
              <div className="space-y-5">
                {/* Status Selection */}
                <div>
                  <label className="text-sm font-medium text-madas-text/70 mb-3 block">Customer Status</label>
                  <div className="flex gap-3">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDraft(prev => ({ ...prev, status: option.value }))}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                          draft.status === option.value
                            ? option.color + ' border-current'
                            : 'bg-white border-gray-200 text-madas-text/60 hover:border-gray-300'
                        }`}
                      >
                        <span className="material-icons text-lg">{option.icon}</span>
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-madas-text/70 mb-2 block">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-madas-text/40">person</span>
              <input
                type="text"
                value={draft.firstName ?? ''}
                onChange={handleChange('firstName')}
                        placeholder="Enter first name"
                        className={`w-full rounded-lg border pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                          draft.firstName?.trim() ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-madas-text/70 mb-2 block">Last Name</label>
              <input
                type="text"
                value={draft.lastName ?? ''}
                onChange={handleChange('lastName')}
                      placeholder="Enter last name"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-sm font-medium text-madas-text/70 mb-2 block">
                    Phone Number <span className="text-red-500">*</span>
            </label>
                  <div className="flex">
                    <div className="flex items-center gap-2 px-4 py-3 border border-gray-200 border-r-0 rounded-l-lg bg-gray-50">
                      <span className="text-xl">🇪🇬</span>
                      <span className="text-sm font-medium text-madas-text">+20</span>
                    </div>
                    <input
                      type="tel"
                      value={draft.phone ?? ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setDraft(prev => ({ ...prev, phone: value }));
                      }}
                      placeholder="1XXXXXXXXX"
                      maxLength={10}
                      className={`flex-1 rounded-r-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        isValidPhone ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
                      }`}
                    />
                  </div>
                  {draft.phone && !isValidPhone && (
                    <p className="text-xs text-orange-500 mt-1.5 flex items-center gap-1">
                      <span className="material-icons text-sm">info</span>
                      Phone number should be 10 digits
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm font-medium text-madas-text/70 mb-2 block">Email Address</label>
                  <div className="relative">
                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-madas-text/40">email</span>
              <input
                type="email"
                value={draft.email ?? ''}
                onChange={handleChange('email')}
                placeholder="customer@email.com"
                      className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Stats for existing customers */}
                {isEditing && (
                  <div className="rounded-xl bg-gray-50 p-4 mt-6">
                    <h4 className="text-sm font-semibold text-madas-text mb-3 flex items-center gap-2">
                      <span className="material-icons text-lg text-primary">analytics</span>
                      Customer Statistics
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 rounded-lg bg-white border border-gray-100">
                        <p className="text-2xl font-bold text-primary">{draft.orderCount ?? 0}</p>
                        <p className="text-xs text-madas-text/60">Total Orders</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white border border-gray-100">
                        <p className="text-2xl font-bold text-green-600">{draft.totalSpent ?? 0} EGP</p>
                        <p className="text-xs text-madas-text/60">Total Spent</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white border border-gray-100">
                        <p className="text-2xl font-bold text-blue-600">{draft.avgOrderValue ?? 0} EGP</p>
                        <p className="text-xs text-madas-text/60">Avg Order</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Address Section */}
            {activeSection === 'address' && (
              <div className="space-y-5">
                {/* Country & Governorate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-madas-text/70 mb-2 block">Country</label>
                    <div className="relative">
              <select
                        value={draft.addressDetails?.country ?? 'Egypt'}
                        onChange={(e) => {
                          handleAddressChange('country')(e.target.value);
                          handleAddressChange('governorate')('');
                          handleAddressChange('neighborhood')('');
                          handleAddressChange('district')('');
                        }}
                        className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-10"
                      >
                        <option value="">Select country</option>
                        {Object.keys(LOCATION_DATA).map((country) => (
                          <option key={country} value={country}>{country}</option>
                ))}
              </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-madas-text/50 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-madas-text/70 mb-2 block">
                      Governorate <span className="text-red-500">*</span>
            </label>
                    <div className="relative">
                      <select
                        value={draft.addressDetails?.governorate ?? ''}
                        onChange={(e) => {
                          handleAddressChange('governorate')(e.target.value);
                          handleAddressChange('neighborhood')('');
                          handleAddressChange('district')('');
                        }}
                        disabled={!draft.addressDetails?.country}
                        className={`w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                          draft.addressDetails?.governorate ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
                        }`}
                      >
                        <option value="">Select governorate</option>
                        {draft.addressDetails?.country && LOCATION_DATA[draft.addressDetails.country] &&
                          Object.keys(LOCATION_DATA[draft.addressDetails.country]).map((gov) => (
                            <option key={gov} value={gov}>{gov}</option>
                          ))
                        }
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-madas-text/50 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Neighborhood & District */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-madas-text/70 mb-2 block">Neighborhood</label>
                    <div className="relative">
                      <select
                        value={draft.addressDetails?.neighborhood ?? ''}
                        onChange={(e) => {
                          handleAddressChange('neighborhood')(e.target.value);
                          handleAddressChange('district')('');
                        }}
                        disabled={!draft.addressDetails?.governorate}
                        className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Select neighborhood</option>
                        {draft.addressDetails?.country && draft.addressDetails?.governorate &&
                          LOCATION_DATA[draft.addressDetails.country]?.[draft.addressDetails.governorate] &&
                          Object.keys(LOCATION_DATA[draft.addressDetails.country][draft.addressDetails.governorate]).map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))
                        }
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-madas-text/50 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-madas-text/70 mb-2 block">District</label>
                    <div className="relative">
                      <select
                        value={draft.addressDetails?.district ?? ''}
                        onChange={(e) => handleAddressChange('district')(e.target.value)}
                        disabled={!draft.addressDetails?.neighborhood}
                        className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Select district</option>
                        {draft.addressDetails?.country && draft.addressDetails?.governorate && draft.addressDetails?.neighborhood &&
                          LOCATION_DATA[draft.addressDetails.country]?.[draft.addressDetails.governorate]?.[draft.addressDetails.neighborhood]?.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))
                        }
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-madas-text/50 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Street Address */}
                <div>
                  <label className="text-sm font-medium text-madas-text/70 mb-2 block">Street Address</label>
                  <div className="relative">
                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-madas-text/40">home</span>
                <input
                  type="text"
                  value={draft.addressDetails?.line ?? ''}
                      onChange={(e) => handleAddressChange('line')(e.target.value)}
                      placeholder="Street name, building number..."
                      className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Building Details */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-madas-text/70 mb-2 block">Building</label>
                <input
                  type="text"
                      value={draft.addressDetails?.building ?? ''}
                      onChange={(e) => handleAddressChange('building')(e.target.value)}
                      placeholder="Bldg #"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-madas-text/70 mb-2 block">Floor</label>
                <input
                  type="text"
                      value={draft.addressDetails?.floor ?? ''}
                      onChange={(e) => handleAddressChange('floor')(e.target.value)}
                      placeholder="Floor #"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
            </div>
                  <div>
                    <label className="text-sm font-medium text-madas-text/70 mb-2 block">Apartment</label>
                <input
                  type="text"
                  value={draft.addressDetails?.apartment ?? ''}
                      onChange={(e) => handleAddressChange('apartment')(e.target.value)}
                      placeholder="Apt #"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Address Preview */}
                {(draft.addressDetails?.governorate || draft.addressDetails?.line) && (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
                    <span className="material-icons text-blue-600 text-xl">location_on</span>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Address Preview</p>
                      <p className="text-sm text-blue-600 mt-1">
                        {[
                          draft.addressDetails?.line,
                          draft.addressDetails?.building && `Bldg ${draft.addressDetails.building}`,
                          draft.addressDetails?.floor && `Floor ${draft.addressDetails.floor}`,
                          draft.addressDetails?.apartment && `Apt ${draft.addressDetails.apartment}`,
                        ].filter(Boolean).join(', ')}
                        {draft.addressDetails?.line && <br />}
                        {[
                          draft.addressDetails?.district,
                          draft.addressDetails?.neighborhood,
                          draft.addressDetails?.governorate,
                          draft.addressDetails?.country,
                        ].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
            </div>
            )}

            {/* Notes Section */}
            {activeSection === 'notes' && (
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-madas-text/70 mb-2 block">
                    Address Clarification / Delivery Notes
            </label>
              <textarea
                value={draft.addressDetails?.addressClarification ?? ''}
                    onChange={(e) => handleAddressChange('addressClarification')(e.target.value)}
                    placeholder="Any special instructions for delivery, landmarks, gate codes, etc..."
                    rows={5}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <h4 className="text-sm font-medium text-madas-text mb-2 flex items-center gap-2">
                    <span className="material-icons text-lg text-madas-text/60">tips_and_updates</span>
                    Tips for better delivery
                  </h4>
                  <ul className="text-xs text-madas-text/60 space-y-1">
                    <li>• Include nearby landmarks for easier navigation</li>
                    <li>• Mention gate or building entry codes if needed</li>
                    <li>• Specify preferred delivery times if applicable</li>
                    <li>• Add alternative contact number if available</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mb-4 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
              <span className="material-icons text-red-500 text-xl">error</span>
              <div>
                <p className="text-sm font-medium text-red-700">Cannot save customer</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              {isEditing && onDelete && (
              <button
                type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                onClick={() => onDelete()}
                disabled={deleting || submitting}
              >
                {deleting ? (
                  <>
                    <span className="material-icons animate-spin text-base">progress_activity</span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <span className="material-icons text-base">delete</span>
                    Delete
                  </>
                )}
              </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-madas-text/50 mr-2">
                {canSubmit ? '✓ Ready to save' : 'Fill required fields'}
              </p>
              <button
                type="button"
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-madas-text hover:bg-white transition-colors disabled:opacity-60"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!canSubmit || submitting}
              >
                {submitting ? (
                  <>
                    <span className="material-icons animate-spin text-base">progress_activity</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-icons text-base">{isEditing ? 'save' : 'check'}</span>
                    {isEditing ? 'Save Changes' : 'Create Customer'}
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default CustomerModal;
