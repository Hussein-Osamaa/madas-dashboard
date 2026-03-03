import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import ChartContainer from "./ChartContainer";
import { formatCurrency } from "../../utils/calculations";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CashFlowChart = ({ data, loading = false }) => {
  const chartData = {
    labels: data?.labels || [],
    datasets: [
      {
        label: "Cash In",
        data: data?.cashIn || [],
        backgroundColor: "rgba(34, 197, 94, 0.8)",
        borderColor: "rgb(34, 197, 94)",
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: "Cash Out",
        data: data?.cashOut || [],
        backgroundColor: "rgba(239, 68, 68, 0.8)",
        borderColor: "rgb(239, 68, 68)",
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: "Net Cash Flow",
        data: data?.netCashFlow || [],
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.dataset.label}: ${formatCurrency(
              context.parsed.y
            )}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
      },
      y: {
        display: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        border: {
          display: false,
        },
        ticks: {
          callback: function (value) {
            return formatCurrency(value);
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <ChartContainer
        title="Cash Flow"
        subtitle="Monthly cash inflows and outflows"
      >
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="Cash Flow"
      subtitle="Monthly cash inflows and outflows"
    >
      <div className="h-80">
        <Bar data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
};

export default CashFlowChart;
