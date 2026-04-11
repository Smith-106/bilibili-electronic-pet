(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function l(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(n){if(n.ep)return;n.ep=!0;const o=l(n);fetch(n.href,o)}})();const b=Object.freeze({petName:"Mochi",statusLine:"Idle on the browser ledge, listening for the next check-in.",loopMode:"Local placeholder loop",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Local stub",loopHint:"Swap this adapter with a real pet core endpoint when the contract is ready.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a light status ping."},memoryTitle:"Short-term memory",memorySummary:"Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays local until the real API is wired in."],recentInteractions:[{title:"Pat interaction",detail:"A calm pat kept Mochi settled on the browser ledge.",timestamp:"2026-04-10T03:28:00.000Z",source:"Local Stub"},{title:"Status pulse",detail:"The local adapter emitted a lightweight keep-alive signal.",timestamp:"2026-04-10T03:30:00.000Z",source:"Local Stub"}]});function g(t){return JSON.parse(JSON.stringify(t))}function m(t=b){return{async getCompanionState(){return await Promise.resolve(),g(t)}}}function y({endpoint:t="/companion/state",actionEndpoint:e="/companion/actions",fetchImpl:l=(n=>(n=globalThis.fetch)==null?void 0:n.bind(globalThis))(),fallback:s=m()}={}){return{async getCompanionState(){if(typeof l!="function")return s.getCompanionState();try{const o=await l(t,{headers:{Accept:"application/json"}});if(!o.ok)throw new Error(`companion_state_${o.status}`);const a=await o.json();if(!a||typeof a!="object")throw new Error("companion_state_invalid");return a}catch{return s.getCompanionState()}},async performAction(o,a){if(typeof l!="function")return{ok:!1,fallback:!0};const r=await l(e,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({action:o,note:a})});if(!r.ok)throw new Error(`companion_action_${r.status}`);return r.json()}}}const v=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],S=["Local companion loop has not reported any recent signals yet."],w=[{title:"Companion signal pending",detail:"No structured interaction timeline is available yet.",timestamp:"Pending",source:"Local stub"}];function i(t){return String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function h(t){const e=t&&typeof t=="object"?t:{},l=e.mood&&typeof e.mood=="object"?e.mood:{},s=Array.isArray(e.vitals)&&e.vitals.length?e.vitals:v,n=Array.isArray(e.recentSignals)&&e.recentSignals.length?e.recentSignals:S,o=Array.isArray(e.recentInteractions)&&e.recentInteractions.length?e.recentInteractions.map(a=>({title:(a==null?void 0:a.title)||"Companion signal",detail:(a==null?void 0:a.detail)||"No detail published yet.",timestamp:(a==null?void 0:a.timestamp)||"Pending",source:(a==null?void 0:a.source)||"Memory"})):w;return{petName:e.petName||"Companion",statusLine:e.statusLine||"Waiting for the first local update.",loopMode:e.loopMode||"Local placeholder loop",lastCheckIn:e.lastCheckIn||"Pending",adapterLabel:e.adapterLabel||"Local stub",loopHint:e.loopHint||"Wire a real endpoint later without changing the browser shell.",mood:{label:l.label||"Settling",note:l.note||"No mood note has been published yet."},memoryTitle:e.memoryTitle||"Memory summary",memorySummary:e.memorySummary||"No memory summary is available yet. The prototype stays useful even before backend contracts exist.",vitals:s,recentSignals:n,recentInteractions:o}}function A(t){return t.map(e=>`
        <article class="metric-card">
          <span class="metric-label">${i(e.label||"State")}</span>
          <strong class="metric-value">${i(e.value||"Unknown")}</strong>
        </article>
      `).join("")}function L(t){return t.map(e=>`<li class="signal-item">${i(e)}</li>`).join("")}function C(t){return t.map(e=>`
        <article class="interaction-card">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${i(e.title)}</h3>
              <p class="interaction-detail">${i(e.detail)}</p>
            </div>
            <span class="interaction-source">${i(e.source)}</span>
          </div>
          <p class="interaction-time">${i(e.timestamp)}</p>
        </article>
      `).join("")}function $(t){const e=h(t);return`
    <div class="panel-grid">
      <section class="panel panel-pet" aria-labelledby="companion-name">
        <div class="pet-avatar" aria-hidden="true">
          <span class="pet-core"></span>
        </div>
        <div class="panel-copy-stack">
          <p class="section-label">Companion</p>
          <h2 id="companion-name">${i(e.petName)}</h2>
          <p class="status-line">${i(e.statusLine)}</p>
          <dl class="meta-list">
            <div>
              <dt>Loop mode</dt>
              <dd>${i(e.loopMode)}</dd>
            </div>
            <div>
              <dt>Last check-in</dt>
              <dd>${i(e.lastCheckIn)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="panel" aria-labelledby="mood-heading">
        <p class="section-label">Mood</p>
        <h2 id="mood-heading">${i(e.mood.label)}</h2>
        <p class="panel-copy">${i(e.mood.note)}</p>
        <p class="hint-text">${i(e.loopHint)}</p>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${i(e.memoryTitle)}</h2>
        <p class="panel-copy">${i(e.memorySummary)}</p>
        <ul class="signal-list">
          ${L(e.recentSignals)}
        </ul>
      </section>

      <section class="panel panel-history" aria-labelledby="timeline-heading">
        <p class="section-label">Recent interactions</p>
        <h2 id="timeline-heading">Companion timeline</h2>
        <div class="interaction-list">
          ${C(e.recentInteractions)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${A(e.vitals)}
        </div>
      </section>
    </div>
  `}function u(t){const e=t instanceof Error?t.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${i(e)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function T(){return`
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
  `}async function k(t,{adapter:e=m()}={}){if(!t)throw new Error("A target element is required to render the pet companion surface.");t.innerHTML=T();const l=t.querySelector('[data-role="content"]'),s=t.querySelector('[data-action="refresh"]'),n=t.querySelector('[data-role="adapter-status"]'),o=[...t.querySelectorAll('[data-role="action-buttons"] [data-action]')];async function a(){s.disabled=!0,o.forEach(r=>{r.disabled=!0}),s.textContent="Refreshing...",n.textContent="Adapter: syncing local loop";try{const r=await e.getCompanionState(),c=h(r);l.innerHTML=$(c),n.textContent=`Adapter: ${c.adapterLabel}`}catch(r){l.innerHTML=u(r),n.textContent="Adapter: degraded"}finally{s.disabled=!1,o.forEach(r=>{r.disabled=!1}),s.textContent="Refresh mood"}}for(const r of o)r.addEventListener("click",async()=>{const c=r.getAttribute("data-action");if(!(!c||typeof e.performAction!="function")){s.disabled=!0,o.forEach(p=>{p.disabled=!0}),n.textContent=`Adapter: sending ${c}`;try{await e.performAction(c),await a()}catch(p){l.innerHTML=u(p),n.textContent="Adapter: action failed",s.disabled=!1,o.forEach(f=>{f.disabled=!1})}}});return s.addEventListener("click",()=>{a()}),await a(),{reload:a}}const d=document.getElementById("app");d&&k(d,{adapter:y()}).catch(t=>{d.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${t instanceof Error?t.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
