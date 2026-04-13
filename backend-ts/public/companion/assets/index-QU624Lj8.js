(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const d of i)if(d.type==="childList")for(const p of d.addedNodes)p.tagName==="LINK"&&p.rel==="modulepreload"&&o(p)}).observe(document,{childList:!0,subtree:!0});function a(i){const d={};return i.integrity&&(d.integrity=i.integrity),i.referrerPolicy&&(d.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?d.credentials="include":i.crossOrigin==="anonymous"?d.credentials="omit":d.credentials="same-origin",d}function o(i){if(i.ep)return;i.ep=!0;const d=a(i);fetch(i.href,d)}})();const be=Object.freeze({petName:"Mochi",statusLine:"Idle on the browser ledge, listening for the next check-in.",loopMode:"Local placeholder loop",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Local stub",loopHint:"Swap this adapter with a real pet core endpoint when the contract is ready.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a light status ping."},memoryTitle:"Short-term memory",memorySummary:"Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays local until the real API is wired in."],recentInteractions:[{kind:"pat",title:"Pat interaction",detail:"A calm pat kept Mochi settled on the browser ledge.",timestamp:"2026-04-10T03:28:00.000Z",source:"Local Stub"},{kind:"signal",title:"Status pulse",detail:"The local adapter emitted a lightweight keep-alive signal.",timestamp:"2026-04-10T03:30:00.000Z",source:"Local Stub"}]});function ye(e){return JSON.parse(JSON.stringify(e))}function Y(e=be){return{async getCompanionState(){return await Promise.resolve(),ye(e)}}}async function ve(e){try{return await e.getCompanionState()}catch{return Y().getCompanionState()}}function ke(e,{reason:t,endpoint:a,legacyEndpoint:o}){const i=String(t||"backend_unavailable").trim()||"backend_unavailable",d=[a,o].filter(Boolean);return{...e,loopMode:"Degraded local fallback",adapterLabel:"Local fallback (backend unavailable)",loopHint:"Backend companion state is unavailable. This labeled fallback keeps the surface explorable, but it is not live backend data.",recentSignals:[`Backend sync failed: ${i}.`,"Retry after the companion backend recovers to restore live state.",...Array.isArray(e==null?void 0:e.recentSignals)?e.recentSignals:[]],recentInteractions:[{kind:"fallback",title:"Fallback mode active",detail:`The backend companion state could not be loaded from ${d.join(" -> ")||a}. Showing local fallback data instead.`,timestamp:new Date().toISOString(),source:"Backend degraded"},...(Array.isArray(e==null?void 0:e.recentInteractions)?e.recentInteractions:[]).map(p=>({...p,source:`${(p==null?void 0:p.source)||"Local Stub"} · local fallback`}))],degraded:!0,dataSource:"local-fallback",backendStatus:{degraded:!0,source:"backend",reason:i,endpoint:a,legacyEndpoint:o||null,retryable:!0}}}function Se({endpoint:e="/companion/state-v2",legacyEndpoint:t="/companion/state",actionEndpoint:a="/companion/actions",fetchImpl:o=(d=>(d=globalThis.fetch)==null?void 0:d.bind(globalThis))(),fallback:i=Y()}={}){return{async getCompanionState(){if(typeof o!="function")return i.getCompanionState();let p=!1;try{const m=await o(e,{headers:{Accept:"application/json"}});if(!m.ok&&t){p=!0;const v=await o(t,{headers:{Accept:"application/json"}});if(!v.ok)throw new Error(`companion_state_${v.status}`);const $=await v.json();if(!$||typeof $!="object")throw new Error("companion_state_invalid");return $}if(!m.ok)throw new Error(`companion_state_${m.status}`);const f=await m.json();if(!f||typeof f!="object")throw new Error("companion_state_invalid");return f}catch(m){const f=await ve(i);return ke(f,{reason:m instanceof Error?m.message:"backend_unavailable",endpoint:e,legacyEndpoint:p?t:null})}},async performAction(p,m){if(typeof o!="function")return{ok:!1,fallback:!0};const f=await o(a,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({action:p,note:m})});if(!f.ok)throw new Error(`companion_action_${f.status}`);return f.json()}}}const we=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],$e=["Local companion loop has not reported any recent signals yet."],Ae=[{kind:"signal",title:"Companion signal pending",detail:"No structured interaction timeline is available yet.",timestamp:"Pending",source:"Local stub"}],O=["all","pat","feed","wake","signal","fallback"],U=["pat","feed","wake"],N=Symbol("petCompanionCleanup");function ce(e){return{key:String(e+1),label:`Alt+${e+1}`}}function Le(e){const t=String(e??"").trim().toLowerCase();return t==="pat"||t==="feed"||t==="wake"||t==="signal"?t:t==="fallback"?"fallback":"signal"}function Ce(e){const t=String((e==null?void 0:e.source)??"").trim().toLowerCase(),a=String((e==null?void 0:e.title)??"").trim().toLowerCase();return t.includes("fallback")||a.includes("fallback")?"fallback":a.includes("pat")?"pat":a.includes("feed")?"feed":a.includes("wake")?"wake":"signal"}function g(e){return e==="all"?"All":e==="pat"?"Pat":e==="feed"?"Feed":e==="wake"?"Wake":e==="fallback"?"Fallback":"Signal"}function S(e){const t=String(e??"").trim().toLowerCase();return O.includes(t)?t:"all"}function R(e){return U.includes(S(e))}function Ee(e){const t=S(e);return t==="pat"?{label:"Pat note",placeholder:"Optional note for the next pat.",hint:"Describe the comfort, bond, or calming signal you want the timeline to capture. Press Ctrl+Enter to send."}:t==="feed"?{label:"Feed note",placeholder:"Optional note for the next feed.",hint:"Add snack, refill, or appetite context so the feed entry reads clearly later. Press Ctrl+Enter to send."}:t==="wake"?{label:"Wake note",placeholder:"Optional note for the next wake.",hint:"Explain the nudge or prompt that should bring the companion back into motion. Press Ctrl+Enter to send."}:{label:"Interaction note",placeholder:"Optional note for the next pat, feed, or wake.",hint:"Optional context travels into the companion timeline."}}function Te(e){const t=S(e);return R(t)?null:t==="signal"?{message:"Signal entries are read-only snapshots. Pick Pat, Feed, or Wake to focus the composer on a writable action.",shortcuts:U}:t==="fallback"?{message:"Fallback entries describe degraded state only. Switch to Pat, Feed, or Wake before drafting the next note.",shortcuts:U}:{message:"Notes publish through Pat, Feed, or Wake actions. Pick one to focus the composer before writing.",shortcuts:U}}function xe(e){const t=S(e);return t==="signal"?"Signal entries are read-only. Pick Pat, Feed, or Wake before sending.":t==="fallback"?"Fallback entries are read-only. Pick Pat, Feed, or Wake before sending.":"Pick Pat, Feed, or Wake before sending a note."}function Ie(e){const t=S(e);return t==="pat"?{label:"Suggested pat notes",templates:["Soft pat settled Mochi into a calmer loop.","Bond signal ticked upward after a gentle tap.","Comfort pass landed right on time for the next check-in."]}:t==="feed"?{label:"Suggested feed notes",templates:["Refilled snack tray and appetite stabilized.","Quick bite restored energy before the next loop window.","Treat drop landed cleanly and hunger signal eased."]}:t==="wake"?{label:"Suggested wake notes",templates:["Bright nudge reopened the interaction window.","Wake pulse brought Mochi back into active mode.","Gentle prompt resumed the browser buddy loop."]}:null}function Pe(e,t,a){const o=S(e),i=String(t??"").trim();return a?{label:"Template waiting",detail:"Choose Replace, Append, or Cancel to resolve the current draft.",tone:"pending"}:i?R(o)?{label:`${g(o)} draft ready`,detail:`Will publish with the next ${g(o).toLowerCase()} action.`,tone:"ready"}:{label:"Draft waiting",detail:"Pick Pat, Feed, or Wake to send this note.",tone:"pending"}:R(o)?{label:`${g(o)} draft empty`,detail:"Type a note or pick a template to stage the next action.",tone:"idle"}:{label:"Composer idle",detail:"Select Pat, Feed, or Wake to focus the draft composer.",tone:"idle"}}function Fe(){return`
    <ul class="shortcut-help-list">
      ${O.map((t,a)=>`
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">${l(ce(a).label)}</span>
        <span>${l(`Switch timeline to ${g(t)}.`)}</span>
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
  `}function l(e){return String(e).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function M(e){return`${e.toISOString().slice(0,16).replace("T"," ")} UTC`}function Z(e,t,a,o){const i=Math.max(1,Math.round(Math.abs(e)/t)),d=i===1?a:o;return e>=0?`${i} ${d} ago`:`in ${i} ${d}`}function Be(e){const t=String(e??"").trim();if(!t||t.toLowerCase()==="pending")return{label:t||"Pending",exact:"",machine:""};const a=new Date(t);if(Number.isNaN(a.getTime()))return{label:t,exact:"",machine:""};const o=Math.round((Date.now()-a.getTime())/1e3),i=Math.abs(o);return i<45?{label:o>=0?"just now":"in moments",exact:M(a),machine:a.toISOString()}:i<60*60?{label:Z(o,60,"min","mins"),exact:M(a),machine:a.toISOString()}:i<60*60*24?{label:Z(o,60*60,"hour","hours"),exact:M(a),machine:a.toISOString()}:i<60*60*24*7?{label:Z(o,60*60*24,"day","days"),exact:M(a),machine:a.toISOString()}:{label:M(a),exact:M(a),machine:a.toISOString()}}function Me(e,t){const a=e.backendStatus&&typeof e.backendStatus=="object"?e.backendStatus:{},o=t.backendStatus&&typeof t.backendStatus=="object"?t.backendStatus:{};return{degraded:!!(a.degraded||o.degraded||e.degraded||t.degraded),reason:a.reason||o.reason||"",endpoint:a.endpoint||o.endpoint||"",legacyEndpoint:a.legacyEndpoint||o.legacyEndpoint||"",retryable:a.retryable??o.retryable??!0}}function de(e){const t=e&&typeof e=="object"?e:{},a=t.snapshot&&typeof t.snapshot=="object"?t.snapshot:{},o=t.version==="v2"&&t.companion&&typeof t.companion=="object"?t.companion:t,i=o.mood&&typeof o.mood=="object"?o.mood:{},d=Array.isArray(o.vitals)&&o.vitals.length?o.vitals:we,p=Array.isArray(o.recentSignals)&&o.recentSignals.length?o.recentSignals:$e,m=Array.isArray(o.recentInteractions)&&o.recentInteractions.length?o.recentInteractions.map(s=>({kind:Le((s==null?void 0:s.kind)||Ce(s)),title:(s==null?void 0:s.title)||"Companion signal",detail:(s==null?void 0:s.detail)||"No detail published yet.",timestamp:(s==null?void 0:s.timestamp)||"Pending",source:(s==null?void 0:s.source)||"Memory"})):Ae,f=a.profile&&typeof a.profile=="object"?a.profile:t.profile&&typeof t.profile=="object"?t.profile:{},v=Me(t,o),$=typeof t.dataSource=="string"&&t.dataSource.trim()||typeof o.dataSource=="string"&&o.dataSource.trim()||(v.degraded?"local-fallback":t.version==="v2"?"backend-v2":"backend"),c=a.relationship&&typeof a.relationship=="object"?a.relationship:t.relationship&&typeof t.relationship=="object"?t.relationship:{},T=a.progress&&typeof a.progress=="object"?a.progress:t.progress&&typeof t.progress=="object"?t.progress:{},q=Array.isArray(a.proactiveSignals)&&a.proactiveSignals.length?a.proactiveSignals.map(s=>({key:(s==null?void 0:s.key)||"signal",label:(s==null?void 0:s.label)||"Signal",detail:(s==null?void 0:s.detail)||"No proactive detail published yet.",dueAt:(s==null?void 0:s.dueAt)||null})):Array.isArray(t.proactiveSignals)&&t.proactiveSignals.length?t.proactiveSignals.map(s=>({key:(s==null?void 0:s.key)||"signal",label:(s==null?void 0:s.label)||"Signal",detail:(s==null?void 0:s.detail)||"No proactive detail published yet.",dueAt:(s==null?void 0:s.dueAt)||null})):[],_=T.stage==="starter"?{title:"Starter ritual",detail:"The companion is still in its first pet-core loop. Feed, Pat, and Wake actions now build persistent relationship and progression state."}:{title:"Stable ritual",detail:"The companion loop is carrying forward pet-core state instead of relying on prototype-only placeholders."};return{version:t.version||"legacy",petName:o.petName||"Companion",statusLine:o.statusLine||"Waiting for the first local update.",loopMode:o.loopMode||"Local placeholder loop",lastCheckIn:o.lastCheckIn||"Pending",adapterLabel:o.adapterLabel||"Local stub",loopHint:o.loopHint||"Wire a real endpoint later without changing the browser shell.",mood:{label:i.label||"Settling",note:i.note||"No mood note has been published yet."},memoryTitle:o.memoryTitle||"Memory summary",memorySummary:o.memorySummary||"No memory summary is available yet. The prototype stays useful even before backend contracts exist.",relationship:{level:c.level||"Unknown",note:c.note||"Relationship state has not been published yet."},progress:{stage:T.stage||"legacy",progressLabel:T.progressLabel||"Legacy loop",nextMilestone:T.nextMilestone||null},profile:{species:f.species||null,archetype:f.archetype||null},degraded:v.degraded,dataSource:$,dataSourceLabel:$==="local-fallback"?"Local fallback":$,backendStatus:v,retryGuidance:"Use Refresh mood after the backend companion endpoint recovers.",proactiveSignals:q,onboarding:_,vitals:d,recentSignals:p,recentInteractions:m}}function je(e){return e.map(t=>`
        <article class="metric-card">
          <span class="metric-label">${l(t.label||"State")}</span>
          <strong class="metric-value">${l(t.value||"Unknown")}</strong>
        </article>
      `).join("")}function De(e){return e.map(t=>`<li class="signal-item">${l(t)}</li>`).join("")}function Ne(e){return e.length?e.map(t=>{const a=t.dueAt?` <span class="signal-time">${l(t.dueAt)}</span>`:"";return`<li class="signal-item"><strong>${l(t.label)}</strong>: ${l(t.detail)}${a}</li>`}).join(""):'<li class="signal-item">No proactive rituals are scheduled yet.</li>'}function Oe(e){const t=e.reduce((a,o)=>(a.all+=1,a[o.kind]=(a[o.kind]||0)+1,a),{all:0,pat:0,feed:0,wake:0,signal:0,fallback:0});return O.map(a=>({kind:a,label:g(a),count:t[a]||0}))}function Re(e,t){return Oe(e).map((a,o)=>{const i=ce(o);return`
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
      `}).join("")}function qe(e,t){const a=S(t),o=a==="all"?e:e.filter(i=>i.kind===a);return o.length===0?`
      <div class="timeline-empty" data-role="timeline-empty">
        No ${l(g(a).toLowerCase())} interactions yet.
      </div>
    `:o.map(i=>{const d=Be(i.timestamp),p=g(i.kind);return`
        <article class="interaction-card interaction-card-${l(i.kind)}">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${l(i.title)}</h3>
              <p class="interaction-detail">${l(i.detail)}</p>
            </div>
            <div class="interaction-meta">
              <span class="interaction-kind interaction-kind-${l(i.kind)}">${l(p)}</span>
              <span class="interaction-source">${l(i.source)}</span>
            </div>
          </div>
          <time
            class="interaction-time"
            ${d.machine?`datetime="${l(d.machine)}"`:""}
            ${d.exact?`title="${l(d.exact)}"`:""}
          >${l(d.label)}</time>
        </article>
      `}).join("")}function _e(e){if(!e.degraded)return"";const t=[e.backendStatus.endpoint,e.backendStatus.legacyEndpoint].filter(Boolean).join(" -> ");return`
    <section class="panel panel-degraded" aria-live="polite">
      <p class="section-label">Degraded mode</p>
      <h2>Backend companion state unavailable</h2>
      <p class="panel-copy">
        Showing labeled local fallback data so the surface remains explorable without pretending the backend is healthy.
      </p>
      <ul class="signal-list">
        <li class="signal-item"><strong>Surface source:</strong> ${l(e.dataSourceLabel)}</li>
        <li class="signal-item"><strong>Backend error:</strong> ${l(e.backendStatus.reason||"backend_unavailable")}</li>
        ${t?`<li class="signal-item"><strong>Attempted endpoints:</strong> ${l(t)}</li>`:""}
        <li class="signal-item"><strong>Retry:</strong> ${l(e.retryGuidance)}</li>
      </ul>
    </section>
  `}function Ke(e,t="all"){const a=de(e),o=S(t);return`
    ${_e(a)}
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
          ${De(a.recentSignals)}
        </ul>
      </section>

      <section class="panel" aria-labelledby="ritual-heading">
        <p class="section-label">Active rituals</p>
        <h2 id="ritual-heading">Proactive signals</h2>
        <ul class="signal-list">
          ${Ne(a.proactiveSignals)}
        </ul>
      </section>

      <section class="panel panel-history" aria-labelledby="timeline-heading">
        <p class="section-label">Recent interactions</p>
        <h2 id="timeline-heading">Companion timeline</h2>
        <div class="timeline-filter-bar" data-role="timeline-filter-bar">
          ${Re(a.recentInteractions,o)}
        </div>
        <div class="interaction-list">
          ${qe(a.recentInteractions,o)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${je(a.vitals)}
        </div>
      </section>
    </div>
  `}function re(e){const t=e instanceof Error?e.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${l(t)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function We(){return`
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
            ${Fe()}
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
  `}async function ze(e,{adapter:t=Y()}={}){if(!e)throw new Error("A target element is required to render the pet companion surface.");typeof e[N]=="function"&&e[N](),e.innerHTML=We();const a=e.ownerDocument,o=e.querySelector('[data-role="content"]'),i=e.querySelector('[data-action="refresh"]'),d=e.querySelector('[data-role="adapter-status"]'),p=e.querySelector('[data-role="shortcut-help-toggle"]'),m=e.querySelector('[data-role="shortcut-help"]'),f=e.querySelector('[data-role="shortcut-help-title"]'),v=e.querySelector('[data-role="shortcut-help-close"]'),$=e.querySelector('[data-role="live-region"]'),c=e.querySelector('[data-role="action-note"]'),T=e.querySelector('[data-role="action-note-label"]'),q=e.querySelector('[data-role="action-note-hint"]'),_=e.querySelector('[data-role="action-note-status"]'),s=e.querySelector('[data-role="action-note-status-label"]'),ee=e.querySelector('[data-role="action-note-status-detail"]'),j=e.querySelector('[data-role="action-note-clear"]'),x=e.querySelector('[data-role="composer-templates"]'),I=e.querySelector('[data-role="composer-template-actions"]'),P=e.querySelector('[data-role="composer-guide"]'),G=[...e.querySelectorAll('[data-role="action-buttons"] [data-action]')];let b="all",K=null,k=null,A=!1,te="";function F(n,{degraded:r=!1}={}){d&&(d.textContent=n,d.classList.toggle("is-degraded",r))}function pe(n){return!!(n&&typeof n=="object"&&"tagName"in n&&["INPUT","TEXTAREA","SELECT"].includes(String(n.tagName).toUpperCase()))}function ue(n){return!n||typeof n!="object"||!("closest"in n)?null:n.closest('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]')}function V(){G.forEach(n=>{const u=n.getAttribute("data-action")===b;n.classList.toggle("is-linked",u),n.setAttribute("data-filter-linked",u?"true":"false")})}function y(n){const r=String(n??"").trim();!$||!r||(te===r&&($.textContent=""),te=r,$.textContent=r)}function ae(){p&&(p.setAttribute("aria-expanded",A?"true":"false"),p.classList.toggle("is-active",A)),m&&(m.hidden=!A)}function me(n=!1){const r=[f,v].filter(Boolean);if(!r.length)return;const u=n?r[r.length-1]:r[0];u==null||u.focus()}function D(n,r,{moveFocus:u=!1}={}){A=n,ae(),u&&(n?f==null||f.focus():p==null||p.focus()),r&&y(r)}function fe(n){return!!(n&&(m!=null&&m.contains(n)||p!=null&&p.contains(n)))}function J(n,{announcement:r}={}){const u=S(n);u!==b&&(C(),b=u,le(),r&&y(r))}function C(){k=null}function he(){c&&(c.value="",c.focus()),C(),L(),y("Draft cleared.")}function ge(n){if(!c||!k)return;const r=c.value.trim();n==="append"&&r?c.value=`${r}
${k}`:c.value=k,c.focus(),C(),L(),y(`${g(b)} template ${n==="append"?"appended to":"replaced"} draft.`)}function L(){const n=Ee(b),r=Pe(b,c==null?void 0:c.value,k),u=Ie(b),B=Te(b),E=!!(c!=null&&c.value.trim())||!!k;T&&(T.textContent=n.label),c&&(c.placeholder=n.placeholder,c.setAttribute("data-composer-kind",S(b))),q&&(q.textContent=n.hint),_&&_.setAttribute("data-status-tone",r.tone),s&&(s.textContent=r.label),ee&&(ee.textContent=r.detail),j&&(j.disabled=!E),x&&(u?(x.hidden=!1,x.innerHTML=`
          <p class="composer-templates-label">${l(u.label)}</p>
          <div class="composer-template-list">
            ${u.templates.map(h=>`
                  <button
                    class="composer-template"
                    type="button"
                    data-role="composer-template"
                    data-template-value="${l(h)}"
                  >${l(h)}</button>
                `).join("")}
          </div>
        `,[...x.querySelectorAll('[data-role="composer-template"]')].forEach(h=>{h.addEventListener("click",()=>{if(c){const w=h.getAttribute("data-template-value")??"",se=c.value.trim();if(se&&se!==w){k=w,L(),y("Template selected. Choose Replace, Append, or Cancel.");return}c.value=w,c.focus(),C(),L(),y(`${g(b)} template inserted into draft.`)}})})):(x.innerHTML="",x.hidden=!0)),I&&(!k||!u?(I.innerHTML="",I.hidden=!0):(I.hidden=!1,I.innerHTML=`
          <p class="composer-template-actions-copy">
            Keep the current draft, append the suggestion, or replace it with:
            <span class="composer-template-preview">${l(k)}</span>
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
        `,[...I.querySelectorAll('[data-role="template-merge-action"]')].forEach(h=>{h.addEventListener("click",()=>{const w=h.getAttribute("data-merge-mode");if(w==="replace"||w==="append"){ge(w);return}C(),L(),y("Template merge cancelled.")})}))),P&&(B?(P.hidden=!1,P.innerHTML=`
          <p class="composer-guide-copy">${l(B.message)}</p>
          <div class="composer-shortcuts">
            ${B.shortcuts.map(h=>`
                  <button
                    class="composer-shortcut"
                    type="button"
                    data-role="composer-shortcut"
                    data-shortcut-kind="${l(h)}"
                  >${l(g(h))}</button>
                `).join("")}
          </div>
        `,[...P.querySelectorAll('[data-role="composer-shortcut"]')].forEach(h=>{h.addEventListener("click",()=>{const w=S(h.getAttribute("data-shortcut-kind"));J(w,{announcement:`Timeline filter set to ${g(w)}.`}),c==null||c.focus()})})):(P.innerHTML="",P.hidden=!0))}function W(n){i.disabled=n,G.forEach(r=>{r.disabled=n}),c&&(c.disabled=n)}c==null||c.addEventListener("input",()=>{k&&C(),L()}),j==null||j.addEventListener("click",()=>{he()}),p==null||p.addEventListener("click",()=>{D(!A,`Shortcut help ${A?"closed":"opened"}.`,{moveFocus:!0})}),v==null||v.addEventListener("click",()=>{D(!1,"Shortcut help closed.",{moveFocus:!0})});function ne(n){if(!A||fe(n.target))return;const r=ue(n.target),u=!!(m!=null&&m.contains(a.activeElement));D(!1,"Shortcut help closed.",{moveFocus:!r&&u})}function oe(n){var B;if(n.key==="Escape"&&k){n.preventDefault(),C(),L(),y("Template merge cancelled.");return}if(n.key==="Escape"&&A){n.preventDefault(),D(!1,"Shortcut help closed.",{moveFocus:!0});return}if(n.key==="Tab"&&A){const E=[f,v].filter(Boolean);if(!E.length)return;const H=e.ownerDocument.activeElement,h=E.indexOf(H);if(h===-1){n.preventDefault(),me(n.shiftKey);return}const w=n.shiftKey?(h-1+E.length)%E.length:(h+1)%E.length;n.preventDefault(),(B=E[w])==null||B.focus();return}if(n.key==="?"&&!pe(n.target)){n.preventDefault(),D(!A,`Shortcut help ${A?"closed":"opened"}.`,{moveFocus:!0});return}if(!n.altKey||n.ctrlKey||n.metaKey||n.shiftKey)return;const r=Number.parseInt(n.key,10)-1;if(Number.isNaN(r)||r<0||r>=O.length)return;n.preventDefault();const u=O[r];J(u,{announcement:`Timeline filter set to ${g(u)}.`})}a.addEventListener("click",ne),a.addEventListener("keydown",oe);async function ie(n){if(!n)return;if(k){y("Resolve template merge before sending.");return}if(typeof t.performAction!="function"){F("Adapter: action unavailable"),y(`${g(n)} action is unavailable in this preview.`);return}const r=typeof(c==null?void 0:c.value)=="string"?c.value.trim():"";W(!0),F(`Adapter: sending ${n}`),y(`Sending ${g(n)} action.`);try{await t.performAction(n,r||void 0),C(),b=S(n),c&&(c.value=""),await z(),y(`${g(n)} action sent.`)}catch(u){o.innerHTML=re(u),F("Adapter: action failed",{degraded:!0}),W(!1),y(`${g(n)} action failed.`)}}c==null||c.addEventListener("keydown",n=>{if(n.key==="Escape"&&k){n.preventDefault(),C(),L(),y("Template merge cancelled.");return}if(n.key==="Enter"&&(n.ctrlKey||n.metaKey)&&!R(b)){n.preventDefault(),y(xe(b));return}n.key==="Enter"&&(n.ctrlKey||n.metaKey)&&R(b)&&(n.preventDefault(),ie(b))});function le(){if(!K){V(),L();return}o.innerHTML=Ke(K,b),V(),L(),[...o.querySelectorAll('[data-role="timeline-filter"]')].forEach(r=>{r.addEventListener("click",()=>{const u=S(r.getAttribute("data-filter-kind"));J(u,{announcement:`Timeline filter set to ${g(u)}.`})})})}async function z(){W(!0),i.textContent="Refreshing...",F("Adapter: syncing companion state");try{const n=await t.getCompanionState(),r=de(n);K=r,le(),F(`Adapter: ${r.adapterLabel}`,{degraded:r.degraded})}catch(n){K=null,o.innerHTML=re(n),F("Adapter: degraded",{degraded:!0})}finally{W(!1),i.textContent="Refresh mood"}}for(const n of G)n.addEventListener("click",async()=>{const r=n.getAttribute("data-action");await ie(r)});i.addEventListener("click",()=>{z()});function Q(){a.removeEventListener("click",ne),a.removeEventListener("keydown",oe),e[N]===Q&&delete e[N]}return e[N]=Q,V(),ae(),L(),await z(),{destroy:Q,reload:z}}const X=document.getElementById("app");X&&ze(X,{adapter:Se()}).catch(e=>{X.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${e instanceof Error?e.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
