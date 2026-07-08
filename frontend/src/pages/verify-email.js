import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import styles from '../styles/VerifyEmail.module.css';

export default function VerifyEmail() {
  const router = useRouter();
  const { token, customerId } = router.query;
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token && customerId) {
      verifyEmail();
    }
  }, [token, customerId]);

  const verifyEmail = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/verify-email', {
        token,
        customerId
      });
      setSuccess(true);
      setError('');
      
      setTimeout(() => {
        router.push('/customer-login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        {loading && (
          <>
            <div className={styles.spinner}></div>
            <p>Verifying your email...</p>
          </>
        )}

        {success && !loading && (
          <>
            <div className={styles.success}>✓</div>
            <h2>Email Verified!</h2>
            <p>Your email has been verified successfully.</p>
            <p className={styles.redirect}>Redirecting to login...</p>
          </>
        )}

        {error && !loading && (
          <>
            <div className={styles.error}>✗</div>
            <h2>Verification Failed</h2>
            <p>{error}</p>
            <a href="/customer-login">Back to Login</a>
          </>
        )}
      </div>
    </div>
  );
}
