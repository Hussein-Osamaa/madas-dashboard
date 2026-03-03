import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  formatCurrency,
  formatPercentage,
  formatNumber,
} from "../../utils/calculations";

const MetricCard = ({
  title,
  value,
  change,
  changeType = "percentage",
  icon: Icon,
  color = "primary",
  subtitle,
  loading = false,
}) => {
  const colorClasses = {
    primary: "bg-primary-50 text-primary-600",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    danger: "bg-danger-50 text-danger-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  const formatValue = (val, type) => {
    if (loading) return "...";

    switch (type) {
      case "currency":
        return formatCurrency(val);
      case "percentage":
        return formatPercentage(val);
      case "number":
        return formatNumber(val);
      default:
        return val;
    }
  };

  const getChangeIcon = () => {
    if (loading) return null;

    if (change > 0) {
      return <TrendingUp className="h-4 w-4" />;
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4" />;
    } else {
      return <Minus className="h-4 w-4" />;
    }
  };

  const getChangeColor = () => {
    if (loading) return "text-gray-500";

    if (change > 0) {
      return "text-success-600";
    } else if (change < 0) {
      return "text-danger-600";
    } else {
      return "text-gray-500";
    }
  };

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="metric-label">{title}</p>
          <p className="metric-value">{formatValue(value, changeType)}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>

        {Icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>

      {change !== undefined && (
        <div className={`flex items-center mt-4 ${getChangeColor()}`}>
          {getChangeIcon()}
          <span className="ml-1 text-sm font-medium">
            {loading ? "..." : `${Math.abs(change).toFixed(1)}%`}
          </span>
          <span className="ml-1 text-xs text-gray-500">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
