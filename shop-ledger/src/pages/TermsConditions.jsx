import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, AlertTriangle, ShieldAlert, CheckCircle, Scale, Mail, MapPin } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function TermsConditions() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '2rem 1rem 3rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <div style={{ maxWidth: '800px', width: '100%' }}>
        
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.5rem 0.9rem',
            color: '#475569',
            fontSize: '0.88rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
        >
          <ArrowLeft size={16} /> Back to GI Shop
        </button>

        {/* Main Document Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '2.5rem',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
          color: '#334155',
          lineHeight: '1.7',
          fontSize: '0.95rem'
        }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.5rem' }}>
            <img 
              src={logoImg} 
              alt="GI SHOP Logo" 
              style={{ 
                width: '72px', 
                height: '72px', 
                borderRadius: '16px', 
                objectFit: 'contain',
                margin: '0 auto 0.75rem auto',
                display: 'block',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
              }} 
            />
            <h1 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.4rem 0' }}>
              TERMS AND CONDITIONS
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
              Last updated September 01, 2026
            </p>
          </div>

          {/* Critical Disclaimer Notice */}
          <div style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '1.35rem',
            marginBottom: '2rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start'
          }}>
            <AlertTriangle size={28} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: '800', fontSize: '1rem', color: '#92400e', marginBottom: '0.35rem' }}>
                IMPORTANT: PLATFORM NATURE &amp; DATA RESPONSIBILITY DISCLAIMER
              </div>
              <div style={{ fontSize: '0.88rem', color: '#78350f', lineHeight: '1.5' }}>
                <strong>We are a software platform only.</strong> We provide you with digital tools to record and store your billing, inventory, and ledger records, <strong>but you are solely responsible for your data.</strong> In the event of any data loss, service interruption, or device failure, GI SHOP and its operators are not responsible or liable for any lost data, records, or financial impacts.
              </div>
            </div>
          </div>

          {/* Section 1: Agreement */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              1. AGREEMENT TO TERMS
            </h3>
            <p>
              These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and <strong>GI SHOP</strong> ("we," "us," or "our"), concerning your access to and use of the <a href="https://gi-shop.genziitian.in" style={{ color: '#2563eb' }}>https://gi-shop.genziitian.in</a> website as well as the <strong>GI SHOP: POS &amp; Khata Ledger</strong> mobile application (collectively, the "Platform" or "Services").
            </p>
            <p>
              By accessing or using the Services, you agree that you have read, understood, and agree to be bound by all of these Terms and Conditions. <strong>If you do not agree with all of these terms, you are expressly prohibited from using the Services and must discontinue use immediately.</strong>
            </p>
          </div>

          {/* Section 2: Platform Only Service */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              2. NATURE OF SERVICES (PLATFORM ONLY)
            </h3>
            <p>
              GI SHOP is a technological software utility designed to help small businesses, grocery stores, kirana shops, and individual customers maintain Point of Sale (POS) receipts, digital Khata credit/debit records, product catalogs, and local grocery price discovery.
            </p>
            <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
              <li><strong>No Financial Intermediary:</strong> GI SHOP is strictly a record-keeping and billing calculator tool. We do not act as a bank, payment wallet, escrow service, or financial institution.</li>
              <li><strong>Offline / Cash Settlements:</strong> All physical exchanges of cash, UPI transfers, credit terms, and repayment agreements take place directly between shopkeepers and customers. GI SHOP is not involved in resolving private debt or credit disagreements.</li>
            </ul>
          </div>

          {/* Section 3: Data Loss & Limitation of Liability */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              3. USER DATA RESPONSIBILITY &amp; NO LIABILITY FOR DATA LOSS
            </h3>
            <p>
              <strong>You are solely responsible for all data, transaction records, inventory details, and customer information that you enter into the Platform.</strong>
            </p>
            <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
              <li><strong>No Liability for Data Losses:</strong> Although we implement standard cloud synchronization and database safeguards, <strong>GI SHOP IS NOT RESPONSIBLE FOR ANY DATA LOSSES WHATSOEVER.</strong> This includes data loss caused by server crashes, network outages, unintended overwrites, cyber incidents, device damage, browser cache clearance, or third-party cloud failures.</li>
              <li><strong>Independent Record Keeping:</strong> Store owners and users are strongly advised to keep periodic physical or exported accounting backups for critical financial documentation.</li>
              <li><strong>No Consequential Damages:</strong> In no event shall GI SHOP, its founders, developers, or affiliates be liable to you or any third party for any direct, indirect, consequential, exemplary, incidental, special, or punitive damages, including lost profit, lost revenue, or loss of data arising from your use of the service.</li>
            </ul>
          </div>

          {/* Section 4: User Accounts & PIN Security */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              4. USER REGISTRATION &amp; SECURITY PIN
            </h3>
            <p>
              To access the Platform features, you may be required to register with an email, phone number, password, and a 4-digit Security PIN. You agree to:
            </p>
            <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
              <li>Provide accurate, current, and complete registration information.</li>
              <li>Maintain the confidentiality of your password and 4-digit PIN.</li>
              <li>Accept full responsibility for all activities and transactions recorded under your account.</li>
              <li>Notify us immediately if you suspect any unauthorized access to your account.</li>
            </ul>
          </div>

          {/* Section 5: Acceptable Use */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              5. ACCEPTABLE USE POLICY
            </h3>
            <p>You agree not to access or use the Platform for any purpose other than that for which we make it available. Prohibited activities include:</p>
            <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
              <li>Entering fake, fraudulent, abusive, or unlawful transaction records.</li>
              <li>Attempting to bypass security mechanisms, reverse-engineer, or tamper with the application source code.</li>
              <li>Using automated scripts, bots, or scrapers to extract platform data or catalog information.</li>
              <li>Using the Platform to harass, defraud, or impersonate another business or individual.</li>
            </ul>
          </div>

          {/* Section 6: Account Deletion & Termination */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              6. ACCOUNT DELETION &amp; TERMINATION
            </h3>
            <p>
              You may terminate your account at any time. To submit an account and personal data deletion request, you can visit our dedicated account deletion portal at{' '}
              <a 
                href="/delete" 
                onClick={(e) => { e.preventDefault(); navigate('/delete'); }}
                style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'underline' }}
              >
                https://gi-shop.genziitian.in/delete
              </a>{' '}
              or email us directly at <a href="mailto:pay.laxmikant@gmail.com" style={{ color: '#2563eb' }}>pay.laxmikant@gmail.com</a>. Account deletions are processed within up to 7 days.
            </p>
            <p>
              We reserve the right to suspend, terminate, or restrict access to any account without notice if we believe you have violated these Terms or engaged in unauthorized activity.
            </p>
          </div>

          {/* Section 7: Disclaimer of Warranties */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              7. DISCLAIMER OF WARRANTIES
            </h3>
            <p>
              THE PLATFORM AND SERVICES ARE PROVIDED ON AN "AS-IS" AND "AS-AVAILABLE" BASIS. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE MAKE NO WARRANTIES OR REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF THE PLATFORM'S CONTENT OR DATA CALCULATIONS.
            </p>
          </div>

          {/* Section 8: Changes to Terms */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              8. MODIFICATIONS TO TERMS
            </h3>
            <p>
              We reserve the right to modify, amend, or update these Terms and Conditions at any time. Changes become effective immediately upon posting to this page. Continued use of the Services following any updates constitutes acceptance of the modified Terms.
            </p>
          </div>

          {/* Section 9: Contact Information */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              9. CONTACT INFORMATION
            </h3>
            <p>If you have questions or comments regarding these Terms and Conditions, please contact us at:</p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginTop: '0.5rem' }}>
              <strong>GI SHOP</strong><br />
              PATNA, BIHAR 800001, India<br />
              Email: <a href="mailto:pay.laxmikant@gmail.com" style={{ color: '#2563eb', fontWeight: '600' }}>pay.laxmikant@gmail.com</a>
            </div>
          </div>

          {/* Footer Note */}
          <div style={{ textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '2rem' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.65rem 1.35rem',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
            >
              Return to GI Shop
            </button>
          </div>

        </div>

        {/* Bottom copyright */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.78rem', color: '#94a3b8' }}>
          &copy; {new Date().getFullYear()} GI SHOP • All Rights Reserved
        </div>

      </div>
    </div>
  );
}
