(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))l(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&l(o)}).observe(document,{childList:!0,subtree:!0});function s(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function l(n){if(n.ep)return;n.ep=!0;const a=s(n);fetch(n.href,a)}})();const y=Object.freeze({petName:"Mochi",statusLine:"Idle on the browser ledge, listening for the next check-in.",loopMode:"Local placeholder loop",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Local stub",loopHint:"Swap this adapter with a real pet core endpoint when the contract is ready.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a light status ping."},memoryTitle:"Short-term memory",memorySummary:"Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays local until the real API is wired in."],recentInteractions:[{title:"Pat interaction",detail:"A calm pat kept Mochi settled on the browser ledge.",timestamp:"2026-04-10T03:28:00.000Z",source:"Local Stub"},{title:"Status pulse",detail:"The local adapter emitted a lightweight keep-alive signal.",timestamp:"2026-04-10T03:30:00.000Z",source:"Local Stub"}]});function v(t){return JSON.parse(JSON.stringify(t))}function h(t=y){return{async getCompanionState(){return await Promise.resolve(),v(t)}}}function w({endpoint:t="/companion/state",actionEndpoint:e="/companion/actions",fetchImpl:s=(n=>(n=globalThis.fetch)==null?void 0:n.bind(globalThis))(),fallback:l=h()}={}){return{async getCompanionState(){if(typeof s!="function")return l.getCompanionState();try{const a=await s(t,{headers:{Accept:"application/json"}});if(!a.ok)throw new Error(`companion_state_${a.status}`);const o=await a.json();if(!o||typeof o!="object")throw new Error("companion_state_invalid");return o}catch{return l.getCompanionState()}},async performAction(a,o){if(typeof s!="function")return{ok:!1,fallback:!0};const c=await s(e,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({action:a,note:o})});if(!c.ok)throw new Error(`companion_action_${c.status}`);return c.json()}}}const S=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],A=["Local companion loop has not reported any recent signals yet."],L=[{title:"Companion signal pending",detail:"No structured interaction timeline is available yet.",timestamp:"Pending",source:"Local stub"}];function i(t){return String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function f(t){const e=t&&typeof t=="object"?t:{},s=e.mood&&typeof e.mood=="object"?e.mood:{},l=Array.isArray(e.vitals)&&e.vitals.length?e.vitals:S,n=Array.isArray(e.recentSignals)&&e.recentSignals.length?e.recentSignals:A,a=Array.isArray(e.recentInteractions)&&e.recentInteractions.length?e.recentInteractions.map(o=>({title:(o==null?void 0:o.title)||"Companion signal",detail:(o==null?void 0:o.detail)||"No detail published yet.",timestamp:(o==null?void 0:o.timestamp)||"Pending",source:(o==null?void 0:o.source)||"Memory"})):L;return{petName:e.petName||"Companion",statusLine:e.statusLine||"Waiting for the first local update.",loopMode:e.loopMode||"Local placeholder loop",lastCheckIn:e.lastCheckIn||"Pending",adapterLabel:e.adapterLabel||"Local stub",loopHint:e.loopHint||"Wire a real endpoint later without changing the browser shell.",mood:{label:s.label||"Settling",note:s.note||"No mood note has been published yet."},memoryTitle:e.memoryTitle||"Memory summary",memorySummary:e.memorySummary||"No memory summary is available yet. The prototype stays useful even before backend contracts exist.",vitals:l,recentSignals:n,recentInteractions:a}}function C(t){return t.map(e=>`
        <article class="metric-card">
          <span class="metric-label">${i(e.label||"State")}</span>
          <strong class="metric-value">${i(e.value||"Unknown")}</strong>
        </article>
      `).join("")}function k(t){return t.map(e=>`<li class="signal-item">${i(e)}</li>`).join("")}function $(t){return t.map(e=>`
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
      `).join("")}function T(t){const e=f(t);return`
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
          ${k(e.recentSignals)}
        </ul>
      </section>

      <section class="panel panel-history" aria-labelledby="timeline-heading">
        <p class="section-label">Recent interactions</p>
        <h2 id="timeline-heading">Companion timeline</h2>
        <div class="interaction-list">
          ${$(e.recentInteractions)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${C(e.vitals)}
        </div>
      </section>
    </div>
  `}function m(t){const e=t instanceof Error?t.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${i(e)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function M(){return`
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
          <div class="note-stack">
            <label class="note-label" for="action-note">Interaction note</label>
            <textarea
              class="note-input"
              id="action-note"
              data-role="action-note"
              rows="3"
              maxlength="160"
              placeholder="Optional note for the next pat, feed, or wake."
            ></textarea>
            <p class="note-hint">Optional context travels into the companion timeline.</p>
          </div>
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
  `}async function x(t,{adapter:e=h()}={}){if(!t)throw new Error("A target element is required to render the pet companion surface.");t.innerHTML=M();const s=t.querySelector('[data-role="content"]'),l=t.querySelector('[data-action="refresh"]'),n=t.querySelector('[data-role="adapter-status"]'),a=t.querySelector('[data-role="action-note"]'),o=[...t.querySelectorAll('[data-role="action-buttons"] [data-action]')];function c(r){l.disabled=r,o.forEach(p=>{p.disabled=r}),a&&(a.disabled=r)}async function d(){c(!0),l.textContent="Refreshing...",n.textContent="Adapter: syncing local loop";try{const r=await e.getCompanionState(),p=f(r);s.innerHTML=T(p),n.textContent=`Adapter: ${p.adapterLabel}`}catch(r){s.innerHTML=m(r),n.textContent="Adapter: degraded"}finally{c(!1),l.textContent="Refresh mood"}}for(const r of o)r.addEventListener("click",async()=>{const p=r.getAttribute("data-action");if(!p||typeof e.performAction!="function")return;const b=typeof(a==null?void 0:a.value)=="string"?a.value.trim():"";c(!0),n.textContent=`Adapter: sending ${p}`;try{await e.performAction(p,b||void 0),a&&(a.value=""),await d()}catch(g){s.innerHTML=m(g),n.textContent="Adapter: action failed",c(!1)}});return l.addEventListener("click",()=>{d()}),await d(),{reload:d}}const u=document.getElementById("app");u&&x(u,{adapter:w()}).catch(t=>{u.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${t instanceof Error?t.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
