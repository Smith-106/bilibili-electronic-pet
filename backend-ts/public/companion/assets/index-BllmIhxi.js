(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&r(i)}).observe(document,{childList:!0,subtree:!0});function a(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(n){if(n.ep)return;n.ep=!0;const o=a(n);fetch(n.href,o)}})();const E=Object.freeze({petName:"Mochi",statusLine:"Idle on the browser ledge, listening for the next check-in.",loopMode:"Local placeholder loop",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Local stub",loopHint:"Swap this adapter with a real pet core endpoint when the contract is ready.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a light status ping."},memoryTitle:"Short-term memory",memorySummary:"Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays local until the real API is wired in."],recentInteractions:[{kind:"pat",title:"Pat interaction",detail:"A calm pat kept Mochi settled on the browser ledge.",timestamp:"2026-04-10T03:28:00.000Z",source:"Local Stub"},{kind:"signal",title:"Status pulse",detail:"The local adapter emitted a lightweight keep-alive signal.",timestamp:"2026-04-10T03:30:00.000Z",source:"Local Stub"}]});function M(t){return JSON.parse(JSON.stringify(t))}function I(t=E){return{async getCompanionState(){return await Promise.resolve(),M(t)}}}function P({endpoint:t="/companion/state",actionEndpoint:e="/companion/actions",fetchImpl:a=(n=>(n=globalThis.fetch)==null?void 0:n.bind(globalThis))(),fallback:r=I()}={}){return{async getCompanionState(){if(typeof a!="function")return r.getCompanionState();try{const o=await a(t,{headers:{Accept:"application/json"}});if(!o.ok)throw new Error(`companion_state_${o.status}`);const i=await o.json();if(!i||typeof i!="object")throw new Error("companion_state_invalid");return i}catch{return r.getCompanionState()}},async performAction(o,i){if(typeof a!="function")return{ok:!1,fallback:!0};const f=await a(e,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({action:o,note:i})});if(!f.ok)throw new Error(`companion_action_${f.status}`);return f.json()}}}const F=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],B=["Local companion loop has not reported any recent signals yet."],j=[{kind:"signal",title:"Companion signal pending",detail:"No structured interaction timeline is available yet.",timestamp:"Pending",source:"Local stub"}],O=["all","pat","feed","wake","signal","fallback"],S=["pat","feed","wake"];function H(t){const e=String(t??"").trim().toLowerCase();return e==="pat"||e==="feed"||e==="wake"||e==="signal"?e:e==="fallback"?"fallback":"signal"}function q(t){const e=String((t==null?void 0:t.source)??"").trim().toLowerCase(),a=String((t==null?void 0:t.title)??"").trim().toLowerCase();return e.includes("fallback")||a.includes("fallback")?"fallback":a.includes("pat")?"pat":a.includes("feed")?"feed":a.includes("wake")?"wake":"signal"}function k(t){return t==="all"?"All":t==="pat"?"Pat":t==="feed"?"Feed":t==="wake"?"Wake":t==="fallback"?"Fallback":"Signal"}function p(t){const e=String(t??"").trim().toLowerCase();return O.includes(e)?e:"all"}function R(t){return S.includes(p(t))}function _(t){const e=p(t);return e==="pat"?{label:"Pat note",placeholder:"Optional note for the next pat.",hint:"Describe the comfort, bond, or calming signal you want the timeline to capture."}:e==="feed"?{label:"Feed note",placeholder:"Optional note for the next feed.",hint:"Add snack, refill, or appetite context so the feed entry reads clearly later."}:e==="wake"?{label:"Wake note",placeholder:"Optional note for the next wake.",hint:"Explain the nudge or prompt that should bring the companion back into motion."}:{label:"Interaction note",placeholder:"Optional note for the next pat, feed, or wake.",hint:"Optional context travels into the companion timeline."}}function z(t){const e=p(t);return R(e)?null:e==="signal"?{message:"Signal entries are read-only snapshots. Pick Pat, Feed, or Wake to focus the composer on a writable action.",shortcuts:S}:e==="fallback"?{message:"Fallback entries describe degraded state only. Switch to Pat, Feed, or Wake before drafting the next note.",shortcuts:S}:{message:"Notes publish through Pat, Feed, or Wake actions. Pick one to focus the composer before writing.",shortcuts:S}}function l(t){return String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function b(t){return`${t.toISOString().slice(0,16).replace("T"," ")} UTC`}function $(t,e,a,r){const n=Math.max(1,Math.round(Math.abs(t)/e)),o=n===1?a:r;return t>=0?`${n} ${o} ago`:`in ${n} ${o}`}function W(t){const e=String(t??"").trim();if(!e||e.toLowerCase()==="pending")return{label:e||"Pending",exact:"",machine:""};const a=new Date(e);if(Number.isNaN(a.getTime()))return{label:e,exact:"",machine:""};const r=Math.round((Date.now()-a.getTime())/1e3),n=Math.abs(r);return n<45?{label:r>=0?"just now":"in moments",exact:b(a),machine:a.toISOString()}:n<60*60?{label:$(r,60,"min","mins"),exact:b(a),machine:a.toISOString()}:n<60*60*24?{label:$(r,60*60,"hour","hours"),exact:b(a),machine:a.toISOString()}:n<60*60*24*7?{label:$(r,60*60*24,"day","days"),exact:b(a),machine:a.toISOString()}:{label:b(a),exact:b(a),machine:a.toISOString()}}function N(t){const e=t&&typeof t=="object"?t:{},a=e.mood&&typeof e.mood=="object"?e.mood:{},r=Array.isArray(e.vitals)&&e.vitals.length?e.vitals:F,n=Array.isArray(e.recentSignals)&&e.recentSignals.length?e.recentSignals:B,o=Array.isArray(e.recentInteractions)&&e.recentInteractions.length?e.recentInteractions.map(i=>({kind:H((i==null?void 0:i.kind)||q(i)),title:(i==null?void 0:i.title)||"Companion signal",detail:(i==null?void 0:i.detail)||"No detail published yet.",timestamp:(i==null?void 0:i.timestamp)||"Pending",source:(i==null?void 0:i.source)||"Memory"})):j;return{petName:e.petName||"Companion",statusLine:e.statusLine||"Waiting for the first local update.",loopMode:e.loopMode||"Local placeholder loop",lastCheckIn:e.lastCheckIn||"Pending",adapterLabel:e.adapterLabel||"Local stub",loopHint:e.loopHint||"Wire a real endpoint later without changing the browser shell.",mood:{label:a.label||"Settling",note:a.note||"No mood note has been published yet."},memoryTitle:e.memoryTitle||"Memory summary",memorySummary:e.memorySummary||"No memory summary is available yet. The prototype stays useful even before backend contracts exist.",vitals:r,recentSignals:n,recentInteractions:o}}function K(t){return t.map(e=>`
        <article class="metric-card">
          <span class="metric-label">${l(e.label||"State")}</span>
          <strong class="metric-value">${l(e.value||"Unknown")}</strong>
        </article>
      `).join("")}function U(t){return t.map(e=>`<li class="signal-item">${l(e)}</li>`).join("")}function D(t){const e=t.reduce((a,r)=>(a.all+=1,a[r.kind]=(a[r.kind]||0)+1,a),{all:0,pat:0,feed:0,wake:0,signal:0,fallback:0});return O.map(a=>({kind:a,label:k(a),count:e[a]||0}))}function G(t,e){return D(t).map(a=>`
        <button
          class="timeline-filter${a.kind===e?" is-active":""}"
          type="button"
          data-role="timeline-filter"
          data-filter-kind="${l(a.kind)}"
          aria-pressed="${a.kind===e?"true":"false"}"
        >
          <span>${l(a.label)}</span>
          <span class="timeline-filter-count">${l(a.count)}</span>
        </button>
      `).join("")}function J(t,e){const a=p(e),r=a==="all"?t:t.filter(n=>n.kind===a);return r.length===0?`
      <div class="timeline-empty" data-role="timeline-empty">
        No ${l(k(a).toLowerCase())} interactions yet.
      </div>
    `:r.map(n=>{const o=W(n.timestamp),i=k(n.kind);return`
        <article class="interaction-card interaction-card-${l(n.kind)}">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${l(n.title)}</h3>
              <p class="interaction-detail">${l(n.detail)}</p>
            </div>
            <div class="interaction-meta">
              <span class="interaction-kind interaction-kind-${l(n.kind)}">${l(i)}</span>
              <span class="interaction-source">${l(n.source)}</span>
            </div>
          </div>
          <time
            class="interaction-time"
            ${o.machine?`datetime="${l(o.machine)}"`:""}
            ${o.exact?`title="${l(o.exact)}"`:""}
          >${l(o.label)}</time>
        </article>
      `}).join("")}function V(t,e="all"){const a=N(t),r=p(e);return`
    <div class="panel-grid">
      <section class="panel panel-pet" aria-labelledby="companion-name">
        <div class="pet-avatar" aria-hidden="true">
          <span class="pet-core"></span>
        </div>
        <div class="panel-copy-stack">
          <p class="section-label">Companion</p>
          <h2 id="companion-name">${l(a.petName)}</h2>
          <p class="status-line">${l(a.statusLine)}</p>
          <dl class="meta-list">
            <div>
              <dt>Loop mode</dt>
              <dd>${l(a.loopMode)}</dd>
            </div>
            <div>
              <dt>Last check-in</dt>
              <dd>${l(a.lastCheckIn)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="panel" aria-labelledby="mood-heading">
        <p class="section-label">Mood</p>
        <h2 id="mood-heading">${l(a.mood.label)}</h2>
        <p class="panel-copy">${l(a.mood.note)}</p>
        <p class="hint-text">${l(a.loopHint)}</p>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${l(a.memoryTitle)}</h2>
        <p class="panel-copy">${l(a.memorySummary)}</p>
        <ul class="signal-list">
          ${U(a.recentSignals)}
        </ul>
      </section>

      <section class="panel panel-history" aria-labelledby="timeline-heading">
        <p class="section-label">Recent interactions</p>
        <h2 id="timeline-heading">Companion timeline</h2>
        <div class="timeline-filter-bar" data-role="timeline-filter-bar">
          ${G(a.recentInteractions,r)}
        </div>
        <div class="interaction-list">
          ${J(a.recentInteractions,r)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${K(a.vitals)}
        </div>
      </section>
    </div>
  `}function x(t){const e=t instanceof Error?t.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${l(e)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function Z(){return`
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
            <div class="composer-guide" data-role="composer-guide" hidden></div>
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
  `}async function Q(t,{adapter:e=I()}={}){if(!t)throw new Error("A target element is required to render the pet companion surface.");t.innerHTML=Z();const a=t.querySelector('[data-role="content"]'),r=t.querySelector('[data-action="refresh"]'),n=t.querySelector('[data-role="adapter-status"]'),o=t.querySelector('[data-role="action-note"]'),i=t.querySelector('[data-role="action-note-label"]'),f=t.querySelector('[data-role="action-note-hint"]'),h=t.querySelector('[data-role="composer-guide"]'),w=[...t.querySelectorAll('[data-role="action-buttons"] [data-action]')];let d="all",g=null;function L(){w.forEach(s=>{const u=s.getAttribute("data-action")===d;s.classList.toggle("is-linked",u),s.setAttribute("data-filter-linked",u?"true":"false")})}function A(){const s=_(d),c=z(d);i&&(i.textContent=s.label),o&&(o.placeholder=s.placeholder,o.setAttribute("data-composer-kind",p(d))),f&&(f.textContent=s.hint),h&&(c?(h.hidden=!1,h.innerHTML=`
          <p class="composer-guide-copy">${l(c.message)}</p>
          <div class="composer-shortcuts">
            ${c.shortcuts.map(m=>`
                  <button
                    class="composer-shortcut"
                    type="button"
                    data-role="composer-shortcut"
                    data-shortcut-kind="${l(m)}"
                  >${l(k(m))}</button>
                `).join("")}
          </div>
        `,[...h.querySelectorAll('[data-role="composer-shortcut"]')].forEach(m=>{m.addEventListener("click",()=>{d=p(m.getAttribute("data-shortcut-kind")),C(),o==null||o.focus()})})):(h.innerHTML="",h.hidden=!0))}function y(s){r.disabled=s,w.forEach(c=>{c.disabled=s}),o&&(o.disabled=s)}function C(){if(!g){L(),A();return}a.innerHTML=V(g,d),L(),A(),[...a.querySelectorAll('[data-role="timeline-filter"]')].forEach(c=>{c.addEventListener("click",()=>{const u=p(c.getAttribute("data-filter-kind"));u!==d&&(d=u,C())})})}async function v(){y(!0),r.textContent="Refreshing...",n.textContent="Adapter: syncing local loop";try{const s=await e.getCompanionState(),c=N(s);g=c,C(),n.textContent=`Adapter: ${c.adapterLabel}`}catch(s){g=null,a.innerHTML=x(s),n.textContent="Adapter: degraded"}finally{y(!1),r.textContent="Refresh mood"}}for(const s of w)s.addEventListener("click",async()=>{const c=s.getAttribute("data-action");if(!c||typeof e.performAction!="function")return;const u=typeof(o==null?void 0:o.value)=="string"?o.value.trim():"";y(!0),n.textContent=`Adapter: sending ${c}`;try{await e.performAction(c,u||void 0),d=p(c),o&&(o.value=""),await v()}catch(m){a.innerHTML=x(m),n.textContent="Adapter: action failed",y(!1)}});return r.addEventListener("click",()=>{v()}),L(),A(),await v(),{reload:v}}const T=document.getElementById("app");T&&Q(T,{adapter:P()}).catch(t=>{T.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${t instanceof Error?t.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
