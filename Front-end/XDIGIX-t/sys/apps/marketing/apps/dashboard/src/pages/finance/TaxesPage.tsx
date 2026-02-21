import { useFinanceScope } from '../../hooks/useFinanceScope';

const TaxesPage = () => {
  const scope = useFinanceScope();

  if (!scope.canManage) {
    return (
      <section className="px-6 py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
          You don’t have permission to access finance tax settings.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 px-6 py-8">
      <header>
        <h2 className="text-3xl font-bold text-primary">Taxes</h2>
        <p className="text-sm text-madas-text/70">
          Configure VAT, generate summaries and stay compliant. Planned for a future phase.
        </p>
      </header>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
        Tax settings &amp; reporting placeholder.
      </div>
    </section>
  );
};

export default TaxesPage;

