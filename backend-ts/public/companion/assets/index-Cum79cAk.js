(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const d of s)if(d.type==="childList")for(const p of d.addedNodes)p.tagName==="LINK"&&p.rel==="modulepreload"&&o(p)}).observe(document,{childList:!0,subtree:!0});function a(s){const d={};return s.integrity&&(d.integrity=s.integrity),s.referrerPolicy&&(d.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?d.credentials="include":s.crossOrigin==="anonymous"?d.credentials="omit":d.credentials="same-origin",d}function o(s){if(s.ep)return;s.ep=!0;const d=a(s);fetch(s.href,d)}})();const be=Object.freeze({petName:"Mochi",statusLine:"Resting near the browser edge, ready for the next ritual check-in.",loopMode:"Companion seed state",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Seed state adapter",loopHint:"A shipped seed state is active until the live companion endpoint publishes richer state.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a calm status pulse."},memoryTitle:"Short-term memory",memorySummary:"Keeps the latest ritual cues nearby so the companion can feel consistent while running on a shipped seed state.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays on the seed state until the live endpoint is available."],recentInteractions:[{kind:"pat",title:"Pat interaction",detail:"A calm pat kept Mochi settled on the browser ledge.",timestamp:"2026-04-10T03:28:00.000Z",source:"Seed state adapter"},{kind:"signal",title:"Status pulse",detail:"The local adapter emitted a lightweight keep-alive signal.",timestamp:"2026-04-10T03:30:00.000Z",source:"Seed state adapter"}]});function ve(e){return JSON.parse(JSON.stringify(e))}function ee(e=be){return{async getCompanionState(){return await Promise.resolve(),ve(e)}}}async function ye(e){try{return await e.getCompanionState()}catch{return ee().getCompanionState()}}function ke(e,{reason:t,endpoint:a,legacyEndpoint:o}){const s=String(t||"backend_unavailable").trim()||"backend_unavailable",d=[a,o].filter(Boolean);return{...e,loopMode:"Degraded backend snapshot",adapterLabel:"Degraded backend snapshot",loopHint:"Backend companion state is unavailable. This labeled degraded snapshot keeps the surface explorable, but it is not live backend data.",recentSignals:[`Backend sync failed: ${s}.`,"Retry after the companion backend recovers to restore live state.",...Array.isArray(e==null?void 0:e.recentSignals)?e.recentSignals:[]],recentInteractions:[{kind:"fallback",title:"Degraded backend snapshot",detail:`The backend companion state could not be loaded from ${d.join(" -> ")||a}. Showing a degraded backend snapshot instead.`,timestamp:new Date().toISOString(),source:"Backend degraded"},...(Array.isArray(e==null?void 0:e.recentInteractions)?e.recentInteractions:[]).map(p=>({...p,source:`${(p==null?void 0:p.source)||"Seed state adapter"} · degraded snapshot`}))],degraded:!0,dataSource:"local-fallback",backendStatus:{degraded:!0,source:"backend",reason:s,endpoint:a,legacyEndpoint:o||null,retryable:!0}}}function Se({endpoint:e="/companion/state-v2",legacyEndpoint:t="/companion/state",actionEndpoint:a="/companion/actions",fetchImpl:o=(d=>(d=globalThis.fetch)==null?void 0:d.bind(globalThis))(),fallback:s=ee()}={}){return{async getCompanionState(){if(typeof o!="function")return s.getCompanionState();let p=!1;try{const m=await o(e,{headers:{Accept:"application/json"}});if(!m.ok&&t){p=!0;const b=await o(t,{headers:{Accept:"application/json"}});if(!b.ok)throw new Error(`companion_state_${b.status}`);const $=await b.json();if(!$||typeof $!="object")throw new Error("companion_state_invalid");return $}if(!m.ok)throw new Error(`companion_state_${m.status}`);const h=await m.json();if(!h||typeof h!="object")throw new Error("companion_state_invalid");return h}catch(m){const h=await ye(s);return ke(h,{reason:m instanceof Error?m.message:"backend_unavailable",endpoint:e,legacyEndpoint:p?t:null})}},async performAction(p,m){if(typeof o!="function")return{ok:!1,fallback:!0};const h=await o(a,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({action:p,note:m})});if(!h.ok)throw new Error(`companion_action_${h.status}`);return h.json()}}}const we=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],$e=["Local companion loop has not reported any recent signals yet."],Ae=[{kind:"signal",title:"Companion signal pending",detail:"No structured interaction timeline is available yet.",timestamp:"Pending",source:"Seed state adapter"}],_=["all","pat","feed","wake","signal","fallback"],q=["pat","feed","wake"],O=Symbol("petCompanionCleanup");function ce(e){return{key:String(e+1),label:`Alt+${e+1}`}}function Ce(e){const t=String(e??"").trim().toLowerCase();return t==="pat"||t==="feed"||t==="wake"||t==="signal"?t:t==="fallback"?"fallback":"signal"}function Le(e){const t=String((e==null?void 0:e.source)??"").trim().toLowerCase(),a=String((e==null?void 0:e.title)??"").trim().toLowerCase();return t.includes("fallback")||a.includes("fallback")||t.includes("degraded")||a.includes("degraded")?"fallback":a.includes("pat")?"pat":a.includes("feed")?"feed":a.includes("wake")?"wake":"signal"}function g(e){return e==="all"?"All":e==="pat"?"Pat":e==="feed"?"Feed":e==="wake"?"Wake":e==="fallback"?"Degraded":"Signal"}function S(e){const t=String(e??"").trim().toLowerCase();return _.includes(t)?t:"all"}function K(e){return q.includes(S(e))}function Te(e){const t=S(e);return t==="pat"?{label:"Pat note",placeholder:"Optional note for the next pat.",hint:"Describe the comfort, bond, or calming signal you want the timeline to capture. Press Ctrl+Enter to send."}:t==="feed"?{label:"Feed note",placeholder:"Optional note for the next feed.",hint:"Add snack, refill, or appetite context so the feed entry reads clearly later. Press Ctrl+Enter to send."}:t==="wake"?{label:"Wake note",placeholder:"Optional note for the next wake.",hint:"Explain the nudge or prompt that should bring the companion back into motion. Press Ctrl+Enter to send."}:{label:"Interaction note",placeholder:"Optional note for the next pat, feed, or wake.",hint:"Optional context travels into the companion timeline."}}function Ee(e){const t=S(e);return K(t)?null:t==="signal"?{message:"Signal entries are read-only snapshots. Pick Pat, Feed, or Wake to focus the composer on a writable action.",shortcuts:q}:t==="fallback"?{message:"Degraded-state entries describe backend recovery only. Switch to Pat, Feed, or Wake before drafting the next note.",shortcuts:q}:{message:"Notes publish through Pat, Feed, or Wake actions. Pick one to focus the composer before writing.",shortcuts:q}}function xe(e){const t=S(e);return t==="signal"?"Signal entries are read-only. Pick Pat, Feed, or Wake before sending.":t==="fallback"?"Degraded-state entries are read-only. Pick Pat, Feed, or Wake before sending.":"Pick Pat, Feed, or Wake before sending a note."}function Ie(e){const t=S(e);return t==="pat"?{label:"Suggested pat notes",templates:["Soft pat settled Mochi into a calmer loop.","Bond signal ticked upward after a gentle tap.","Comfort pass landed right on time for the next check-in."]}:t==="feed"?{label:"Suggested feed notes",templates:["Refilled snack tray and appetite stabilized.","Quick bite restored energy before the next loop window.","Treat drop landed cleanly and hunger signal eased."]}:t==="wake"?{label:"Suggested wake notes",templates:["Bright nudge reopened the interaction window.","Wake pulse brought Mochi back into active mode.","Gentle prompt resumed the browser buddy loop."]}:null}function Pe(e,t,a){const o=S(e),s=String(t??"").trim();return a?{label:"Template waiting",detail:"Choose Replace, Append, or Cancel to resolve the current draft.",tone:"pending"}:s?K(o)?{label:`${g(o)} draft ready`,detail:`Will publish with the next ${g(o).toLowerCase()} action.`,tone:"ready"}:{label:"Draft waiting",detail:"Pick Pat, Feed, or Wake to send this note.",tone:"pending"}:K(o)?{label:`${g(o)} draft empty`,detail:"Type a note or pick a template to stage the next action.",tone:"idle"}:{label:"Composer idle",detail:"Select Pat, Feed, or Wake to focus the draft composer.",tone:"idle"}}function Fe(){return`
    <ul class="shortcut-help-list">
      ${_.map((t,a)=>`
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">${i(ce(a).label)}</span>
        <span>${i(`Switch timeline to ${g(t)}.`)}</span>
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
  `}function i(e){return String(e).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function j(e){return`${e.toISOString().slice(0,16).replace("T"," ")} UTC`}function X(e,t,a,o){const s=Math.max(1,Math.round(Math.abs(e)/t)),d=s===1?a:o;return e>=0?`${s} ${d} ago`:`in ${s} ${d}`}function De(e){const t=String(e??"").trim();if(!t||t.toLowerCase()==="pending")return{label:t||"Pending",exact:"",machine:""};const a=new Date(t);if(Number.isNaN(a.getTime()))return{label:t,exact:"",machine:""};const o=Math.round((Date.now()-a.getTime())/1e3),s=Math.abs(o);return s<45?{label:o>=0?"just now":"in moments",exact:j(a),machine:a.toISOString()}:s<3600?{label:X(o,60,"min","mins"),exact:j(a),machine:a.toISOString()}:s<3600*24?{label:X(o,3600,"hour","hours"),exact:j(a),machine:a.toISOString()}:s<3600*24*7?{label:X(o,3600*24,"day","days"),exact:j(a),machine:a.toISOString()}:{label:j(a),exact:j(a),machine:a.toISOString()}}function Be(e,t){const a=e.backendStatus&&typeof e.backendStatus=="object"?e.backendStatus:{},o=t.backendStatus&&typeof t.backendStatus=="object"?t.backendStatus:{};return{degraded:!!(a.degraded||o.degraded||e.degraded||t.degraded),reason:a.reason||o.reason||"",endpoint:a.endpoint||o.endpoint||"",legacyEndpoint:a.legacyEndpoint||o.legacyEndpoint||"",retryable:a.retryable??o.retryable??!0}}function de(e){var L,T;const t=e&&typeof e=="object"?e:{},a=t.snapshot&&typeof t.snapshot=="object"?t.snapshot:{},o=t.version==="v2"&&t.companion&&typeof t.companion=="object"?t.companion:t,s=o.mood&&typeof o.mood=="object"?o.mood:{},d=Array.isArray(o.vitals)&&o.vitals.length?o.vitals:we,p=Array.isArray(o.recentSignals)&&o.recentSignals.length?o.recentSignals:$e,m=Array.isArray(o.recentInteractions)&&o.recentInteractions.length?o.recentInteractions.map(l=>({kind:Ce((l==null?void 0:l.kind)||Le(l)),title:(l==null?void 0:l.title)||"Companion signal",detail:(l==null?void 0:l.detail)||"No detail published yet.",timestamp:(l==null?void 0:l.timestamp)||"Pending",source:(l==null?void 0:l.source)||"Memory"})):Ae,h=a.profile&&typeof a.profile=="object"?a.profile:t.profile&&typeof t.profile=="object"?t.profile:{},b=Be(t,o),$=typeof t.dataSource=="string"&&t.dataSource.trim()||typeof o.dataSource=="string"&&o.dataSource.trim()||(b.degraded?"local-fallback":t.version==="v2"?"backend-v2":"backend"),c=a.relationship&&typeof a.relationship=="object"?a.relationship:t.relationship&&typeof t.relationship=="object"?t.relationship:{},x=a.progress&&typeof a.progress=="object"?a.progress:t.progress&&typeof t.progress=="object"?t.progress:{},z=Array.isArray(a.proactiveSignals)&&a.proactiveSignals.length?a.proactiveSignals.map(l=>({key:(l==null?void 0:l.key)||"signal",label:(l==null?void 0:l.label)||"Signal",detail:(l==null?void 0:l.detail)||"No proactive detail published yet.",dueAt:(l==null?void 0:l.dueAt)||null})):Array.isArray(t.proactiveSignals)&&t.proactiveSignals.length?t.proactiveSignals.map(l=>({key:(l==null?void 0:l.key)||"signal",label:(l==null?void 0:l.label)||"Signal",detail:(l==null?void 0:l.detail)||"No proactive detail published yet.",dueAt:(l==null?void 0:l.dueAt)||null})):[],D=x.stage==="starter"?{title:"Starter ritual",detail:"The companion is still in its first pet-core loop. Feed, Pat, and Wake actions now build persistent relationship and progression state."}:{title:"Stable ritual",detail:"The companion loop is carrying forward pet-core state instead of relying on temporary seed placeholders."},N=m.length,H=((L=m.find(l=>q.includes(l.kind)))==null?void 0:L.kind)||((T=m[0])==null?void 0:T.kind)||"signal",F=g(H),I=[{label:"Connection",value:b.degraded?"Degraded":"Live link",detail:b.degraded?"Running with a labeled degraded backend snapshot.":`Reading ${t.version==="v2"?"v2 companion":"runtime"} state from the active surface.`,tone:b.degraded?"warning":"cool"},{label:"Bond arc",value:c.level||s.label||"Settling",detail:c.note||s.note||"Relationship state has not been published yet.",tone:"warm"},{label:"Next ritual",value:x.nextMilestone||D.title,detail:D.detail,tone:"neutral"},{label:"Timeline",value:`${N} ${N===1?"entry":"entries"}`,detail:`${F} is the most visible recent interaction lane.`,tone:"cool"}];return{version:t.version||"legacy",petName:o.petName||"Companion",statusLine:o.statusLine||"Waiting for the first local update.",loopMode:o.loopMode||"Companion seed state",lastCheckIn:o.lastCheckIn||"Pending",adapterLabel:o.adapterLabel||"Seed state adapter",loopHint:o.loopHint||"The browser companion can stay expressive while the runtime surface evolves.",mood:{label:s.label||"Settling",note:s.note||"No mood note has been published yet."},memoryTitle:o.memoryTitle||"Memory summary",memorySummary:o.memorySummary||"No memory summary is available yet. The surface still keeps a readable ritual rhythm.",relationship:{level:c.level||"Unknown",note:c.note||"Relationship state has not been published yet."},progress:{stage:x.stage||"legacy",progressLabel:x.progressLabel||"Legacy loop",nextMilestone:x.nextMilestone||null},profile:{species:h.species||null,archetype:h.archetype||null},degraded:b.degraded,dataSource:$,dataSourceLabel:$==="local-fallback"?"Degraded backend snapshot":$,backendStatus:b,retryGuidance:"Use Refresh mood after the backend companion endpoint recovers.",proactiveSignals:z,onboarding:D,vitals:d,recentSignals:p,recentInteractions:m,highlightCards:I}}function Me(e){return e.map(t=>`
        <article class="metric-card">
          <span class="metric-label">${i(t.label||"State")}</span>
          <strong class="metric-value">${i(t.value||"Unknown")}</strong>
        </article>
      `).join("")}function je(e){return e.map(t=>`<li class="signal-item">${i(t)}</li>`).join("")}function Ne(e){return e.length?e.map(t=>{const a=t.dueAt?` <span class="signal-time">${i(t.dueAt)}</span>`:"";return`<li class="signal-item"><strong>${i(t.label)}</strong>: ${i(t.detail)}${a}</li>`}).join(""):'<li class="signal-item">No proactive rituals are scheduled yet.</li>'}function Re(e){const t=e.reduce((a,o)=>(a.all+=1,a[o.kind]=(a[o.kind]||0)+1,a),{all:0,pat:0,feed:0,wake:0,signal:0,fallback:0});return _.map(a=>({kind:a,label:g(a),count:t[a]||0}))}function Oe(e,t){return Re(e).map((a,o)=>{const s=ce(o);return`
        <button
          class="timeline-filter${a.kind===t?" is-active":""}"
          type="button"
          data-role="timeline-filter"
          data-filter-kind="${i(a.kind)}"
          data-filter-shortcut="${i(s.key)}"
          aria-pressed="${a.kind===t?"true":"false"}"
        >
          <span>${i(a.label)}</span>
          <span class="timeline-filter-shortcut" aria-hidden="true">${i(s.label)}</span>
          <span class="timeline-filter-count">${i(a.count)}</span>
        </button>
      `}).join("")}function qe(e,t){const a=S(t),o=a==="all"?e:e.filter(s=>s.kind===a);return o.length===0?`
      <div class="timeline-empty" data-role="timeline-empty">
        No ${i(g(a).toLowerCase())} interactions yet.
      </div>
    `:o.map(s=>{const d=De(s.timestamp),p=g(s.kind);return`
        <article class="interaction-card interaction-card-${i(s.kind)}">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${i(s.title)}</h3>
              <p class="interaction-detail">${i(s.detail)}</p>
            </div>
            <div class="interaction-meta">
              <span class="interaction-kind interaction-kind-${i(s.kind)}">${i(p)}</span>
              <span class="interaction-source">${i(s.source)}</span>
            </div>
          </div>
          <time
            class="interaction-time"
            ${d.machine?`datetime="${i(d.machine)}"`:""}
            ${d.exact?`title="${i(d.exact)}"`:""}
          >${i(d.label)}</time>
        </article>
      `}).join("")}function _e(e){if(!e.degraded)return"";const t=[e.backendStatus.endpoint,e.backendStatus.legacyEndpoint].filter(Boolean).join(" -> ");return`
    <section class="panel panel-degraded" aria-live="polite">
      <p class="section-label">Degraded mode</p>
      <h2>Backend companion state unavailable</h2>
      <p class="panel-copy">
        Showing a labeled degraded backend snapshot so the surface remains explorable without pretending the backend is healthy.
      </p>
      <ul class="signal-list">
        <li class="signal-item"><strong>Surface source:</strong> ${i(e.dataSourceLabel)}</li>
        <li class="signal-item"><strong>Backend error:</strong> ${i(e.backendStatus.reason||"backend_unavailable")}</li>
        ${t?`<li class="signal-item"><strong>Attempted endpoints:</strong> ${i(t)}</li>`:""}
        <li class="signal-item"><strong>Retry:</strong> ${i(e.retryGuidance)}</li>
      </ul>
    </section>
  `}function Ke(e){return e.map(t=>`
        <article class="hero-highlight hero-highlight-${i(t.tone)}">
          <span class="hero-highlight-label">${i(t.label)}</span>
          <strong class="hero-highlight-value">${i(t.value)}</strong>
          <p class="hero-highlight-detail">${i(t.detail)}</p>
        </article>
      `).join("")}function ze(e,t="all"){const a=de(e),o=S(t);return`
    ${_e(a)}
    <div class="panel-grid">
      <section class="panel panel-highlights" aria-labelledby="surface-status-heading">
        <div class="panel-copy-stack">
          <p class="section-label">Surface status</p>
          <h2 id="surface-status-heading">Companion rhythm at a glance</h2>
          <p class="panel-copy">
            A quick read on connection health, bond direction, next ritual, and the recent timeline cadence.
          </p>
        </div>
        <div class="hero-highlight-grid">
          ${Ke(a.highlightCards)}
        </div>
      </section>

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
            <div>
              <dt>Profile</dt>
              <dd>${i([a.profile.species,a.profile.archetype].filter(Boolean).join(" · ")||"Companion profile")}</dd>
            </div>
            <div>
              <dt>Connection</dt>
              <dd>${i(a.dataSourceLabel)}</dd>
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

      <section class="panel" aria-labelledby="arc-heading">
        <p class="section-label">Pet arc</p>
        <h2 id="arc-heading">${i(a.relationship.level)}</h2>
        <p class="panel-copy">${i(a.relationship.note)}</p>
        <ul class="signal-list">
          <li class="signal-item"><strong>Stage:</strong> ${i(a.progress.progressLabel)}</li>
          <li class="signal-item"><strong>Ritual:</strong> ${i(a.onboarding.title)}</li>
          <li class="signal-item">${i(a.onboarding.detail)}</li>
          ${a.progress.nextMilestone?`<li class="signal-item"><strong>Next milestone:</strong> ${i(a.progress.nextMilestone)}</li>`:""}
        </ul>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${i(a.memoryTitle)}</h2>
        <p class="panel-copy">${i(a.memorySummary)}</p>
        <ul class="signal-list">
          ${je(a.recentSignals)}
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
          ${Oe(a.recentInteractions,o)}
        </div>
        <div class="interaction-list">
          ${qe(a.recentInteractions,o)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${Me(a.vitals)}
        </div>
      </section>
    </div>
  `}function re(e){const t=e instanceof Error?e.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${i(t)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function He(){return`
    <main class="companion-shell" data-surface="pet-companion">
      <section class="hero-card">
        <div class="hero-copy">
          <p class="eyebrow">Pet companion surface</p>
          <h1>A calm browser companion with a readable ritual loop</h1>
          <p class="hero-note">
            This surface turns companion mood, memory, rituals, and interaction history into one pet-facing view that
            can stay understandable even when the backend drops into degraded snapshot mode.
          </p>
        </div>
        <div class="hero-actions">
          <div class="hero-utility-row">
            <span class="status-pill" data-role="adapter-status">Adapter: seed state adapter</span>
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
  `}async function We(e,{adapter:t=ee()}={}){if(!e)throw new Error("A target element is required to render the pet companion surface.");typeof e[O]=="function"&&e[O](),e.innerHTML=He();const a=e.ownerDocument,o=e.querySelector('[data-role="content"]'),s=e.querySelector('[data-action="refresh"]'),d=e.querySelector('[data-role="adapter-status"]'),p=e.querySelector('[data-role="shortcut-help-toggle"]'),m=e.querySelector('[data-role="shortcut-help"]'),h=e.querySelector('[data-role="shortcut-help-title"]'),b=e.querySelector('[data-role="shortcut-help-close"]'),$=e.querySelector('[data-role="live-region"]'),c=e.querySelector('[data-role="action-note"]'),x=e.querySelector('[data-role="action-note-label"]'),z=e.querySelector('[data-role="action-note-hint"]'),D=e.querySelector('[data-role="action-note-status"]'),N=e.querySelector('[data-role="action-note-status-label"]'),H=e.querySelector('[data-role="action-note-status-detail"]'),F=e.querySelector('[data-role="action-note-clear"]'),I=e.querySelector('[data-role="composer-templates"]'),L=e.querySelector('[data-role="composer-template-actions"]'),T=e.querySelector('[data-role="composer-guide"]'),l=[...e.querySelectorAll('[data-role="action-buttons"] [data-action]')];let v="all",W=null,k=null,A=!1,te="";function B(n,{degraded:r=!1}={}){d&&(d.textContent=n,d.classList.toggle("is-degraded",r))}function pe(n){return!!(n&&typeof n=="object"&&"tagName"in n&&["INPUT","TEXTAREA","SELECT"].includes(String(n.tagName).toUpperCase()))}function ue(n){return!n||typeof n!="object"||!("closest"in n)?null:n.closest('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]')}function J(){l.forEach(n=>{const u=n.getAttribute("data-action")===v;n.classList.toggle("is-linked",u),n.setAttribute("data-filter-linked",u?"true":"false")})}function y(n){const r=String(n??"").trim();!$||!r||(te===r&&($.textContent=""),te=r,$.textContent=r)}function ae(){p&&(p.setAttribute("aria-expanded",A?"true":"false"),p.classList.toggle("is-active",A)),m&&(m.hidden=!A)}function me(n=!1){const r=[h,b].filter(Boolean);if(!r.length)return;const u=n?r[r.length-1]:r[0];u==null||u.focus()}function R(n,r,{moveFocus:u=!1}={}){A=n,ae(),u&&(n?h==null||h.focus():p==null||p.focus()),r&&y(r)}function he(n){return!!(n&&(m!=null&&m.contains(n)||p!=null&&p.contains(n)))}function Q(n,{announcement:r}={}){const u=S(n);u!==v&&(E(),v=u,se(),r&&y(r))}function E(){k=null}function fe(){c&&(c.value="",c.focus()),E(),C(),y("Draft cleared.")}function ge(n){if(!c||!k)return;const r=c.value.trim();n==="append"&&r?c.value=`${r}
${k}`:c.value=k,c.focus(),E(),C(),y(`${g(v)} template ${n==="append"?"appended to":"replaced"} draft.`)}function C(){const n=Te(v),r=Pe(v,c==null?void 0:c.value,k),u=Ie(v),M=Ee(v),P=!!(c!=null&&c.value.trim())||!!k;x&&(x.textContent=n.label),c&&(c.placeholder=n.placeholder,c.setAttribute("data-composer-kind",S(v))),z&&(z.textContent=n.hint),D&&D.setAttribute("data-status-tone",r.tone),N&&(N.textContent=r.label),H&&(H.textContent=r.detail),F&&(F.disabled=!P),I&&(u?(I.hidden=!1,I.innerHTML=`
          <p class="composer-templates-label">${i(u.label)}</p>
          <div class="composer-template-list">
            ${u.templates.map(f=>`
                  <button
                    class="composer-template"
                    type="button"
                    data-role="composer-template"
                    data-template-value="${i(f)}"
                  >${i(f)}</button>
                `).join("")}
          </div>
        `,[...I.querySelectorAll('[data-role="composer-template"]')].forEach(f=>{f.addEventListener("click",()=>{if(c){const w=f.getAttribute("data-template-value")??"",le=c.value.trim();if(le&&le!==w){k=w,C(),y("Template selected. Choose Replace, Append, or Cancel.");return}c.value=w,c.focus(),E(),C(),y(`${g(v)} template inserted into draft.`)}})})):(I.innerHTML="",I.hidden=!0)),L&&(!k||!u?(L.innerHTML="",L.hidden=!0):(L.hidden=!1,L.innerHTML=`
          <p class="composer-template-actions-copy">
            Keep the current draft, append the suggestion, or replace it with:
            <span class="composer-template-preview">${i(k)}</span>
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
        `,[...L.querySelectorAll('[data-role="template-merge-action"]')].forEach(f=>{f.addEventListener("click",()=>{const w=f.getAttribute("data-merge-mode");if(w==="replace"||w==="append"){ge(w);return}E(),C(),y("Template merge cancelled.")})}))),T&&(M?(T.hidden=!1,T.innerHTML=`
          <p class="composer-guide-copy">${i(M.message)}</p>
          <div class="composer-shortcuts">
            ${M.shortcuts.map(f=>`
                  <button
                    class="composer-shortcut"
                    type="button"
                    data-role="composer-shortcut"
                    data-shortcut-kind="${i(f)}"
                  >${i(g(f))}</button>
                `).join("")}
          </div>
        `,[...T.querySelectorAll('[data-role="composer-shortcut"]')].forEach(f=>{f.addEventListener("click",()=>{const w=S(f.getAttribute("data-shortcut-kind"));Q(w,{announcement:`Timeline filter set to ${g(w)}.`}),c==null||c.focus()})})):(T.innerHTML="",T.hidden=!0))}function U(n){s.disabled=n,l.forEach(r=>{r.disabled=n}),c&&(c.disabled=n)}c==null||c.addEventListener("input",()=>{k&&E(),C()}),F==null||F.addEventListener("click",()=>{fe()}),p==null||p.addEventListener("click",()=>{R(!A,`Shortcut help ${A?"closed":"opened"}.`,{moveFocus:!0})}),b==null||b.addEventListener("click",()=>{R(!1,"Shortcut help closed.",{moveFocus:!0})});function ne(n){if(!A||he(n.target))return;const r=ue(n.target),u=!!(m!=null&&m.contains(a.activeElement));R(!1,"Shortcut help closed.",{moveFocus:!r&&u})}function oe(n){var M;if(n.key==="Escape"&&k){n.preventDefault(),E(),C(),y("Template merge cancelled.");return}if(n.key==="Escape"&&A){n.preventDefault(),R(!1,"Shortcut help closed.",{moveFocus:!0});return}if(n.key==="Tab"&&A){const P=[h,b].filter(Boolean);if(!P.length)return;const V=e.ownerDocument.activeElement,f=P.indexOf(V);if(f===-1){n.preventDefault(),me(n.shiftKey);return}const w=n.shiftKey?(f-1+P.length)%P.length:(f+1)%P.length;n.preventDefault(),(M=P[w])==null||M.focus();return}if(n.key==="?"&&!pe(n.target)){n.preventDefault(),R(!A,`Shortcut help ${A?"closed":"opened"}.`,{moveFocus:!0});return}if(!n.altKey||n.ctrlKey||n.metaKey||n.shiftKey)return;const r=Number.parseInt(n.key,10)-1;if(Number.isNaN(r)||r<0||r>=_.length)return;n.preventDefault();const u=_[r];Q(u,{announcement:`Timeline filter set to ${g(u)}.`})}a.addEventListener("click",ne),a.addEventListener("keydown",oe);async function ie(n){if(!n)return;if(k){y("Resolve template merge before sending.");return}if(typeof t.performAction!="function"){B("Adapter: action unavailable"),y(`${g(n)} action is unavailable in the current adapter.`);return}const r=typeof(c==null?void 0:c.value)=="string"?c.value.trim():"";U(!0),B(`Adapter: sending ${n}`),y(`Sending ${g(n)} action.`);try{await t.performAction(n,r||void 0),E(),v=S(n),c&&(c.value=""),await G(),y(`${g(n)} action sent.`)}catch(u){o.innerHTML=re(u),B("Adapter: action failed",{degraded:!0}),U(!1),y(`${g(n)} action failed.`)}}c==null||c.addEventListener("keydown",n=>{if(n.key==="Escape"&&k){n.preventDefault(),E(),C(),y("Template merge cancelled.");return}if(n.key==="Enter"&&(n.ctrlKey||n.metaKey)&&!K(v)){n.preventDefault(),y(xe(v));return}n.key==="Enter"&&(n.ctrlKey||n.metaKey)&&K(v)&&(n.preventDefault(),ie(v))});function se(){if(!W){J(),C();return}o.innerHTML=ze(W,v),J(),C(),[...o.querySelectorAll('[data-role="timeline-filter"]')].forEach(r=>{r.addEventListener("click",()=>{const u=S(r.getAttribute("data-filter-kind"));Q(u,{announcement:`Timeline filter set to ${g(u)}.`})})})}async function G(){U(!0),s.textContent="Refreshing...",B("Adapter: syncing companion state");try{const n=await t.getCompanionState(),r=de(n);W=r,se(),B(`Adapter: ${r.adapterLabel}`,{degraded:r.degraded})}catch(n){W=null,o.innerHTML=re(n),B("Adapter: degraded",{degraded:!0})}finally{U(!1),s.textContent="Refresh mood"}}for(const n of l)n.addEventListener("click",async()=>{const r=n.getAttribute("data-action");await ie(r)});s.addEventListener("click",()=>{G()});function Z(){a.removeEventListener("click",ne),a.removeEventListener("keydown",oe),e[O]===Z&&delete e[O]}return e[O]=Z,J(),ae(),C(),await G(),{destroy:Z,reload:G}}const Y=document.getElementById("app");Y&&We(Y,{adapter:Se()}).catch(e=>{Y.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${e instanceof Error?e.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
