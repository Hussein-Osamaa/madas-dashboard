import { memo } from 'react';
import { PricingSectionData } from '../../../types/builder';
import BlockWrapper from '../BlockWrapper';

type Props = { data: PricingSectionData; style?: React.CSSProperties; isSelected?: boolean; onEditBlock?: (dataKey: string, blockIndex: number) => void; onDeleteBlock?: (dataKey: string, blockIndex: number) => void };

const PricingSection = ({ data, style, isSelected, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const title = d.title || 'Pricing';
  const subtitle = d.subtitle || '';
  const currency = d.currency || '$';
  const billingPeriod = d.billingPeriod || '/month';
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const plans = d.plans ?? [];

  const defaultPlans = [
    { name: 'Basic', price: 9, features: ['Feature one', 'Feature two', 'Feature three'], highlighted: false, buttonText: 'Choose plan' },
    { name: 'Pro', price: 29, features: ['Feature one', 'Feature two', 'Feature three', 'Feature four'], highlighted: true, buttonText: 'Choose plan' },
    { name: 'Enterprise', price: 99, features: ['Feature one', 'Feature two', 'Feature three', 'Feature four', 'Feature five'], highlighted: false, buttonText: 'Choose plan' },
  ];

  const displayPlans = plans.length > 0 ? plans : defaultPlans;

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">{title}</h2>
          {subtitle && <p className="text-sm" style={{ opacity: 0.75 }}>{subtitle}</p>}
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(displayPlans.length, 3)} gap-6 max-w-4xl mx-auto`}>
          {displayPlans.map((plan: any, index: number) => (
            <BlockWrapper key={index} dataKey="plans" blockIndex={index} blockType="pricing_plan" isSelected={!!isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
            <div className={`border p-8`} style={{ borderColor: plan.highlighted ? 'var(--scheme-btn-bg, #121212)' : 'currentColor', borderWidth: plan.highlighted ? '2px' : '1px', opacity: plan.highlighted ? 1 : undefined }}>
              <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{currency}{plan.price}</span>
                <span className="text-sm" style={{ opacity: 0.6 }}>{billingPeriod}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {(Array.isArray(plan.features)
                  ? plan.features
                  : typeof plan.features === 'string'
                    ? plan.features.split('\n').filter((s: string) => s.trim())
                    : []
                ).map((feature: string, fi: number) => (
                  <li key={fi} className="flex items-start gap-2 text-sm" style={{ opacity: 0.75 }}>
                    <span className="material-icons text-sm mt-0.5">check</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className="w-full py-3 text-sm font-medium tracking-wider uppercase transition-colors border"
                style={plan.highlighted
                  ? { backgroundColor: 'var(--scheme-btn-bg, #121212)', color: 'var(--scheme-btn-label, #fff)', borderColor: 'var(--scheme-btn-bg, #121212)' }
                  : { borderColor: 'var(--scheme-outline-btn, #121212)', color: 'var(--scheme-outline-btn, #121212)', backgroundColor: 'transparent' }
                }>
                {plan.buttonText || 'Choose plan'}
              </button>
            </div>
            </BlockWrapper>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(PricingSection);
