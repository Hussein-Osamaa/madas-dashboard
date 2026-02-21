type Props = {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onResetToThisMonth: () => void;
};

const OverviewFilters = ({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange, 
  onResetToThisMonth 
}: Props) => {
  return (
    <div className="relative flex flex-wrap items-center gap-4 rounded-2xl border border-gray-100 bg-white/70 p-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-madas-text/60">Filters</p>
        <p className="text-sm text-madas-text/70">Select the period to analyse performance.</p>
      </div>
      <div className="flex flex-wrap items-center gap-4 ml-auto">
        <div className="flex items-center gap-2">
          <label className="text-sm text-madas-text/70">Start Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-madas-text/70">End Date:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={onResetToThisMonth}
          className="px-4 py-1.5 text-sm font-medium text-madas-text border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Reset to This Month
        </button>
      </div>
    </div>
  );
};

export default OverviewFilters;
