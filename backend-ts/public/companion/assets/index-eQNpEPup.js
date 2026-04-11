(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))l(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&l(i)}).observe(document,{childList:!0,subtree:!0});function t(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function l(n){if(n.ep)return;n.ep=!0;const o=t(n);fetch(n.href,o)}})();const O=Object.freeze({petName:"Mochi",statusLine:"Idle on the browser ledge, listening for the next check-in.",loopMode:"Local placeholder loop",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Local stub",loopHint:"Swap this adapter with a real pet core endpoint when the contract is ready.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a light status ping."},memoryTitle:"Short-term memory",memorySummary:"Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays local until the real API is wired in."],recentInteractions:[{kind:"pat",title:"Pat interaction",detail:"A calm pat kept Mochi settled on the browser ledge.",timestamp:"2026-04-10T03:28:00.000Z",source:"Local Stub"},{kind:"signal",title:"Status pulse",detail:"The local adapter emitted a lightweight keep-alive signal.",timestamp:"2026-04-10T03:30:00.000Z",source:"Local Stub"}]});function M(a){return JSON.parse(JSON.stringify(a))}function $(a=O){return{async getCompanionState(){return await Promise.resolve(),M(a)}}}function N({endpoint:a="/companion/state",actionEndpoint:e="/companion/actions",fetchImpl:t=(n=>(n=globalThis.fetch)==null?void 0:n.bind(globalThis))(),fallback:l=$()}={}){return{async getCompanionState(){if(typeof t!="function")return l.getCompanionState();try{const o=await t(a,{headers:{Accept:"application/json"}});if(!o.ok)throw new Error(`companion_state_${o.status}`);const i=await o.json();if(!i||typeof i!="object")throw new Error("companion_state_invalid");return i}catch{return l.getCompanionState()}},async performAction(o,i){if(typeof t!="function")return{ok:!1,fallback:!0};const u=await t(e,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({action:o,note:i})});if(!u.ok)throw new Error(`companion_action_${u.status}`);return u.json()}}}const E=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],P=["Local companion loop has not reported any recent signals yet."],F=[{kind:"signal",title:"Companion signal pending",detail:"No structured interaction timeline is available yet.",timestamp:"Pending",source:"Local stub"}],x=["all","pat","feed","wake","signal","fallback"];function j(a){const e=String(a??"").trim().toLowerCase();return e==="pat"||e==="feed"||e==="wake"||e==="signal"?e:e==="fallback"?"fallback":"signal"}function B(a){const e=String((a==null?void 0:a.source)??"").trim().toLowerCase(),t=String((a==null?void 0:a.title)??"").trim().toLowerCase();return e.includes("fallback")||t.includes("fallback")?"fallback":t.includes("pat")?"pat":t.includes("feed")?"feed":t.includes("wake")?"wake":"signal"}function L(a){return a==="all"?"All":a==="pat"?"Pat":a==="feed"?"Feed":a==="wake"?"Wake":a==="fallback"?"Fallback":"Signal"}function f(a){const e=String(a??"").trim().toLowerCase();return x.includes(e)?e:"all"}function H(a){const e=f(a);return e==="pat"?{label:"Pat note",placeholder:"Optional note for the next pat.",hint:"Describe the comfort, bond, or calming signal you want the timeline to capture."}:e==="feed"?{label:"Feed note",placeholder:"Optional note for the next feed.",hint:"Add snack, refill, or appetite context so the feed entry reads clearly later."}:e==="wake"?{label:"Wake note",placeholder:"Optional note for the next wake.",hint:"Explain the nudge or prompt that should bring the companion back into motion."}:{label:"Interaction note",placeholder:"Optional note for the next pat, feed, or wake.",hint:"Optional context travels into the companion timeline."}}function r(a){return String(a).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function m(a){return`${a.toISOString().slice(0,16).replace("T"," ")} UTC`}function w(a,e,t,l){const n=Math.max(1,Math.round(Math.abs(a)/e)),o=n===1?t:l;return a>=0?`${n} ${o} ago`:`in ${n} ${o}`}function R(a){const e=String(a??"").trim();if(!e||e.toLowerCase()==="pending")return{label:e||"Pending",exact:"",machine:""};const t=new Date(e);if(Number.isNaN(t.getTime()))return{label:e,exact:"",machine:""};const l=Math.round((Date.now()-t.getTime())/1e3),n=Math.abs(l);return n<45?{label:l>=0?"just now":"in moments",exact:m(t),machine:t.toISOString()}:n<60*60?{label:w(l,60,"min","mins"),exact:m(t),machine:t.toISOString()}:n<60*60*24?{label:w(l,60*60,"hour","hours"),exact:m(t),machine:t.toISOString()}:n<60*60*24*7?{label:w(l,60*60*24,"day","days"),exact:m(t),machine:t.toISOString()}:{label:m(t),exact:m(t),machine:t.toISOString()}}function I(a){const e=a&&typeof a=="object"?a:{},t=e.mood&&typeof e.mood=="object"?e.mood:{},l=Array.isArray(e.vitals)&&e.vitals.length?e.vitals:E,n=Array.isArray(e.recentSignals)&&e.recentSignals.length?e.recentSignals:P,o=Array.isArray(e.recentInteractions)&&e.recentInteractions.length?e.recentInteractions.map(i=>({kind:j((i==null?void 0:i.kind)||B(i)),title:(i==null?void 0:i.title)||"Companion signal",detail:(i==null?void 0:i.detail)||"No detail published yet.",timestamp:(i==null?void 0:i.timestamp)||"Pending",source:(i==null?void 0:i.source)||"Memory"})):F;return{petName:e.petName||"Companion",statusLine:e.statusLine||"Waiting for the first local update.",loopMode:e.loopMode||"Local placeholder loop",lastCheckIn:e.lastCheckIn||"Pending",adapterLabel:e.adapterLabel||"Local stub",loopHint:e.loopHint||"Wire a real endpoint later without changing the browser shell.",mood:{label:t.label||"Settling",note:t.note||"No mood note has been published yet."},memoryTitle:e.memoryTitle||"Memory summary",memorySummary:e.memorySummary||"No memory summary is available yet. The prototype stays useful even before backend contracts exist.",vitals:l,recentSignals:n,recentInteractions:o}}function q(a){return a.map(e=>`
        <article class="metric-card">
          <span class="metric-label">${r(e.label||"State")}</span>
          <strong class="metric-value">${r(e.value||"Unknown")}</strong>
        </article>
      `).join("")}function _(a){return a.map(e=>`<li class="signal-item">${r(e)}</li>`).join("")}function z(a){const e=a.reduce((t,l)=>(t.all+=1,t[l.kind]=(t[l.kind]||0)+1,t),{all:0,pat:0,feed:0,wake:0,signal:0,fallback:0});return x.map(t=>({kind:t,label:L(t),count:e[t]||0}))}function U(a,e){return z(a).map(t=>`
        <button
          class="timeline-filter${t.kind===e?" is-active":""}"
          type="button"
          data-role="timeline-filter"
          data-filter-kind="${r(t.kind)}"
          aria-pressed="${t.kind===e?"true":"false"}"
        >
          <span>${r(t.label)}</span>
          <span class="timeline-filter-count">${r(t.count)}</span>
        </button>
      `).join("")}function K(a,e){const t=f(e),l=t==="all"?a:a.filter(n=>n.kind===t);return l.length===0?`
      <div class="timeline-empty" data-role="timeline-empty">
        No ${r(L(t).toLowerCase())} interactions yet.
      </div>
    `:l.map(n=>{const o=R(n.timestamp),i=L(n.kind);return`
        <article class="interaction-card interaction-card-${r(n.kind)}">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${r(n.title)}</h3>
              <p class="interaction-detail">${r(n.detail)}</p>
            </div>
            <div class="interaction-meta">
              <span class="interaction-kind interaction-kind-${r(n.kind)}">${r(i)}</span>
              <span class="interaction-source">${r(n.source)}</span>
            </div>
          </div>
          <time
            class="interaction-time"
            ${o.machine?`datetime="${r(o.machine)}"`:""}
            ${o.exact?`title="${r(o.exact)}"`:""}
          >${r(o.label)}</time>
        </article>
      `}).join("")}function D(a,e="all"){const t=I(a),l=f(e);return`
    <div class="panel-grid">
      <section class="panel panel-pet" aria-labelledby="companion-name">
        <div class="pet-avatar" aria-hidden="true">
          <span class="pet-core"></span>
        </div>
        <div class="panel-copy-stack">
          <p class="section-label">Companion</p>
          <h2 id="companion-name">${r(t.petName)}</h2>
          <p class="status-line">${r(t.statusLine)}</p>
          <dl class="meta-list">
            <div>
              <dt>Loop mode</dt>
              <dd>${r(t.loopMode)}</dd>
            </div>
            <div>
              <dt>Last check-in</dt>
              <dd>${r(t.lastCheckIn)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="panel" aria-labelledby="mood-heading">
        <p class="section-label">Mood</p>
        <h2 id="mood-heading">${r(t.mood.label)}</h2>
        <p class="panel-copy">${r(t.mood.note)}</p>
        <p class="hint-text">${r(t.loopHint)}</p>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${r(t.memoryTitle)}</h2>
        <p class="panel-copy">${r(t.memorySummary)}</p>
        <ul class="signal-list">
          ${_(t.recentSignals)}
        </ul>
      </section>

      <section class="panel panel-history" aria-labelledby="timeline-heading">
        <p class="section-label">Recent interactions</p>
        <h2 id="timeline-heading">Companion timeline</h2>
        <div class="timeline-filter-bar" data-role="timeline-filter-bar">
          ${U(t.recentInteractions,l)}
        </div>
        <div class="interaction-list">
          ${K(t.recentInteractions,l)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${q(t.vitals)}
        </div>
      </section>
    </div>
  `}function C(a){const e=a instanceof Error?a.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${r(e)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function W(){return`
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
            <label class="note-label" data-role="action-note-label" for="action-note">Interaction note</label>
            <textarea
              class="note-input"
              id="action-note"
              data-role="action-note"
              rows="3"
              maxlength="160"
              placeholder="Optional note for the next pat, feed, or wake."
            ></textarea>
            <p class="note-hint" data-role="action-note-hint">Optional context travels into the companion timeline.</p>
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
  `}async function J(a,{adapter:e=$()}={}){if(!a)throw new Error("A target element is required to render the pet companion surface.");a.innerHTML=W();const t=a.querySelector('[data-role="content"]'),l=a.querySelector('[data-action="refresh"]'),n=a.querySelector('[data-role="adapter-status"]'),o=a.querySelector('[data-role="action-note"]'),i=a.querySelector('[data-role="action-note-label"]'),u=a.querySelector('[data-role="action-note-hint"]'),y=[...a.querySelectorAll('[data-role="action-buttons"] [data-action]')];let d="all",h=null;function v(){y.forEach(s=>{const p=s.getAttribute("data-action")===d;s.classList.toggle("is-linked",p),s.setAttribute("data-filter-linked",p?"true":"false")})}function S(){const s=H(d);i&&(i.textContent=s.label),o&&(o.placeholder=s.placeholder,o.setAttribute("data-composer-kind",f(d))),u&&(u.textContent=s.hint)}function b(s){l.disabled=s,y.forEach(c=>{c.disabled=s}),o&&(o.disabled=s)}function A(){if(!h){v(),S();return}t.innerHTML=D(h,d),v(),S(),[...t.querySelectorAll('[data-role="timeline-filter"]')].forEach(c=>{c.addEventListener("click",()=>{const p=f(c.getAttribute("data-filter-kind"));p!==d&&(d=p,A())})})}async function g(){b(!0),l.textContent="Refreshing...",n.textContent="Adapter: syncing local loop";try{const s=await e.getCompanionState(),c=I(s);h=c,A(),n.textContent=`Adapter: ${c.adapterLabel}`}catch(s){h=null,t.innerHTML=C(s),n.textContent="Adapter: degraded"}finally{b(!1),l.textContent="Refresh mood"}}for(const s of y)s.addEventListener("click",async()=>{const c=s.getAttribute("data-action");if(!c||typeof e.performAction!="function")return;const p=typeof(o==null?void 0:o.value)=="string"?o.value.trim():"";b(!0),n.textContent=`Adapter: sending ${c}`;try{await e.performAction(c,p||void 0),d=f(c),o&&(o.value=""),await g()}catch(T){t.innerHTML=C(T),n.textContent="Adapter: action failed",b(!1)}});return l.addEventListener("click",()=>{g()}),v(),S(),await g(),{reload:g}}const k=document.getElementById("app");k&&J(k,{adapter:N()}).catch(a=>{k.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${a instanceof Error?a.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
