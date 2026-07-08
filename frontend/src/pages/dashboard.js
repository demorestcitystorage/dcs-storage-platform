import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import config from '../../config';
import styles from '../styles/Dashboard.module.css';

export default function Dashboard() {
  const router = useRouter();
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchFacilities(token);
  }, []);

  const fetchFacilities = async (token) => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/admin/facilities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFacilities(response.data);
      if (response.data.length > 0) {
        setSelectedFacility(response.data[0].id);
        fetchUnits(response.data[0].id, token);
      }
    } catch (err) {
      console.error('Error fetching facilities:', err);
    }
  };

  const fetchUnits = async (facilityId, token) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${config.apiUrl}/api/admin/facilities/${facilityId}/units`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setUnits(response.data);
    } catch (err) {
      console.error('Error fetching units:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFacilityChange = (facilityId) => {
    const token = localStorage.getItem('authToken');
    setSelectedFacility(facilityId);
    fetchUnits(facilityId, token);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getStatusColor = (status) => {
    const colors = {
      available: '#4CAF50',
      rented: '#2196F3',
      locked_out: '#F44336',
      moving_out: '#FF9800',
      reserved: '#9C27B0'
    };
    return colors[status] || '#666';
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Admin Dashboard</h1>
        <div className={styles.userInfo}>
          {user && <span>Welcome, {user.name}</span>}
          <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      <div className={styles.content}>
        <aside className={styles.sidebar}>
          <h2>Facilities</h2>
          {facilities.map((facility) => (
            <button
              key={facility.id}
              className={`${styles.facilityBtn} ${selectedFacility === facility.id ? styles.active : ''}`}
              onClick={() => handleFacilityChange(facility.id)}
            >
              {facility.name}
            </button>
          ))}
        </aside>

        <main className={styles.main}>
          <h2>Site Map</h2>
          
          {loading ? (
            <p>Loading units...</p>
          ) : (
            <div className={styles.unitGrid}>
              {units.map((unit) => (
                <div
                  key={unit.id}
                  className={styles.unit}
                  style={{ backgroundColor: getStatusColor(unit.status) }}
                >
                  <div className={styles.unitNumber}>{unit.unit_number}</div>
                  <div className={styles.unitSize}>{unit.status}</div>
                  {unit.first_name && (
                    <div className={styles.tenant}>
                      {unit.first_name} {unit.last_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
