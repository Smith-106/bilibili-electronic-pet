(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))i(o);new MutationObserver(o=>{for(const n of o)if(n.type==="childList")for(const s of n.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&i(s)}).observe(document,{childList:!0,subtree:!0});function a(o){const n={};return o.integrity&&(n.integrity=o.integrity),o.referrerPolicy&&(n.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?n.credentials="include":o.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(o){if(o.ep)return;o.ep=!0;const n=a(o);fetch(o.href,n)}})();const J=Object.freeze({petName:"Mochi",statusLine:"Idle on the browser ledge, listening for the next check-in.",loopMode:"Local placeholder loop",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Local stub",loopHint:"Swap this adapter with a real pet core endpoint when the contract is ready.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a light status ping."},memoryTitle:"Short-term memory",memorySummary:"Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays local until the real API is wired in."],recentInteractions:[{kind:"pat",title:"Pat interaction",detail:"A calm pat kept Mochi settled on the browser ledge.",timestamp:"2026-04-10T03:28:00.000Z",source:"Local Stub"},{kind:"signal",title:"Status pulse",detail:"The local adapter emitted a lightweight keep-alive signal.",timestamp:"2026-04-10T03:30:00.000Z",source:"Local Stub"}]});function Q(e){return JSON.parse(JSON.stringify(e))}function W(e=J){return{async getCompanionState(){return await Promise.resolve(),Q(e)}}}function Z({endpoint:e="/companion/state",actionEndpoint:t="/companion/actions",fetchImpl:a=(o=>(o=globalThis.fetch)==null?void 0:o.bind(globalThis))(),fallback:i=W()}={}){return{async getCompanionState(){if(typeof a!="function")return i.getCompanionState();try{const n=await a(e,{headers:{Accept:"application/json"}});if(!n.ok)throw new Error(`companion_state_${n.status}`);const s=await n.json();if(!s||typeof s!="object")throw new Error("companion_state_invalid");return s}catch{return i.getCompanionState()}},async performAction(n,s){if(typeof a!="function")return{ok:!1,fallback:!0};const v=await a(t,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({action:n,note:s})});if(!v.ok)throw new Error(`companion_action_${v.status}`);return v.json()}}}const X=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],Y=["Local companion loop has not reported any recent signals yet."],ee=[{kind:"signal",title:"Companion signal pending",detail:"No structured interaction timeline is available yet.",timestamp:"Pending",source:"Local stub"}],_=["all","pat","feed","wake","signal","fallback"],x=["pat","feed","wake"];function te(e){const t=String(e??"").trim().toLowerCase();return t==="pat"||t==="feed"||t==="wake"||t==="signal"?t:t==="fallback"?"fallback":"signal"}function ae(e){const t=String((e==null?void 0:e.source)??"").trim().toLowerCase(),a=String((e==null?void 0:e.title)??"").trim().toLowerCase();return t.includes("fallback")||a.includes("fallback")?"fallback":a.includes("pat")?"pat":a.includes("feed")?"feed":a.includes("wake")?"wake":"signal"}function y(e){return e==="all"?"All":e==="pat"?"Pat":e==="feed"?"Feed":e==="wake"?"Wake":e==="fallback"?"Fallback":"Signal"}function f(e){const t=String(e??"").trim().toLowerCase();return _.includes(t)?t:"all"}function I(e){return x.includes(f(e))}function ne(e){const t=f(e);return t==="pat"?{label:"Pat note",placeholder:"Optional note for the next pat.",hint:"Describe the comfort, bond, or calming signal you want the timeline to capture. Press Ctrl+Enter to send."}:t==="feed"?{label:"Feed note",placeholder:"Optional note for the next feed.",hint:"Add snack, refill, or appetite context so the feed entry reads clearly later. Press Ctrl+Enter to send."}:t==="wake"?{label:"Wake note",placeholder:"Optional note for the next wake.",hint:"Explain the nudge or prompt that should bring the companion back into motion. Press Ctrl+Enter to send."}:{label:"Interaction note",placeholder:"Optional note for the next pat, feed, or wake.",hint:"Optional context travels into the companion timeline."}}function oe(e){const t=f(e);return I(t)?null:t==="signal"?{message:"Signal entries are read-only snapshots. Pick Pat, Feed, or Wake to focus the composer on a writable action.",shortcuts:x}:t==="fallback"?{message:"Fallback entries describe degraded state only. Switch to Pat, Feed, or Wake before drafting the next note.",shortcuts:x}:{message:"Notes publish through Pat, Feed, or Wake actions. Pick one to focus the composer before writing.",shortcuts:x}}function ie(e){const t=f(e);return t==="pat"?{label:"Suggested pat notes",templates:["Soft pat settled Mochi into a calmer loop.","Bond signal ticked upward after a gentle tap.","Comfort pass landed right on time for the next check-in."]}:t==="feed"?{label:"Suggested feed notes",templates:["Refilled snack tray and appetite stabilized.","Quick bite restored energy before the next loop window.","Treat drop landed cleanly and hunger signal eased."]}:t==="wake"?{label:"Suggested wake notes",templates:["Bright nudge reopened the interaction window.","Wake pulse brought Mochi back into active mode.","Gentle prompt resumed the browser buddy loop."]}:null}function re(e,t,a){const i=f(e),o=String(t??"").trim();return a?{label:"Template waiting",detail:"Choose Replace, Append, or Cancel to resolve the current draft.",tone:"pending"}:o?I(i)?{label:`${y(i)} draft ready`,detail:`Will publish with the next ${y(i).toLowerCase()} action.`,tone:"ready"}:{label:"Draft waiting",detail:"Pick Pat, Feed, or Wake to send this note.",tone:"pending"}:I(i)?{label:`${y(i)} draft empty`,detail:"Type a note or pick a template to stage the next action.",tone:"idle"}:{label:"Composer idle",detail:"Select Pat, Feed, or Wake to focus the draft composer.",tone:"idle"}}function l(e){return String(e).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function L(e){return`${e.toISOString().slice(0,16).replace("T"," ")} UTC`}function F(e,t,a,i){const o=Math.max(1,Math.round(Math.abs(e)/t)),n=o===1?a:i;return e>=0?`${o} ${n} ago`:`in ${o} ${n}`}function le(e){const t=String(e??"").trim();if(!t||t.toLowerCase()==="pending")return{label:t||"Pending",exact:"",machine:""};const a=new Date(t);if(Number.isNaN(a.getTime()))return{label:t,exact:"",machine:""};const i=Math.round((Date.now()-a.getTime())/1e3),o=Math.abs(i);return o<45?{label:i>=0?"just now":"in moments",exact:L(a),machine:a.toISOString()}:o<60*60?{label:F(i,60,"min","mins"),exact:L(a),machine:a.toISOString()}:o<60*60*24?{label:F(i,60*60,"hour","hours"),exact:L(a),machine:a.toISOString()}:o<60*60*24*7?{label:F(i,60*60*24,"day","days"),exact:L(a),machine:a.toISOString()}:{label:L(a),exact:L(a),machine:a.toISOString()}}function K(e){const t=e&&typeof e=="object"?e:{},a=t.mood&&typeof t.mood=="object"?t.mood:{},i=Array.isArray(t.vitals)&&t.vitals.length?t.vitals:X,o=Array.isArray(t.recentSignals)&&t.recentSignals.length?t.recentSignals:Y,n=Array.isArray(t.recentInteractions)&&t.recentInteractions.length?t.recentInteractions.map(s=>({kind:te((s==null?void 0:s.kind)||ae(s)),title:(s==null?void 0:s.title)||"Companion signal",detail:(s==null?void 0:s.detail)||"No detail published yet.",timestamp:(s==null?void 0:s.timestamp)||"Pending",source:(s==null?void 0:s.source)||"Memory"})):ee;return{petName:t.petName||"Companion",statusLine:t.statusLine||"Waiting for the first local update.",loopMode:t.loopMode||"Local placeholder loop",lastCheckIn:t.lastCheckIn||"Pending",adapterLabel:t.adapterLabel||"Local stub",loopHint:t.loopHint||"Wire a real endpoint later without changing the browser shell.",mood:{label:a.label||"Settling",note:a.note||"No mood note has been published yet."},memoryTitle:t.memoryTitle||"Memory summary",memorySummary:t.memorySummary||"No memory summary is available yet. The prototype stays useful even before backend contracts exist.",vitals:i,recentSignals:o,recentInteractions:n}}function se(e){return e.map(t=>`
        <article class="metric-card">
          <span class="metric-label">${l(t.label||"State")}</span>
          <strong class="metric-value">${l(t.value||"Unknown")}</strong>
        </article>
      `).join("")}function ce(e){return e.map(t=>`<li class="signal-item">${l(t)}</li>`).join("")}function de(e){const t=e.reduce((a,i)=>(a.all+=1,a[i.kind]=(a[i.kind]||0)+1,a),{all:0,pat:0,feed:0,wake:0,signal:0,fallback:0});return _.map(a=>({kind:a,label:y(a),count:t[a]||0}))}function pe(e,t){return de(e).map(a=>`
        <button
          class="timeline-filter${a.kind===t?" is-active":""}"
          type="button"
          data-role="timeline-filter"
          data-filter-kind="${l(a.kind)}"
          aria-pressed="${a.kind===t?"true":"false"}"
        >
          <span>${l(a.label)}</span>
          <span class="timeline-filter-count">${l(a.count)}</span>
        </button>
      `).join("")}function ue(e,t){const a=f(t),i=a==="all"?e:e.filter(o=>o.kind===a);return i.length===0?`
      <div class="timeline-empty" data-role="timeline-empty">
        No ${l(y(a).toLowerCase())} interactions yet.
      </div>
    `:i.map(o=>{const n=le(o.timestamp),s=y(o.kind);return`
        <article class="interaction-card interaction-card-${l(o.kind)}">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${l(o.title)}</h3>
              <p class="interaction-detail">${l(o.detail)}</p>
            </div>
            <div class="interaction-meta">
              <span class="interaction-kind interaction-kind-${l(o.kind)}">${l(s)}</span>
              <span class="interaction-source">${l(o.source)}</span>
            </div>
          </div>
          <time
            class="interaction-time"
            ${n.machine?`datetime="${l(n.machine)}"`:""}
            ${n.exact?`title="${l(n.exact)}"`:""}
          >${l(n.label)}</time>
        </article>
      `}).join("")}function me(e,t="all"){const a=K(e),i=f(t);return`
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
          ${ce(a.recentSignals)}
        </ul>
      </section>

      <section class="panel panel-history" aria-labelledby="timeline-heading">
        <p class="section-label">Recent interactions</p>
        <h2 id="timeline-heading">Companion timeline</h2>
        <div class="timeline-filter-bar" data-role="timeline-filter-bar">
          ${pe(a.recentInteractions,i)}
        </div>
        <div class="interaction-list">
          ${ue(a.recentInteractions,i)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${se(a.vitals)}
        </div>
      </section>
    </div>
  `}function z(e){const t=e instanceof Error?e.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${l(t)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function fe(){return`
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
  `}async function he(e,{adapter:t=W()}={}){if(!e)throw new Error("A target element is required to render the pet companion surface.");e.innerHTML=fe();const a=e.querySelector('[data-role="content"]'),i=e.querySelector('[data-action="refresh"]'),o=e.querySelector('[data-role="adapter-status"]'),n=e.querySelector('[data-role="action-note"]'),s=e.querySelector('[data-role="action-note-label"]'),v=e.querySelector('[data-role="action-note-hint"]'),q=e.querySelector('[data-role="action-note-status"]'),N=e.querySelector('[data-role="action-note-status-label"]'),H=e.querySelector('[data-role="action-note-status-detail"]'),A=e.querySelector('[data-role="action-note-clear"]'),S=e.querySelector('[data-role="composer-templates"]'),k=e.querySelector('[data-role="composer-template-actions"]'),w=e.querySelector('[data-role="composer-guide"]'),E=[...e.querySelectorAll('[data-role="action-buttons"] [data-action]')];let p="all",C=null,m=null;function M(){E.forEach(r=>{const u=r.getAttribute("data-action")===p;r.classList.toggle("is-linked",u),r.setAttribute("data-filter-linked",u?"true":"false")})}function b(){m=null}function U(){n&&(n.value="",n.focus()),b(),h()}function G(r){if(!n||!m)return;const c=n.value.trim();r==="append"&&c?n.value=`${c}
${m}`:n.value=m,n.focus(),b(),h()}function h(){const r=ne(p),c=re(p,n==null?void 0:n.value,m),u=ie(p),O=oe(p),V=!!(n!=null&&n.value.trim())||!!m;s&&(s.textContent=r.label),n&&(n.placeholder=r.placeholder,n.setAttribute("data-composer-kind",f(p))),v&&(v.textContent=r.hint),q&&q.setAttribute("data-status-tone",c.tone),N&&(N.textContent=c.label),H&&(H.textContent=c.detail),A&&(A.disabled=!V),S&&(u?(S.hidden=!1,S.innerHTML=`
          <p class="composer-templates-label">${l(u.label)}</p>
          <div class="composer-template-list">
            ${u.templates.map(d=>`
                  <button
                    class="composer-template"
                    type="button"
                    data-role="composer-template"
                    data-template-value="${l(d)}"
                  >${l(d)}</button>
                `).join("")}
          </div>
        `,[...S.querySelectorAll('[data-role="composer-template"]')].forEach(d=>{d.addEventListener("click",()=>{if(n){const g=d.getAttribute("data-template-value")??"",D=n.value.trim();if(D&&D!==g){m=g,h();return}n.value=g,n.focus(),b(),h()}})})):(S.innerHTML="",S.hidden=!0)),k&&(!m||!u?(k.innerHTML="",k.hidden=!0):(k.hidden=!1,k.innerHTML=`
          <p class="composer-template-actions-copy">
            Keep the current draft, append the suggestion, or replace it with:
            <span class="composer-template-preview">${l(m)}</span>
          </p>
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
        `,[...k.querySelectorAll('[data-role="template-merge-action"]')].forEach(d=>{d.addEventListener("click",()=>{const g=d.getAttribute("data-merge-mode");if(g==="replace"||g==="append"){G(g);return}b(),h()})}))),w&&(O?(w.hidden=!1,w.innerHTML=`
          <p class="composer-guide-copy">${l(O.message)}</p>
          <div class="composer-shortcuts">
            ${O.shortcuts.map(d=>`
                  <button
                    class="composer-shortcut"
                    type="button"
                    data-role="composer-shortcut"
                    data-shortcut-kind="${l(d)}"
                  >${l(y(d))}</button>
                `).join("")}
          </div>
        `,[...w.querySelectorAll('[data-role="composer-shortcut"]')].forEach(d=>{d.addEventListener("click",()=>{p=f(d.getAttribute("data-shortcut-kind")),P(),n==null||n.focus()})})):(w.innerHTML="",w.hidden=!0))}function $(r){i.disabled=r,E.forEach(c=>{c.disabled=r}),n&&(n.disabled=r)}n==null||n.addEventListener("input",()=>{m&&b(),h()}),A==null||A.addEventListener("click",()=>{U()});async function R(r){if(!r||typeof t.performAction!="function")return;const c=typeof(n==null?void 0:n.value)=="string"?n.value.trim():"";$(!0),o.textContent=`Adapter: sending ${r}`;try{await t.performAction(r,c||void 0),b(),p=f(r),n&&(n.value=""),await T()}catch(u){a.innerHTML=z(u),o.textContent="Adapter: action failed",$(!1)}}n==null||n.addEventListener("keydown",r=>{if(r.key==="Escape"&&m){r.preventDefault(),b(),h();return}r.key==="Enter"&&(r.ctrlKey||r.metaKey)&&I(p)&&(r.preventDefault(),R(p))});function P(){if(!C){M(),h();return}a.innerHTML=me(C,p),M(),h(),[...a.querySelectorAll('[data-role="timeline-filter"]')].forEach(c=>{c.addEventListener("click",()=>{const u=f(c.getAttribute("data-filter-kind"));u!==p&&(b(),p=u,P())})})}async function T(){$(!0),i.textContent="Refreshing...",o.textContent="Adapter: syncing local loop";try{const r=await t.getCompanionState(),c=K(r);C=c,P(),o.textContent=`Adapter: ${c.adapterLabel}`}catch(r){C=null,a.innerHTML=z(r),o.textContent="Adapter: degraded"}finally{$(!1),i.textContent="Refresh mood"}}for(const r of E)r.addEventListener("click",async()=>{const c=r.getAttribute("data-action");await R(c)});return i.addEventListener("click",()=>{T()}),M(),h(),await T(),{reload:T}}const B=document.getElementById("app");B&&he(B,{adapter:Z()}).catch(e=>{B.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${e instanceof Error?e.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
