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

const Reports = () => {
  const today = new Date().toISOString().split('T')[0];
  const last30 = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [from, setFrom] = useState(last30);
  const [to, setTo] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [overview, setOverview] = useState({});
  const [trend, setTrend] = useState([]);
  const [methods, setMethods] = useState([]);
  const [routes, setRoutes] = useState([]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError('');

      const [o, t, m, r] = await Promise.all([
        reportAPI.getOverview(from, to),
        reportAPI.getRevenueTrend(from, to, 'day'),
        reportAPI.getPaymentMethods(from, to),
        reportAPI.getRoutes(from, to)
      ]);

      setOverview(o?.data?.data?.overview || {});
      setTrend(t?.data?.data?.trend || []);
      setMethods(m?.data?.data?.methods || []);
      setRoutes((r?.data?.data?.routes || []).slice(0, 20));
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatCurrency = (v) => `LKR ${Number(v || 0).toLocaleString()}`;

  const paymentPieData = methods.map((m) => ({
    name: m.payment_method,
    value: Number(m.bookings || 0)
  }));

  const routeRevenueData = routes.slice(0, 8).map((r) => ({
    name: `${r.origin}→${r.destination}`,
    revenue: Number(r.revenue || 0)
  }));

  // ---------- CSV ----------
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

  const exportOverviewCSV = () => {
    downloadCSV(`overview_${from}_to_${to}.csv`, [
      {
        from,
        to,
        total_revenue: overview.total_revenue || 0,
        total_bookings: overview.total_bookings || 0,
        completed_bookings: overview.completed_bookings || 0,
        completion_rate: overview.completion_rate || 0
      }
    ]);
  };

  const exportTrendCSV = () => downloadCSV(`revenue_trend_${from}_to_${to}.csv`, trend);
  const exportMethodsCSV = () => downloadCSV(`payment_methods_${from}_to_${to}.csv`, methods);
  const exportRoutesCSV = () => downloadCSV(`top_routes_${from}_to_${to}.csv`, routes);

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p>Visual insights for bookings, payments, and route performance</p>
        </div>

        <div className="filters">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button onClick={loadReports}>{loading ? 'Loading...' : 'Apply'}</button>
        </div>
      </div>

      <div className="export-row">
        <button onClick={exportOverviewCSV}>Export Overview CSV</button>
        <button onClick={exportTrendCSV}>Export Revenue Trend CSV</button>
        <button onClick={exportMethodsCSV}>Export Payment Methods CSV</button>
        <button onClick={exportRoutesCSV}>Export Routes CSV</button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Revenue</span>
          <h3>{formatCurrency(overview.total_revenue)}</h3>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Bookings</span>
          <h3>{Number(overview.total_bookings || 0).toLocaleString()}</h3>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Completed</span>
          <h3>{Number(overview.completed_bookings || 0).toLocaleString()}</h3>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Completion Rate</span>
          <h3>{Number(overview.completion_rate || 0).toFixed(2)}%</h3>
        </div>
      </div>

      <div className="charts-grid">
        <section className="panel">
          <div className="panel-head"><h2>Revenue Trend</h2></div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#5B6EEA" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Payment Method Split</h2></div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={paymentPieData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {paymentPieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel panel-full">
          <div className="panel-head"><h2>Top Routes by Revenue</h2></div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={routeRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#7C4DFF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Reports;