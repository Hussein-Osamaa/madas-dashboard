import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { NavbarSectionData, NavbarMenuItem } from '../../../types/builder';
import TextField from './shared/TextField';
import ColorField from './shared/ColorField';
import ImageField from './shared/ImageField';
import ToggleField from './shared/ToggleField';
import ArrayEditor from './shared/ArrayEditor';
import StylePanel from './shared/StylePanel';

const NavbarEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<NavbarSectionData>(section.data as NavbarSectionData);
  useEffect(() => { setData(section.data as NavbarSectionData); }, [section.id]);

  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value };
    setData(next);
    onUpdate(next as Record<string, unknown>);
  };

  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Branding</p>
        <TextField label="Logo Text" value={data.logoText || ''} onChange={v => set('logoText', v)} />
        <ImageField label="Logo Image" value={data.logo || ''} onChange={v => set('logo', v)} helperText="Replaces logo text if set" />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Menu Items</p>
        <ArrayEditor<NavbarMenuItem>
          label="Menu Items"
          items={data.menuItems || []}
          onChange={items => set('menuItems', items)}
          createDefault={() => ({ label: 'New Link', link: '#' })}
          addLabel="Add Menu Item"
          renderItem={(item, _, onChange) => (
            <div className="space-y-2">
              <TextField label="Label" value={item.label} onChange={v => onChange({ ...item, label: v })} />
              <TextField label="URL" value={item.link} onChange={v => onChange({ ...item, link: v })} />
            </div>
          )}
        />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Icons</p>
        <ToggleField label="Show Search" value={!!data.showSearch} onChange={v => set('showSearch', v)} />
        <ToggleField label="Show Cart" value={!!data.showCart} onChange={v => set('showCart', v)} />
        <ToggleField label="Show Wishlist" value={!!data.showWishlist} onChange={v => set('showWishlist', v)} />
        <ToggleField label="Sticky Navbar" value={!!data.sticky} onChange={v => set('sticky', v)} />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Colors</p>
        <ColorField label="Background" value={data.backgroundColor || '#FFFFFF'} onChange={v => set('backgroundColor', v)} />
        <ColorField label="Text / Links" value={data.textColor || '#27491F'} onChange={v => set('textColor', v)} />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};

export default React.memo(NavbarEditor);
