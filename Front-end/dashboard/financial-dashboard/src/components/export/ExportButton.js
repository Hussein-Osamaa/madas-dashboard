import React, { useState } from "react";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  ChevronDown,
} from "lucide-react";
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  exportFinancialReport,
  exportChartAsImage,
} from "../../utils/export";
import toast from "react-hot-toast";

const ExportButton = ({
  data,
  filename,
  type = "data", // 'data', 'report', 'chart'
  chartId,
  kpis,
  sales,
  expenses,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = async (format) => {
    try {
      switch (type) {
        case "data":
          if (format === "csv") {
            exportToCSV(data, `${filename}.csv`);
          } else if (format === "excel") {
            exportToExcel(data, `${filename}.xlsx`);
          }
          break;

        case "report":
          exportFinancialReport(kpis, sales, expenses, format);
          break;

        case "chart":
          if (chartId) {
            await exportChartAsImage(chartId, `${filename}.png`);
          }
          break;

        case "pdf":
          await exportToPDF(chartId || "export-content", `${filename}.pdf`);
          break;

        default:
          console.error("Unknown export type");
      }

      toast.success(`Exported successfully as ${format.toUpperCase()}`);
      setIsOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed");
    }
  };

  const exportOptions = [
    {
      label: "CSV",
      icon: FileText,
      format: "csv",
      description: "Comma-separated values",
    },
    {
      label: "Excel",
      icon: FileSpreadsheet,
      format: "excel",
      description: "Excel spreadsheet",
    },
    {
      label: "PDF",
      icon: FileText,
      format: "pdf",
      description: "PDF document",
    },
  ];

  // Filter options based on type
  const availableOptions =
    type === "chart"
      ? [
          {
            label: "PNG",
            icon: FileImage,
            format: "png",
            description: "Image file",
          },
        ]
      : exportOptions;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary flex items-center space-x-2"
      >
        <Download className="h-4 w-4" />
        <span>Export</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              {availableOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.format}
                    onClick={() => handleExport(option.format)}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Icon className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">
                        {option.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportButton;
