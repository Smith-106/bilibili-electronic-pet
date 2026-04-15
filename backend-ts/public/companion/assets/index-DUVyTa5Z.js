(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const p of i)if(p.type==="childList")for(const d of p.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&o(d)}).observe(document,{childList:!0,subtree:!0});function a(i){const p={};return i.integrity&&(p.integrity=i.integrity),i.referrerPolicy&&(p.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?p.credentials="include":i.crossOrigin==="anonymous"?p.credentials="omit":p.credentials="same-origin",p}function o(i){if(i.ep)return;i.ep=!0;const p=a(i);fetch(i.href,p)}})();const be=Object.freeze({petName:"Mochi",statusLine:"Idle on the browser ledge, listening for the next check-in.",loopMode:"Local placeholder loop",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Local stub",loopHint:"Swap this adapter with a real pet core endpoint when the contract is ready.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a light status ping."},memoryTitle:"Short-term memory",memorySummary:"Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays local until the real API is wired in."],recentInteractions:[{kind:"pat",title:"Pat interaction",detail:"A calm pat kept Mochi settled on the browser ledge.",timestamp:"2026-04-10T03:28:00.000Z",source:"Local Stub"},{kind:"signal",title:"Status pulse",detail:"The local adapter emitted a lightweight keep-alive signal.",timestamp:"2026-04-10T03:30:00.000Z",source:"Local Stub"}]});function ge(e){return JSON.parse(JSON.stringify(e))}function se(e=be){return{async getCompanionState(){return await Promise.resolve(),ge(e)}}}function ye({endpoint:e="/companion/state-v2",legacyEndpoint:t="/companion/state",actionEndpoint:a="/companion/actions",fetchImpl:o=(p=>(p=globalThis.fetch)==null?void 0:p.bind(globalThis))(),fallback:i=se()}={}){return{async getCompanionState(){if(typeof o!="function")return i.getCompanionState();try{const d=await o(e,{headers:{Accept:"application/json"}});if(!d.ok&&t){const b=await o(t,{headers:{Accept:"application/json"}});if(!b.ok)throw new Error(`companion_state_${b.status}`);const k=await b.json();if(!k||typeof k!="object")throw new Error("companion_state_invalid");return k}if(!d.ok)throw new Error(`companion_state_${d.status}`);const h=await d.json();if(!h||typeof h!="object")throw new Error("companion_state_invalid");return h}catch{return i.getCompanionState()}},async performAction(d,h){if(typeof o!="function")return{ok:!1,fallback:!0};const b=await o(a,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({action:d,note:h})});if(!b.ok)throw new Error(`companion_action_${b.status}`);return b.json()}}}const ve=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],Se=["Local companion loop has not reported any recent signals yet."],ke=[{kind:"signal",title:"Companion signal pending",detail:"No structured interaction timeline is available yet.",timestamp:"Pending",source:"Local stub"}],B=["all","pat","feed","wake","signal","fallback"],_=["pat","feed","wake"],j=Symbol("petCompanionCleanup");function re(e){return{key:String(e+1),label:`Alt+${e+1}`}}function we(e){const t=String(e??"").trim().toLowerCase();return t==="pat"||t==="feed"||t==="wake"||t==="signal"?t:t==="fallback"?"fallback":"signal"}function $e(e){const t=String((e==null?void 0:e.source)??"").trim().toLowerCase(),a=String((e==null?void 0:e.title)??"").trim().toLowerCase();return t.includes("fallback")||a.includes("fallback")?"fallback":a.includes("pat")?"pat":a.includes("feed")?"feed":a.includes("wake")?"wake":"signal"}function f(e){return e==="all"?"All":e==="pat"?"Pat":e==="feed"?"Feed":e==="wake"?"Wake":e==="fallback"?"Fallback":"Signal"}function S(e){const t=String(e??"").trim().toLowerCase();return B.includes(t)?t:"all"}function O(e){return _.includes(S(e))}function Ae(e){const t=S(e);return t==="pat"?{label:"Pat note",placeholder:"Optional note for the next pat.",hint:"Describe the comfort, bond, or calming signal you want the timeline to capture. Press Ctrl+Enter to send."}:t==="feed"?{label:"Feed note",placeholder:"Optional note for the next feed.",hint:"Add snack, refill, or appetite context so the feed entry reads clearly later. Press Ctrl+Enter to send."}:t==="wake"?{label:"Wake note",placeholder:"Optional note for the next wake.",hint:"Explain the nudge or prompt that should bring the companion back into motion. Press Ctrl+Enter to send."}:{label:"Interaction note",placeholder:"Optional note for the next pat, feed, or wake.",hint:"Optional context travels into the companion timeline."}}function Le(e){const t=S(e);return O(t)?null:t==="signal"?{message:"Signal entries are read-only snapshots. Pick Pat, Feed, or Wake to focus the composer on a writable action.",shortcuts:_}:t==="fallback"?{message:"Fallback entries describe degraded state only. Switch to Pat, Feed, or Wake before drafting the next note.",shortcuts:_}:{message:"Notes publish through Pat, Feed, or Wake actions. Pick one to focus the composer before writing.",shortcuts:_}}function Ce(e){const t=S(e);return t==="signal"?"Signal entries are read-only. Pick Pat, Feed, or Wake before sending.":t==="fallback"?"Fallback entries are read-only. Pick Pat, Feed, or Wake before sending.":"Pick Pat, Feed, or Wake before sending a note."}function Te(e){const t=S(e);return t==="pat"?{label:"Suggested pat notes",templates:["Soft pat settled Mochi into a calmer loop.","Bond signal ticked upward after a gentle tap.","Comfort pass landed right on time for the next check-in."]}:t==="feed"?{label:"Suggested feed notes",templates:["Refilled snack tray and appetite stabilized.","Quick bite restored energy before the next loop window.","Treat drop landed cleanly and hunger signal eased."]}:t==="wake"?{label:"Suggested wake notes",templates:["Bright nudge reopened the interaction window.","Wake pulse brought Mochi back into active mode.","Gentle prompt resumed the browser buddy loop."]}:null}function xe(e,t,a){const o=S(e),i=String(t??"").trim();return a?{label:"Template waiting",detail:"Choose Replace, Append, or Cancel to resolve the current draft.",tone:"pending"}:i?O(o)?{label:`${f(o)} draft ready`,detail:`Will publish with the next ${f(o).toLowerCase()} action.`,tone:"ready"}:{label:"Draft waiting",detail:"Pick Pat, Feed, or Wake to send this note.",tone:"pending"}:O(o)?{label:`${f(o)} draft empty`,detail:"Type a note or pick a template to stage the next action.",tone:"idle"}:{label:"Composer idle",detail:"Select Pat, Feed, or Wake to focus the draft composer.",tone:"idle"}}function Ee(){return`
    <ul class="shortcut-help-list">
      ${B.map((t,a)=>`
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">${l(re(a).label)}</span>
        <span>${l(`Switch timeline to ${f(t)}.`)}</span>
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
  `}function l(e){return String(e).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function F(e){return`${e.toISOString().slice(0,16).replace("T"," ")} UTC`}function V(e,t,a,o){const i=Math.max(1,Math.round(Math.abs(e)/t)),p=i===1?a:o;return e>=0?`${i} ${p} ago`:`in ${i} ${p}`}function Pe(e){const t=String(e??"").trim();if(!t||t.toLowerCase()==="pending")return{label:t||"Pending",exact:"",machine:""};const a=new Date(t);if(Number.isNaN(a.getTime()))return{label:t,exact:"",machine:""};const o=Math.round((Date.now()-a.getTime())/1e3),i=Math.abs(o);return i<45?{label:o>=0?"just now":"in moments",exact:F(a),machine:a.toISOString()}:i<60*60?{label:V(o,60,"min","mins"),exact:F(a),machine:a.toISOString()}:i<60*60*24?{label:V(o,60*60,"hour","hours"),exact:F(a),machine:a.toISOString()}:i<60*60*24*7?{label:V(o,60*60*24,"day","days"),exact:F(a),machine:a.toISOString()}:{label:F(a),exact:F(a),machine:a.toISOString()}}function ce(e){const t=e&&typeof e=="object"?e:{},a=t.snapshot&&typeof t.snapshot=="object"?t.snapshot:{},o=t.version==="v2"&&t.companion&&typeof t.companion=="object"?t.companion:t,i=o.mood&&typeof o.mood=="object"?o.mood:{},p=Array.isArray(o.vitals)&&o.vitals.length?o.vitals:ve,d=Array.isArray(o.recentSignals)&&o.recentSignals.length?o.recentSignals:Se,h=Array.isArray(o.recentInteractions)&&o.recentInteractions.length?o.recentInteractions.map(s=>({kind:we((s==null?void 0:s.kind)||$e(s)),title:(s==null?void 0:s.title)||"Companion signal",detail:(s==null?void 0:s.detail)||"No detail published yet.",timestamp:(s==null?void 0:s.timestamp)||"Pending",source:(s==null?void 0:s.source)||"Memory"})):ke,b=a.profile&&typeof a.profile=="object"?a.profile:t.profile&&typeof t.profile=="object"?t.profile:{},k=a.relationship&&typeof a.relationship=="object"?a.relationship:t.relationship&&typeof t.relationship=="object"?t.relationship:{},C=a.progress&&typeof a.progress=="object"?a.progress:t.progress&&typeof t.progress=="object"?t.progress:{},c=Array.isArray(a.proactiveSignals)&&a.proactiveSignals.length?a.proactiveSignals.map(s=>({key:(s==null?void 0:s.key)||"signal",label:(s==null?void 0:s.label)||"Signal",detail:(s==null?void 0:s.detail)||"No proactive detail published yet.",dueAt:(s==null?void 0:s.dueAt)||null})):Array.isArray(t.proactiveSignals)&&t.proactiveSignals.length?t.proactiveSignals.map(s=>({key:(s==null?void 0:s.key)||"signal",label:(s==null?void 0:s.label)||"Signal",detail:(s==null?void 0:s.detail)||"No proactive detail published yet.",dueAt:(s==null?void 0:s.dueAt)||null})):[],D=C.stage==="starter"?{title:"Starter ritual",detail:"The companion is still in its first pet-core loop. Feed, Pat, and Wake actions now build persistent relationship and progression state."}:{title:"Stable ritual",detail:"The companion loop is carrying forward pet-core state instead of relying on prototype-only placeholders."};return{version:t.version||"legacy",petName:o.petName||"Companion",statusLine:o.statusLine||"Waiting for the first local update.",loopMode:o.loopMode||"Local placeholder loop",lastCheckIn:o.lastCheckIn||"Pending",adapterLabel:o.adapterLabel||"Local stub",loopHint:o.loopHint||"Wire a real endpoint later without changing the browser shell.",mood:{label:i.label||"Settling",note:i.note||"No mood note has been published yet."},memoryTitle:o.memoryTitle||"Memory summary",memorySummary:o.memorySummary||"No memory summary is available yet. The prototype stays useful even before backend contracts exist.",relationship:{level:k.level||"Unknown",note:k.note||"Relationship state has not been published yet."},progress:{stage:C.stage||"legacy",progressLabel:C.progressLabel||"Legacy loop",nextMilestone:C.nextMilestone||null},profile:{species:b.species||null,archetype:b.archetype||null},proactiveSignals:c,onboarding:D,vitals:p,recentSignals:d,recentInteractions:h}}function Ie(e){return e.map(t=>`
        <article class="metric-card">
          <span class="metric-label">${l(t.label||"State")}</span>
          <strong class="metric-value">${l(t.value||"Unknown")}</strong>
        </article>
      `).join("")}function Fe(e){return e.map(t=>`<li class="signal-item">${l(t)}</li>`).join("")}function Me(e){return e.length?e.map(t=>{const a=t.dueAt?` <span class="signal-time">${l(t.dueAt)}</span>`:"";return`<li class="signal-item"><strong>${l(t.label)}</strong>: ${l(t.detail)}${a}</li>`}).join(""):'<li class="signal-item">No proactive rituals are scheduled yet.</li>'}function Ne(e){const t=e.reduce((a,o)=>(a.all+=1,a[o.kind]=(a[o.kind]||0)+1,a),{all:0,pat:0,feed:0,wake:0,signal:0,fallback:0});return B.map(a=>({kind:a,label:f(a),count:t[a]||0}))}function je(e,t){return Ne(e).map((a,o)=>{const i=re(o);return`
        <button
          class="timeline-filter${a.kind===t?" is-active":""}"
          type="button"
          data-role="timeline-filter"
          data-filter-kind="${l(a.kind)}"
          data-filter-shortcut="${l(i.key)}"
          aria-pressed="${a.kind===t?"true":"false"}"
        >
          <span>${l(a.label)}</span>
          <span class="timeline-filter-shortcut" aria-hidden="true">${l(i.label)}</span>
          <span class="timeline-filter-count">${l(a.count)}</span>
        </button>
      `}).join("")}function Be(e,t){const a=S(t),o=a==="all"?e:e.filter(i=>i.kind===a);return o.length===0?`
      <div class="timeline-empty" data-role="timeline-empty">
        No ${l(f(a).toLowerCase())} interactions yet.
      </div>
    `:o.map(i=>{const p=Pe(i.timestamp),d=f(i.kind);return`
        <article class="interaction-card interaction-card-${l(i.kind)}">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${l(i.title)}</h3>
              <p class="interaction-detail">${l(i.detail)}</p>
            </div>
            <div class="interaction-meta">
              <span class="interaction-kind interaction-kind-${l(i.kind)}">${l(d)}</span>
              <span class="interaction-source">${l(i.source)}</span>
            </div>
          </div>
          <time
            class="interaction-time"
            ${p.machine?`datetime="${l(p.machine)}"`:""}
            ${p.exact?`title="${l(p.exact)}"`:""}
          >${l(p.label)}</time>
        </article>
      `}).join("")}function Oe(e,t="all"){const a=ce(e),o=S(t);return`
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
            <div>
              <dt>Profile</dt>
              <dd>${l([a.profile.species,a.profile.archetype].filter(Boolean).join(" · ")||"Companion profile")}</dd>
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

      <section class="panel" aria-labelledby="arc-heading">
        <p class="section-label">Pet arc</p>
        <h2 id="arc-heading">${l(a.relationship.level)}</h2>
        <p class="panel-copy">${l(a.relationship.note)}</p>
        <ul class="signal-list">
          <li class="signal-item"><strong>Stage:</strong> ${l(a.progress.progressLabel)}</li>
          <li class="signal-item"><strong>Ritual:</strong> ${l(a.onboarding.title)}</li>
          <li class="signal-item">${l(a.onboarding.detail)}</li>
          ${a.progress.nextMilestone?`<li class="signal-item"><strong>Next milestone:</strong> ${l(a.progress.nextMilestone)}</li>`:""}
        </ul>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${l(a.memoryTitle)}</h2>
        <p class="panel-copy">${l(a.memorySummary)}</p>
        <ul class="signal-list">
          ${Fe(a.recentSignals)}
        </ul>
      </section>

      <section class="panel" aria-labelledby="ritual-heading">
        <p class="section-label">Active rituals</p>
        <h2 id="ritual-heading">Proactive signals</h2>
        <ul class="signal-list">
          ${Me(a.proactiveSignals)}
        </ul>
      </section>

      <section class="panel panel-history" aria-labelledby="timeline-heading">
        <p class="section-label">Recent interactions</p>
        <h2 id="timeline-heading">Companion timeline</h2>
        <div class="timeline-filter-bar" data-role="timeline-filter-bar">
          ${je(a.recentInteractions,o)}
        </div>
        <div class="interaction-list">
          ${Be(a.recentInteractions,o)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${Ie(a.vitals)}
        </div>
      </section>
    </div>
  `}function le(e){const t=e instanceof Error?e.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${l(t)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function De(){return`
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
  `}async function qe(e,{adapter:t=se()}={}){if(!e)throw new Error("A target element is required to render the pet companion surface.");typeof e[j]=="function"&&e[j](),e.innerHTML=De();const a=e.ownerDocument,o=e.querySelector('[data-role="content"]'),i=e.querySelector('[data-action="refresh"]'),p=e.querySelector('[data-role="adapter-status"]'),d=e.querySelector('[data-role="shortcut-help-toggle"]'),h=e.querySelector('[data-role="shortcut-help"]'),b=e.querySelector('[data-role="shortcut-help-title"]'),k=e.querySelector('[data-role="shortcut-help-close"]'),C=e.querySelector('[data-role="live-region"]'),c=e.querySelector('[data-role="action-note"]'),D=e.querySelector('[data-role="action-note-label"]'),s=e.querySelector('[data-role="action-note-hint"]'),Q=e.querySelector('[data-role="action-note-status"]'),Z=e.querySelector('[data-role="action-note-status-label"]'),X=e.querySelector('[data-role="action-note-status-detail"]'),M=e.querySelector('[data-role="action-note-clear"]'),x=e.querySelector('[data-role="composer-templates"]'),E=e.querySelector('[data-role="composer-template-actions"]'),P=e.querySelector('[data-role="composer-guide"]'),z=[...e.querySelectorAll('[data-role="action-buttons"] [data-action]')];let g="all",q=null,v=null,$=!1,Y="";function pe(n){return!!(n&&typeof n=="object"&&"tagName"in n&&["INPUT","TEXTAREA","SELECT"].includes(String(n.tagName).toUpperCase()))}function de(n){return!n||typeof n!="object"||!("closest"in n)?null:n.closest('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]')}function H(){z.forEach(n=>{const u=n.getAttribute("data-action")===g;n.classList.toggle("is-linked",u),n.setAttribute("data-filter-linked",u?"true":"false")})}function y(n){const r=String(n??"").trim();!C||!r||(Y===r&&(C.textContent=""),Y=r,C.textContent=r)}function ee(){d&&(d.setAttribute("aria-expanded",$?"true":"false"),d.classList.toggle("is-active",$)),h&&(h.hidden=!$)}function ue(n=!1){const r=[b,k].filter(Boolean);if(!r.length)return;const u=n?r[r.length-1]:r[0];u==null||u.focus()}function N(n,r,{moveFocus:u=!1}={}){$=n,ee(),u&&(n?b==null||b.focus():d==null||d.focus()),r&&y(r)}function me(n){return!!(n&&(h!=null&&h.contains(n)||d!=null&&d.contains(n)))}function U(n,{announcement:r}={}){const u=S(n);u!==g&&(L(),g=u,oe(),r&&y(r))}function L(){v=null}function fe(){c&&(c.value="",c.focus()),L(),A(),y("Draft cleared.")}function he(n){if(!c||!v)return;const r=c.value.trim();n==="append"&&r?c.value=`${r}
${v}`:c.value=v,c.focus(),L(),A(),y(`${f(g)} template ${n==="append"?"appended to":"replaced"} draft.`)}function A(){const n=Ae(g),r=xe(g,c==null?void 0:c.value,v),u=Te(g),I=Le(g),T=!!(c!=null&&c.value.trim())||!!v;D&&(D.textContent=n.label),c&&(c.placeholder=n.placeholder,c.setAttribute("data-composer-kind",S(g))),s&&(s.textContent=n.hint),Q&&Q.setAttribute("data-status-tone",r.tone),Z&&(Z.textContent=r.label),X&&(X.textContent=r.detail),M&&(M.disabled=!T),x&&(u?(x.hidden=!1,x.innerHTML=`
          <p class="composer-templates-label">${l(u.label)}</p>
          <div class="composer-template-list">
            ${u.templates.map(m=>`
                  <button
                    class="composer-template"
                    type="button"
                    data-role="composer-template"
                    data-template-value="${l(m)}"
                  >${l(m)}</button>
                `).join("")}
          </div>
        `,[...x.querySelectorAll('[data-role="composer-template"]')].forEach(m=>{m.addEventListener("click",()=>{if(c){const w=m.getAttribute("data-template-value")??"",ie=c.value.trim();if(ie&&ie!==w){v=w,A(),y("Template selected. Choose Replace, Append, or Cancel.");return}c.value=w,c.focus(),L(),A(),y(`${f(g)} template inserted into draft.`)}})})):(x.innerHTML="",x.hidden=!0)),E&&(!v||!u?(E.innerHTML="",E.hidden=!0):(E.hidden=!1,E.innerHTML=`
          <p class="composer-template-actions-copy">
            Keep the current draft, append the suggestion, or replace it with:
            <span class="composer-template-preview">${l(v)}</span>
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
        `,[...E.querySelectorAll('[data-role="template-merge-action"]')].forEach(m=>{m.addEventListener("click",()=>{const w=m.getAttribute("data-merge-mode");if(w==="replace"||w==="append"){he(w);return}L(),A(),y("Template merge cancelled.")})}))),P&&(I?(P.hidden=!1,P.innerHTML=`
          <p class="composer-guide-copy">${l(I.message)}</p>
          <div class="composer-shortcuts">
            ${I.shortcuts.map(m=>`
                  <button
                    class="composer-shortcut"
                    type="button"
                    data-role="composer-shortcut"
                    data-shortcut-kind="${l(m)}"
                  >${l(f(m))}</button>
                `).join("")}
          </div>
        `,[...P.querySelectorAll('[data-role="composer-shortcut"]')].forEach(m=>{m.addEventListener("click",()=>{const w=S(m.getAttribute("data-shortcut-kind"));U(w,{announcement:`Timeline filter set to ${f(w)}.`}),c==null||c.focus()})})):(P.innerHTML="",P.hidden=!0))}function R(n){i.disabled=n,z.forEach(r=>{r.disabled=n}),c&&(c.disabled=n)}c==null||c.addEventListener("input",()=>{v&&L(),A()}),M==null||M.addEventListener("click",()=>{fe()}),d==null||d.addEventListener("click",()=>{N(!$,`Shortcut help ${$?"closed":"opened"}.`,{moveFocus:!0})}),k==null||k.addEventListener("click",()=>{N(!1,"Shortcut help closed.",{moveFocus:!0})});function te(n){if(!$||me(n.target))return;const r=de(n.target),u=!!(h!=null&&h.contains(a.activeElement));N(!1,"Shortcut help closed.",{moveFocus:!r&&u})}function ae(n){var I;if(n.key==="Escape"&&v){n.preventDefault(),L(),A(),y("Template merge cancelled.");return}if(n.key==="Escape"&&$){n.preventDefault(),N(!1,"Shortcut help closed.",{moveFocus:!0});return}if(n.key==="Tab"&&$){const T=[b,k].filter(Boolean);if(!T.length)return;const W=e.ownerDocument.activeElement,m=T.indexOf(W);if(m===-1){n.preventDefault(),ue(n.shiftKey);return}const w=n.shiftKey?(m-1+T.length)%T.length:(m+1)%T.length;n.preventDefault(),(I=T[w])==null||I.focus();return}if(n.key==="?"&&!pe(n.target)){n.preventDefault(),N(!$,`Shortcut help ${$?"closed":"opened"}.`,{moveFocus:!0});return}if(!n.altKey||n.ctrlKey||n.metaKey||n.shiftKey)return;const r=Number.parseInt(n.key,10)-1;if(Number.isNaN(r)||r<0||r>=B.length)return;n.preventDefault();const u=B[r];U(u,{announcement:`Timeline filter set to ${f(u)}.`})}a.addEventListener("click",te),a.addEventListener("keydown",ae);async function ne(n){if(!n)return;if(v){y("Resolve template merge before sending.");return}if(typeof t.performAction!="function"){p.textContent="Adapter: action unavailable",y(`${f(n)} action is unavailable in this preview.`);return}const r=typeof(c==null?void 0:c.value)=="string"?c.value.trim():"";R(!0),p.textContent=`Adapter: sending ${n}`,y(`Sending ${f(n)} action.`);try{await t.performAction(n,r||void 0),L(),g=S(n),c&&(c.value=""),await K(),y(`${f(n)} action sent.`)}catch(u){o.innerHTML=le(u),p.textContent="Adapter: action failed",R(!1),y(`${f(n)} action failed.`)}}c==null||c.addEventListener("keydown",n=>{if(n.key==="Escape"&&v){n.preventDefault(),L(),A(),y("Template merge cancelled.");return}if(n.key==="Enter"&&(n.ctrlKey||n.metaKey)&&!O(g)){n.preventDefault(),y(Ce(g));return}n.key==="Enter"&&(n.ctrlKey||n.metaKey)&&O(g)&&(n.preventDefault(),ne(g))});function oe(){if(!q){H(),A();return}o.innerHTML=Oe(q,g),H(),A(),[...o.querySelectorAll('[data-role="timeline-filter"]')].forEach(r=>{r.addEventListener("click",()=>{const u=S(r.getAttribute("data-filter-kind"));U(u,{announcement:`Timeline filter set to ${f(u)}.`})})})}async function K(){R(!0),i.textContent="Refreshing...",p.textContent="Adapter: syncing local loop";try{const n=await t.getCompanionState(),r=ce(n);q=r,oe(),p.textContent=`Adapter: ${r.adapterLabel}`}catch(n){q=null,o.innerHTML=le(n),p.textContent="Adapter: degraded"}finally{R(!1),i.textContent="Refresh mood"}}for(const n of z)n.addEventListener("click",async()=>{const r=n.getAttribute("data-action");await ne(r)});i.addEventListener("click",()=>{K()});function G(){a.removeEventListener("click",te),a.removeEventListener("keydown",ae),e[j]===G&&delete e[j]}return e[j]=G,H(),ee(),A(),await K(),{destroy:G,reload:K}}const J=document.getElementById("app");J&&qe(J,{adapter:ye()}).catch(e=>{J.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${e instanceof Error?e.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
