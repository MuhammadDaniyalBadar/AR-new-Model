import './styles/main.css';
import { App } from './app/App.js';

const app = new App(document.body);
app.start();

// With ?debug, expose the app for inspection in the browser console.
if (app.router.debug) window.app = app;
