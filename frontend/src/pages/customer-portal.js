import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import config from '../../config';
import styles from '../styles/CustomerPortal.module.css';

export default function CustomerPortal() {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [rental, setRental] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    const customerData = localStorage.getItem('customer');
    
    if (!token) {
      router.push('/customer-login');
      return;
    }

    if (customerData) {
      setCustomer(JSON.parse(customerData));
      fetchRentalAndInvoices(token, JSON.parse(customerData).id);
    }
  }, []);

  const fetchRentalAndInvoices = async (token, customerId) => {
    try {
      const rentalResponse = await axios.get(
        `${config.apiUrl}/api/customer/rental/${customerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setRental(rentalResponse.data.rental);
      setInvoices(rentalResponse.data.invoices);
    } catch (err) {
      console.error('Error fetching rental:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customer');
    router.push('/customer-login');
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  const currentInvoice = invoices.length > 0 ? invoices[0] : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Your Storage Account</h1>
        <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
      </header>

      <div className={styles.content}>
        <div className={styles.card}>
          <h2>Unit Information</h2>
          {rental ? (
            <div className={styles.unitInfo}>
              <div className={styles.infoRow}>
                <span className={styles.label}>Unit Number:</span>
                <span className={styles.value}>{rental.unit_number}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Monthly Rate:</span>
                <span className={styles.value}>${Number(rental.monthly_rate).toFixed(2)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Move-In Date:</span>
                <span className={styles.value}>{new Date(rental.start_date).toLocaleDateString()}</span>
              </div>
            </div>
          ) : (
            <p>No active rental found</p>
          )}
        </div>

        <div className={styles.card}>
          <h2>Next Payment Due</h2>
          {currentInvoice ? (
            <div className={styles.invoiceInfo}>
              <div className={styles.infoRow}>
                <span className={styles.label}>Due Date:</span>
                <span className={styles.value}>{new Date(currentInvoice.due_date).toLocaleDateString()}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Amount Due:</span>
                <span className={styles.value} style={{ fontSize: '20px', fontWeight: 'bold', color: '#2d5016' }}>
                  ${Number(currentInvoice.balance).toFixed(2)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Status:</span>
                <span className={`${styles.value} ${styles[currentInvoice.status]}`}>
                  {currentInvoice.status.toUpperCase()}
                </span>
              </div>
              
              {currentInvoice.balance > 0 && (
                <button 
                  className={styles.payBtn}
                  onClick={() => setShowPaymentForm(!showPaymentForm)}
                >
                  {showPaymentForm ? 'Cancel' : 'Pay Now'}
                </button>
              )}
            </div>
          ) : (
            <p>No invoices found</p>
          )}
        </div>

        {showPaymentForm && currentInvoice && (
          <PaymentForm 
            invoiceId={currentInvoice.id}
            amount={currentInvoice.balance}
            token={localStorage.getItem('customerToken')}
            styles={styles}
            onPaymentSuccess={() => {
              setShowPaymentForm(false);
              fetchRentalAndInvoices(localStorage.getItem('customerToken'), customer.id);
            }}
          />
        )}

        <div className={styles.card}>
          <h2>Payment History</h2>
          {invoices.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}</td>
                    <td>{new Date(invoice.due_date).toLocaleDateString()}</td>
                    <td>${Number(invoice.total_amount).toFixed(2)}</td>
                    <td className={styles[invoice.status]}>{invoice.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No payment history</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentForm({ invoiceId, amount, token, styles, onPaymentSuccess }) {
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(
        `${config.apiUrl}/api/customer/pay`,
        {
          invoiceId,
          amount,
          card: { cardNumber, cardExpiry, cardCvc }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Payment successful!');
      onPaymentSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <h2>Make Payment</h2>
      <form onSubmit={handlePayment}>
        <div className={styles.formGroup}>
          <label>Card Number</label>
          <input
            type="text"
            placeholder="4242 4242 4242 4242"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className={styles.formGroup}>
            <label>Expiry (MM/YY)</label>
            <input
              type="text"
              placeholder="12/25"
              value={cardExpiry}
              onChange={(e) => setCardExpiry(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>CVC</label>
            <input
              type="text"
              placeholder="123"
              value={cardCvc}
              onChange={(e) => setCardCvc(e.target.value)}
              required
            />
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.paymentAmount}>
          Amount: ${Number(amount).toFixed(2)}
        </div>

        <button type="submit" disabled={loading} className={styles.payBtn}>
          {loading ? 'Processing...' : 'Complete Payment'}
        </button>
      </form>
    </div>
  );
}
