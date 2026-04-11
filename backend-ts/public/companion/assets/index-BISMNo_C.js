(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))l(o);new MutationObserver(o=>{for(const s of o)if(s.type==="childList")for(const d of s.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&l(d)}).observe(document,{childList:!0,subtree:!0});function a(o){const s={};return o.integrity&&(s.integrity=o.integrity),o.referrerPolicy&&(s.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?s.credentials="include":o.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function l(o){if(o.ep)return;o.ep=!0;const s=a(o);fetch(o.href,s)}})();const le=Object.freeze({petName:"Mochi",statusLine:"Idle on the browser ledge, listening for the next check-in.",loopMode:"Local placeholder loop",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Local stub",loopHint:"Swap this adapter with a real pet core endpoint when the contract is ready.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a light status ping."},memoryTitle:"Short-term memory",memorySummary:"Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays local until the real API is wired in."],recentInteractions:[{kind:"pat",title:"Pat interaction",detail:"A calm pat kept Mochi settled on the browser ledge.",timestamp:"2026-04-10T03:28:00.000Z",source:"Local Stub"},{kind:"signal",title:"Status pulse",detail:"The local adapter emitted a lightweight keep-alive signal.",timestamp:"2026-04-10T03:30:00.000Z",source:"Local Stub"}]});function re(e){return JSON.parse(JSON.stringify(e))}function Y(e=le){return{async getCompanionState(){return await Promise.resolve(),re(e)}}}function se({endpoint:e="/companion/state",actionEndpoint:t="/companion/actions",fetchImpl:a=(o=>(o=globalThis.fetch)==null?void 0:o.bind(globalThis))(),fallback:l=Y()}={}){return{async getCompanionState(){if(typeof a!="function")return l.getCompanionState();try{const s=await a(e,{headers:{Accept:"application/json"}});if(!s.ok)throw new Error(`companion_state_${s.status}`);const d=await s.json();if(!d||typeof d!="object")throw new Error("companion_state_invalid");return d}catch{return l.getCompanionState()}},async performAction(s,d){if(typeof a!="function")return{ok:!1,fallback:!0};const w=await a(t,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({action:s,note:d})});if(!w.ok)throw new Error(`companion_action_${w.status}`);return w.json()}}}const ce=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],de=["Local companion loop has not reported any recent signals yet."],pe=[{kind:"signal",title:"Companion signal pending",detail:"No structured interaction timeline is available yet.",timestamp:"Pending",source:"Local stub"}],x=["all","pat","feed","wake","signal","fallback"],F=["pat","feed","wake"];function ee(e){return{key:String(e+1),label:`Alt+${e+1}`}}function ue(e){const t=String(e??"").trim().toLowerCase();return t==="pat"||t==="feed"||t==="wake"||t==="signal"?t:t==="fallback"?"fallback":"signal"}function me(e){const t=String((e==null?void 0:e.source)??"").trim().toLowerCase(),a=String((e==null?void 0:e.title)??"").trim().toLowerCase();return t.includes("fallback")||a.includes("fallback")?"fallback":a.includes("pat")?"pat":a.includes("feed")?"feed":a.includes("wake")?"wake":"signal"}function u(e){return e==="all"?"All":e==="pat"?"Pat":e==="feed"?"Feed":e==="wake"?"Wake":e==="fallback"?"Fallback":"Signal"}function g(e){const t=String(e??"").trim().toLowerCase();return x.includes(t)?t:"all"}function M(e){return F.includes(g(e))}function fe(e){const t=g(e);return t==="pat"?{label:"Pat note",placeholder:"Optional note for the next pat.",hint:"Describe the comfort, bond, or calming signal you want the timeline to capture. Press Ctrl+Enter to send."}:t==="feed"?{label:"Feed note",placeholder:"Optional note for the next feed.",hint:"Add snack, refill, or appetite context so the feed entry reads clearly later. Press Ctrl+Enter to send."}:t==="wake"?{label:"Wake note",placeholder:"Optional note for the next wake.",hint:"Explain the nudge or prompt that should bring the companion back into motion. Press Ctrl+Enter to send."}:{label:"Interaction note",placeholder:"Optional note for the next pat, feed, or wake.",hint:"Optional context travels into the companion timeline."}}function he(e){const t=g(e);return M(t)?null:t==="signal"?{message:"Signal entries are read-only snapshots. Pick Pat, Feed, or Wake to focus the composer on a writable action.",shortcuts:F}:t==="fallback"?{message:"Fallback entries describe degraded state only. Switch to Pat, Feed, or Wake before drafting the next note.",shortcuts:F}:{message:"Notes publish through Pat, Feed, or Wake actions. Pick one to focus the composer before writing.",shortcuts:F}}function be(e){const t=g(e);return t==="pat"?{label:"Suggested pat notes",templates:["Soft pat settled Mochi into a calmer loop.","Bond signal ticked upward after a gentle tap.","Comfort pass landed right on time for the next check-in."]}:t==="feed"?{label:"Suggested feed notes",templates:["Refilled snack tray and appetite stabilized.","Quick bite restored energy before the next loop window.","Treat drop landed cleanly and hunger signal eased."]}:t==="wake"?{label:"Suggested wake notes",templates:["Bright nudge reopened the interaction window.","Wake pulse brought Mochi back into active mode.","Gentle prompt resumed the browser buddy loop."]}:null}function ge(e,t,a){const l=g(e),o=String(t??"").trim();return a?{label:"Template waiting",detail:"Choose Replace, Append, or Cancel to resolve the current draft.",tone:"pending"}:o?M(l)?{label:`${u(l)} draft ready`,detail:`Will publish with the next ${u(l).toLowerCase()} action.`,tone:"ready"}:{label:"Draft waiting",detail:"Pick Pat, Feed, or Wake to send this note.",tone:"pending"}:M(l)?{label:`${u(l)} draft empty`,detail:"Type a note or pick a template to stage the next action.",tone:"idle"}:{label:"Composer idle",detail:"Select Pat, Feed, or Wake to focus the draft composer.",tone:"idle"}}function ye(){return`
    <ul class="shortcut-help-list">
      ${x.map((t,a)=>`
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">${r(ee(a).label)}</span>
        <span>${r(`Switch timeline to ${u(t)}.`)}</span>
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
  `}function r(e){return String(e).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function C(e){return`${e.toISOString().slice(0,16).replace("T"," ")} UTC`}function D(e,t,a,l){const o=Math.max(1,Math.round(Math.abs(e)/t)),s=o===1?a:l;return e>=0?`${o} ${s} ago`:`in ${o} ${s}`}function Se(e){const t=String(e??"").trim();if(!t||t.toLowerCase()==="pending")return{label:t||"Pending",exact:"",machine:""};const a=new Date(t);if(Number.isNaN(a.getTime()))return{label:t,exact:"",machine:""};const l=Math.round((Date.now()-a.getTime())/1e3),o=Math.abs(l);return o<45?{label:l>=0?"just now":"in moments",exact:C(a),machine:a.toISOString()}:o<60*60?{label:D(l,60,"min","mins"),exact:C(a),machine:a.toISOString()}:o<60*60*24?{label:D(l,60*60,"hour","hours"),exact:C(a),machine:a.toISOString()}:o<60*60*24*7?{label:D(l,60*60*24,"day","days"),exact:C(a),machine:a.toISOString()}:{label:C(a),exact:C(a),machine:a.toISOString()}}function te(e){const t=e&&typeof e=="object"?e:{},a=t.mood&&typeof t.mood=="object"?t.mood:{},l=Array.isArray(t.vitals)&&t.vitals.length?t.vitals:ce,o=Array.isArray(t.recentSignals)&&t.recentSignals.length?t.recentSignals:de,s=Array.isArray(t.recentInteractions)&&t.recentInteractions.length?t.recentInteractions.map(d=>({kind:ue((d==null?void 0:d.kind)||me(d)),title:(d==null?void 0:d.title)||"Companion signal",detail:(d==null?void 0:d.detail)||"No detail published yet.",timestamp:(d==null?void 0:d.timestamp)||"Pending",source:(d==null?void 0:d.source)||"Memory"})):pe;return{petName:t.petName||"Companion",statusLine:t.statusLine||"Waiting for the first local update.",loopMode:t.loopMode||"Local placeholder loop",lastCheckIn:t.lastCheckIn||"Pending",adapterLabel:t.adapterLabel||"Local stub",loopHint:t.loopHint||"Wire a real endpoint later without changing the browser shell.",mood:{label:a.label||"Settling",note:a.note||"No mood note has been published yet."},memoryTitle:t.memoryTitle||"Memory summary",memorySummary:t.memorySummary||"No memory summary is available yet. The prototype stays useful even before backend contracts exist.",vitals:l,recentSignals:o,recentInteractions:s}}function ve(e){return e.map(t=>`
        <article class="metric-card">
          <span class="metric-label">${r(t.label||"State")}</span>
          <strong class="metric-value">${r(t.value||"Unknown")}</strong>
        </article>
      `).join("")}function ke(e){return e.map(t=>`<li class="signal-item">${r(t)}</li>`).join("")}function we(e){const t=e.reduce((a,l)=>(a.all+=1,a[l.kind]=(a[l.kind]||0)+1,a),{all:0,pat:0,feed:0,wake:0,signal:0,fallback:0});return x.map(a=>({kind:a,label:u(a),count:t[a]||0}))}function $e(e,t){return we(e).map((a,l)=>{const o=ee(l);return`
        <button
          class="timeline-filter${a.kind===t?" is-active":""}"
          type="button"
          data-role="timeline-filter"
          data-filter-kind="${r(a.kind)}"
          data-filter-shortcut="${r(o.key)}"
          aria-pressed="${a.kind===t?"true":"false"}"
        >
          <span>${r(a.label)}</span>
          <span class="timeline-filter-shortcut" aria-hidden="true">${r(o.label)}</span>
          <span class="timeline-filter-count">${r(a.count)}</span>
        </button>
      `}).join("")}function Le(e,t){const a=g(t),l=a==="all"?e:e.filter(o=>o.kind===a);return l.length===0?`
      <div class="timeline-empty" data-role="timeline-empty">
        No ${r(u(a).toLowerCase())} interactions yet.
      </div>
    `:l.map(o=>{const s=Se(o.timestamp),d=u(o.kind);return`
        <article class="interaction-card interaction-card-${r(o.kind)}">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${r(o.title)}</h3>
              <p class="interaction-detail">${r(o.detail)}</p>
            </div>
            <div class="interaction-meta">
              <span class="interaction-kind interaction-kind-${r(o.kind)}">${r(d)}</span>
              <span class="interaction-source">${r(o.source)}</span>
            </div>
          </div>
          <time
            class="interaction-time"
            ${s.machine?`datetime="${r(s.machine)}"`:""}
            ${s.exact?`title="${r(s.exact)}"`:""}
          >${r(s.label)}</time>
        </article>
      `}).join("")}function Ae(e,t="all"){const a=te(e),l=g(t);return`
    <div class="panel-grid">
      <section class="panel panel-pet" aria-labelledby="companion-name">
        <div class="pet-avatar" aria-hidden="true">
          <span class="pet-core"></span>
        </div>
        <div class="panel-copy-stack">
          <p class="section-label">Companion</p>
          <h2 id="companion-name">${r(a.petName)}</h2>
          <p class="status-line">${r(a.statusLine)}</p>
          <dl class="meta-list">
            <div>
              <dt>Loop mode</dt>
              <dd>${r(a.loopMode)}</dd>
            </div>
            <div>
              <dt>Last check-in</dt>
              <dd>${r(a.lastCheckIn)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="panel" aria-labelledby="mood-heading">
        <p class="section-label">Mood</p>
        <h2 id="mood-heading">${r(a.mood.label)}</h2>
        <p class="panel-copy">${r(a.mood.note)}</p>
        <p class="hint-text">${r(a.loopHint)}</p>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${r(a.memoryTitle)}</h2>
        <p class="panel-copy">${r(a.memorySummary)}</p>
        <ul class="signal-list">
          ${ke(a.recentSignals)}
        </ul>
      </section>

      <section class="panel panel-history" aria-labelledby="timeline-heading">
        <p class="section-label">Recent interactions</p>
        <h2 id="timeline-heading">Companion timeline</h2>
        <div class="timeline-filter-bar" data-role="timeline-filter-bar">
          ${$e(a.recentInteractions,l)}
        </div>
        <div class="interaction-list">
          ${Le(a.recentInteractions,l)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${ve(a.vitals)}
        </div>
      </section>
    </div>
  `}function X(e){const t=e instanceof Error?e.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${r(t)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function Ce(){return`
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
            ${ye()}
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
  `}async function Te(e,{adapter:t=Y()}={}){if(!e)throw new Error("A target element is required to render the pet companion surface.");e.innerHTML=Ce();const a=e.querySelector('[data-role="content"]'),l=e.querySelector('[data-action="refresh"]'),o=e.querySelector('[data-role="adapter-status"]'),s=e.querySelector('[data-role="shortcut-help-toggle"]'),d=e.querySelector('[data-role="shortcut-help"]'),w=e.querySelector('[data-role="live-region"]'),i=e.querySelector('[data-role="action-note"]'),j=e.querySelector('[data-role="action-note-label"]'),K=e.querySelector('[data-role="action-note-hint"]'),z=e.querySelector('[data-role="action-note-status"]'),W=e.querySelector('[data-role="action-note-status-label"]'),_=e.querySelector('[data-role="action-note-status-detail"]'),T=e.querySelector('[data-role="action-note-clear"]'),$=e.querySelector('[data-role="composer-templates"]'),L=e.querySelector('[data-role="composer-template-actions"]'),A=e.querySelector('[data-role="composer-guide"]'),O=[...e.querySelectorAll('[data-role="action-buttons"] [data-action]')];let m="all",E=null,h=null,v=!1,U="";function ae(n){return!!(n&&typeof n=="object"&&"tagName"in n&&["INPUT","TEXTAREA","SELECT"].includes(String(n.tagName).toUpperCase()))}function N(){O.forEach(n=>{const p=n.getAttribute("data-action")===m;n.classList.toggle("is-linked",p),n.setAttribute("data-filter-linked",p?"true":"false")})}function b(n){const c=String(n??"").trim();!w||!c||(U===c&&(w.textContent=""),U=c,w.textContent=c)}function V(){s&&(s.setAttribute("aria-expanded",v?"true":"false"),s.classList.toggle("is-active",v)),d&&(d.hidden=!v)}function q(n,c){v=n,V(),c&&b(c)}function B(n,{announcement:c}={}){const p=g(n);p!==m&&(k(),m=p,J(),c&&b(c))}function k(){h=null}function ne(){i&&(i.value="",i.focus()),k(),y(),b("Draft cleared.")}function oe(n){if(!i||!h)return;const c=i.value.trim();n==="append"&&c?i.value=`${c}
${h}`:i.value=h,i.focus(),k(),y(),b(`${u(m)} template ${n==="append"?"appended to":"replaced"} draft.`)}function y(){const n=fe(m),c=ge(m,i==null?void 0:i.value,h),p=be(m),H=he(m),ie=!!(i!=null&&i.value.trim())||!!h;j&&(j.textContent=n.label),i&&(i.placeholder=n.placeholder,i.setAttribute("data-composer-kind",g(m))),K&&(K.textContent=n.hint),z&&z.setAttribute("data-status-tone",c.tone),W&&(W.textContent=c.label),_&&(_.textContent=c.detail),T&&(T.disabled=!ie),$&&(p?($.hidden=!1,$.innerHTML=`
          <p class="composer-templates-label">${r(p.label)}</p>
          <div class="composer-template-list">
            ${p.templates.map(f=>`
                  <button
                    class="composer-template"
                    type="button"
                    data-role="composer-template"
                    data-template-value="${r(f)}"
                  >${r(f)}</button>
                `).join("")}
          </div>
        `,[...$.querySelectorAll('[data-role="composer-template"]')].forEach(f=>{f.addEventListener("click",()=>{if(i){const S=f.getAttribute("data-template-value")??"",Z=i.value.trim();if(Z&&Z!==S){h=S,y(),b("Template selected. Choose Replace, Append, or Cancel.");return}i.value=S,i.focus(),k(),y(),b(`${u(m)} template inserted into draft.`)}})})):($.innerHTML="",$.hidden=!0)),L&&(!h||!p?(L.innerHTML="",L.hidden=!0):(L.hidden=!1,L.innerHTML=`
          <p class="composer-template-actions-copy">
            Keep the current draft, append the suggestion, or replace it with:
            <span class="composer-template-preview">${r(h)}</span>
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
        `,[...L.querySelectorAll('[data-role="template-merge-action"]')].forEach(f=>{f.addEventListener("click",()=>{const S=f.getAttribute("data-merge-mode");if(S==="replace"||S==="append"){oe(S);return}k(),y(),b("Template merge cancelled.")})}))),A&&(H?(A.hidden=!1,A.innerHTML=`
          <p class="composer-guide-copy">${r(H.message)}</p>
          <div class="composer-shortcuts">
            ${H.shortcuts.map(f=>`
                  <button
                    class="composer-shortcut"
                    type="button"
                    data-role="composer-shortcut"
                    data-shortcut-kind="${r(f)}"
                  >${r(u(f))}</button>
                `).join("")}
          </div>
        `,[...A.querySelectorAll('[data-role="composer-shortcut"]')].forEach(f=>{f.addEventListener("click",()=>{const S=g(f.getAttribute("data-shortcut-kind"));B(S,{announcement:`Timeline filter set to ${u(S)}.`}),i==null||i.focus()})})):(A.innerHTML="",A.hidden=!0))}function I(n){l.disabled=n,O.forEach(c=>{c.disabled=n}),i&&(i.disabled=n)}i==null||i.addEventListener("input",()=>{h&&k(),y()}),T==null||T.addEventListener("click",()=>{ne()}),s==null||s.addEventListener("click",()=>{q(!v,`Shortcut help ${v?"closed":"opened"}.`)}),e.ownerDocument.addEventListener("keydown",n=>{if(n.key==="Escape"&&h){n.preventDefault(),k(),y(),b("Template merge cancelled.");return}if(n.key==="Escape"&&v){n.preventDefault(),q(!1,"Shortcut help closed.");return}if(n.key==="?"&&!ae(n.target)){n.preventDefault(),q(!v,`Shortcut help ${v?"closed":"opened"}.`);return}if(!n.altKey||n.ctrlKey||n.metaKey||n.shiftKey)return;const c=Number.parseInt(n.key,10)-1;if(Number.isNaN(c)||c<0||c>=x.length)return;n.preventDefault();const p=x[c];B(p,{announcement:`Timeline filter set to ${u(p)}.`})});async function G(n){if(!n||typeof t.performAction!="function")return;const c=typeof(i==null?void 0:i.value)=="string"?i.value.trim():"";I(!0),o.textContent=`Adapter: sending ${n}`,b(`Sending ${u(n)} action.`);try{await t.performAction(n,c||void 0),k(),m=g(n),i&&(i.value=""),await P(),b(`${u(n)} action sent.`)}catch(p){a.innerHTML=X(p),o.textContent="Adapter: action failed",I(!1),b(`${u(n)} action failed.`)}}i==null||i.addEventListener("keydown",n=>{if(n.key==="Escape"&&h){n.preventDefault(),k(),y(),b("Template merge cancelled.");return}n.key==="Enter"&&(n.ctrlKey||n.metaKey)&&M(m)&&(n.preventDefault(),G(m))});function J(){if(!E){N(),y();return}a.innerHTML=Ae(E,m),N(),y(),[...a.querySelectorAll('[data-role="timeline-filter"]')].forEach(c=>{c.addEventListener("click",()=>{const p=g(c.getAttribute("data-filter-kind"));B(p,{announcement:`Timeline filter set to ${u(p)}.`})})})}async function P(){I(!0),l.textContent="Refreshing...",o.textContent="Adapter: syncing local loop";try{const n=await t.getCompanionState(),c=te(n);E=c,J(),o.textContent=`Adapter: ${c.adapterLabel}`}catch(n){E=null,a.innerHTML=X(n),o.textContent="Adapter: degraded"}finally{I(!1),l.textContent="Refresh mood"}}for(const n of O)n.addEventListener("click",async()=>{const c=n.getAttribute("data-action");await G(c)});return l.addEventListener("click",()=>{P()}),N(),V(),y(),await P(),{reload:P}}const R=document.getElementById("app");R&&Te(R,{adapter:se()}).catch(e=>{R.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${e instanceof Error?e.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
