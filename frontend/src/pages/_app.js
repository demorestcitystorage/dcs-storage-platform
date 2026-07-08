import '../styles/globals.css';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      setIsAuthenticated(true);
    } else {
      if (router.pathname !== '/login' && router.pathname !== '/') {
        router.push('/login');
      }
    }
    
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <Component {...pageProps} />;
}
