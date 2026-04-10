(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const o of a)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&s(r)}).observe(document,{childList:!0,subtree:!0});function l(a){const o={};return a.integrity&&(o.integrity=a.integrity),a.referrerPolicy&&(o.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?o.credentials="include":a.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(a){if(a.ep)return;a.ep=!0;const o=l(a);fetch(a.href,o)}})();const d=Object.freeze({petName:"Mochi",statusLine:"Idle on the browser ledge, listening for the next check-in.",loopMode:"Local placeholder loop",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Local stub",loopHint:"Swap this adapter with a real pet core endpoint when the contract is ready.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a light status ping."},memoryTitle:"Short-term memory",memorySummary:"Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays local until the real API is wired in."]});function u(t){return JSON.parse(JSON.stringify(t))}function m(t=d){return{async getCompanionState(){return await Promise.resolve(),u(t)}}}const h=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],y=["Local companion loop has not reported any recent signals yet."];function n(t){return String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function p(t){const e=t&&typeof t=="object"?t:{},l=e.mood&&typeof e.mood=="object"?e.mood:{},s=Array.isArray(e.vitals)&&e.vitals.length?e.vitals:h,a=Array.isArray(e.recentSignals)&&e.recentSignals.length?e.recentSignals:y;return{petName:e.petName||"Companion",statusLine:e.statusLine||"Waiting for the first local update.",loopMode:e.loopMode||"Local placeholder loop",lastCheckIn:e.lastCheckIn||"Pending",adapterLabel:e.adapterLabel||"Local stub",loopHint:e.loopHint||"Wire a real endpoint later without changing the browser shell.",mood:{label:l.label||"Settling",note:l.note||"No mood note has been published yet."},memoryTitle:e.memoryTitle||"Memory summary",memorySummary:e.memorySummary||"No memory summary is available yet. The prototype stays useful even before backend contracts exist.",vitals:s,recentSignals:a}}function f(t){return t.map(e=>`
        <article class="metric-card">
          <span class="metric-label">${n(e.label||"State")}</span>
          <strong class="metric-value">${n(e.value||"Unknown")}</strong>
        </article>
      `).join("")}function g(t){return t.map(e=>`<li class="signal-item">${n(e)}</li>`).join("")}function b(t){const e=p(t);return`
    <div class="panel-grid">
      <section class="panel panel-pet" aria-labelledby="companion-name">
        <div class="pet-avatar" aria-hidden="true">
          <span class="pet-core"></span>
        </div>
        <div class="panel-copy-stack">
          <p class="section-label">Companion</p>
          <h2 id="companion-name">${n(e.petName)}</h2>
          <p class="status-line">${n(e.statusLine)}</p>
          <dl class="meta-list">
            <div>
              <dt>Loop mode</dt>
              <dd>${n(e.loopMode)}</dd>
            </div>
            <div>
              <dt>Last check-in</dt>
              <dd>${n(e.lastCheckIn)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="panel" aria-labelledby="mood-heading">
        <p class="section-label">Mood</p>
        <h2 id="mood-heading">${n(e.mood.label)}</h2>
        <p class="panel-copy">${n(e.mood.note)}</p>
        <p class="hint-text">${n(e.loopHint)}</p>
      </section>

      <section class="panel" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${f(e.vitals)}
        </div>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${n(e.memoryTitle)}</h2>
        <p class="panel-copy">${n(e.memorySummary)}</p>
        <ul class="signal-list">
          ${g(e.recentSignals)}
        </ul>
      </section>
    </div>
  `}function v(t){const e=t instanceof Error?t.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${n(e)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function S(){return`
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
          <button class="refresh-button" type="button" data-action="refresh">Refresh mood</button>
        </div>
      </section>

      <section class="companion-stage" data-role="content" aria-live="polite">
        <div class="loading-panel">Loading local companion state...</div>
      </section>
    </main>
  `}async function L(t,{adapter:e=m()}={}){if(!t)throw new Error("A target element is required to render the pet companion surface.");t.innerHTML=S();const l=t.querySelector('[data-role="content"]'),s=t.querySelector('[data-action="refresh"]'),a=t.querySelector('[data-role="adapter-status"]');async function o(){s.disabled=!0,s.textContent="Refreshing...",a.textContent="Adapter: syncing local loop";try{const r=await e.getCompanionState(),c=p(r);l.innerHTML=b(c),a.textContent=`Adapter: ${c.adapterLabel}`}catch(r){l.innerHTML=v(r),a.textContent="Adapter: degraded"}finally{s.disabled=!1,s.textContent="Refresh mood"}}return s.addEventListener("click",()=>{o()}),await o(),{reload:o}}const i=document.getElementById("app");i&&L(i).catch(t=>{i.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${t instanceof Error?t.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
