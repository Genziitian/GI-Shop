// Dual Entry: Handles both Hostinger Node.js Web Server and React Native / Expo Mobile App
if (typeof process !== 'undefined' && process.versions && process.versions.node && !process.env.REACT_NATIVE_PACKAGER) {
  require('./server.js');
} else {
  const { registerRootComponent } = require('expo');
  const App = require('./App').default;
  registerRootComponent(App);
}
