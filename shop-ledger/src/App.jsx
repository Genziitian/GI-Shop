import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Shopkeeper from './pages/Shopkeeper';
import Customer from './pages/Customer';
import SuperManager from './pages/SuperManager';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  if (!token) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(userRole)) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route 
          path="/shop" 
          element={
            <ProtectedRoute allowedRoles={['Shopkeeper', 'Customer']}>
              <Shopkeeper />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/customer" 
          element={
            <ProtectedRoute allowedRoles={['Customer']}>
              <Customer />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['SuperManager']}>
              <SuperManager />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
