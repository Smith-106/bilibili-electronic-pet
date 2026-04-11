(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))l(o);new MutationObserver(o=>{for(const n of o)if(n.type==="childList")for(const r of n.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&l(r)}).observe(document,{childList:!0,subtree:!0});function a(o){const n={};return o.integrity&&(n.integrity=o.integrity),o.referrerPolicy&&(n.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?n.credentials="include":o.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function l(o){if(o.ep)return;o.ep=!0;const n=a(o);fetch(o.href,n)}})();const P=Object.freeze({petName:"Mochi",statusLine:"Idle on the browser ledge, listening for the next check-in.",loopMode:"Local placeholder loop",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Local stub",loopHint:"Swap this adapter with a real pet core endpoint when the contract is ready.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a light status ping."},memoryTitle:"Short-term memory",memorySummary:"Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays local until the real API is wired in."],recentInteractions:[{kind:"pat",title:"Pat interaction",detail:"A calm pat kept Mochi settled on the browser ledge.",timestamp:"2026-04-10T03:28:00.000Z",source:"Local Stub"},{kind:"signal",title:"Status pulse",detail:"The local adapter emitted a lightweight keep-alive signal.",timestamp:"2026-04-10T03:30:00.000Z",source:"Local Stub"}]});function F(t){return JSON.parse(JSON.stringify(t))}function O(t=P){return{async getCompanionState(){return await Promise.resolve(),F(t)}}}function B({endpoint:t="/companion/state",actionEndpoint:e="/companion/actions",fetchImpl:a=(o=>(o=globalThis.fetch)==null?void 0:o.bind(globalThis))(),fallback:l=O()}={}){return{async getCompanionState(){if(typeof a!="function")return l.getCompanionState();try{const n=await a(t,{headers:{Accept:"application/json"}});if(!n.ok)throw new Error(`companion_state_${n.status}`);const r=await n.json();if(!r||typeof r!="object")throw new Error("companion_state_invalid");return r}catch{return l.getCompanionState()}},async performAction(n,r){if(typeof a!="function")return{ok:!1,fallback:!0};const f=await a(e,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({action:n,note:r})});if(!f.ok)throw new Error(`companion_action_${f.status}`);return f.json()}}}const H=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],j=["Local companion loop has not reported any recent signals yet."],q=[{kind:"signal",title:"Companion signal pending",detail:"No structured interaction timeline is available yet.",timestamp:"Pending",source:"Local stub"}],E=["all","pat","feed","wake","signal","fallback"],k=["pat","feed","wake"];function R(t){const e=String(t??"").trim().toLowerCase();return e==="pat"||e==="feed"||e==="wake"||e==="signal"?e:e==="fallback"?"fallback":"signal"}function _(t){const e=String((t==null?void 0:t.source)??"").trim().toLowerCase(),a=String((t==null?void 0:t.title)??"").trim().toLowerCase();return e.includes("fallback")||a.includes("fallback")?"fallback":a.includes("pat")?"pat":a.includes("feed")?"feed":a.includes("wake")?"wake":"signal"}function w(t){return t==="all"?"All":t==="pat"?"Pat":t==="feed"?"Feed":t==="wake"?"Wake":t==="fallback"?"Fallback":"Signal"}function m(t){const e=String(t??"").trim().toLowerCase();return E.includes(e)?e:"all"}function z(t){return k.includes(m(t))}function W(t){const e=m(t);return e==="pat"?{label:"Pat note",placeholder:"Optional note for the next pat.",hint:"Describe the comfort, bond, or calming signal you want the timeline to capture."}:e==="feed"?{label:"Feed note",placeholder:"Optional note for the next feed.",hint:"Add snack, refill, or appetite context so the feed entry reads clearly later."}:e==="wake"?{label:"Wake note",placeholder:"Optional note for the next wake.",hint:"Explain the nudge or prompt that should bring the companion back into motion."}:{label:"Interaction note",placeholder:"Optional note for the next pat, feed, or wake.",hint:"Optional context travels into the companion timeline."}}function K(t){const e=m(t);return z(e)?null:e==="signal"?{message:"Signal entries are read-only snapshots. Pick Pat, Feed, or Wake to focus the composer on a writable action.",shortcuts:k}:e==="fallback"?{message:"Fallback entries describe degraded state only. Switch to Pat, Feed, or Wake before drafting the next note.",shortcuts:k}:{message:"Notes publish through Pat, Feed, or Wake actions. Pick one to focus the composer before writing.",shortcuts:k}}function U(t){const e=m(t);return e==="pat"?{label:"Suggested pat notes",templates:["Soft pat settled Mochi into a calmer loop.","Bond signal ticked upward after a gentle tap.","Comfort pass landed right on time for the next check-in."]}:e==="feed"?{label:"Suggested feed notes",templates:["Refilled snack tray and appetite stabilized.","Quick bite restored energy before the next loop window.","Treat drop landed cleanly and hunger signal eased."]}:e==="wake"?{label:"Suggested wake notes",templates:["Bright nudge reopened the interaction window.","Wake pulse brought Mochi back into active mode.","Gentle prompt resumed the browser buddy loop."]}:null}function i(t){return String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function g(t){return`${t.toISOString().slice(0,16).replace("T"," ")} UTC`}function x(t,e,a,l){const o=Math.max(1,Math.round(Math.abs(t)/e)),n=o===1?a:l;return t>=0?`${o} ${n} ago`:`in ${o} ${n}`}function D(t){const e=String(t??"").trim();if(!e||e.toLowerCase()==="pending")return{label:e||"Pending",exact:"",machine:""};const a=new Date(e);if(Number.isNaN(a.getTime()))return{label:e,exact:"",machine:""};const l=Math.round((Date.now()-a.getTime())/1e3),o=Math.abs(l);return o<45?{label:l>=0?"just now":"in moments",exact:g(a),machine:a.toISOString()}:o<60*60?{label:x(l,60,"min","mins"),exact:g(a),machine:a.toISOString()}:o<60*60*24?{label:x(l,60*60,"hour","hours"),exact:g(a),machine:a.toISOString()}:o<60*60*24*7?{label:x(l,60*60*24,"day","days"),exact:g(a),machine:a.toISOString()}:{label:g(a),exact:g(a),machine:a.toISOString()}}function N(t){const e=t&&typeof t=="object"?t:{},a=e.mood&&typeof e.mood=="object"?e.mood:{},l=Array.isArray(e.vitals)&&e.vitals.length?e.vitals:H,o=Array.isArray(e.recentSignals)&&e.recentSignals.length?e.recentSignals:j,n=Array.isArray(e.recentInteractions)&&e.recentInteractions.length?e.recentInteractions.map(r=>({kind:R((r==null?void 0:r.kind)||_(r)),title:(r==null?void 0:r.title)||"Companion signal",detail:(r==null?void 0:r.detail)||"No detail published yet.",timestamp:(r==null?void 0:r.timestamp)||"Pending",source:(r==null?void 0:r.source)||"Memory"})):q;return{petName:e.petName||"Companion",statusLine:e.statusLine||"Waiting for the first local update.",loopMode:e.loopMode||"Local placeholder loop",lastCheckIn:e.lastCheckIn||"Pending",adapterLabel:e.adapterLabel||"Local stub",loopHint:e.loopHint||"Wire a real endpoint later without changing the browser shell.",mood:{label:a.label||"Settling",note:a.note||"No mood note has been published yet."},memoryTitle:e.memoryTitle||"Memory summary",memorySummary:e.memorySummary||"No memory summary is available yet. The prototype stays useful even before backend contracts exist.",vitals:l,recentSignals:o,recentInteractions:n}}function G(t){return t.map(e=>`
        <article class="metric-card">
          <span class="metric-label">${i(e.label||"State")}</span>
          <strong class="metric-value">${i(e.value||"Unknown")}</strong>
        </article>
      `).join("")}function J(t){return t.map(e=>`<li class="signal-item">${i(e)}</li>`).join("")}function Q(t){const e=t.reduce((a,l)=>(a.all+=1,a[l.kind]=(a[l.kind]||0)+1,a),{all:0,pat:0,feed:0,wake:0,signal:0,fallback:0});return E.map(a=>({kind:a,label:w(a),count:e[a]||0}))}function V(t,e){return Q(t).map(a=>`
        <button
          class="timeline-filter${a.kind===e?" is-active":""}"
          type="button"
          data-role="timeline-filter"
          data-filter-kind="${i(a.kind)}"
          aria-pressed="${a.kind===e?"true":"false"}"
        >
          <span>${i(a.label)}</span>
          <span class="timeline-filter-count">${i(a.count)}</span>
        </button>
      `).join("")}function Z(t,e){const a=m(e),l=a==="all"?t:t.filter(o=>o.kind===a);return l.length===0?`
      <div class="timeline-empty" data-role="timeline-empty">
        No ${i(w(a).toLowerCase())} interactions yet.
      </div>
    `:l.map(o=>{const n=D(o.timestamp),r=w(o.kind);return`
        <article class="interaction-card interaction-card-${i(o.kind)}">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${i(o.title)}</h3>
              <p class="interaction-detail">${i(o.detail)}</p>
            </div>
            <div class="interaction-meta">
              <span class="interaction-kind interaction-kind-${i(o.kind)}">${i(r)}</span>
              <span class="interaction-source">${i(o.source)}</span>
            </div>
          </div>
          <time
            class="interaction-time"
            ${n.machine?`datetime="${i(n.machine)}"`:""}
            ${n.exact?`title="${i(n.exact)}"`:""}
          >${i(n.label)}</time>
        </article>
      `}).join("")}function X(t,e="all"){const a=N(t),l=m(e);return`
    <div class="panel-grid">
      <section class="panel panel-pet" aria-labelledby="companion-name">
        <div class="pet-avatar" aria-hidden="true">
          <span class="pet-core"></span>
        </div>
        <div class="panel-copy-stack">
          <p class="section-label">Companion</p>
          <h2 id="companion-name">${i(a.petName)}</h2>
          <p class="status-line">${i(a.statusLine)}</p>
          <dl class="meta-list">
            <div>
              <dt>Loop mode</dt>
              <dd>${i(a.loopMode)}</dd>
            </div>
            <div>
              <dt>Last check-in</dt>
              <dd>${i(a.lastCheckIn)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="panel" aria-labelledby="mood-heading">
        <p class="section-label">Mood</p>
        <h2 id="mood-heading">${i(a.mood.label)}</h2>
        <p class="panel-copy">${i(a.mood.note)}</p>
        <p class="hint-text">${i(a.loopHint)}</p>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${i(a.memoryTitle)}</h2>
        <p class="panel-copy">${i(a.memorySummary)}</p>
        <ul class="signal-list">
          ${J(a.recentSignals)}
        </ul>
      </section>

      <section class="panel panel-history" aria-labelledby="timeline-heading">
        <p class="section-label">Recent interactions</p>
        <h2 id="timeline-heading">Companion timeline</h2>
        <div class="timeline-filter-bar" data-role="timeline-filter-bar">
          ${V(a.recentInteractions,l)}
        </div>
        <div class="interaction-list">
          ${Z(a.recentInteractions,l)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${G(a.vitals)}
        </div>
      </section>
    </div>
  `}function M(t){const e=t instanceof Error?t.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${i(e)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function Y(){return`
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
            <div class="composer-templates" data-role="composer-templates" hidden></div>
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
  `}async function ee(t,{adapter:e=O()}={}){if(!t)throw new Error("A target element is required to render the pet companion surface.");t.innerHTML=Y();const a=t.querySelector('[data-role="content"]'),l=t.querySelector('[data-action="refresh"]'),o=t.querySelector('[data-role="adapter-status"]'),n=t.querySelector('[data-role="action-note"]'),r=t.querySelector('[data-role="action-note-label"]'),f=t.querySelector('[data-role="action-note-hint"]'),h=t.querySelector('[data-role="composer-templates"]'),b=t.querySelector('[data-role="composer-guide"]'),L=[...t.querySelectorAll('[data-role="action-buttons"] [data-action]')];let u="all",y=null;function A(){L.forEach(s=>{const d=s.getAttribute("data-action")===u;s.classList.toggle("is-linked",d),s.setAttribute("data-filter-linked",d?"true":"false")})}function $(){const s=W(u),c=U(u),d=K(u);r&&(r.textContent=s.label),n&&(n.placeholder=s.placeholder,n.setAttribute("data-composer-kind",m(u))),f&&(f.textContent=s.hint),h&&(c?(h.hidden=!1,h.innerHTML=`
          <p class="composer-templates-label">${i(c.label)}</p>
          <div class="composer-template-list">
            ${c.templates.map(p=>`
                  <button
                    class="composer-template"
                    type="button"
                    data-role="composer-template"
                    data-template-value="${i(p)}"
                  >${i(p)}</button>
                `).join("")}
          </div>
        `,[...h.querySelectorAll('[data-role="composer-template"]')].forEach(p=>{p.addEventListener("click",()=>{n&&(n.value=p.getAttribute("data-template-value")??"",n.focus())})})):(h.innerHTML="",h.hidden=!0)),b&&(d?(b.hidden=!1,b.innerHTML=`
          <p class="composer-guide-copy">${i(d.message)}</p>
          <div class="composer-shortcuts">
            ${d.shortcuts.map(p=>`
                  <button
                    class="composer-shortcut"
                    type="button"
                    data-role="composer-shortcut"
                    data-shortcut-kind="${i(p)}"
                  >${i(w(p))}</button>
                `).join("")}
          </div>
        `,[...b.querySelectorAll('[data-role="composer-shortcut"]')].forEach(p=>{p.addEventListener("click",()=>{u=m(p.getAttribute("data-shortcut-kind")),C(),n==null||n.focus()})})):(b.innerHTML="",b.hidden=!0))}function v(s){l.disabled=s,L.forEach(c=>{c.disabled=s}),n&&(n.disabled=s)}function C(){if(!y){A(),$();return}a.innerHTML=X(y,u),A(),$(),[...a.querySelectorAll('[data-role="timeline-filter"]')].forEach(c=>{c.addEventListener("click",()=>{const d=m(c.getAttribute("data-filter-kind"));d!==u&&(u=d,C())})})}async function S(){v(!0),l.textContent="Refreshing...",o.textContent="Adapter: syncing local loop";try{const s=await e.getCompanionState(),c=N(s);y=c,C(),o.textContent=`Adapter: ${c.adapterLabel}`}catch(s){y=null,a.innerHTML=M(s),o.textContent="Adapter: degraded"}finally{v(!1),l.textContent="Refresh mood"}}for(const s of L)s.addEventListener("click",async()=>{const c=s.getAttribute("data-action");if(!c||typeof e.performAction!="function")return;const d=typeof(n==null?void 0:n.value)=="string"?n.value.trim():"";v(!0),o.textContent=`Adapter: sending ${c}`;try{await e.performAction(c,d||void 0),u=m(c),n&&(n.value=""),await S()}catch(T){a.innerHTML=M(T),o.textContent="Adapter: action failed",v(!1)}});return l.addEventListener("click",()=>{S()}),A(),$(),await S(),{reload:S}}const I=document.getElementById("app");I&&ee(I,{adapter:B()}).catch(t=>{I.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${t instanceof Error?t.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
