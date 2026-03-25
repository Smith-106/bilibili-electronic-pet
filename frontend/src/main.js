import './style.css';
import { renderAdminDashboard } from './pages/admin/dashboard.js';

const app = document.getElementById('app');

async function bootstrap() {
  if (!app) return;
  app.innerHTML = '<h1>Bili Pet Frontend</h1><div id="admin-dashboard"></div>';
  const panel = document.getElementById('admin-dashboard');
  await renderAdminDashboard(panel);
}

bootstrap();
