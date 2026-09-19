(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const c of i)if(c.type==="childList")for(const p of c.addedNodes)p.tagName==="LINK"&&p.rel==="modulepreload"&&o(p)}).observe(document,{childList:!0,subtree:!0});function a(i){const c={};return i.integrity&&(c.integrity=i.integrity),i.referrerPolicy&&(c.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?c.credentials="include":i.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function o(i){if(i.ep)return;i.ep=!0;const c=a(i);fetch(i.href,c)}})();const ke=Object.freeze({petName:"Mochi",statusLine:"Resting near the browser edge, ready for the next ritual check-in.",loopMode:"Companion seed state",lastCheckIn:"2026-04-10 03:30",adapterLabel:"Seed state adapter",loopHint:"A shipped seed state is active until the live companion endpoint publishes richer state.",mood:{label:"Curious",note:"Ready to nudge the next companion interaction with a calm status pulse."},memoryTitle:"Short-term memory",memorySummary:"Keeps the latest ritual cues nearby so the companion can feel consistent while running on a shipped seed state.",vitals:[{label:"Energy",value:"76%"},{label:"Hunger",value:"Snack soon"},{label:"Bond",value:"Growing"},{label:"Focus",value:"Watching queue"}],recentSignals:["Last pat received 2 minutes ago.","Quiet window open for another 18 minutes.","Next nudge stays on the seed state until the live endpoint is available."],recentInteractions:[{kind:"pat",title:"Pat interaction",detail:"A calm pat kept Mochi settled on the browser ledge.",timestamp:"2026-04-10T03:28:00.000Z",source:"Seed state adapter"},{kind:"signal",title:"Status pulse",detail:"The local adapter emitted a lightweight keep-alive signal.",timestamp:"2026-04-10T03:30:00.000Z",source:"Seed state adapter"}]});function we(e){return JSON.parse(JSON.stringify(e))}function X(e=ke){return{async getCompanionState(){return await Promise.resolve(),we(e)}}}async function $e(e){try{return await e.getCompanionState()}catch{return X().getCompanionState()}}function Ae(e,{reason:t,endpoint:a,legacyEndpoint:o}){const i=String(t||"backend_unavailable").trim()||"backend_unavailable",c=[a,o].filter(Boolean);return{...e,loopMode:"Degraded backend snapshot",adapterLabel:"Degraded backend snapshot",loopHint:"Backend companion state is unavailable. This labeled degraded snapshot keeps the surface explorable, but it is not live backend data.",recentSignals:[`Backend sync failed: ${i}.`,"Retry after the companion backend recovers to restore live state.",...Array.isArray(e==null?void 0:e.recentSignals)?e.recentSignals:[]],recentInteractions:[{kind:"fallback",title:"Degraded backend snapshot",detail:`The backend companion state could not be loaded from ${c.join(" -> ")||a}. Showing a degraded backend snapshot instead.`,timestamp:new Date().toISOString(),source:"Backend degraded"},...(Array.isArray(e==null?void 0:e.recentInteractions)?e.recentInteractions:[]).map(p=>({...p,source:`${(p==null?void 0:p.source)||"Seed state adapter"} · degraded snapshot`}))],degraded:!0,dataSource:"local-fallback",backendStatus:{degraded:!0,source:"backend",reason:i,endpoint:a,legacyEndpoint:o||null,retryable:!0}}}function re(e){var t,a;try{return((a=(t=globalThis.sessionStorage)==null?void 0:t.getItem(e))==null?void 0:a.trim())||""}catch{return""}}function Ce(){return String(globalThis.__ADMIN_SESSION_TOKEN__||re("admin_session_token")).trim()}function Te(){return String(globalThis.__ADMIN_API_KEY__||re("admin_api_key")).trim()}function Le(){const e={Accept:"application/json","Content-Type":"application/json"},t=Ce(),a=Te();return t&&(e["x-admin-session"]=t),a&&(e["x-api-key"]=a),e}function Ee({endpoint:e="/companion/state-v2",legacyEndpoint:t="/companion/state",actionEndpoint:a="/companion/actions",fetchImpl:o=(c=>(c=globalThis.fetch)==null?void 0:c.bind(globalThis))(),fallback:i=X()}={}){return{async getCompanionState(){if(typeof o!="function")return i.getCompanionState();let p=!1;try{const h=await o(e,{headers:{Accept:"application/json"}});if(!h.ok&&t){p=!0;const d=await o(t,{headers:{Accept:"application/json"}});if(!d.ok)throw new Error(`companion_state_${d.status}`);const v=await d.json();if(!v||typeof v!="object")throw new Error("companion_state_invalid");return v}if(!h.ok)throw new Error(`companion_state_${h.status}`);const g=await h.json();if(!g||typeof g!="object")throw new Error("companion_state_invalid");return g}catch(h){const g=await $e(i);return Ae(g,{reason:h instanceof Error?h.message:"backend_unavailable",endpoint:e,legacyEndpoint:p?t:null})}},async performAction(p,h){if(typeof o!="function")return{ok:!1,fallback:!0};const g=await o(a,{method:"POST",headers:Le(),body:JSON.stringify({action:p,note:h})});if(!g.ok)throw new Error(`companion_action_${g.status}`);return g.json()}}}function s(e){return String(e).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function j(e){return`${e.toISOString().slice(0,16).replace("T"," ")} UTC`}function Q(e,t,a,o){const i=Math.max(1,Math.round(Math.abs(e)/t)),c=i===1?a:o;return e>=0?`${i} ${c} ago`:`in ${i} ${c}`}function xe(e){const t=String(e??"").trim();if(!t||t.toLowerCase()==="pending")return{label:t||"Pending",exact:"",machine:""};const a=new Date(t);if(Number.isNaN(a.getTime()))return{label:t,exact:"",machine:""};const o=Math.round((Date.now()-a.getTime())/1e3),i=Math.abs(o);return i<45?{label:o>=0?"just now":"in moments",exact:j(a),machine:a.toISOString()}:i<3600?{label:Q(o,60,"min","mins"),exact:j(a),machine:a.toISOString()}:i<3600*24?{label:Q(o,3600,"hour","hours"),exact:j(a),machine:a.toISOString()}:i<3600*24*7?{label:Q(o,3600*24,"day","days"),exact:j(a),machine:a.toISOString()}:{label:j(a),exact:j(a),machine:a.toISOString()}}const Ie=[{kind:"signal",title:"Companion signal pending",detail:"No structured interaction timeline is available yet.",timestamp:"Pending",source:"Seed state adapter"}],K=["all","pat","feed","wake","signal","fallback"],q=["pat","feed","wake"];function ce(e){return{key:String(e+1),label:`Alt+${e+1}`}}function Pe(e){const t=String(e??"").trim().toLowerCase();return t==="pat"||t==="feed"||t==="wake"||t==="signal"?t:t==="fallback"?"fallback":"signal"}function De(e){const t=String((e==null?void 0:e.source)??"").trim().toLowerCase(),a=String((e==null?void 0:e.title)??"").trim().toLowerCase();return t.includes("fallback")||a.includes("fallback")||t.includes("degraded")||a.includes("degraded")?"fallback":a.includes("pat")?"pat":a.includes("feed")?"feed":a.includes("wake")?"wake":"signal"}function b(e){return e==="all"?"All":e==="pat"?"Pat":e==="feed"?"Feed":e==="wake"?"Wake":e==="fallback"?"Degraded":"Signal"}function A(e){const t=String(e??"").trim().toLowerCase();return K.includes(t)?t:"all"}function H(e){return q.includes(A(e))}function Ne(e){const t=A(e);return t==="pat"?{label:"Pat note",placeholder:"Optional note for the next pat.",hint:"Describe the comfort, bond, or calming signal you want the timeline to capture. Press Ctrl+Enter to send."}:t==="feed"?{label:"Feed note",placeholder:"Optional note for the next feed.",hint:"Add snack, refill, or appetite context so the feed entry reads clearly later. Press Ctrl+Enter to send."}:t==="wake"?{label:"Wake note",placeholder:"Optional note for the next wake.",hint:"Explain the nudge or prompt that should bring the companion back into motion. Press Ctrl+Enter to send."}:{label:"Interaction note",placeholder:"Optional note for the next pat, feed, or wake.",hint:"Optional context travels into the companion timeline."}}function Fe(e){const t=A(e);return H(t)?null:t==="signal"?{message:"Signal entries are read-only snapshots. Pick Pat, Feed, or Wake to focus the composer on a writable action.",shortcuts:q}:t==="fallback"?{message:"Degraded-state entries describe backend recovery only. Switch to Pat, Feed, or Wake before drafting the next note.",shortcuts:q}:{message:"Notes publish through Pat, Feed, or Wake actions. Pick one to focus the composer before writing.",shortcuts:q}}function Me(e){const t=A(e);return t==="signal"?"Signal entries are read-only. Pick Pat, Feed, or Wake before sending.":t==="fallback"?"Degraded-state entries are read-only. Pick Pat, Feed, or Wake before sending.":"Pick Pat, Feed, or Wake before sending a note."}function de(e){const t=A(e);return t==="pat"?{label:"Suggested pat notes",templates:["Soft pat settled Mochi into a calmer loop.","Bond signal ticked upward after a gentle tap.","Comfort pass landed right on time for the next check-in."]}:t==="feed"?{label:"Suggested feed notes",templates:["Refilled snack tray and appetite stabilized.","Quick bite restored energy before the next loop window.","Treat drop landed cleanly and hunger signal eased."]}:t==="wake"?{label:"Suggested wake notes",templates:["Bright nudge reopened the interaction window.","Wake pulse brought Mochi back into active mode.","Gentle prompt resumed the browser buddy loop."]}:null}function Be(e,t,a){const o=A(e),i=String(t??"").trim();return a?{label:"Template waiting",detail:"Choose Replace, Append, or Cancel to resolve the current draft.",tone:"pending"}:i?H(o)?{label:`${b(o)} draft ready`,detail:`Will publish with the next ${b(o).toLowerCase()} action.`,tone:"ready"}:{label:"Draft waiting",detail:"Pick Pat, Feed, or Wake to send this note.",tone:"pending"}:H(o)?{label:`${b(o)} draft empty`,detail:"Type a note or pick a template to stage the next action.",tone:"idle"}:{label:"Composer idle",detail:"Select Pat, Feed, or Wake to focus the draft composer.",tone:"idle"}}function _e(){return`
    <ul class="shortcut-help-list">
      ${K.map((t,a)=>`
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">${s(ce(a).label)}</span>
        <span>${s(`Switch timeline to ${b(t)}.`)}</span>
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
  `}function je(e){const{refs:t,selectedTimelineFilter:a,pendingTemplateValue:o,shouldRebuild:i,clearPendingTemplateAction:c,applyTemplateToDraft:p,setTimelineFilter:h,announce:g}=e,{actionNote:d,actionNoteLabel:v,actionNoteHint:u,actionNoteStatus:C,actionNoteStatusLabel:F,actionNoteStatusDetail:x,actionNoteClear:N,composerTemplates:T,composerTemplateActions:w,composerGuide:L}=t,I=Ne(a),l=Be(a,d==null?void 0:d.value,o),P=de(a),y=Fe(a),M=!!(d!=null&&d.value.trim())||!!o;v&&(v.textContent=I.label),d&&(d.placeholder=I.placeholder,d.setAttribute("data-composer-kind",A(a))),u&&(u.textContent=I.hint),C&&C.setAttribute("data-status-tone",l.tone),F&&(F.textContent=l.label),x&&(x.textContent=l.detail),N&&(N.disabled=!M),i&&(T&&(P?(T.hidden=!1,T.innerHTML=`
          <p class="composer-templates-label">${s(P.label)}</p>
          <div class="composer-template-list">
            ${P.templates.map(m=>`
                  <button
                    class="composer-template"
                    type="button"
                    data-role="composer-template"
                    data-template-value="${s(m)}"
                  >${s(m)}</button>
                `).join("")}
          </div>
        `,[...T.querySelectorAll('[data-role="composer-template"]')].forEach(m=>{m.addEventListener("click",()=>{if(d){const $=m.getAttribute("data-template-value")??"",R=d.value.trim();if(R&&R!==$){e.setPendingTemplateValue($),e.syncComposerContext(),g("Template selected. Choose Replace, Append, or Cancel.");return}d.value=$,d.focus(),c(),e.syncComposerContext(),g(`${b(a)} template inserted into draft.`)}})})):(T.innerHTML="",T.hidden=!0)),w&&(!o||!P?(w.innerHTML="",w.hidden=!0):(w.hidden=!1,w.innerHTML=`
          <p class="composer-template-actions-copy">
            Keep the current draft, append the suggestion, or replace it with:
            <span class="composer-template-preview">${s(o)}</span>
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
        `,[...w.querySelectorAll('[data-role="template-merge-action"]')].forEach(m=>{m.addEventListener("click",()=>{const $=m.getAttribute("data-merge-mode");if($==="replace"||$==="append"){p($);return}c(),e.syncComposerContext(),g("Template merge cancelled.")})}))),L&&(y?(L.hidden=!1,L.innerHTML=`
          <p class="composer-guide-copy">${s(y.message)}</p>
          <div class="composer-shortcuts">
            ${y.shortcuts.map(m=>`
                  <button
                    class="composer-shortcut"
                    type="button"
                    data-role="composer-shortcut"
                    data-shortcut-kind="${s(m)}"
                  >${s(b(m))}</button>
                `).join("")}
          </div>
        `,[...L.querySelectorAll('[data-role="composer-shortcut"]')].forEach(m=>{m.addEventListener("click",()=>{const $=A(m.getAttribute("data-shortcut-kind"));h($,{announcement:`Timeline filter set to ${b($)}.`}),d==null||d.focus()})})):(L.innerHTML="",L.hidden=!0)))}function Re(e,t){const a=de(e);return`${e}::${t??""}::${a?a.templates.join("|"):""}`}const Oe=[{label:"Energy",value:"Unknown"},{label:"Hunger",value:"Unknown"},{label:"Bond",value:"Unknown"}],qe=["Local companion loop has not reported any recent signals yet."];function Ke(e,t){const a=e.backendStatus&&typeof e.backendStatus=="object"?e.backendStatus:{},o=t.backendStatus&&typeof t.backendStatus=="object"?t.backendStatus:{};return{degraded:!!(a.degraded||o.degraded||e.degraded||t.degraded),reason:a.reason||o.reason||"",endpoint:a.endpoint||o.endpoint||"",legacyEndpoint:a.legacyEndpoint||o.legacyEndpoint||"",retryable:a.retryable??o.retryable??!0}}function pe(e){var I;const t=e&&typeof e=="object"?e:{},a=t.snapshot&&typeof t.snapshot=="object"?t.snapshot:{},o=t.version==="v2"&&t.companion&&typeof t.companion=="object"?t.companion:t,i=o.mood&&typeof o.mood=="object"?o.mood:{},c=Array.isArray(o.vitals)&&o.vitals.length?o.vitals:Oe,p=Array.isArray(o.recentSignals)&&o.recentSignals.length?o.recentSignals:qe,h=Array.isArray(o.recentInteractions)&&o.recentInteractions.length?o.recentInteractions.map(l=>({kind:Pe((l==null?void 0:l.kind)||De(l)),title:(l==null?void 0:l.title)||"Companion signal",detail:(l==null?void 0:l.detail)||"No detail published yet.",timestamp:(l==null?void 0:l.timestamp)||"Pending",source:(l==null?void 0:l.source)||"Memory"})):Ie,g=a.profile&&typeof a.profile=="object"?a.profile:t.profile&&typeof t.profile=="object"?t.profile:{},d=Ke(t,o),v=typeof t.dataSource=="string"&&t.dataSource.trim()||typeof o.dataSource=="string"&&o.dataSource.trim()||(d.degraded?"local-fallback":t.version==="v2"?"backend-v2":"backend"),u=a.relationship&&typeof a.relationship=="object"?a.relationship:t.relationship&&typeof t.relationship=="object"?t.relationship:{},C=a.progress&&typeof a.progress=="object"?a.progress:t.progress&&typeof t.progress=="object"?t.progress:{},F=Array.isArray(a.proactiveSignals)&&a.proactiveSignals.length?a.proactiveSignals.map(l=>({key:(l==null?void 0:l.key)||"signal",label:(l==null?void 0:l.label)||"Signal",detail:(l==null?void 0:l.detail)||"No proactive detail published yet.",dueAt:(l==null?void 0:l.dueAt)||null})):Array.isArray(t.proactiveSignals)&&t.proactiveSignals.length?t.proactiveSignals.map(l=>({key:(l==null?void 0:l.key)||"signal",label:(l==null?void 0:l.label)||"Signal",detail:(l==null?void 0:l.detail)||"No proactive detail published yet.",dueAt:(l==null?void 0:l.dueAt)||null})):[],x=C.stage==="starter"?{title:"Starter ritual",detail:"The companion is still in its first pet-core loop. Feed, Pat, and Wake actions now build persistent relationship and progression state."}:{title:"Stable ritual",detail:"The companion loop is carrying forward pet-core state instead of relying on temporary seed placeholders."},N=h.length,T=((I=h.find(l=>q.includes(l.kind)))==null?void 0:I.kind)||h[0].kind,w=b(T),L=[{label:"Connection",value:d.degraded?"Degraded":"Live link",detail:d.degraded?"Running with a labeled degraded backend snapshot.":`Reading ${t.version==="v2"?"v2 companion":"runtime"} state from the active surface.`,tone:d.degraded?"warning":"cool"},{label:"Bond arc",value:u.level||i.label||"Settling",detail:u.note||i.note||"Relationship state has not been published yet.",tone:"warm"},{label:"Next ritual",value:C.nextMilestone||x.title,detail:x.detail,tone:"neutral"},{label:"Timeline",value:`${N} ${N===1?"entry":"entries"}`,detail:`${w} is the most visible recent interaction lane.`,tone:"cool"}];return{version:t.version||"legacy",petName:o.petName||"Companion",statusLine:o.statusLine||"Waiting for the first local update.",loopMode:o.loopMode||"Companion seed state",lastCheckIn:o.lastCheckIn||"Pending",adapterLabel:o.adapterLabel||"Seed state adapter",loopHint:o.loopHint||"The browser companion can stay expressive while the runtime surface evolves.",mood:{label:i.label||"Settling",note:i.note||"No mood note has been published yet."},memoryTitle:o.memoryTitle||"Memory summary",memorySummary:o.memorySummary||"No memory summary is available yet. The surface still keeps a readable ritual rhythm.",relationship:{level:u.level||"Unknown",note:u.note||"Relationship state has not been published yet."},progress:{stage:C.stage||"legacy",progressLabel:C.progressLabel||"Legacy loop",nextMilestone:C.nextMilestone||null},profile:{species:g.species||null,archetype:g.archetype||null},degraded:d.degraded,dataSource:v,dataSourceLabel:v==="local-fallback"?"Degraded backend snapshot":v,backendStatus:d,retryGuidance:"Use Refresh mood after the backend companion endpoint recovers.",proactiveSignals:F,onboarding:x,vitals:c,recentSignals:p,recentInteractions:h,highlightCards:L}}function He(e){return e.map(t=>`
        <article class="metric-card">
          <span class="metric-label">${s(t.label||"State")}</span>
          <strong class="metric-value">${s(t.value||"Unknown")}</strong>
        </article>
      `).join("")}function ze(e){return e.map(t=>`<li class="signal-item">${s(t)}</li>`).join("")}function We(e){return e.length?e.map(t=>{const a=t.dueAt?` <span class="signal-time">${s(t.dueAt)}</span>`:"";return`<li class="signal-item"><strong>${s(t.label)}</strong>: ${s(t.detail)}${a}</li>`}).join(""):'<li class="signal-item">No proactive rituals are scheduled yet.</li>'}function Ue(e){const t=e.reduce((a,o)=>(a.all+=1,a[o.kind]=(a[o.kind]||0)+1,a),{all:0,pat:0,feed:0,wake:0,signal:0,fallback:0});return K.map(a=>({kind:a,label:b(a),count:t[a]||0}))}function Ge(e,t){return Ue(e).map((a,o)=>{const i=ce(o);return`
        <button
          class="timeline-filter${a.kind===t?" is-active":""}"
          type="button"
          data-role="timeline-filter"
          data-filter-kind="${s(a.kind)}"
          data-filter-shortcut="${s(i.key)}"
          aria-pressed="${a.kind===t?"true":"false"}"
        >
          <span>${s(a.label)}</span>
          <span class="timeline-filter-shortcut" aria-hidden="true">${s(i.label)}</span>
          <span class="timeline-filter-count">${s(a.count)}</span>
        </button>
      `}).join("")}function Ve(e,t){const a=A(t),o=a==="all"?e:e.filter(i=>i.kind===a);return o.length===0?`
      <div class="timeline-empty" data-role="timeline-empty">
        No ${s(b(a).toLowerCase())} interactions yet.
      </div>
    `:o.map(i=>{const c=xe(i.timestamp),p=b(i.kind);return`
        <article class="interaction-card interaction-card-${s(i.kind)}">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${s(i.title)}</h3>
              <p class="interaction-detail">${s(i.detail)}</p>
            </div>
            <div class="interaction-meta">
              <span class="interaction-kind interaction-kind-${s(i.kind)}">${s(p)}</span>
              <span class="interaction-source">${s(i.source)}</span>
            </div>
          </div>
          <time
            class="interaction-time"
            ${c.machine?`datetime="${s(c.machine)}"`:""}
            ${c.exact?`title="${s(c.exact)}"`:""}
          >${s(c.label)}</time>
        </article>
      `}).join("")}function Je(e){if(!e.degraded)return"";const t=[e.backendStatus.endpoint,e.backendStatus.legacyEndpoint].filter(Boolean).join(" -> ");return`
    <section class="panel panel-degraded" aria-live="polite">
      <p class="section-label">Degraded mode</p>
      <h2>Backend companion state unavailable</h2>
      <p class="panel-copy">
        Showing a labeled degraded backend snapshot so the surface remains explorable without pretending the backend is healthy.
      </p>
      <ul class="signal-list">
        <li class="signal-item"><strong>Surface source:</strong> ${s(e.dataSourceLabel)}</li>
        <li class="signal-item"><strong>Backend error:</strong> ${s(e.backendStatus.reason||"backend_unavailable")}</li>
        ${t?`<li class="signal-item"><strong>Attempted endpoints:</strong> ${s(t)}</li>`:""}
        <li class="signal-item"><strong>Retry:</strong> ${s(e.retryGuidance)}</li>
      </ul>
    </section>
  `}function Qe(e){return e.map(t=>`
        <article class="hero-highlight hero-highlight-${s(t.tone)}">
          <span class="hero-highlight-label">${s(t.label)}</span>
          <strong class="hero-highlight-value">${s(t.value)}</strong>
          <p class="hero-highlight-detail">${s(t.detail)}</p>
        </article>
      `).join("")}function Ze(e,t="all"){const a=pe(e),o=A(t);return`
    ${Je(a)}
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
          ${Qe(a.highlightCards)}
        </div>
      </section>

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
            <div>
              <dt>Profile</dt>
              <dd>${s([a.profile.species,a.profile.archetype].filter(Boolean).join(" · ")||"Companion profile")}</dd>
            </div>
            <div>
              <dt>Connection</dt>
              <dd>${s(a.dataSourceLabel)}</dd>
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

      <section class="panel" aria-labelledby="arc-heading">
        <p class="section-label">Pet arc</p>
        <h2 id="arc-heading">${s(a.relationship.level)}</h2>
        <p class="panel-copy">${s(a.relationship.note)}</p>
        <ul class="signal-list">
          <li class="signal-item"><strong>Stage:</strong> ${s(a.progress.progressLabel)}</li>
          <li class="signal-item"><strong>Ritual:</strong> ${s(a.onboarding.title)}</li>
          <li class="signal-item">${s(a.onboarding.detail)}</li>
          ${a.progress.nextMilestone?`<li class="signal-item"><strong>Next milestone:</strong> ${s(a.progress.nextMilestone)}</li>`:""}
        </ul>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${s(a.memoryTitle)}</h2>
        <p class="panel-copy">${s(a.memorySummary)}</p>
        <ul class="signal-list">
          ${ze(a.recentSignals)}
        </ul>
      </section>

      <section class="panel" aria-labelledby="ritual-heading">
        <p class="section-label">Active rituals</p>
        <h2 id="ritual-heading">Proactive signals</h2>
        <ul class="signal-list">
          ${We(a.proactiveSignals)}
        </ul>
      </section>

      <section class="panel panel-history" aria-labelledby="timeline-heading">
        <p class="section-label">Recent interactions</p>
        <h2 id="timeline-heading">Companion timeline</h2>
        <div class="timeline-filter-bar" data-role="timeline-filter-bar">
          ${Ge(a.recentInteractions,o)}
        </div>
        <div class="interaction-list">
          ${Ve(a.recentInteractions,o)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${He(a.vitals)}
        </div>
      </section>
    </div>
  `}function le(e){const t=e instanceof Error?e.message:"Unknown adapter error";return`
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${s(t)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `}function Xe(){return`
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
            ${_e()}
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
  `}const U=Symbol("petCompanionCleanup");async function Ye(e,{adapter:t=X()}={}){if(!e)throw new Error("A target element is required to render the pet companion surface.");typeof e[U]=="function"&&e[U](),e.innerHTML=Xe();const a=e.ownerDocument,o=e.querySelector('[data-role="content"]'),i=e.querySelector('[data-action="refresh"]'),c=e.querySelector('[data-role="adapter-status"]'),p=e.querySelector('[data-role="shortcut-help-toggle"]'),h=e.querySelector('[data-role="shortcut-help"]'),g=e.querySelector('[data-role="shortcut-help-title"]'),d=e.querySelector('[data-role="shortcut-help-close"]'),v=e.querySelector('[data-role="live-region"]'),u=e.querySelector('[data-role="action-note"]'),C=e.querySelector('[data-role="action-note-label"]'),F=e.querySelector('[data-role="action-note-hint"]'),x=e.querySelector('[data-role="action-note-status"]'),N=e.querySelector('[data-role="action-note-status-label"]'),T=e.querySelector('[data-role="action-note-status-detail"]'),w=e.querySelector('[data-role="action-note-clear"]'),L=e.querySelector('[data-role="composer-templates"]'),I=e.querySelector('[data-role="composer-template-actions"]'),l=e.querySelector('[data-role="composer-guide"]'),P=[...e.querySelectorAll('[data-role="action-buttons"] [data-action]')];let y="all",M=null,S=null,m=!1,$="",R=null;function B(n,{degraded:r=!1}={}){c&&(c.textContent=n,c.classList.toggle("is-degraded",r))}function ue(n){return!!(n&&typeof n=="object"&&"tagName"in n&&["INPUT","TEXTAREA","SELECT"].includes(String(n.tagName).toUpperCase()))}function me(n){return!n||typeof n!="object"||!("closest"in n)?null:n.closest('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]')}function G(){P.forEach(n=>{const f=n.getAttribute("data-action")===y;n.classList.toggle("is-linked",f),n.setAttribute("data-filter-linked",f?"true":"false")})}function k(n){const r=String(n??"").trim();!v||!r||($===r&&(v.textContent=""),$=r,v.textContent=r)}function Y(){p&&(p.setAttribute("aria-expanded",m?"true":"false"),p.classList.toggle("is-active",m)),h&&(h.hidden=!m)}function ee(n=!1){const r=[g,d].filter(Boolean),f=n?r[r.length-1]:r[0];f==null||f.focus()}function O(n,r,{moveFocus:f=!1}={}){m=n,Y(),f&&(n?g==null||g.focus():p==null||p.focus()),k(r)}function he(n){return!!(n&&(h!=null&&h.contains(n)||p!=null&&p.contains(n)))}function V(n,{announcement:r}={}){const f=A(n);f!==y&&(D(),y=f,oe(),k(r))}function D(){S=null}function fe(){u.value="",u.focus(),D(),E(),k("Draft cleared.")}function ge(n){if(!S)return;const r=u.value.trim();n==="append"&&r?u.value=`${r}
${S}`:u.value=S,u.focus(),D(),E(),k(`${b(y)} template ${n==="append"?"appended to":"replaced"} draft.`)}function be(n){S=n}const ye={actionNote:u,actionNoteLabel:C,actionNoteHint:F,actionNoteStatus:x,actionNoteStatusLabel:N,actionNoteStatusDetail:T,actionNoteClear:w,composerTemplates:L,composerTemplateActions:I,composerGuide:l};function E(n=!0){const r=Re(y,S),f=n||r!==R;R=r,je({refs:ye,selectedTimelineFilter:y,pendingTemplateValue:S,shouldRebuild:f,clearPendingTemplateAction:D,applyTemplateToDraft:ge,setPendingTemplateValue:be,setTimelineFilter:V,announce:k,syncComposerContext:E})}function z(n){i.disabled=n,P.forEach(r=>{r.disabled=n}),u&&(u.disabled=n)}u==null||u.addEventListener("input",()=>{S&&D(),E(!1)}),w==null||w.addEventListener("click",()=>{fe()}),p==null||p.addEventListener("click",()=>{O(!m,`Shortcut help ${m?"closed":"opened"}.`,{moveFocus:!0})}),d==null||d.addEventListener("click",()=>{O(!1,"Shortcut help closed.",{moveFocus:!0})});function te(n){if(!m||he(n.target))return;const r=me(n.target),f=!!(h!=null&&h.contains(a.activeElement));O(!1,"Shortcut help closed.",{moveFocus:!r&&f})}function ae(n){var se;if(n.key==="Escape"&&S){n.preventDefault(),D(),E(),k("Template merge cancelled.");return}if(n.key==="Escape"&&m){n.preventDefault(),O(!1,"Shortcut help closed.",{moveFocus:!0});return}if(n.key==="Tab"&&m){const _=[g,d].filter(Boolean);if(!_.length)return;const ve=e.ownerDocument.activeElement,J=_.indexOf(ve);if(J===-1){n.preventDefault(),n.shiftKey?ee(!0):ee();return}const Se=n.shiftKey?(J-1+_.length)%_.length:(J+1)%_.length;n.preventDefault(),(se=_[Se])==null||se.focus();return}if(n.key==="?"&&!ue(n.target)){n.preventDefault(),O(!m,`Shortcut help ${m?"closed":"opened"}.`,{moveFocus:!0});return}if(!n.altKey||n.ctrlKey||n.metaKey||n.shiftKey)return;const r=Number.parseInt(n.key,10)-1;if(Number.isNaN(r)||r<0||r>=K.length)return;n.preventDefault();const f=K[r];V(f,{announcement:`Timeline filter set to ${b(f)}.`})}a.addEventListener("click",te),a.addEventListener("keydown",ae);async function ne(n){if(!n)return;if(S){k("Resolve template merge before sending.");return}if(typeof t.performAction!="function"){B("Adapter: action unavailable"),k(`${b(n)} action is unavailable in the current adapter.`);return}const r=typeof(u==null?void 0:u.value)=="string"?u.value.trim():"";z(!0),B(`Adapter: sending ${n}`),k(`Sending ${b(n)} action.`);try{await t.performAction(n,r||void 0),D(),y=A(n),u&&(u.value=""),await W(),k(`${b(n)} action sent.`)}catch(f){o.innerHTML=le(f),B("Adapter: action failed",{degraded:!0}),z(!1),k(`${b(n)} action failed.`)}}u==null||u.addEventListener("keydown",n=>{if(n.key==="Escape"&&S){n.preventDefault(),D(),E(),k("Template merge cancelled.");return}if(n.key==="Enter"&&(n.ctrlKey||n.metaKey)&&!H(y)){n.preventDefault(),k(Me(y));return}n.key==="Enter"&&(n.ctrlKey||n.metaKey)&&H(y)&&(n.preventDefault(),ne(y))});function oe(){if(!M){G(),E();return}o.innerHTML=Ze(M,y),G(),E(),[...o.querySelectorAll('[data-role="timeline-filter"]')].forEach(r=>{r.addEventListener("click",()=>{const f=A(r.getAttribute("data-filter-kind"));V(f,{announcement:`Timeline filter set to ${b(f)}.`})})})}async function W(){z(!0),i.textContent="Refreshing...",B("Adapter: syncing companion state"),k();try{const n=await t.getCompanionState(),r=pe(n);M=r,oe(),B(`Adapter: ${r.adapterLabel}`,{degraded:r.degraded})}catch(n){M=null,o.innerHTML=le(n),B("Adapter: degraded",{degraded:!0})}finally{z(!1),i.textContent="Refresh mood"}}for(const n of P)n.addEventListener("click",async()=>{const r=n.getAttribute("data-action");await ne(r)});i.addEventListener("click",()=>{W()});function ie(){a.removeEventListener("click",te),a.removeEventListener("keydown",ae),delete e[U]}return e[U]=ie,G(),Y(),E(),await W(),{destroy:ie,reload:W}}const Z=document.getElementById("app");Z&&Ye(Z,{adapter:Ee()}).catch(e=>{Z.innerHTML=`
      <main class="companion-shell" data-surface="pet-companion">
        <section class="panel panel-error">
          <p class="section-label">Bootstrap error</p>
          <h1>Surface failed to start</h1>
          <p class="panel-copy">${e instanceof Error?e.message:"Unknown startup error"}</p>
        </section>
      </main>
    `});
