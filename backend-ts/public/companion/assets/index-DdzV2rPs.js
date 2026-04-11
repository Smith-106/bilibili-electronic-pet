(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const d of i.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&s(d)}).observe(document,{childList:!0,subtree:!0});function a(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(o){if(o.ep)return;o.ep=!0;const i=a(o);fetch(o.href,i)}})();const ce=Object.freeze({petName:"Mochi",statusLine:"Idle on the browser ledge, listening for the next check-in.",loopMode:"Local placeholder loop",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Local stub",loopHint:"Swap this adapter with a real pet core endpoint when the contract is ready.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a light status ping."},memoryTitle:"Short-term memory",memorySummary:"Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays local until the real API is wired in."],recentInteractions:[{kind:"pat",title:"Pat interaction",detail:"A calm pat kept Mochi settled on the browser ledge.",timestamp:"2026-04-10T03:28:00.000Z",source:"Local Stub"},{kind:"signal",title:"Status pulse",detail:"The local adapter emitted a lightweight keep-alive signal.",timestamp:"2026-04-10T03:30:00.000Z",source:"Local Stub"}]});function de(e){return JSON.parse(JSON.stringify(e))}function ae(e=ce){return{async getCompanionState(){return await Promise.resolve(),de(e)}}}function pe({endpoint:e="/companion/state",actionEndpoint:t="/companion/actions",fetchImpl:a=(o=>(o=globalThis.fetch)==null?void 0:o.bind(globalThis))(),fallback:s=ae()}={}){return{async getCompanionState(){if(typeof a!="function")return s.getCompanionState();try{const i=await a(e,{headers:{Accept:"application/json"}});if(!i.ok)throw new Error(`companion_state_${i.status}`);const d=await i.json();if(!d||typeof d!="object")throw new Error("companion_state_invalid");return d}catch{return s.getCompanionState()}},async performAction(i,d){if(typeof a!="function")return{ok:!1,fallback:!0};const k=await a(t,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({action:i,note:d})});if(!k.ok)throw new Error(`companion_action_${k.status}`);return k.json()}}}const ue=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],me=["Local companion loop has not reported any recent signals yet."],fe=[{kind:"signal",title:"Companion signal pending",detail:"No structured interaction timeline is available yet.",timestamp:"Pending",source:"Local stub"}],F=["all","pat","feed","wake","signal","fallback"],q=["pat","feed","wake"];function ne(e){return{key:String(e+1),label:`Alt+${e+1}`}}function he(e){const t=String(e??"").trim().toLowerCase();return t==="pat"||t==="feed"||t==="wake"||t==="signal"?t:t==="fallback"?"fallback":"signal"}function be(e){const t=String((e==null?void 0:e.source)??"").trim().toLowerCase(),a=String((e==null?void 0:e.title)??"").trim().toLowerCase();return t.includes("fallback")||a.includes("fallback")?"fallback":a.includes("pat")?"pat":a.includes("feed")?"feed":a.includes("wake")?"wake":"signal"}function m(e){return e==="all"?"All":e==="pat"?"Pat":e==="feed"?"Feed":e==="wake"?"Wake":e==="fallback"?"Fallback":"Signal"}function y(e){const t=String(e??"").trim().toLowerCase();return F.includes(t)?t:"all"}function D(e){return q.includes(y(e))}function ge(e){const t=y(e);return t==="pat"?{label:"Pat note",placeholder:"Optional note for the next pat.",hint:"Describe the comfort, bond, or calming signal you want the timeline to capture. Press Ctrl+Enter to send."}:t==="feed"?{label:"Feed note",placeholder:"Optional note for the next feed.",hint:"Add snack, refill, or appetite context so the feed entry reads clearly later. Press Ctrl+Enter to send."}:t==="wake"?{label:"Wake note",placeholder:"Optional note for the next wake.",hint:"Explain the nudge or prompt that should bring the companion back into motion. Press Ctrl+Enter to send."}:{label:"Interaction note",placeholder:"Optional note for the next pat, feed, or wake.",hint:"Optional context travels into the companion timeline."}}function ye(e){const t=y(e);return D(t)?null:t==="signal"?{message:"Signal entries are read-only snapshots. Pick Pat, Feed, or Wake to focus the composer on a writable action.",shortcuts:q}:t==="fallback"?{message:"Fallback entries describe degraded state only. Switch to Pat, Feed, or Wake before drafting the next note.",shortcuts:q}:{message:"Notes publish through Pat, Feed, or Wake actions. Pick one to focus the composer before writing.",shortcuts:q}}function Se(e){const t=y(e);return t==="pat"?{label:"Suggested pat notes",templates:["Soft pat settled Mochi into a calmer loop.","Bond signal ticked upward after a gentle tap.","Comfort pass landed right on time for the next check-in."]}:t==="feed"?{label:"Suggested feed notes",templates:["Refilled snack tray and appetite stabilized.","Quick bite restored energy before the next loop window.","Treat drop landed cleanly and hunger signal eased."]}:t==="wake"?{label:"Suggested wake notes",templates:["Bright nudge reopened the interaction window.","Wake pulse brought Mochi back into active mode.","Gentle prompt resumed the browser buddy loop."]}:null}function ve(e,t,a){const s=y(e),o=String(t??"").trim();return a?{label:"Template waiting",detail:"Choose Replace, Append, or Cancel to resolve the current draft.",tone:"pending"}:o?D(s)?{label:`${m(s)} draft ready`,detail:`Will publish with the next ${m(s).toLowerCase()} action.`,tone:"ready"}:{label:"Draft waiting",detail:"Pick Pat, Feed, or Wake to send this note.",tone:"pending"}:D(s)?{label:`${m(s)} draft empty`,detail:"Type a note or pick a template to stage the next action.",tone:"idle"}:{label:"Composer idle",detail:"Select Pat, Feed, or Wake to focus the draft composer.",tone:"idle"}}function ke(){return`
    <ul class="shortcut-help-list">
      ${F.map((t,a)=>`
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">${c(ne(a).label)}</span>
        <span>${c(`Switch timeline to ${m(t)}.`)}</span>
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
  `}function c(e){return String(e).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function x(e){return`${e.toISOString().slice(0,16).replace("T"," ")} UTC`}function z(e,t,a,s){const o=Math.max(1,Math.round(Math.abs(e)/t)),i=o===1?a:s;return e>=0?`${o} ${i} ago`:`in ${o} ${i}`}function we(e){const t=String(e??"").trim();if(!t||t.toLowerCase()==="pending")return{label:t||"Pending",exact:"",machine:""};const a=new Date(t);if(Number.isNaN(a.getTime()))return{label:t,exact:"",machine:""};const s=Math.round((Date.now()-a.getTime())/1e3),o=Math.abs(s);return o<45?{label:s>=0?"just now":"in moments",exact:x(a),machine:a.toISOString()}:o<60*60?{label:z(s,60,"min","mins"),exact:x(a),machine:a.toISOString()}:o<60*60*24?{label:z(s,60*60,"hour","hours"),exact:x(a),machine:a.toISOString()}:o<60*60*24*7?{label:z(s,60*60*24,"day","days"),exact:x(a),machine:a.toISOString()}:{label:x(a),exact:x(a),machine:a.toISOString()}}function oe(e){const t=e&&typeof e=="object"?e:{},a=t.mood&&typeof t.mood=="object"?t.mood:{},s=Array.isArray(t.vitals)&&t.vitals.length?t.vitals:ue,o=Array.isArray(t.recentSignals)&&t.recentSignals.length?t.recentSignals:me,i=Array.isArray(t.recentInteractions)&&t.recentInteractions.length?t.recentInteractions.map(d=>({kind:he((d==null?void 0:d.kind)||be(d)),title:(d==null?void 0:d.title)||"Companion signal",detail:(d==null?void 0:d.detail)||"No detail published yet.",timestamp:(d==null?void 0:d.timestamp)||"Pending",source:(d==null?void 0:d.source)||"Memory"})):fe;return{petName:t.petName||"Companion",statusLine:t.statusLine||"Waiting for the first local update.",loopMode:t.loopMode||"Local placeholder loop",lastCheckIn:t.lastCheckIn||"Pending",adapterLabel:t.adapterLabel||"Local stub",loopHint:t.loopHint||"Wire a real endpoint later without changing the browser shell.",mood:{label:a.label||"Settling",note:a.note||"No mood note has been published yet."},memoryTitle:t.memoryTitle||"Memory summary",memorySummary:t.memorySummary||"No memory summary is available yet. The prototype stays useful even before backend contracts exist.",vitals:s,recentSignals:o,recentInteractions:i}}function $e(e){return e.map(t=>`
        <article class="metric-card">
          <span class="metric-label">${c(t.label||"State")}</span>
          <strong class="metric-value">${c(t.value||"Unknown")}</strong>
        </article>
      `).join("")}function Le(e){return e.map(t=>`<li class="signal-item">${c(t)}</li>`).join("")}function Ae(e){const t=e.reduce((a,s)=>(a.all+=1,a[s.kind]=(a[s.kind]||0)+1,a),{all:0,pat:0,feed:0,wake:0,signal:0,fallback:0});return F.map(a=>({kind:a,label:m(a),count:t[a]||0}))}function Ce(e,t){return Ae(e).map((a,s)=>{const o=ne(s);return`
        <button
          class="timeline-filter${a.kind===t?" is-active":""}"
          type="button"
          data-role="timeline-filter"
          data-filter-kind="${c(a.kind)}"
          data-filter-shortcut="${c(o.key)}"
          aria-pressed="${a.kind===t?"true":"false"}"
        >
          <span>${c(a.label)}</span>
          <span class="timeline-filter-shortcut" aria-hidden="true">${c(o.label)}</span>
          <span class="timeline-filter-count">${c(a.count)}</span>
        </button>
      `}).join("")}function Te(e,t){const a=y(t),s=a==="all"?e:e.filter(o=>o.kind===a);return s.length===0?`
      <div class="timeline-empty" data-role="timeline-empty">
        No ${c(m(a).toLowerCase())} interactions yet.
      </div>
    `:s.map(o=>{const i=we(o.timestamp),d=m(o.kind);return`
        <article class="interaction-card interaction-card-${c(o.kind)}">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${c(o.title)}</h3>
              <p class="interaction-detail">${c(o.detail)}</p>
            </div>
            <div class="interaction-meta">
              <span class="interaction-kind interaction-kind-${c(o.kind)}">${c(d)}</span>
              <span class="interaction-source">${c(o.source)}</span>
            </div>
          </div>
          <time
            class="interaction-time"
            ${i.machine?`datetime="${c(i.machine)}"`:""}
            ${i.exact?`title="${c(i.exact)}"`:""}
          >${c(i.label)}</time>
        </article>
      `}).join("")}function xe(e,t="all"){const a=oe(e),s=y(t);return`
    <div class="panel-grid">
      <section class="panel panel-pet" aria-labelledby="companion-name">
        <div class="pet-avatar" aria-hidden="true">
          <span class="pet-core"></span>
        </div>
        <div class="panel-copy-stack">
          <p class="section-label">Companion</p>
          <h2 id="companion-name">${c(a.petName)}</h2>
          <p class="status-line">${c(a.statusLine)}</p>
          <dl class="meta-list">
            <div>
              <dt>Loop mode</dt>
              <dd>${c(a.loopMode)}</dd>
            </div>
            <div>
              <dt>Last check-in</dt>
              <dd>${c(a.lastCheckIn)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="panel" aria-labelledby="mood-heading">
        <p class="section-label">Mood</p>
        <h2 id="mood-heading">${c(a.mood.label)}</h2>
        <p class="panel-copy">${c(a.mood.note)}</p>
        <p class="hint-text">${c(a.loopHint)}</p>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${c(a.memoryTitle)}</h2>
        <p class="panel-copy">${c(a.memorySummary)}</p>
        <ul class="signal-list">
          ${Le(a.recentSignals)}
        </ul>
      </section>

      <section class="panel panel-history" aria-labelledby="timeline-heading">
        <p class="section-label">Recent interactions</p>
        <h2 id="timeline-heading">Companion timeline</h2>
        <div class="timeline-filter-bar" data-role="timeline-filter-bar">
          ${Ce(a.recentInteractions,s)}
        </div>
        <div class="interaction-list">
          ${Te(a.recentInteractions,s)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${$e(a.vitals)}
        </div>
      </section>
    </div>
  `}function te(e){const t=e instanceof Error?e.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${c(t)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function Ee(){return`
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
            <div class="shortcut-help-header">
              <p class="shortcut-help-title" data-role="shortcut-help-title" tabindex="0">Keyboard shortcuts</p>
              <button
                class="shortcut-help-close"
                type="button"
                data-role="shortcut-help-close"
                aria-label="Close shortcut help"
              >
                Close
              </button>
            </div>
            ${ke()}
          </section>
          <div class="sr-only" data-role="live-region" aria-live="polite" aria-atomic="true"></div>
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
  `}async function Ie(e,{adapter:t=ae()}={}){if(!e)throw new Error("A target element is required to render the pet companion surface.");e.innerHTML=Ee();const a=e.querySelector('[data-role="content"]'),s=e.querySelector('[data-action="refresh"]'),o=e.querySelector('[data-role="adapter-status"]'),i=e.querySelector('[data-role="shortcut-help-toggle"]'),d=e.querySelector('[data-role="shortcut-help"]'),k=e.querySelector('[data-role="shortcut-help-title"]'),E=e.querySelector('[data-role="shortcut-help-close"]'),H=e.querySelector('[data-role="live-region"]'),r=e.querySelector('[data-role="action-note"]'),_=e.querySelector('[data-role="action-note-label"]'),U=e.querySelector('[data-role="action-note-hint"]'),G=e.querySelector('[data-role="action-note-status"]'),V=e.querySelector('[data-role="action-note-status-label"]'),J=e.querySelector('[data-role="action-note-status-detail"]'),I=e.querySelector('[data-role="action-note-clear"]'),L=e.querySelector('[data-role="composer-templates"]'),A=e.querySelector('[data-role="composer-template-actions"]'),C=e.querySelector('[data-role="composer-guide"]'),R=[...e.querySelectorAll('[data-role="action-buttons"] [data-action]')];let f="all",P=null,h=null,v=!1,Q="";function le(n){return!!(n&&typeof n=="object"&&"tagName"in n&&["INPUT","TEXTAREA","SELECT"].includes(String(n.tagName).toUpperCase()))}function j(){R.forEach(n=>{const p=n.getAttribute("data-action")===f;n.classList.toggle("is-linked",p),n.setAttribute("data-filter-linked",p?"true":"false")})}function b(n){const l=String(n??"").trim();!H||!l||(Q===l&&(H.textContent=""),Q=l,H.textContent=l)}function Z(){i&&(i.setAttribute("aria-expanded",v?"true":"false"),i.classList.toggle("is-active",v)),d&&(d.hidden=!v)}function ie(n=!1){const l=[k,E].filter(Boolean);if(!l.length)return;const p=n?l[l.length-1]:l[0];p==null||p.focus()}function M(n,l,{moveFocus:p=!1}={}){v=n,Z(),p&&(n?k==null||k.focus():i==null||i.focus()),l&&b(l)}function K(n,{announcement:l}={}){const p=y(n);p!==f&&(w(),f=p,Y(),l&&b(l))}function w(){h=null}function re(){r&&(r.value="",r.focus()),w(),S(),b("Draft cleared.")}function se(n){if(!r||!h)return;const l=r.value.trim();n==="append"&&l?r.value=`${l}
${h}`:r.value=h,r.focus(),w(),S(),b(`${m(f)} template ${n==="append"?"appended to":"replaced"} draft.`)}function S(){const n=ge(f),l=ve(f,r==null?void 0:r.value,h),p=Se(f),T=ye(f),$=!!(r!=null&&r.value.trim())||!!h;_&&(_.textContent=n.label),r&&(r.placeholder=n.placeholder,r.setAttribute("data-composer-kind",y(f))),U&&(U.textContent=n.hint),G&&G.setAttribute("data-status-tone",l.tone),V&&(V.textContent=l.label),J&&(J.textContent=l.detail),I&&(I.disabled=!$),L&&(p?(L.hidden=!1,L.innerHTML=`
          <p class="composer-templates-label">${c(p.label)}</p>
          <div class="composer-template-list">
            ${p.templates.map(u=>`
                  <button
                    class="composer-template"
                    type="button"
                    data-role="composer-template"
                    data-template-value="${c(u)}"
                  >${c(u)}</button>
                `).join("")}
          </div>
        `,[...L.querySelectorAll('[data-role="composer-template"]')].forEach(u=>{u.addEventListener("click",()=>{if(r){const g=u.getAttribute("data-template-value")??"",ee=r.value.trim();if(ee&&ee!==g){h=g,S(),b("Template selected. Choose Replace, Append, or Cancel.");return}r.value=g,r.focus(),w(),S(),b(`${m(f)} template inserted into draft.`)}})})):(L.innerHTML="",L.hidden=!0)),A&&(!h||!p?(A.innerHTML="",A.hidden=!0):(A.hidden=!1,A.innerHTML=`
          <p class="composer-template-actions-copy">
            Keep the current draft, append the suggestion, or replace it with:
            <span class="composer-template-preview">${c(h)}</span>
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
        `,[...A.querySelectorAll('[data-role="template-merge-action"]')].forEach(u=>{u.addEventListener("click",()=>{const g=u.getAttribute("data-merge-mode");if(g==="replace"||g==="append"){se(g);return}w(),S(),b("Template merge cancelled.")})}))),C&&(T?(C.hidden=!1,C.innerHTML=`
          <p class="composer-guide-copy">${c(T.message)}</p>
          <div class="composer-shortcuts">
            ${T.shortcuts.map(u=>`
                  <button
                    class="composer-shortcut"
                    type="button"
                    data-role="composer-shortcut"
                    data-shortcut-kind="${c(u)}"
                  >${c(m(u))}</button>
                `).join("")}
          </div>
        `,[...C.querySelectorAll('[data-role="composer-shortcut"]')].forEach(u=>{u.addEventListener("click",()=>{const g=y(u.getAttribute("data-shortcut-kind"));K(g,{announcement:`Timeline filter set to ${m(g)}.`}),r==null||r.focus()})})):(C.innerHTML="",C.hidden=!0))}function O(n){s.disabled=n,R.forEach(l=>{l.disabled=n}),r&&(r.disabled=n)}r==null||r.addEventListener("input",()=>{h&&w(),S()}),I==null||I.addEventListener("click",()=>{re()}),i==null||i.addEventListener("click",()=>{M(!v,`Shortcut help ${v?"closed":"opened"}.`,{moveFocus:!0})}),E==null||E.addEventListener("click",()=>{M(!1,"Shortcut help closed.",{moveFocus:!0})}),e.ownerDocument.addEventListener("keydown",n=>{var T;if(n.key==="Escape"&&h){n.preventDefault(),w(),S(),b("Template merge cancelled.");return}if(n.key==="Escape"&&v){n.preventDefault(),M(!1,"Shortcut help closed.",{moveFocus:!0});return}if(n.key==="Tab"&&v){const $=[k,E].filter(Boolean);if(!$.length)return;const N=e.ownerDocument.activeElement,u=$.indexOf(N);if(u===-1){n.preventDefault(),ie(n.shiftKey);return}const g=n.shiftKey?(u-1+$.length)%$.length:(u+1)%$.length;n.preventDefault(),(T=$[g])==null||T.focus();return}if(n.key==="?"&&!le(n.target)){n.preventDefault(),M(!v,`Shortcut help ${v?"closed":"opened"}.`,{moveFocus:!0});return}if(!n.altKey||n.ctrlKey||n.metaKey||n.shiftKey)return;const l=Number.parseInt(n.key,10)-1;if(Number.isNaN(l)||l<0||l>=F.length)return;n.preventDefault();const p=F[l];K(p,{announcement:`Timeline filter set to ${m(p)}.`})});async function X(n){if(!n||typeof t.performAction!="function")return;const l=typeof(r==null?void 0:r.value)=="string"?r.value.trim():"";O(!0),o.textContent=`Adapter: sending ${n}`,b(`Sending ${m(n)} action.`);try{await t.performAction(n,l||void 0),w(),f=y(n),r&&(r.value=""),await B(),b(`${m(n)} action sent.`)}catch(p){a.innerHTML=te(p),o.textContent="Adapter: action failed",O(!1),b(`${m(n)} action failed.`)}}r==null||r.addEventListener("keydown",n=>{if(n.key==="Escape"&&h){n.preventDefault(),w(),S(),b("Template merge cancelled.");return}n.key==="Enter"&&(n.ctrlKey||n.metaKey)&&D(f)&&(n.preventDefault(),X(f))});function Y(){if(!P){j(),S();return}a.innerHTML=xe(P,f),j(),S(),[...a.querySelectorAll('[data-role="timeline-filter"]')].forEach(l=>{l.addEventListener("click",()=>{const p=y(l.getAttribute("data-filter-kind"));K(p,{announcement:`Timeline filter set to ${m(p)}.`})})})}async function B(){O(!0),s.textContent="Refreshing...",o.textContent="Adapter: syncing local loop";try{const n=await t.getCompanionState(),l=oe(n);P=l,Y(),o.textContent=`Adapter: ${l.adapterLabel}`}catch(n){P=null,a.innerHTML=te(n),o.textContent="Adapter: degraded"}finally{O(!1),s.textContent="Refresh mood"}}for(const n of R)n.addEventListener("click",async()=>{const l=n.getAttribute("data-action");await X(l)});return s.addEventListener("click",()=>{B()}),j(),Z(),S(),await B(),{reload:B}}const W=document.getElementById("app");W&&Ie(W,{adapter:pe()}).catch(e=>{W.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${e instanceof Error?e.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
