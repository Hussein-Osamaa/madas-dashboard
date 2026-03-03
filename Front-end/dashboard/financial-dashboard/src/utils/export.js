import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// CSV Export
export const exportToCSV = (data, filename = "export.csv") => {
  if (!data || data.length === 0) {
    console.error("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Handle values that contain commas or quotes
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Excel Export
export const exportToExcel = (
  data,
  filename = "export.xlsx",
  sheetName = "Data"
) => {
  if (!data || data.length === 0) {
    console.error("No data to export");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
};

// PDF Export
export const exportToPDF = async (elementId, filename = "export.pdf") => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Element not found for PDF export");
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};

// Financial Report Export
export const exportFinancialReport = (
  kpis,
  sales,
  expenses,
  format = "excel"
) => {
  const reportData = {
    summary: {
      "Total Revenue": kpis?.revenue?.totalRevenue || 0,
      "Net Profit": kpis?.profit?.netProfit || 0,
      "Gross Margin": kpis?.profit?.grossMargin || 0,
      "Total Orders": kpis?.revenue?.totalOrders || 0,
      "Average Order Value": kpis?.revenue?.averageOrderValue || 0,
      "Total Customers": kpis?.customers?.totalCustomers || 0,
      "Inventory Value": kpis?.inventory?.totalInventoryValue || 0,
      ROI: kpis?.roi || 0,
    },
    sales: sales.map((sale) => ({
      Date: sale.createdAt?.toDate?.()?.toLocaleDateString() || "N/A",
      Amount: sale.amount || 0,
      Customer: sale.customerName || "N/A",
      Product: sale.productName || "N/A",
      Status: sale.status || "Completed",
    })),
    expenses: expenses.map((expense) => ({
      Date: expense.createdAt?.toDate?.()?.toLocaleDateString() || "N/A",
      Amount: expense.amount || 0,
      Category: expense.category || "Other",
      Description: expense.description || "N/A",
      Type: expense.type || "Expense",
    })),
  };

  const timestamp = new Date().toISOString().split("T")[0];

  switch (format) {
    case "csv":
      exportToCSV(reportData.sales, `sales-report-${timestamp}.csv`);
      break;
    case "excel":
      const workbook = XLSX.utils.book_new();

      // Summary sheet
      const summarySheet = XLSX.utils.json_to_sheet([reportData.summary]);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // Sales sheet
      const salesSheet = XLSX.utils.json_to_sheet(reportData.sales);
      XLSX.utils.book_append_sheet(workbook, salesSheet, "Sales");

      // Expenses sheet
      const expensesSheet = XLSX.utils.json_to_sheet(reportData.expenses);
      XLSX.utils.book_append_sheet(workbook, expensesSheet, "Expenses");

      XLSX.writeFile(workbook, `financial-report-${timestamp}.xlsx`);
      break;
    case "pdf":
      // For PDF, we'll create a comprehensive report
      createPDFReport(reportData, `financial-report-${timestamp}.pdf`);
      break;
    default:
      console.error("Unsupported export format");
  }
};

// Create comprehensive PDF report
const createPDFReport = async (reportData, filename) => {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Title
  pdf.setFontSize(20);
  pdf.text("Financial Report", pageWidth / 2, 20, { align: "center" });

  // Date
  pdf.setFontSize(12);
  pdf.text(
    `Generated on: ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    30,
    { align: "center" }
  );

  let yPosition = 50;

  // Summary section
  pdf.setFontSize(16);
  pdf.text("Summary", 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  Object.entries(reportData.summary).forEach(([key, value]) => {
    pdf.text(
      `${key}: ${typeof value === "number" ? value.toFixed(2) : value}`,
      20,
      yPosition
    );
    yPosition += 7;
  });

  // Add new page for sales
  pdf.addPage();
  yPosition = 20;

  pdf.setFontSize(16);
  pdf.text("Sales Data", 20, yPosition);
  yPosition += 10;

  // Sales table headers
  const salesHeaders = ["Date", "Amount", "Customer", "Product", "Status"];
  const colWidths = [30, 25, 40, 40, 25];
  let xPosition = 20;

  pdf.setFontSize(10);
  salesHeaders.forEach((header, index) => {
    pdf.text(header, xPosition, yPosition);
    xPosition += colWidths[index];
  });

  yPosition += 5;
  pdf.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 5;

  // Sales data
  reportData.sales.slice(0, 20).forEach((sale) => {
    // Limit to 20 rows
    xPosition = 20;
    const rowData = [
      sale.Date,
      sale.Amount,
      sale.Customer,
      sale.Product,
      sale.Status,
    ];
    rowData.forEach((data, index) => {
      pdf.text(String(data).substring(0, 15), xPosition, yPosition); // Truncate long text
      xPosition += colWidths[index];
    });
    yPosition += 5;

    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }
  });

  pdf.save(filename);
};

// Export chart as image
export const exportChartAsImage = async (chartId, filename = "chart.png") => {
  const chartElement = document.getElementById(chartId);
  if (!chartElement) {
    console.error("Chart element not found");
    return;
  }

  try {
    const canvas = await html2canvas(chartElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (error) {
    console.error("Error exporting chart:", error);
  }
};
