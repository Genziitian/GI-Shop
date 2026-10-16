# GI SHOP — "Modern Kirana" design system

One look for web and app, for every role.

| Token | Value | Notes |
|---|---|---|
| Brand green | `#0f7a43` (dark `#0b5e33`) | From the logo awning |
| Saffron accent | `#f2a516` | Badges, highlights |
| Cream canvas | `#faf7f0` | App/page background |
| Ink | `#12201a` | Text |
| Radius | 10 / 14 / 20 / 28 | sm / md / lg / xl |

Role flavours (same system, different accent): Shopkeeper & Cashier = green, Customer = saffron, Super Manager = indigo.

Files: web `shop-ledger/src/index.css` (tokens + motion), `src/components/Motion.jsx` (`Reveal`, `CountUp`);
app `shop-ledger-mobile/src/theme/colors.js`, `src/components/ui/Motion.js` (`FadeInView`, `AnimatedNumber`, `Pulse`, `TabIcon`), `src/components/ui/Touchable.js` (springy `TouchableOpacity`).
Motion respects `prefers-reduced-motion` on web. Keep token names/values identical in both places.
