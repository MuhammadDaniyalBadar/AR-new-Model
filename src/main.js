import './styles/main.css';
import { App } from './app/App.js';
import { startAddons } from './addons/index.js';

const app = new App(document.body);
app.start();
// Owner dashboard add-ons (tracking, badges, banner). Does nothing unless VITE_OWNER_API is set.
startAddons(app);

// With ?debug, expose the app for inspection in the browser console.
if (app.router.debug) window.app = app;
