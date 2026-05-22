import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import type { ClientWithMetrics } from '../types';
import {
  getClientFinancials, getClientJobs, getSettings
} from './storage';
import { calcTiersRevenue, calcTiersBooked, calcProfit, calcROAS } from './metrics';

export function exportClientCSV(client: ClientWithMetrics, _month?: string): void {
  const financials = getClientFinancials(client.id);

  const rows = financials
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(f => {
      const tiers = f.pricingTiers ?? [];
      const rev = calcTiersRevenue(tiers);
      const booked = calcTiersBooked(tiers);
      const avgPrice = booked > 0 ? rev / booked : 0;
      const profit = calcProfit(rev, f.adSpend);
      const roas = calcROAS(rev, f.adSpend);
      return [
        f.month,
        booked,
        `$${rev.toFixed(2)}`,
        avgPrice > 0 ? `$${avgPrice.toFixed(2)}` : '—',
        `$${f.adSpend.toFixed(2)}`,
        `$${profit.toFixed(2)}`,
        roas > 0 ? roas.toFixed(2) + 'x' : '—',
      ];
    });

  const header = ['Month', 'Total Booked', 'Revenue', 'Avg Price/Appt', 'Ad Spend', 'Profit', 'ROAS'];
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');

  downloadFile(`${client.name.replace(/\s+/g, '_')}_report.csv`, csv, 'text/csv');
}

export function exportClientPDF(client: ClientWithMetrics): void {
  const settings = getSettings();
  const doc = new jsPDF();
  const financials = getClientFinancials(client.id).sort((a, b) => a.month.localeCompare(b.month));
  const jobs = getClientJobs(client.id);

  // Header
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.agencyName, 15, 18);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Client Report — ${client.name}`, 15, 28);
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy')}`, 15, 35);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);

  // Client info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Overview', 15, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text([
    `Business Type: ${client.businessType || '—'}`,
    `CSM: ${client.assignedCSM || '—'}`,
    `Status: ${client.status}`,
    `Contract End: ${format(parseISO(client.contractEndDate), 'MMM d, yyyy')}`,
    `Total LTV: $${client.totalRevenue.toFixed(2)}`,
    `Total Net Profit: $${client.totalProfit.toFixed(2)}`,
  ], 15, 65);

  // Monthly financials table
  const tableRows = financials.map(f => {
    const tiers = f.pricingTiers ?? [];
    const rev = calcTiersRevenue(tiers);
    const booked = calcTiersBooked(tiers);
    const avgPrice = booked > 0 ? rev / booked : 0;
    const profit = calcProfit(rev, f.adSpend);
    const roas = calcROAS(rev, f.adSpend);
    return [
      f.month,
      booked,
      `$${rev.toFixed(0)}`,
      avgPrice > 0 ? `$${avgPrice.toFixed(0)}` : '—',
      `$${f.adSpend.toFixed(0)}`,
      `$${profit.toFixed(0)}`,
      roas > 0 ? roas.toFixed(2) + 'x' : '—',
    ];
  });

  autoTable(doc, {
    startY: 105,
    head: [['Month', 'Total Booked', 'Revenue', 'Avg Price/Appt', 'Ad Spend', 'Profit', 'ROAS']],
    body: tableRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [99, 102, 241] },
  });

  const afterTable = (doc as any).lastAutoTable.finalY + 10;

  // Jobs
  if (jobs.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Closed Jobs', 15, afterTable);
    autoTable(doc, {
      startY: afterTable + 5,
      head: [['Date', 'Type', 'Value', 'Description']],
      body: jobs.map(j => [j.date, j.jobType, `$${j.value}`, j.description]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
    });
  }

  doc.save(`${client.name.replace(/\s+/g, '_')}_report.pdf`);
}

export function exportAgencyCSV(clients: ClientWithMetrics[], month: string): void {
  const rows = clients
    .filter(c => c.status === 'Active')
    .map(c => [
      c.name,
      c.assignedCSM || '—',
      c.currentRevenue.toFixed(2),
      c.currentAdSpend.toFixed(2),
      c.currentProfit.toFixed(2),
      c.currentROAS > 0 ? c.currentROAS.toFixed(2) : '0',
      c.happinessScore ?? '—',
      c.churnRisk.total,
    ]);

  const header = ['Client', 'CSM', 'Revenue', 'Ad Spend', 'Profit', 'ROAS', 'Happiness', 'Churn Risk'];
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');

  downloadFile(`agency_report_${month}.csv`, csv, 'text/csv');
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
