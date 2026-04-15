(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))l(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const n of r.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&l(n)}).observe(document,{childList:!0,subtree:!0});function i(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function l(s){if(s.ep)return;s.ep=!0;const r=i(s);fetch(s.href,r)}})();function Gt(e,t,i){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof i=="string"&&i.trim()?i.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function Bt(){return(window.__ADMIN_API_KEY__||"").trim()}async function h(e,t={}){const i=Bt(),l=new Headers(t.headers||{});i&&l.set("x-api-key",i);const s=await fetch(e,{...t,headers:l}),r=await s.json().catch(()=>({}));if(!s.ok){const n=(r==null?void 0:r.detail)||(r==null?void 0:r.error);throw new Error(Gt(n,s.status,s.statusText))}return r}async function mt(e,t){const i=Bt(),l=new Headers;i&&l.set("x-api-key",i);const s=await fetch(e,{headers:l});if(!s.ok)throw new Error("download_failed");const r=await s.blob(),n=URL.createObjectURL(r),c=document.createElement("a");c.href=n,c.download=t,document.body.appendChild(c),c.click(),document.body.removeChild(c),URL.revokeObjectURL(n)}function T(e){const t=new URLSearchParams;for(const[l,s]of Object.entries(e))s!=null&&s!==""&&t.set(l,String(s));const i=t.toString();return i?`?${i}`:""}function P(){return{getOverview(){return h("/api/admin/overview")},getMetricsOverview(){return h("/api/admin/metrics/overview")},getPetOverview(){return h("/api/admin/pet/overview")},recordPetAction(e,t){return h("/api/admin/pet/actions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:e,note:t})})},getPlatformConnections(){return h("/api/admin/platforms")},setPlatformConnectionControl(e,t){return h(`/api/admin/platforms/${encodeURIComponent(e)}/control`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:t})})},getObservabilitySummary({windowMinutes:e,window_minutes:t}={}){return h(`/api/admin/observability/summary${T({window_minutes:e??t})}`)},getJobs({status:e,limit:t}={}){return h(`/api/admin/jobs${T({status:e,limit:t})}`)},getJob(e){return h(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return h(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return h(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return h("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return h("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return mt(`/export/jobs.csv${T({status:e,limit:t})}`,"jobs.csv")},getComments({limit:e,offset:t}={}){return h(`/comments${T({limit:e,offset:t})}`)},getComment(e){return h(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,commentId:t,comment_id:i}={}){return h(`/api/admin/gateway/logs${T({limit:e,comment_id:t??i})}`)},getGatewayPublishLogs({limit:e,offset:t,status:i}={}){return h(`/gateway/publish-logs${T({limit:e,offset:t,status:i})}`)},publishGatewayReply(e){return h("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:i}={}){return h(`/api/admin/audit/summary${T({days:e,action:t,ok:i})}`)},getAuditLogs({limit:e,action:t,ok:i}={}){return h(`/api/audit-log${T({limit:e,action:t,ok:i})}`)},exportAuditCsv({limit:e,action:t,ok:i}={}){return mt(`/export/audit-logs.csv${T({limit:e,action:t,ok:i})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return h(`/api/metrics/daily${T({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return h(`/api/admin/knowledge${T({limit:e,offset:t})}`)},createKnowledgeEntry(e){return h("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return h(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getMemorySpaces({limit:e,offset:t,space_type:i,subject_type:l,subject_id:s}={}){return h(`/api/admin/memory/spaces${T({limit:e,offset:t,space_type:i,subject_type:l,subject_id:s})}`)},createMemorySpace(e){return h("/api/admin/memory/spaces",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getMemoryItems({limit:e,offset:t,space_id:i,item_key:l,content_type:s,source:r}={}){return h(`/api/admin/memory/items${T({limit:e,offset:t,space_id:i,item_key:l,content_type:s,source:r})}`)},upsertMemoryItem(e){return h("/api/admin/memory/items",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getMemoryGrants({limit:e,offset:t,space_id:i,subject_type:l,subject_id:s}={}){return h(`/api/admin/memory/grants${T({limit:e,offset:t,space_id:i,subject_type:l,subject_id:s})}`)},grantMemorySpaceAccess(e){return h("/api/admin/memory/grants",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getMemoryIdentityLinks({limit:e,offset:t,subject_type:i,subject_id:l,platform:s,external_id:r}={}){return h(`/api/admin/memory/identity-links${T({limit:e,offset:t,subject_type:i,subject_id:l,platform:s,external_id:r})}`)},linkMemoryIdentity(e){return h("/api/admin/memory/identity-links",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getRoleCards({limit:e,offset:t}={}){return h(`/api/admin/role-cards${T({limit:e,offset:t})}`)},createRoleCard(e){return h("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return h(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return h(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return h(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return h("/api/admin/style-profile")},setStyleProfile(e){return h("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return h("/api/admin/role-profile")},setRoleProfile(e){return h("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return h("/api/admin/bilibili/status")},getReadinessStatus(){return h("/readiness")},getBilibiliVideos({poll_enabled:e,limit:t,offset:i}={}){return h(`/api/admin/bilibili/videos${T({poll_enabled:e,limit:t,offset:i})}`)},addBilibiliVideo(e){return h("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return h(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return h(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return h(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return h("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return h("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return h("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return h(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return h(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function a(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function U(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function ut(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const i=Date.now()-t.getTime(),l=Math.floor(i/1e3);if(l<60)return"刚刚";const s=Math.floor(l/60);if(s<60)return`${s}分钟前`;const r=Math.floor(s/60);if(r<24)return`${r}小时前`;const n=Math.floor(r/24);if(n<30)return`${n}天前`;const c=Math.floor(n/30);return c<12?`${c}个月前`:`${Math.floor(c/12)}年前`}catch{return""}}function R(e){const t=ut(e),i=U(e);return t?`<span title="${a(i)}">${a(t)}</span>`:`<span title="${a(i)}">${a(i)}</span>`}function W(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const Yt={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function Ne(e){if(!e)return"";const t=Yt[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${a(t.label)}</span>`}function pt(e,t="是",i="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${a(e?t:i)}</span>`}let Qe=null;function f(e,t="info"){const i=document.getElementById("app-toast");i&&i.remove(),Qe&&clearTimeout(Qe);const l={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},s=document.createElement("div");s.id="app-toast",s.className="toast-notification",s.style.setProperty("--toast-color",l[t]||l.info),s.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(s),requestAnimationFrame(()=>s.classList.add("show"));const r=()=>{s.classList.remove("show"),setTimeout(()=>s.remove(),300)};s.querySelector(".toast-close").onclick=r,Qe=setTimeout(r,4e3)}const se=P(),Qt=[{label:"LLM 提供方",keys:["llm_provider","llmProvider"]},{label:"搜索提供方",keys:["search_provider","searchProvider"]},{label:"发布模式",keys:["publisher_mode","publisherMode"]},{label:"LLM Key",keys:["llm_api_key_configured","llmApiKeyConfigured"],format:"configured"},{label:"搜索 Key",keys:["search_api_key_configured","searchApiKeyConfigured"],format:"configured"},{label:"Webhook",keys:["publisher_webhook_url_configured","publisherWebhookUrlConfigured"],format:"configured"},{label:"B站采集",keys:["bilibili_enabled","bilibiliEnabled"],format:"enabled"},{label:"B站发布",keys:["bilibili_publish_enabled","bilibiliPublishEnabled"],format:"enabled"},{label:"Kill Switch",keys:["kill_switch","killSwitch"],format:"enabled"}],Zt=[{label:"基础就绪",keys:["foundation_ready"],format:"ready"},{label:"交付就绪",keys:["delivery_ready"],format:"ready"},{label:"基础阻塞",keys:["foundation_blockers"],format:"count"},{label:"交付阻塞",keys:["delivery_blockers"],format:"count"},{label:"能力阻塞",keys:["delivery_capability_blockers"],format:"count"}];function jt(e,t){for(const i of t)if((e==null?void 0:e[i])!==void 0&&(e==null?void 0:e[i])!==null&&(e==null?void 0:e[i])!=="")return e[i]}function It(e,t){return t==="configured"?e?"已配置":"未配置":t==="enabled"?e?"开启":"关闭":t==="ready"?e?"就绪":"阻塞":t==="count"?Array.isArray(e)?`${e.length} 项`:String(e??"0"):typeof e=="boolean"?e?"是":"否":String(e)}function Xt(e){return Qt.map(t=>{const i=jt(e,t.keys);return i===void 0?null:{label:t.label,value:It(i,t.format)}}).filter(Boolean)}function ei(e){var i,l;const t=((i=e==null?void 0:e.bilibili_diagnostics)==null?void 0:i.effective_publish_mode)??((l=e==null?void 0:e.delivery_signals)==null?void 0:l.effective_publish_mode)??(e==null?void 0:e.effective_publish_mode);return typeof t=="string"&&t.trim()?t.trim():""}function ti(e){if(!e||typeof e!="object"||Array.isArray(e))return[];const t=Zt.map(l=>{const s=jt(e,l.keys);return s===void 0?null:{label:l.label,value:It(s,l.format)}}).filter(Boolean),i=ei(e);return i&&t.unshift({label:"发布模式",value:i}),t}function ft(e){return String(e).replace(/([a-z0-9])([A-Z])/g,"$1 $2").replace(/[._]/g," ").replace(/\s+/g," ").trim()}function Pt(e,t=""){if(!e||typeof e!="object"||Array.isArray(e))return[];const i=[];for(const[l,s]of Object.entries(e)){const r=t?`${t}.${l}`:l;if(!(s==null||s==="")){if(typeof s=="object"&&!Array.isArray(s)){i.push(...Pt(s,r));continue}if(Array.isArray(s)){s.length>0&&i.push({label:ft(r),value:`${s.length} 项`});continue}i.push({label:ft(r),value:String(s)})}}return i}function gt(e,t){return e.length?`
    <div class="audit-summary-grid">
      ${e.map(i=>`
        <div class="stat-card mini">
          <div class="stat-label">${a(i.label)}</div>
          <div class="stat-value">${a(i.value)}</div>
        </div>
      `).join("")}
    </div>
  `:`<div class="table-empty" style="padding:16px;">${a(t)}</div>`}async function Nt(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,i,l,s,r,n,c]=await Promise.all([se.getOverview().catch(()=>null),se.getJobs({limit:5}).catch(()=>null),se.getGatewayLogs({limit:5}).catch(()=>null),se.getAuditSummary({days:7}).catch(()=>null),se.getMetricsOverview().catch(()=>null),se.getObservabilitySummary({windowMinutes:120}).catch(()=>null),se.getReadinessStatus().catch(()=>null)]),o=t||{},p=Array.isArray(i==null?void 0:i.items)?i.items:[],u=Array.isArray(l==null?void 0:l.items)?l.items:[],v=(()=>{const g=Xt(r||{});return g.length>0?g:ti(c||{})})(),m=Pt((n==null?void 0:n.summary)||n||{}).slice(0,6),$=n!=null&&n.ok?"当前窗口暂无可观测数据":"未返回可观测性摘要";e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${W(o.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${W(o.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${W(o.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${W(o.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${W(o.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${W(u.length)}</div>
        </div>
      </div>

      <div class="section-grid">
        <div class="section-card">
          <div class="section-card-header">
            <h3>最近任务</h3>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr>
                <th>ID</th><th>状态</th><th>评论摘要</th><th>时间</th>
              </tr></thead>
              <tbody>
                ${p.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':p.map(g=>{var b,y;return`<tr>
                    <td class="cell-id">${a((b=g.id)==null?void 0:b.substring(0,8))}</td>
                    <td>${Ne(g.status)}</td>
                    <td class="cell-truncate">${a((y=g.comment_text)==null?void 0:y.substring(0,60))}</td>
                    <td class="cell-time">${a(U(g.created_at))}</td>
                  </tr>`}).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-header">
            <h3>审计摘要 (7天)</h3>
          </div>
          <div class="audit-summary-grid">
            <div class="stat-card mini">
              <div class="stat-label">总操作</div>
              <div class="stat-value">${W(s==null?void 0:s.total)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">成功</div>
              <div class="stat-value" style="color:var(--success-color)">${W(s==null?void 0:s.ok_count)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">失败</div>
              <div class="stat-value" style="color:var(--danger-color)">${W(s==null?void 0:s.failed_count)}</div>
            </div>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-header">
            <h3>运行时能力</h3>
          </div>
          ${gt(v,"未返回运行时配置摘要")}
        </div>

        <div class="section-card">
          <div class="section-card-header">
            <h3>可观测性摘要 (120分钟)</h3>
          </div>
          ${gt(m,$)}
        </div>
      </div>
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{f("正在刷新...","info"),Nt(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${a(t.message)}</div>`}}const fe=P();async function ii(e){let t=new Set;e.innerHTML=`
    <div class="page-header">
      <h2>任务管理</h2>
      <div class="page-actions">
        <button class="btn" id="jobs-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
        <button class="btn" id="jobs-export"><svg width="14" height="14"><use href="#icon-download"></use></svg> 导出 CSV</button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label class="form-label" for="jobs-status">状态</label>
        <select id="jobs-status" class="form-input">
          <option value="">全部</option>
          <option value="queued">排队中</option>
          <option value="pending_review">待审核</option>
          <option value="approved">已审批</option>
          <option value="published">已发布</option>
          <option value="failed">失败</option>
          <option value="skipped">已跳过</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="jobs-limit">数量</label>
        <input type="number" id="jobs-limit" class="form-input" value="20" min="1" max="200" />
      </div>
      <div class="form-group">
        <button class="btn btn-primary" id="jobs-filter-btn">查询</button>
      </div>
    </div>

    <div class="batch-bar" id="jobs-batch-bar" style="display:none;">
      <span id="jobs-selected-count">已选 0 项</span>
      <button class="btn" id="jobs-batch-approve">批量审批</button>
      <button class="btn" id="jobs-batch-retry">批量重试</button>
    </div>

    <div class="table-wrapper" id="jobs-table-wrapper">
      <div class="page-loading">加载中...</div>
    </div>
  `;const i=e.querySelector("#jobs-status"),l=e.querySelector("#jobs-limit");async function s(){var c;t.clear(),r();const n=e.querySelector("#jobs-table-wrapper");n.innerHTML='<div class="page-loading">加载中...</div>';try{const o=await fe.getJobs({status:i.value,limit:l.value}),p=Array.isArray(o==null?void 0:o.items)?o.items:[];if(p.length===0){n.innerHTML='<div class="table-empty">暂无任务</div>';return}n.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${p.map(u=>{var v,m,$,g;return`
              <tr data-id="${a(u.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${a(u.id)}" /></td>
                <td class="cell-id" title="${a(u.id)}">${a((v=u.id)==null?void 0:v.substring(0,8))}</td>
                <td>${Ne(u.status)}</td>
                <td class="cell-truncate" title="${a(u.comment_text)}">${a((m=u.comment_text)==null?void 0:m.substring(0,80))}</td>
                <td class="cell-truncate">${a(($=u.reply_text)==null?void 0:$.substring(0,60))}</td>
                <td>${(g=u.risk_flags)!=null&&g.length?u.risk_flags.map(b=>`<span class="risk-flag">${a(b)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${R(u.created_at)}</td>
                <td class="cell-actions">
                  ${u.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${a(u.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${a(u.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(c=n.querySelector("#jobs-select-all"))==null||c.addEventListener("change",u=>{const v=u.target.checked;n.querySelectorAll(".job-checkbox").forEach(m=>{m.checked=v,v?t.add(m.dataset.id):t.delete(m.dataset.id)}),r()}),n.querySelectorAll(".job-checkbox").forEach(u=>{u.addEventListener("change",()=>{u.checked?t.add(u.dataset.id):t.delete(u.dataset.id),r()})}),n.querySelectorAll(".job-approve").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="审批中...";try{await fe.approveJob(u.dataset.id),f("审批成功","success"),s()}catch(v){f(`审批失败: ${v.message}`,"error"),u.disabled=!1,u.textContent="审批"}})}),n.querySelectorAll(".job-retry").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="重试中...";try{await fe.retryJob(u.dataset.id),f("重试已提交","success"),s()}catch(v){f(`重试失败: ${v.message}`,"error"),u.disabled=!1,u.textContent="重试"}})})}catch(o){n.innerHTML=`<div class="page-error">加载失败: ${a(o.message)}</div>`}}function r(){const n=e.querySelector("#jobs-batch-bar"),c=e.querySelector("#jobs-selected-count");t.size>0?(n.style.display="flex",c.textContent=`已选 ${t.size} 项`):n.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",s),e.querySelector("#jobs-refresh").addEventListener("click",s),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await fe.exportJobsCsv({status:i.value,limit:l.value}),f("导出成功","success")}catch(n){f(`导出失败: ${n.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await fe.batchApprove([...t]),f(`批量审批 ${t.size} 项成功`,"success"),s()}catch(n){f(`批量审批失败: ${n.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await fe.batchRetry([...t]),f(`批量重试 ${t.size} 项成功`,"success"),s()}catch(n){f(`批量重试失败: ${n.message}`,"error")}}),await s()}const ri=P();async function li(e){e.innerHTML=`
    <div class="page-header">
      <h2>每日指标</h2>
      <div class="page-actions">
        <div class="form-group" style="margin:0;">
          <label class="form-label" for="metrics-days">天数</label>
          <input type="number" id="metrics-days" class="form-input" value="30" min="1" max="365" />
        </div>
        <button class="btn btn-secondary" id="metrics-days-7">近7天</button>
        <button class="btn btn-secondary" id="metrics-days-30">近30天</button>
        <button class="btn btn-secondary" id="metrics-days-90">近90天</button>
        <button class="btn btn-primary" id="metrics-load">查询</button>
      </div>
    </div>
    <div id="metrics-summary" class="form-hint" style="margin-bottom:10px;"></div>
    <div class="table-wrapper" id="metrics-table-wrapper">
      <div class="page-loading">加载中...</div>
    </div>
  `;const t=e.querySelector("#metrics-days"),i=e.querySelector("#metrics-summary"),l=e.querySelector("#metrics-table-wrapper");function s(n){const c=Number.parseInt(String(n).trim(),10);return!Number.isFinite(c)||c<1?{value:1,warning:"天数必须在 1-365 之间，已自动调整为 1"}:c>365?{value:365,warning:"最大支持 365 天，已自动调整为 365"}:{value:c,warning:""}}async function r(){const n=s(t.value);t.value=String(n.value),n.warning&&f(n.warning,"warning"),l.innerHTML='<div class="page-loading">加载中...</div>',i.textContent="";try{const c=await ri.getDailyMetrics({days:String(n.value)}),o=Array.isArray(c==null?void 0:c.items)?c.items:Array.isArray(c)?c:[];if(o.length===0){i.textContent=`最近 ${n.value} 天暂无可展示指标`,l.innerHTML='<div class="table-empty">暂无指标数据</div>';return}const p=o.reduce((u,v)=>(u.comments+=Number(v.comments??v.comment_count??0)||0,u.jobs+=Number(v.jobs??v.job_count??0)||0,u.published+=Number(v.published??v.published_count??0)||0,u.failed+=Number(v.failed??v.failed_count??0)||0,u.skipped+=Number(v.skipped??v.skipped_count??0)||0,u),{comments:0,jobs:0,published:0,failed:0,skipped:0});i.textContent=`最近 ${n.value} 天合计：评论 ${p.comments}，任务 ${p.jobs}，已发布 ${p.published}，失败 ${p.failed}，跳过 ${p.skipped}`,l.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${o.map(u=>`<tr>
              <td class="cell-time">${a(u.date||u.day)}</td>
              <td>${a(u.comments??u.comment_count??0)}</td>
              <td>${a(u.jobs??u.job_count??0)}</td>
              <td style="color:var(--success-color)">${a(u.published??u.published_count??0)}</td>
              <td style="color:var(--danger-color)">${a(u.failed??u.failed_count??0)}</td>
              <td>${a(u.skipped??u.skipped_count??0)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      `}catch(c){i.textContent="",l.innerHTML=`<div class="page-error">加载失败: ${a(c.message)}</div>`,f(`加载每日指标失败: ${c.message}`,"error")}}e.querySelector("#metrics-days-7").addEventListener("click",async()=>{t.value="7",await r()}),e.querySelector("#metrics-days-30").addEventListener("click",async()=>{t.value="30",await r()}),e.querySelector("#metrics-days-90").addEventListener("click",async()=>{t.value="90",await r()}),t.addEventListener("keydown",async n=>{n.key==="Enter"&&await r()}),e.querySelector("#metrics-load").addEventListener("click",r),await r()}const Ze=P();async function si(e){e.innerHTML=`
    <div class="page-header">
      <h2>知识库</h2>
      <button class="btn" id="knowledge-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
    </div>

    <div class="form-card">
      <h3>新增条目</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="knowledge-category">分类</label>
          <input type="text" id="knowledge-category" class="form-input" placeholder="例: personality" />
        </div>
        <div class="form-group">
          <label class="form-label" for="knowledge-title">标题</label>
          <input type="text" id="knowledge-title" class="form-input" placeholder="条目标题" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="knowledge-content">内容</label>
        <textarea id="knowledge-content" class="form-input form-textarea" rows="3" placeholder="知识内容"></textarea>
      </div>
      <button class="btn btn-primary" id="knowledge-create">创建</button>
    </div>

    <div class="table-wrapper" id="knowledge-table-wrapper">
      <div class="page-loading">加载中...</div>
    </div>
  `;async function t(){const i=e.querySelector("#knowledge-table-wrapper");i.innerHTML='<div class="page-loading">加载中...</div>';try{const l=await Ze.getKnowledgeEntries({limit:50}),s=Array.isArray(l==null?void 0:l.items)?l.items:[];if(s.length===0){i.innerHTML='<div class="table-empty">暂无知识条目</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${s.map(r=>{var n,c;return`<tr>
              <td class="cell-id">${a((n=r.id)==null?void 0:n.toString().substring(0,8))}</td>
              <td>${a(r.category)}</td>
              <td>${a(r.title)}</td>
              <td class="cell-truncate">${a((c=r.content)==null?void 0:c.substring(0,80))}</td>
              <td>${pt(r.enabled!==!1)}</td>
              <td class="cell-time">${R(r.created_at)}</td>
              <td class="cell-actions">
                ${r.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${a(r.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".knowledge-disable").forEach(r=>{r.addEventListener("click",async()=>{try{await Ze.disableKnowledgeEntry(r.dataset.id),f("已禁用","success"),t()}catch(n){f(`操作失败: ${n.message}`,"error")}})})}catch(l){i.innerHTML=`<div class="page-error">加载失败: ${a(l.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const i=e.querySelector("#knowledge-category").value.trim(),l=e.querySelector("#knowledge-title").value.trim(),s=e.querySelector("#knowledge-content").value.trim();if(!i||!l||!s){f("分类、标题和内容不能为空","warning");return}try{await Ze.createKnowledgeEntry({category:i,title:l,content:s}),f("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(r){f(`创建失败: ${r.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const Z=P();function ht(e){return['<option value="">选择空间</option>'].concat(e.map(t=>`<option value="${a(t.id)}">${a(t.title)} (${a(t.space_key)})</option>`)).join("")}function ai(e){return e.length?`
    <table class="data-table">
      <thead><tr>
        <th>ID</th><th>Space Key</th><th>类型</th><th>标题</th><th>摘要</th><th>更新时间</th>
      </tr></thead>
      <tbody>
        ${e.map(t=>`<tr>
              <td class="cell-id">${a(String(t.id))}</td>
              <td>${a(t.space_key)}</td>
              <td>${a(t.space_type)}</td>
              <td>${a(t.title)}</td>
              <td class="cell-truncate">${a((t.summary||"").substring(0,80))}</td>
              <td class="cell-time">${R(t.updated_at)}</td>
            </tr>`).join("")}
      </tbody>
    </table>
  `:'<div class="table-empty">暂无 memory spaces</div>'}function ni(e){return e.length?`
    <table class="data-table">
      <thead><tr>
        <th>ID</th><th>Space ID</th><th>主体类型</th><th>主体 ID</th><th>权限</th><th>更新时间</th>
      </tr></thead>
      <tbody>
        ${e.map(t=>`<tr>
              <td class="cell-id">${a(String(t.id))}</td>
              <td>${a(String(t.space_id))}</td>
              <td>${a(t.subject_type)}</td>
              <td>${a(t.subject_id)}</td>
              <td>${a(t.access_level)}</td>
              <td class="cell-time">${R(t.updated_at)}</td>
            </tr>`).join("")}
      </tbody>
    </table>
  `:'<div class="table-empty">暂无 grants</div>'}function oi(e){return e.length?`
    <table class="data-table">
      <thead><tr>
        <th>ID</th><th>Space ID</th><th>Item Key</th><th>类型</th><th>来源</th><th>内容</th><th>更新时间</th>
      </tr></thead>
      <tbody>
        ${e.map(t=>`<tr>
              <td class="cell-id">${a(String(t.id))}</td>
              <td>${a(String(t.space_id))}</td>
              <td>${a(t.item_key)}</td>
              <td>${a(t.content_type)}</td>
              <td>${a(t.source)}</td>
              <td class="cell-truncate">${a((t.content||"").substring(0,100))}</td>
              <td class="cell-time">${R(t.updated_at)}</td>
            </tr>`).join("")}
      </tbody>
    </table>
  `:'<div class="table-empty">暂无 memory items</div>'}function di(e){return e.length?`
    <table class="data-table">
      <thead><tr>
        <th>ID</th><th>主体类型</th><th>主体 ID</th><th>平台</th><th>外部 ID</th><th>显示名</th><th>更新时间</th>
      </tr></thead>
      <tbody>
        ${e.map(t=>`<tr>
              <td class="cell-id">${a(String(t.id))}</td>
              <td>${a(t.subject_type)}</td>
              <td>${a(t.subject_id)}</td>
              <td>${a(t.platform)}</td>
              <td>${a(t.external_id)}</td>
              <td>${a(t.display_name||"")}</td>
              <td class="cell-time">${R(t.updated_at)}</td>
            </tr>`).join("")}
      </tbody>
    </table>
  `:'<div class="table-empty">暂无 identity links</div>'}async function ci(e){e.innerHTML=`
    <div class="page-header">
      <h2>Memory 管理</h2>
      <button class="btn" id="memory-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
    </div>

    <div class="form-card">
      <h3>新增 Space</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-space-key">Space Key</label>
          <input type="text" id="memory-space-key" class="form-input" placeholder="operator:alpha" />
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-space-type">类型</label>
          <input type="text" id="memory-space-type" class="form-input" value="operator" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-space-title">标题</label>
          <input type="text" id="memory-space-title" class="form-input" placeholder="Alpha Operator" />
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-space-summary">摘要</label>
          <input type="text" id="memory-space-summary" class="form-input" placeholder="简短描述" />
        </div>
      </div>
      <button class="btn btn-primary" id="memory-space-create">创建 Space</button>
    </div>

    <div class="form-card">
      <h3>新增 / 更新 Item</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-item-space">Space</label>
          <select id="memory-item-space" class="form-input"><option value="">选择空间</option></select>
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-item-key">Item Key</label>
          <input type="text" id="memory-item-key" class="form-input" placeholder="status:latest" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-item-type">类型</label>
          <input type="text" id="memory-item-type" class="form-input" value="note" />
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-item-source">来源</label>
          <input type="text" id="memory-item-source" class="form-input" value="operator" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="memory-item-content">内容</label>
        <textarea id="memory-item-content" class="form-input form-textarea" rows="3" placeholder="记忆内容"></textarea>
      </div>
      <button class="btn btn-primary" id="memory-item-create">保存 Item</button>
    </div>

    <div class="form-card">
      <h3>新增 Grant</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-grant-space">Space</label>
          <select id="memory-grant-space" class="form-input"><option value="">选择空间</option></select>
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-grant-access">权限</label>
          <input type="text" id="memory-grant-access" class="form-input" value="read" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-grant-subject-type">主体类型</label>
          <input type="text" id="memory-grant-subject-type" class="form-input" value="operator" />
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-grant-subject-id">主体 ID</label>
          <input type="text" id="memory-grant-subject-id" class="form-input" placeholder="alice" />
        </div>
      </div>
      <button class="btn btn-primary" id="memory-grant-create">创建 Grant</button>
    </div>

    <div class="form-card">
      <h3>新增 Identity Link</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-link-subject-type">主体类型</label>
          <input type="text" id="memory-link-subject-type" class="form-input" value="operator" />
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-link-subject-id">主体 ID</label>
          <input type="text" id="memory-link-subject-id" class="form-input" placeholder="alice" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-link-platform">平台</label>
          <input type="text" id="memory-link-platform" class="form-input" value="bilibili" />
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-link-external-id">外部 ID</label>
          <input type="text" id="memory-link-external-id" class="form-input" placeholder="uid-42" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="memory-link-display-name">显示名</label>
        <input type="text" id="memory-link-display-name" class="form-input" placeholder="Alice" />
      </div>
      <button class="btn btn-primary" id="memory-link-create">创建 Link</button>
    </div>

    <div class="section-grid">
      <div class="section-card">
        <div class="section-card-header"><h3>Spaces</h3></div>
        <div class="table-wrapper" id="memory-spaces-wrapper"><div class="page-loading">加载中...</div></div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>Items</h3></div>
        <div class="table-wrapper" id="memory-items-wrapper"><div class="page-loading">加载中...</div></div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>Grants</h3></div>
        <div class="table-wrapper" id="memory-grants-wrapper"><div class="page-loading">加载中...</div></div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>Identity Links</h3></div>
        <div class="table-wrapper" id="memory-links-wrapper"><div class="page-loading">加载中...</div></div>
      </div>
    </div>
  `;async function t(){const[l,s,r,n]=await Promise.all([Z.getMemorySpaces({limit:50}),Z.getMemoryItems({limit:50}),Z.getMemoryGrants({limit:50}),Z.getMemoryIdentityLinks({limit:50})]),c=Array.isArray(l==null?void 0:l.items)?l.items:[],o=Array.isArray(s==null?void 0:s.items)?s.items:[],p=Array.isArray(r==null?void 0:r.items)?r.items:[],u=Array.isArray(n==null?void 0:n.items)?n.items:[];e.querySelector("#memory-spaces-wrapper").innerHTML=ai(c),e.querySelector("#memory-items-wrapper").innerHTML=oi(o),e.querySelector("#memory-grants-wrapper").innerHTML=ni(p),e.querySelector("#memory-links-wrapper").innerHTML=di(u),e.querySelector("#memory-grant-space").innerHTML=ht(c),e.querySelector("#memory-item-space").innerHTML=ht(c)}async function i(){try{await t()}catch(l){const s=a(l.message||"未知错误");e.querySelector("#memory-spaces-wrapper").innerHTML=`<div class="page-error">加载失败: ${s}</div>`,e.querySelector("#memory-items-wrapper").innerHTML=`<div class="page-error">加载失败: ${s}</div>`,e.querySelector("#memory-grants-wrapper").innerHTML=`<div class="page-error">加载失败: ${s}</div>`,e.querySelector("#memory-links-wrapper").innerHTML=`<div class="page-error">加载失败: ${s}</div>`}}e.querySelector("#memory-space-create").addEventListener("click",async()=>{const l=e.querySelector("#memory-space-key").value.trim(),s=e.querySelector("#memory-space-type").value.trim(),r=e.querySelector("#memory-space-title").value.trim(),n=e.querySelector("#memory-space-summary").value.trim();if(!l||!r){f("Space Key 和标题不能为空","warning");return}try{await Z.createMemorySpace({space_key:l,space_type:s,title:r,summary:n}),f("Space 创建成功","success"),e.querySelector("#memory-space-key").value="",e.querySelector("#memory-space-title").value="",e.querySelector("#memory-space-summary").value="",await i()}catch(c){f(`创建失败: ${c.message}`,"error")}}),e.querySelector("#memory-item-create").addEventListener("click",async()=>{const l=e.querySelector("#memory-item-space").value,s=e.querySelector("#memory-item-key").value.trim(),r=e.querySelector("#memory-item-type").value.trim(),n=e.querySelector("#memory-item-source").value.trim(),c=e.querySelector("#memory-item-content").value.trim();if(!l||!s||!c){f("Space、Item Key 和内容不能为空","warning");return}try{await Z.upsertMemoryItem({space_id:Number(l),item_key:s,content:c,content_type:r,source:n}),f("Item 保存成功","success"),e.querySelector("#memory-item-key").value="",e.querySelector("#memory-item-content").value="",await i()}catch(o){f(`保存失败: ${o.message}`,"error")}}),e.querySelector("#memory-grant-create").addEventListener("click",async()=>{const l=e.querySelector("#memory-grant-space").value,s=e.querySelector("#memory-grant-subject-type").value.trim(),r=e.querySelector("#memory-grant-subject-id").value.trim(),n=e.querySelector("#memory-grant-access").value.trim();if(!l||!s||!r){f("Space、主体类型和主体 ID 不能为空","warning");return}try{await Z.grantMemorySpaceAccess({space_id:Number(l),subject_type:s,subject_id:r,access_level:n}),f("Grant 创建成功","success"),e.querySelector("#memory-grant-subject-id").value="",await i()}catch(c){f(`创建失败: ${c.message}`,"error")}}),e.querySelector("#memory-link-create").addEventListener("click",async()=>{const l=e.querySelector("#memory-link-subject-type").value.trim(),s=e.querySelector("#memory-link-subject-id").value.trim(),r=e.querySelector("#memory-link-platform").value.trim(),n=e.querySelector("#memory-link-external-id").value.trim(),c=e.querySelector("#memory-link-display-name").value.trim();if(!l||!s||!n){f("主体类型、主体 ID 和外部 ID 不能为空","warning");return}try{await Z.linkMemoryIdentity({subject_type:l,subject_id:s,platform:r,external_id:n,display_name:c}),f("Identity Link 创建成功","success"),e.querySelector("#memory-link-external-id").value="",e.querySelector("#memory-link-display-name").value="",await i()}catch(o){f(`创建失败: ${o.message}`,"error")}}),e.querySelector("#memory-refresh").addEventListener("click",i),await i()}const ke=P();let qe=!1,M=null;async function ui(e){qe=!1,M=null,e.innerHTML=`
    <div class="page-header">
      <h2>角色卡管理</h2>
      <div class="page-actions">
        <button class="btn" id="rc-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label class="form-label" for="rc-select">选择角色卡</label>
        <select id="rc-select" class="form-input"><option value="">-- 新建 --</option></select>
      </div>
      <div class="form-group">
        <button class="btn" id="rc-new"><svg width="14" height="14"><use href="#icon-plus"></use></svg> 新建</button>
      </div>
    </div>

    <div class="form-card" id="rc-editor" style="display:none;">
      <h3 id="rc-editor-title">新建角色卡</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="rc-key">Key</label>
          <input type="text" id="rc-key" class="form-input" placeholder="唯一标识 (英文)" />
        </div>
        <div class="form-group">
          <label class="form-label" for="rc-name">名称</label>
          <input type="text" id="rc-name" class="form-input" placeholder="角色名称" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="rc-desc">描述</label>
        <input type="text" id="rc-desc" class="form-input" placeholder="简短描述" />
      </div>
      <div class="form-group">
        <label class="form-label" for="rc-system-prompt">System Prompt</label>
        <textarea id="rc-system-prompt" class="form-input form-textarea" rows="4" placeholder="系统提示词"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="rc-tone">语气 (Tone)</label>
        <input type="text" id="rc-tone" class="form-input" placeholder="例: friendly, witty" />
      </div>
      <div class="form-group">
        <label class="form-label" for="rc-constraints">约束 (Constraints)</label>
        <textarea id="rc-constraints" class="form-input form-textarea" rows="2" placeholder="行为约束，JSON 或文本"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="rc-save">保存</button>
        <button class="btn" id="rc-activate" style="display:none;">激活</button>
        <button class="btn btn-danger" id="rc-disable" style="display:none;">禁用</button>
      </div>
    </div>
  `;const t=e.querySelector("#rc-select"),i=e.querySelector("#rc-editor");let l=[];function s(){qe=!0}function r(){return qe?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function n(o){M=o,e.querySelector("#rc-key").value=(o==null?void 0:o.key)||"",e.querySelector("#rc-key").disabled=!!o,e.querySelector("#rc-name").value=(o==null?void 0:o.name)||"",e.querySelector("#rc-desc").value=(o==null?void 0:o.description)||"",e.querySelector("#rc-system-prompt").value=(o==null?void 0:o.system_prompt)||"",e.querySelector("#rc-tone").value=(o==null?void 0:o.tone)||"",e.querySelector("#rc-constraints").value=typeof(o==null?void 0:o.constraints)=="string"?o.constraints:JSON.stringify((o==null?void 0:o.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=o?`编辑: ${o.name||o.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=o&&o.enabled===!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=o&&o.enabled!==!1?"inline-flex":"none",i.style.display="block",qe=!1}i.querySelectorAll(".form-input").forEach(o=>o.addEventListener("input",s));async function c(){try{const o=await ke.getRoleCards({limit:100});l=Array.isArray(o==null?void 0:o.items)?o.items:Array.isArray(o)?o:[],t.innerHTML='<option value="">-- 新建 --</option>'+l.map(p=>`<option value="${a(p.key)}">${a(p.name||p.key)}${p.enabled===!1?" (禁用)":""}</option>`).join("")}catch(o){f(`加载失败: ${o.message}`,"error")}}t.addEventListener("change",()=>{if(!r()){t.value=(M==null?void 0:M.key)||"";return}const o=t.value,p=l.find(u=>u.key===o);n(p||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{r()&&(t.value="",n(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const o={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},p=e.querySelector("#rc-constraints").value.trim();try{o.constraints=p?JSON.parse(p):""}catch{o.constraints=p}if(!o.key){f("Key 不能为空","warning");return}try{M!=null&&M.key?(await ke.updateRoleCard(M.key,o),f("保存成功","success")):(await ke.createRoleCard(o),f("创建成功","success")),qe=!1,await c(),t.value=o.key}catch(u){f(`操作失败: ${u.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(M!=null&&M.key)try{await ke.activateRoleCard(M.key),f("已激活","success"),await c()}catch(o){f(`激活失败: ${o.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(M!=null&&M.key)try{await ke.disableRoleCard(M.key),f("已禁用","success"),await c()}catch(o){f(`禁用失败: ${o.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{c()}),await c()}const Ie=P();async function pi(e){e.innerHTML=`
    <div class="page-header">
      <h2>风格配置</h2>
      <div class="page-actions">
        <button class="btn btn-secondary" id="profile-refresh">刷新配置</button>
      </div>
    </div>

    <div class="section-grid">
      <div class="form-card">
        <h3>风格配置</h3>
        <p class="form-hint">选择回复生成风格</p>
        <div class="form-group">
          <select id="profile-style" class="form-input">
            <option value="auto">auto (自动)</option>
            <option value="empathy">empathy (共情)</option>
            <option value="meme">meme (热梗)</option>
            <option value="normal">normal (正常)</option>
          </select>
        </div>
        <button class="btn btn-primary" id="profile-style-apply" disabled>应用</button>
        <div id="profile-style-current" class="form-hint" style="margin-top:8px;"></div>
      </div>

      <div class="form-card">
        <h3>角色配置</h3>
        <p class="form-hint">选择角色行为模式</p>
        <div class="form-group">
          <select id="profile-role" class="form-input">
            <option value="auto">auto (自动)</option>
            <option value="default">default (默认)</option>
            <option value="comfort">comfort (安慰)</option>
            <option value="playful">playful (活泼)</option>
          </select>
        </div>
        <button class="btn btn-primary" id="profile-role-apply" disabled>应用</button>
        <div id="profile-role-current" class="form-hint" style="margin-top:8px;"></div>
      </div>
    </div>
    <div id="profile-pending-state" class="form-hint" style="margin-top:10px;"></div>
  `;const t=e.querySelector("#profile-style"),i=e.querySelector("#profile-role"),l=e.querySelector("#profile-style-current"),s=e.querySelector("#profile-role-current"),r=e.querySelector("#profile-style-apply"),n=e.querySelector("#profile-role-apply"),c=e.querySelector("#profile-pending-state");let o=t.value,p=i.value;function u(){const m=t.value!==o,$=i.value!==p;if(r.disabled=!m,n.disabled=!$,m&&$){c.textContent="检测到风格与角色配置均有未应用变更";return}if(m){c.textContent="检测到风格配置有未应用变更";return}if($){c.textContent="检测到角色配置有未应用变更";return}c.textContent="当前配置与服务端已同步"}async function v({showSuccessToast:m=!1}={}){var y,_,A,x;const[$,g]=await Promise.allSettled([Ie.getStyleProfile(),Ie.getRoleProfile()]),b=[];if($.status==="fulfilled"&&((y=$.value)!=null&&y.style)?(o=$.value.style,t.value=o,l.textContent=`当前: ${o}`):$.status==="rejected"&&b.push(((_=$.reason)==null?void 0:_.message)||"风格配置加载失败"),g.status==="fulfilled"&&((A=g.value)!=null&&A.role)?(p=g.value.role,i.value=p,s.textContent=`当前: ${p}`):g.status==="rejected"&&b.push(((x=g.reason)==null?void 0:x.message)||"角色配置加载失败"),u(),b.length>0){f(`加载配置失败: ${b.join("；")}`,"error");return}m&&f("已从服务端刷新配置","success")}t.addEventListener("change",u),i.addEventListener("change",u),r.addEventListener("click",async()=>{const m=t.value;if(m===o){f("风格未发生变化，无需应用","warning");return}try{await Ie.setStyleProfile(m),o=m,l.textContent=`当前: ${m}`,u(),f("风格已更新","success")}catch($){f(`更新失败: ${$.message}`,"error"),u()}}),n.addEventListener("click",async()=>{const m=i.value;if(m===p){f("角色配置未发生变化，无需应用","warning");return}try{await Ie.setRoleProfile(m),p=m,s.textContent=`当前: ${m}`,u(),f("角色配置已更新","success")}catch($){f(`更新失败: ${$.message}`,"error"),u()}}),e.querySelector("#profile-refresh").addEventListener("click",async()=>{await v({showSuccessToast:!0})}),await v({showSuccessToast:!1})}const $t=P(),bi=[{key:"pat",label:"Pat"},{key:"feed",label:"Feed"},{key:"wake",label:"Wake"}];function vi(e){return!Array.isArray(e)||!e.length?'<div class="table-empty">暂无主动信号</div>':`
    <ul class="signal-list" style="padding: 0 16px 16px;">
      ${e.map(t=>`<li class="signal-item"><strong>${a(t.label||t.key||"信号")}</strong>: ${a(t.detail||"-")}</li>`).join("")}
    </ul>
  `}function yi(e){return!Array.isArray(e)||!e.length?'<div class="table-empty">暂无 needs 数据</div>':`
    <div class="audit-summary-grid">
      ${e.map(t=>`
            <div class="stat-card mini">
              <div class="stat-label">${a(t.label||t.key||"Need")}</div>
              <div class="stat-value">${a(t.value||"-")}</div>
            </div>
          `).join("")}
    </div>
  `}function mi(e){return!Array.isArray(e)||!e.length?'<div class="table-empty">暂无最近交互</div>':`
    <div style="padding: 0 16px 16px; display: grid; gap: 12px;">
      ${e.map(t=>`
            <article class="stat-card mini">
              <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
                <div>
                  <div class="stat-value" style="font-size: 14px;">${a(t.title||t.kind||"互动")}</div>
                  <div class="form-hint" style="margin-top: 6px;">${a(t.detail||"-")}</div>
                </div>
                <div style="text-align:right;">
                  <div class="stat-label">${a(t.source||"pet-core")}</div>
                  <div class="form-hint" style="margin-top: 6px;">${a(t.timestamp||"-")}</div>
                </div>
              </div>
            </article>
          `).join("")}
    </div>
  `}function Ce(e){return`<div class="page-error">加载失败: ${a(e)}</div>`}async function fi(e){e.innerHTML=`
    <div class="page-header">
      <h2>宠物核心</h2>
      <button class="btn" id="pet-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
    </div>
    <div class="section-grid">
      <div class="section-card">
        <div class="section-card-header"><h3>关系与阶段</h3></div>
        <div id="pet-arc" style="padding:16px;"><div class="page-loading">加载中...</div></div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>Needs</h3></div>
        <div id="pet-needs" style="padding:16px;"><div class="page-loading">加载中...</div></div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>主动信号</h3></div>
        <div id="pet-signals"><div class="page-loading">加载中...</div></div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>Companion 摘要</h3></div>
        <div id="pet-companion-summary" style="padding:16px;"><div class="page-loading">加载中...</div></div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>Loop 动作</h3></div>
        <div style="padding:16px; display:grid; gap:12px;">
          <p class="form-hint">直接记录 Pat / Feed / Wake，验证 pet loop 是否仍能持续推进。</p>
          <label class="form-label" for="pet-action-note">动作备注</label>
          <textarea id="pet-action-note" rows="3" maxlength="160" placeholder="可选备注，会写入 pet-core 交互历史。"></textarea>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${bi.map(c=>`<button class="btn btn-primary" type="button" data-role="pet-action" data-action="${a(c.key)}" data-action-label="${a(c.label)}">${a(c.label)}</button>`).join("")}
          </div>
          <div id="pet-action-status" class="form-hint">准备记录下一次宠物动作。</div>
        </div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>最近交互</h3></div>
        <div id="pet-timeline"><div class="page-loading">加载中...</div></div>
      </div>
    </div>
  `;const t=e.querySelector("#pet-action-note"),i=e.querySelector("#pet-action-status"),l=[...e.querySelectorAll('[data-role="pet-action"]')];function s(c=""){l.forEach(o=>{const p=o.getAttribute("data-action-label")||o.textContent||"",u=c&&o.getAttribute("data-action")===c;o.disabled=!!c,o.textContent=u?`${p}...`:p})}async function r(){try{const c=await $t.getPetOverview(),o=(c==null?void 0:c.item)||{},p=o.snapshot||{},u=o.companion||{},v=p.relationship||{},m=p.progress||{};e.querySelector("#pet-arc").innerHTML=`
        <div class="audit-summary-grid">
          <div class="stat-card mini">
            <div class="stat-label">关系等级</div>
            <div class="stat-value">${a(v.level||"-")}</div>
          </div>
          <div class="stat-card mini">
            <div class="stat-label">当前阶段</div>
            <div class="stat-value">${a(m.progressLabel||"-")}</div>
          </div>
        </div>
        <p class="form-hint" style="margin-top: 12px;">${a(v.note||"")}</p>
        <p class="form-hint">${a(m.nextMilestone||"暂无下一阶段里程碑")}</p>
      `,e.querySelector("#pet-needs").innerHTML=yi(p.needs),e.querySelector("#pet-signals").innerHTML=vi(p.proactiveSignals),e.querySelector("#pet-companion-summary").innerHTML=`
        <div class="audit-summary-grid">
          <div class="stat-card mini">
            <div class="stat-label">宠物名</div>
            <div class="stat-value">${a(u.petName||"-")}</div>
          </div>
          <div class="stat-card mini">
            <div class="stat-label">Loop mode</div>
            <div class="stat-value">${a(u.loopMode||"-")}</div>
          </div>
          <div class="stat-card mini">
            <div class="stat-label">状态来源</div>
            <div class="stat-value">${a(u.adapterLabel||"-")}</div>
          </div>
        </div>
        <p class="form-hint" style="margin-top: 12px;">${a(u.statusLine||"")}</p>
      `,e.querySelector("#pet-timeline").innerHTML=mi(u.recentInteractions)}catch(c){const o=c instanceof Error?c.message:"unknown_error";throw e.querySelector("#pet-arc").innerHTML=Ce(o),e.querySelector("#pet-needs").innerHTML=Ce(o),e.querySelector("#pet-signals").innerHTML=Ce(o),e.querySelector("#pet-companion-summary").innerHTML=Ce(o),e.querySelector("#pet-timeline").innerHTML=Ce(o),c}}async function n(c){const o=l.find(v=>v.getAttribute("data-action")===c),p=(o==null?void 0:o.getAttribute("data-action-label"))||c,u=typeof(t==null?void 0:t.value)=="string"?t.value.trim().slice(0,160):"";s(c),i.textContent=`正在记录 ${p}...`;try{await $t.recordPetAction(c,u||void 0),f(`${p} 已记录`,"success"),i.textContent=`${p} 已记录，正在刷新宠物循环。`,t&&(t.value=""),await r()}catch(v){const m=v instanceof Error?v.message:"unknown_error";i.textContent=`记录失败: ${m}`,f(`宠物动作失败: ${m}`,"error")}finally{s()}}l.forEach(c=>{c.addEventListener("click",()=>{n(c.getAttribute("data-action")||"")})}),e.querySelector("#pet-refresh").addEventListener("click",()=>{r()}),await r()}const _t=P();function gi(e){return!Array.isArray(e)||!e.length?'<div class="table-empty">暂无平台连接信息</div>':e.map(t=>`
        <div class="section-card" style="margin-bottom:16px;">
          <div class="section-card-header">
            <h3>${a(t.platform||"-")}</h3>
          </div>
          <div style="padding:16px;">
            <div class="audit-summary-grid">
              <div class="stat-card mini">
                <div class="stat-label">Adapter</div>
                <div class="stat-value">${a(t.adapterKey||"-")}</div>
              </div>
              <div class="stat-card mini">
                <div class="stat-label">状态</div>
                <div class="stat-value">${a(t.status||"-")}</div>
              </div>
              <div class="stat-card mini">
                <div class="stat-label">启用</div>
                <div class="stat-value">${t.enabled?"是":"否"}</div>
              </div>
            </div>
            <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn btn-secondary" data-role="platform-toggle" data-platform="${a(t.platform||"")}" data-enabled="${t.enabled?"false":"true"}">
                ${t.enabled?"暂停试点":"恢复试点"}
              </button>
            </div>
            <ul class="signal-list" style="margin-top:12px;">
              ${(t.capabilities||[]).map(i=>`<li class="signal-item"><strong>${a(i.key||"-")}</strong>: ${a(i.status||"-")} ${i.note?`· ${a(i.note)}`:""}</li>`).join("")}
            </ul>
          </div>
        </div>
      `).join("")}async function hi(e){e.innerHTML=`
    <div class="page-header">
      <h2>平台连接</h2>
      <button class="btn" id="connections-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
    </div>
    <div id="connections-wrapper"><div class="page-loading">加载中...</div></div>
  `;async function t(){const i=await _t.getPlatformConnections();e.querySelector("#connections-wrapper").innerHTML=gi(i==null?void 0:i.items),e.querySelectorAll('[data-role="platform-toggle"]').forEach(l=>{l.addEventListener("click",async()=>{const s=l.getAttribute("data-platform")||"",r=l.getAttribute("data-enabled")==="true";await _t.setPlatformConnectionControl(s,r),await t()})})}e.querySelector("#connections-refresh").addEventListener("click",()=>{t()}),await t()}function nt({columns:e,rows:t,empty:i="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${a(i)}</div>`;const l=e.map(r=>`<th class="${r.class||""}">${a(r.label)}</th>`).join(""),s=t.map(r=>`<tr>${e.map(n=>`<td class="${n.class||""}">${n.render?n.render(r):a(r[n.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${l}</tr></thead>
        <tbody>${s}</tbody>
      </table>
    </div>
  `}const Xe=P();async function $i(e){e.innerHTML=`
    <div class="page-header">
      <h2>网关</h2>
      <button class="btn" id="gw-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
    </div>

    <div class="section-grid">
      <div class="section-card" style="grid-column: 1 / -1;">
        <div class="section-card-header"><h3>手动发布</h3></div>
        <div style="padding: 16px;">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="gw-comment-id">Comment ID</label>
              <input type="text" id="gw-comment-id" class="form-input" placeholder="评论 ID" />
            </div>
            <div class="form-group">
              <label class="form-label" for="gw-source">来源</label>
              <input type="text" id="gw-source" class="form-input" value="manual" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="gw-reply">回复内容 <span id="gw-char-count" class="form-hint">0/0</span></label>
            <textarea id="gw-reply" class="form-input form-textarea" rows="3" placeholder="回复文本"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group" style="flex-direction:row; align-items:center; gap:8px;">
              <input type="checkbox" id="gw-force" />
              <label class="form-label" for="gw-force" style="margin:0;">强制发布</label>
            </div>
          </div>
          <button class="btn btn-primary" id="gw-publish-btn">发布</button>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label class="form-label" for="gw-limit">数量</label>
        <input type="number" id="gw-limit" class="form-input" value="20" min="1" max="100" />
      </div>
      <div class="form-group">
        <label class="form-label" for="gw-status">发布状态</label>
        <select id="gw-status" class="form-input">
          <option value="">全部</option>
          <option value="pending">pending</option>
          <option value="published">published</option>
          <option value="failed">failed</option>
          <option value="pending_review">pending_review</option>
        </select>
      </div>
      <div class="form-group">
        <button class="btn btn-primary" id="gw-filter-btn">查询</button>
      </div>
    </div>

    <div class="section-grid">
      <div class="section-card">
        <div class="section-card-header"><h3>网关事件</h3></div>
        <div id="gw-events-meta" class="form-hint" style="padding: 12px 16px 0;"></div>
        <div id="gw-events-wrapper" style="padding: 16px;">
          <div class="page-loading">加载中...</div>
        </div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>发布日志诊断</h3></div>
        <div id="gw-publish-meta" class="form-hint" style="padding: 12px 16px 0;"></div>
        <div id="gw-publish-wrapper" style="padding: 16px;">
          <div class="page-loading">加载中...</div>
        </div>
      </div>
    </div>
  `;const t=e.querySelector("#gw-reply"),i=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{i.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const n=e.querySelector("#gw-publish-btn"),c=e.querySelector("#gw-comment-id").value.trim(),o=e.querySelector("#gw-reply").value.trim(),p=e.querySelector("#gw-source").value.trim(),u=e.querySelector("#gw-force").checked;if(!c||!o){f("Comment ID 和回复内容不能为空","warning");return}n.disabled=!0,n.textContent="发布中...";try{await Xe.publishGatewayReply({comment_id:c,reply_text:o,source:p,force_publish:u}),f("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",i.textContent="0 字",await r()}catch(v){f(`发布失败: ${v.message}`,"error")}finally{n.disabled=!1,n.textContent="发布"}});async function l(){const n=e.querySelector("#gw-events-wrapper"),c=e.querySelector("#gw-events-meta"),o=e.querySelector("#gw-limit").value;n.innerHTML='<div class="page-loading">加载中...</div>',c.textContent="";try{const p=await Xe.getGatewayLogs({limit:o}),u=Array.isArray(p==null?void 0:p.items)?p.items:[];if(c.textContent=`最近返回 ${u.length} 条网关事件`,u.length===0){n.innerHTML='<div class="table-empty">暂无网关日志</div>';return}n.innerHTML=nt({columns:[{key:"id",label:"ID",class:"cell-id",render:v=>{var m;return a((m=v.id)==null?void 0:m.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:v=>{var m;return a((m=v.comment_id)==null?void 0:m.substring(0,12))}},{key:"status",label:"状态",render:v=>Ne(v.status)},{key:"platform",label:"平台",render:v=>a(v.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:v=>{var m;return a((m=v.reply_text)==null?void 0:m.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:v=>R(v.created_at)}],rows:u})}catch(p){n.innerHTML=`<div class="page-error">加载失败: ${a(p.message)}</div>`}}async function s(){const n=e.querySelector("#gw-publish-wrapper"),c=e.querySelector("#gw-publish-meta"),o=e.querySelector("#gw-limit").value,p=e.querySelector("#gw-status").value;n.innerHTML='<div class="page-loading">加载中...</div>',c.textContent="";try{const u=await Xe.getGatewayPublishLogs({limit:o,status:p}),v=Array.isArray(u==null?void 0:u.items)?u.items:[],m=Number((u==null?void 0:u.total)??v.length)||v.length,$=v.reduce((b,y)=>{const _=y.status||"unknown";return b[_]=(b[_]||0)+1,b},{});c.textContent=p?`状态 ${p}，返回 ${v.length} / ${m} 条发布日志`:`返回 ${v.length} / ${m} 条发布日志`;const g=Object.entries($).map(([b,y])=>`${b}:${y}`).join("，");if(g&&(c.textContent+=`；当前页状态 ${g}`),v.length===0){n.innerHTML='<div class="table-empty">暂无发布日志</div>';return}n.innerHTML=nt({columns:[{key:"comment_id",label:"Comment ID",class:"cell-id",render:b=>a((b.comment_id||b.canonical_comment_id||"-").toString().substring(0,16))},{key:"platform",label:"平台",render:b=>a(b.platform||"-")},{key:"status",label:"状态",render:b=>Ne(b.status)},{key:"source",label:"来源",render:b=>a(b.source||"-")},{key:"failure_reason",label:"失败原因",class:"cell-truncate",render:b=>a(b.failure_reason||"-")},{key:"reply_hash",label:"Hash",class:"cell-id",render:b=>a((b.reply_hash||"-").toString().substring(0,12))},{key:"published_at",label:"发布于",class:"cell-time",render:b=>b.published_at?R(b.published_at):"-"},{key:"created_at",label:"记录时间",class:"cell-time",render:b=>R(b.created_at)}],rows:v})}catch(u){n.innerHTML=`<div class="page-error">加载失败: ${a(u.message)}</div>`}}async function r(){await Promise.all([l(),s()])}e.querySelector("#gw-refresh").addEventListener("click",r),e.querySelector("#gw-filter-btn").addEventListener("click",r),await r()}const et=P();async function _i(e){e.innerHTML=`
    <div class="page-header">
      <h2>审计日志</h2>
      <div class="page-actions">
        <button class="btn" id="audit-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
        <button class="btn" id="audit-export"><svg width="14" height="14"><use href="#icon-download"></use></svg> 导出 CSV</button>
      </div>
    </div>

    <div class="section-grid">
      <div class="stat-grid" id="audit-summary-cards"></div>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label class="form-label" for="audit-action">操作类型</label>
        <input type="text" id="audit-action" class="form-input" placeholder="例: approve, retry" />
      </div>
      <div class="form-group">
        <label class="form-label" for="audit-ok">成功</label>
        <select id="audit-ok" class="form-input">
          <option value="">全部</option>
          <option value="true">成功</option>
          <option value="false">失败</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="audit-limit">数量</label>
        <input type="number" id="audit-limit" class="form-input" value="30" min="1" max="200" />
      </div>
      <div class="form-group">
        <button class="btn btn-primary" id="audit-filter-btn">查询</button>
      </div>
    </div>

    <div class="table-wrapper" id="audit-table-wrapper">
      <div class="page-loading">加载中...</div>
    </div>
  `;async function t(){try{const l=await et.getAuditSummary({days:7}),s=e.querySelector("#audit-summary-cards");s.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">总操作</div>
          <div class="stat-value">${(l==null?void 0:l.total)??0}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">成功</div>
          <div class="stat-value" style="color:var(--success-color)">${(l==null?void 0:l.ok_count)??0}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">失败</div>
          <div class="stat-value" style="color:var(--danger-color)">${(l==null?void 0:l.failed_count)??0}</div>
        </div>
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function i(){const l=e.querySelector("#audit-table-wrapper");l.innerHTML='<div class="page-loading">加载中...</div>';const s=e.querySelector("#audit-action").value.trim(),r=e.querySelector("#audit-ok").value,n=e.querySelector("#audit-limit").value;try{const c=await et.getAuditLogs({action:s,ok:r,limit:n}),o=Array.isArray(c==null?void 0:c.items)?c.items:[];if(o.length===0){l.innerHTML='<div class="table-empty">暂无审计日志</div>';return}l.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${o.map(p=>{var u;return`<tr>
              <td class="cell-id">${a((u=p.id)==null?void 0:u.toString().substring(0,8))}</td>
              <td>${a(p.action)}</td>
              <td class="cell-truncate">${a(p.target_id||"-")}</td>
              <td>${p.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${a(p.detail||"-")}</td>
              <td class="cell-time">${R(p.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(c){l.innerHTML=`<div class="page-error">加载失败: ${a(c.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),i()}),e.querySelector("#audit-filter-btn").addEventListener("click",i),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await et.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),f("导出成功","success")}catch(l){f(`导出失败: ${l.message}`,"error")}}),await Promise.all([t(),i()])}const xi=/^BV[a-zA-Z0-9]{10}$/,Si={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},wi={"auth:no active credential":"缺少可用的激活凭证，请先添加并激活。","auth:credential_validation_failed":"凭证字段存在，但运行时认证失败，请检查登录状态或凭证是否失效。","config:bilibili_enabled is false":"B 站集成总开关已关闭，请先启用配置。","dependency:diagnostics_unavailable":"诊断信息暂时不可用，请稍后刷新重试。"},ki={manual_queue:"人工队列发布",simulated:"模拟发布流程",webhook:"Webhook 推送",real_publish:"真实发布流程",native_bilibili:"原生 B 站发布"},ge=50;function j(e){const t=e instanceof Error?e.message:String(e??"request_failed");return Si[t]||t}function qi(e){return e?xi.test(e)?null:"invalid_bvid_format":"bvid_required"}function Ci(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function Ei(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function Li(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(i=>wi[i]||`未识别阻塞原因: ${i}`).join("；")}function Ti(e){const t=String(e??"").trim().toLowerCase();return t?ki[t]||`未识别发布模式: ${t}`:"未设置发布模式"}function tt(e,t,i){return e?t:i}function Mi(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"未设置轮询间隔":t%60===0?`${t/60} 分钟`:`${t} 秒`}function Ai(e){const t=Number(e);if(!Number.isFinite(t)||t<=0)return"未设置轮询间隔，请检查轮询配置";if(t<60){const s=60/t;return`约每分钟 ${s.toFixed(s>=10?0:1).replace(/\.0$/,"")} 轮`}if(t<3600){const s=3600/t;return`约每小时 ${s.toFixed(s>=10?0:1).replace(/\.0$/,"")} 轮`}const i=t/3600;return`约每 ${i.toFixed(i>=10?0:1).replace(/\.0$/,"")} 小时 1 轮`}function Bi(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"未设置速率限制":`${t} 次/分钟`}function ji(e){const t=Number(e);if(!Number.isFinite(t)||t<=0)return"未设置速率限制，请检查抓取配置";const i=t/60;if(i>=1)return`约每秒 ${i.toFixed(i>=10?0:1).replace(/\.0$/,"")} 次`;const l=60/t;return`约每 ${l.toFixed(l>=10?0:1).replace(/\.0$/,"")} 秒 1 次`}function xt(e,t,i="覆盖率"){const l=Number(t??0);if(!Number.isFinite(l)||l<=0)return`暂无视频，无法计算${i}，请先添加监控对象`;const s=Number(e??0),r=Number.isFinite(s)?Math.min(l,Math.max(0,s)):0,n=(r/l*100).toFixed(1).replace(/\.0$/,"");return`${i} ${n}%（${r}/${l}）`}function Ii(e,t){const i=Number(e??0);if(!Number.isFinite(i)||i<=0)return"暂无视频，请先添加 BVID 监控对象";const l=Number(t??0),s=Number.isFinite(l)?Math.min(i,Math.max(0,l)):0,r=Math.max(0,i-s);return`共 ${i} 个视频，轮询中 ${s}，停用 ${r}`}function St(e,t={}){const i=Number((e==null?void 0:e.videos)??0),l=Number((e==null?void 0:e.comments)??0),s=Number((e==null?void 0:e.events_injected)??l),r=t.subject||(i===1?"视频":"轮询");return l>0||s>0?`${r}完成，处理 ${i} 个视频，新增 ${l} 条评论，已注入 ${s} 个事件。`:i>0?`${r}完成，处理 ${i} 个视频，暂无新增评论，已保留当前评论状态。`:`${r}完成，暂无可处理视频，请先确认监控对象已同步。`}function he(e,t){if(!t)return"";const i=ut(t),l=U(t);return i?`${e}: ${i}（${l}）`:`${e}: ${l}`}function wt(e,t){return e?t?"活跃凭证字段完整，可用于鉴权":"活跃凭证已激活，但缺少关键字段，请检查凭证配置":"当前无活跃凭证，请先添加并激活"}function Pi(e){var o,p,u,v,m,$;const t=!!((p=(o=e==null?void 0:e.checks)==null?void 0:o.auth)!=null&&p.ready),i=!!((v=(u=e==null?void 0:e.checks)==null?void 0:u.worker_or_publish)!=null&&v.ready),l=!!((m=e==null?void 0:e.signals)!=null&&m.polling_worker_enabled),s=!!(($=e==null?void 0:e.signals)!=null&&$.native_publish_enabled),r=Array.isArray(e==null?void 0:e.blocking_reasons)?e.blocking_reasons.filter(Boolean):[],n=r.length>0?`，阻塞 ${r.length} 项，详见下方阻塞原因`:"";return l||s?t&&i?`鉴权已就绪，执行链路可用${n}`:t?`鉴权已就绪，但执行链路阻塞${n}`:i?`执行链路可用，但鉴权未就绪${n}`:`鉴权未就绪，执行链路阻塞${n}`:r.length>0?`当前无需鉴权，但诊断校验仍受阻${n}`:"轮询与发布链路均未启用，可按需开启"}function Ni(e){var s,r,n;const t=!!((s=e==null?void 0:e.signals)!=null&&s.publish_mode_config_ready),i=!!((r=e==null?void 0:e.signals)!=null&&r.native_publish_enabled),l=!!((n=e==null?void 0:e.signals)!=null&&n.polling_worker_enabled);return[t?"模式配置就绪":"模式配置缺失，请检查发布配置",i?"原生发布启用，可直接进入 B 站发布链路":"原生发布停用，当前不会直接走 B 站发布",l?"轮询链路启用，可配合自动处理评论侧流程":"轮询链路停用，评论侧仅支持手动同步"].join("，")}const kt={ok:{label:"轮询成功",cls:"badge-success"},no_new:{label:"无新增评论",cls:"badge-muted"},error:{label:"轮询失败",cls:"badge-danger"}},$e={no_aid:"缺少视频 aid，暂时无法轮询评论。",retry_exhausted:"评论抓取重试耗尽。"};function Hi(e,t,i){const l=String(e??"").trim().toLowerCase();if(!l)return"-";const s=kt[l]||{label:"未识别轮询状态",cls:"badge-muted"},r=l==="error"&&t?$e[String(t).trim().toLowerCase()]||String(t):"",n=r?` title="${a(r)}"`:"",c=typeof i=="number"&&Number.isFinite(i)?`评论游标: ${i}`:"",p=[l==="ok"?c?"轮询完成，评论游标已推进":"轮询完成":l==="no_new"?c?"本次未发现新评论，评论游标已保留":"本次未发现新评论":kt[l]?"":`原始状态值: ${l}`,r,c].filter(Boolean).map(u=>`<div class="form-hint" style="margin-top:4px;">${a(u)}</div>`).join("");return`<span class="status-badge ${s.cls}"${n}>${a(s.label)}</span>${p}`}function Ri(e){if(String((e==null?void 0:e.last_poll_status)??"").trim().toLowerCase())return Hi(e==null?void 0:e.last_poll_status,e==null?void 0:e.last_poll_error,e==null?void 0:e.last_rpid);if(!(e!=null&&e.last_polled_at))return`<span class="status-badge badge-muted">未轮询</span><div class="form-hint" style="margin-top:4px;">${a(bt(e))}</div>`;const i=typeof(e==null?void 0:e.last_rpid)=="number"&&Number.isFinite(e.last_rpid)?"已轮询但未记录结果，评论游标已保留":"已轮询但未记录结果";return`<span class="status-badge badge-muted">轮询完成</span><div class="form-hint" style="margin-top:4px;">${a(i)}</div>`}function Oi(e){if(e==="true")return!0;if(e==="false")return!1}function Di(e){return e==="true"?"当前筛选暂无轮询中视频，可切换筛选查看停用项":e==="false"?"当前筛选暂无已停用视频，可切换筛选查看轮询中项":"暂无监控视频，请先添加 BVID 作为监控对象"}function O(e){return typeof(e==null?void 0:e.aid)=="number"&&Number.isFinite(e.aid)}function bt(e){return O(e)?e!=null&&e.poll_enabled?"等待首次自动轮询，可稍后刷新查看":"轮询未启用，可手动同步评论":$e.no_aid}function Ui(e){return e.filter(t=>!O(t)).length}function Vi(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)).length}function Ji(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)&&!O(t)).length}function Wi(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&O(t)).length}function Ki(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&!O(t)).length}function Fi(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&!(t!=null&&t.last_polled_at)).length}function zi(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&(t==null?void 0:t.last_polled_at)).length}function Gi(e){return e.filter(t=>(t==null?void 0:t.poll_enabled)&&!(t!=null&&t.last_polled_at)).length}function Yi(e){return e.filter(t=>(t==null?void 0:t.poll_enabled)&&(t==null?void 0:t.last_polled_at)).length}function Qi(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="error").length}function Zi(e){return e.filter(t=>{const i=String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase();return i==="ok"||i==="no_new"}).length}function Xi(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="ok").length}function er(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="no_new").length}function tr(e){return e.filter(t=>!(t!=null&&t.last_polled_at)).length}function ir(e){return e.filter(t=>O(t)&&!(t!=null&&t.last_polled_at)).length}function rr(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function lr(e){return e.filter(t=>typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function sr(e){return e.filter(t=>String((t==null?void 0:t.title)??"").trim().length>0).length}function ar(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0).length}function nr(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&Number((t==null?void 0:t.comment_count)??0)<=0).length}function or(e){return e.filter(t=>typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function dr(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function cr(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)<=0&&typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function ur(e){return e.filter(t=>O(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function pr(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(O(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid))).length}function br(e){return e.reduce((t,i)=>{const l=Number((i==null?void 0:i.comment_count)??0);return t+(Number.isFinite(l)&&l>0?l:0)},0)}function vr(e){const t=O(e),i=String((e==null?void 0:e.bvid)??"").trim(),l=String((e==null?void 0:e.id)??(e==null?void 0:e.video_id)??"").trim(),s=[t?`aid: ${e.aid}`:$e.no_aid];return i||s.push(l?`记录 ID: ${l}`:"未同步 BVID"),`${a(i||"未同步 BVID")}${s.filter(Boolean).map(r=>`<div class="form-hint" style="margin-top:4px;">${a(r)}</div>`).join("")}`}function yr(e){const t=[];return O(e)||t.push("aid"),String((e==null?void 0:e.title)??"").trim()||t.push("标题"),typeof(e==null?void 0:e.owner_mid)=="number"&&Number.isFinite(e.owner_mid)||t.push("UP主 MID"),t}function mr(e){const t=[],i=String((e==null?void 0:e.title)??"").trim(),l=yr(e);return l.length>0&&t.push(`缺少 ${l.join(" / ")}`),typeof(e==null?void 0:e.owner_mid)=="number"&&Number.isFinite(e.owner_mid)&&t.push(`UP主 MID: ${e.owner_mid}`),e!=null&&e.updated_at&&t.push(he("更新",e.updated_at)),e!=null&&e.created_at&&t.push(he("创建",e.created_at)),`${a(i||"未同步标题")}${t.map(s=>`<div class="form-hint" style="margin-top:4px;">${a(s)}</div>`).join("")}`}function fr(e){const t=O(e),i=t?"":" disabled",l=t?"":` title="${a($e.no_aid)}"`;return`<button class="btn btn-sm bili-sync" data-id="${a(e.id||e.video_id)}" data-has-aid="${t?"true":"false"}"${i}${l}>同步</button>`}function gr(e){const t=O(e);let i=$e.no_aid;return t&&(i=e!=null&&e.poll_enabled?"自动轮询中，等待计划任务执行":"轮询停用，可手动同步评论"),`${pt(e==null?void 0:e.poll_enabled)}<div class="form-hint" style="margin-top:4px;">${a(i)}</div>`}function hr(e){const t=Number((e==null?void 0:e.comment_count)??0),i=Number.isFinite(t)&&t>0?t:0,l=typeof(e==null?void 0:e.last_rpid)=="number"&&Number.isFinite(e.last_rpid);let s=bt(e);return i>0?s=l?"已有评论，游标已记录":"已有评论，缺少游标":e!=null&&e.last_polled_at&&(s=l?"已轮询无评论，保留游标":"已轮询无评论，未记录游标"),`${a(i)}<div class="form-hint" style="margin-top:4px;">${a(s)}</div>`}function $r(e){if(e!=null&&e.last_polled_at){const t=typeof(e==null?void 0:e.last_rpid)=="number"&&Number.isFinite(e.last_rpid)?`评论游标: ${e.last_rpid}`:"未记录评论游标，可在下次轮询后补齐";return`${R(e.last_polled_at)}<div class="form-hint" style="margin-top:4px;">${a(t)}</div>`}return`从未轮询<div class="form-hint" style="margin-top:4px;">${a(bt(e))}</div>`}function _r(e,t,i,l=0,s=ge,r=[]){const n=i==="true"?"轮询中":i==="false"?"已停用":"全部状态",c=Math.floor(l/s)+1,o=Math.max(1,Math.ceil(e/s)),p=Vi(r),u=Math.max(0,r.length-p),v=Ji(r),m=Wi(r),$=Ki(r),g=Fi(r),b=zi(r),y=Gi(r),_=Yi(r),A=Ui(r),x=Math.max(0,r.length-A),C=Qi(r),q=Zi(r),L=Xi(r),B=er(r),E=tr(r),I=ir(r),S=Math.max(0,r.length-E),N=lr(r),ae=Math.max(0,r.length-N),X=sr(r),ne=Math.max(0,r.length-X),D=ar(r),V=Math.max(0,r.length-D),J=nr(r),ee=or(r),oe=dr(r),de=cr(r),te=Math.max(0,r.length-ee),ce=rr(r),K=ur(r),ue=Math.max(0,r.length-K),ie=pr(r),F=br(r),_e=A>0?`，当前页缺少 aid ${A} 条`:"",pe=i===""&&p>0?`，当前页轮询开启 ${p} 条`:"",be=i===""&&u>0?`，当前页轮询停用 ${u} 条`:"",ve=i===""&&v>0?`，轮询开启但缺少 aid ${v} 条`:"",ye=i===""&&m>0?`，轮询停用但可手动同步 ${m} 条`:"",z=i===""&&$>0?`，轮询停用且缺少 aid ${$} 条`:"",Ee=i===""&&g>0?`，轮询停用且从未轮询 ${g} 条`:"",re=i===""&&b>0?`，轮询停用且已有轮询记录 ${b} 条`:"",xe=i===""&&y>0?`，轮询开启但尚未轮询 ${y} 条`:"",G=i===""&&_>0?`，轮询开启且已有轮询记录 ${_} 条`:"",le=x>0?`，可手动同步 ${x} 条`:"",Se=q>0?`，正常轮询 ${q} 条`:"",we=L>0?`，成功轮询 ${L} 条`:"",me=B>0?`，无新增评论 ${B} 条`:"",Y=C>0?`，轮询失败 ${C} 条`:"",Le=S>0?`，已有轮询记录 ${S} 条`:"",He=E>0?`，尚未轮询 ${E} 条`:"",Te=I>0?`，可手动同步但尚未轮询 ${I} 条`:"",Re=N>0?`，已识别 UP 主 ${N} 条`:"",Me=ae>0?`，缺少 UP 主 ${ae} 条`:"",Oe=X>0?`，已抓取标题 ${X} 条`:"",De=ne>0?`，缺少标题 ${ne} 条`:"",Ue=K>0?`，信息完整 ${K} 条`:"",Ve=ue>0?`，信息不完整 ${ue} 条`:"",Je=ie>0?`，已轮询但信息不完整 ${ie} 条`:"",Ae=D>0?`，已有评论视频 ${D} 条`:"",We=V>0?`，无评论视频 ${V} 条`:"",Be=J>0?`，已轮询但无评论 ${J} 条`:"",Ke=ee>0?`，已有评论游标 ${ee} 条`:"",je=oe>0?`，有评论但无游标 ${oe} 条`:"",Fe=de>0?`，无评论但有游标 ${de} 条`:"",ze=te>0?`，无评论游标 ${te} 条`:"",Ge=ce>0?`，已轮询但无游标 ${ce} 条`:"",Ye=F>0?`，关联评论 ${F} 条`:"";return`筛选条件: ${n}，共 ${e} 条，当前展示 ${t} 条，第 ${c}/${o} 页${pe}${be}${_e}${ve}${ye}${z}${Ee}${re}${xe}${G}${le}${Se}${we}${me}${Y}${Le}${He}${Te}${Re}${Me}${Oe}${De}${Ue}${Ve}${Je}${Ae}${We}${Be}${Ke}${je}${Fe}${ze}${Ge}${Ye}`}const xr=7*24*60*60*1e3;function it(e,t=Date.now()){const i=new Date(e);if(Number.isNaN(i.getTime()))return"";const l=i.getTime()-t,s=Math.abs(l),r=60*1e3,n=60*r,c=24*n;let o,p;return s<n?(o=Math.max(1,Math.round(s/r)),p="分钟"):s<c?(o=Math.max(1,Math.round(s/n)),p="小时"):(o=Math.max(1,Math.round(s/c)),p="天"),l<=0?`${o}${p}前`:`${o}${p}后`}function w(e,t=Date.now()){if(!e)return{hasExpiry:!1,expired:!1,expiringSoon:!1,label:"未设置过期时间",cls:"badge-muted",detail:""};const i=new Date(e);if(Number.isNaN(i.getTime()))return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"过期时间异常",cls:"badge-danger",detail:String(e)};const l=i.getTime()-t;if(l<=0){const r=it(e,t);return{hasExpiry:!0,expired:!0,expiringSoon:!1,label:"已过期",cls:"badge-danger",detail:r?`${r}过期，${U(e)}`:U(e)}}if(l<=xr){const r=it(e,t);return{hasExpiry:!0,expired:!1,expiringSoon:!0,label:"即将过期",cls:"badge-warning",detail:r?`${r}到期，${U(e)}`:U(e)}}const s=it(e,t);return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"有效期内",cls:"badge-success",detail:s?`${s}到期，${U(e)}`:U(e)}}function ot(e,t=!0){if(!t)return"当前无活跃凭证，无法评估过期状态";const i=e.hasExpiry?e.label==="过期时间异常"?"请检查过期时间格式后重试":e.expired?"建议尽快更新":e.expiringSoon?"建议提前轮换":"当前仍可使用":"需手动确认有效性并定期轮换";return[e.detail||(e.hasExpiry?"":"未设置过期时间"),i].filter(Boolean).join("，")}function Sr(e){const t=w(e),i=ot(t),l=i?`<div class="form-hint" style="margin-top:4px;">${a(i)}</div>`:"";return`<span class="status-badge ${t.cls}">${a(t.label)}</span>${l}`}function dt(e,t="未命名凭证"){const i=[],l=String((e==null?void 0:e.name)??"").trim();return!l&&e&&i.push("未填写凭证名称，当前展示默认标签"),e!=null&&e.updated_at&&i.push(he("更新",e.updated_at)),e!=null&&e.created_at&&i.push(he("创建",e.created_at)),`${a(l||t)}${i.map(s=>`<div class="form-hint" style="margin-top:4px;">${a(s)}</div>`).join("")}`}function qt(e){return(e==null?void 0:e.cls)==="badge-danger"?"var(--danger-color)":(e==null?void 0:e.cls)==="badge-warning"?"var(--warning-color)":(e==null?void 0:e.cls)==="badge-success"?"var(--success-color)":"var(--grey-2)"}function ct(e){if(!e)return{label:"未配置凭证",detail:"请先添加并激活凭证用于鉴权"};const t=!!(e!=null&&e.is_active||e!=null&&e.active),i=k(e),l=i?"":vt(e).join(" / "),s=i?"":`缺少 ${l}`;if(e!=null&&e.last_used_at)return{label:ut(e.last_used_at)||"已使用",detail:`${U(e.last_used_at)}，${t?"当前生效":"当前未激活，历史使用记录保留"}${i?"，字段完整":`，${s}`}`};const r=[];return t?r.push(i?"当前生效，等待首次使用":`当前生效，但${s}`):r.push(i?"待手动激活，激活后可用于鉴权":`待补齐 ${l} 后激活`),e!=null&&e.updated_at&&r.push(he("更新",e.updated_at)),e!=null&&e.created_at&&r.push(he("创建",e.created_at)),{label:"从未使用",detail:r.join("，")}}function wr(e){const t=ct(e),i=t.detail?`<div class="form-hint" style="margin-top:4px;">${a(t.detail)}</div>`:"";return`${a(t.label)}${i}`}function kr(e){const t=!!(e!=null&&e.is_active||e!=null&&e.active),i=k(e),l=i?"":vt(e).join(" / "),s=i?"":`缺少 ${l}`,r=t?i?"当前生效，字段完整，可用于鉴权":`当前生效，但${s}`:i?"待手动激活，字段完整，激活后即可切换使用":`待补齐 ${l} 后激活`;return`${pt(t)}<div class="form-hint" style="margin-top:4px;">${a(r)}</div>`}function k(e){return!!(e!=null&&e.has_sessdata&&(e!=null&&e.has_bili_jct)&&(e!=null&&e.buvid3))}function vt(e){const t=[];return e!=null&&e.has_sessdata||t.push("SESSDATA"),e!=null&&e.has_bili_jct||t.push("bili_jct"),e!=null&&e.buvid3||t.push("buvid3"),t}function qr(e,t=4){const i=String(e??"").trim();return i?i.endsWith("...")||i.length<=t?i:`...${i.slice(-t)}`:""}function Cr(e){const t=[e!=null&&e.has_sessdata?"SESSDATA":"",e!=null&&e.has_bili_jct?"bili_jct":"",e!=null&&e.buvid3?`buvid3:${qr(e.buvid3)}`:""].filter(Boolean).join(" / ")||"未配置指纹",i=[k(e)?"字段完整，可用于鉴权":`缺少 ${vt(e).join(" / ")}`,e!=null&&e.buvid3?"仅展示指纹摘要":"未记录 buvid3 指纹摘要"].filter(Boolean).join("，");return`${a(t)}${i?`<div class="form-hint" style="margin-top:4px;">${a(i)}</div>`:""}`}function Ht(e="",t=""){return`激活筛选: ${e==="active"?"仅激活":e==="inactive"?"仅未激活":"全部"}，过期筛选: ${t==="expired"?"已过期":t==="expiring"?"即将过期":t==="valid"?"有效期内":t==="unset"?"未设置过期时间":"全部"}`}function Er(e,t="",i="",l=e.length){const s=e.length,r=Rt(e,t,i),n=e.filter(d=>d.is_active||d.active),c=e.filter(d=>!(d.is_active||d.active)),o=n.length,p=c.length,u=e.filter(d=>k(d)).length,v=e.filter(d=>(d.is_active||d.active)&&k(d)).length,m=Math.max(0,u-v),$=Math.max(0,o-v),g=Math.max(0,p-m),b=n.filter(d=>d.last_used_at).length,y=Math.max(0,o-b),_=c.filter(d=>d.last_used_at).length,A=Math.max(0,p-_),x=e.filter(d=>k(d)&&d.last_used_at).length,C=Math.max(0,u-x),q=Math.max(0,s-u),L=e.filter(d=>!k(d)&&d.last_used_at).length,B=Math.max(0,q-L),E=e.filter(d=>!d.last_used_at).length,I=Math.max(0,s-E),S=Date.now(),N=e.filter(d=>k(d)&&w(d.expires_at,S).hasExpiry&&!w(d.expires_at,S).expired).length,ae=e.filter(d=>k(d)&&w(d.expires_at,S).expired).length,X=e.filter(d=>k(d)&&w(d.expires_at,S).expiringSoon).length,ne=e.filter(d=>k(d)&&!w(d.expires_at,S).hasExpiry).length,D=e.map(d=>w(d.expires_at,S)),V=n.map(d=>w(d.expires_at,S)),J=c.map(d=>w(d.expires_at,S)),ee=D.filter(d=>d.hasExpiry).length,oe=D.filter(d=>d.hasExpiry&&!d.expired).length,de=D.filter(d=>d.expired).length,te=D.filter(d=>d.expiringSoon).length,ce=V.filter(d=>d.hasExpiry&&!d.expired).length,K=V.filter(d=>d.expired).length,ue=V.filter(d=>d.expiringSoon).length,ie=V.filter(d=>!d.hasExpiry).length,F=J.filter(d=>d.hasExpiry&&!d.expired).length,_e=J.filter(d=>d.expired).length,pe=J.filter(d=>d.expiringSoon).length,be=J.filter(d=>!d.hasExpiry).length,ve=e.filter(d=>!k(d)&&w(d.expires_at,S).hasExpiry&&!w(d.expires_at,S).expired).length,ye=e.filter(d=>!k(d)&&w(d.expires_at,S).expired).length,z=e.filter(d=>!k(d)&&w(d.expires_at,S).expiringSoon).length,Ee=e.filter(d=>!k(d)&&!w(d.expires_at,S).hasExpiry).length,re=D.filter(d=>!d.hasExpiry).length,xe=Ht(t,i),G=r.filter(d=>k(d)).length,le=Math.max(0,r.length-G),Se=r.filter(d=>{if(!k(d))return!1;const Q=w(d.expires_at,S);return Q.hasExpiry&&!Q.expired}).length,we=r.filter(d=>k(d)?w(d.expires_at,S).expired:!1).length,me=r.filter(d=>k(d)?w(d.expires_at,S).expiringSoon:!1).length,Y=r.filter(d=>k(d)?!w(d.expires_at,S).hasExpiry:!1).length,Le=r.filter(d=>k(d)&&(d.is_active||d.active)).length,He=Math.max(0,G-Le),Te=r.filter(d=>k(d)&&d.last_used_at).length,Re=Math.max(0,G-Te),Me=r.filter(d=>!k(d)&&d.last_used_at).length,Oe=Math.max(0,le-Me),De=r.filter(d=>{if(k(d))return!1;const Q=w(d.expires_at,S);return Q.hasExpiry&&!Q.expired}).length,Ue=r.filter(d=>k(d)?!1:w(d.expires_at,S).expired).length,Ve=r.filter(d=>k(d)?!1:w(d.expires_at,S).expiringSoon).length,Je=r.filter(d=>k(d)?!1:!w(d.expires_at,S).hasExpiry).length,Ae=r.filter(d=>!k(d)&&(d.is_active||d.active)).length,We=Math.max(0,le-Ae),Be=r.filter(d=>d.is_active||d.active).length,Ke=Math.max(0,r.length-Be),je=r.filter(d=>d.last_used_at).length,Fe=Math.max(0,r.length-je),ze=r.filter(d=>{const Q=w(d.expires_at,S);return Q.hasExpiry&&!Q.expired}).length,Ge=r.filter(d=>w(d.expires_at,S).expired).length,Ye=r.filter(d=>w(d.expires_at,S).expiringSoon).length,Jt=r.filter(d=>!w(d.expires_at,S).hasExpiry).length,Wt=t?"":`，激活 ${Be} 个，未激活 ${Ke} 个`,Kt=t?"":`，完整且激活 ${Le} 个，完整但未激活 ${He} 个`,Ft=t?"":`，缺字段且激活 ${Ae} 个，缺字段且未激活 ${We} 个`,zt=t||i?`，筛选结果完整 ${G} 个${Kt}，完整且有效 ${Se} 个，完整且已过期 ${we} 个，完整且即将过期 ${me} 个，完整且未设置过期 ${Y} 个，完整且已使用 ${Te} 个，完整但未使用 ${Re} 个，缺字段 ${le} 个${Ft}，缺字段但已使用 ${Me} 个，缺字段且从未使用 ${Oe} 个，缺字段但有效 ${De} 个，缺字段且已过期 ${Ue} 个，缺字段且即将过期 ${Ve} 个，缺字段且未设置过期 ${Je} 个${Wt}，已使用 ${je} 个，从未使用 ${Fe} 个，有效 ${ze} 个，已过期 ${Ge} 个，即将过期 ${Ye} 个，未设置过期 ${Jt} 个`:"";return`共 ${s} 个凭证，激活中 ${o} 个，未激活 ${p} 个，激活且完整 ${v} 个，未激活但完整 ${m} 个，激活但缺字段 ${$} 个，未激活且缺字段 ${g} 个，激活且已使用 ${b} 个，激活但从未使用 ${y} 个，未激活且已使用 ${_} 个，未激活但从未使用 ${A} 个，激活且有效 ${ce} 个，未激活且有效 ${F} 个，激活已过期 ${K} 个，未激活已过期 ${_e} 个，激活即将过期 ${ue} 个，未激活即将过期 ${pe} 个，激活未设置过期 ${ie} 个，未激活未设置过期 ${be} 个，字段完整 ${u} 个，完整且有效 ${N} 个，完整且已过期 ${ae} 个，完整即将过期 ${X} 个，完整未设置过期 ${ne} 个，完整且已使用 ${x} 个，完整但未使用 ${C} 个，字段缺失 ${q} 个，缺字段但已使用 ${L} 个，缺字段且未使用 ${B} 个，缺字段但有效 ${ve} 个，缺字段且已过期 ${ye} 个，缺字段即将过期 ${z} 个，缺字段未设置过期 ${Ee} 个，已使用 ${I} 个，从未使用 ${E} 个，设置过期时间 ${ee} 个，有效 ${oe} 个，已过期 ${de} 个，即将过期 ${te} 个，未设置 ${re} 个；筛选条件: ${xe}，当前展示 ${l} 个${zt}`}function Rt(e,t="",i=""){const l=Date.now();return e.filter(s=>{const r=s.is_active||s.active;if(t==="active"&&!r||t==="inactive"&&r)return!1;const n=w(s.expires_at,l);return!(i==="expired"&&!n.expired||i==="expiring"&&!n.expiringSoon||i==="valid"&&(!n.hasExpiry||n.expired)||i==="unset"&&n.hasExpiry)})}function Lr(e="",t=""){return e||t?`当前筛选暂无匹配凭证（${Ht(e,t)}），可调整筛选条件后重试`:"暂无凭证，请先添加并激活可用凭证用于鉴权"}const H=P(),Tr={llm_generation:"LLM 生成",search_enrichment:"搜索增强",webhook_publish:"Webhook 发布",native_bilibili_publish:"原生 B 站发布"},Mr={configured:"已就绪",inactive:"未启用",fallback_only:"仅回退",missing_inputs:"缺少配置",runtime_credentials_required:"凭证缺失",unsupported:"不支持"};function Ct(e,t,i){const l=e.querySelector(i);t.forEach(s=>{const r=e.querySelector(s);r==null||r.addEventListener("keydown",n=>{n.key==="Enter"&&(n.preventDefault(),l.disabled||l.click())})})}function Pe(e){return Array.isArray(e)?e.map(t=>String(t??"").trim()).filter(Boolean):[]}function Et(e){return e===!0?{label:"就绪",color:"var(--success-color)"}:e===!1?{label:"阻塞",color:"var(--danger-color)"}:{label:"未知",color:"var(--warning-color)"}}function Ar(e){if(!e||typeof e!="object"||Array.isArray(e))return[];const t=e.delivery_capabilities;return!t||typeof t!="object"||Array.isArray(t)?[]:(Array.isArray(t.summary)?t.summary:Array.isArray(t.capabilities)?t.capabilities:[]).filter(l=>l&&typeof l=="object"&&!Array.isArray(l)).map(l=>{const s=l;return{capability:String(s.capability??"").trim(),status:String(s.status??"").trim(),mode:String(s.mode??"").trim(),missing_inputs:Pe(s.missing_inputs)}}).filter(l=>l.capability)}function Br(e){const t=Tr[e.capability]??e.capability,i=Mr[e.status]??(e.status||"未知"),l=e.mode?`mode=${e.mode}`:"mode=unknown",s=e.missing_inputs.length>0?e.missing_inputs.join(", "):"未提供缺失项";return`${t} [${e.capability}] (${i}, ${l}): ${s}`}function jr(e){if(!e||typeof e!="object"||Array.isArray(e))return"";const t=e.release_gates,i=e.signals;if(!!(t&&typeof t=="object"&&t.real_auth_ready)||!!(i&&typeof i=="object"&&i.real_auth_ready))return"";const s=typeof i=="object"&&i&&!Array.isArray(i)&&typeof i.auth_probe_reason=="string"?i.auth_probe_reason.trim():"";return!s||s==="not_required"||s==="verified"?"":s}function Ir(e){if(!e||typeof e!="object"||Array.isArray(e))return{credentialPresent:!1,credentialComplete:!1,realAuthReady:!1};const t=e.release_gates,i=e.signals;return{credentialPresent:!!((i==null?void 0:i.credential_present)??(t==null?void 0:t.credential_present)),credentialComplete:!!((i==null?void 0:i.credential_complete)??(t==null?void 0:t.credential_complete)),realAuthReady:!!((i==null?void 0:i.real_auth_ready)??(t==null?void 0:t.real_auth_ready))}}function Pr(e){const t=e==null?void 0:e.credential,i=Ir(e==null?void 0:e.diagnostics);if(t){const s=w(t==null?void 0:t.expires_at);return{activeCredentialName:dt(t,"未配置活跃凭证"),credentialHealth:wt(i.credentialPresent,i.credentialComplete),credentialExpiry:s,credentialExpiryColor:qt(s),credentialExpiryDetail:ot(s,!0),credentialUsage:ct(t)}}if(i.credentialPresent){const s=i.realAuthReady?"运行时外部凭证":"运行时外部凭证（待验证）",r=i.realAuthReady?"后台未托管该凭证，当前运行时鉴权已通过":"后台未托管该凭证，当前仍需检查运行时鉴权状态",n={label:i.realAuthReady?"外部管理":"待确认",cls:i.realAuthReady?"badge-success":"badge-warning"};return{activeCredentialName:`${a(s)}<div class="form-hint" style="margin-top:4px;">${a(r)}</div>`,credentialHealth:i.credentialComplete?i.realAuthReady?"运行时外部凭证字段完整，鉴权探针已通过":"运行时外部凭证字段完整，但鉴权探针尚未通过":"运行时外部凭证已注入，但缺少关键字段，请检查运行时配置",credentialExpiry:n,credentialExpiryColor:i.realAuthReady?"var(--success-color)":"var(--warning-color)",credentialExpiryDetail:i.realAuthReady?"后台未托管该凭证，过期时间需在运行时环境中确认":"后台未托管该凭证，过期时间与有效性需在运行时环境中确认",credentialUsage:{label:i.realAuthReady?"运行时已验证":"运行时待验证",detail:i.realAuthReady?"认证探针已通过，但后台列表未托管该凭证":"后台列表未托管该凭证，请结合运行时诊断继续确认"}}}const l=w(void 0);return{activeCredentialName:dt(null,"未配置活跃凭证"),credentialHealth:wt(!1,!1),credentialExpiry:l,credentialExpiryColor:qt(l),credentialExpiryDetail:ot(l,!1),credentialUsage:ct(null)}}async function Nr(e){let t=0;e.innerHTML=`
    <div class="page-header">
      <h2>B站集成</h2>
      <button class="btn" id="bili-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
    </div>

    <!-- Status cards -->
    <div class="stat-grid" id="bili-status-cards">
      <div class="page-loading">加载中...</div>
    </div>

    <!-- Manual poll -->
    <div class="form-card" style="margin-top: 16px;">
      <h3>手动操作</h3>
      <button class="btn btn-primary" id="bili-poll-btn">触发轮询</button>
    </div>

    <!-- Videos -->
    <div class="section-card" style="margin-top: 16px;">
      <div class="section-card-header">
        <h3>视频监控</h3>
        <div class="form-group" style="margin:0;">
          <label class="form-label" for="bili-video-bvid">BVID</label>
          <input type="text" id="bili-video-bvid" class="form-input" placeholder="输入 BVID" />
          <button class="btn btn-primary" id="bili-video-add">添加</button>
        </div>
      </div>
      <div class="filter-bar" style="padding: 0 16px 16px;">
        <div class="form-group">
          <label class="form-label" for="bili-video-poll-filter">轮询状态</label>
          <select id="bili-video-poll-filter" class="form-input">
            <option value="">全部状态</option>
            <option value="true">仅轮询中</option>
            <option value="false">仅已停用</option>
          </select>
        </div>
        <div class="form-group">
          <button class="btn btn-primary" id="bili-video-filter-btn">查询</button>
        </div>
        <div class="form-group">
          <button class="btn" id="bili-video-prev">上一页</button>
        </div>
        <div class="form-group">
          <button class="btn" id="bili-video-next">下一页</button>
        </div>
      </div>
      <div class="form-hint" id="bili-video-summary" style="padding: 0 16px 16px;">加载中...</div>
      <div class="table-wrapper" id="bili-videos-wrapper">
        <div class="page-loading">加载中...</div>
      </div>
    </div>

    <!-- Credentials -->
    <div class="section-card" style="margin-top: 16px;">
      <div class="section-card-header"><h3>凭证管理</h3></div>
      <div class="form-card" style="border:none; box-shadow:none;">
        <div class="form-row">
          <div class="form-group"><label class="form-label" for="cred-name">名称</label><input type="text" id="cred-name" class="form-input" /></div>
          <div class="form-group"><label class="form-label" for="cred-sessdata">SESSDATA</label><input type="text" id="cred-sessdata" class="form-input" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label" for="cred-bili-jct">bili_jct</label><input type="text" id="cred-bili-jct" class="form-input" /></div>
          <div class="form-group"><label class="form-label" for="cred-buvid3">buvid3</label><input type="text" id="cred-buvid3" class="form-input" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label" for="cred-buvid4">buvid4</label><input type="text" id="cred-buvid4" class="form-input" /></div>
          <div class="form-group"><label class="form-label" for="cred-expires">过期时间</label><input type="datetime-local" id="cred-expires" class="form-input" /></div>
        </div>
        <button class="btn btn-primary" id="cred-add">添加凭证</button>
      </div>
      <div class="filter-bar" style="padding: 0 16px 16px;">
        <div class="form-group">
          <label class="form-label" for="bili-cred-active-filter">激活状态</label>
          <select id="bili-cred-active-filter" class="form-input">
            <option value="">全部</option>
            <option value="active">仅激活</option>
            <option value="inactive">仅未激活</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="bili-cred-expiry-filter">过期状态</label>
          <select id="bili-cred-expiry-filter" class="form-input">
            <option value="">全部</option>
            <option value="expired">已过期</option>
            <option value="expiring">即将过期</option>
            <option value="valid">有效期内</option>
            <option value="unset">未设置过期时间</option>
          </select>
        </div>
      </div>
      <div class="form-hint" id="bili-cred-summary" style="padding: 0 16px 16px;">加载中...</div>
      <div class="table-wrapper" id="bili-creds-wrapper">
        <div class="page-loading">加载中...</div>
      </div>
    </div>
  `;async function i(){var n,c,o,p,u,v,m,$;const r=e.querySelector("#bili-status-cards");r.innerHTML='<div class="page-loading">加载中...</div>';try{const[g,b]=await Promise.allSettled([H.getBilibiliStatus(),H.getReadinessStatus()]);if(g.status!=="fulfilled")throw g.reason;const y=g.value,_=b.status==="fulfilled"&&b.value&&typeof b.value=="object"&&!Array.isArray(b.value)?b.value:null,A=b.status==="rejected"?j(b.reason):"",x=Number((y==null?void 0:y.video_count)??0),C=Number(((n=y==null?void 0:y.videos)==null?void 0:n.poll_enabled_count)??0),q=Math.max(0,x-C),L=Ii(x,C),B=xt(C,x),E=xt(q,x,"停用占比"),I=!!((c=y==null?void 0:y.diagnostics)!=null&&c.ready),S=Li((o=y==null?void 0:y.diagnostics)==null?void 0:o.blocking_reasons),N=Pr(y),ae=N.activeCredentialName,X=N.credentialHealth,ne=Pi(y==null?void 0:y.diagnostics),D=Ti((p=y==null?void 0:y.diagnostics)==null?void 0:p.effective_publish_mode),V=Ni(y==null?void 0:y.diagnostics),J=tt(y==null?void 0:y.enabled,"B 站集成已启用，可管理凭证与视频","B 站集成已停用，当前不会触发轮询或发布"),ee=tt(y==null?void 0:y.polling_enabled,"评论轮询已启用，会按配置自动抓取评论","评论轮询已停用，仅支持手动同步"),oe=tt(y==null?void 0:y.publish_enabled,"发布链路已启用，满足条件后可进入发布流程","发布链路已停用，不会进入自动发布流程"),de=Mi((u=y==null?void 0:y.config)==null?void 0:u.poll_interval_seconds),te=Ai((v=y==null?void 0:y.config)==null?void 0:v.poll_interval_seconds),ce=Bi((m=y==null?void 0:y.config)==null?void 0:m.rate_limit_per_minute),K=ji(($=y==null?void 0:y.config)==null?void 0:$.rate_limit_per_minute),ue=N.credentialExpiry,ie=N.credentialExpiryDetail,F=N.credentialUsage,_e=N.credentialExpiryColor,pe=Et(_==null?void 0:_.foundation_ready),be=Et(_==null?void 0:_.delivery_ready),ve=Pe(_==null?void 0:_.foundation_blockers),ye=Pe(_==null?void 0:_.delivery_blockers),z=Pe(_==null?void 0:_.delivery_capability_blockers),re=Ar(_).filter(Y=>Y.status!=="configured"&&Y.status!=="inactive"),xe=ve.length>0?ve.join(", "):"无",G=ye.length>0?ye.join(", "):"无",le=z.length>0?z.join(", "):"无",Se=_?re.length>0?re.map(Y=>Br(Y)).join("； "):"无":"readiness_unavailable",we=A||re.length>0?"page-error":"form-hint",me=jr(y==null?void 0:y.diagnostics);r.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${y!=null&&y.enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${a(J)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询</div>
          <div class="stat-value">${y!=null&&y.polling_enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${a(ee)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布</div>
          <div class="stat-value">${y!=null&&y.publish_enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${a(oe)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">视频数</div>
          <div class="stat-value">${x}</div>
          <div class="form-hint" style="margin-top:6px;">${a(L)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${C}</div>
          <div class="form-hint" style="margin-top:6px;">${a(B)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">停用视频</div>
          <div class="stat-value">${q}</div>
          <div class="form-hint" style="margin-top:6px;">${a(E)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${ae}</div>
          <div class="form-hint" style="margin-top:6px;">${a(X)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${I?"var(--success-color)":"var(--danger-color)"}">${I?"就绪":"阻塞"}</div>
          <div class="form-hint" style="margin-top:6px;">${a(ne)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">基础就绪</div>
          <div class="stat-value" style="color:${pe.color}">${pe.label}</div>
          <div class="form-hint" style="margin-top:6px;">${a(`blockers: ${xe}`)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">交付就绪</div>
          <div class="stat-value" style="color:${be.color}">${be.label}</div>
          <div class="form-hint" style="margin-top:6px;">${a(`blockers: ${G}`)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">能力阻塞</div>
          <div class="stat-value" style="color:${z.length>0?"var(--danger-color)":"var(--success-color)"}">${_?z.length:"N/A"}</div>
          <div class="form-hint" style="margin-top:6px;">${a(`canonical: ${_?le:"readiness_unavailable"}`)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布模式</div>
          <div class="stat-value">${a(D)}</div>
          <div class="form-hint" style="margin-top:6px;">${a(V)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询间隔</div>
          <div class="stat-value">${a(de)}</div>
          ${te?`<div class="form-hint" style="margin-top:6px;">${a(te)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">速率限制</div>
          <div class="stat-value">${a(ce)}</div>
          ${K?`<div class="form-hint" style="margin-top:6px;">${a(K)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">凭证过期</div>
          <div class="stat-value" style="font-size:14px; color:${_e}">${a(ue.label)}</div>
          ${ie?`<div class="form-hint" style="margin-top:6px;">${a(ie)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">最近使用</div>
          <div class="stat-value" style="font-size:14px;">${a(F.label)}</div>
          ${F.detail?`<div class="form-hint" style="margin-top:6px;">${a(F.detail)}</div>`:""}
        </div>
        ${S?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">当前阻塞原因: ${a(S)}</div>`:""}
        ${me?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">原生认证探针: ${a(me)}</div>`:""}
        ${A?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">Readiness 状态加载失败: ${a(A)}</div>`:""}
        <div class="${we}" style="grid-column: 1 / -1; margin: 0;">
          关键缺失项: ${a(Se)}
        </div>
      `}catch(g){r.innerHTML=`<div class="page-error">状态加载失败: ${a(j(g))}</div>`}}async function l(){const r=e.querySelector("#bili-videos-wrapper"),n=e.querySelector("#bili-video-summary"),c=e.querySelector("#bili-video-filter-btn"),o=e.querySelector("#bili-video-poll-filter"),p=e.querySelector("#bili-video-prev"),u=e.querySelector("#bili-video-next"),v=o.value;n.textContent="加载中...",r.innerHTML='<div class="page-loading">加载中...</div>',o.disabled=!0,c.disabled=!0,p.disabled=!0,u.disabled=!0;try{const m=await H.getBilibiliVideos({limit:ge,offset:t,poll_enabled:Oi(v)}),$=Array.isArray(m==null?void 0:m.items)?m.items:Array.isArray(m)?m:[],g=Number((m==null?void 0:m.total)??$.length);if($.length===0&&g>0&&t>0){t=Math.max(0,t-ge),await l();return}if(n.textContent=_r(g,$.length,v,t,ge,$),p.disabled=t<=0,u.disabled=t+$.length>=g,$.length===0){r.innerHTML=`<div class="table-empty">${a(Di(v))}</div>`;return}r.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${$.map(b=>`<tr data-id="${a(b.id||b.video_id)}">
              <td class="cell-id">${vr(b)}</td>
              <td class="cell-truncate">${mr(b)}</td>
              <td>${gr(b)}</td>
              <td>${hr(b)}</td>
              <td class="cell-time">${$r(b)}</td>
              <td>${Ri(b)}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${a(b.id||b.video_id)}">${b.poll_enabled?"禁用轮询":"启用轮询"}</button>
                ${fr(b)}
                <button class="btn btn-sm btn-danger bili-delete" data-id="${a(b.id||b.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,r.querySelectorAll(".bili-toggle-poll").forEach(b=>{b.addEventListener("click",async()=>{b.disabled=!0;try{await H.toggleBilibiliVideoPoll(b.dataset.id),f("操作成功","success"),await Promise.all([i(),l()])}catch(y){f(`失败: ${j(y)}`,"error")}finally{b.disabled=!1}})}),r.querySelectorAll(".bili-sync").forEach(b=>{b.addEventListener("click",async()=>{if(b.dataset.hasAid==="false"){f($e.no_aid,"warning");return}const y=b.textContent;b.disabled=!0,b.textContent="同步中...";try{const _=await H.syncBilibiliVideo(b.dataset.id);f(St(_==null?void 0:_.result,{subject:"同步"}),"success"),await Promise.all([i(),l()])}catch(_){f(`同步失败: ${j(_)}`,"error")}finally{b.disabled=!1,b.textContent=y}})}),r.querySelectorAll(".bili-delete").forEach(b=>{b.addEventListener("click",async()=>{if(confirm("确定删除此视频？")){b.disabled=!0;try{await H.deleteBilibiliVideo(b.dataset.id),f("已删除","success"),await Promise.all([i(),l()])}catch(y){f(`删除失败: ${j(y)}`,"error")}finally{b.disabled=!1}}})})}catch(m){n.textContent="视频加载失败",r.innerHTML=`<div class="page-error">加载失败: ${a(j(m))}</div>`}finally{o.disabled=!1,c.disabled=!1}}async function s(){const r=e.querySelector("#bili-creds-wrapper"),n=e.querySelector("#bili-cred-summary"),c=e.querySelector("#bili-cred-active-filter"),o=e.querySelector("#bili-cred-expiry-filter"),p=c.value,u=o.value;n.textContent="加载中...",r.innerHTML='<div class="page-loading">加载中...</div>',c.disabled=!0,o.disabled=!0;try{const v=await H.getBilibiliCredentials(),m=Array.isArray(v==null?void 0:v.items)?v.items:Array.isArray(v)?v:[],$=Rt(m,p,u);if(n.textContent=Er(m,p,u,$.length),$.length===0){r.innerHTML=`<div class="table-empty">${a(Lr(p,u))}</div>`;return}r.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期状态</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${$.map(g=>`<tr data-id="${a(g.id||g.credential_id)}">
              <td>${dt(g)}</td>
              <td class="cell-id">${Cr(g)}</td>
              <td>${kr(g)}</td>
              <td>${Sr(g.expires_at)}</td>
              <td class="cell-time">${wr(g)}</td>
              <td class="cell-actions">
                ${g.is_active||g.active?"":`<button class="btn btn-sm cred-activate" data-id="${a(g.id||g.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${a(g.id||g.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,r.querySelectorAll(".cred-activate").forEach(g=>{g.addEventListener("click",async()=>{g.disabled=!0;try{await H.activateBilibiliCredential(g.dataset.id),f("已激活","success"),await Promise.all([i(),s()])}catch(b){f(`激活失败: ${j(b)}`,"error")}finally{g.disabled=!1}})}),r.querySelectorAll(".cred-delete").forEach(g=>{g.addEventListener("click",async()=>{if(confirm("确定删除此凭证？")){g.disabled=!0;try{await H.deleteBilibiliCredential(g.dataset.id),f("已删除","success"),await Promise.all([i(),s()])}catch(b){f(`删除失败: ${j(b)}`,"error")}finally{g.disabled=!1}}})})}catch(v){n.textContent="凭证加载失败",r.innerHTML=`<div class="page-error">加载失败: ${a(j(v))}</div>`}finally{c.disabled=!1,o.disabled=!1}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const r=e.querySelector("#bili-video-add"),n=e.querySelector("#bili-video-bvid").value.trim(),c=qi(n);if(c){f(j(c),"warning");return}r.disabled=!0,r.textContent="添加中...";try{await H.addBilibiliVideo(n),f("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([i(),l()])}catch(o){f(`添加失败: ${j(o)}`,"error")}finally{r.disabled=!1,r.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{var p;const r=e.querySelector("#cred-add"),n=Ei(e.querySelector("#cred-expires").value),c={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:n},o=Ci(c);if(o){f(j(o),"warning");return}r.disabled=!0,r.textContent="添加中...";try{const u=await H.addBilibiliCredential(c);f((p=u==null?void 0:u.item)!=null&&p.is_active?"凭证添加成功，已自动激活":"凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([i(),s()])}catch(u){f(`添加失败: ${j(u)}`,"error")}finally{r.disabled=!1,r.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const r=e.querySelector("#bili-poll-btn");r.disabled=!0,r.textContent="轮询中...";try{const n=await H.triggerBilibiliPoll();f(St(n==null?void 0:n.result),"success"),await Promise.all([i(),l()])}catch(n){f(`轮询失败: ${j(n)}`,"error")}finally{r.disabled=!1,r.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",async()=>{const r=e.querySelector("#bili-refresh");r.disabled=!0,r.textContent="刷新中...";try{await Promise.all([i(),l(),s()])}finally{r.disabled=!1,r.innerHTML='<svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新'}}),e.querySelector("#bili-video-filter-btn").addEventListener("click",()=>{t=0,l()}),e.querySelector("#bili-video-poll-filter").addEventListener("change",()=>{t=0,l()}),e.querySelector("#bili-video-prev").addEventListener("click",()=>{t<=0||(t=Math.max(0,t-ge),l())}),e.querySelector("#bili-video-next").addEventListener("click",()=>{t+=ge,l()}),e.querySelector("#bili-cred-active-filter").addEventListener("change",s),e.querySelector("#bili-cred-expiry-filter").addEventListener("change",s),Ct(e,["#bili-video-bvid"],"#bili-video-add"),Ct(e,["#cred-name","#cred-sessdata","#cred-bili-jct","#cred-buvid3","#cred-buvid4","#cred-expires"],"#cred-add"),await Promise.all([i(),l(),s()])}const rt=P(),lt="query_recent_comment_ids",st="query_recent_job_ids",Hr=5;function Ot(e){try{const t=JSON.parse(sessionStorage.getItem(e)||"[]");return Array.isArray(t)?t.filter(i=>typeof i=="string"&&i.trim()!==""):[]}catch{return[]}}function Lt(e,t){const i=String(t||"").trim();if(!i)return;const l=Ot(e).filter(s=>s!==i);l.unshift(i),sessionStorage.setItem(e,JSON.stringify(l.slice(0,Hr)))}async function Tt(e){var l;const t=JSON.stringify(e,null,2),i=(l=globalThis.navigator)==null?void 0:l.clipboard;return i&&typeof i.writeText=="function"?(await i.writeText(t),!0):!1}function Mt(e){const t=Object.entries(e||{});return t.length===0?'<div class="table-empty">未返回可展示字段</div>':`
    <div class="detail-card">
      ${t.map(([i,l])=>`
        <div class="detail-row">
          <span class="detail-key">${a(i)}</span>
          <span class="detail-value">${a(typeof l=="object"?JSON.stringify(l,null,2):String(l??"-"))}</span>
        </div>
      `).join("")}
    </div>
  `}function At(e){return String((e==null?void 0:e.canonical_comment_id)||(e==null?void 0:e.comment_id)||(e==null?void 0:e.id)||"").trim()}async function Rr(e){e.innerHTML=`
    <div class="page-header"><h2>查询 / 评论浏览</h2></div>

    <div class="section-grid">
      <div class="section-card">
        <div class="section-card-header"><h3>评论详情查询</h3></div>
        <div style="padding: 16px;">
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="query-comment-id">Comment ID</label>
              <input type="text" id="query-comment-id" class="form-input" placeholder="输入 Comment ID" />
            </div>
            <div class="form-group">
              <button class="btn btn-primary" id="query-comment-btn">查询评论</button>
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" id="query-comment-clear">清空</button>
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" id="query-comment-copy" disabled>复制JSON</button>
            </div>
          </div>
          <div id="query-comment-meta" class="form-hint" style="margin-bottom:8px;"></div>
          <div id="query-comment-recent" class="form-hint" style="margin-bottom:8px;"></div>
          <div id="query-comment-result"></div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-card-header"><h3>任务详情查询</h3></div>
        <div style="padding: 16px;">
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="query-job-id">Job ID</label>
              <input type="text" id="query-job-id" class="form-input" placeholder="输入 Job ID" />
            </div>
            <div class="form-group">
              <button class="btn btn-primary" id="query-job-btn">查询任务</button>
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" id="query-job-clear">清空</button>
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" id="query-job-copy" disabled>复制JSON</button>
            </div>
          </div>
          <div id="query-job-meta" class="form-hint" style="margin-bottom:8px;"></div>
          <div id="query-job-recent" class="form-hint" style="margin-bottom:8px;"></div>
          <div id="query-job-result"></div>
        </div>
      </div>

      <div class="section-card" style="grid-column: 1 / -1;">
        <div class="section-card-header"><h3>最近评论浏览</h3></div>
        <div style="padding: 16px;">
          <div class="filter-bar" style="margin-bottom: 12px; padding: 0; background: transparent; box-shadow: none;">
            <div class="form-group">
              <label class="form-label" for="query-comments-limit">数量</label>
              <input type="number" id="query-comments-limit" class="form-input" value="10" min="1" max="100" />
            </div>
            <div class="form-group">
              <label class="form-label" for="query-comments-offset">偏移</label>
              <input type="number" id="query-comments-offset" class="form-input" value="0" min="0" max="10000" />
            </div>
            <div class="form-group">
              <button class="btn btn-primary" id="query-comments-load">刷新评论列表</button>
            </div>
          </div>
          <div id="query-comments-meta" class="form-hint" style="margin-bottom:8px;"></div>
          <div id="query-comments-wrapper"><div class="page-loading">加载中...</div></div>
        </div>
      </div>
    </div>
  `;const t=e.querySelector("#query-comment-id"),i=e.querySelector("#query-comment-result"),l=e.querySelector("#query-comment-meta"),s=e.querySelector("#query-comment-recent"),r=e.querySelector("#query-comment-copy");let n=null;const c=e.querySelector("#query-job-id"),o=e.querySelector("#query-job-result"),p=e.querySelector("#query-job-meta"),u=e.querySelector("#query-job-recent"),v=e.querySelector("#query-job-copy");let m=null;const $=e.querySelector("#query-comments-meta"),g=e.querySelector("#query-comments-wrapper");function b(x,C,q){const L=Ot(C);if(L.length===0){x.textContent="";return}x.innerHTML=`
      最近查询：
      ${L.map(B=>`<button class="btn btn-link" data-query-id="${a(B)}" type="button">${a(B)}</button>`).join("")}
    `,x.querySelectorAll("[data-query-id]").forEach(B=>{B.addEventListener("click",()=>q(B.dataset.queryId||""))})}async function y(x=""){const C=(x||t.value).trim();if(t.value=C,!C){f("请输入 Comment ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>',r.disabled=!0;try{n=await rt.getComment(C)||{},r.disabled=!1,i.innerHTML=Mt(n),l.textContent=`查询成功，共 ${Object.keys(n).length} 个字段`,Lt(lt,C),b(s,lt,y)}catch(q){n=null,i.innerHTML=`<div class="page-error">查询失败: ${a(q.message)}</div>`,l.textContent=""}}async function _(x=""){const C=(x||c.value).trim();if(c.value=C,!C){f("请输入 Job ID","warning");return}o.innerHTML='<div class="page-loading">查询中...</div>',v.disabled=!0;try{m=await rt.getJob(C)||{},v.disabled=!1,o.innerHTML=`
        ${Mt(m)}
        ${m!=null&&m.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${a(m.comment_id)}">查看关联评论 →</a></div>`:""}
      `,p.textContent=`查询成功，共 ${Object.keys(m).length} 个字段`,Lt(st,C),b(u,st,_);const L=o.querySelector("#query-goto-comment");L&&L.addEventListener("click",()=>{y(L.dataset.id)})}catch(q){m=null,o.innerHTML=`<div class="page-error">查询失败: ${a(q.message)}</div>`,p.textContent=""}}async function A(){const x=e.querySelector("#query-comments-limit").value,C=e.querySelector("#query-comments-offset").value;g.innerHTML='<div class="page-loading">加载中...</div>',$.textContent="";try{const q=await rt.getComments({limit:x,offset:C}),L=Array.isArray(q==null?void 0:q.items)?q.items:[],B=Number((q==null?void 0:q.total)??L.length)||L.length;if($.textContent=`返回 ${L.length} / ${B} 条评论`,L.length===0){g.innerHTML='<div class="table-empty">暂无评论</div>';return}g.innerHTML=nt({columns:[{key:"comment_id",label:"Comment ID",class:"cell-id",render:E=>a(At(E).substring(0,18)||"-")},{key:"platform",label:"平台",render:E=>a(E.platform||"-")},{key:"source",label:"来源",render:E=>a(E.source||"-")},{key:"content",label:"评论内容",class:"cell-truncate",render:E=>a((E.content||"-").toString().substring(0,80))},{key:"created_at",label:"时间",class:"cell-time",render:E=>R(E.created_at)},{key:"actions",label:"操作",class:"cell-actions",render:E=>{const I=At(E);return I?`<button class="btn btn-sm query-comment-open" data-comment-id="${a(I)}" type="button">查看详情</button>`:'<span class="form-hint">缺少 ID</span>'}}],rows:L}),g.querySelectorAll(".query-comment-open").forEach(E=>{E.addEventListener("click",()=>{const I=E.dataset.commentId||"";t.value=I,y(I)})})}catch(q){g.innerHTML=`<div class="page-error">加载失败: ${a(q.message)}</div>`}}e.querySelector("#query-comment-btn").addEventListener("click",()=>{y()}),e.querySelector("#query-job-btn").addEventListener("click",()=>{_()}),e.querySelector("#query-comments-load").addEventListener("click",A),t.addEventListener("keydown",x=>{x.key==="Enter"&&y()}),c.addEventListener("keydown",x=>{x.key==="Enter"&&_()}),e.querySelector("#query-comment-clear").addEventListener("click",()=>{t.value="",n=null,r.disabled=!0,l.textContent="",i.innerHTML=""}),e.querySelector("#query-job-clear").addEventListener("click",()=>{c.value="",m=null,v.disabled=!0,p.textContent="",o.innerHTML=""}),r.addEventListener("click",async()=>{if(!n){f("暂无可复制的评论查询结果","warning");return}const x=await Tt(n);f(x?"评论查询结果已复制":"当前环境不支持复制，请手动复制",x?"success":"warning")}),v.addEventListener("click",async()=>{if(!m){f("暂无可复制的任务查询结果","warning");return}const x=await Tt(m);f(x?"任务查询结果已复制":"当前环境不支持复制，请手动复制",x?"success":"warning")}),b(s,lt,y),b(u,st,_),await A()}const at={dashboard:{render:Nt,title:"仪表盘"},jobs:{render:ii,title:"任务管理"},"daily-metrics":{render:li,title:"每日指标"},knowledge:{render:si,title:"知识库"},memory:{render:ci,title:"Memory 管理"},"role-cards":{render:ui,title:"角色卡"},profiles:{render:pi,title:"风格配置"},"pet-core":{render:fi,title:"宠物核心"},connections:{render:hi,title:"平台连接"},gateway:{render:$i,title:"网关"},audit:{render:_i,title:"审计日志"},bilibili:{render:Nr,title:"B站集成"},query:{render:Rr,title:"查询"}};let Dt=null;function Or(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function Ut(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function Vt(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function Dr(e){e.preventDefault();const t=document.getElementById("login-api-key"),i=document.getElementById("login-error"),l=t.value.trim();if(l){window.__ADMIN_API_KEY__=l;try{await h("/api/admin/overview"),sessionStorage.setItem("admin_api_key",l),Vt(),yt("dashboard")}catch{i.textContent="API Key 无效或服务不可用",i.style.display="block",window.__ADMIN_API_KEY__=""}}}function Ur(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",Ut()}function yt(e){if(!at[e])return;Dt=e,document.querySelectorAll("#nav-list .nav-item").forEach(i=>{i.classList.toggle("active",i.dataset.page===e)}),document.getElementById("page-title").textContent=at[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',at[e].render(t).catch(i=>{t.innerHTML=`<div class="page-error">加载失败: ${i.message}</div>`})}function Vr(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==Dt&&yt(t)})})}function Jr(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),i=document.getElementById("expand-left-btn");t&&i&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),i.style.display="block"}),i.addEventListener("click",()=>{e.classList.remove("collapsed"),i.style.display="none"}))}function Wr(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let i=0;e.addEventListener("click",()=>{i=(i+1)%t.length,t[i]?document.body.setAttribute("data-theme",t[i]):document.body.removeAttribute("data-theme")})}function Kr(){Jr(),Wr(),Vr(),document.getElementById("login-form").addEventListener("submit",Dr),document.getElementById("logout-btn").addEventListener("click",Ur),Or()?(Vt(),yt("dashboard")):Ut()}Kr();
