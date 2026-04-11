(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))r(o);new MutationObserver(o=>{for(const l of o)if(l.type==="childList")for(const c of l.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function a(o){const l={};return o.integrity&&(l.integrity=o.integrity),o.referrerPolicy&&(l.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?l.credentials="include":o.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(o){if(o.ep)return;o.ep=!0;const l=a(o);fetch(o.href,l)}})();const te=Object.freeze({petName:"Mochi",statusLine:"Idle on the browser ledge, listening for the next check-in.",loopMode:"Local placeholder loop",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Local stub",loopHint:"Swap this adapter with a real pet core endpoint when the contract is ready.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a light status ping."},memoryTitle:"Short-term memory",memorySummary:"Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays local until the real API is wired in."],recentInteractions:[{kind:"pat",title:"Pat interaction",detail:"A calm pat kept Mochi settled on the browser ledge.",timestamp:"2026-04-10T03:28:00.000Z",source:"Local Stub"},{kind:"signal",title:"Status pulse",detail:"The local adapter emitted a lightweight keep-alive signal.",timestamp:"2026-04-10T03:30:00.000Z",source:"Local Stub"}]});function ae(e){return JSON.parse(JSON.stringify(e))}function V(e=te){return{async getCompanionState(){return await Promise.resolve(),ae(e)}}}function ne({endpoint:e="/companion/state",actionEndpoint:t="/companion/actions",fetchImpl:a=(o=>(o=globalThis.fetch)==null?void 0:o.bind(globalThis))(),fallback:r=V()}={}){return{async getCompanionState(){if(typeof a!="function")return r.getCompanionState();try{const l=await a(e,{headers:{Accept:"application/json"}});if(!l.ok)throw new Error(`companion_state_${l.status}`);const c=await l.json();if(!c||typeof c!="object")throw new Error("companion_state_invalid");return c}catch{return r.getCompanionState()}},async performAction(l,c){if(typeof a!="function")return{ok:!1,fallback:!0};const i=await a(t,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({action:l,note:c})});if(!i.ok)throw new Error(`companion_action_${i.status}`);return i.json()}}}const oe=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],ie=["Local companion loop has not reported any recent signals yet."],re=[{kind:"signal",title:"Companion signal pending",detail:"No structured interaction timeline is available yet.",timestamp:"Pending",source:"Local stub"}],$=["all","pat","feed","wake","signal","fallback"],M=["pat","feed","wake"];function J(e){return{key:String(e+1),label:`Alt+${e+1}`}}function se(e){const t=String(e??"").trim().toLowerCase();return t==="pat"||t==="feed"||t==="wake"||t==="signal"?t:t==="fallback"?"fallback":"signal"}function le(e){const t=String((e==null?void 0:e.source)??"").trim().toLowerCase(),a=String((e==null?void 0:e.title)??"").trim().toLowerCase();return t.includes("fallback")||a.includes("fallback")?"fallback":a.includes("pat")?"pat":a.includes("feed")?"feed":a.includes("wake")?"wake":"signal"}function S(e){return e==="all"?"All":e==="pat"?"Pat":e==="feed"?"Feed":e==="wake"?"Wake":e==="fallback"?"Fallback":"Signal"}function b(e){const t=String(e??"").trim().toLowerCase();return $.includes(t)?t:"all"}function F(e){return M.includes(b(e))}function ce(e){const t=b(e);return t==="pat"?{label:"Pat note",placeholder:"Optional note for the next pat.",hint:"Describe the comfort, bond, or calming signal you want the timeline to capture. Press Ctrl+Enter to send."}:t==="feed"?{label:"Feed note",placeholder:"Optional note for the next feed.",hint:"Add snack, refill, or appetite context so the feed entry reads clearly later. Press Ctrl+Enter to send."}:t==="wake"?{label:"Wake note",placeholder:"Optional note for the next wake.",hint:"Explain the nudge or prompt that should bring the companion back into motion. Press Ctrl+Enter to send."}:{label:"Interaction note",placeholder:"Optional note for the next pat, feed, or wake.",hint:"Optional context travels into the companion timeline."}}function de(e){const t=b(e);return F(t)?null:t==="signal"?{message:"Signal entries are read-only snapshots. Pick Pat, Feed, or Wake to focus the composer on a writable action.",shortcuts:M}:t==="fallback"?{message:"Fallback entries describe degraded state only. Switch to Pat, Feed, or Wake before drafting the next note.",shortcuts:M}:{message:"Notes publish through Pat, Feed, or Wake actions. Pick one to focus the composer before writing.",shortcuts:M}}function pe(e){const t=b(e);return t==="pat"?{label:"Suggested pat notes",templates:["Soft pat settled Mochi into a calmer loop.","Bond signal ticked upward after a gentle tap.","Comfort pass landed right on time for the next check-in."]}:t==="feed"?{label:"Suggested feed notes",templates:["Refilled snack tray and appetite stabilized.","Quick bite restored energy before the next loop window.","Treat drop landed cleanly and hunger signal eased."]}:t==="wake"?{label:"Suggested wake notes",templates:["Bright nudge reopened the interaction window.","Wake pulse brought Mochi back into active mode.","Gentle prompt resumed the browser buddy loop."]}:null}function ue(e,t,a){const r=b(e),o=String(t??"").trim();return a?{label:"Template waiting",detail:"Choose Replace, Append, or Cancel to resolve the current draft.",tone:"pending"}:o?F(r)?{label:`${S(r)} draft ready`,detail:`Will publish with the next ${S(r).toLowerCase()} action.`,tone:"ready"}:{label:"Draft waiting",detail:"Pick Pat, Feed, or Wake to send this note.",tone:"pending"}:F(r)?{label:`${S(r)} draft empty`,detail:"Type a note or pick a template to stage the next action.",tone:"idle"}:{label:"Composer idle",detail:"Select Pat, Feed, or Wake to focus the draft composer.",tone:"idle"}}function me(){return`
    <ul class="shortcut-help-list">
      ${$.map((t,a)=>`
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">${s(J(a).label)}</span>
        <span>${s(`Switch timeline to ${S(t)}.`)}</span>
      </li>
    `).join("")}
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">Ctrl+Enter</span>
        <span>Send the selected Pat, Feed, or Wake action.</span>
      </li>
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">Cmd+Enter</span>
        <span>Send the selected action on macOS.</span>
      </li>
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">?</span>
        <span>Toggle this shortcut help card.</span>
      </li>
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">Esc</span>
        <span>Dismiss template merge prompts or close the shortcut card.</span>
      </li>
    </ul>
  `}function s(e){return String(e).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function A(e){return`${e.toISOString().slice(0,16).replace("T"," ")} UTC`}function q(e,t,a,r){const o=Math.max(1,Math.round(Math.abs(e)/t)),l=o===1?a:r;return e>=0?`${o} ${l} ago`:`in ${o} ${l}`}function he(e){const t=String(e??"").trim();if(!t||t.toLowerCase()==="pending")return{label:t||"Pending",exact:"",machine:""};const a=new Date(t);if(Number.isNaN(a.getTime()))return{label:t,exact:"",machine:""};const r=Math.round((Date.now()-a.getTime())/1e3),o=Math.abs(r);return o<45?{label:r>=0?"just now":"in moments",exact:A(a),machine:a.toISOString()}:o<60*60?{label:q(r,60,"min","mins"),exact:A(a),machine:a.toISOString()}:o<60*60*24?{label:q(r,60*60,"hour","hours"),exact:A(a),machine:a.toISOString()}:o<60*60*24*7?{label:q(r,60*60*24,"day","days"),exact:A(a),machine:a.toISOString()}:{label:A(a),exact:A(a),machine:a.toISOString()}}function Q(e){const t=e&&typeof e=="object"?e:{},a=t.mood&&typeof t.mood=="object"?t.mood:{},r=Array.isArray(t.vitals)&&t.vitals.length?t.vitals:oe,o=Array.isArray(t.recentSignals)&&t.recentSignals.length?t.recentSignals:ie,l=Array.isArray(t.recentInteractions)&&t.recentInteractions.length?t.recentInteractions.map(c=>({kind:se((c==null?void 0:c.kind)||le(c)),title:(c==null?void 0:c.title)||"Companion signal",detail:(c==null?void 0:c.detail)||"No detail published yet.",timestamp:(c==null?void 0:c.timestamp)||"Pending",source:(c==null?void 0:c.source)||"Memory"})):re;return{petName:t.petName||"Companion",statusLine:t.statusLine||"Waiting for the first local update.",loopMode:t.loopMode||"Local placeholder loop",lastCheckIn:t.lastCheckIn||"Pending",adapterLabel:t.adapterLabel||"Local stub",loopHint:t.loopHint||"Wire a real endpoint later without changing the browser shell.",mood:{label:a.label||"Settling",note:a.note||"No mood note has been published yet."},memoryTitle:t.memoryTitle||"Memory summary",memorySummary:t.memorySummary||"No memory summary is available yet. The prototype stays useful even before backend contracts exist.",vitals:r,recentSignals:o,recentInteractions:l}}function fe(e){return e.map(t=>`
        <article class="metric-card">
          <span class="metric-label">${s(t.label||"State")}</span>
          <strong class="metric-value">${s(t.value||"Unknown")}</strong>
        </article>
      `).join("")}function be(e){return e.map(t=>`<li class="signal-item">${s(t)}</li>`).join("")}function ge(e){const t=e.reduce((a,r)=>(a.all+=1,a[r.kind]=(a[r.kind]||0)+1,a),{all:0,pat:0,feed:0,wake:0,signal:0,fallback:0});return $.map(a=>({kind:a,label:S(a),count:t[a]||0}))}function ye(e,t){return ge(e).map((a,r)=>{const o=J(r);return`
        <button
          class="timeline-filter${a.kind===t?" is-active":""}"
          type="button"
          data-role="timeline-filter"
          data-filter-kind="${s(a.kind)}"
          data-filter-shortcut="${s(o.key)}"
          aria-pressed="${a.kind===t?"true":"false"}"
        >
          <span>${s(a.label)}</span>
          <span class="timeline-filter-shortcut" aria-hidden="true">${s(o.label)}</span>
          <span class="timeline-filter-count">${s(a.count)}</span>
        </button>
      `}).join("")}function Se(e,t){const a=b(t),r=a==="all"?e:e.filter(o=>o.kind===a);return r.length===0?`
      <div class="timeline-empty" data-role="timeline-empty">
        No ${s(S(a).toLowerCase())} interactions yet.
      </div>
    `:r.map(o=>{const l=he(o.timestamp),c=S(o.kind);return`
        <article class="interaction-card interaction-card-${s(o.kind)}">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${s(o.title)}</h3>
              <p class="interaction-detail">${s(o.detail)}</p>
            </div>
            <div class="interaction-meta">
              <span class="interaction-kind interaction-kind-${s(o.kind)}">${s(c)}</span>
              <span class="interaction-source">${s(o.source)}</span>
            </div>
          </div>
          <time
            class="interaction-time"
            ${l.machine?`datetime="${s(l.machine)}"`:""}
            ${l.exact?`title="${s(l.exact)}"`:""}
          >${s(l.label)}</time>
        </article>
      `}).join("")}function ke(e,t="all"){const a=Q(e),r=b(t);return`
    <div class="panel-grid">
      <section class="panel panel-pet" aria-labelledby="companion-name">
        <div class="pet-avatar" aria-hidden="true">
          <span class="pet-core"></span>
        </div>
        <div class="panel-copy-stack">
          <p class="section-label">Companion</p>
          <h2 id="companion-name">${s(a.petName)}</h2>
          <p class="status-line">${s(a.statusLine)}</p>
          <dl class="meta-list">
            <div>
              <dt>Loop mode</dt>
              <dd>${s(a.loopMode)}</dd>
            </div>
            <div>
              <dt>Last check-in</dt>
              <dd>${s(a.lastCheckIn)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="panel" aria-labelledby="mood-heading">
        <p class="section-label">Mood</p>
        <h2 id="mood-heading">${s(a.mood.label)}</h2>
        <p class="panel-copy">${s(a.mood.note)}</p>
        <p class="hint-text">${s(a.loopHint)}</p>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${s(a.memoryTitle)}</h2>
        <p class="panel-copy">${s(a.memorySummary)}</p>
        <ul class="signal-list">
          ${be(a.recentSignals)}
        </ul>
      </section>

      <section class="panel panel-history" aria-labelledby="timeline-heading">
        <p class="section-label">Recent interactions</p>
        <h2 id="timeline-heading">Companion timeline</h2>
        <div class="timeline-filter-bar" data-role="timeline-filter-bar">
          ${ye(a.recentInteractions,r)}
        </div>
        <div class="interaction-list">
          ${Se(a.recentInteractions,r)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${fe(a.vitals)}
        </div>
      </section>
    </div>
  `}function G(e){const t=e instanceof Error?e.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${s(t)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function ve(){return`
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
          <div class="hero-utility-row">
            <span class="status-pill" data-role="adapter-status">Adapter: local stub</span>
            <button
              class="shortcut-help-toggle"
              type="button"
              data-role="shortcut-help-toggle"
              aria-expanded="false"
              aria-controls="shortcut-help-card"
            >
              Shortcuts ?
            </button>
          </div>
          <section
            class="shortcut-help"
            id="shortcut-help-card"
            data-role="shortcut-help"
            aria-live="polite"
            hidden
          >
            <p class="shortcut-help-title">Keyboard shortcuts</p>
            ${me()}
          </section>
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
            <div class="note-actions">
              <div class="note-status" data-role="action-note-status" data-status-tone="idle">
                <span class="note-status-label" data-role="action-note-status-label">Composer idle</span>
                <span class="note-status-detail" data-role="action-note-status-detail">
                  Select Pat, Feed, or Wake to focus the draft composer.
                </span>
              </div>
              <button class="note-clear-button" type="button" data-role="action-note-clear">Clear draft</button>
            </div>
            <div class="composer-templates" data-role="composer-templates" hidden></div>
            <div class="composer-template-actions" data-role="composer-template-actions" hidden></div>
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
  `}async function we(e,{adapter:t=V()}={}){if(!e)throw new Error("A target element is required to render the pet companion surface.");e.innerHTML=ve();const a=e.querySelector('[data-role="content"]'),r=e.querySelector('[data-action="refresh"]'),o=e.querySelector('[data-role="adapter-status"]'),l=e.querySelector('[data-role="shortcut-help-toggle"]'),c=e.querySelector('[data-role="shortcut-help"]'),i=e.querySelector('[data-role="action-note"]'),D=e.querySelector('[data-role="action-note-label"]'),j=e.querySelector('[data-role="action-note-hint"]'),R=e.querySelector('[data-role="action-note-status"]'),K=e.querySelector('[data-role="action-note-status-label"]'),W=e.querySelector('[data-role="action-note-status-detail"]'),C=e.querySelector('[data-role="action-note-clear"]'),v=e.querySelector('[data-role="composer-templates"]'),w=e.querySelector('[data-role="composer-template-actions"]'),L=e.querySelector('[data-role="composer-guide"]'),O=[...e.querySelectorAll('[data-role="action-buttons"] [data-action]')];let p="all",T=null,h=null,y=!1;function Z(n){return!!(n&&typeof n=="object"&&"tagName"in n&&["INPUT","TEXTAREA","SELECT"].includes(String(n.tagName).toUpperCase()))}function N(){O.forEach(n=>{const u=n.getAttribute("data-action")===p;n.classList.toggle("is-linked",u),n.setAttribute("data-filter-linked",u?"true":"false")})}function x(){l&&(l.setAttribute("aria-expanded",y?"true":"false"),l.classList.toggle("is-active",y)),c&&(c.hidden=!y)}function g(){h=null}function X(){i&&(i.value="",i.focus()),g(),f()}function Y(n){if(!i||!h)return;const d=i.value.trim();n==="append"&&d?i.value=`${d}
${h}`:i.value=h,i.focus(),g(),f()}function f(){const n=ce(p),d=ue(p,i==null?void 0:i.value,h),u=pe(p),B=de(p),ee=!!(i!=null&&i.value.trim())||!!h;D&&(D.textContent=n.label),i&&(i.placeholder=n.placeholder,i.setAttribute("data-composer-kind",b(p))),j&&(j.textContent=n.hint),R&&R.setAttribute("data-status-tone",d.tone),K&&(K.textContent=d.label),W&&(W.textContent=d.detail),C&&(C.disabled=!ee),v&&(u?(v.hidden=!1,v.innerHTML=`
          <p class="composer-templates-label">${s(u.label)}</p>
          <div class="composer-template-list">
            ${u.templates.map(m=>`
                  <button
                    class="composer-template"
                    type="button"
                    data-role="composer-template"
                    data-template-value="${s(m)}"
                  >${s(m)}</button>
                `).join("")}
          </div>
        `,[...v.querySelectorAll('[data-role="composer-template"]')].forEach(m=>{m.addEventListener("click",()=>{if(i){const k=m.getAttribute("data-template-value")??"",U=i.value.trim();if(U&&U!==k){h=k,f();return}i.value=k,i.focus(),g(),f()}})})):(v.innerHTML="",v.hidden=!0)),w&&(!h||!u?(w.innerHTML="",w.hidden=!0):(w.hidden=!1,w.innerHTML=`
          <p class="composer-template-actions-copy">
            Keep the current draft, append the suggestion, or replace it with:
            <span class="composer-template-preview">${s(h)}</span>
          </p>
          <p class="composer-template-actions-hint">Press Esc to cancel this merge.</p>
          <div class="composer-template-action-row">
            <button class="composer-template-action" type="button" data-role="template-merge-action" data-merge-mode="replace">
              Replace
            </button>
            <button class="composer-template-action" type="button" data-role="template-merge-action" data-merge-mode="append">
              Append
            </button>
            <button class="composer-template-action is-ghost" type="button" data-role="template-merge-action" data-merge-mode="cancel">
              Cancel
            </button>
          </div>
        `,[...w.querySelectorAll('[data-role="template-merge-action"]')].forEach(m=>{m.addEventListener("click",()=>{const k=m.getAttribute("data-merge-mode");if(k==="replace"||k==="append"){Y(k);return}g(),f()})}))),L&&(B?(L.hidden=!1,L.innerHTML=`
          <p class="composer-guide-copy">${s(B.message)}</p>
          <div class="composer-shortcuts">
            ${B.shortcuts.map(m=>`
                  <button
                    class="composer-shortcut"
                    type="button"
                    data-role="composer-shortcut"
                    data-shortcut-kind="${s(m)}"
                  >${s(S(m))}</button>
                `).join("")}
          </div>
        `,[...L.querySelectorAll('[data-role="composer-shortcut"]')].forEach(m=>{m.addEventListener("click",()=>{p=b(m.getAttribute("data-shortcut-kind")),I(),i==null||i.focus()})})):(L.innerHTML="",L.hidden=!0))}function E(n){r.disabled=n,O.forEach(d=>{d.disabled=n}),i&&(i.disabled=n)}i==null||i.addEventListener("input",()=>{h&&g(),f()}),C==null||C.addEventListener("click",()=>{X()}),l==null||l.addEventListener("click",()=>{y=!y,x()}),e.ownerDocument.addEventListener("keydown",n=>{if(n.key==="Escape"&&h){n.preventDefault(),g(),f();return}if(n.key==="Escape"&&y){n.preventDefault(),y=!1,x();return}if(n.key==="?"&&!Z(n.target)){n.preventDefault(),y=!y,x();return}if(!n.altKey||n.ctrlKey||n.metaKey||n.shiftKey)return;const d=Number.parseInt(n.key,10)-1;if(Number.isNaN(d)||d<0||d>=$.length)return;n.preventDefault();const u=$[d];u!==p&&(g(),p=u,I())});async function z(n){if(!n||typeof t.performAction!="function")return;const d=typeof(i==null?void 0:i.value)=="string"?i.value.trim():"";E(!0),o.textContent=`Adapter: sending ${n}`;try{await t.performAction(n,d||void 0),g(),p=b(n),i&&(i.value=""),await P()}catch(u){a.innerHTML=G(u),o.textContent="Adapter: action failed",E(!1)}}i==null||i.addEventListener("keydown",n=>{if(n.key==="Escape"&&h){n.preventDefault(),g(),f();return}n.key==="Enter"&&(n.ctrlKey||n.metaKey)&&F(p)&&(n.preventDefault(),z(p))});function I(){if(!T){N(),f();return}a.innerHTML=ke(T,p),N(),f(),[...a.querySelectorAll('[data-role="timeline-filter"]')].forEach(d=>{d.addEventListener("click",()=>{const u=b(d.getAttribute("data-filter-kind"));u!==p&&(g(),p=u,I())})})}async function P(){E(!0),r.textContent="Refreshing...",o.textContent="Adapter: syncing local loop";try{const n=await t.getCompanionState(),d=Q(n);T=d,I(),o.textContent=`Adapter: ${d.adapterLabel}`}catch(n){T=null,a.innerHTML=G(n),o.textContent="Adapter: degraded"}finally{E(!1),r.textContent="Refresh mood"}}for(const n of O)n.addEventListener("click",async()=>{const d=n.getAttribute("data-action");await z(d)});return r.addEventListener("click",()=>{P()}),N(),x(),f(),await P(),{reload:P}}const H=document.getElementById("app");H&&we(H,{adapter:ne()}).catch(e=>{H.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${e instanceof Error?e.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
