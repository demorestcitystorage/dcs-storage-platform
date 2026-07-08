import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import styles from '../styles/AdminReports.module.css';

export default function AdminReports() {
  const router = useRouter();
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [pastDue, setPastDue] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchFacilities(token);
  }, []);

  useEffect(() => {
    if (selectedFacility) {
      const token = localStorage.getItem('authToken');
      fetchReports(token);
    }
  }, [selectedFacility, selectedMonth, selectedYear]);

  const fetchFacilities = async (token) => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/facilities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFacilities(response.data);
      if (response.data.length > 0) {
        setSelectedFacility(response.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching facilities:', err);
    }
  };

  const fetchReports = async (token) => {
    setLoading(true);
    try {
      const pastDueResponse = await axios.get('http://localhost:5000/api/admin/reports/past-due', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPastDue(pastDueResponse.data);

      const revenueResponse = await axios.get('http://localhost:5000/api/admin/reports/revenue', {
        params: { facilityId: selectedFacility, month: selectedMonth, year: selectedYear },
        headers: { Authorization: `Bearer ${token}` }
      });
      setRevenue(revenueResponse.data);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/login');
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const currentFacility = facilities.find(f => f.id === selectedFacility);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Reports</h1>
        <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
      </header>

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label>Facility</label>
          <select value={selectedFacility || ''} onChange={(e) => setSelectedFacility(e.target.value)}>
            {facilities.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.controlGroup}>
          <label>Month</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.controlGroup}>
          <label>Year</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading reports...</div>
      ) : (
        <div className={styles.content}>
          <div className={styles.card}>
            <h2>Revenue Report</h2>
            {revenue ? (
              <div className={styles.reportData}>
                <div className={styles.metricRow}>
                  <span className={styles.label}>Facility</span>
                  <span className={styles.value}>{revenue.facility_name}</span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.label}>Total Invoices</span>
                  <span className={styles.value}>{revenue.invoice_count}</span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.label}>Expected Revenue</span>
                  <span className={styles.value}>${Number(revenue.expected_revenue || 0).toFixed(2)}</span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.label}>Actual Collected</span>
                  <span className={styles.value}>${Number(revenue.actual_collected || 0).toFixed(2)}</span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.label}>Collection Rate</span>
                  <span className={styles.value}>{Number(revenue.collection_rate || 0).toFixed(1)}%</span>
                </div>
              </div>
            ) : (
              <p>No revenue data available</p>
            )}
          </div>

          <div className={styles.card}>
            <h2>Past Due Invoices</h2>
            {pastDue.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Unit</th>
                    <th>Facility</th>
                    <th>Days Overdue</th>
                    <th>Amount Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastDue.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.first_name} {invoice.last_name}</td>
                      <td>{invoice.unit_number}</td>
                      <td>{invoice.facility_name}</td>
                      <td>{Math.floor(invoice.days_overdue)}</td>
                      <td>${Number(invoice.balance).toFixed(2)}</td>
                      <td className={styles[invoice.status]}>{invoice.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No past due invoices</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
