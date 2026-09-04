import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const translations = {
  en: {
    // Navigation
    'nav.shops': 'Shops',
    'nav.compare': 'Compare',
    'nav.khata': 'My Khata',
    'nav.orders': 'All Orders',
    'nav.more': 'More',
    'nav.pos': 'POS',
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
    'common.search': 'Search',
    'common.total': 'Total',
    'common.logout': 'Log Out',
    'common.back': 'Back',
    'common.phone': 'Mobile Phone',
    'common.city': 'City / Location',
    'common.address': 'Address',
    'common.name': 'Full Name',

    // More Tab & Account
    'more.title': 'Account & Settings',
    'more.subtitle': 'Manage language, profile, PIN & session',
    'more.langCardTitle': 'Choose Language / भाषा चुनें',
    'more.langCardSubtitle': 'Select your preferred language for the application',
    'more.english': 'English',
    'more.hindi': 'हिंदी (Hindi)',
    'more.profileOverview': 'Personal & Delivery Details',
    'more.securityLock': 'Security PIN & Access',
    'more.changePin': 'Change 4-Digit Security PIN',
    'more.changePassword': 'Change Account Password',
    'more.legalPrivacy': 'Legal & Privacy',
    'more.privacyPolicy': 'Privacy Policy',
    'more.termsConditions': 'Terms & Conditions',
    'more.deleteAccount': 'Delete Account Request',
    'more.storeTitle': 'Store Operations & Settings',
    'more.storeStatus': 'Store Status',
    'more.shopOpen': '🟢 Shop is OPEN',
    'more.shopClosed': '🔴 Shop is CLOSED',
    'more.openShopBtn': 'Open Shop',
    'more.closeShopBtn': 'Close Shop',
    'more.editStoreProfile': 'Edit Store Profile',
    'more.shortId': 'SHORT ID',

    // Customer specific
    'customer.searchPlaceholder': 'Search products, shops or brands...',
    'customer.exploreTitle': 'Local Stores in Your City',
    'customer.khataTitle': 'Customer Khata (Digital Udhar)',
    'customer.ordersTitle': 'Order History & Status',
    
    // Shopkeeper specific
    'shop.posTitle': 'Point of Sale (POS)',
    'shop.khataTitle': 'Customer Udhar Khata',
    'shop.ordersTitle': 'Customer Online Orders',
    'shop.analyticsTitle': 'Sales & Revenue Analytics',
    'shop.productsTitle': 'Product Catalog',
    'shop.staffTitle': 'Store Cashiers & Staff',
  },
  hi: {
    // Navigation
    'nav.shops': 'दुकानें',
    'nav.compare': 'मूल्य तुलना',
    'nav.khata': 'मेरा खाता',
    'nav.orders': 'सभी ऑर्डर्स',
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
    'common.search': 'खोजें',
    'common.total': 'कुल राशि',
    'common.logout': 'लॉग आउट',
    'common.back': 'वापस जाएं',
    'common.phone': 'मोबाइल नंबर',
    'common.city': 'शहर / स्थान',
    'common.address': 'डिलीवरी पता',
    'common.name': 'पूरा नाम',

    // More Tab & Account
    'more.title': 'खाता और सेटिंग्स',
    'more.subtitle': 'भाषा, प्रोफ़ाइल, सुरक्षा पिन और सेटिंग्स प्रबंधित करें',
    'more.langCardTitle': 'Choose Language / भाषा चुनें',
    'more.langCardSubtitle': 'एप्लिकेशन के लिए अपनी पसंदीदा भाषा चुनें',
    'more.english': 'English',
    'more.hindi': 'हिंदी (Hindi)',
    'more.profileOverview': 'व्यक्तिगत और डिलीवरी विवरण',
    'more.securityLock': 'सुरक्षा पिन और एक्सेस',
    'more.changePin': '4-अंकों का सुरक्षा पिन बदलें',
    'more.changePassword': 'अकाउंट पासवर्ड बदलें',
    'more.legalPrivacy': 'कानूनी व नीतियां',
    'more.privacyPolicy': 'गोपनीयता नीति (Privacy Policy)',
    'more.termsConditions': 'नियम व शर्तें (Terms & Conditions)',
    'more.deleteAccount': 'खाता हटाने का अनुरोध',
    'more.storeTitle': 'दुकान संचालन और सेटिंग्स',
    'more.storeStatus': 'दुकान की स्थिति',
    'more.shopOpen': '🟢 दुकान खुली है',
    'more.shopClosed': '🔴 दुकान बंद है',
    'more.openShopBtn': 'दुकान खोलें',
    'more.closeShopBtn': 'दुकान बंद करें',
    'more.editStoreProfile': 'दुकान प्रोफ़ाइल संपादित करें',
    'more.shortId': 'शॉर्ट आईडी (ID)',

    // Customer specific
    'customer.searchPlaceholder': 'उत्पाद, दुकानें या ब्रांड खोजें...',
    'customer.exploreTitle': 'आपके शहर की स्थानीय दुकानें',
    'customer.khataTitle': 'ग्राहक खाता (डिजिटल उधार बहीखाता)',
    'customer.ordersTitle': 'ऑर्डर इतिहास और स्थिति',

    // Shopkeeper specific
    'shop.posTitle': 'त्वरित बिलिंग (POS Billing)',
    'shop.khataTitle': 'ग्राहक उधार खाता (Khata)',
    'shop.ordersTitle': 'ग्राहकों के ऑनलाइन ऑर्डर्स',
    'shop.analyticsTitle': 'बिक्री और राजस्व रिपोर्ट',
    'shop.productsTitle': 'उत्पाद कैटलॉग (Products)',
    'shop.staffTitle': 'दुकान के कैशियर व कर्मचारी',
  },
};

const STORAGE_KEY = '@gishop_language';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'hi' || saved === 'en') {
          setLanguageState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const setLanguage = async (newLang) => {
    const valid = newLang === 'hi' ? 'hi' : 'en';
    setLanguageState(valid);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, valid);
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
