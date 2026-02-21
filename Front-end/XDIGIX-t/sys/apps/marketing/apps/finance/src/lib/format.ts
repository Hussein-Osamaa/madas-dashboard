import dayjs, { Dayjs } from 'dayjs';

export const formatCurrency = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(value || 0);

export const formatDate = (value: string | Date | Dayjs) => dayjs(value).format('MMM D, YYYY');

export const startOfMonth = (value = dayjs()) => value.startOf('month');
export const endOfMonth = (value = dayjs()) => value.endOf('month');

export const getPastMonths = (count: number) => {
  const months: { label: string; start: Dayjs; end: Dayjs }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const month = dayjs().subtract(i, 'month');
    months.push({
      label: month.format('MMM YYYY'),
      start: month.startOf('month'),
      end: month.endOf('month')
    });
  }
  return months;
};

