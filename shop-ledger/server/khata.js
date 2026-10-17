const KHATA_ACCOUNT_REQUIRED = 'Khata credit ("Add to Book") requires a registered, active GI SHOP account. Select or link the customer\'s app account first. Walk-in customers can pay by Cash or Online.';

// Legacy Book payment labels also count as credit in the ledger.
const isKhataPayment = (method) => typeof method === 'string' && /book/i.test(method);

function verifyKhataCustomer(db, { shortId, userId }, callback) {
  const cleanShortId = typeof shortId === 'string' ? shortId.trim() : '';
  if (!userId && !cleanShortId) {
    return callback({ status: 400, message: KHATA_ACCOUNT_REQUIRED });
  }

  // An order's stored customerId is authoritative; never fall back to another
  // account matching an old phone number or a supplied Short ID.
  const identityQuery = userId ? 'id = ?' : 'LOWER(shortId) = LOWER(?)';
  db.get(
    `SELECT id, shortId, email, phone, name, address FROM Users
     WHERE ${identityQuery} AND status = 'ACTIVE' AND shortId IS NOT NULL AND TRIM(shortId) != ''`,
    [userId || cleanShortId],
    (err, user) => {
      if (err) return callback({ status: 500, message: 'Could not verify the customer account. Please try again.' });
      if (!user) return callback({ status: 400, message: KHATA_ACCOUNT_REQUIRED });
      callback(null, user);
    }
  );
}

module.exports = { isKhataPayment, verifyKhataCustomer };
