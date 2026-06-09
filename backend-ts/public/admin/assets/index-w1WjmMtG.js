(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))l(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const n of r.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&l(n)}).observe(document,{childList:!0,subtree:!0});function i(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function l(s){if(s.ep)return;s.ep=!0;const r=i(s);fetch(s.href,r)}})();function ii(e,t,i){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof i=="string"&&i.trim()?i.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function Ht(){return(window.__ADMIN_API_KEY__||"").trim()}function Ot(){return(window.__ADMIN_SESSION_TOKEN__||"").trim()}async function $(e,t={}){const i=Ot(),l=Ht(),s=new Headers(t.headers||{});i&&s.set("x-admin-session",i),l&&s.set("x-api-key",l);const r=await fetch(e,{...t,headers:s}),n=await r.json().catch(()=>({}));if(!r.ok){const u=(n==null?void 0:n.detail)||(n==null?void 0:n.error);throw new Error(ii(u,r.status,r.statusText))}return n}async function _t(e,t){const i=Ot(),l=Ht(),s=new Headers;i&&s.set("x-admin-session",i),l&&s.set("x-api-key",l);const r=await fetch(e,{headers:s});if(!r.ok)throw new Error("download_failed");const n=await r.blob(),u=URL.createObjectURL(n),o=document.createElement("a");o.href=u,o.download=t,document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(u)}function M(e){const t=new URLSearchParams;for(const[l,s]of Object.entries(e))s!=null&&s!==""&&t.set(l,String(s));const i=t.toString();return i?`?${i}`:""}function P(){return{getOverview(){return $("/api/admin/overview")},getMetricsOverview(){return $("/api/admin/metrics/overview")},getPetOverview(){return $("/api/admin/pet/overview")},recordPetAction(e,t){return $("/api/admin/pet/actions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:e,note:t})})},getPlatformConnections(){return $("/api/admin/platforms")},setPlatformConnectionControl(e,t){return $(`/api/admin/platforms/${encodeURIComponent(e)}/control`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:t})})},getObservabilitySummary({windowMinutes:e,window_minutes:t}={}){return $(`/api/admin/observability/summary${M({window_minutes:e??t})}`)},getJobs({status:e,limit:t}={}){return $(`/api/admin/jobs${M({status:e,limit:t})}`)},getJob(e){return $(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return $(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return $(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return $("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return $("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return _t(`/export/jobs.csv${M({status:e,limit:t})}`,"jobs.csv")},getComments({limit:e,offset:t}={}){return $(`/comments${M({limit:e,offset:t})}`)},getComment(e){return $(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,commentId:t,comment_id:i}={}){return $(`/api/admin/gateway/logs${M({limit:e,comment_id:t??i})}`)},getGatewayPublishLogs({limit:e,offset:t,status:i}={}){return $(`/gateway/publish-logs${M({limit:e,offset:t,status:i})}`)},publishGatewayReply(e){return $("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},publishPlatformReply(e,t){return $(`/gateway/publish/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},getAuditSummary({days:e,action:t,ok:i}={}){return $(`/api/admin/audit/summary${M({days:e,action:t,ok:i})}`)},getAuditLogs({limit:e,action:t,ok:i}={}){return $(`/api/audit-log${M({limit:e,action:t,ok:i})}`)},exportAuditCsv({limit:e,action:t,ok:i}={}){return _t(`/export/audit-logs.csv${M({limit:e,action:t,ok:i})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return $(`/api/metrics/daily${M({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return $(`/api/admin/knowledge${M({limit:e,offset:t})}`)},createKnowledgeEntry(e){return $("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return $(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getMemorySpaces({limit:e,offset:t,space_type:i,subject_type:l,subject_id:s}={}){return $(`/api/admin/memory/spaces${M({limit:e,offset:t,space_type:i,subject_type:l,subject_id:s})}`)},createMemorySpace(e){return $("/api/admin/memory/spaces",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getMemoryItems({limit:e,offset:t,space_id:i,item_key:l,content_type:s,source:r}={}){return $(`/api/admin/memory/items${M({limit:e,offset:t,space_id:i,item_key:l,content_type:s,source:r})}`)},upsertMemoryItem(e){return $("/api/admin/memory/items",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getMemoryGrants({limit:e,offset:t,space_id:i,subject_type:l,subject_id:s}={}){return $(`/api/admin/memory/grants${M({limit:e,offset:t,space_id:i,subject_type:l,subject_id:s})}`)},grantMemorySpaceAccess(e){return $("/api/admin/memory/grants",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getMemoryIdentityLinks({limit:e,offset:t,subject_type:i,subject_id:l,platform:s,external_id:r}={}){return $(`/api/admin/memory/identity-links${M({limit:e,offset:t,subject_type:i,subject_id:l,platform:s,external_id:r})}`)},linkMemoryIdentity(e){return $("/api/admin/memory/identity-links",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getRoleCards({limit:e,offset:t}={}){return $(`/api/admin/role-cards${M({limit:e,offset:t})}`)},createRoleCard(e){return $("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return $(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return $(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return $(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return $("/api/admin/style-profile")},setStyleProfile(e){return $("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return $("/api/admin/role-profile")},setRoleProfile(e){return $("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return $("/api/admin/bilibili/status")},getReadinessStatus(){return $("/readiness")},getBilibiliVideos({poll_enabled:e,limit:t,offset:i}={}){return $(`/api/admin/bilibili/videos${M({poll_enabled:e,limit:t,offset:i})}`)},addBilibiliVideo(e){return $("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return $(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return $(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return $(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return $("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return $("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return $("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return $(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return $(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function a(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function U(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function vt(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const i=Date.now()-t.getTime(),l=Math.floor(i/1e3);if(l<60)return"刚刚";const s=Math.floor(l/60);if(s<60)return`${s}分钟前`;const r=Math.floor(s/60);if(r<24)return`${r}小时前`;const n=Math.floor(r/24);if(n<30)return`${n}天前`;const u=Math.floor(n/30);return u<12?`${u}个月前`:`${Math.floor(u/12)}年前`}catch{return""}}function O(e){const t=vt(e),i=U(e);return t?`<span title="${a(i)}">${a(t)}</span>`:`<span title="${a(i)}">${a(i)}</span>`}function K(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}function ct(e){if(!e||typeof e!="object")return"-";const t=typeof e.platform=="string"?e.platform.trim().toLowerCase():"",i=typeof e.container_id=="string"?e.container_id.trim():"",l=typeof e.user_id=="string"?e.user_id.trim():"",s=typeof e.parent_external_id=="string"?e.parent_external_id.trim():"",r=typeof e.chat_type=="string"?e.chat_type.trim().toLowerCase():"",n=[];return t==="qq"?r==="group"&&i?n.push(`QQ群 ${i}`):r==="private"&&l?n.push(`QQ私聊 ${l}`):i&&n.push(`QQ容器 ${i}`):i&&n.push(`容器 ${i}`),!n.length&&l?n.push(`用户 ${l}`):n.length&&l&&!(t==="qq"&&r==="private")&&n.push(`用户 ${l}`),s&&n.push(`回复 ${s}`),n.length?n.join(" / "):"-"}const ri={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function He(e){if(!e)return"";const t=ri[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${a(t.label)}</span>`}function ft(e,t="是",i="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${a(e?t:i)}</span>`}let tt=null;function f(e,t="info"){const i=document.getElementById("app-toast");i&&i.remove(),tt&&clearTimeout(tt);const l={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},s=document.createElement("div");s.id="app-toast",s.className="toast-notification",s.style.setProperty("--toast-color",l[t]||l.info),s.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(s),requestAnimationFrame(()=>s.classList.add("show"));const r=()=>{s.classList.remove("show"),setTimeout(()=>s.remove(),300)};s.querySelector(".toast-close").onclick=r,tt=setTimeout(r,4e3)}const se=P(),li=[{label:"LLM 提供方",keys:["llm_provider","llmProvider"]},{label:"搜索提供方",keys:["search_provider","searchProvider"]},{label:"发布模式",keys:["publisher_mode","publisherMode"]},{label:"LLM Key",keys:["llm_api_key_configured","llmApiKeyConfigured"],format:"configured"},{label:"搜索 Key",keys:["search_api_key_configured","searchApiKeyConfigured"],format:"configured"},{label:"Webhook",keys:["publisher_webhook_url_configured","publisherWebhookUrlConfigured"],format:"configured"},{label:"B站采集",keys:["bilibili_enabled","bilibiliEnabled"],format:"enabled"},{label:"B站发布",keys:["bilibili_publish_enabled","bilibiliPublishEnabled"],format:"enabled"},{label:"Kill Switch",keys:["kill_switch","killSwitch"],format:"enabled"}],si=[{label:"基础就绪",keys:["foundation_ready"],format:"ready"},{label:"交付就绪",keys:["delivery_ready"],format:"ready"},{label:"基础阻塞",keys:["foundation_blockers"],format:"count"},{label:"交付阻塞",keys:["delivery_blockers"],format:"count"},{label:"能力阻塞",keys:["delivery_capability_blockers"],format:"count"}];function Rt(e,t){for(const i of t)if((e==null?void 0:e[i])!==void 0&&(e==null?void 0:e[i])!==null&&(e==null?void 0:e[i])!=="")return e[i]}function Dt(e,t){return t==="configured"?e?"已配置":"未配置":t==="enabled"?e?"开启":"关闭":t==="ready"?e?"就绪":"阻塞":t==="count"?Array.isArray(e)?`${e.length} 项`:String(e??"0"):typeof e=="boolean"?e?"是":"否":String(e)}function ai(e){return li.map(t=>{const i=Rt(e,t.keys);return i===void 0?null:{label:t.label,value:Dt(i,t.format)}}).filter(Boolean)}function ni(e){var i,l;const t=((i=e==null?void 0:e.bilibili_diagnostics)==null?void 0:i.effective_publish_mode)??((l=e==null?void 0:e.delivery_signals)==null?void 0:l.effective_publish_mode)??(e==null?void 0:e.effective_publish_mode);return typeof t=="string"&&t.trim()?t.trim():""}function oi(e){if(!e||typeof e!="object"||Array.isArray(e))return[];const t=si.map(l=>{const s=Rt(e,l.keys);return s===void 0?null:{label:l.label,value:Dt(s,l.format)}}).filter(Boolean),i=ni(e);return i&&t.unshift({label:"发布模式",value:i}),t}function xt(e){return String(e).replace(/([a-z0-9])([A-Z])/g,"$1 $2").replace(/[._]/g," ").replace(/\s+/g," ").trim()}function Ut(e,t=""){if(!e||typeof e!="object"||Array.isArray(e))return[];const i=[];for(const[l,s]of Object.entries(e)){const r=t?`${t}.${l}`:l;if(!(s==null||s==="")){if(typeof s=="object"&&!Array.isArray(s)){i.push(...Ut(s,r));continue}if(Array.isArray(s)){s.length>0&&i.push({label:xt(r),value:`${s.length} 项`});continue}i.push({label:xt(r),value:String(s)})}}return i}function St(e,t){return e.length?`
    <div class="audit-summary-grid">
      ${e.map(i=>`
        <div class="stat-card mini">
          <div class="stat-label">${a(i.label)}</div>
          <div class="stat-value">${a(i.value)}</div>
        </div>
      `).join("")}
    </div>
  `:`<div class="table-empty" style="padding:16px;">${a(t)}</div>`}async function Vt(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,i,l,s,r,n,u]=await Promise.all([se.getOverview().catch(()=>null),se.getJobs({limit:5}).catch(()=>null),se.getGatewayLogs({limit:5}).catch(()=>null),se.getAuditSummary({days:7}).catch(()=>null),se.getMetricsOverview().catch(()=>null),se.getObservabilitySummary({windowMinutes:120}).catch(()=>null),se.getReadinessStatus().catch(()=>null)]),o=t||{},p=Array.isArray(i==null?void 0:i.items)?i.items:[],c=Array.isArray(l==null?void 0:l.items)?l.items:[],g=(()=>{const v=ai(r||{});return v.length>0?v:oi(u||{})})(),y=Ut((n==null?void 0:n.summary)||n||{}).slice(0,6),h=n!=null&&n.ok?"当前窗口暂无可观测数据":"未返回可观测性摘要";e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${K(o.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${K(o.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${K(o.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${K(o.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${K(o.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${K(c.length)}</div>
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
                ${p.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':p.map(v=>{var b,m;return`<tr>
                    <td class="cell-id">${a((b=v.id)==null?void 0:b.substring(0,8))}</td>
                    <td>${He(v.status)}</td>
                    <td class="cell-truncate">${a((m=v.comment_text)==null?void 0:m.substring(0,60))}</td>
                    <td class="cell-time">${a(U(v.created_at))}</td>
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
              <div class="stat-value">${K(s==null?void 0:s.total)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">成功</div>
              <div class="stat-value" style="color:var(--success-color)">${K(s==null?void 0:s.ok_count)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">失败</div>
              <div class="stat-value" style="color:var(--danger-color)">${K(s==null?void 0:s.failed_count)}</div>
            </div>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-header">
            <h3>运行时能力</h3>
          </div>
          ${St(g,"未返回运行时配置摘要")}
        </div>

        <div class="section-card">
          <div class="section-card-header">
            <h3>可观测性摘要 (120分钟)</h3>
          </div>
          ${St(y,h)}
        </div>
      </div>
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{f("正在刷新...","info"),Vt(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${a(t.message)}</div>`}}const fe=P();async function di(e){let t=new Set;e.innerHTML=`
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
  `;const i=e.querySelector("#jobs-status"),l=e.querySelector("#jobs-limit");async function s(){var u;t.clear(),r();const n=e.querySelector("#jobs-table-wrapper");n.innerHTML='<div class="page-loading">加载中...</div>';try{const o=await fe.getJobs({status:i.value,limit:l.value}),p=Array.isArray(o==null?void 0:o.items)?o.items:[];if(p.length===0){n.innerHTML='<div class="table-empty">暂无任务</div>';return}n.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>路由</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${p.map(c=>{var g,y,h,v;return`
              <tr data-id="${a(c.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${a(c.id)}" /></td>
                <td class="cell-id" title="${a(c.id)}">${a((g=c.id)==null?void 0:g.substring(0,8))}</td>
                <td>${He(c.status)}</td>
                <td class="cell-truncate" title="${a(c.comment_text)}">${a((y=c.comment_text)==null?void 0:y.substring(0,80))}</td>
                <td class="cell-truncate" title="${a(ct(c.route_context))}">${a(ct(c.route_context))}</td>
                <td class="cell-truncate">${a((h=c.reply_text)==null?void 0:h.substring(0,60))}</td>
                <td>${(v=c.risk_flags)!=null&&v.length?c.risk_flags.map(b=>`<span class="risk-flag">${a(b)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${O(c.created_at)}</td>
                <td class="cell-actions">
                  ${c.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${a(c.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${a(c.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(u=n.querySelector("#jobs-select-all"))==null||u.addEventListener("change",c=>{const g=c.target.checked;n.querySelectorAll(".job-checkbox").forEach(y=>{y.checked=g,g?t.add(y.dataset.id):t.delete(y.dataset.id)}),r()}),n.querySelectorAll(".job-checkbox").forEach(c=>{c.addEventListener("change",()=>{c.checked?t.add(c.dataset.id):t.delete(c.dataset.id),r()})}),n.querySelectorAll(".job-approve").forEach(c=>{c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="审批中...";try{await fe.approveJob(c.dataset.id),f("审批成功","success"),s()}catch(g){f(`审批失败: ${g.message}`,"error"),c.disabled=!1,c.textContent="审批"}})}),n.querySelectorAll(".job-retry").forEach(c=>{c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="重试中...";try{await fe.retryJob(c.dataset.id),f("重试已提交","success"),s()}catch(g){f(`重试失败: ${g.message}`,"error"),c.disabled=!1,c.textContent="重试"}})})}catch(o){n.innerHTML=`<div class="page-error">加载失败: ${a(o.message)}</div>`}}function r(){const n=e.querySelector("#jobs-batch-bar"),u=e.querySelector("#jobs-selected-count");t.size>0?(n.style.display="flex",u.textContent=`已选 ${t.size} 项`):n.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",s),e.querySelector("#jobs-refresh").addEventListener("click",s),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await fe.exportJobsCsv({status:i.value,limit:l.value}),f("导出成功","success")}catch(n){f(`导出失败: ${n.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await fe.batchApprove([...t]),f(`批量审批 ${t.size} 项成功`,"success"),s()}catch(n){f(`批量审批失败: ${n.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await fe.batchRetry([...t]),f(`批量重试 ${t.size} 项成功`,"success"),s()}catch(n){f(`批量重试失败: ${n.message}`,"error")}}),await s()}const ci=P();async function ui(e){e.innerHTML=`
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
  `;const t=e.querySelector("#metrics-days"),i=e.querySelector("#metrics-summary"),l=e.querySelector("#metrics-table-wrapper");function s(n){const u=Number.parseInt(String(n).trim(),10);return!Number.isFinite(u)||u<1?{value:1,warning:"天数必须在 1-365 之间，已自动调整为 1"}:u>365?{value:365,warning:"最大支持 365 天，已自动调整为 365"}:{value:u,warning:""}}async function r(){const n=s(t.value);t.value=String(n.value),n.warning&&f(n.warning,"warning"),l.innerHTML='<div class="page-loading">加载中...</div>',i.textContent="";try{const u=await ci.getDailyMetrics({days:String(n.value)}),o=Array.isArray(u==null?void 0:u.items)?u.items:Array.isArray(u)?u:[];if(o.length===0){i.textContent=`最近 ${n.value} 天暂无可展示指标`,l.innerHTML='<div class="table-empty">暂无指标数据</div>';return}const p=o.reduce((c,g)=>(c.comments+=Number(g.comments??g.comment_count??0)||0,c.jobs+=Number(g.jobs??g.job_count??0)||0,c.published+=Number(g.published??g.published_count??0)||0,c.failed+=Number(g.failed??g.failed_count??0)||0,c.skipped+=Number(g.skipped??g.skipped_count??0)||0,c),{comments:0,jobs:0,published:0,failed:0,skipped:0});i.textContent=`最近 ${n.value} 天合计：评论 ${p.comments}，任务 ${p.jobs}，已发布 ${p.published}，失败 ${p.failed}，跳过 ${p.skipped}`,l.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${o.map(c=>`<tr>
              <td class="cell-time">${a(c.date||c.day)}</td>
              <td>${a(c.comments??c.comment_count??0)}</td>
              <td>${a(c.jobs??c.job_count??0)}</td>
              <td style="color:var(--success-color)">${a(c.published??c.published_count??0)}</td>
              <td style="color:var(--danger-color)">${a(c.failed??c.failed_count??0)}</td>
              <td>${a(c.skipped??c.skipped_count??0)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      `}catch(u){i.textContent="",l.innerHTML=`<div class="page-error">加载失败: ${a(u.message)}</div>`,f(`加载每日指标失败: ${u.message}`,"error")}}e.querySelector("#metrics-days-7").addEventListener("click",async()=>{t.value="7",await r()}),e.querySelector("#metrics-days-30").addEventListener("click",async()=>{t.value="30",await r()}),e.querySelector("#metrics-days-90").addEventListener("click",async()=>{t.value="90",await r()}),t.addEventListener("keydown",async n=>{n.key==="Enter"&&await r()}),e.querySelector("#metrics-load").addEventListener("click",r),await r()}const it=P();async function pi(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#knowledge-table-wrapper");i.innerHTML='<div class="page-loading">加载中...</div>';try{const l=await it.getKnowledgeEntries({limit:50}),s=Array.isArray(l==null?void 0:l.items)?l.items:[];if(s.length===0){i.innerHTML='<div class="table-empty">暂无知识条目</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${s.map(r=>{var n,u;return`<tr>
              <td class="cell-id">${a((n=r.id)==null?void 0:n.toString().substring(0,8))}</td>
              <td>${a(r.category)}</td>
              <td>${a(r.title)}</td>
              <td class="cell-truncate">${a((u=r.content)==null?void 0:u.substring(0,80))}</td>
              <td>${ft(r.enabled!==!1)}</td>
              <td class="cell-time">${O(r.created_at)}</td>
              <td class="cell-actions">
                ${r.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${a(r.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".knowledge-disable").forEach(r=>{r.addEventListener("click",async()=>{try{await it.disableKnowledgeEntry(r.dataset.id),f("已禁用","success"),t()}catch(n){f(`操作失败: ${n.message}`,"error")}})})}catch(l){i.innerHTML=`<div class="page-error">加载失败: ${a(l.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const i=e.querySelector("#knowledge-category").value.trim(),l=e.querySelector("#knowledge-title").value.trim(),s=e.querySelector("#knowledge-content").value.trim();if(!i||!l||!s){f("分类、标题和内容不能为空","warning");return}try{await it.createKnowledgeEntry({category:i,title:l,content:s}),f("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(r){f(`创建失败: ${r.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const Z=P();function wt(e){return['<option value="">选择空间</option>'].concat(e.map(t=>`<option value="${a(t.id)}">${a(t.title)} (${a(t.space_key)})</option>`)).join("")}function bi(e){return e.length?`
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
              <td class="cell-time">${O(t.updated_at)}</td>
            </tr>`).join("")}
      </tbody>
    </table>
  `:'<div class="table-empty">暂无 memory spaces</div>'}function mi(e){return e.length?`
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
              <td class="cell-time">${O(t.updated_at)}</td>
            </tr>`).join("")}
      </tbody>
    </table>
  `:'<div class="table-empty">暂无 grants</div>'}function yi(e){return e.length?`
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
              <td class="cell-time">${O(t.updated_at)}</td>
            </tr>`).join("")}
      </tbody>
    </table>
  `:'<div class="table-empty">暂无 memory items</div>'}function vi(e){return e.length?`
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
              <td class="cell-time">${O(t.updated_at)}</td>
            </tr>`).join("")}
      </tbody>
    </table>
  `:'<div class="table-empty">暂无 identity links</div>'}async function fi(e){e.innerHTML=`
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
  `;async function t(){const[l,s,r,n]=await Promise.all([Z.getMemorySpaces({limit:50}),Z.getMemoryItems({limit:50}),Z.getMemoryGrants({limit:50}),Z.getMemoryIdentityLinks({limit:50})]),u=Array.isArray(l==null?void 0:l.items)?l.items:[],o=Array.isArray(s==null?void 0:s.items)?s.items:[],p=Array.isArray(r==null?void 0:r.items)?r.items:[],c=Array.isArray(n==null?void 0:n.items)?n.items:[];e.querySelector("#memory-spaces-wrapper").innerHTML=bi(u),e.querySelector("#memory-items-wrapper").innerHTML=yi(o),e.querySelector("#memory-grants-wrapper").innerHTML=mi(p),e.querySelector("#memory-links-wrapper").innerHTML=vi(c),e.querySelector("#memory-grant-space").innerHTML=wt(u),e.querySelector("#memory-item-space").innerHTML=wt(u)}async function i(){try{await t()}catch(l){const s=a(l.message||"未知错误");e.querySelector("#memory-spaces-wrapper").innerHTML=`<div class="page-error">加载失败: ${s}</div>`,e.querySelector("#memory-items-wrapper").innerHTML=`<div class="page-error">加载失败: ${s}</div>`,e.querySelector("#memory-grants-wrapper").innerHTML=`<div class="page-error">加载失败: ${s}</div>`,e.querySelector("#memory-links-wrapper").innerHTML=`<div class="page-error">加载失败: ${s}</div>`}}e.querySelector("#memory-space-create").addEventListener("click",async()=>{const l=e.querySelector("#memory-space-key").value.trim(),s=e.querySelector("#memory-space-type").value.trim(),r=e.querySelector("#memory-space-title").value.trim(),n=e.querySelector("#memory-space-summary").value.trim();if(!l||!r){f("Space Key 和标题不能为空","warning");return}try{await Z.createMemorySpace({space_key:l,space_type:s,title:r,summary:n}),f("Space 创建成功","success"),e.querySelector("#memory-space-key").value="",e.querySelector("#memory-space-title").value="",e.querySelector("#memory-space-summary").value="",await i()}catch(u){f(`创建失败: ${u.message}`,"error")}}),e.querySelector("#memory-item-create").addEventListener("click",async()=>{const l=e.querySelector("#memory-item-space").value,s=e.querySelector("#memory-item-key").value.trim(),r=e.querySelector("#memory-item-type").value.trim(),n=e.querySelector("#memory-item-source").value.trim(),u=e.querySelector("#memory-item-content").value.trim();if(!l||!s||!u){f("Space、Item Key 和内容不能为空","warning");return}try{await Z.upsertMemoryItem({space_id:Number(l),item_key:s,content:u,content_type:r,source:n}),f("Item 保存成功","success"),e.querySelector("#memory-item-key").value="",e.querySelector("#memory-item-content").value="",await i()}catch(o){f(`保存失败: ${o.message}`,"error")}}),e.querySelector("#memory-grant-create").addEventListener("click",async()=>{const l=e.querySelector("#memory-grant-space").value,s=e.querySelector("#memory-grant-subject-type").value.trim(),r=e.querySelector("#memory-grant-subject-id").value.trim(),n=e.querySelector("#memory-grant-access").value.trim();if(!l||!s||!r){f("Space、主体类型和主体 ID 不能为空","warning");return}try{await Z.grantMemorySpaceAccess({space_id:Number(l),subject_type:s,subject_id:r,access_level:n}),f("Grant 创建成功","success"),e.querySelector("#memory-grant-subject-id").value="",await i()}catch(u){f(`创建失败: ${u.message}`,"error")}}),e.querySelector("#memory-link-create").addEventListener("click",async()=>{const l=e.querySelector("#memory-link-subject-type").value.trim(),s=e.querySelector("#memory-link-subject-id").value.trim(),r=e.querySelector("#memory-link-platform").value.trim(),n=e.querySelector("#memory-link-external-id").value.trim(),u=e.querySelector("#memory-link-display-name").value.trim();if(!l||!s||!n){f("主体类型、主体 ID 和外部 ID 不能为空","warning");return}try{await Z.linkMemoryIdentity({subject_type:l,subject_id:s,platform:r,external_id:n,display_name:u}),f("Identity Link 创建成功","success"),e.querySelector("#memory-link-external-id").value="",e.querySelector("#memory-link-display-name").value="",await i()}catch(o){f(`创建失败: ${o.message}`,"error")}}),e.querySelector("#memory-refresh").addEventListener("click",i),await i()}const qe=P();let ke=!1,A=null;async function gi(e){ke=!1,A=null,e.innerHTML=`
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
  `;const t=e.querySelector("#rc-select"),i=e.querySelector("#rc-editor");let l=[];function s(){ke=!0}function r(){return ke?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function n(o){A=o,e.querySelector("#rc-key").value=(o==null?void 0:o.key)||"",e.querySelector("#rc-key").disabled=!!o,e.querySelector("#rc-name").value=(o==null?void 0:o.name)||"",e.querySelector("#rc-desc").value=(o==null?void 0:o.description)||"",e.querySelector("#rc-system-prompt").value=(o==null?void 0:o.system_prompt)||"",e.querySelector("#rc-tone").value=(o==null?void 0:o.tone)||"",e.querySelector("#rc-constraints").value=typeof(o==null?void 0:o.constraints)=="string"?o.constraints:JSON.stringify((o==null?void 0:o.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=o?`编辑: ${o.name||o.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=o&&o.enabled===!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=o&&o.enabled!==!1?"inline-flex":"none",i.style.display="block",ke=!1}i.querySelectorAll(".form-input").forEach(o=>o.addEventListener("input",s));async function u(){try{const o=await qe.getRoleCards({limit:100});l=Array.isArray(o==null?void 0:o.items)?o.items:Array.isArray(o)?o:[],t.innerHTML='<option value="">-- 新建 --</option>'+l.map(p=>`<option value="${a(p.key)}">${a(p.name||p.key)}${p.enabled===!1?" (禁用)":""}</option>`).join("")}catch(o){f(`加载失败: ${o.message}`,"error")}}t.addEventListener("change",()=>{if(!r()){t.value=(A==null?void 0:A.key)||"";return}const o=t.value,p=l.find(c=>c.key===o);n(p||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{r()&&(t.value="",n(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const o={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},p=e.querySelector("#rc-constraints").value.trim();try{o.constraints=p?JSON.parse(p):""}catch{o.constraints=p}if(!o.key){f("Key 不能为空","warning");return}try{A!=null&&A.key?(await qe.updateRoleCard(A.key,o),f("保存成功","success")):(await qe.createRoleCard(o),f("创建成功","success")),ke=!1,await u(),t.value=o.key}catch(c){f(`操作失败: ${c.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(A!=null&&A.key)try{await qe.activateRoleCard(A.key),f("已激活","success"),await u()}catch(o){f(`激活失败: ${o.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(A!=null&&A.key)try{await qe.disableRoleCard(A.key),f("已禁用","success"),await u()}catch(o){f(`禁用失败: ${o.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{u()}),await u()}const Pe=P();async function hi(e){e.innerHTML=`
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
  `;const t=e.querySelector("#profile-style"),i=e.querySelector("#profile-role"),l=e.querySelector("#profile-style-current"),s=e.querySelector("#profile-role-current"),r=e.querySelector("#profile-style-apply"),n=e.querySelector("#profile-role-apply"),u=e.querySelector("#profile-pending-state");let o=t.value,p=i.value;function c(){const y=t.value!==o,h=i.value!==p;if(r.disabled=!y,n.disabled=!h,y&&h){u.textContent="检测到风格与角色配置均有未应用变更";return}if(y){u.textContent="检测到风格配置有未应用变更";return}if(h){u.textContent="检测到角色配置有未应用变更";return}u.textContent="当前配置与服务端已同步"}async function g({showSuccessToast:y=!1}={}){var m,_,x,S;const[h,v]=await Promise.allSettled([Pe.getStyleProfile(),Pe.getRoleProfile()]),b=[];if(h.status==="fulfilled"&&((m=h.value)!=null&&m.style)?(o=h.value.style,t.value=o,l.textContent=`当前: ${o}`):h.status==="rejected"&&b.push(((_=h.reason)==null?void 0:_.message)||"风格配置加载失败"),v.status==="fulfilled"&&((x=v.value)!=null&&x.role)?(p=v.value.role,i.value=p,s.textContent=`当前: ${p}`):v.status==="rejected"&&b.push(((S=v.reason)==null?void 0:S.message)||"角色配置加载失败"),c(),b.length>0){f(`加载配置失败: ${b.join("；")}`,"error");return}y&&f("已从服务端刷新配置","success")}t.addEventListener("change",c),i.addEventListener("change",c),r.addEventListener("click",async()=>{const y=t.value;if(y===o){f("风格未发生变化，无需应用","warning");return}try{await Pe.setStyleProfile(y),o=y,l.textContent=`当前: ${y}`,c(),f("风格已更新","success")}catch(h){f(`更新失败: ${h.message}`,"error"),c()}}),n.addEventListener("click",async()=>{const y=i.value;if(y===p){f("角色配置未发生变化，无需应用","warning");return}try{await Pe.setRoleProfile(y),p=y,s.textContent=`当前: ${y}`,c(),f("角色配置已更新","success")}catch(h){f(`更新失败: ${h.message}`,"error"),c()}}),e.querySelector("#profile-refresh").addEventListener("click",async()=>{await g({showSuccessToast:!0})}),await g({showSuccessToast:!1})}const qt=P(),$i=[{key:"pat",label:"Pat"},{key:"feed",label:"Feed"},{key:"wake",label:"Wake"}];function _i(e){return!Array.isArray(e)||!e.length?'<div class="table-empty">暂无主动信号</div>':`
    <ul class="signal-list" style="padding: 0 16px 16px;">
      ${e.map(t=>`<li class="signal-item"><strong>${a(t.label||t.key||"信号")}</strong>: ${a(t.detail||"-")}</li>`).join("")}
    </ul>
  `}function xi(e){return!Array.isArray(e)||!e.length?'<div class="table-empty">暂无 needs 数据</div>':`
    <div class="audit-summary-grid">
      ${e.map(t=>`
            <div class="stat-card mini">
              <div class="stat-label">${a(t.label||t.key||"Need")}</div>
              <div class="stat-value">${a(t.value||"-")}</div>
            </div>
          `).join("")}
    </div>
  `}function Si(e){return!Array.isArray(e)||!e.length?'<div class="table-empty">暂无最近交互</div>':`
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
  `}function Ee(e){return`<div class="page-error">加载失败: ${a(e)}</div>`}async function wi(e){e.innerHTML=`
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
            ${$i.map(u=>`<button class="btn btn-primary" type="button" data-role="pet-action" data-action="${a(u.key)}" data-action-label="${a(u.label)}">${a(u.label)}</button>`).join("")}
          </div>
          <div id="pet-action-status" class="form-hint">准备记录下一次宠物动作。</div>
        </div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>最近交互</h3></div>
        <div id="pet-timeline"><div class="page-loading">加载中...</div></div>
      </div>
    </div>
  `;const t=e.querySelector("#pet-action-note"),i=e.querySelector("#pet-action-status"),l=[...e.querySelectorAll('[data-role="pet-action"]')];function s(u=""){l.forEach(o=>{const p=o.getAttribute("data-action-label")||o.textContent||"",c=u&&o.getAttribute("data-action")===u;o.disabled=!!u,o.textContent=c?`${p}...`:p})}async function r(){try{const u=await qt.getPetOverview(),o=(u==null?void 0:u.item)||{},p=o.snapshot||{},c=o.companion||{},g=p.relationship||{},y=p.progress||{};e.querySelector("#pet-arc").innerHTML=`
        <div class="audit-summary-grid">
          <div class="stat-card mini">
            <div class="stat-label">关系等级</div>
            <div class="stat-value">${a(g.level||"-")}</div>
          </div>
          <div class="stat-card mini">
            <div class="stat-label">当前阶段</div>
            <div class="stat-value">${a(y.progressLabel||"-")}</div>
          </div>
        </div>
        <p class="form-hint" style="margin-top: 12px;">${a(g.note||"")}</p>
        <p class="form-hint">${a(y.nextMilestone||"暂无下一阶段里程碑")}</p>
      `,e.querySelector("#pet-needs").innerHTML=xi(p.needs),e.querySelector("#pet-signals").innerHTML=_i(p.proactiveSignals),e.querySelector("#pet-companion-summary").innerHTML=`
        <div class="audit-summary-grid">
          <div class="stat-card mini">
            <div class="stat-label">宠物名</div>
            <div class="stat-value">${a(c.petName||"-")}</div>
          </div>
          <div class="stat-card mini">
            <div class="stat-label">Loop mode</div>
            <div class="stat-value">${a(c.loopMode||"-")}</div>
          </div>
          <div class="stat-card mini">
            <div class="stat-label">状态来源</div>
            <div class="stat-value">${a(c.adapterLabel||"-")}</div>
          </div>
        </div>
        <p class="form-hint" style="margin-top: 12px;">${a(c.statusLine||"")}</p>
      `,e.querySelector("#pet-timeline").innerHTML=Si(c.recentInteractions)}catch(u){const o=u instanceof Error?u.message:"unknown_error";throw e.querySelector("#pet-arc").innerHTML=Ee(o),e.querySelector("#pet-needs").innerHTML=Ee(o),e.querySelector("#pet-signals").innerHTML=Ee(o),e.querySelector("#pet-companion-summary").innerHTML=Ee(o),e.querySelector("#pet-timeline").innerHTML=Ee(o),u}}async function n(u){const o=l.find(g=>g.getAttribute("data-action")===u),p=(o==null?void 0:o.getAttribute("data-action-label"))||u,c=typeof(t==null?void 0:t.value)=="string"?t.value.trim().slice(0,160):"";s(u),i.textContent=`正在记录 ${p}...`;try{await qt.recordPetAction(u,c||void 0),f(`${p} 已记录`,"success"),i.textContent=`${p} 已记录，正在刷新宠物循环。`,t&&(t.value=""),await r()}catch(g){const y=g instanceof Error?g.message:"unknown_error";i.textContent=`记录失败: ${y}`,f(`宠物动作失败: ${y}`,"error")}finally{s()}}l.forEach(u=>{u.addEventListener("click",()=>{n(u.getAttribute("data-action")||"")})}),e.querySelector("#pet-refresh").addEventListener("click",()=>{r()}),await r()}const kt=P();function qi(e){return!Array.isArray(e)||!e.length?'<div class="table-empty">暂无平台连接信息</div>':e.map(t=>`
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
      `).join("")}async function ki(e){e.innerHTML=`
    <div class="page-header">
      <h2>平台连接</h2>
      <button class="btn" id="connections-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
    </div>
    <div id="connections-wrapper"><div class="page-loading">加载中...</div></div>
  `;async function t(){const i=await kt.getPlatformConnections();e.querySelector("#connections-wrapper").innerHTML=qi(i==null?void 0:i.items),e.querySelectorAll('[data-role="platform-toggle"]').forEach(l=>{l.addEventListener("click",async()=>{const s=l.getAttribute("data-platform")||"",r=l.getAttribute("data-enabled")==="true";await kt.setPlatformConnectionControl(s,r),await t()})})}e.querySelector("#connections-refresh").addEventListener("click",()=>{t()}),await t()}function ut({columns:e,rows:t,empty:i="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${a(i)}</div>`;const l=e.map(r=>`<th class="${r.class||""}">${a(r.label)}</th>`).join(""),s=t.map(r=>`<tr>${e.map(n=>`<td class="${n.class||""}">${n.render?n.render(r):a(r[n.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${l}</tr></thead>
        <tbody>${s}</tbody>
      </table>
    </div>
  `}const Ce=P();async function Ei(e){e.innerHTML=`
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
              <label class="form-label" for="gw-platform">平台</label>
              <select id="gw-platform" class="form-input">
                <option value="bilibili">bilibili</option>
                <option value="qq">qq</option>
                <option value="douyin">douyin</option>
                <option value="kuaishou">kuaishou</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="gw-comment-id">Comment ID</label>
              <input type="text" id="gw-comment-id" class="form-input" placeholder="评论 ID" />
            </div>
            <div class="form-group">
              <label class="form-label" for="gw-source">来源</label>
              <input type="text" id="gw-source" class="form-input" value="manual" />
            </div>
          </div>
          <div id="gw-qq-route-fields" style="display:none;">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="gw-canonical-id">Canonical ID</label>
                <input type="text" id="gw-canonical-id" class="form-input" placeholder="qq:message-123" />
              </div>
              <div class="form-group">
                <label class="form-label" for="gw-container-id">Container ID</label>
                <input type="text" id="gw-container-id" class="form-input" placeholder="group-42" />
              </div>
              <div class="form-group">
                <label class="form-label" for="gw-user-id">User ID</label>
                <input type="text" id="gw-user-id" class="form-input" placeholder="user-42" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="gw-parent-external-id">Parent External ID</label>
                <input type="text" id="gw-parent-external-id" class="form-input" placeholder="message-root-42" />
              </div>
              <div class="form-group">
                <label class="form-label" for="gw-chat-type">Chat Type</label>
                <select id="gw-chat-type" class="form-input">
                  <option value="">auto</option>
                  <option value="group">group</option>
                  <option value="private">private</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="gw-adapter">Adapter</label>
                <input type="text" id="gw-adapter" class="form-input" value="napcat" />
              </div>
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
  `;const t=e.querySelector("#gw-reply"),i=e.querySelector("#gw-char-count"),l=e.querySelector("#gw-platform"),s=e.querySelector("#gw-qq-route-fields");t.addEventListener("input",()=>{i.textContent=`${t.value.length} 字`});function r(){s.style.display=l.value==="qq"?"block":"none"}l.addEventListener("change",r),r(),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const p=e.querySelector("#gw-publish-btn"),c=e.querySelector("#gw-platform").value.trim(),g=e.querySelector("#gw-comment-id").value.trim(),y=e.querySelector("#gw-reply").value.trim(),h=e.querySelector("#gw-source").value.trim(),v=e.querySelector("#gw-force").checked;if(!g||!y){f("Comment ID 和回复内容不能为空","warning");return}p.disabled=!0,p.textContent="发布中...";try{const b={comment_id:g,reply_text:y,source:h,force_publish:v};if(c==="qq"){const m=e.querySelector("#gw-canonical-id").value.trim(),_=e.querySelector("#gw-container-id").value.trim(),x=e.querySelector("#gw-user-id").value.trim(),S=e.querySelector("#gw-parent-external-id").value.trim(),q=e.querySelector("#gw-chat-type").value.trim(),k=e.querySelector("#gw-adapter").value.trim(),T={...q?{chat_type:q}:{},...k?{adapter:k}:{}};await Ce.publishPlatformReply("qq",{...b,...m?{canonical_id:m}:{},..._?{container_id:_}:{},...x?{user_id:x}:{},...S?{parent_external_id:S}:{},...Object.keys(T).length?{routing_metadata:T}:{}})}else c==="bilibili"?await Ce.publishGatewayReply(b):await Ce.publishPlatformReply(c,b);f("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",e.querySelector("#gw-canonical-id").value="",e.querySelector("#gw-container-id").value="",e.querySelector("#gw-user-id").value="",e.querySelector("#gw-parent-external-id").value="",e.querySelector("#gw-chat-type").value="",i.textContent="0 字",await o()}catch(b){f(`发布失败: ${b.message}`,"error")}finally{p.disabled=!1,p.textContent="发布"}});async function n(){const p=e.querySelector("#gw-events-wrapper"),c=e.querySelector("#gw-events-meta"),g=e.querySelector("#gw-limit").value;p.innerHTML='<div class="page-loading">加载中...</div>',c.textContent="";try{const y=await Ce.getGatewayLogs({limit:g}),h=Array.isArray(y==null?void 0:y.items)?y.items:[];if(c.textContent=`最近返回 ${h.length} 条网关事件`,h.length===0){p.innerHTML='<div class="table-empty">暂无网关日志</div>';return}p.innerHTML=ut({columns:[{key:"id",label:"ID",class:"cell-id",render:v=>{var b;return a((b=v.id)==null?void 0:b.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:v=>{var b;return a((b=v.comment_id)==null?void 0:b.substring(0,12))}},{key:"status",label:"状态",render:v=>He(v.status)},{key:"platform",label:"平台",render:v=>a(v.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:v=>{var b;return a((b=v.reply_text)==null?void 0:b.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:v=>O(v.created_at)}],rows:h})}catch(y){p.innerHTML=`<div class="page-error">加载失败: ${a(y.message)}</div>`}}async function u(){const p=e.querySelector("#gw-publish-wrapper"),c=e.querySelector("#gw-publish-meta"),g=e.querySelector("#gw-limit").value,y=e.querySelector("#gw-status").value;p.innerHTML='<div class="page-loading">加载中...</div>',c.textContent="";try{const h=await Ce.getGatewayPublishLogs({limit:g,status:y}),v=Array.isArray(h==null?void 0:h.items)?h.items:[],b=Number((h==null?void 0:h.total)??v.length)||v.length,m=v.reduce((x,S)=>{const q=S.status||"unknown";return x[q]=(x[q]||0)+1,x},{});c.textContent=y?`状态 ${y}，返回 ${v.length} / ${b} 条发布日志`:`返回 ${v.length} / ${b} 条发布日志`;const _=Object.entries(m).map(([x,S])=>`${x}:${S}`).join("，");if(_&&(c.textContent+=`；当前页状态 ${_}`),v.length===0){p.innerHTML='<div class="table-empty">暂无发布日志</div>';return}p.innerHTML=ut({columns:[{key:"comment_id",label:"Comment ID",class:"cell-id",render:x=>a((x.comment_id||x.canonical_comment_id||"-").toString().substring(0,16))},{key:"platform",label:"平台",render:x=>a(x.platform||"-")},{key:"status",label:"状态",render:x=>He(x.status)},{key:"source",label:"来源",render:x=>a(x.source||"-")},{key:"failure_reason",label:"失败原因",class:"cell-truncate",render:x=>a(x.failure_reason||"-")},{key:"reply_hash",label:"Hash",class:"cell-id",render:x=>a((x.reply_hash||"-").toString().substring(0,12))},{key:"published_at",label:"发布于",class:"cell-time",render:x=>x.published_at?O(x.published_at):"-"},{key:"created_at",label:"记录时间",class:"cell-time",render:x=>O(x.created_at)}],rows:v})}catch(h){p.innerHTML=`<div class="page-error">加载失败: ${a(h.message)}</div>`}}async function o(){await Promise.all([n(),u()])}e.querySelector("#gw-refresh").addEventListener("click",o),e.querySelector("#gw-filter-btn").addEventListener("click",o),await o()}const rt=P();async function Ci(e){e.innerHTML=`
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
  `;async function t(){try{const l=await rt.getAuditSummary({days:7}),s=e.querySelector("#audit-summary-cards");s.innerHTML=`
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
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function i(){const l=e.querySelector("#audit-table-wrapper");l.innerHTML='<div class="page-loading">加载中...</div>';const s=e.querySelector("#audit-action").value.trim(),r=e.querySelector("#audit-ok").value,n=e.querySelector("#audit-limit").value;try{const u=await rt.getAuditLogs({action:s,ok:r,limit:n}),o=Array.isArray(u==null?void 0:u.items)?u.items:[];if(o.length===0){l.innerHTML='<div class="table-empty">暂无审计日志</div>';return}l.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${o.map(p=>{var c;return`<tr>
              <td class="cell-id">${a((c=p.id)==null?void 0:c.toString().substring(0,8))}</td>
              <td>${a(p.action)}</td>
              <td class="cell-truncate">${a(p.target_id||"-")}</td>
              <td>${p.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${a(p.detail||"-")}</td>
              <td class="cell-time">${O(p.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(u){l.innerHTML=`<div class="page-error">加载失败: ${a(u.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),i()}),e.querySelector("#audit-filter-btn").addEventListener("click",i),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await rt.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),f("导出成功","success")}catch(l){f(`导出失败: ${l.message}`,"error")}}),await Promise.all([t(),i()])}const Li=/^BV[a-zA-Z0-9]{10}$/,Ti={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},Mi={"auth:no active credential":"缺少可用的激活凭证，请先添加并激活。","auth:credential_validation_failed":"凭证字段存在，但运行时认证失败，请检查登录状态或凭证是否失效。","config:bilibili_enabled is false":"B 站集成总开关已关闭，请先启用配置。","dependency:diagnostics_unavailable":"诊断信息暂时不可用，请稍后刷新重试。"},Ai={manual_queue:"人工队列发布",simulated:"模拟发布流程",webhook:"Webhook 推送",real_publish:"真实发布流程",native_bilibili:"原生 B 站发布"},ge=50;function B(e){const t=e instanceof Error?e.message:String(e??"request_failed");return Ti[t]||t}function Ii(e){return e?Li.test(e)?null:"invalid_bvid_format":"bvid_required"}function Bi(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function ji(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function Pi(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(i=>Mi[i]||`未识别阻塞原因: ${i}`).join("；")}function Ni(e){const t=String(e??"").trim().toLowerCase();return t?Ai[t]||`未识别发布模式: ${t}`:"未设置发布模式"}function lt(e,t,i){return e?t:i}function Hi(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"未设置轮询间隔":t%60===0?`${t/60} 分钟`:`${t} 秒`}function Oi(e){const t=Number(e);if(!Number.isFinite(t)||t<=0)return"未设置轮询间隔，请检查轮询配置";if(t<60){const s=60/t;return`约每分钟 ${s.toFixed(s>=10?0:1).replace(/\.0$/,"")} 轮`}if(t<3600){const s=3600/t;return`约每小时 ${s.toFixed(s>=10?0:1).replace(/\.0$/,"")} 轮`}const i=t/3600;return`约每 ${i.toFixed(i>=10?0:1).replace(/\.0$/,"")} 小时 1 轮`}function Ri(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"未设置速率限制":`${t} 次/分钟`}function Di(e){const t=Number(e);if(!Number.isFinite(t)||t<=0)return"未设置速率限制，请检查抓取配置";const i=t/60;if(i>=1)return`约每秒 ${i.toFixed(i>=10?0:1).replace(/\.0$/,"")} 次`;const l=60/t;return`约每 ${l.toFixed(l>=10?0:1).replace(/\.0$/,"")} 秒 1 次`}function Et(e,t,i="覆盖率"){const l=Number(t??0);if(!Number.isFinite(l)||l<=0)return`暂无视频，无法计算${i}，请先添加监控对象`;const s=Number(e??0),r=Number.isFinite(s)?Math.min(l,Math.max(0,s)):0,n=(r/l*100).toFixed(1).replace(/\.0$/,"");return`${i} ${n}%（${r}/${l}）`}function Ui(e,t){const i=Number(e??0);if(!Number.isFinite(i)||i<=0)return"暂无视频，请先添加 BVID 监控对象";const l=Number(t??0),s=Number.isFinite(l)?Math.min(i,Math.max(0,l)):0,r=Math.max(0,i-s);return`共 ${i} 个视频，轮询中 ${s}，停用 ${r}`}function Ct(e,t={}){const i=Number((e==null?void 0:e.videos)??0),l=Number((e==null?void 0:e.comments)??0),s=Number((e==null?void 0:e.events_injected)??l),r=t.subject||(i===1?"视频":"轮询");return l>0||s>0?`${r}完成，处理 ${i} 个视频，新增 ${l} 条评论，已注入 ${s} 个事件。`:i>0?`${r}完成，处理 ${i} 个视频，暂无新增评论，已保留当前评论状态。`:`${r}完成，暂无可处理视频，请先确认监控对象已同步。`}function he(e,t){if(!t)return"";const i=vt(t),l=U(t);return i?`${e}: ${i}（${l}）`:`${e}: ${l}`}function Lt(e,t){return e?t?"活跃凭证字段完整，可用于鉴权":"活跃凭证已激活，但缺少关键字段，请检查凭证配置":"当前无活跃凭证，请先添加并激活"}function Vi(e){var o,p,c,g,y,h;const t=!!((p=(o=e==null?void 0:e.checks)==null?void 0:o.auth)!=null&&p.ready),i=!!((g=(c=e==null?void 0:e.checks)==null?void 0:c.worker_or_publish)!=null&&g.ready),l=!!((y=e==null?void 0:e.signals)!=null&&y.polling_worker_enabled),s=!!((h=e==null?void 0:e.signals)!=null&&h.native_publish_enabled),r=Array.isArray(e==null?void 0:e.blocking_reasons)?e.blocking_reasons.filter(Boolean):[],n=r.length>0?`，阻塞 ${r.length} 项，详见下方阻塞原因`:"";return l||s?t&&i?`鉴权已就绪，执行链路可用${n}`:t?`鉴权已就绪，但执行链路阻塞${n}`:i?`执行链路可用，但鉴权未就绪${n}`:`鉴权未就绪，执行链路阻塞${n}`:r.length>0?`当前无需鉴权，但诊断校验仍受阻${n}`:"轮询与发布链路均未启用，可按需开启"}function Ji(e){var s,r,n;const t=!!((s=e==null?void 0:e.signals)!=null&&s.publish_mode_config_ready),i=!!((r=e==null?void 0:e.signals)!=null&&r.native_publish_enabled),l=!!((n=e==null?void 0:e.signals)!=null&&n.polling_worker_enabled);return[t?"模式配置就绪":"模式配置缺失，请检查发布配置",i?"原生发布启用，可直接进入 B 站发布链路":"原生发布停用，当前不会直接走 B 站发布",l?"轮询链路启用，可配合自动处理评论侧流程":"轮询链路停用，评论侧仅支持手动同步"].join("，")}const Tt={ok:{label:"轮询成功",cls:"badge-success"},no_new:{label:"无新增评论",cls:"badge-muted"},error:{label:"轮询失败",cls:"badge-danger"}},$e={no_aid:"缺少视频 aid，暂时无法轮询评论。",retry_exhausted:"评论抓取重试耗尽。"};function Ki(e,t,i){const l=String(e??"").trim().toLowerCase();if(!l)return"-";const s=Tt[l]||{label:"未识别轮询状态",cls:"badge-muted"},r=l==="error"&&t?$e[String(t).trim().toLowerCase()]||String(t):"",n=r?` title="${a(r)}"`:"",u=typeof i=="number"&&Number.isFinite(i)?`评论游标: ${i}`:"",p=[l==="ok"?u?"轮询完成，评论游标已推进":"轮询完成":l==="no_new"?u?"本次未发现新评论，评论游标已保留":"本次未发现新评论":Tt[l]?"":`原始状态值: ${l}`,r,u].filter(Boolean).map(c=>`<div class="form-hint" style="margin-top:4px;">${a(c)}</div>`).join("");return`<span class="status-badge ${s.cls}"${n}>${a(s.label)}</span>${p}`}function Wi(e){if(String((e==null?void 0:e.last_poll_status)??"").trim().toLowerCase())return Ki(e==null?void 0:e.last_poll_status,e==null?void 0:e.last_poll_error,e==null?void 0:e.last_rpid);if(!(e!=null&&e.last_polled_at))return`<span class="status-badge badge-muted">未轮询</span><div class="form-hint" style="margin-top:4px;">${a(gt(e))}</div>`;const i=typeof(e==null?void 0:e.last_rpid)=="number"&&Number.isFinite(e.last_rpid)?"已轮询但未记录结果，评论游标已保留":"已轮询但未记录结果";return`<span class="status-badge badge-muted">轮询完成</span><div class="form-hint" style="margin-top:4px;">${a(i)}</div>`}function Fi(e){if(e==="true")return!0;if(e==="false")return!1}function zi(e){return e==="true"?"当前筛选暂无轮询中视频，可切换筛选查看停用项":e==="false"?"当前筛选暂无已停用视频，可切换筛选查看轮询中项":"暂无监控视频，请先添加 BVID 作为监控对象"}function R(e){return typeof(e==null?void 0:e.aid)=="number"&&Number.isFinite(e.aid)}function gt(e){return R(e)?e!=null&&e.poll_enabled?"等待首次自动轮询，可稍后刷新查看":"轮询未启用，可手动同步评论":$e.no_aid}function Gi(e){return e.filter(t=>!R(t)).length}function Yi(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)).length}function Qi(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)&&!R(t)).length}function Zi(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&R(t)).length}function Xi(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&!R(t)).length}function er(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&!(t!=null&&t.last_polled_at)).length}function tr(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&(t==null?void 0:t.last_polled_at)).length}function ir(e){return e.filter(t=>(t==null?void 0:t.poll_enabled)&&!(t!=null&&t.last_polled_at)).length}function rr(e){return e.filter(t=>(t==null?void 0:t.poll_enabled)&&(t==null?void 0:t.last_polled_at)).length}function lr(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="error").length}function sr(e){return e.filter(t=>{const i=String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase();return i==="ok"||i==="no_new"}).length}function ar(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="ok").length}function nr(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="no_new").length}function or(e){return e.filter(t=>!(t!=null&&t.last_polled_at)).length}function dr(e){return e.filter(t=>R(t)&&!(t!=null&&t.last_polled_at)).length}function cr(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function ur(e){return e.filter(t=>typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function pr(e){return e.filter(t=>String((t==null?void 0:t.title)??"").trim().length>0).length}function br(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0).length}function mr(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&Number((t==null?void 0:t.comment_count)??0)<=0).length}function yr(e){return e.filter(t=>typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function vr(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function fr(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)<=0&&typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function gr(e){return e.filter(t=>R(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function hr(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(R(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid))).length}function $r(e){return e.reduce((t,i)=>{const l=Number((i==null?void 0:i.comment_count)??0);return t+(Number.isFinite(l)&&l>0?l:0)},0)}function _r(e){const t=R(e),i=String((e==null?void 0:e.bvid)??"").trim(),l=String((e==null?void 0:e.id)??(e==null?void 0:e.video_id)??"").trim(),s=[t?`aid: ${e.aid}`:$e.no_aid];return i||s.push(l?`记录 ID: ${l}`:"未同步 BVID"),`${a(i||"未同步 BVID")}${s.filter(Boolean).map(r=>`<div class="form-hint" style="margin-top:4px;">${a(r)}</div>`).join("")}`}function xr(e){const t=[];return R(e)||t.push("aid"),String((e==null?void 0:e.title)??"").trim()||t.push("标题"),typeof(e==null?void 0:e.owner_mid)=="number"&&Number.isFinite(e.owner_mid)||t.push("UP主 MID"),t}function Sr(e){const t=[],i=String((e==null?void 0:e.title)??"").trim(),l=xr(e);return l.length>0&&t.push(`缺少 ${l.join(" / ")}`),typeof(e==null?void 0:e.owner_mid)=="number"&&Number.isFinite(e.owner_mid)&&t.push(`UP主 MID: ${e.owner_mid}`),e!=null&&e.updated_at&&t.push(he("更新",e.updated_at)),e!=null&&e.created_at&&t.push(he("创建",e.created_at)),`${a(i||"未同步标题")}${t.map(s=>`<div class="form-hint" style="margin-top:4px;">${a(s)}</div>`).join("")}`}function wr(e){const t=R(e),i=t?"":" disabled",l=t?"":` title="${a($e.no_aid)}"`;return`<button class="btn btn-sm bili-sync" data-id="${a(e.id||e.video_id)}" data-has-aid="${t?"true":"false"}"${i}${l}>同步</button>`}function qr(e){const t=R(e);let i=$e.no_aid;return t&&(i=e!=null&&e.poll_enabled?"自动轮询中，等待计划任务执行":"轮询停用，可手动同步评论"),`${ft(e==null?void 0:e.poll_enabled)}<div class="form-hint" style="margin-top:4px;">${a(i)}</div>`}function kr(e){const t=Number((e==null?void 0:e.comment_count)??0),i=Number.isFinite(t)&&t>0?t:0,l=typeof(e==null?void 0:e.last_rpid)=="number"&&Number.isFinite(e.last_rpid);let s=gt(e);return i>0?s=l?"已有评论，游标已记录":"已有评论，缺少游标":e!=null&&e.last_polled_at&&(s=l?"已轮询无评论，保留游标":"已轮询无评论，未记录游标"),`${a(i)}<div class="form-hint" style="margin-top:4px;">${a(s)}</div>`}function Er(e){if(e!=null&&e.last_polled_at){const t=typeof(e==null?void 0:e.last_rpid)=="number"&&Number.isFinite(e.last_rpid)?`评论游标: ${e.last_rpid}`:"未记录评论游标，可在下次轮询后补齐";return`${O(e.last_polled_at)}<div class="form-hint" style="margin-top:4px;">${a(t)}</div>`}return`从未轮询<div class="form-hint" style="margin-top:4px;">${a(gt(e))}</div>`}function Cr(e,t,i,l=0,s=ge,r=[]){const n=i==="true"?"轮询中":i==="false"?"已停用":"全部状态",u=Math.floor(l/s)+1,o=Math.max(1,Math.ceil(e/s)),p=Yi(r),c=Math.max(0,r.length-p),g=Qi(r),y=Zi(r),h=Xi(r),v=er(r),b=tr(r),m=ir(r),_=rr(r),x=Gi(r),S=Math.max(0,r.length-x),q=lr(r),k=sr(r),T=ar(r),I=nr(r),L=or(r),j=dr(r),w=Math.max(0,r.length-L),N=ur(r),ae=Math.max(0,r.length-N),X=pr(r),ne=Math.max(0,r.length-X),D=br(r),V=Math.max(0,r.length-D),J=mr(r),ee=yr(r),oe=vr(r),de=fr(r),te=Math.max(0,r.length-ee),ce=cr(r),W=gr(r),ue=Math.max(0,r.length-W),ie=hr(r),F=$r(r),_e=x>0?`，当前页缺少 aid ${x} 条`:"",pe=i===""&&p>0?`，当前页轮询开启 ${p} 条`:"",be=i===""&&c>0?`，当前页轮询停用 ${c} 条`:"",me=i===""&&g>0?`，轮询开启但缺少 aid ${g} 条`:"",ye=i===""&&y>0?`，轮询停用但可手动同步 ${y} 条`:"",z=i===""&&h>0?`，轮询停用且缺少 aid ${h} 条`:"",Le=i===""&&v>0?`，轮询停用且从未轮询 ${v} 条`:"",re=i===""&&b>0?`，轮询停用且已有轮询记录 ${b} 条`:"",xe=i===""&&m>0?`，轮询开启但尚未轮询 ${m} 条`:"",G=i===""&&_>0?`，轮询开启且已有轮询记录 ${_} 条`:"",le=S>0?`，可手动同步 ${S} 条`:"",Se=k>0?`，正常轮询 ${k} 条`:"",we=T>0?`，成功轮询 ${T} 条`:"",ve=I>0?`，无新增评论 ${I} 条`:"",Y=q>0?`，轮询失败 ${q} 条`:"",Te=w>0?`，已有轮询记录 ${w} 条`:"",Ue=L>0?`，尚未轮询 ${L} 条`:"",Me=j>0?`，可手动同步但尚未轮询 ${j} 条`:"",Ve=N>0?`，已识别 UP 主 ${N} 条`:"",Ae=ae>0?`，缺少 UP 主 ${ae} 条`:"",Je=X>0?`，已抓取标题 ${X} 条`:"",Ke=ne>0?`，缺少标题 ${ne} 条`:"",We=W>0?`，信息完整 ${W} 条`:"",Fe=ue>0?`，信息不完整 ${ue} 条`:"",ze=ie>0?`，已轮询但信息不完整 ${ie} 条`:"",Ie=D>0?`，已有评论视频 ${D} 条`:"",Ge=V>0?`，无评论视频 ${V} 条`:"",Be=J>0?`，已轮询但无评论 ${J} 条`:"",Ye=ee>0?`，已有评论游标 ${ee} 条`:"",je=oe>0?`，有评论但无游标 ${oe} 条`:"",Qe=de>0?`，无评论但有游标 ${de} 条`:"",Ze=te>0?`，无评论游标 ${te} 条`:"",Xe=ce>0?`，已轮询但无游标 ${ce} 条`:"",et=F>0?`，关联评论 ${F} 条`:"";return`筛选条件: ${n}，共 ${e} 条，当前展示 ${t} 条，第 ${u}/${o} 页${pe}${be}${_e}${me}${ye}${z}${Le}${re}${xe}${G}${le}${Se}${we}${ve}${Y}${Te}${Ue}${Me}${Ve}${Ae}${Je}${Ke}${We}${Fe}${ze}${Ie}${Ge}${Be}${Ye}${je}${Qe}${Ze}${Xe}${et}`}const Lr=10080*60*1e3;function st(e,t=Date.now()){const i=new Date(e);if(Number.isNaN(i.getTime()))return"";const l=i.getTime()-t,s=Math.abs(l),r=60*1e3,n=60*r,u=24*n;let o,p;return s<n?(o=Math.max(1,Math.round(s/r)),p="分钟"):s<u?(o=Math.max(1,Math.round(s/n)),p="小时"):(o=Math.max(1,Math.round(s/u)),p="天"),l<=0?`${o}${p}前`:`${o}${p}后`}function E(e,t=Date.now()){if(!e)return{hasExpiry:!1,expired:!1,expiringSoon:!1,label:"未设置过期时间",cls:"badge-muted",detail:""};const i=new Date(e);if(Number.isNaN(i.getTime()))return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"过期时间异常",cls:"badge-danger",detail:String(e)};const l=i.getTime()-t;if(l<=0){const r=st(e,t);return{hasExpiry:!0,expired:!0,expiringSoon:!1,label:"已过期",cls:"badge-danger",detail:r?`${r}过期，${U(e)}`:U(e)}}if(l<=Lr){const r=st(e,t);return{hasExpiry:!0,expired:!1,expiringSoon:!0,label:"即将过期",cls:"badge-warning",detail:r?`${r}到期，${U(e)}`:U(e)}}const s=st(e,t);return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"有效期内",cls:"badge-success",detail:s?`${s}到期，${U(e)}`:U(e)}}function pt(e,t=!0){if(!t)return"当前无活跃凭证，无法评估过期状态";const i=e.hasExpiry?e.label==="过期时间异常"?"请检查过期时间格式后重试":e.expired?"建议尽快更新":e.expiringSoon?"建议提前轮换":"当前仍可使用":"需手动确认有效性并定期轮换";return[e.detail||(e.hasExpiry?"":"未设置过期时间"),i].filter(Boolean).join("，")}function Tr(e){const t=E(e),i=pt(t),l=i?`<div class="form-hint" style="margin-top:4px;">${a(i)}</div>`:"";return`<span class="status-badge ${t.cls}">${a(t.label)}</span>${l}`}function bt(e,t="未命名凭证"){const i=[],l=String((e==null?void 0:e.name)??"").trim();return!l&&e&&i.push("未填写凭证名称，当前展示默认标签"),e!=null&&e.updated_at&&i.push(he("更新",e.updated_at)),e!=null&&e.created_at&&i.push(he("创建",e.created_at)),`${a(l||t)}${i.map(s=>`<div class="form-hint" style="margin-top:4px;">${a(s)}</div>`).join("")}`}function Mt(e){return(e==null?void 0:e.cls)==="badge-danger"?"var(--danger-color)":(e==null?void 0:e.cls)==="badge-warning"?"var(--warning-color)":(e==null?void 0:e.cls)==="badge-success"?"var(--success-color)":"var(--grey-2)"}function mt(e){if(!e)return{label:"未配置凭证",detail:"请先添加并激活凭证用于鉴权"};const t=!!(e!=null&&e.is_active||e!=null&&e.active),i=C(e),l=i?"":ht(e).join(" / "),s=i?"":`缺少 ${l}`;if(e!=null&&e.last_used_at)return{label:vt(e.last_used_at)||"已使用",detail:`${U(e.last_used_at)}，${t?"当前生效":"当前未激活，历史使用记录保留"}${i?"，字段完整":`，${s}`}`};const r=[];return t?r.push(i?"当前生效，等待首次使用":`当前生效，但${s}`):r.push(i?"待手动激活，激活后可用于鉴权":`待补齐 ${l} 后激活`),e!=null&&e.updated_at&&r.push(he("更新",e.updated_at)),e!=null&&e.created_at&&r.push(he("创建",e.created_at)),{label:"从未使用",detail:r.join("，")}}function Mr(e){const t=mt(e),i=t.detail?`<div class="form-hint" style="margin-top:4px;">${a(t.detail)}</div>`:"";return`${a(t.label)}${i}`}function Ar(e){const t=!!(e!=null&&e.is_active||e!=null&&e.active),i=C(e),l=i?"":ht(e).join(" / "),s=i?"":`缺少 ${l}`,r=t?i?"当前生效，字段完整，可用于鉴权":`当前生效，但${s}`:i?"待手动激活，字段完整，激活后即可切换使用":`待补齐 ${l} 后激活`;return`${ft(t)}<div class="form-hint" style="margin-top:4px;">${a(r)}</div>`}function C(e){return!!(e!=null&&e.has_sessdata&&(e!=null&&e.has_bili_jct)&&(e!=null&&e.buvid3))}function ht(e){const t=[];return e!=null&&e.has_sessdata||t.push("SESSDATA"),e!=null&&e.has_bili_jct||t.push("bili_jct"),e!=null&&e.buvid3||t.push("buvid3"),t}function Ir(e,t=4){const i=String(e??"").trim();return i?i.endsWith("...")||i.length<=t?i:`...${i.slice(-t)}`:""}function Br(e){const t=[e!=null&&e.has_sessdata?"SESSDATA":"",e!=null&&e.has_bili_jct?"bili_jct":"",e!=null&&e.buvid3?`buvid3:${Ir(e.buvid3)}`:""].filter(Boolean).join(" / ")||"未配置指纹",i=[C(e)?"字段完整，可用于鉴权":`缺少 ${ht(e).join(" / ")}`,e!=null&&e.buvid3?"仅展示指纹摘要":"未记录 buvid3 指纹摘要"].filter(Boolean).join("，");return`${a(t)}${i?`<div class="form-hint" style="margin-top:4px;">${a(i)}</div>`:""}`}function Jt(e="",t=""){return`激活筛选: ${e==="active"?"仅激活":e==="inactive"?"仅未激活":"全部"}，过期筛选: ${t==="expired"?"已过期":t==="expiring"?"即将过期":t==="valid"?"有效期内":t==="unset"?"未设置过期时间":"全部"}`}function jr(e,t="",i="",l=e.length){const s=e.length,r=Kt(e,t,i),n=e.filter(d=>d.is_active||d.active),u=e.filter(d=>!(d.is_active||d.active)),o=n.length,p=u.length,c=e.filter(d=>C(d)).length,g=e.filter(d=>(d.is_active||d.active)&&C(d)).length,y=Math.max(0,c-g),h=Math.max(0,o-g),v=Math.max(0,p-y),b=n.filter(d=>d.last_used_at).length,m=Math.max(0,o-b),_=u.filter(d=>d.last_used_at).length,x=Math.max(0,p-_),S=e.filter(d=>C(d)&&d.last_used_at).length,q=Math.max(0,c-S),k=Math.max(0,s-c),T=e.filter(d=>!C(d)&&d.last_used_at).length,I=Math.max(0,k-T),L=e.filter(d=>!d.last_used_at).length,j=Math.max(0,s-L),w=Date.now(),N=e.filter(d=>C(d)&&E(d.expires_at,w).hasExpiry&&!E(d.expires_at,w).expired).length,ae=e.filter(d=>C(d)&&E(d.expires_at,w).expired).length,X=e.filter(d=>C(d)&&E(d.expires_at,w).expiringSoon).length,ne=e.filter(d=>C(d)&&!E(d.expires_at,w).hasExpiry).length,D=e.map(d=>E(d.expires_at,w)),V=n.map(d=>E(d.expires_at,w)),J=u.map(d=>E(d.expires_at,w)),ee=D.filter(d=>d.hasExpiry).length,oe=D.filter(d=>d.hasExpiry&&!d.expired).length,de=D.filter(d=>d.expired).length,te=D.filter(d=>d.expiringSoon).length,ce=V.filter(d=>d.hasExpiry&&!d.expired).length,W=V.filter(d=>d.expired).length,ue=V.filter(d=>d.expiringSoon).length,ie=V.filter(d=>!d.hasExpiry).length,F=J.filter(d=>d.hasExpiry&&!d.expired).length,_e=J.filter(d=>d.expired).length,pe=J.filter(d=>d.expiringSoon).length,be=J.filter(d=>!d.hasExpiry).length,me=e.filter(d=>!C(d)&&E(d.expires_at,w).hasExpiry&&!E(d.expires_at,w).expired).length,ye=e.filter(d=>!C(d)&&E(d.expires_at,w).expired).length,z=e.filter(d=>!C(d)&&E(d.expires_at,w).expiringSoon).length,Le=e.filter(d=>!C(d)&&!E(d.expires_at,w).hasExpiry).length,re=D.filter(d=>!d.hasExpiry).length,xe=Jt(t,i),G=r.filter(d=>C(d)).length,le=Math.max(0,r.length-G),Se=r.filter(d=>{if(!C(d))return!1;const Q=E(d.expires_at,w);return Q.hasExpiry&&!Q.expired}).length,we=r.filter(d=>C(d)?E(d.expires_at,w).expired:!1).length,ve=r.filter(d=>C(d)?E(d.expires_at,w).expiringSoon:!1).length,Y=r.filter(d=>C(d)?!E(d.expires_at,w).hasExpiry:!1).length,Te=r.filter(d=>C(d)&&(d.is_active||d.active)).length,Ue=Math.max(0,G-Te),Me=r.filter(d=>C(d)&&d.last_used_at).length,Ve=Math.max(0,G-Me),Ae=r.filter(d=>!C(d)&&d.last_used_at).length,Je=Math.max(0,le-Ae),Ke=r.filter(d=>{if(C(d))return!1;const Q=E(d.expires_at,w);return Q.hasExpiry&&!Q.expired}).length,We=r.filter(d=>C(d)?!1:E(d.expires_at,w).expired).length,Fe=r.filter(d=>C(d)?!1:E(d.expires_at,w).expiringSoon).length,ze=r.filter(d=>C(d)?!1:!E(d.expires_at,w).hasExpiry).length,Ie=r.filter(d=>!C(d)&&(d.is_active||d.active)).length,Ge=Math.max(0,le-Ie),Be=r.filter(d=>d.is_active||d.active).length,Ye=Math.max(0,r.length-Be),je=r.filter(d=>d.last_used_at).length,Qe=Math.max(0,r.length-je),Ze=r.filter(d=>{const Q=E(d.expires_at,w);return Q.hasExpiry&&!Q.expired}).length,Xe=r.filter(d=>E(d.expires_at,w).expired).length,et=r.filter(d=>E(d.expires_at,w).expiringSoon).length,Qt=r.filter(d=>!E(d.expires_at,w).hasExpiry).length,Zt=t?"":`，激活 ${Be} 个，未激活 ${Ye} 个`,Xt=t?"":`，完整且激活 ${Te} 个，完整但未激活 ${Ue} 个`,ei=t?"":`，缺字段且激活 ${Ie} 个，缺字段且未激活 ${Ge} 个`,ti=t||i?`，筛选结果完整 ${G} 个${Xt}，完整且有效 ${Se} 个，完整且已过期 ${we} 个，完整且即将过期 ${ve} 个，完整且未设置过期 ${Y} 个，完整且已使用 ${Me} 个，完整但未使用 ${Ve} 个，缺字段 ${le} 个${ei}，缺字段但已使用 ${Ae} 个，缺字段且从未使用 ${Je} 个，缺字段但有效 ${Ke} 个，缺字段且已过期 ${We} 个，缺字段且即将过期 ${Fe} 个，缺字段且未设置过期 ${ze} 个${Zt}，已使用 ${je} 个，从未使用 ${Qe} 个，有效 ${Ze} 个，已过期 ${Xe} 个，即将过期 ${et} 个，未设置过期 ${Qt} 个`:"";return`共 ${s} 个凭证，激活中 ${o} 个，未激活 ${p} 个，激活且完整 ${g} 个，未激活但完整 ${y} 个，激活但缺字段 ${h} 个，未激活且缺字段 ${v} 个，激活且已使用 ${b} 个，激活但从未使用 ${m} 个，未激活且已使用 ${_} 个，未激活但从未使用 ${x} 个，激活且有效 ${ce} 个，未激活且有效 ${F} 个，激活已过期 ${W} 个，未激活已过期 ${_e} 个，激活即将过期 ${ue} 个，未激活即将过期 ${pe} 个，激活未设置过期 ${ie} 个，未激活未设置过期 ${be} 个，字段完整 ${c} 个，完整且有效 ${N} 个，完整且已过期 ${ae} 个，完整即将过期 ${X} 个，完整未设置过期 ${ne} 个，完整且已使用 ${S} 个，完整但未使用 ${q} 个，字段缺失 ${k} 个，缺字段但已使用 ${T} 个，缺字段且未使用 ${I} 个，缺字段但有效 ${me} 个，缺字段且已过期 ${ye} 个，缺字段即将过期 ${z} 个，缺字段未设置过期 ${Le} 个，已使用 ${j} 个，从未使用 ${L} 个，设置过期时间 ${ee} 个，有效 ${oe} 个，已过期 ${de} 个，即将过期 ${te} 个，未设置 ${re} 个；筛选条件: ${xe}，当前展示 ${l} 个${ti}`}function Kt(e,t="",i=""){const l=Date.now();return e.filter(s=>{const r=s.is_active||s.active;if(t==="active"&&!r||t==="inactive"&&r)return!1;const n=E(s.expires_at,l);return!(i==="expired"&&!n.expired||i==="expiring"&&!n.expiringSoon||i==="valid"&&(!n.hasExpiry||n.expired)||i==="unset"&&n.hasExpiry)})}function Pr(e="",t=""){return e||t?`当前筛选暂无匹配凭证（${Jt(e,t)}），可调整筛选条件后重试`:"暂无凭证，请先添加并激活可用凭证用于鉴权"}const H=P(),Nr={llm_generation:"LLM 生成",search_enrichment:"搜索增强",webhook_publish:"Webhook 发布",native_bilibili_publish:"原生 B 站发布"},Hr={configured:"已就绪",inactive:"未启用",fallback_only:"仅回退",missing_inputs:"缺少配置",runtime_credentials_required:"凭证缺失",unsupported:"不支持"};function At(e,t,i){const l=e.querySelector(i);t.forEach(s=>{const r=e.querySelector(s);r==null||r.addEventListener("keydown",n=>{n.key==="Enter"&&(n.preventDefault(),l.disabled||l.click())})})}function Ne(e){return Array.isArray(e)?e.map(t=>String(t??"").trim()).filter(Boolean):[]}function It(e){return e===!0?{label:"就绪",color:"var(--success-color)"}:e===!1?{label:"阻塞",color:"var(--danger-color)"}:{label:"未知",color:"var(--warning-color)"}}function Or(e){if(!e||typeof e!="object"||Array.isArray(e))return[];const t=e.delivery_capabilities;return!t||typeof t!="object"||Array.isArray(t)?[]:(Array.isArray(t.summary)?t.summary:Array.isArray(t.capabilities)?t.capabilities:[]).filter(l=>l&&typeof l=="object"&&!Array.isArray(l)).map(l=>{const s=l;return{capability:String(s.capability??"").trim(),status:String(s.status??"").trim(),mode:String(s.mode??"").trim(),missing_inputs:Ne(s.missing_inputs)}}).filter(l=>l.capability)}function Rr(e){const t=Nr[e.capability]??e.capability,i=Hr[e.status]??(e.status||"未知"),l=e.mode?`mode=${e.mode}`:"mode=unknown",s=e.missing_inputs.length>0?e.missing_inputs.join(", "):"未提供缺失项";return`${t} [${e.capability}] (${i}, ${l}): ${s}`}function Dr(e){if(!e||typeof e!="object"||Array.isArray(e))return"";const t=e.release_gates,i=e.signals;if(!!(t&&typeof t=="object"&&t.real_auth_ready)||!!(i&&typeof i=="object"&&i.real_auth_ready))return"";const s=typeof i=="object"&&i&&!Array.isArray(i)&&typeof i.auth_probe_reason=="string"?i.auth_probe_reason.trim():"";return!s||s==="not_required"||s==="verified"?"":s}function Ur(e){if(!e||typeof e!="object"||Array.isArray(e))return{credentialPresent:!1,credentialComplete:!1,realAuthReady:!1};const t=e.release_gates,i=e.signals;return{credentialPresent:!!((i==null?void 0:i.credential_present)??(t==null?void 0:t.credential_present)),credentialComplete:!!((i==null?void 0:i.credential_complete)??(t==null?void 0:t.credential_complete)),realAuthReady:!!((i==null?void 0:i.real_auth_ready)??(t==null?void 0:t.real_auth_ready))}}function Vr(e){const t=e==null?void 0:e.credential,i=Ur(e==null?void 0:e.diagnostics);if(t){const s=E(t==null?void 0:t.expires_at);return{activeCredentialName:bt(t,"未配置活跃凭证"),credentialHealth:Lt(i.credentialPresent,i.credentialComplete),credentialExpiry:s,credentialExpiryColor:Mt(s),credentialExpiryDetail:pt(s,!0),credentialUsage:mt(t)}}if(i.credentialPresent){const s=i.realAuthReady?"运行时外部凭证":"运行时外部凭证（待验证）",r=i.realAuthReady?"后台未托管该凭证，当前运行时鉴权已通过":"后台未托管该凭证，当前仍需检查运行时鉴权状态",n={label:i.realAuthReady?"外部管理":"待确认",cls:i.realAuthReady?"badge-success":"badge-warning"};return{activeCredentialName:`${a(s)}<div class="form-hint" style="margin-top:4px;">${a(r)}</div>`,credentialHealth:i.credentialComplete?i.realAuthReady?"运行时外部凭证字段完整，鉴权探针已通过":"运行时外部凭证字段完整，但鉴权探针尚未通过":"运行时外部凭证已注入，但缺少关键字段，请检查运行时配置",credentialExpiry:n,credentialExpiryColor:i.realAuthReady?"var(--success-color)":"var(--warning-color)",credentialExpiryDetail:i.realAuthReady?"后台未托管该凭证，过期时间需在运行时环境中确认":"后台未托管该凭证，过期时间与有效性需在运行时环境中确认",credentialUsage:{label:i.realAuthReady?"运行时已验证":"运行时待验证",detail:i.realAuthReady?"认证探针已通过，但后台列表未托管该凭证":"后台列表未托管该凭证，请结合运行时诊断继续确认"}}}const l=E(void 0);return{activeCredentialName:bt(null,"未配置活跃凭证"),credentialHealth:Lt(!1,!1),credentialExpiry:l,credentialExpiryColor:Mt(l),credentialExpiryDetail:pt(l,!1),credentialUsage:mt(null)}}async function Jr(e){let t=0;e.innerHTML=`
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
  `;async function i(){var n,u,o,p,c,g,y,h;const r=e.querySelector("#bili-status-cards");r.innerHTML='<div class="page-loading">加载中...</div>';try{const[v,b]=await Promise.allSettled([H.getBilibiliStatus(),H.getReadinessStatus()]);if(v.status!=="fulfilled")throw v.reason;const m=v.value,_=b.status==="fulfilled"&&b.value&&typeof b.value=="object"&&!Array.isArray(b.value)?b.value:null,x=b.status==="rejected"?B(b.reason):"",S=Number((m==null?void 0:m.video_count)??0),q=Number(((n=m==null?void 0:m.videos)==null?void 0:n.poll_enabled_count)??0),k=Math.max(0,S-q),T=Ui(S,q),I=Et(q,S),L=Et(k,S,"停用占比"),j=!!((u=m==null?void 0:m.diagnostics)!=null&&u.ready),w=Pi((o=m==null?void 0:m.diagnostics)==null?void 0:o.blocking_reasons),N=Vr(m),ae=N.activeCredentialName,X=N.credentialHealth,ne=Vi(m==null?void 0:m.diagnostics),D=Ni((p=m==null?void 0:m.diagnostics)==null?void 0:p.effective_publish_mode),V=Ji(m==null?void 0:m.diagnostics),J=lt(m==null?void 0:m.enabled,"B 站集成已启用，可管理凭证与视频","B 站集成已停用，当前不会触发轮询或发布"),ee=lt(m==null?void 0:m.polling_enabled,"评论轮询已启用，会按配置自动抓取评论","评论轮询已停用，仅支持手动同步"),oe=lt(m==null?void 0:m.publish_enabled,"发布链路已启用，满足条件后可进入发布流程","发布链路已停用，不会进入自动发布流程"),de=Hi((c=m==null?void 0:m.config)==null?void 0:c.poll_interval_seconds),te=Oi((g=m==null?void 0:m.config)==null?void 0:g.poll_interval_seconds),ce=Ri((y=m==null?void 0:m.config)==null?void 0:y.rate_limit_per_minute),W=Di((h=m==null?void 0:m.config)==null?void 0:h.rate_limit_per_minute),ue=N.credentialExpiry,ie=N.credentialExpiryDetail,F=N.credentialUsage,_e=N.credentialExpiryColor,pe=It(_==null?void 0:_.foundation_ready),be=It(_==null?void 0:_.delivery_ready),me=Ne(_==null?void 0:_.foundation_blockers),ye=Ne(_==null?void 0:_.delivery_blockers),z=Ne(_==null?void 0:_.delivery_capability_blockers),re=Or(_).filter(Y=>Y.status!=="configured"&&Y.status!=="inactive"),xe=me.length>0?me.join(", "):"无",G=ye.length>0?ye.join(", "):"无",le=z.length>0?z.join(", "):"无",Se=_?re.length>0?re.map(Y=>Rr(Y)).join("； "):"无":"readiness_unavailable",we=x||re.length>0?"page-error":"form-hint",ve=Dr(m==null?void 0:m.diagnostics);r.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${m!=null&&m.enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${a(J)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询</div>
          <div class="stat-value">${m!=null&&m.polling_enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${a(ee)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布</div>
          <div class="stat-value">${m!=null&&m.publish_enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${a(oe)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">视频数</div>
          <div class="stat-value">${S}</div>
          <div class="form-hint" style="margin-top:6px;">${a(T)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${q}</div>
          <div class="form-hint" style="margin-top:6px;">${a(I)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">停用视频</div>
          <div class="stat-value">${k}</div>
          <div class="form-hint" style="margin-top:6px;">${a(L)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${ae}</div>
          <div class="form-hint" style="margin-top:6px;">${a(X)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${j?"var(--success-color)":"var(--danger-color)"}">${j?"就绪":"阻塞"}</div>
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
          ${W?`<div class="form-hint" style="margin-top:6px;">${a(W)}</div>`:""}
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
        ${w?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">当前阻塞原因: ${a(w)}</div>`:""}
        ${ve?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">原生认证探针: ${a(ve)}</div>`:""}
        ${x?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">Readiness 状态加载失败: ${a(x)}</div>`:""}
        <div class="${we}" style="grid-column: 1 / -1; margin: 0;">
          关键缺失项: ${a(Se)}
        </div>
      `}catch(v){r.innerHTML=`<div class="page-error">状态加载失败: ${a(B(v))}</div>`}}async function l(){const r=e.querySelector("#bili-videos-wrapper"),n=e.querySelector("#bili-video-summary"),u=e.querySelector("#bili-video-filter-btn"),o=e.querySelector("#bili-video-poll-filter"),p=e.querySelector("#bili-video-prev"),c=e.querySelector("#bili-video-next"),g=o.value;n.textContent="加载中...",r.innerHTML='<div class="page-loading">加载中...</div>',o.disabled=!0,u.disabled=!0,p.disabled=!0,c.disabled=!0;try{const y=await H.getBilibiliVideos({limit:ge,offset:t,poll_enabled:Fi(g)}),h=Array.isArray(y==null?void 0:y.items)?y.items:Array.isArray(y)?y:[],v=Number((y==null?void 0:y.total)??h.length);if(h.length===0&&v>0&&t>0){t=Math.max(0,t-ge),await l();return}if(n.textContent=Cr(v,h.length,g,t,ge,h),p.disabled=t<=0,c.disabled=t+h.length>=v,h.length===0){r.innerHTML=`<div class="table-empty">${a(zi(g))}</div>`;return}r.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${h.map(b=>`<tr data-id="${a(b.id||b.video_id)}">
              <td class="cell-id">${_r(b)}</td>
              <td class="cell-truncate">${Sr(b)}</td>
              <td>${qr(b)}</td>
              <td>${kr(b)}</td>
              <td class="cell-time">${Er(b)}</td>
              <td>${Wi(b)}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${a(b.id||b.video_id)}">${b.poll_enabled?"禁用轮询":"启用轮询"}</button>
                ${wr(b)}
                <button class="btn btn-sm btn-danger bili-delete" data-id="${a(b.id||b.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,r.querySelectorAll(".bili-toggle-poll").forEach(b=>{b.addEventListener("click",async()=>{b.disabled=!0;try{await H.toggleBilibiliVideoPoll(b.dataset.id),f("操作成功","success"),await Promise.all([i(),l()])}catch(m){f(`失败: ${B(m)}`,"error")}finally{b.disabled=!1}})}),r.querySelectorAll(".bili-sync").forEach(b=>{b.addEventListener("click",async()=>{if(b.dataset.hasAid==="false"){f($e.no_aid,"warning");return}const m=b.textContent;b.disabled=!0,b.textContent="同步中...";try{const _=await H.syncBilibiliVideo(b.dataset.id);f(Ct(_==null?void 0:_.result,{subject:"同步"}),"success"),await Promise.all([i(),l()])}catch(_){f(`同步失败: ${B(_)}`,"error")}finally{b.disabled=!1,b.textContent=m}})}),r.querySelectorAll(".bili-delete").forEach(b=>{b.addEventListener("click",async()=>{if(confirm("确定删除此视频？")){b.disabled=!0;try{await H.deleteBilibiliVideo(b.dataset.id),f("已删除","success"),await Promise.all([i(),l()])}catch(m){f(`删除失败: ${B(m)}`,"error")}finally{b.disabled=!1}}})})}catch(y){n.textContent="视频加载失败",r.innerHTML=`<div class="page-error">加载失败: ${a(B(y))}</div>`}finally{o.disabled=!1,u.disabled=!1}}async function s(){const r=e.querySelector("#bili-creds-wrapper"),n=e.querySelector("#bili-cred-summary"),u=e.querySelector("#bili-cred-active-filter"),o=e.querySelector("#bili-cred-expiry-filter"),p=u.value,c=o.value;n.textContent="加载中...",r.innerHTML='<div class="page-loading">加载中...</div>',u.disabled=!0,o.disabled=!0;try{const g=await H.getBilibiliCredentials(),y=Array.isArray(g==null?void 0:g.items)?g.items:Array.isArray(g)?g:[],h=Kt(y,p,c);if(n.textContent=jr(y,p,c,h.length),h.length===0){r.innerHTML=`<div class="table-empty">${a(Pr(p,c))}</div>`;return}r.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期状态</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${h.map(v=>`<tr data-id="${a(v.id||v.credential_id)}">
              <td>${bt(v)}</td>
              <td class="cell-id">${Br(v)}</td>
              <td>${Ar(v)}</td>
              <td>${Tr(v.expires_at)}</td>
              <td class="cell-time">${Mr(v)}</td>
              <td class="cell-actions">
                ${v.is_active||v.active?"":`<button class="btn btn-sm cred-activate" data-id="${a(v.id||v.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${a(v.id||v.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,r.querySelectorAll(".cred-activate").forEach(v=>{v.addEventListener("click",async()=>{v.disabled=!0;try{await H.activateBilibiliCredential(v.dataset.id),f("已激活","success"),await Promise.all([i(),s()])}catch(b){f(`激活失败: ${B(b)}`,"error")}finally{v.disabled=!1}})}),r.querySelectorAll(".cred-delete").forEach(v=>{v.addEventListener("click",async()=>{if(confirm("确定删除此凭证？")){v.disabled=!0;try{await H.deleteBilibiliCredential(v.dataset.id),f("已删除","success"),await Promise.all([i(),s()])}catch(b){f(`删除失败: ${B(b)}`,"error")}finally{v.disabled=!1}}})})}catch(g){n.textContent="凭证加载失败",r.innerHTML=`<div class="page-error">加载失败: ${a(B(g))}</div>`}finally{u.disabled=!1,o.disabled=!1}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const r=e.querySelector("#bili-video-add"),n=e.querySelector("#bili-video-bvid").value.trim(),u=Ii(n);if(u){f(B(u),"warning");return}r.disabled=!0,r.textContent="添加中...";try{await H.addBilibiliVideo(n),f("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([i(),l()])}catch(o){f(`添加失败: ${B(o)}`,"error")}finally{r.disabled=!1,r.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{var p;const r=e.querySelector("#cred-add"),n=ji(e.querySelector("#cred-expires").value),u={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:n},o=Bi(u);if(o){f(B(o),"warning");return}r.disabled=!0,r.textContent="添加中...";try{const c=await H.addBilibiliCredential(u);f((p=c==null?void 0:c.item)!=null&&p.is_active?"凭证添加成功，已自动激活":"凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([i(),s()])}catch(c){f(`添加失败: ${B(c)}`,"error")}finally{r.disabled=!1,r.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const r=e.querySelector("#bili-poll-btn");r.disabled=!0,r.textContent="轮询中...";try{const n=await H.triggerBilibiliPoll();f(Ct(n==null?void 0:n.result),"success"),await Promise.all([i(),l()])}catch(n){f(`轮询失败: ${B(n)}`,"error")}finally{r.disabled=!1,r.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",async()=>{const r=e.querySelector("#bili-refresh");r.disabled=!0,r.textContent="刷新中...";try{await Promise.all([i(),l(),s()])}finally{r.disabled=!1,r.innerHTML='<svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新'}}),e.querySelector("#bili-video-filter-btn").addEventListener("click",()=>{t=0,l()}),e.querySelector("#bili-video-poll-filter").addEventListener("change",()=>{t=0,l()}),e.querySelector("#bili-video-prev").addEventListener("click",()=>{t<=0||(t=Math.max(0,t-ge),l())}),e.querySelector("#bili-video-next").addEventListener("click",()=>{t+=ge,l()}),e.querySelector("#bili-cred-active-filter").addEventListener("change",s),e.querySelector("#bili-cred-expiry-filter").addEventListener("change",s),At(e,["#bili-video-bvid"],"#bili-video-add"),At(e,["#cred-name","#cred-sessdata","#cred-bili-jct","#cred-buvid3","#cred-buvid4","#cred-expires"],"#cred-add"),await Promise.all([i(),l(),s()])}const at=P(),nt="query_recent_comment_ids",ot="query_recent_job_ids",Kr=5;function Wt(e){try{const t=JSON.parse(sessionStorage.getItem(e)||"[]");return Array.isArray(t)?t.filter(i=>typeof i=="string"&&i.trim()!==""):[]}catch{return[]}}function Bt(e,t){const i=String(t||"").trim();if(!i)return;const l=Wt(e).filter(s=>s!==i);l.unshift(i),sessionStorage.setItem(e,JSON.stringify(l.slice(0,Kr)))}async function jt(e){var l;const t=JSON.stringify(e,null,2),i=(l=globalThis.navigator)==null?void 0:l.clipboard;return i&&typeof i.writeText=="function"?(await i.writeText(t),!0):!1}function Pt(e){const t=Object.entries(e||{});return t.length===0?'<div class="table-empty">未返回可展示字段</div>':`
    <div class="detail-card">
      ${t.map(([i,l])=>`
        <div class="detail-row">
          <span class="detail-key">${a(i)}</span>
          <span class="detail-value">${a(typeof l=="object"?JSON.stringify(l,null,2):String(l??"-"))}</span>
        </div>
      `).join("")}
    </div>
  `}function Nt(e){return String((e==null?void 0:e.canonical_comment_id)||(e==null?void 0:e.comment_id)||(e==null?void 0:e.id)||"").trim()}async function Wr(e){e.innerHTML=`
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
  `;const t=e.querySelector("#query-comment-id"),i=e.querySelector("#query-comment-result"),l=e.querySelector("#query-comment-meta"),s=e.querySelector("#query-comment-recent"),r=e.querySelector("#query-comment-copy");let n=null;const u=e.querySelector("#query-job-id"),o=e.querySelector("#query-job-result"),p=e.querySelector("#query-job-meta"),c=e.querySelector("#query-job-recent"),g=e.querySelector("#query-job-copy");let y=null;const h=e.querySelector("#query-comments-meta"),v=e.querySelector("#query-comments-wrapper");function b(S,q,k){const T=Wt(q);if(T.length===0){S.textContent="";return}S.innerHTML=`
      最近查询：
      ${T.map(I=>`<button class="btn btn-link" data-query-id="${a(I)}" type="button">${a(I)}</button>`).join("")}
    `,S.querySelectorAll("[data-query-id]").forEach(I=>{I.addEventListener("click",()=>k(I.dataset.queryId||""))})}async function m(S=""){const q=(S||t.value).trim();if(t.value=q,!q){f("请输入 Comment ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>',r.disabled=!0;try{n=await at.getComment(q)||{},r.disabled=!1,i.innerHTML=Pt(n),l.textContent=`查询成功，共 ${Object.keys(n).length} 个字段`,Bt(nt,q),b(s,nt,m)}catch(k){n=null,i.innerHTML=`<div class="page-error">查询失败: ${a(k.message)}</div>`,l.textContent=""}}async function _(S=""){const q=(S||u.value).trim();if(u.value=q,!q){f("请输入 Job ID","warning");return}o.innerHTML='<div class="page-loading">查询中...</div>',g.disabled=!0;try{y=await at.getJob(q)||{},g.disabled=!1,o.innerHTML=`
        ${Pt(y)}
        ${y!=null&&y.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${a(y.comment_id)}">查看关联评论 →</a></div>`:""}
      `,p.textContent=`查询成功，共 ${Object.keys(y).length} 个字段`,Bt(ot,q),b(c,ot,_);const T=o.querySelector("#query-goto-comment");T&&T.addEventListener("click",()=>{m(T.dataset.id)})}catch(k){y=null,o.innerHTML=`<div class="page-error">查询失败: ${a(k.message)}</div>`,p.textContent=""}}async function x(){const S=e.querySelector("#query-comments-limit").value,q=e.querySelector("#query-comments-offset").value;v.innerHTML='<div class="page-loading">加载中...</div>',h.textContent="";try{const k=await at.getComments({limit:S,offset:q}),T=Array.isArray(k==null?void 0:k.items)?k.items:[],I=Number((k==null?void 0:k.total)??T.length)||T.length;if(h.textContent=`返回 ${T.length} / ${I} 条评论`,T.length===0){v.innerHTML='<div class="table-empty">暂无评论</div>';return}v.innerHTML=ut({columns:[{key:"comment_id",label:"Comment ID",class:"cell-id",render:L=>a(Nt(L).substring(0,18)||"-")},{key:"platform",label:"平台",render:L=>a(L.platform||"-")},{key:"source",label:"来源",render:L=>a(L.source||"-")},{key:"content",label:"评论内容",class:"cell-truncate",render:L=>a((L.content||"-").toString().substring(0,80))},{key:"route_context",label:"路由",class:"cell-truncate",render:L=>a(ct(L.route_context))},{key:"created_at",label:"时间",class:"cell-time",render:L=>O(L.created_at)},{key:"actions",label:"操作",class:"cell-actions",render:L=>{const j=Nt(L);return j?`<button class="btn btn-sm query-comment-open" data-comment-id="${a(j)}" type="button">查看详情</button>`:'<span class="form-hint">缺少 ID</span>'}}],rows:T}),v.querySelectorAll(".query-comment-open").forEach(L=>{L.addEventListener("click",()=>{const j=L.dataset.commentId||"";t.value=j,m(j)})})}catch(k){v.innerHTML=`<div class="page-error">加载失败: ${a(k.message)}</div>`}}e.querySelector("#query-comment-btn").addEventListener("click",()=>{m()}),e.querySelector("#query-job-btn").addEventListener("click",()=>{_()}),e.querySelector("#query-comments-load").addEventListener("click",x),t.addEventListener("keydown",S=>{S.key==="Enter"&&m()}),u.addEventListener("keydown",S=>{S.key==="Enter"&&_()}),e.querySelector("#query-comment-clear").addEventListener("click",()=>{t.value="",n=null,r.disabled=!0,l.textContent="",i.innerHTML=""}),e.querySelector("#query-job-clear").addEventListener("click",()=>{u.value="",y=null,g.disabled=!0,p.textContent="",o.innerHTML=""}),r.addEventListener("click",async()=>{if(!n){f("暂无可复制的评论查询结果","warning");return}const S=await jt(n);f(S?"评论查询结果已复制":"当前环境不支持复制，请手动复制",S?"success":"warning")}),g.addEventListener("click",async()=>{if(!y){f("暂无可复制的任务查询结果","warning");return}const S=await jt(y);f(S?"任务查询结果已复制":"当前环境不支持复制，请手动复制",S?"success":"warning")}),b(s,nt,m),b(c,ot,_),await x()}const dt={dashboard:{render:Vt,title:"仪表盘"},jobs:{render:di,title:"任务管理"},"daily-metrics":{render:ui,title:"每日指标"},knowledge:{render:pi,title:"知识库"},memory:{render:fi,title:"Memory 管理"},"role-cards":{render:gi,title:"角色卡"},profiles:{render:hi,title:"风格配置"},"pet-core":{render:wi,title:"宠物核心"},connections:{render:ki,title:"平台连接"},gateway:{render:Ei,title:"网关"},audit:{render:Ci,title:"审计日志"},bilibili:{render:Jr,title:"B站集成"},query:{render:Wr,title:"查询"}},Oe="admin_session_token",Re="admin_api_key";let Ft=null;function Fr(e){const t=document.getElementById("login-error");t.textContent=e,t.style.display="block"}function zt(){const e=document.getElementById("login-error");e.textContent="",e.style.display="none"}function yt(){sessionStorage.removeItem(Oe),sessionStorage.removeItem(Re),window.__ADMIN_SESSION_TOKEN__="",window.__ADMIN_API_KEY__=""}function De({sessionToken:e="",apiKey:t=""}={}){window.__ADMIN_SESSION_TOKEN__=e.trim(),window.__ADMIN_API_KEY__=t.trim(),window.__ADMIN_SESSION_TOKEN__?sessionStorage.setItem(Oe,window.__ADMIN_SESSION_TOKEN__):sessionStorage.removeItem(Oe),window.__ADMIN_API_KEY__?sessionStorage.setItem(Re,window.__ADMIN_API_KEY__):sessionStorage.removeItem(Re)}function zr(){var i,l;const e=((i=sessionStorage.getItem(Oe))==null?void 0:i.trim())||"";if(e)return De({sessionToken:e}),!0;const t=((l=sessionStorage.getItem(Re))==null?void 0:l.trim())||"";return t?(De({apiKey:t}),!0):!1}function Gt(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function Yt(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function Gr(e){const t=await $("/api/admin/session/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({api_key:e})}),i=String((t==null?void 0:t.session_token)||"").trim();if(!i)throw new Error("session_token_missing");De({sessionToken:i})}async function Yr(e){De({apiKey:e}),await $("/api/admin/overview")}async function Qr(e){e.preventDefault(),zt();const i=document.getElementById("login-api-key").value.trim();if(i){yt();try{await Gr(i)}catch{try{await Yr(i)}catch{yt(),Fr("API Key 无效或服务不可用");return}}Yt(),$t("dashboard")}}function Zr(){yt(),zt(),document.getElementById("page-container").innerHTML="",Gt()}function $t(e){if(!dt[e])return;Ft=e,document.querySelectorAll("#nav-list .nav-item").forEach(i=>{i.classList.toggle("active",i.dataset.page===e)}),document.getElementById("page-title").textContent=dt[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',dt[e].render(t).catch(i=>{t.innerHTML=`<div class="page-error">加载失败: ${i.message}</div>`})}function Xr(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==Ft&&$t(t)})})}function el(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),i=document.getElementById("expand-left-btn");t&&i&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),i.style.display="block"}),i.addEventListener("click",()=>{e.classList.remove("collapsed"),i.style.display="none"}))}function tl(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let i=0;e.addEventListener("click",()=>{i=(i+1)%t.length,t[i]?document.body.setAttribute("data-theme",t[i]):document.body.removeAttribute("data-theme")})}function il(){el(),tl(),Xr(),document.getElementById("login-form").addEventListener("submit",Qr),document.getElementById("logout-btn").addEventListener("click",Zr),zr()?(Yt(),$t("dashboard")):Gt()}il();
