import React, { createContext, useContext, useState, useEffect } from 'react';

export const translations = {
  en: {
    // Navigation
    'nav.shops': 'Shops',
    'nav.compare': 'Compare',
    'nav.khata': 'My Khata',
    'nav.orders': 'Orders',
    'nav.more': 'More',
    'nav.pos': 'Billing (POS)',
    'nav.items': 'Catalog',
    'nav.staff': 'Staff',
    'nav.analytics': 'Analytics',

    // Common Actions & Labels
    'common.save': 'Save Changes',
    'common.saving': 'Saving...',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.remove': 'Remove',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.total': 'Total',
    'common.logout': 'Log Out',
    'common.back': 'Back',
    'common.apply': 'Apply',
    'common.confirm': 'Confirm',
    'common.active': 'Active',
    'common.status': 'Status',
    'common.phone': 'Mobile Phone',
    'common.city': 'City',
    'common.address': 'Address',
    'common.name': 'Name',
    'common.support': 'Help & Support',

    // More Tab & Account
    'more.title': 'Account & Settings',
    'more.subtitle': 'Manage your language, profile details, security PIN, and account settings',
    'more.langCardTitle': 'Choose Language / भाषा चुनें',
    'more.langCardSubtitle': 'Select your preferred language for the application',
    'more.english': 'English',
    'more.hindi': 'हिंदी (Hindi)',
    'more.profileOverview': 'Profile Overview',
    'more.securityLock': 'Security & Lock',
    'more.changePassword': 'Change Account Password',
    'more.legalPrivacy': 'Legal & Policies',
    'more.privacyPolicy': 'Privacy Policy',
    'more.termsConditions': 'Terms & Conditions',
    'more.deleteAccount': 'Delete Account Request',
    'more.storeTitle': 'Store Operations & Settings',
    'more.storeSubtitle': 'Manage store profile, operation hours, staff & language',
    'more.storeStatus': 'Store Status',
    'more.shopOpen': '🟢 Shop is OPEN',
    'more.shopClosed': '🔴 Shop is CLOSED',
    'more.openShopBtn': 'Open Shop',
    'more.closeShopBtn': 'Close Shop',
    'more.editStoreProfile': 'Edit Store Profile',
    'more.shortId': 'Short ID',

    // Customer Specific
    'customer.searchPlaceholder': 'Search products, brands or shops...',
    'customer.nearYou': 'Verified Local Stores Near You',
    'customer.viewStore': 'Visit Store',
    'customer.addToCart': 'Add to Cart',
    'customer.checkout': 'Proceed to Checkout',
    'customer.emptyCart': 'Your cart is empty',
    'customer.orderHistory': 'Your Order History',
    'customer.khataTitle': 'Customer Khata (Digital Udhar Ledger)',

    // Shopkeeper Specific
    'shop.newSale': 'Quick Sale / POS Billing',
    'shop.pendingOrders': 'Incoming Online Orders',
    'shop.catalogManagement': 'Store Inventory & Products',
    'shop.staffManagement': 'Cashiers & Store Staff',
    'shop.analyticsTitle': 'Daily Sales & Revenue Analytics',
  },
  hi: {
    // Navigation
    'nav.shops': 'दुकानें',
    'nav.compare': 'मूल्य तुलना',
    'nav.khata': 'मेरा खाता',
    'nav.orders': 'ऑर्डर्स',
    'nav.more': 'अधिक (More)',
    'nav.pos': 'बिलिंग (POS)',
    'nav.items': 'उत्पाद सूची',
    'nav.staff': 'कर्मचारी',
    'nav.analytics': 'बिक्री रिपोर्ट',

    // Common Actions & Labels
    'common.save': 'बदलाव सहेजें',
    'common.saving': 'सहेज रहे हैं...',
    'common.cancel': 'रद्द करें',
    'common.close': 'बंद करें',
    'common.edit': 'संपादित करें',
    'common.delete': 'हटाएं',
    'common.remove': 'हटाएं',
    'common.search': 'खोजें',
    'common.loading': 'लोड हो रहा है...',
    'common.total': 'कुल राशि',
    'common.logout': 'लॉग आउट',
    'common.back': 'वापस जाएं',
    'common.apply': 'लागू करें',
    'common.confirm': 'पुष्टि करें',
    'common.active': 'सक्रिय',
    'common.status': 'स्थिति',
    'common.phone': 'मोबाइल नंबर',
    'common.city': 'शहर',
    'common.address': 'पता',
    'common.name': 'नाम',
    'common.support': 'मदद व सहायता',

    // More Tab & Account
    'more.title': 'खाता और सेटिंग्स',
    'more.subtitle': 'अपनी पसंदीदा भाषा, प्रोफ़ाइल विवरण, सुरक्षा पिन और खाता सेटिंग्स प्रबंधित करें',
    'more.langCardTitle': 'Choose Language / भाषा चुनें',
    'more.langCardSubtitle': 'एप्लिकेशन के लिए अपनी पसंदीदा भाषा चुनें',
    'more.english': 'English',
    'more.hindi': 'हिंदी (Hindi)',
    'more.profileOverview': 'प्रोफ़ाइल विवरण',
    'more.securityLock': 'सुरक्षा और लॉक',
    'more.changePassword': 'अकाउंट पासवर्ड बदलें',
    'more.legalPrivacy': 'कानूनी व नीतियां',
    'more.privacyPolicy': 'गोपनीयता नीति (Privacy Policy)',
    'more.termsConditions': 'नियम व शर्तें (Terms)',
    'more.deleteAccount': 'खाता हटाने का अनुरोध',
    'more.storeTitle': 'दुकान संचालन और सेटिंग्स',
    'more.storeSubtitle': 'दुकान विवरण, संचालन समय, कर्मचारी और भाषा सेटिंग्स',
    'more.storeStatus': 'दुकान की स्थिति',
    'more.shopOpen': '🟢 दुकान खुली है',
    'more.shopClosed': '🔴 दुकान बंद है',
    'more.openShopBtn': 'दुकान खोलें',
    'more.closeShopBtn': 'दुकान बंद करें',
    'more.editStoreProfile': 'दुकान प्रोफ़ाइल संपादित करें',
    'more.shortId': 'शॉर्ट आईडी (Short ID)',

    // Customer Specific
    'customer.searchPlaceholder': 'उत्पाद, ब्रांड या दुकानें खोजें...',
    'customer.nearYou': 'आपके आस-पास की सत्यापित स्थानीय दुकानें',
    'customer.viewStore': 'दुकान देखें',
    'customer.addToCart': 'कार्ट में जोड़ें',
    'customer.checkout': 'ऑर्डर पूरा करें',
    'customer.emptyCart': 'आपकी कार्ट खाली है',
    'customer.orderHistory': 'आपके पिछले ऑर्डर्स',
    'customer.khataTitle': 'ग्राहक खाता (डिजिटल उधार बहीखाता)',

    // Shopkeeper Specific
    'shop.newSale': 'त्वरित बिलिंग (POS Billing)',
    'shop.pendingOrders': 'नए ऑनलाइन ऑर्डर्स',
    'shop.catalogManagement': 'दुकान की इन्वेंट्री और उत्पाद',
    'shop.staffManagement': 'स्टाफ और कैशियर',
    'shop.analyticsTitle': 'दैनिक बिक्री और आय रिपोर्ट',
  },
};

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem('gi_app_language') || 'en';
    } catch (e) {
      return 'en';
    }
  });

  const setLanguage = (newLang) => {
    const valid = newLang === 'hi' ? 'hi' : 'en';
    setLanguageState(valid);
    try {
      localStorage.setItem('gi_app_language', valid);
    } catch (e) {}
  };

  const t = (key, fallback) => {
    const langDict = translations[language] || translations.en;
    if (langDict[key] !== undefined) return langDict[key];
    const enDict = translations.en;
    if (enDict[key] !== undefined) return enDict[key];
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
export const useLanguage = useTranslation;
