import AsyncStorage from "@react-native-async-storage/async-storage";

const ITEMS_KEY_PREFIX = "@gishop_items_";
const CUSTOMERS_KEY_PREFIX = "@gishop_customers_";

const getShopKey = (shopId) => {
  return String(shopId || "default").trim();
};

/**
 * Load cached products/items from AsyncStorage
 */
export const loadCachedItems = async (shopId) => {
  try {
    const key = `${ITEMS_KEY_PREFIX}${getShopKey(shopId)}`;
    const data = await AsyncStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.warn("[Cache] Failed to load cached items:", e);
  }
  return [];
};

/**
 * Save products/items to AsyncStorage
 */
export const saveCachedItems = async (shopId, items) => {
  try {
    const key = `${ITEMS_KEY_PREFIX}${getShopKey(shopId)}`;
    const safeItems = Array.isArray(items) ? items : [];
    await AsyncStorage.setItem(key, JSON.stringify(safeItems));
  } catch (e) {
    console.warn("[Cache] Failed to save cached items:", e);
  }
};

/**
 * Load cached customers from AsyncStorage
 */
export const loadCachedCustomers = async (shopId) => {
  try {
    const key = `${CUSTOMERS_KEY_PREFIX}${getShopKey(shopId)}`;
    const data = await AsyncStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.warn("[Cache] Failed to load cached customers:", e);
  }
  return [];
};

/**
 * Save customers to AsyncStorage
 */
export const saveCachedCustomers = async (shopId, customers) => {
  try {
    const key = `${CUSTOMERS_KEY_PREFIX}${getShopKey(shopId)}`;
    const safeCustomers = Array.isArray(customers) ? customers : [];
    await AsyncStorage.setItem(key, JSON.stringify(safeCustomers));
  } catch (e) {
    console.warn("[Cache] Failed to save cached customers:", e);
  }
};

/**
 * Optimistically add or update a single item in local cache
 */
export const addOrUpdateCachedItem = async (shopId, item) => {
  try {
    const current = await loadCachedItems(shopId);
    const index = current.findIndex((i) => i.id === item.id);
    let updated;
    if (index >= 0) {
      updated = [...current];
      updated[index] = { ...updated[index], ...item };
    } else {
      updated = [item, ...current];
    }
    await saveCachedItems(shopId, updated);
    return updated;
  } catch (e) {
    console.warn("[Cache] Failed to add/update cached item:", e);
  }
  return [];
};

/**
 * Optimistically delete an item from local cache
 */
export const removeCachedItem = async (shopId, itemId) => {
  try {
    const current = await loadCachedItems(shopId);
    const updated = current.filter((i) => i.id !== itemId);
    await saveCachedItems(shopId, updated);
    return updated;
  } catch (e) {
    console.warn("[Cache] Failed to remove cached item:", e);
  }
  return [];
};
