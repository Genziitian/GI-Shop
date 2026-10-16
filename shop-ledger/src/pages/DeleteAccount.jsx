import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trash2, 
  Mail, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  ArrowLeft, 
  Copy, 
  Check, 
  AlertCircle, 
  HelpCircle,
  Smartphone,
  Info
} from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function DeleteAccount() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const supportEmail = 'pay.laxmikant@gmail.com';

  const mailSubject = encodeURIComponent('GI Shop - Account Deletion Request');
  const mailBody = encodeURIComponent(
    'Hello GI Shop Support Team,\n\n' +
    'I would like to request the permanent deletion of my GI Shop account and associated data.\n\n' +
    'Account Details:\n' +
    '- Registered Mobile Number: \n' +
    '- Registered Email Address: \n' +
    '- User Short ID (if known): \n' +
    '- Role (Customer / Shopkeeper): \n' +
    '- Reason for Deletion (Optional): \n\n' +
    'Please confirm once the account deletion has been processed within 7 days.\n\n' +
    'Thank you.'
  );

  const mailtoLink = `mailto:${supportEmail}?subject=${mailSubject}&body=${mailBody}`;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#faf7f0',
      padding: '2rem 1rem 3rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Top Container */}
      <div style={{ maxWidth: '640px', width: '100%' }}>
        
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#ffffff',
            border: '1px solid #e8e1d0',
            borderRadius: '8px',
            padding: '0.5rem 0.9rem',
            color: '#4a5148',
            fontSize: '0.88rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f3eee2'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
        >
          <ArrowLeft size={16} /> Back to GI Shop
        </button>

        {/* Main Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e8e1d0',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}>
          
          {/* Header & Logo */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <img 
              src={logoImg} 
              alt="GI SHOP Logo" 
              style={{ 
                width: '76px', 
                height: '76px', 
                borderRadius: '18px', 
                objectFit: 'contain',
                margin: '0 auto 0.75rem auto',
                display: 'block',
                boxShadow: '0 4px 12px rgba(15, 122, 67, 0.15)'
              }} 
            />
            <h1 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '800', 
              color: '#12201a', 
              margin: '0 0 0.4rem 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <Trash2 size={22} color="#dc2626" />
              Account Deletion Request
            </h1>
            <p style={{ 
              fontSize: '0.92rem', 
              color: '#666c60', 
              margin: 0,
              lineHeight: '1.4'
            }}>
              GI SHOP • Data & Account Removal Portal
            </p>
          </div>

          {/* Reassurance Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #e9f6ee 0%, #eef8f1 100%)',
            border: '1px solid #bfe3cb',
            borderRadius: '12px',
            padding: '1.2rem',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.85rem',
            alignItems: 'flex-start'
          }}>
            <ShieldCheck size={26} color="#0f7a43" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.98rem', color: '#1e3a8a', marginBottom: '0.35rem' }}>
                Sorry to hear you want to delete your account
              </div>
              <div style={{ fontSize: '0.88rem', color: '#343c35', lineHeight: '1.5' }}>
                Let us assure you that everything is okay and your personal data & transactions are always treated with utmost privacy and security. If you are experiencing any issue, store difficulty, or billing question, our team is always ready to assist you.
              </div>
            </div>
          </div>

          {/* How to Delete Box */}
          <div style={{
            background: '#fff',
            border: '1px solid #e8e1d0',
            borderRadius: '12px',
            padding: '1.35rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ 
              fontSize: '1.05rem', 
              fontWeight: '700', 
              color: '#12201a', 
              margin: '0 0 0.6rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}>
              <Mail size={18} color="#0f7a43" /> If you still want to delete your account
            </h3>
            
            <p style={{ fontSize: '0.9rem', color: '#4a5148', lineHeight: '1.5', margin: '0 0 1rem 0' }}>
              Please send an account deletion request directly to our administrator email:
            </p>

            {/* Email Highlight Box */}
            <div style={{
              background: '#faf7f0',
              border: '1px dashed #d5ccb6',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1.1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#666c60', fontWeight: '500' }}>Email:</span>
                <strong style={{ fontSize: '0.98rem', color: '#12201a', fontFamily: 'monospace' }}>
                  {supportEmail}
                </strong>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleCopyEmail}
                  style={{
                    background: copied ? '#1f9d5a' : '#ffffff',
                    color: copied ? '#ffffff' : '#343c35',
                    border: '1px solid #d5ccb6',
                    borderRadius: '6px',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Email'}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <a
                href={mailtoLink}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  background: '#0f7a43',
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.25rem',
                  fontWeight: '600',
                  fontSize: '0.92rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 6px rgba(15, 122, 67, 0.25)',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#0b5e33'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#0f7a43'}
              >
                <Mail size={16} /> Send Deletion Email
              </a>
            </div>
          </div>

          {/* Timeline & Steps */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Timeline Card */}
            <div style={{
              background: '#fff8e6',
              border: '1px solid #fdf0cf',
              borderRadius: '10px',
              padding: '1rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start'
            }}>
              <Clock size={22} color="#d98a0b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#92400e', marginBottom: '0.25rem' }}>
                  Processing Timeline
                </div>
                <div style={{ fontSize: '0.82rem', color: '#78350f', lineHeight: '1.4' }}>
                  We take <strong>up to 7 days</strong> to verify and permanently delete your account from our records.
                </div>
              </div>
            </div>

            {/* Verification Card */}
            <div style={{
              background: '#faf7f0',
              border: '1px solid #e8e1d0',
              borderRadius: '10px',
              padding: '1rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start'
            }}>
              <Smartphone size={22} color="#4a5148" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1b2a22', marginBottom: '0.25rem' }}>
                  What to Include in Email
                </div>
                <div style={{ fontSize: '0.82rem', color: '#4a5148', lineHeight: '1.4' }}>
                  Include your <strong>Registered Phone Number</strong>, <strong>Email</strong>, or <strong>Short ID</strong> so we can locate your account.
                </div>
              </div>
            </div>
          </div>

          {/* Data Deletion Details */}
          <div style={{
            borderTop: '1px solid #f3eee2',
            paddingTop: '1.25rem',
            marginBottom: '1.25rem'
          }}>
            <h4 style={{ 
              fontSize: '0.92rem', 
              fontWeight: '700', 
              color: '#343c35', 
              margin: '0 0 0.5rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <Info size={16} color="#666c60" /> What happens upon deletion?
            </h4>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '1.2rem', 
              fontSize: '0.84rem', 
              color: '#666c60', 
              lineHeight: '1.6' 
            }}>
              <li>All personal profile information (name, phone number, address, and password) will be permanently erased.</li>
              <li>Active sessions and device push notification tokens will be invalidated immediately.</li>
              <li>If you are a shop owner, your shop listing, catalog items, and staff connections will be permanently removed.</li>
              <li>Please settle all pending credit/khata balances with respective stores or customers prior to requesting deletion.</li>
            </ul>
          </div>

          {/* Footer Note */}
          <div style={{ 
            textAlign: 'center', 
            borderTop: '1px solid #e8e1d0', 
            paddingTop: '1.25rem',
            color: '#666c60',
            fontSize: '0.85rem'
          }}>
            <p style={{ margin: '0 0 0.75rem 0', fontWeight: '500' }}>
              Thanks for being a part of GI SHOP!
            </p>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'transparent',
                border: '1px solid #d5ccb6',
                borderRadius: '6px',
                padding: '0.45rem 1rem',
                fontSize: '0.82rem',
                fontWeight: '600',
                color: '#0f7a43',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#faf7f0'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Return to GI Shop Home
            </button>
          </div>

        </div>

        {/* Bottom copyright */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.78rem', color: '#a0a294' }}>
          &copy; {new Date().getFullYear()} GI SHOP • All Rights Reserved
        </div>

      </div>
    </div>
  );
}
