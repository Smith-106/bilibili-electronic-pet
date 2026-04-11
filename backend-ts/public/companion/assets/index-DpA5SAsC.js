(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function a(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(n){if(n.ep)return;n.ep=!0;const o=a(n);fetch(n.href,o)}})();const S=Object.freeze({petName:"Mochi",statusLine:"Idle on the browser ledge, listening for the next check-in.",loopMode:"Local placeholder loop",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Local stub",loopHint:"Swap this adapter with a real pet core endpoint when the contract is ready.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a light status ping."},memoryTitle:"Short-term memory",memorySummary:"Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays local until the real API is wired in."],recentInteractions:[{kind:"pat",title:"Pat interaction",detail:"A calm pat kept Mochi settled on the browser ledge.",timestamp:"2026-04-10T03:28:00.000Z",source:"Local Stub"},{kind:"signal",title:"Status pulse",detail:"The local adapter emitted a lightweight keep-alive signal.",timestamp:"2026-04-10T03:30:00.000Z",source:"Local Stub"}]});function w(t){return JSON.parse(JSON.stringify(t))}function b(t=S){return{async getCompanionState(){return await Promise.resolve(),w(t)}}}function L({endpoint:t="/companion/state",actionEndpoint:e="/companion/actions",fetchImpl:a=(n=>(n=globalThis.fetch)==null?void 0:n.bind(globalThis))(),fallback:s=b()}={}){return{async getCompanionState(){if(typeof a!="function")return s.getCompanionState();try{const o=await a(t,{headers:{Accept:"application/json"}});if(!o.ok)throw new Error(`companion_state_${o.status}`);const i=await o.json();if(!i||typeof i!="object")throw new Error("companion_state_invalid");return i}catch{return s.getCompanionState()}},async performAction(o,i){if(typeof a!="function")return{ok:!1,fallback:!0};const c=await a(e,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({action:o,note:i})});if(!c.ok)throw new Error(`companion_action_${c.status}`);return c.json()}}}const k=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],A=["Local companion loop has not reported any recent signals yet."],$=[{kind:"signal",title:"Companion signal pending",detail:"No structured interaction timeline is available yet.",timestamp:"Pending",source:"Local stub"}];function C(t){const e=String(t??"").trim().toLowerCase();return e==="pat"||e==="feed"||e==="wake"||e==="signal"?e:e==="fallback"?"fallback":"signal"}function T(t){const e=String((t==null?void 0:t.source)??"").trim().toLowerCase(),a=String((t==null?void 0:t.title)??"").trim().toLowerCase();return e.includes("fallback")||a.includes("fallback")?"fallback":a.includes("pat")?"pat":a.includes("feed")?"feed":a.includes("wake")?"wake":"signal"}function x(t){return t==="pat"?"Pat":t==="feed"?"Feed":t==="wake"?"Wake":t==="fallback"?"Fallback":"Signal"}function r(t){return String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function p(t){return`${t.toISOString().slice(0,16).replace("T"," ")} UTC`}function m(t,e,a,s){const n=Math.max(1,Math.round(Math.abs(t)/e)),o=n===1?a:s;return t>=0?`${n} ${o} ago`:`in ${n} ${o}`}function I(t){const e=String(t??"").trim();if(!e||e.toLowerCase()==="pending")return{label:e||"Pending",exact:"",machine:""};const a=new Date(e);if(Number.isNaN(a.getTime()))return{label:e,exact:"",machine:""};const s=Math.round((Date.now()-a.getTime())/1e3),n=Math.abs(s);return n<45?{label:s>=0?"just now":"in moments",exact:p(a),machine:a.toISOString()}:n<60*60?{label:m(s,60,"min","mins"),exact:p(a),machine:a.toISOString()}:n<60*60*24?{label:m(s,60*60,"hour","hours"),exact:p(a),machine:a.toISOString()}:n<60*60*24*7?{label:m(s,60*60*24,"day","days"),exact:p(a),machine:a.toISOString()}:{label:p(a),exact:p(a),machine:a.toISOString()}}function g(t){const e=t&&typeof t=="object"?t:{},a=e.mood&&typeof e.mood=="object"?e.mood:{},s=Array.isArray(e.vitals)&&e.vitals.length?e.vitals:k,n=Array.isArray(e.recentSignals)&&e.recentSignals.length?e.recentSignals:A,o=Array.isArray(e.recentInteractions)&&e.recentInteractions.length?e.recentInteractions.map(i=>({kind:C((i==null?void 0:i.kind)||T(i)),title:(i==null?void 0:i.title)||"Companion signal",detail:(i==null?void 0:i.detail)||"No detail published yet.",timestamp:(i==null?void 0:i.timestamp)||"Pending",source:(i==null?void 0:i.source)||"Memory"})):$;return{petName:e.petName||"Companion",statusLine:e.statusLine||"Waiting for the first local update.",loopMode:e.loopMode||"Local placeholder loop",lastCheckIn:e.lastCheckIn||"Pending",adapterLabel:e.adapterLabel||"Local stub",loopHint:e.loopHint||"Wire a real endpoint later without changing the browser shell.",mood:{label:a.label||"Settling",note:a.note||"No mood note has been published yet."},memoryTitle:e.memoryTitle||"Memory summary",memorySummary:e.memorySummary||"No memory summary is available yet. The prototype stays useful even before backend contracts exist.",vitals:s,recentSignals:n,recentInteractions:o}}function M(t){return t.map(e=>`
        <article class="metric-card">
          <span class="metric-label">${r(e.label||"State")}</span>
          <strong class="metric-value">${r(e.value||"Unknown")}</strong>
        </article>
      `).join("")}function N(t){return t.map(e=>`<li class="signal-item">${r(e)}</li>`).join("")}function O(t){return t.map(e=>{const a=I(e.timestamp),s=x(e.kind);return`
        <article class="interaction-card interaction-card-${r(e.kind)}">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${r(e.title)}</h3>
              <p class="interaction-detail">${r(e.detail)}</p>
            </div>
            <div class="interaction-meta">
              <span class="interaction-kind interaction-kind-${r(e.kind)}">${r(s)}</span>
              <span class="interaction-source">${r(e.source)}</span>
            </div>
          </div>
          <time
            class="interaction-time"
            ${a.machine?`datetime="${r(a.machine)}"`:""}
            ${a.exact?`title="${r(a.exact)}"`:""}
          >${r(a.label)}</time>
        </article>
      `}).join("")}function P(t){const e=g(t);return`
    <div class="panel-grid">
      <section class="panel panel-pet" aria-labelledby="companion-name">
        <div class="pet-avatar" aria-hidden="true">
          <span class="pet-core"></span>
        </div>
        <div class="panel-copy-stack">
          <p class="section-label">Companion</p>
          <h2 id="companion-name">${r(e.petName)}</h2>
          <p class="status-line">${r(e.statusLine)}</p>
          <dl class="meta-list">
            <div>
              <dt>Loop mode</dt>
              <dd>${r(e.loopMode)}</dd>
            </div>
            <div>
              <dt>Last check-in</dt>
              <dd>${r(e.lastCheckIn)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="panel" aria-labelledby="mood-heading">
        <p class="section-label">Mood</p>
        <h2 id="mood-heading">${r(e.mood.label)}</h2>
        <p class="panel-copy">${r(e.mood.note)}</p>
        <p class="hint-text">${r(e.loopHint)}</p>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${r(e.memoryTitle)}</h2>
        <p class="panel-copy">${r(e.memorySummary)}</p>
        <ul class="signal-list">
          ${N(e.recentSignals)}
        </ul>
      </section>

      <section class="panel panel-history" aria-labelledby="timeline-heading">
        <p class="section-label">Recent interactions</p>
        <h2 id="timeline-heading">Companion timeline</h2>
        <div class="interaction-list">
          ${O(e.recentInteractions)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${M(e.vitals)}
        </div>
      </section>
    </div>
  `}function f(t){const e=t instanceof Error?t.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${r(e)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function E(){return`
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
  `}async function j(t,{adapter:e=b()}={}){if(!t)throw new Error("A target element is required to render the pet companion surface.");t.innerHTML=E();const a=t.querySelector('[data-role="content"]'),s=t.querySelector('[data-action="refresh"]'),n=t.querySelector('[data-role="adapter-status"]'),o=t.querySelector('[data-role="action-note"]'),i=[...t.querySelectorAll('[data-role="action-buttons"] [data-action]')];function c(l){s.disabled=l,i.forEach(d=>{d.disabled=l}),o&&(o.disabled=l)}async function u(){c(!0),s.textContent="Refreshing...",n.textContent="Adapter: syncing local loop";try{const l=await e.getCompanionState(),d=g(l);a.innerHTML=P(d),n.textContent=`Adapter: ${d.adapterLabel}`}catch(l){a.innerHTML=f(l),n.textContent="Adapter: degraded"}finally{c(!1),s.textContent="Refresh mood"}}for(const l of i)l.addEventListener("click",async()=>{const d=l.getAttribute("data-action");if(!d||typeof e.performAction!="function")return;const v=typeof(o==null?void 0:o.value)=="string"?o.value.trim():"";c(!0),n.textContent=`Adapter: sending ${d}`;try{await e.performAction(d,v||void 0),o&&(o.value=""),await u()}catch(y){a.innerHTML=f(y),n.textContent="Adapter: action failed",c(!1)}});return s.addEventListener("click",()=>{u()}),await u(),{reload:u}}const h=document.getElementById("app");h&&j(h,{adapter:L()}).catch(t=>{h.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${t instanceof Error?t.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
