"use client";

import React from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";

// Daftarkan komponen internal Chart.js agar bisa dipakai di react-chartjs-2
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

interface VendorChartsProps {
  activeSales: number;
  completedSales: number;
  monthlyEarnings: number[];
}

export default function VendorCharts({ activeSales, completedSales, monthlyEarnings }: VendorChartsProps) {
  
  // 🅰️ KONFIGURASI 1: DONUT CHART (SALES STATUS)
  const doughnutData = {
    labels: [`Active Sales (${activeSales})`, `Completed Sales (${completedSales})`],
    datasets: [
      {
        data: [activeSales, completedSales],
        backgroundColor: ["#1cc88a", "#4e73df"],
        hoverBackgroundColor: ["#17a673", "#2e59d9"],
        borderWidth: 1,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { 
          boxWidth: 12, 
          font: { family: "sans-serif", size: 10, weight: "bold" as const }, 
          color: "#64748b" 
        }
      },
    },
    cutout: "70%", // Bikin lingkaran tengah bolong tipis khas Modesy style
  };

  // 🅱️ KONFIGURASI 2: LINE CHART (MONTHLY SALES TREND)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const lineData = {
    labels: months,
    datasets: [
      {
        fill: true,
        label: `Sales (${new Date().getFullYear()})`,
        data: monthlyEarnings,
        borderColor: "#00a896",
        backgroundColor: "rgba(0, 168, 150, 0.06)",
        tension: 0.4, // Membuat kurva garis lengkung gelombang halus
        pointBackgroundColor: "#00a896",
        pointBorderColor: "#fff",
        pointHoverRadius: 5,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { boxWidth: 12, font: { size: 10, weight: "bold" as const } } }
    },
    scales: {
      y: {
        ticks: { font: { size: 10 }, callback: (value: any) => "$" + value },
        grid: { color: "rgba(0, 0, 0, 0.03)" }
      },
      x: { ticks: { font: { size: 10 } }, grid: { display: false } }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 select-none">
      
      {/* Box Donat Kiri (Sales Summary Ratio) */}
      <div className="bg-white border border-gray-200/80 rounded-sm p-4 shadow-3xs lg:col-span-4 flex flex-col justify-between h-[340px]">
        <span className="font-bold text-slate-800 text-sm pb-2 border-b border-gray-50 block">Sales Status</span>
        <div className="flex-1 relative w-full h-full mt-2 flex items-center justify-center">
          {activeSales === 0 && completedSales === 0 ? (
            <p className="text-slate-400 italic font-medium text-center">No sales breakdown available.</p>
          ) : (
            <Doughnut data={doughnutData} options={doughnutOptions} />
          )}
        </div>
      </div>

      {/* Box Garis Kanan (Monthly Sales Trend Curve) */}
      <div className="bg-white border border-gray-200/80 rounded-sm p-4 shadow-3xs lg:col-span-8 flex flex-col justify-between h-[340px]">
        <span className="font-bold text-slate-800 text-sm pb-2 border-b border-gray-50 block">Monthly Sales</span>
        <div className="flex-1 w-full h-full mt-4">
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>

    </div>
  );
}