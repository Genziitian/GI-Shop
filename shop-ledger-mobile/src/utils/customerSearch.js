export const getCustomerShortId = (customer) => String(customer?.customerShortId || customer?.shortId || '').trim();
export const getCustomerPhone = (customer) => String(customer?.phone || customer?.customerPhone || '').trim();
const normalizedPhone = (value) => /^[+\d\s().-]+$/.test(value) ? value.replace(/\D/g, '').slice(-10) : '';
const cleanQuery = (value) => String(value || '').trim().replace(/^(#|ID:\s*)/i, '').toLowerCase();

export function customerMatches(customer, query) {
  const q = cleanQuery(query);
  if (!q) return true;
  const textFields = [customer.name, getCustomerShortId(customer), customer.email, customer.customerEmail, customer._appAccountName];
  if (textFields.some(value => String(value || '').toLowerCase().includes(q))) return true;
  const phoneQuery = normalizedPhone(q);
  return !!phoneQuery && normalizedPhone(getCustomerPhone(customer)).includes(phoneQuery);
}

// Keep the shop's balances and nickname while filling identity from the app account.
// Two different linked accounts must never merge just because a phone matches.
export function mergeCustomerResults(savedCustomers, appCustomers, query = '') {
  const results = (savedCustomers || []).map(c => ({ ...c, _needsSave: false }));
  for (const account of appCustomers || []) {
    if (!customerMatches(account, query)) continue;
    const shortId = getCustomerShortId(account).toLowerCase();
    const phone = normalizedPhone(getCustomerPhone(account));
    const index = results.findIndex(c => {
      const existingId = getCustomerShortId(c).toLowerCase();
      return (shortId && existingId === shortId) ||
        (phone && normalizedPhone(getCustomerPhone(c)) === phone && (!existingId || !shortId));
    });
    const saved = index >= 0 ? results[index] : null;
    const customer = {
      ...account, ...saved,
      phone: getCustomerPhone(account), customerPhone: getCustomerPhone(account),
      shortId: getCustomerShortId(account), customerShortId: getCustomerShortId(account),
      email: account.email || saved?.email || '', customerEmail: account.email || saved?.customerEmail || '',
      address: saved?.address || account.address || '',
      _appAccountName: account.name,
      _needsSave: !saved || getCustomerShortId(saved).toLowerCase() !== shortId,
      _linkExistingPhone: saved && !getCustomerShortId(saved) ? getCustomerPhone(saved) : undefined,
    };
    if (saved) results[index] = customer;
    else results.push(customer);
  }
  const rank = c => {
    const q = cleanQuery(query);
    const exact = q && [getCustomerShortId(c), getCustomerPhone(c), c.email, c.customerEmail].some(v => String(v || '').toLowerCase() === q);
    return (exact ? 0 : 2) + (c._needsSave ? 1 : 0);
  };
  return results.filter(c => customerMatches(c, query)).sort((a, b) => rank(a) - rank(b));
}

export function customerDraftFromQuery(query) {
  const value = String(query || '').trim();
  if (/^[+\d\s().-]+$/.test(value)) return { name: '', phone: normalizedPhone(value) };
  if (/^[\p{L}\s.'-]+$/u.test(value)) return { name: value, phone: '' };
  return { name: '', phone: '' };
}
