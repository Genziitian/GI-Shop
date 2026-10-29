# Decision Log

What we changed, and why. Newest first. Add a row whenever a non-obvious call is made.

## 2026-10-29

| Area | Decision | Why | Files |
|---|---|---|---|
| Super Manager UI | Rebuilt as card layout: stats row, pill tabs, search, responsive grid. Removed the role banner and descriptive text. | Wide tables were unusable on phones; too much copy. | `shop-ledger/src/pages/SuperManager.jsx` |
| Support number | Header shows a **Call** button only. Number comes from Support settings (fallback `7323809242`). Owner/user/contact phones are also hidden behind Call buttons. | Number was shown in plain text; user asked to hide it. Number is still editable in the Support tab. | `SuperManager.jsx` |
| Super Manager data errors | `getAdminShops/Users/Cities` failures now show a red banner with Retry instead of silently becoming `[]`. | Lists looked empty ("0 shops") with no way to see the real error (timeout / 403 / 401). | `SuperManager.jsx` |
| Customer shop list | Replaced collapsed accordion with always-visible shop cards (status band, logo initial, address, timings, Order + Call). | Cards showed almost no information and needed a tap to expand. | `shop-ledger/src/pages/Customer.jsx` |
| Compare page layout | Compare list uses `cx-grid` and is not capped to 760px. | Single narrow column looked like a stretched phone layout on desktop. | `Customer.jsx` |
| Compare "+ Add" bug | Pass `isOpen` in the shop object. | `openItemModal` returns early on `!shop.isOpen`; the compare page omitted it, so the button silently did nothing. | `Customer.jsx` |
| Customer desktop shell | At >=1024px the bottom nav becomes a left sidebar (232px); content is wider and lists (orders, khata) are multi-column grids. Tablet 769-1023px gets a wider single column. Phones are unchanged. Scoped with `.customer-shell` so Shopkeeper pages are not affected. | The 760px cap and floating pill nav looked like a mobile app on a laptop. CSS-only, so no behaviour risk. | `shop-ledger/src/index.css`, `Customer.jsx` |
| OTP visibility rule | The OTP is only shown while valid: 24h from `otpCreatedAt` (same window `verify-otp` enforces). The customer orders API nulls expired codes and sets `otpExpired: true`; the UI shows "Expired - ask the shop to re-issue". The shopkeeper API still never receives the OTP. | READY orders from weeks ago still displayed a code that verify-otp would reject. | `server/index.js`, `Customer.jsx` |
| Mobile-native baseline | Removed zoom lock from viewport, gated all `:hover` rules, `dvh` fallbacks, tap/overscroll/select rules, 16px inputs on touch, manifest shortcuts (`/customer?tab=`). | Make the PWA feel installed on phones. | `index.html`, `index.css`, `manifest.json`, `Customer.jsx` |
| Customer SaaS polish | Compact 40px search, quiet back link, table-style lists, shop detail redesign (header card, catalog table, larger cart panel), removed "Best price" from Compare. | "Noob design" feedback: oversized controls, ragged grids. | `index.css`, `Customer.jsx` |
| City picker | Custom searchable dropdown (bottom sheet on phones) replaces native `<select>`. | Native menu looked poor and could not be styled. | `components/CityPicker.jsx` |
| Order confirmation | A confirm modal (shop, items, total) appears before any order is sent. | Prevent accidental orders. | `Customer.jsx` |
| Order numbers | Still random `ORD-` + 6 digits, but now checked against the DB and re-rolled (up to 5 times) before insert. | The column is UNIQUE and previously a collision returned a 500 "Failed to place order". Collision odds grow with order count (~1 in 900k per pair). | `server/index.js` (`genUniqueOrderNumber`) |

## Open / not done

- Mobile app (`shop-ledger-mobile`) has not been changed; the redesign is web only.
- Order numbers are random, not sequential. If shops need sequential numbers, add a per-shop counter (decision pending).
- Visual check of the new customer shell on a real desktop/tablet/phone is still needed.
