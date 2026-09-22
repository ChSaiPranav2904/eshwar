/* eslint-disable react-refresh/only-export-components, react-hooks/purity, react-hooks/set-state-in-effect */
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const user = useMemo(() => {
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      const currentTime = Date.now() / 1000;
      if (decodedPayload.exp < currentTime) {
        return null;
      }
      return {
        username: decodedPayload.sub,
        email: decodedPayload.sub,
        name: decodedPayload.name || decodedPayload.sub,
        userId: decodedPayload.userId,
        role: decodedPayload.role || ''
      };
    } catch (e) {
      console.error('Invalid token', e);
      return null;
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      try {
        const payload = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payload));
        const currentTime = Date.now() / 1000;
        if (decodedPayload.exp < currentTime) {
          logout();
          toast.error('Session expired');
        }
      } catch (e) {
        console.error('Invalid token', e);
        logout();
      }
    }
  }, [token]);

  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const isAdmin = user?.role === 'ROLE_ADMIN';

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
