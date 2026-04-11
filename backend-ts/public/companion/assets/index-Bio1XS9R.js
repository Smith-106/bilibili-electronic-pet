(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const d of o)if(d.type==="childList")for(const l of d.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&s(l)}).observe(document,{childList:!0,subtree:!0});function n(o){const d={};return o.integrity&&(d.integrity=o.integrity),o.referrerPolicy&&(d.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?d.credentials="include":o.crossOrigin==="anonymous"?d.credentials="omit":d.credentials="same-origin",d}function s(o){if(o.ep)return;o.ep=!0;const d=n(o);fetch(o.href,d)}})();const be=Object.freeze({petName:"Mochi",statusLine:"Idle on the browser ledge, listening for the next check-in.",loopMode:"Local placeholder loop",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Local stub",loopHint:"Swap this adapter with a real pet core endpoint when the contract is ready.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a light status ping."},memoryTitle:"Short-term memory",memorySummary:"Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays local until the real API is wired in."],recentInteractions:[{kind:"pat",title:"Pat interaction",detail:"A calm pat kept Mochi settled on the browser ledge.",timestamp:"2026-04-10T03:28:00.000Z",source:"Local Stub"},{kind:"signal",title:"Status pulse",detail:"The local adapter emitted a lightweight keep-alive signal.",timestamp:"2026-04-10T03:30:00.000Z",source:"Local Stub"}]});function ge(e){return JSON.parse(JSON.stringify(e))}function re(e=be){return{async getCompanionState(){return await Promise.resolve(),ge(e)}}}function ye({endpoint:e="/companion/state",actionEndpoint:a="/companion/actions",fetchImpl:n=(o=>(o=globalThis.fetch)==null?void 0:o.bind(globalThis))(),fallback:s=re()}={}){return{async getCompanionState(){if(typeof n!="function")return s.getCompanionState();try{const d=await n(e,{headers:{Accept:"application/json"}});if(!d.ok)throw new Error(`companion_state_${d.status}`);const l=await d.json();if(!l||typeof l!="object")throw new Error("companion_state_invalid");return l}catch{return s.getCompanionState()}},async performAction(d,l){if(typeof n!="function")return{ok:!1,fallback:!0};const y=await n(a,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({action:d,note:l})});if(!y.ok)throw new Error(`companion_action_${y.status}`);return y.json()}}}const Se=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],ve=["Local companion loop has not reported any recent signals yet."],ke=[{kind:"signal",title:"Companion signal pending",detail:"No structured interaction timeline is available yet.",timestamp:"Pending",source:"Local stub"}],O=["all","pat","feed","wake","signal","fallback"],K=["pat","feed","wake"],M=Symbol("petCompanionCleanup");function se(e){return{key:String(e+1),label:`Alt+${e+1}`}}function we(e){const a=String(e??"").trim().toLowerCase();return a==="pat"||a==="feed"||a==="wake"||a==="signal"?a:a==="fallback"?"fallback":"signal"}function Le(e){const a=String((e==null?void 0:e.source)??"").trim().toLowerCase(),n=String((e==null?void 0:e.title)??"").trim().toLowerCase();return a.includes("fallback")||n.includes("fallback")?"fallback":n.includes("pat")?"pat":n.includes("feed")?"feed":n.includes("wake")?"wake":"signal"}function m(e){return e==="all"?"All":e==="pat"?"Pat":e==="feed"?"Feed":e==="wake"?"Wake":e==="fallback"?"Fallback":"Signal"}function g(e){const a=String(e??"").trim().toLowerCase();return O.includes(a)?a:"all"}function B(e){return K.includes(g(e))}function Ce(e){const a=g(e);return a==="pat"?{label:"Pat note",placeholder:"Optional note for the next pat.",hint:"Describe the comfort, bond, or calming signal you want the timeline to capture. Press Ctrl+Enter to send."}:a==="feed"?{label:"Feed note",placeholder:"Optional note for the next feed.",hint:"Add snack, refill, or appetite context so the feed entry reads clearly later. Press Ctrl+Enter to send."}:a==="wake"?{label:"Wake note",placeholder:"Optional note for the next wake.",hint:"Explain the nudge or prompt that should bring the companion back into motion. Press Ctrl+Enter to send."}:{label:"Interaction note",placeholder:"Optional note for the next pat, feed, or wake.",hint:"Optional context travels into the companion timeline."}}function $e(e){const a=g(e);return B(a)?null:a==="signal"?{message:"Signal entries are read-only snapshots. Pick Pat, Feed, or Wake to focus the composer on a writable action.",shortcuts:K}:a==="fallback"?{message:"Fallback entries describe degraded state only. Switch to Pat, Feed, or Wake before drafting the next note.",shortcuts:K}:{message:"Notes publish through Pat, Feed, or Wake actions. Pick one to focus the composer before writing.",shortcuts:K}}function Ae(e){const a=g(e);return a==="signal"?"Signal entries are read-only. Pick Pat, Feed, or Wake before sending.":a==="fallback"?"Fallback entries are read-only. Pick Pat, Feed, or Wake before sending.":"Pick Pat, Feed, or Wake before sending a note."}function Te(e){const a=g(e);return a==="pat"?{label:"Suggested pat notes",templates:["Soft pat settled Mochi into a calmer loop.","Bond signal ticked upward after a gentle tap.","Comfort pass landed right on time for the next check-in."]}:a==="feed"?{label:"Suggested feed notes",templates:["Refilled snack tray and appetite stabilized.","Quick bite restored energy before the next loop window.","Treat drop landed cleanly and hunger signal eased."]}:a==="wake"?{label:"Suggested wake notes",templates:["Bright nudge reopened the interaction window.","Wake pulse brought Mochi back into active mode.","Gentle prompt resumed the browser buddy loop."]}:null}function xe(e,a,n){const s=g(e),o=String(a??"").trim();return n?{label:"Template waiting",detail:"Choose Replace, Append, or Cancel to resolve the current draft.",tone:"pending"}:o?B(s)?{label:`${m(s)} draft ready`,detail:`Will publish with the next ${m(s).toLowerCase()} action.`,tone:"ready"}:{label:"Draft waiting",detail:"Pick Pat, Feed, or Wake to send this note.",tone:"pending"}:B(s)?{label:`${m(s)} draft empty`,detail:"Type a note or pick a template to stage the next action.",tone:"idle"}:{label:"Composer idle",detail:"Select Pat, Feed, or Wake to focus the draft composer.",tone:"idle"}}function Ee(){return`
    <ul class="shortcut-help-list">
      ${O.map((a,n)=>`
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">${c(se(n).label)}</span>
        <span>${c(`Switch timeline to ${m(a)}.`)}</span>
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
  `}function c(e){return String(e).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function x(e){return`${e.toISOString().slice(0,16).replace("T"," ")} UTC`}function U(e,a,n,s){const o=Math.max(1,Math.round(Math.abs(e)/a)),d=o===1?n:s;return e>=0?`${o} ${d} ago`:`in ${o} ${d}`}function Ie(e){const a=String(e??"").trim();if(!a||a.toLowerCase()==="pending")return{label:a||"Pending",exact:"",machine:""};const n=new Date(a);if(Number.isNaN(n.getTime()))return{label:a,exact:"",machine:""};const s=Math.round((Date.now()-n.getTime())/1e3),o=Math.abs(s);return o<45?{label:s>=0?"just now":"in moments",exact:x(n),machine:n.toISOString()}:o<60*60?{label:U(s,60,"min","mins"),exact:x(n),machine:n.toISOString()}:o<60*60*24?{label:U(s,60*60,"hour","hours"),exact:x(n),machine:n.toISOString()}:o<60*60*24*7?{label:U(s,60*60*24,"day","days"),exact:x(n),machine:n.toISOString()}:{label:x(n),exact:x(n),machine:n.toISOString()}}function ce(e){const a=e&&typeof e=="object"?e:{},n=a.mood&&typeof a.mood=="object"?a.mood:{},s=Array.isArray(a.vitals)&&a.vitals.length?a.vitals:Se,o=Array.isArray(a.recentSignals)&&a.recentSignals.length?a.recentSignals:ve,d=Array.isArray(a.recentInteractions)&&a.recentInteractions.length?a.recentInteractions.map(l=>({kind:we((l==null?void 0:l.kind)||Le(l)),title:(l==null?void 0:l.title)||"Companion signal",detail:(l==null?void 0:l.detail)||"No detail published yet.",timestamp:(l==null?void 0:l.timestamp)||"Pending",source:(l==null?void 0:l.source)||"Memory"})):ke;return{petName:a.petName||"Companion",statusLine:a.statusLine||"Waiting for the first local update.",loopMode:a.loopMode||"Local placeholder loop",lastCheckIn:a.lastCheckIn||"Pending",adapterLabel:a.adapterLabel||"Local stub",loopHint:a.loopHint||"Wire a real endpoint later without changing the browser shell.",mood:{label:n.label||"Settling",note:n.note||"No mood note has been published yet."},memoryTitle:a.memoryTitle||"Memory summary",memorySummary:a.memorySummary||"No memory summary is available yet. The prototype stays useful even before backend contracts exist.",vitals:s,recentSignals:o,recentInteractions:d}}function Fe(e){return e.map(a=>`
        <article class="metric-card">
          <span class="metric-label">${c(a.label||"State")}</span>
          <strong class="metric-value">${c(a.value||"Unknown")}</strong>
        </article>
      `).join("")}function Pe(e){return e.map(a=>`<li class="signal-item">${c(a)}</li>`).join("")}function Me(e){const a=e.reduce((n,s)=>(n.all+=1,n[s.kind]=(n[s.kind]||0)+1,n),{all:0,pat:0,feed:0,wake:0,signal:0,fallback:0});return O.map(n=>({kind:n,label:m(n),count:a[n]||0}))}function Oe(e,a){return Me(e).map((n,s)=>{const o=se(s);return`
        <button
          class="timeline-filter${n.kind===a?" is-active":""}"
          type="button"
          data-role="timeline-filter"
          data-filter-kind="${c(n.kind)}"
          data-filter-shortcut="${c(o.key)}"
          aria-pressed="${n.kind===a?"true":"false"}"
        >
          <span>${c(n.label)}</span>
          <span class="timeline-filter-shortcut" aria-hidden="true">${c(o.label)}</span>
          <span class="timeline-filter-count">${c(n.count)}</span>
        </button>
      `}).join("")}function Be(e,a){const n=g(a),s=n==="all"?e:e.filter(o=>o.kind===n);return s.length===0?`
      <div class="timeline-empty" data-role="timeline-empty">
        No ${c(m(n).toLowerCase())} interactions yet.
      </div>
    `:s.map(o=>{const d=Ie(o.timestamp),l=m(o.kind);return`
        <article class="interaction-card interaction-card-${c(o.kind)}">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${c(o.title)}</h3>
              <p class="interaction-detail">${c(o.detail)}</p>
            </div>
            <div class="interaction-meta">
              <span class="interaction-kind interaction-kind-${c(o.kind)}">${c(l)}</span>
              <span class="interaction-source">${c(o.source)}</span>
            </div>
          </div>
          <time
            class="interaction-time"
            ${d.machine?`datetime="${c(d.machine)}"`:""}
            ${d.exact?`title="${c(d.exact)}"`:""}
          >${c(d.label)}</time>
        </article>
      `}).join("")}function De(e,a="all"){const n=ce(e),s=g(a);return`
    <div class="panel-grid">
      <section class="panel panel-pet" aria-labelledby="companion-name">
        <div class="pet-avatar" aria-hidden="true">
          <span class="pet-core"></span>
        </div>
        <div class="panel-copy-stack">
          <p class="section-label">Companion</p>
          <h2 id="companion-name">${c(n.petName)}</h2>
          <p class="status-line">${c(n.statusLine)}</p>
          <dl class="meta-list">
            <div>
              <dt>Loop mode</dt>
              <dd>${c(n.loopMode)}</dd>
            </div>
            <div>
              <dt>Last check-in</dt>
              <dd>${c(n.lastCheckIn)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="panel" aria-labelledby="mood-heading">
        <p class="section-label">Mood</p>
        <h2 id="mood-heading">${c(n.mood.label)}</h2>
        <p class="panel-copy">${c(n.mood.note)}</p>
        <p class="hint-text">${c(n.loopHint)}</p>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${c(n.memoryTitle)}</h2>
        <p class="panel-copy">${c(n.memorySummary)}</p>
        <ul class="signal-list">
          ${Pe(n.recentSignals)}
        </ul>
      </section>

      <section class="panel panel-history" aria-labelledby="timeline-heading">
        <p class="section-label">Recent interactions</p>
        <h2 id="timeline-heading">Companion timeline</h2>
        <div class="timeline-filter-bar" data-role="timeline-filter-bar">
          ${Oe(n.recentInteractions,s)}
        </div>
        <div class="interaction-list">
          ${Be(n.recentInteractions,s)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${Fe(n.vitals)}
        </div>
      </section>
    </div>
  `}function le(e){const a=e instanceof Error?e.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${c(a)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function Ne(){return`
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
            ${Ee()}
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
  `}async function qe(e,{adapter:a=re()}={}){if(!e)throw new Error("A target element is required to render the pet companion surface.");typeof e[M]=="function"&&e[M](),e.innerHTML=Ne();const n=e.ownerDocument,s=e.querySelector('[data-role="content"]'),o=e.querySelector('[data-action="refresh"]'),d=e.querySelector('[data-role="adapter-status"]'),l=e.querySelector('[data-role="shortcut-help-toggle"]'),y=e.querySelector('[data-role="shortcut-help"]'),E=e.querySelector('[data-role="shortcut-help-title"]'),I=e.querySelector('[data-role="shortcut-help-close"]'),j=e.querySelector('[data-role="live-region"]'),r=e.querySelector('[data-role="action-note"]'),V=e.querySelector('[data-role="action-note-label"]'),J=e.querySelector('[data-role="action-note-hint"]'),Q=e.querySelector('[data-role="action-note-status"]'),Z=e.querySelector('[data-role="action-note-status-label"]'),X=e.querySelector('[data-role="action-note-status-detail"]'),F=e.querySelector('[data-role="action-note-clear"]'),C=e.querySelector('[data-role="composer-templates"]'),$=e.querySelector('[data-role="composer-template-actions"]'),A=e.querySelector('[data-role="composer-guide"]'),W=[...e.querySelectorAll('[data-role="action-buttons"] [data-action]')];let f="all",D=null,b=null,v=!1,Y="";function de(t){return!!(t&&typeof t=="object"&&"tagName"in t&&["INPUT","TEXTAREA","SELECT"].includes(String(t.tagName).toUpperCase()))}function pe(t){return!t||typeof t!="object"||!("closest"in t)?null:t.closest('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]')}function z(){W.forEach(t=>{const p=t.getAttribute("data-action")===f;t.classList.toggle("is-linked",p),t.setAttribute("data-filter-linked",p?"true":"false")})}function h(t){const i=String(t??"").trim();!j||!i||(Y===i&&(j.textContent=""),Y=i,j.textContent=i)}function ee(){l&&(l.setAttribute("aria-expanded",v?"true":"false"),l.classList.toggle("is-active",v)),y&&(y.hidden=!v)}function ue(t=!1){const i=[E,I].filter(Boolean);if(!i.length)return;const p=t?i[i.length-1]:i[0];p==null||p.focus()}function P(t,i,{moveFocus:p=!1}={}){v=t,ee(),p&&(t?E==null||E.focus():l==null||l.focus()),i&&h(i)}function me(t){return!!(t&&(y!=null&&y.contains(t)||l!=null&&l.contains(t)))}function H(t,{announcement:i}={}){const p=g(t);p!==f&&(w(),f=p,oe(),i&&h(i))}function w(){b=null}function fe(){r&&(r.value="",r.focus()),w(),k(),h("Draft cleared.")}function he(t){if(!r||!b)return;const i=r.value.trim();t==="append"&&i?r.value=`${i}
${b}`:r.value=b,r.focus(),w(),k(),h(`${m(f)} template ${t==="append"?"appended to":"replaced"} draft.`)}function k(){const t=Ce(f),i=xe(f,r==null?void 0:r.value,b),p=Te(f),T=$e(f),L=!!(r!=null&&r.value.trim())||!!b;V&&(V.textContent=t.label),r&&(r.placeholder=t.placeholder,r.setAttribute("data-composer-kind",g(f))),J&&(J.textContent=t.hint),Q&&Q.setAttribute("data-status-tone",i.tone),Z&&(Z.textContent=i.label),X&&(X.textContent=i.detail),F&&(F.disabled=!L),C&&(p?(C.hidden=!1,C.innerHTML=`
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
        `,[...C.querySelectorAll('[data-role="composer-template"]')].forEach(u=>{u.addEventListener("click",()=>{if(r){const S=u.getAttribute("data-template-value")??"",ie=r.value.trim();if(ie&&ie!==S){b=S,k(),h("Template selected. Choose Replace, Append, or Cancel.");return}r.value=S,r.focus(),w(),k(),h(`${m(f)} template inserted into draft.`)}})})):(C.innerHTML="",C.hidden=!0)),$&&(!b||!p?($.innerHTML="",$.hidden=!0):($.hidden=!1,$.innerHTML=`
          <p class="composer-template-actions-copy">
            Keep the current draft, append the suggestion, or replace it with:
            <span class="composer-template-preview">${c(b)}</span>
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
        `,[...$.querySelectorAll('[data-role="template-merge-action"]')].forEach(u=>{u.addEventListener("click",()=>{const S=u.getAttribute("data-merge-mode");if(S==="replace"||S==="append"){he(S);return}w(),k(),h("Template merge cancelled.")})}))),A&&(T?(A.hidden=!1,A.innerHTML=`
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
        `,[...A.querySelectorAll('[data-role="composer-shortcut"]')].forEach(u=>{u.addEventListener("click",()=>{const S=g(u.getAttribute("data-shortcut-kind"));H(S,{announcement:`Timeline filter set to ${m(S)}.`}),r==null||r.focus()})})):(A.innerHTML="",A.hidden=!0))}function N(t){o.disabled=t,W.forEach(i=>{i.disabled=t}),r&&(r.disabled=t)}r==null||r.addEventListener("input",()=>{b&&w(),k()}),F==null||F.addEventListener("click",()=>{fe()}),l==null||l.addEventListener("click",()=>{P(!v,`Shortcut help ${v?"closed":"opened"}.`,{moveFocus:!0})}),I==null||I.addEventListener("click",()=>{P(!1,"Shortcut help closed.",{moveFocus:!0})});function te(t){if(!v||me(t.target))return;const i=pe(t.target),p=!!(y!=null&&y.contains(n.activeElement));P(!1,"Shortcut help closed.",{moveFocus:!i&&p})}function ae(t){var T;if(t.key==="Escape"&&b){t.preventDefault(),w(),k(),h("Template merge cancelled.");return}if(t.key==="Escape"&&v){t.preventDefault(),P(!1,"Shortcut help closed.",{moveFocus:!0});return}if(t.key==="Tab"&&v){const L=[E,I].filter(Boolean);if(!L.length)return;const R=e.ownerDocument.activeElement,u=L.indexOf(R);if(u===-1){t.preventDefault(),ue(t.shiftKey);return}const S=t.shiftKey?(u-1+L.length)%L.length:(u+1)%L.length;t.preventDefault(),(T=L[S])==null||T.focus();return}if(t.key==="?"&&!de(t.target)){t.preventDefault(),P(!v,`Shortcut help ${v?"closed":"opened"}.`,{moveFocus:!0});return}if(!t.altKey||t.ctrlKey||t.metaKey||t.shiftKey)return;const i=Number.parseInt(t.key,10)-1;if(Number.isNaN(i)||i<0||i>=O.length)return;t.preventDefault();const p=O[i];H(p,{announcement:`Timeline filter set to ${m(p)}.`})}n.addEventListener("click",te),n.addEventListener("keydown",ae);async function ne(t){if(!t)return;if(b){h("Resolve template merge before sending.");return}if(typeof a.performAction!="function"){d.textContent="Adapter: action unavailable",h(`${m(t)} action is unavailable in this preview.`);return}const i=typeof(r==null?void 0:r.value)=="string"?r.value.trim():"";N(!0),d.textContent=`Adapter: sending ${t}`,h(`Sending ${m(t)} action.`);try{await a.performAction(t,i||void 0),w(),f=g(t),r&&(r.value=""),await q(),h(`${m(t)} action sent.`)}catch(p){s.innerHTML=le(p),d.textContent="Adapter: action failed",N(!1),h(`${m(t)} action failed.`)}}r==null||r.addEventListener("keydown",t=>{if(t.key==="Escape"&&b){t.preventDefault(),w(),k(),h("Template merge cancelled.");return}if(t.key==="Enter"&&(t.ctrlKey||t.metaKey)&&!B(f)){t.preventDefault(),h(Ae(f));return}t.key==="Enter"&&(t.ctrlKey||t.metaKey)&&B(f)&&(t.preventDefault(),ne(f))});function oe(){if(!D){z(),k();return}s.innerHTML=De(D,f),z(),k(),[...s.querySelectorAll('[data-role="timeline-filter"]')].forEach(i=>{i.addEventListener("click",()=>{const p=g(i.getAttribute("data-filter-kind"));H(p,{announcement:`Timeline filter set to ${m(p)}.`})})})}async function q(){N(!0),o.textContent="Refreshing...",d.textContent="Adapter: syncing local loop";try{const t=await a.getCompanionState(),i=ce(t);D=i,oe(),d.textContent=`Adapter: ${i.adapterLabel}`}catch(t){D=null,s.innerHTML=le(t),d.textContent="Adapter: degraded"}finally{N(!1),o.textContent="Refresh mood"}}for(const t of W)t.addEventListener("click",async()=>{const i=t.getAttribute("data-action");await ne(i)});o.addEventListener("click",()=>{q()});function _(){n.removeEventListener("click",te),n.removeEventListener("keydown",ae),e[M]===_&&delete e[M]}return e[M]=_,z(),ee(),k(),await q(),{destroy:_,reload:q}}const G=document.getElementById("app");G&&qe(G,{adapter:ye()}).catch(e=>{G.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${e instanceof Error?e.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
