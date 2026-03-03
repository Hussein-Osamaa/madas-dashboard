import React from "react";
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  ShoppingCart,
  CreditCard,
  Target,
  BarChart3,
} from "lucide-react";
import MetricCard from "./MetricCard";

const KPIGrid = ({ kpis, loading = false }) => {
  const metrics = [
    {
      title: "Total Revenue",
      value: kpis?.revenue?.totalRevenue || 0,
      change: kpis?.revenue?.growth || 0,
      changeType: "currency",
      icon: DollarSign,
      color: "success",
    },
    {
      title: "Net Profit",
      value: kpis?.profit?.netProfit || 0,
      change: kpis?.profit?.growth || 0,
      changeType: "currency",
      icon: TrendingUp,
      color: "primary",
    },
    {
      title: "Gross Margin",
      value: kpis?.profit?.grossMargin || 0,
      change: 0,
      changeType: "percentage",
      icon: BarChart3,
      color: "blue",
    },
    {
      title: "Average Order Value",
      value: kpis?.revenue?.averageOrderValue || 0,
      change: 0,
      changeType: "currency",
      icon: ShoppingCart,
      color: "purple",
    },
    {
      title: "Total Orders",
      value: kpis?.revenue?.totalOrders || 0,
      change: 0,
      changeType: "number",
      icon: CreditCard,
      color: "indigo",
    },
    {
      title: "Total Customers",
      value: kpis?.customers?.totalCustomers || 0,
      change: kpis?.customers?.growth || 0,
      changeType: "number",
      icon: Users,
      color: "warning",
    },
    {
      title: "Inventory Value",
      value: kpis?.inventory?.totalInventoryValue || 0,
      change: 0,
      changeType: "currency",
      icon: Package,
      color: "danger",
    },
    {
      title: "ROI",
      value: kpis?.roi || 0,
      change: 0,
      changeType: "percentage",
      icon: Target,
      color: "success",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          title={metric.title}
          value={metric.value}
          change={metric.change}
          changeType={metric.changeType}
          icon={metric.icon}
          color={metric.color}
          loading={loading}
        />
      ))}
    </div>
  );
};

export default KPIGrid;
