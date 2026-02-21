import { useState, useEffect, useCallback, useMemo } from 'react';
import PermissionGuard from '../components/rbac/PermissionGuard';
import { collection, db, getDocs, doc, updateDoc } from '../lib/firebase';
import { Plus, Save, Search, CheckCircle, DollarSign, Package, LayoutDashboard, ShoppingCart, Box, BarChart2, FileText, Settings, CreditCard, Users, Shield, Star } from 'lucide-react';

type Plan = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  features: string[];
  isPopular: boolean;
  order: number;
  isActive: boolean;
};

type FeatureCategory = {
  name: string;
  icon: React.ElementType;
  features: { key: string; name: string; description: string }[];
};

const ALL_FEATURES: FeatureCategory[] = [
  {
    name: 'Core Features',
    icon: LayoutDashboard,
    features: [
      { key: 'pos', name: 'Point of Sale', description: 'Access to the POS system for sales' },
      { key: 'inventory', name: 'Inventory Management', description: 'Manage product stock and variants' },
      { key: 'orders', name: 'Order Management', description: 'Process and track customer orders' },
      { key: 'customers', name: 'Customer Management', description: 'Manage customer profiles and history' },
      { key: 'analytics', name: 'Basic Analytics', description: 'View essential business performance metrics' },
      { key: 'reports', name: 'Basic Reports', description: 'Generate standard business reports' },
    ],
  },
  {
    name: 'Advanced Features',
    icon: Star,
    features: [
      { key: 'advanced_analytics', name: 'Advanced Analytics', description: 'Detailed insights and custom dashboards' },
      { key: 'advanced_reports', name: 'Advanced Reports', description: 'Custom reports and data exports' },
      { key: 'multi_location', name: 'Multi-Location', description: 'Manage multiple business locations' },
      { key: 'api_access', name: 'API Access', description: 'Access to API for integrations' },
      { key: 'fulfillment', name: 'Fulfillment Service', description: 'Access to XDIGIX fulfillment services' },
    ],
  },
  {
    name: 'Team & Access',
    icon: Users,
    features: [
      { key: 'staff_management', name: 'Staff Management', description: 'Add and manage staff members' },
      { key: 'roles_permissions', name: 'Roles & Permissions', description: 'Custom roles and access control' },
      { key: 'audit_logs', name: 'Audit Logs', description: 'Track all system activities' },
    ],
  },
  {
    name: 'Finance',
    icon: CreditCard,
    features: [
      { key: 'finance_dashboard', name: 'Finance Dashboard', description: 'Access to finance management system' },
      { key: 'invoicing', name: 'Invoicing', description: 'Create and manage invoices' },
      { key: 'expenses', name: 'Expense Tracking', description: 'Track business expenses' },
      { key: 'tax_reports', name: 'Tax Reports', description: 'Generate tax-related reports' },
    ],
  },
];

export default function PlanPermissionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planFeatures, setPlanFeatures] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const plansSnapshot = await getDocs(collection(db, 'plans'));
      const loadedPlans: Plan[] = plansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Plan));
      setPlans(loadedPlans.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (error) {
      console.error('[PlanPermissionsPage] Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    if (selectedPlan) {
      setPlanFeatures(selectedPlan.features || []);
    } else {
      setPlanFeatures([]);
    }
  }, [selectedPlan]);

  const categories = useMemo(() => {
    return ALL_FEATURES.map(cat => cat.name);
  }, []);

  const filteredFeatures = useMemo(() => {
    const allFeatures = ALL_FEATURES.flatMap(cat => 
      cat.features.map(f => ({ ...f, category: cat.name }))
    );
    
    return allFeatures.filter(f => {
      const matchesSearch = !searchTerm || 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || f.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, filterCategory]);

  const handleFeatureToggle = (featureKey: string) => {
    setPlanFeatures(prev => 
      prev.includes(featureKey)
        ? prev.filter(f => f !== featureKey)
        : [...prev, featureKey]
    );
  };

  const handleSaveFeatures = async () => {
    if (!selectedPlan) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'plans', selectedPlan.id), {
        features: planFeatures
      });
      setSelectedPlan(prev => prev ? { ...prev, features: planFeatures } : null);
      setPlans(prev => prev.map(p => 
        p.id === selectedPlan.id ? { ...p, features: planFeatures } : p
      ));
      alert('✅ Plan features saved successfully!');
    } catch (error) {
      console.error('[PlanPermissionsPage] Error saving features:', error);
      alert('❌ Failed to save features');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    if (!selectedPlan) return false;
    const originalFeatures = selectedPlan.features || [];
    if (originalFeatures.length !== planFeatures.length) return true;
    return !originalFeatures.every(f => planFeatures.includes(f));
  }, [selectedPlan, planFeatures]);

  return (
    <PermissionGuard permission="super_admin.manage_subscriptions" showError>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <DollarSign className="w-7 h-7 text-amber-400" />
              Plan Features Management
            </h1>
            <p className="text-gray-400 mt-1">Configure which features are available for each subscription plan</p>
          </div>
          {selectedPlan && hasChanges && (
            <button
              onClick={handleSaveFeatures}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plans List */}
          <div className="bg-[#1a1b3e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              Subscription Plans
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {plans.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4 text-center">No plans found</p>
                ) : (
                  plans.map(plan => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border ${
                        selectedPlan?.id === plan.id
                          ? 'bg-amber-500/20 border-amber-500/30'
                          : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-white">{plan.displayName || plan.name}</h3>
                            {plan.isPopular && (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">Popular</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{(plan.features || []).length} features enabled</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Features Panel */}
          <div className="lg:col-span-2 bg-[#1a1b3e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
            {selectedPlan ? (
              <>
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">
                      Features for "{selectedPlan.displayName || selectedPlan.name}"
                    </h2>
                    <span className="text-xs text-gray-500">
                      {planFeatures.length} features enabled
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search features..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
                  {filteredFeatures.map(feature => {
                    const isChecked = planFeatures.includes(feature.key);
                    return (
                      <label
                        key={feature.key}
                        className={`flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer border ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                            : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center pt-0.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleFeatureToggle(feature.key)}
                            className="w-5 h-5 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{feature.name}</span>
                            {isChecked && (
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
                          <span className="text-xs text-gray-600 mt-1">{feature.category}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Package className="w-12 h-12 mb-4 text-gray-600" />
                <p>Select a plan to manage its features</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
