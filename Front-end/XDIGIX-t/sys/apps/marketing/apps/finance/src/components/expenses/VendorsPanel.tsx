import { formatCurrency } from '../../lib/format';

type Vendor = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalSpent: number;
  lastExpense?: Date;
};

type Props = {
  vendors: Vendor[];
  totalSpent: number;
  currency: string;
};

const VendorsPanel = ({ vendors, totalSpent, currency }: Props) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-lg font-semibold text-primary">Top Vendors</h3>
      <p className="text-xs text-madas-text/60">
        Track total spend per vendor, upcoming dues and contact details. Powered by the vendors collection.
      </p>
    </div>
    <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
      Total spent: {formatCurrency(totalSpent, currency)}
    </div>
    <ul className="space-y-3">
      {vendors.length ? (
        vendors.map((vendor) => (
          <li key={vendor.id} className="rounded-2xl border border-primary/10 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">{vendor.name}</p>
                <p className="text-xs text-madas-text/60">{vendor.email ?? vendor.phone ?? 'no contact info'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-primary">{formatCurrency(vendor.totalSpent, currency)}</p>
                <p className="text-xs text-madas-text/60">
                  Last expense:{' '}
                  {vendor.lastExpense ? vendor.lastExpense.toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
          </li>
        ))
      ) : (
        <li className="rounded-2xl border border-primary/10 bg-white px-4 py-3 text-xs text-madas-text/60">
          No vendors recorded yet. Add expenses to build vendor history.
        </li>
      )}
    </ul>
  </div>
);

export default VendorsPanel;


