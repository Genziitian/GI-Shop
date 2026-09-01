import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, UserCircle } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <div className="glass-panel" style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        <img 
          src={logoImg} 
          alt="GI SHOP Logo" 
          style={{ width: '80px', height: '80px', borderRadius: '18px', objectFit: 'contain', margin: '0 auto 1rem auto', display: 'block', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
        />
        <h1 className="title">GI SHOP</h1>
        <p className="subtitle">Smart Billing, Khata, Orders & Grocery Discovery</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button className="btn" onClick={() => navigate('/shop')} style={{ padding: '1rem' }}>
            <Store size={24} />
            I am a Shopkeeper
          </button>
          
          <button className="btn btn-outline" onClick={() => navigate('/customer')} style={{ padding: '1rem' }}>
            <UserCircle size={24} />
            I am a Customer
          </button>
        </div>
      </div>
    </div>
  );
}
