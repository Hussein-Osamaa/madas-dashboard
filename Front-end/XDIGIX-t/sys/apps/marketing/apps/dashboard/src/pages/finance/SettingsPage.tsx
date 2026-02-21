import { useFinanceScope } from '../../hooks/useFinanceScope';

const SettingsPage = () => {
  const scope = useFinanceScope();

  if (!scope.canManage) {
    return (
      <section className="px-6 py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
          You don’t have permission to manage finance settings.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 px-6 py-8">
      <header>
        <h2 className="text-3xl font-bold text-primary">Finance Settings</h2>
        <p className="text-sm text-madas-text/70">
          Tenant-level configuration for currency, fiscal year, tax defaults and permissions. Coming soon.
        </p>
      </header>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
        Settings form placeholder.
      </div>
    </section>
  );
};

export default SettingsPage;

