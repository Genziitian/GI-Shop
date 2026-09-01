const ITEMS_KEY = 'shop_ledger_items';
const SALES_KEY = 'shop_ledger_sales';
const CUSTOMERS_KEY = 'shop_ledger_customers';
const SETTLEMENTS_KEY = 'shop_ledger_settlements';

export const getCustomers = () => {
  const data = localStorage.getItem(CUSTOMERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveCustomer = (customer) => {
  const customers = getCustomers();
  const existingIndex = customers.findIndex(c => c.phone === customer.phone);
  let savedCustomer;
  if (existingIndex >= 0) {
    customers[existingIndex] = { ...customers[existingIndex], ...customer };
    savedCustomer = customers[existingIndex];
  } else {
    savedCustomer = { ...customer, id: Date.now().toString() };
    customers.push(savedCustomer);
  }
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  return savedCustomer;
};

export const deleteCustomer = (id) => {
  const customers = getCustomers();
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers.filter(c => c.id !== id)));
};

export const getItems = () => {
  const data = localStorage.getItem(ITEMS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveItem = (item) => {
  const items = getItems();
  const newItem = { ...item, id: Date.now().toString() };
  items.push(newItem);
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  return newItem;
};

export const editItem = (id, updatedData) => {
  const items = getItems();
  const index = items.findIndex(i => i.id === id);
  if (index >= 0) {
    items[index] = { ...items[index], ...updatedData };
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    return items[index];
  }
  return null;
};

export const deleteItem = (id) => {
  const items = getItems();
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items.filter(i => i.id !== id)));
};

export const getSettlements = () => {
  const data = localStorage.getItem(SETTLEMENTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveSettlement = (settlement) => {
  const settlements = getSettlements();
  const newSettlement = { ...settlement, id: 'SET-' + Date.now().toString(), date: new Date().toISOString() };
  settlements.push(newSettlement);
  localStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(settlements));
  return newSettlement;
};

export const getSales = () => {
  const data = localStorage.getItem(SALES_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveSale = (sale) => {
  const sales = getSales();
  const newSale = { ...sale, id: 'INV-' + Date.now().toString(), date: new Date().toISOString() };
  sales.push(newSale);
  localStorage.setItem(SALES_KEY, JSON.stringify(sales));
  return newSale;
};

export const getSalesByCustomer = (customerPhone) => {
  const sales = getSales();
  return sales.filter(s => s.customerPhone === customerPhone);
};

export const getCustomerDue = (phone) => {
  const sales = getSalesByCustomer(phone).filter(s => s.paymentMethod === 'Add to Book');
  const settlements = getSettlements().filter(s => s.customerPhone === phone);
  
  const totalCredit = sales.reduce((sum, s) => sum + s.total, 0);
  const totalPaid = settlements.reduce((sum, s) => sum + s.amount, 0);
  
  return totalCredit - totalPaid;
};

export const getCustomerLedger = (phone) => {
  const sales = getSalesByCustomer(phone).map(s => ({ ...s, type: 'SALE' }));
  const settlements = getSettlements().filter(s => s.customerPhone === phone).map(s => ({ ...s, type: 'SETTLEMENT' }));
  
  // Combine and sort by date ascending
  const ledger = [...sales, ...settlements].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let runningDue = 0;
  return ledger.map(entry => {
    if (entry.type === 'SALE' && entry.paymentMethod === 'Add to Book') {
      runningDue += entry.total;
    } else if (entry.type === 'SETTLEMENT') {
      runningDue -= entry.amount;
    }
    return { ...entry, runningDue };
  });
};
