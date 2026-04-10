import './style.css';
import { renderPetCompanion } from './app.js';

const appRoot = document.getElementById('app');

if (appRoot) {
  renderPetCompanion(appRoot).catch((error) => {
    appRoot.innerHTML = `
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${error instanceof Error ? error.message : 'Unknown startup error'}</p>
        </section>
      </main>
    `;
  });
}
