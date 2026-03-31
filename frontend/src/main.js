import './style.css';
import { renderAdminDashboard } from './pages/admin/dashboard.js';

// Setup DEV local API key for frontend-backend handshake
window.__ADMIN_API_KEY__ = 'pet-local-key-20260308';

function setupLayoutToggles() {
  const leftSidebar = document.getElementById('left-sidebar');
  const rightSidebar = document.getElementById('right-sidebar');
  const toggleLeftBtn = document.getElementById('toggle-left-btn');
  const toggleRightBtn = document.getElementById('toggle-right-btn');
  const expandLeftBtn = document.getElementById('expand-left-btn');
  const expandRightBtn = document.getElementById('expand-right-btn');
  const storyBibleToggle = document.querySelector('.toggle-switch');

  // Left Sidebar Toggle
  if (toggleLeftBtn && expandLeftBtn && leftSidebar) {
    toggleLeftBtn.addEventListener('click', () => {
      leftSidebar.classList.add('collapsed');
      expandLeftBtn.style.display = 'block';
    });

    expandLeftBtn.addEventListener('click', () => {
      leftSidebar.classList.remove('collapsed');
      expandLeftBtn.style.display = 'none';
    });
  }

  // Right Sidebar Toggle
  if (toggleRightBtn && expandRightBtn && rightSidebar) {
    toggleRightBtn.addEventListener('click', () => {
      rightSidebar.classList.add('collapsed');
      expandRightBtn.style.display = 'block';
    });

    expandRightBtn.addEventListener('click', () => {
      rightSidebar.classList.remove('collapsed');
      expandRightBtn.style.display = 'none';
    });
  }

  // Accordion Logic for System Config
  const bibleSections = document.querySelectorAll('.bible-section');
  bibleSections.forEach(section => {
    // Only add logic if there's a chevron to click
    const chevron = section.querySelector('.chevron');
    if (chevron) {
      section.addEventListener('click', () => {
        section.classList.toggle('open');
      });
    }
  });

  // Theme Toggle Logic
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    let currentThemeIndex = 0;
    const themes = ['', 'dark', 'sepia'];
    themeToggleBtn.addEventListener('click', () => {
      currentThemeIndex = (currentThemeIndex + 1) % themes.length;
      const nextTheme = themes[currentThemeIndex];
      if (!nextTheme) {
        document.body.removeAttribute('data-theme');
      } else {
        document.body.setAttribute('data-theme', nextTheme);
      }
    });
  }

  // System Config (Story Bible) Toggle Switch
  const systemConfigToggle = document.querySelector('.toggle-switch');
  const systemConfigPanel = document.querySelector('.story-bible');
  if (systemConfigToggle && systemConfigPanel) {
    systemConfigToggle.addEventListener('click', () => {
      const isOn = systemConfigToggle.classList.toggle('on');
      systemConfigPanel.style.display = isOn ? 'block' : 'none';
    });
  }

  // Right Sidebar Tabs Logic
  const tabs = document.querySelectorAll('.tab');
  const chatPanel = document.querySelector('.chat-panel');
  const chatFooter = document.querySelector('.chat-footer');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      if (tab.textContent.includes('History')) {
        chatPanel.innerHTML = '<div class="spacer"></div><h3>History Log</h3><p>No recorded commands in current session.</p><div class="spacer"></div>';
        if (chatFooter) chatFooter.style.display = 'none';
      } else {
        chatPanel.innerHTML = '<div class="spacer"></div><h3><svg width="24" height="24" style="color:var(--primary-cta); margin-bottom:8px;"><use href="#icon-terminal"></use></svg><br>Interact directly</h3><p>Send commands to your Bili Pet System, check live behavior, or paste diagnostic text.</p><div class="spacer"></div>';
        if (chatFooter) chatFooter.style.display = 'block';
      }
    });
  });

  // Dropdown Logic
  const dropdowns = document.querySelectorAll('.dropdown');
  dropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.dropdown-trigger');
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdowns.forEach(d => { if(d !== dropdown) d.classList.remove('open') });
        dropdown.classList.toggle('open');
      });
    }
  });

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    dropdowns.forEach(d => d.classList.remove('open'));
  });
}

async function bootstrap() {
  setupLayoutToggles();

  const panel = document.getElementById('admin-dashboard');
  if (panel) {
    await renderAdminDashboard(panel);
  } else {
    console.error('Admin dashboard container not found.');
  }
}

bootstrap();
