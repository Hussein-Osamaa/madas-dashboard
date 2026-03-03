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

const ExpenseChart = ({ data, loading = false }) => {
  const chartData = {
    labels: data?.labels || [],
    datasets: [
      {
        label: "Expenses",
        data: data?.expenses || [],
        backgroundColor: "rgba(239, 68, 68, 0.8)",
        borderColor: "rgb(239, 68, 68)",
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: "COGS",
        data: data?.cogs || [],
        backgroundColor: "rgba(245, 158, 11, 0.8)",
        borderColor: "rgb(245, 158, 11)",
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
        title="Expense Breakdown"
        subtitle="Monthly expenses by category"
      >
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="Expense Breakdown"
      subtitle="Monthly expenses by category"
    >
      <div className="h-80">
        <Bar data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
};

export default ExpenseChart;
