const config = {
  development: {
    apiUrl: 'http://localhost:5000'
  },
  production: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://your-backend-url.com'
  }
};

const env = process.env.NODE_ENV || 'development';
export default config[env];
