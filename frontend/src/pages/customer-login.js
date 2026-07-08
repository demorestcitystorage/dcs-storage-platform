import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import config from '../../config';
import styles from '../styles/CustomerLogin.module.css';

export default function CustomerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${config.apiUrl}/api/auth/login`, {
        email,
        password
      });

      localStorage.setItem('customerToken', response.data.token);
      localStorage.setItem('customer', JSON.stringify(response.data.user));
      
      router.push('/customer-portal');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <h1>Customer Portal</h1>
        <p className={styles.subtitle}>Manage your storage unit and make payments</p>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
