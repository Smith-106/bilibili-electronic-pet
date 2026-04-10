(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const o of a)if(o.type==="childList")for(const s of o.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function i(a){const o={};return a.integrity&&(o.integrity=a.integrity),a.referrerPolicy&&(o.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?o.credentials="include":a.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(a){if(a.ep)return;a.ep=!0;const o=i(a);fetch(a.href,o)}})();const y=Object.freeze({petName:"Mochi",statusLine:"Idle on the browser ledge, listening for the next check-in.",loopMode:"Local placeholder loop",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Local stub",loopHint:"Swap this adapter with a real pet core endpoint when the contract is ready.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a light status ping."},memoryTitle:"Short-term memory",memorySummary:"Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays local until the real API is wired in."]});function b(t){return JSON.parse(JSON.stringify(t))}function m(t=y){return{async getCompanionState(){return await Promise.resolve(),b(t)}}}function g({endpoint:t="/companion/state",actionEndpoint:e="/companion/actions",fetchImpl:i=(a=>(a=globalThis.fetch)==null?void 0:a.bind(globalThis))(),fallback:n=m()}={}){return{async getCompanionState(){if(typeof i!="function")return n.getCompanionState();try{const o=await i(t,{headers:{Accept:"application/json"}});if(!o.ok)throw new Error(`companion_state_${o.status}`);const s=await o.json();if(!s||typeof s!="object")throw new Error("companion_state_invalid");return s}catch{return n.getCompanionState()}},async performAction(o,s){if(typeof i!="function")return{ok:!1,fallback:!0};const r=await i(e,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({action:o,note:s})});if(!r.ok)throw new Error(`companion_action_${r.status}`);return r.json()}}}const v=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],w=["Local companion loop has not reported any recent signals yet."];function l(t){return String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function h(t){const e=t&&typeof t=="object"?t:{},i=e.mood&&typeof e.mood=="object"?e.mood:{},n=Array.isArray(e.vitals)&&e.vitals.length?e.vitals:v,a=Array.isArray(e.recentSignals)&&e.recentSignals.length?e.recentSignals:w;return{petName:e.petName||"Companion",statusLine:e.statusLine||"Waiting for the first local update.",loopMode:e.loopMode||"Local placeholder loop",lastCheckIn:e.lastCheckIn||"Pending",adapterLabel:e.adapterLabel||"Local stub",loopHint:e.loopHint||"Wire a real endpoint later without changing the browser shell.",mood:{label:i.label||"Settling",note:i.note||"No mood note has been published yet."},memoryTitle:e.memoryTitle||"Memory summary",memorySummary:e.memorySummary||"No memory summary is available yet. The prototype stays useful even before backend contracts exist.",vitals:n,recentSignals:a}}function S(t){return t.map(e=>`
        <article class="metric-card">
          <span class="metric-label">${l(e.label||"State")}</span>
          <strong class="metric-value">${l(e.value||"Unknown")}</strong>
        </article>
      `).join("")}function A(t){return t.map(e=>`<li class="signal-item">${l(e)}</li>`).join("")}function L(t){const e=h(t);return`
    <div class="panel-grid">
      <section class="panel panel-pet" aria-labelledby="companion-name">
        <div class="pet-avatar" aria-hidden="true">
          <span class="pet-core"></span>
        </div>
        <div class="panel-copy-stack">
          <p class="section-label">Companion</p>
          <h2 id="companion-name">${l(e.petName)}</h2>
          <p class="status-line">${l(e.statusLine)}</p>
          <dl class="meta-list">
            <div>
              <dt>Loop mode</dt>
              <dd>${l(e.loopMode)}</dd>
            </div>
            <div>
              <dt>Last check-in</dt>
              <dd>${l(e.lastCheckIn)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="panel" aria-labelledby="mood-heading">
        <p class="section-label">Mood</p>
        <h2 id="mood-heading">${l(e.mood.label)}</h2>
        <p class="panel-copy">${l(e.mood.note)}</p>
        <p class="hint-text">${l(e.loopHint)}</p>
      </section>

      <section class="panel" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${S(e.vitals)}
        </div>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${l(e.memoryTitle)}</h2>
        <p class="panel-copy">${l(e.memorySummary)}</p>
        <ul class="signal-list">
          ${A(e.recentSignals)}
        </ul>
      </section>
    </div>
  `}function u(t){const e=t instanceof Error?t.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${l(e)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function C(){return`
    <main class="companion-shell" data-surface="pet-companion">
      <section class="hero-card">
        <div class="hero-copy">
          <p class="eyebrow">Pet companion prototype</p>
          <h1>Browser buddy without the admin shell</h1>
          <p class="hero-note">
            A lightweight Vite surface that proves the pet loop visually with local mood, state, and memory placeholders.
          </p>
        </div>
        <div class="hero-actions">
          <span class="status-pill" data-role="adapter-status">Adapter: local stub</span>
          <div class="companion-actions" data-role="action-buttons">
            <button class="action-button" type="button" data-action="pat">Pat</button>
            <button class="action-button" type="button" data-action="feed">Feed</button>
            <button class="action-button" type="button" data-action="wake">Wake</button>
          </div>
          <button class="refresh-button" type="button" data-action="refresh">Refresh mood</button>
        </div>
      </section>

      <section class="companion-stage" data-role="content" aria-live="polite">
        <div class="loading-panel">Loading local companion state...</div>
      </section>
    </main>
  `}async function k(t,{adapter:e=m()}={}){if(!t)throw new Error("A target element is required to render the pet companion surface.");t.innerHTML=C();const i=t.querySelector('[data-role="content"]'),n=t.querySelector('[data-action="refresh"]'),a=t.querySelector('[data-role="adapter-status"]'),o=[...t.querySelectorAll('[data-role="action-buttons"] [data-action]')];async function s(){n.disabled=!0,o.forEach(r=>{r.disabled=!0}),n.textContent="Refreshing...",a.textContent="Adapter: syncing local loop";try{const r=await e.getCompanionState(),c=h(r);i.innerHTML=L(c),a.textContent=`Adapter: ${c.adapterLabel}`}catch(r){i.innerHTML=u(r),a.textContent="Adapter: degraded"}finally{n.disabled=!1,o.forEach(r=>{r.disabled=!1}),n.textContent="Refresh mood"}}for(const r of o)r.addEventListener("click",async()=>{const c=r.getAttribute("data-action");if(!(!c||typeof e.performAction!="function")){n.disabled=!0,o.forEach(p=>{p.disabled=!0}),a.textContent=`Adapter: sending ${c}`;try{await e.performAction(c),await s()}catch(p){i.innerHTML=u(p),a.textContent="Adapter: action failed",n.disabled=!1,o.forEach(f=>{f.disabled=!1})}}});return n.addEventListener("click",()=>{s()}),await s(),{reload:s}}const d=document.getElementById("app");d&&k(d,{adapter:g()}).catch(t=>{d.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${t instanceof Error?t.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
