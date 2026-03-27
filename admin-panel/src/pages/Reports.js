import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { reportAPI } from '../services/api';
import './Reports.css';

const COLORS = ['#5B6EEA', '#7C4DFF', '#22C55E', '#F59E0B', '#EF4444'];
const STATUS_COLORS = {
  completed: '#22C55E',
  pending: '#F59E0B',
  failed: '#EF4444',
  refunded: '#8B5CF6'
};

const Reports = () => {
  const today = new Date().toISOString().split('T')[0];
  const last30 = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // State
  const [from, setFrom] = useState(last30);
  const [to, setTo] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('revenue');

  // Data states
  const [overview, setOverview] = useState({});
  const [trend, setTrend] = useState([]);
  const [methods, setMethods] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [bookingStatus, setBookingStatus] = useState([]);
  const [peakHours, setPeakHours] = useState([]);

  // Load all reports
  const loadReports = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('📊 Loading reports from:', from, 'to:', to);

      const [o, t, m, r, occ, bs, ph] = await Promise.all([
        reportAPI.getOverview(from, to),
        reportAPI.getRevenueTrend(from, to, 'day'),
        reportAPI.getPaymentMethods(from, to),
        reportAPI.getRoutes(from, to),
        reportAPI.getOccupancy(from, to),
        reportAPI.getBookingStatus(from, to),
        reportAPI.getPeakHours(from, to)
      ]);

      console.log('✅ Reports loaded:', { o, t, m, r, occ, bs, ph });

      setOverview(o?.data?.data?.overview || {});
      setTrend(t?.data?.data?.trend || []);
      setMethods(m?.data?.data?.methods || []);
      setRoutes((r?.data?.data?.routes || []).slice(0, 20));
      setOccupancy(occ?.data?.data?.occupancy || []);
      setBookingStatus(bs?.data?.data?.booking_status || []);
      setPeakHours(ph?.data?.data?.peak_hours || []);
    } catch (e) {
      console.error('❌ Error loading reports:', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // Quick date filters
  const handleQuickDateFilter = (days) => {
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFrom(fromDate);
    setTo(toDate);
  };

  // Format currency
  const formatCurrency = (v) => `LKR ${Number(v || 0).toLocaleString()}`;

  // Prepared data
  const paymentPieData = methods.map((m) => ({
    name: m.payment_method,
    value: Number(m.bookings || 0)
  }));

  const routeRevenueData = routes
    .sort((a, b) => {
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'bookings') return b.bookings - a.bookings;
      return 0;
    })
    .slice(0, 8)
    .map((r) => ({
      name: `${r.origin}→${r.destination}`,
      revenue: Number(r.revenue || 0),
      bookings: Number(r.bookings || 0)
    }));

  // ========== EXPORT FUNCTIONS ==========

  // CSV Export
  const downloadCSV = (filename, rows) => {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h] ?? '';
            const escaped = String(val).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Excel Export
  const downloadExcel = async () => {
    try {
      const XLSX = (await import('xlsx')).default;

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet([
          {
            Period: `${from} to ${to}`,
            'Total Revenue': overview.total_revenue,
            'Total Bookings': overview.total_bookings,
            'Completed Bookings': overview.completed_bookings,
            'Completion Rate (%)': overview.completion_rate,
            'Avg Booking Value': overview.avg_booking_value,
            'Avg Occupancy (%)': overview.avg_occupancy
          }
        ]),
        'Overview'
      );

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(trend), 'Revenue Trend');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(methods), 'Payment Methods');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(routes), 'Routes');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(occupancy), 'Occupancy');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(bookingStatus), 'Booking Status');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(peakHours), 'Peak Hours');

      XLSX.writeFile(workbook, `AHC_Reports_${from}_to_${to}.xlsx`);
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Failed to export Excel file');
    }
  };

  // PDF Export - Full Report
  const downloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const element = document.querySelector('.reports-page');
      if (!element) {
        alert('Report element not found');
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      pdf.save(`AHC_Reports_${from}_to_${to}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF: ' + error.message);
    }
  };

  // PDF Export for individual reports
  const downloadReportPDF = async (title, elementSelector) => {
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const element = document.querySelector(elementSelector);
      if (!element) {
        alert(`${title} element not found`);
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      pdf.save(`${title}_${from}_to_${to}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert(`Failed to export ${title} PDF`);
    }
  };

  // CSV Exports for individual reports
  const exportOverviewCSV = () => {
    downloadCSV(`overview_${from}_to_${to}.csv`, [
      {
        from,
        to,
        total_revenue: overview.total_revenue || 0,
        total_bookings: overview.total_bookings || 0,
        completed_bookings: overview.completed_bookings || 0,
        completion_rate: overview.completion_rate || 0,
        avg_booking_value: overview.avg_booking_value || 0,
        avg_occupancy: overview.avg_occupancy || 0
      }
    ]);
  };

  const exportTrendCSV = () => downloadCSV(`revenue_trend_${from}_to_${to}.csv`, trend);
  const exportMethodsCSV = () => downloadCSV(`payment_methods_${from}_to_${to}.csv`, methods);
  const exportRoutesCSV = () => downloadCSV(`top_routes_${from}_to_${to}.csv`, routes);
  const exportOccupancyCSV = () => downloadCSV(`occupancy_${from}_to_${to}.csv`, occupancy);
  const exportStatusCSV = () => downloadCSV(`booking_status_${from}_to_${to}.csv`, bookingStatus);
  const exportPeakHoursCSV = () => downloadCSV(`peak_hours_${from}_to_${to}.csv`, peakHours);

  return (
    <div className="reports-page">
      {/* Header Section */}
      <div className="reports-header">
        <div className="header-title">
          <h1>📊 Reports & Analytics</h1>
          <p>Visual insights for bookings, payments, occupancy, and route performance</p>
        </div>

        <div className="header-controls">
          {/* Date Filters */}
          <div className="filter-section">
            <div className="date-inputs">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <span>to</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>

            {/* Quick filters */}
            <div className="quick-filters">
              <button
                className="quick-filter-btn"
                onClick={() => handleQuickDateFilter(7)}
                title="Last 7 days"
              >
                7D
              </button>
              <button
                className="quick-filter-btn"
                onClick={() => handleQuickDateFilter(30)}
                title="Last 30 days"
              >
                30D
              </button>
              <button
                className="quick-filter-btn"
                onClick={() => handleQuickDateFilter(90)}
                title="Last 90 days"
              >
                90D
              </button>
              <button
                className="quick-filter-btn"
                onClick={() => handleQuickDateFilter(365)}
                title="Last year"
              >
                1Y
              </button>
            </div>

            <button onClick={loadReports} className="apply-btn" disabled={loading}>
              {loading ? '⏳ Loading...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="export-section">
        <div className="export-row">
          <h3>📥 Export Full Report</h3>
          <div className="export-buttons">
            <button onClick={downloadExcel} className="export-btn excel-btn" title="Export all data">
              📊 Excel
            </button>
            <button onClick={downloadPDF} className="export-btn pdf-btn" title="Export as PDF">
              📄 PDF (Full)
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-box">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card primary">
          <span className="kpi-label">💰 Total Revenue</span>
          <h3>{formatCurrency(overview.total_revenue)}</h3>
          <small>Period: {from} to {to}</small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">📈 Total Bookings</span>
          <h3>{Number(overview.total_bookings || 0).toLocaleString()}</h3>
          <small>All statuses</small>
        </div>

        <div className="kpi-card success">
          <span className="kpi-label">✅ Completed</span>
          <h3>{Number(overview.completed_bookings || 0).toLocaleString()}</h3>
          <small>{Number(overview.completion_rate || 0).toFixed(1)}% completion</small>
        </div>

        <div className="kpi-card info">
          <span className="kpi-label">💵 Avg Booking Value</span>
          <h3>{formatCurrency(overview.avg_booking_value)}</h3>
          <small>Per booking</small>
        </div>

        <div className="kpi-card warning">
          <span className="kpi-label">🚌 Avg Occupancy</span>
          <h3>{Number(overview.avg_occupancy || 0).toFixed(1)}%</h3>
          <small>Bus capacity</small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">🛣️ Active Routes</span>
          <h3>{overview.active_routes || 0}</h3>
          <small>In operation</small>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Revenue Trend */}
        <section className="panel panel-full" id="revenue-trend-section">
          <div className="panel-head">
            <h2>📈 Revenue Trend</h2>
            <div>
              <button onClick={() => downloadReportPDF('Revenue_Trend', '#revenue-trend-section')} className="panel-export-btn pdf-export">
                📄 PDF
              </button>
              <button onClick={exportTrendCSV} className="panel-export-btn">
                CSV
              </button>
            </div>
          </div>
          <div className="chart-box">
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#5B6EEA"
                    strokeWidth={3}
                    dot={false}
                    name="Daily Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No data available</div>
            )}
          </div>
        </section>

        {/* Occupancy Rate */}
        <section className="panel panel-full" id="occupancy-section">
          <div className="panel-head">
            <h2>🚌 Bus Occupancy Rate</h2>
            <div>
              <button onClick={() => downloadReportPDF('Occupancy', '#occupancy-section')} className="panel-export-btn pdf-export">
                📄 PDF
              </button>
              <button onClick={exportOccupancyCSV} className="panel-export-btn">
                CSV
              </button>
            </div>
          </div>
          <div className="chart-box">
            {occupancy.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={occupancy}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'Occupancy %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="occupancy_rate"
                    stroke="#22C55E"
                    strokeWidth={2}
                    name="Occupancy Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No data available</div>
            )}
          </div>
        </section>

        {/* Payment Methods */}
        <section className="panel" id="payment-methods-section">
          <div className="panel-head">
            <h2>💳 Payment Method Split</h2>
            <div>
              <button onClick={() => downloadReportPDF('Payment_Methods', '#payment-methods-section')} className="panel-export-btn pdf-export">
                📄 PDF
              </button>
              <button onClick={exportMethodsCSV} className="panel-export-btn">
                CSV
              </button>
            </div>
          </div>
          <div className="chart-box">
            {paymentPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={paymentPieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {paymentPieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No data available</div>
            )}
          </div>
        </section>

        {/* Booking Status Distribution */}
        <section className="panel" id="booking-status-section">
          <div className="panel-head">
            <h2>📊 Booking Status</h2>
            <div>
              <button onClick={() => downloadReportPDF('Booking_Status', '#booking-status-section')} className="panel-export-btn pdf-export">
                📄 PDF
              </button>
              <button onClick={exportStatusCSV} className="panel-export-btn">
                CSV
              </button>
            </div>
          </div>
          <div className="chart-box">
            {bookingStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={bookingStatus}
                    dataKey="count"
                    nameKey="status"
                    outerRadius={100}
                    label={(entry) => `${entry.status}: ${entry.count}`}
                  >
                    {bookingStatus.map((item, index) => (
                      <Cell key={index} fill={STATUS_COLORS[item.status] || COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No data available</div>
            )}
          </div>
        </section>

        {/* Peak Booking Hours */}
        <section className="panel panel-full" id="peak-hours-section">
          <div className="panel-head">
            <h2>⏰ Peak Booking Hours</h2>
            <div>
              <button onClick={() => downloadReportPDF('Peak_Hours', '#peak-hours-section')} className="panel-export-btn pdf-export">
                📄 PDF
              </button>
              <button onClick={exportPeakHoursCSV} className="panel-export-btn">
                CSV
              </button>
            </div>
          </div>
          <div className="chart-box">
            {peakHours.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Bookings', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bookings" fill="#F59E0B" name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No data available</div>
            )}
          </div>
        </section>

        {/* Top Routes by Revenue */}
        <section className="panel panel-full" id="top-routes-section">
          <div className="panel-head">
            <h2>🏆 Top Routes by Revenue</h2>
            <div>
              <label>Sort by: </label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="revenue">Revenue</option>
                <option value="bookings">Bookings</option>
              </select>
              <button onClick={() => downloadReportPDF('Top_Routes', '#top-routes-section')} className="panel-export-btn pdf-export">
                📄 PDF
              </button>
              <button onClick={exportRoutesCSV} className="panel-export-btn">
                CSV
              </button>
            </div>
          </div>
          <div className="chart-box">
            {routeRevenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={routeRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis label={{ value: 'Revenue (LKR)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#7C4DFF" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No data available</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Reports;