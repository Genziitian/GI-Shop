import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Mail, MapPin, ExternalLink } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function PrivacyPolicy() {
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
              PRIVACY POLICY
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
              Last updated September 01, 2026
            </p>
          </div>

          {/* Intro Section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p>
              This Privacy Notice for <strong>GI SHOP</strong> ("we," "us," or "our"), describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you:
            </p>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
              <li>Visit our website at <a href="https://gi-shop.genziitian.in/" style={{ color: '#2563eb', textDecoration: 'underline' }}>https://gi-shop.genziitian.in/</a> or any website of ours that links to this Privacy Notice</li>
              <li>Download and use our mobile application (GI SHOP: POS &amp; Khata Ledger), or any other application of ours that links to this Privacy Notice</li>
              <li>
                Use Fast POS billing, customer Khata credit ledger &amp; inventory manager for shops.. GI SHOP is a modern, ultra-fast Point of Sale (POS) billing, inventory management, and digital Khata (customer credit/debit ledger) application designed for grocery stores, kirana shops, retail outlets, and small businesses. Streamline your daily checkout, record udhar/credit transactions, manage stock, and give your customers instant access to itemized digital receipts. 
                <br /><br />
                <strong>━━━━━━━━━━━━━━━━━━━━━ 🌟 KEY FEATURES FOR SHOPKEEPERS ━━━━━━━━━━━━━━━━━━━━━</strong><br />
                ⚡ HIGH-SPEED POS BILLING: • Quick-touch product grid and instant barcode/text search. • Smart Unit Conversion: Effortlessly sell by Piece, Kilogram (kg/g), or Litre (L/ml). • Bidirectional Price Calculation: Enter quantity or enter rupees directly (e.g., ₹30 worth of ₹60/kg automatically computes 0.5 kg). • Instant discounts, taxes, and multi-channel checkout: Cash, Online (UPI/Card), and Add to Book (Khata).<br />
                📖 DIGITAL KHATA (UDHAR / CREDIT LEDGER): • Complete customer credit and repayment ledger. • Real-time outstanding balances and automatic total dues calculations. • Quick payment settlements (Full or Partial repayments). • Full chronological debit/credit transaction history with audit timestamps.<br />
                📦 INVENTORY &amp; PRODUCT MANAGEMENT: • Real-time stock and catalog management with unit rates. • Add, update, and manage categories and prices with one tap.<br />
                🧾 PRINTABLE DIGITAL RECEIPTS: • Generate professional itemized bills with shop name, timestamp, and payment method breakdown.<br /><br />
                <strong>━━━━━━━━━━━━━━━━━━━━━ 👤 FOR CUSTOMERS ━━━━━━━━━━━━━━━━━━━━━</strong><br />
                • Purchase History: View all past bills and itemized receipts across registered shops.<br />
                • Khata Transparency: Check your outstanding balance and repayment history anytime.<br /><br />
                <strong>━━━━━━━━━━━━━━━━━━━━━ 🔒 SECURITY &amp; PRIVACY ━━━━━━━━━━━━━━━━━━━━━</strong><br />
                • Secure cloud synchronization with encrypted data transmission.<br />
                • Reliable PIN lock protection to safeguard business records.<br />
                Simplify your shop billing and customer ledger today with GI SHOP!
              </li>
              <li>Engage with us in other related ways, including any marketing or events</li>
            </ul>
            <p>
              <strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy rights and choices. We are responsible for making decisions about how your personal information is processed. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at <a href="mailto:pay.laxmikant@gmail.com" style={{ color: '#2563eb', fontWeight: '600' }}>pay.laxmikant@gmail.com</a>.
            </p>
          </div>

          {/* SUMMARY OF KEY POINTS */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.35rem', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: '0 0 0.85rem 0' }}>
              SUMMARY OF KEY POINTS
            </h2>
            <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              <em>This summary provides key points from our Privacy Notice, but you can find out more details about any of these topics by clicking the link following each key point or by using our table of contents below to find the section you are looking for.</em>
            </p>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use.</li>
              <li><strong>Do we process any sensitive personal information?</strong> Some of the information may be considered "special" or "sensitive" in certain jurisdictions, for example your racial or ethnic origins, sexual orientation, and religious beliefs. We do not process sensitive personal information.</li>
              <li><strong>Do we collect any information from third parties?</strong> We do not collect any information from third parties.</li>
              <li><strong>How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent. We process your information only when we have a valid legal reason to do so.</li>
              <li><strong>In what situations and with which parties do we share personal information?</strong> We may share information in specific situations and with specific third parties.</li>
              <li><strong>How do we keep your information safe?</strong> We have adequate organizational and technical processes and procedures in place to protect your personal information. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information.</li>
              <li><strong>What are your rights?</strong> Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information.</li>
              <li><strong>How do you exercise your rights?</strong> The easiest way to exercise your rights is by visiting <a href="/delete" onClick={(e) => { e.preventDefault(); navigate('/delete'); }} style={{ color: '#2563eb', textDecoration: 'underline' }}>https://gi-shop.genziitian.in/delete</a>, or by contacting us. We will consider and act upon any request in accordance with applicable data protection laws.</li>
              <li><strong>Want to learn more about what we do with any information we collect?</strong> Review the Privacy Notice in full below.</li>
            </ul>
          </div>

          {/* TABLE OF CONTENTS */}
          <div style={{ marginBottom: '2rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: '0 0 0.75rem 0' }}>
              TABLE OF CONTENTS
            </h3>
            <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem', color: '#2563eb' }}>
              <li><a href="#section-1" style={{ color: '#2563eb', textDecoration: 'none' }}>1. WHAT INFORMATION DO WE COLLECT?</a></li>
              <li><a href="#section-2" style={{ color: '#2563eb', textDecoration: 'none' }}>2. HOW DO WE PROCESS YOUR INFORMATION?</a></li>
              <li><a href="#section-3" style={{ color: '#2563eb', textDecoration: 'none' }}>3. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</a></li>
              <li><a href="#section-4" style={{ color: '#2563eb', textDecoration: 'none' }}>4. HOW DO WE HANDLE YOUR SOCIAL LOGINS?</a></li>
              <li><a href="#section-5" style={{ color: '#2563eb', textDecoration: 'none' }}>5. HOW LONG DO WE KEEP YOUR INFORMATION?</a></li>
              <li><a href="#section-6" style={{ color: '#2563eb', textDecoration: 'none' }}>6. HOW DO WE KEEP YOUR INFORMATION SAFE?</a></li>
              <li><a href="#section-7" style={{ color: '#2563eb', textDecoration: 'none' }}>7. DO WE COLLECT INFORMATION FROM MINORS?</a></li>
              <li><a href="#section-8" style={{ color: '#2563eb', textDecoration: 'none' }}>8. WHAT ARE YOUR PRIVACY RIGHTS?</a></li>
              <li><a href="#section-9" style={{ color: '#2563eb', textDecoration: 'none' }}>9. CONTROLS FOR DO-NOT-TRACK FEATURES</a></li>
              <li><a href="#section-10" style={{ color: '#2563eb', textDecoration: 'none' }}>10. WE ARE NOT RESPONSIBLE FOR ANY DATA LOSSES</a></li>
              <li><a href="#section-11" style={{ color: '#2563eb', textDecoration: 'none' }}>11. DO WE MAKE UPDATES TO THIS NOTICE?</a></li>
              <li><a href="#section-12" style={{ color: '#2563eb', textDecoration: 'none' }}>12. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a></li>
              <li><a href="#section-13" style={{ color: '#2563eb', textDecoration: 'none' }}>13. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</a></li>
            </ol>
          </div>

          {/* SECTION 1 */}
          <div id="section-1" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              1. WHAT INFORMATION DO WE COLLECT?
            </h3>
            <p><strong>Personal information you disclose to us</strong></p>
            <p><em><strong>In Short:</strong> We collect personal information that you provide to us.</em></p>
            <p>
              We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.
            </p>
            <p>
              <strong>Personal Information Provided by You.</strong> The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make, and the products and features you use. The personal information we collect may include the following:
            </p>
            <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
              <li>names</li>
              <li>phone numbers</li>
              <li>mailing addresses</li>
              <li>email addresses</li>
              <li>usernames</li>
              <li>passwords</li>
              <li>contact or authentication data</li>
              <li>contact preferences</li>
              <li>billing addresses</li>
            </ul>
            <p><strong>Sensitive Information.</strong> We do not process sensitive information.</p>
            <p>
              <strong>Social Media Login Data.</strong> We may provide you with the option to register with us using your existing social media account details, like your Facebook, X, or other social media account. If you choose to register in this way, we will collect certain profile information about you from the social media provider, as described in the section called "HOW DO WE HANDLE YOUR SOCIAL LOGINS?" below.
            </p>
            <p>
              <strong>Application Data.</strong> If you use our application(s), we also may collect the following information if you choose to provide us with access or permission:
            </p>
            <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
              <li><strong>Mobile Device Access.</strong> We may request access or permission to certain features from your mobile device, including your mobile device's contacts, and other features. If you wish to change our access or permissions, you may do so in your device's settings.</li>
              <li><strong>Push Notifications.</strong> We may request to send you push notifications regarding your account or certain features of the application(s). If you wish to opt out from receiving these types of communications, you may turn them off in your device's settings.</li>
            </ul>
            <p>
              This information is primarily needed to maintain the security and operation of our application(s), for troubleshooting, and for our internal analytics and reporting purposes.
            </p>
            <p>
              All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.
            </p>
            <p>
              <strong>Google API:</strong> Our use of information received from Google APIs will adhere to Google API Services User Data Policy, including the Limited Use requirements.
            </p>
          </div>

          {/* SECTION 2 */}
          <div id="section-2" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              2. HOW DO WE PROCESS YOUR INFORMATION?
            </h3>
            <p><em><strong>In Short:</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent.</em></p>
            <p>
              We process your personal information for a variety of reasons, depending on how you interact with our Services, including:
            </p>
            <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
              <li><strong>To facilitate account creation and authentication and otherwise manage user accounts.</strong> We may process your information so you can create and log in to your account, as well as keep your account in working order.</li>
              <li><strong>To deliver and facilitate delivery of services to the user.</strong> We may process your information to provide you with the requested service.</li>
            </ul>
          </div>

          {/* SECTION 3 */}
          <div id="section-3" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              3. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?
            </h3>
            <p><em><strong>In Short:</strong> We may share information in specific situations described in this section and/or with the following third parties.</em></p>
            <p>We may need to share your personal information in the following situations:</p>
            <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
              <li><strong>Business Transfers.</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
            </ul>
          </div>

          {/* SECTION 4 */}
          <div id="section-4" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              4. HOW DO WE HANDLE YOUR SOCIAL LOGINS?
            </h3>
            <p><em><strong>In Short:</strong> If you choose to register or log in to our Services using a social media account, we may have access to certain information about you.</em></p>
            <p>
              Our Services offer you the ability to register and log in using your third-party social media account details (like your Facebook or X logins). Where you choose to do this, we will receive certain profile information about you from your social media provider. The profile information we receive may vary depending on the social media provider concerned, but will often include your name, email address, friends list, and profile picture, as well as other information you choose to make public on such a social media platform.
            </p>
            <p>
              We will use the information we receive only for the purposes that are described in this Privacy Notice or that are otherwise made clear to you on the relevant Services. Please note that we do not control, and are not responsible for, other uses of your personal information by your third-party social media provider. We recommend that you review their privacy notice to understand how they collect, use, and share your personal information, and how you can set your privacy preferences on their sites and apps.
            </p>
          </div>

          {/* SECTION 5 */}
          <div id="section-5" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              5. HOW LONG DO WE KEEP YOUR INFORMATION?
            </h3>
            <p><em><strong>In Short:</strong> We keep your information for as long as necessary to fulfill the purposes outlined in this Privacy Notice unless otherwise required by law.</em></p>
            <p>
              We will only keep your personal information for as long as it is necessary for the purposes set out in this Privacy Notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements). No purpose in this notice will require us keeping your personal information for longer than the period of time in which users have an account with us.
            </p>
            <p>
              When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.
            </p>
          </div>

          {/* SECTION 6 */}
          <div id="section-6" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              6. HOW DO WE KEEP YOUR INFORMATION SAFE?
            </h3>
            <p><em><strong>In Short:</strong> We aim to protect your personal information through a system of organizational and technical security measures.</em></p>
            <p>
              We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Although we will do our best to protect your personal information, transmission of personal information to and from our Services is at your own risk. You should only access the Services within a secure environment.
            </p>
          </div>

          {/* SECTION 7 */}
          <div id="section-7" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              7. DO WE COLLECT INFORMATION FROM MINORS?
            </h3>
            <p><em><strong>In Short:</strong> We do not knowingly collect data from or market to children under 18 years of age.</em></p>
            <p>
              We do not knowingly collect, solicit data from, or market to children under 18 years of age, nor do we knowingly sell such personal information. By using the Services, you represent that you are at least 18 or that you are the parent or guardian of such a minor and consent to such minor dependent’s use of the Services. If we learn that personal information from users less than 18 years of age has been collected, we will deactivate the account and take reasonable measures to promptly delete such data from our records. If you become aware of any data we may have collected from children under age 18, please contact us at <a href="mailto:pay.laxmikant@gmail.com" style={{ color: '#2563eb' }}>pay.laxmikant@gmail.com</a>.
            </p>
          </div>

          {/* SECTION 8 */}
          <div id="section-8" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              8. WHAT ARE YOUR PRIVACY RIGHTS?
            </h3>
            <p><em><strong>In Short:</strong> You may review, change, or terminate your account at any time, depending on your country, province, or state of residence.</em></p>
            <p>
              <strong>Withdrawing your consent:</strong> If we are relying on your consent to process your personal information, which may be express and/or implied consent depending on the applicable law, you have the right to withdraw your consent at any time. You can withdraw your consent at any time by contacting us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" below.
            </p>
            <p>
              However, please note that this will not affect the lawfulness of the processing before its withdrawal nor, when applicable law allows, will it affect the processing of your personal information conducted in reliance on lawful processing grounds other than consent.
            </p>
            <p><strong>Account Information</strong></p>
            <p>If you would at any time like to review or change the information in your account or terminate your account, you can:</p>
            <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
              <li>Log in to your account settings and update your user account.</li>
              <li>Contact us using the contact information provided.</li>
            </ul>
            <p>
              Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our legal terms and/or comply with applicable legal requirements.
            </p>
            <p>
              If you have questions or comments about your privacy rights, you may email us at <a href="mailto:pay.laxmikant@gmail.com" style={{ color: '#2563eb' }}>pay.laxmikant@gmail.com</a>.
            </p>
          </div>

          {/* SECTION 9 */}
          <div id="section-9" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              9. CONTROLS FOR DO-NOT-TRACK FEATURES
            </h3>
            <p>
              Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage, no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this Privacy Notice.
            </p>
          </div>

          {/* SECTION 10 */}
          <div id="section-10" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              10. WE ARE NOT RESPONSIBLE FOR ANY DATA LOSSES
            </h3>
            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '1rem', color: '#78350f', fontWeight: '500' }}>
              Hey , we provide the service but we are not responsible for data losses anyhow
            </div>
          </div>

          {/* SECTION 11 */}
          <div id="section-11" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              11. DO WE MAKE UPDATES TO THIS NOTICE?
            </h3>
            <p><em><strong>In Short:</strong> Yes, we will update this notice as necessary to stay compliant with relevant laws.</em></p>
            <p>
              We may update this Privacy Notice from time to time. The updated version will be indicated by an updated "Revised" date at the top of this Privacy Notice. If we make material changes to this Privacy Notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this Privacy Notice frequently to be informed of how we are protecting your information.
            </p>
          </div>

          {/* SECTION 12 */}
          <div id="section-12" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              12. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?
            </h3>
            <p>If you have questions or comments about this notice, you may email us at <a href="mailto:pay.laxmikant@gmail.com" style={{ color: '#2563eb', fontWeight: '600' }}>pay.laxmikant@gmail.com</a> or contact us by post at:</p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginTop: '0.5rem' }}>
              <strong>GI SHOP</strong><br />
              PATNA<br />
              PATNA, BIHAR 800001<br />
              India
            </div>
          </div>

          {/* SECTION 13 */}
          <div id="section-13" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              13. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?
            </h3>
            <p>
              Based on the applicable laws of your country, you may have the right to request access to the personal information we collect from you, details about how we have processed it, correct inaccuracies, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law. To request to review, update, or delete your personal information, please visit:{' '}
              <a 
                href="/delete" 
                onClick={(e) => { e.preventDefault(); navigate('/delete'); }}
                style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'underline' }}
              >
                https://gi-shop.genziitian.in/delete
              </a>.
            </p>
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
