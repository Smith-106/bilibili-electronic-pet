(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))l(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&l(a)}).observe(document,{childList:!0,subtree:!0});function i(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function l(s){if(s.ep)return;s.ep=!0;const r=i(s);fetch(s.href,r)}})();function Wt(e,t,i){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof i=="string"&&i.trim()?i.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function Lt(){return(window.__ADMIN_API_KEY__||"").trim()}async function $(e,t={}){const i=Lt(),l=new Headers(t.headers||{});i&&l.set("x-api-key",i);const s=await fetch(e,{...t,headers:l}),r=await s.json().catch(()=>({}));if(!s.ok){const a=(r==null?void 0:r.detail)||(r==null?void 0:r.error);throw new Error(Wt(a,s.status,s.statusText))}return r}async function yt(e,t){const i=Lt(),l=new Headers;i&&l.set("x-api-key",i);const s=await fetch(e,{headers:l});if(!s.ok)throw new Error("download_failed");const r=await s.blob(),a=URL.createObjectURL(r),u=document.createElement("a");u.href=a,u.download=t,document.body.appendChild(u),u.click(),document.body.removeChild(u),URL.revokeObjectURL(a)}function M(e){const t=new URLSearchParams;for(const[l,s]of Object.entries(e))s!=null&&s!==""&&t.set(l,String(s));const i=t.toString();return i?`?${i}`:""}function D(){return{getOverview(){return $("/api/admin/overview")},getMetricsOverview(){return $("/api/admin/metrics/overview")},getObservabilitySummary({windowMinutes:e,window_minutes:t}={}){return $(`/api/admin/observability/summary${M({window_minutes:e??t})}`)},getJobs({status:e,limit:t}={}){return $(`/api/admin/jobs${M({status:e,limit:t})}`)},getJob(e){return $(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return $(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return $(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return $("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return $("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return yt(`/export/jobs.csv${M({status:e,limit:t})}`,"jobs.csv")},getComments({limit:e,offset:t}={}){return $(`/comments${M({limit:e,offset:t})}`)},getComment(e){return $(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,commentId:t,comment_id:i}={}){return $(`/api/admin/gateway/logs${M({limit:e,comment_id:t??i})}`)},getGatewayPublishLogs({limit:e,offset:t,status:i}={}){return $(`/gateway/publish-logs${M({limit:e,offset:t,status:i})}`)},publishGatewayReply(e){return $("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:i}={}){return $(`/api/admin/audit/summary${M({days:e,action:t,ok:i})}`)},getAuditLogs({limit:e,action:t,ok:i}={}){return $(`/api/audit-log${M({limit:e,action:t,ok:i})}`)},exportAuditCsv({limit:e,action:t,ok:i}={}){return yt(`/export/audit-logs.csv${M({limit:e,action:t,ok:i})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return $(`/api/metrics/daily${M({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return $(`/api/admin/knowledge${M({limit:e,offset:t})}`)},createKnowledgeEntry(e){return $("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return $(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getMemorySpaces({limit:e,offset:t,space_type:i,subject_type:l,subject_id:s}={}){return $(`/api/admin/memory/spaces${M({limit:e,offset:t,space_type:i,subject_type:l,subject_id:s})}`)},createMemorySpace(e){return $("/api/admin/memory/spaces",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getMemoryGrants({limit:e,offset:t,space_id:i,subject_type:l,subject_id:s}={}){return $(`/api/admin/memory/grants${M({limit:e,offset:t,space_id:i,subject_type:l,subject_id:s})}`)},grantMemorySpaceAccess(e){return $("/api/admin/memory/grants",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getMemoryIdentityLinks({limit:e,offset:t,subject_type:i,subject_id:l,platform:s,external_id:r}={}){return $(`/api/admin/memory/identity-links${M({limit:e,offset:t,subject_type:i,subject_id:l,platform:s,external_id:r})}`)},linkMemoryIdentity(e){return $("/api/admin/memory/identity-links",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getRoleCards({limit:e,offset:t}={}){return $(`/api/admin/role-cards${M({limit:e,offset:t})}`)},createRoleCard(e){return $("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return $(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return $(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return $(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return $("/api/admin/style-profile")},setStyleProfile(e){return $("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return $("/api/admin/role-profile")},setRoleProfile(e){return $("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return $("/api/admin/bilibili/status")},getReadinessStatus(){return $("/readiness")},getBilibiliVideos({poll_enabled:e,limit:t,offset:i}={}){return $(`/api/admin/bilibili/videos${M({poll_enabled:e,limit:t,offset:i})}`)},addBilibiliVideo(e){return $("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return $(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return $(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return $(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return $("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return $("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return $("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return $(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return $(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function n(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function V(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function dt(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const i=Date.now()-t.getTime(),l=Math.floor(i/1e3);if(l<60)return"刚刚";const s=Math.floor(l/60);if(s<60)return`${s}分钟前`;const r=Math.floor(s/60);if(r<24)return`${r}小时前`;const a=Math.floor(r/24);if(a<30)return`${a}天前`;const u=Math.floor(a/30);return u<12?`${u}个月前`:`${Math.floor(u/12)}年前`}catch{return""}}function O(e){const t=dt(e),i=V(e);return t?`<span title="${n(i)}">${n(t)}</span>`:`<span title="${n(i)}">${n(i)}</span>`}function W(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const Kt={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function Pe(e){if(!e)return"";const t=Kt[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${n(t.label)}</span>`}function ut(e,t="是",i="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${n(e?t:i)}</span>`}let Ye=null;function m(e,t="info"){const i=document.getElementById("app-toast");i&&i.remove(),Ye&&clearTimeout(Ye);const l={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},s=document.createElement("div");s.id="app-toast",s.className="toast-notification",s.style.setProperty("--toast-color",l[t]||l.info),s.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(s),requestAnimationFrame(()=>s.classList.add("show"));const r=()=>{s.classList.remove("show"),setTimeout(()=>s.remove(),300)};s.querySelector(".toast-close").onclick=r,Ye=setTimeout(r,4e3)}const le=D(),Ft=[{label:"LLM 提供方",keys:["llm_provider","llmProvider"]},{label:"搜索提供方",keys:["search_provider","searchProvider"]},{label:"发布模式",keys:["publisher_mode","publisherMode"]},{label:"LLM Key",keys:["llm_api_key_configured","llmApiKeyConfigured"],format:"configured"},{label:"搜索 Key",keys:["search_api_key_configured","searchApiKeyConfigured"],format:"configured"},{label:"Webhook",keys:["publisher_webhook_url_configured","publisherWebhookUrlConfigured"],format:"configured"},{label:"B站采集",keys:["bilibili_enabled","bilibiliEnabled"],format:"enabled"},{label:"B站发布",keys:["bilibili_publish_enabled","bilibiliPublishEnabled"],format:"enabled"},{label:"Kill Switch",keys:["kill_switch","killSwitch"],format:"enabled"}],zt=[{label:"基础就绪",keys:["foundation_ready"],format:"ready"},{label:"交付就绪",keys:["delivery_ready"],format:"ready"},{label:"基础阻塞",keys:["foundation_blockers"],format:"count"},{label:"交付阻塞",keys:["delivery_blockers"],format:"count"},{label:"能力阻塞",keys:["delivery_capability_blockers"],format:"count"}];function Tt(e,t){for(const i of t)if((e==null?void 0:e[i])!==void 0&&(e==null?void 0:e[i])!==null&&(e==null?void 0:e[i])!=="")return e[i]}function Mt(e,t){return t==="configured"?e?"已配置":"未配置":t==="enabled"?e?"开启":"关闭":t==="ready"?e?"就绪":"阻塞":t==="count"?Array.isArray(e)?`${e.length} 项`:String(e??"0"):typeof e=="boolean"?e?"是":"否":String(e)}function Gt(e){return Ft.map(t=>{const i=Tt(e,t.keys);return i===void 0?null:{label:t.label,value:Mt(i,t.format)}}).filter(Boolean)}function Yt(e){var i,l;const t=((i=e==null?void 0:e.bilibili_diagnostics)==null?void 0:i.effective_publish_mode)??((l=e==null?void 0:e.delivery_signals)==null?void 0:l.effective_publish_mode)??(e==null?void 0:e.effective_publish_mode);return typeof t=="string"&&t.trim()?t.trim():""}function Qt(e){if(!e||typeof e!="object"||Array.isArray(e))return[];const t=zt.map(l=>{const s=Tt(e,l.keys);return s===void 0?null:{label:l.label,value:Mt(s,l.format)}}).filter(Boolean),i=Yt(e);return i&&t.unshift({label:"发布模式",value:i}),t}function mt(e){return String(e).replace(/([a-z0-9])([A-Z])/g,"$1 $2").replace(/[._]/g," ").replace(/\s+/g," ").trim()}function Bt(e,t=""){if(!e||typeof e!="object"||Array.isArray(e))return[];const i=[];for(const[l,s]of Object.entries(e)){const r=t?`${t}.${l}`:l;if(!(s==null||s==="")){if(typeof s=="object"&&!Array.isArray(s)){i.push(...Bt(s,r));continue}if(Array.isArray(s)){s.length>0&&i.push({label:mt(r),value:`${s.length} 项`});continue}i.push({label:mt(r),value:String(s)})}}return i}function vt(e,t){return e.length?`
    <div class="audit-summary-grid">
      ${e.map(i=>`
        <div class="stat-card mini">
          <div class="stat-label">${n(i.label)}</div>
          <div class="stat-value">${n(i.value)}</div>
        </div>
      `).join("")}
    </div>
  `:`<div class="table-empty" style="padding:16px;">${n(t)}</div>`}async function At(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,i,l,s,r,a,u]=await Promise.all([le.getOverview().catch(()=>null),le.getJobs({limit:5}).catch(()=>null),le.getGatewayLogs({limit:5}).catch(()=>null),le.getAuditSummary({days:7}).catch(()=>null),le.getMetricsOverview().catch(()=>null),le.getObservabilitySummary({windowMinutes:120}).catch(()=>null),le.getReadinessStatus().catch(()=>null)]),c=t||{},p=Array.isArray(i==null?void 0:i.items)?i.items:[],d=Array.isArray(l==null?void 0:l.items)?l.items:[],f=(()=>{const g=Gt(r||{});return g.length>0?g:Qt(u||{})})(),y=Bt((a==null?void 0:a.summary)||a||{}).slice(0,6),h=a!=null&&a.ok?"当前窗口暂无可观测数据":"未返回可观测性摘要";e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${W(c.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${W(c.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${W(c.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${W(c.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${W(c.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${W(d.length)}</div>
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
                ${p.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':p.map(g=>{var v,b;return`<tr>
                    <td class="cell-id">${n((v=g.id)==null?void 0:v.substring(0,8))}</td>
                    <td>${Pe(g.status)}</td>
                    <td class="cell-truncate">${n((b=g.comment_text)==null?void 0:b.substring(0,60))}</td>
                    <td class="cell-time">${n(V(g.created_at))}</td>
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
          ${vt(f,"未返回运行时配置摘要")}
        </div>

        <div class="section-card">
          <div class="section-card-header">
            <h3>可观测性摘要 (120分钟)</h3>
          </div>
          ${vt(y,h)}
        </div>
      </div>
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{m("正在刷新...","info"),At(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${n(t.message)}</div>`}}const me=D();async function Zt(e){let t=new Set;e.innerHTML=`
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
  `;const i=e.querySelector("#jobs-status"),l=e.querySelector("#jobs-limit");async function s(){var u;t.clear(),r();const a=e.querySelector("#jobs-table-wrapper");a.innerHTML='<div class="page-loading">加载中...</div>';try{const c=await me.getJobs({status:i.value,limit:l.value}),p=Array.isArray(c==null?void 0:c.items)?c.items:[];if(p.length===0){a.innerHTML='<div class="table-empty">暂无任务</div>';return}a.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${p.map(d=>{var f,y,h,g;return`
              <tr data-id="${n(d.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${n(d.id)}" /></td>
                <td class="cell-id" title="${n(d.id)}">${n((f=d.id)==null?void 0:f.substring(0,8))}</td>
                <td>${Pe(d.status)}</td>
                <td class="cell-truncate" title="${n(d.comment_text)}">${n((y=d.comment_text)==null?void 0:y.substring(0,80))}</td>
                <td class="cell-truncate">${n((h=d.reply_text)==null?void 0:h.substring(0,60))}</td>
                <td>${(g=d.risk_flags)!=null&&g.length?d.risk_flags.map(v=>`<span class="risk-flag">${n(v)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${O(d.created_at)}</td>
                <td class="cell-actions">
                  ${d.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${n(d.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${n(d.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(u=a.querySelector("#jobs-select-all"))==null||u.addEventListener("change",d=>{const f=d.target.checked;a.querySelectorAll(".job-checkbox").forEach(y=>{y.checked=f,f?t.add(y.dataset.id):t.delete(y.dataset.id)}),r()}),a.querySelectorAll(".job-checkbox").forEach(d=>{d.addEventListener("change",()=>{d.checked?t.add(d.dataset.id):t.delete(d.dataset.id),r()})}),a.querySelectorAll(".job-approve").forEach(d=>{d.addEventListener("click",async()=>{d.disabled=!0,d.textContent="审批中...";try{await me.approveJob(d.dataset.id),m("审批成功","success"),s()}catch(f){m(`审批失败: ${f.message}`,"error"),d.disabled=!1,d.textContent="审批"}})}),a.querySelectorAll(".job-retry").forEach(d=>{d.addEventListener("click",async()=>{d.disabled=!0,d.textContent="重试中...";try{await me.retryJob(d.dataset.id),m("重试已提交","success"),s()}catch(f){m(`重试失败: ${f.message}`,"error"),d.disabled=!1,d.textContent="重试"}})})}catch(c){a.innerHTML=`<div class="page-error">加载失败: ${n(c.message)}</div>`}}function r(){const a=e.querySelector("#jobs-batch-bar"),u=e.querySelector("#jobs-selected-count");t.size>0?(a.style.display="flex",u.textContent=`已选 ${t.size} 项`):a.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",s),e.querySelector("#jobs-refresh").addEventListener("click",s),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await me.exportJobsCsv({status:i.value,limit:l.value}),m("导出成功","success")}catch(a){m(`导出失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await me.batchApprove([...t]),m(`批量审批 ${t.size} 项成功`,"success"),s()}catch(a){m(`批量审批失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await me.batchRetry([...t]),m(`批量重试 ${t.size} 项成功`,"success"),s()}catch(a){m(`批量重试失败: ${a.message}`,"error")}}),await s()}const Xt=D();async function ei(e){e.innerHTML=`
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
  `;const t=e.querySelector("#metrics-days"),i=e.querySelector("#metrics-summary"),l=e.querySelector("#metrics-table-wrapper");function s(a){const u=Number.parseInt(String(a).trim(),10);return!Number.isFinite(u)||u<1?{value:1,warning:"天数必须在 1-365 之间，已自动调整为 1"}:u>365?{value:365,warning:"最大支持 365 天，已自动调整为 365"}:{value:u,warning:""}}async function r(){const a=s(t.value);t.value=String(a.value),a.warning&&m(a.warning,"warning"),l.innerHTML='<div class="page-loading">加载中...</div>',i.textContent="";try{const u=await Xt.getDailyMetrics({days:String(a.value)}),c=Array.isArray(u==null?void 0:u.items)?u.items:Array.isArray(u)?u:[];if(c.length===0){i.textContent=`最近 ${a.value} 天暂无可展示指标`,l.innerHTML='<div class="table-empty">暂无指标数据</div>';return}const p=c.reduce((d,f)=>(d.comments+=Number(f.comments??f.comment_count??0)||0,d.jobs+=Number(f.jobs??f.job_count??0)||0,d.published+=Number(f.published??f.published_count??0)||0,d.failed+=Number(f.failed??f.failed_count??0)||0,d.skipped+=Number(f.skipped??f.skipped_count??0)||0,d),{comments:0,jobs:0,published:0,failed:0,skipped:0});i.textContent=`最近 ${a.value} 天合计：评论 ${p.comments}，任务 ${p.jobs}，已发布 ${p.published}，失败 ${p.failed}，跳过 ${p.skipped}`,l.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${c.map(d=>`<tr>
              <td class="cell-time">${n(d.date||d.day)}</td>
              <td>${n(d.comments??d.comment_count??0)}</td>
              <td>${n(d.jobs??d.job_count??0)}</td>
              <td style="color:var(--success-color)">${n(d.published??d.published_count??0)}</td>
              <td style="color:var(--danger-color)">${n(d.failed??d.failed_count??0)}</td>
              <td>${n(d.skipped??d.skipped_count??0)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      `}catch(u){i.textContent="",l.innerHTML=`<div class="page-error">加载失败: ${n(u.message)}</div>`,m(`加载每日指标失败: ${u.message}`,"error")}}e.querySelector("#metrics-days-7").addEventListener("click",async()=>{t.value="7",await r()}),e.querySelector("#metrics-days-30").addEventListener("click",async()=>{t.value="30",await r()}),e.querySelector("#metrics-days-90").addEventListener("click",async()=>{t.value="90",await r()}),t.addEventListener("keydown",async a=>{a.key==="Enter"&&await r()}),e.querySelector("#metrics-load").addEventListener("click",r),await r()}const Qe=D();async function ti(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#knowledge-table-wrapper");i.innerHTML='<div class="page-loading">加载中...</div>';try{const l=await Qe.getKnowledgeEntries({limit:50}),s=Array.isArray(l==null?void 0:l.items)?l.items:[];if(s.length===0){i.innerHTML='<div class="table-empty">暂无知识条目</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${s.map(r=>{var a,u;return`<tr>
              <td class="cell-id">${n((a=r.id)==null?void 0:a.toString().substring(0,8))}</td>
              <td>${n(r.category)}</td>
              <td>${n(r.title)}</td>
              <td class="cell-truncate">${n((u=r.content)==null?void 0:u.substring(0,80))}</td>
              <td>${ut(r.enabled!==!1)}</td>
              <td class="cell-time">${O(r.created_at)}</td>
              <td class="cell-actions">
                ${r.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${n(r.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".knowledge-disable").forEach(r=>{r.addEventListener("click",async()=>{try{await Qe.disableKnowledgeEntry(r.dataset.id),m("已禁用","success"),t()}catch(a){m(`操作失败: ${a.message}`,"error")}})})}catch(l){i.innerHTML=`<div class="page-error">加载失败: ${n(l.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const i=e.querySelector("#knowledge-category").value.trim(),l=e.querySelector("#knowledge-title").value.trim(),s=e.querySelector("#knowledge-content").value.trim();if(!i||!l||!s){m("分类、标题和内容不能为空","warning");return}try{await Qe.createKnowledgeEntry({category:i,title:l,content:s}),m("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(r){m(`创建失败: ${r.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const ve=D();function ii(e){return['<option value="">选择空间</option>'].concat(e.map(t=>`<option value="${n(t.id)}">${n(t.title)} (${n(t.space_key)})</option>`)).join("")}function ri(e){return e.length?`
    <table class="data-table">
      <thead><tr>
        <th>ID</th><th>Space Key</th><th>类型</th><th>标题</th><th>摘要</th><th>更新时间</th>
      </tr></thead>
      <tbody>
        ${e.map(t=>`<tr>
              <td class="cell-id">${n(String(t.id))}</td>
              <td>${n(t.space_key)}</td>
              <td>${n(t.space_type)}</td>
              <td>${n(t.title)}</td>
              <td class="cell-truncate">${n((t.summary||"").substring(0,80))}</td>
              <td class="cell-time">${O(t.updated_at)}</td>
            </tr>`).join("")}
      </tbody>
    </table>
  `:'<div class="table-empty">暂无 memory spaces</div>'}function li(e){return e.length?`
    <table class="data-table">
      <thead><tr>
        <th>ID</th><th>Space ID</th><th>主体类型</th><th>主体 ID</th><th>权限</th><th>更新时间</th>
      </tr></thead>
      <tbody>
        ${e.map(t=>`<tr>
              <td class="cell-id">${n(String(t.id))}</td>
              <td>${n(String(t.space_id))}</td>
              <td>${n(t.subject_type)}</td>
              <td>${n(t.subject_id)}</td>
              <td>${n(t.access_level)}</td>
              <td class="cell-time">${O(t.updated_at)}</td>
            </tr>`).join("")}
      </tbody>
    </table>
  `:'<div class="table-empty">暂无 grants</div>'}function si(e){return e.length?`
    <table class="data-table">
      <thead><tr>
        <th>ID</th><th>主体类型</th><th>主体 ID</th><th>平台</th><th>外部 ID</th><th>显示名</th><th>更新时间</th>
      </tr></thead>
      <tbody>
        ${e.map(t=>`<tr>
              <td class="cell-id">${n(String(t.id))}</td>
              <td>${n(t.subject_type)}</td>
              <td>${n(t.subject_id)}</td>
              <td>${n(t.platform)}</td>
              <td>${n(t.external_id)}</td>
              <td>${n(t.display_name||"")}</td>
              <td class="cell-time">${O(t.updated_at)}</td>
            </tr>`).join("")}
      </tbody>
    </table>
  `:'<div class="table-empty">暂无 identity links</div>'}async function ai(e){e.innerHTML=`
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
        <div class="section-card-header"><h3>Grants</h3></div>
        <div class="table-wrapper" id="memory-grants-wrapper"><div class="page-loading">加载中...</div></div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>Identity Links</h3></div>
        <div class="table-wrapper" id="memory-links-wrapper"><div class="page-loading">加载中...</div></div>
      </div>
    </div>
  `;async function t(){const[l,s,r]=await Promise.all([ve.getMemorySpaces({limit:50}),ve.getMemoryGrants({limit:50}),ve.getMemoryIdentityLinks({limit:50})]),a=Array.isArray(l==null?void 0:l.items)?l.items:[],u=Array.isArray(s==null?void 0:s.items)?s.items:[],c=Array.isArray(r==null?void 0:r.items)?r.items:[];e.querySelector("#memory-spaces-wrapper").innerHTML=ri(a),e.querySelector("#memory-grants-wrapper").innerHTML=li(u),e.querySelector("#memory-links-wrapper").innerHTML=si(c),e.querySelector("#memory-grant-space").innerHTML=ii(a)}async function i(){try{await t()}catch(l){const s=n(l.message||"未知错误");e.querySelector("#memory-spaces-wrapper").innerHTML=`<div class="page-error">加载失败: ${s}</div>`,e.querySelector("#memory-grants-wrapper").innerHTML=`<div class="page-error">加载失败: ${s}</div>`,e.querySelector("#memory-links-wrapper").innerHTML=`<div class="page-error">加载失败: ${s}</div>`}}e.querySelector("#memory-space-create").addEventListener("click",async()=>{const l=e.querySelector("#memory-space-key").value.trim(),s=e.querySelector("#memory-space-type").value.trim(),r=e.querySelector("#memory-space-title").value.trim(),a=e.querySelector("#memory-space-summary").value.trim();if(!l||!r){m("Space Key 和标题不能为空","warning");return}try{await ve.createMemorySpace({space_key:l,space_type:s,title:r,summary:a}),m("Space 创建成功","success"),e.querySelector("#memory-space-key").value="",e.querySelector("#memory-space-title").value="",e.querySelector("#memory-space-summary").value="",await i()}catch(u){m(`创建失败: ${u.message}`,"error")}}),e.querySelector("#memory-grant-create").addEventListener("click",async()=>{const l=e.querySelector("#memory-grant-space").value,s=e.querySelector("#memory-grant-subject-type").value.trim(),r=e.querySelector("#memory-grant-subject-id").value.trim(),a=e.querySelector("#memory-grant-access").value.trim();if(!l||!s||!r){m("Space、主体类型和主体 ID 不能为空","warning");return}try{await ve.grantMemorySpaceAccess({space_id:Number(l),subject_type:s,subject_id:r,access_level:a}),m("Grant 创建成功","success"),e.querySelector("#memory-grant-subject-id").value="",await i()}catch(u){m(`创建失败: ${u.message}`,"error")}}),e.querySelector("#memory-link-create").addEventListener("click",async()=>{const l=e.querySelector("#memory-link-subject-type").value.trim(),s=e.querySelector("#memory-link-subject-id").value.trim(),r=e.querySelector("#memory-link-platform").value.trim(),a=e.querySelector("#memory-link-external-id").value.trim(),u=e.querySelector("#memory-link-display-name").value.trim();if(!l||!s||!a){m("主体类型、主体 ID 和外部 ID 不能为空","warning");return}try{await ve.linkMemoryIdentity({subject_type:l,subject_id:s,platform:r,external_id:a,display_name:u}),m("Identity Link 创建成功","success"),e.querySelector("#memory-link-external-id").value="",e.querySelector("#memory-link-display-name").value="",await i()}catch(c){m(`创建失败: ${c.message}`,"error")}}),e.querySelector("#memory-refresh").addEventListener("click",i),await i()}const ke=D();let qe=!1,T=null;async function ni(e){qe=!1,T=null,e.innerHTML=`
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
  `;const t=e.querySelector("#rc-select"),i=e.querySelector("#rc-editor");let l=[];function s(){qe=!0}function r(){return qe?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function a(c){T=c,e.querySelector("#rc-key").value=(c==null?void 0:c.key)||"",e.querySelector("#rc-key").disabled=!!c,e.querySelector("#rc-name").value=(c==null?void 0:c.name)||"",e.querySelector("#rc-desc").value=(c==null?void 0:c.description)||"",e.querySelector("#rc-system-prompt").value=(c==null?void 0:c.system_prompt)||"",e.querySelector("#rc-tone").value=(c==null?void 0:c.tone)||"",e.querySelector("#rc-constraints").value=typeof(c==null?void 0:c.constraints)=="string"?c.constraints:JSON.stringify((c==null?void 0:c.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=c?`编辑: ${c.name||c.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=c&&c.enabled===!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=c&&c.enabled!==!1?"inline-flex":"none",i.style.display="block",qe=!1}i.querySelectorAll(".form-input").forEach(c=>c.addEventListener("input",s));async function u(){try{const c=await ke.getRoleCards({limit:100});l=Array.isArray(c==null?void 0:c.items)?c.items:Array.isArray(c)?c:[],t.innerHTML='<option value="">-- 新建 --</option>'+l.map(p=>`<option value="${n(p.key)}">${n(p.name||p.key)}${p.enabled===!1?" (禁用)":""}</option>`).join("")}catch(c){m(`加载失败: ${c.message}`,"error")}}t.addEventListener("change",()=>{if(!r()){t.value=(T==null?void 0:T.key)||"";return}const c=t.value,p=l.find(d=>d.key===c);a(p||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{r()&&(t.value="",a(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const c={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},p=e.querySelector("#rc-constraints").value.trim();try{c.constraints=p?JSON.parse(p):""}catch{c.constraints=p}if(!c.key){m("Key 不能为空","warning");return}try{T!=null&&T.key?(await ke.updateRoleCard(T.key,c),m("保存成功","success")):(await ke.createRoleCard(c),m("创建成功","success")),qe=!1,await u(),t.value=c.key}catch(d){m(`操作失败: ${d.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(T!=null&&T.key)try{await ke.activateRoleCard(T.key),m("已激活","success"),await u()}catch(c){m(`激活失败: ${c.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(T!=null&&T.key)try{await ke.disableRoleCard(T.key),m("已禁用","success"),await u()}catch(c){m(`禁用失败: ${c.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{u()}),await u()}const je=D();async function oi(e){e.innerHTML=`
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
  `;const t=e.querySelector("#profile-style"),i=e.querySelector("#profile-role"),l=e.querySelector("#profile-style-current"),s=e.querySelector("#profile-role-current"),r=e.querySelector("#profile-style-apply"),a=e.querySelector("#profile-role-apply"),u=e.querySelector("#profile-pending-state");let c=t.value,p=i.value;function d(){const y=t.value!==c,h=i.value!==p;if(r.disabled=!y,a.disabled=!h,y&&h){u.textContent="检测到风格与角色配置均有未应用变更";return}if(y){u.textContent="检测到风格配置有未应用变更";return}if(h){u.textContent="检测到角色配置有未应用变更";return}u.textContent="当前配置与服务端已同步"}async function f({showSuccessToast:y=!1}={}){var b,_,B,x;const[h,g]=await Promise.allSettled([je.getStyleProfile(),je.getRoleProfile()]),v=[];if(h.status==="fulfilled"&&((b=h.value)!=null&&b.style)?(c=h.value.style,t.value=c,l.textContent=`当前: ${c}`):h.status==="rejected"&&v.push(((_=h.reason)==null?void 0:_.message)||"风格配置加载失败"),g.status==="fulfilled"&&((B=g.value)!=null&&B.role)?(p=g.value.role,i.value=p,s.textContent=`当前: ${p}`):g.status==="rejected"&&v.push(((x=g.reason)==null?void 0:x.message)||"角色配置加载失败"),d(),v.length>0){m(`加载配置失败: ${v.join("；")}`,"error");return}y&&m("已从服务端刷新配置","success")}t.addEventListener("change",d),i.addEventListener("change",d),r.addEventListener("click",async()=>{const y=t.value;if(y===c){m("风格未发生变化，无需应用","warning");return}try{await je.setStyleProfile(y),c=y,l.textContent=`当前: ${y}`,d(),m("风格已更新","success")}catch(h){m(`更新失败: ${h.message}`,"error"),d()}}),a.addEventListener("click",async()=>{const y=i.value;if(y===p){m("角色配置未发生变化，无需应用","warning");return}try{await je.setRoleProfile(y),p=y,s.textContent=`当前: ${y}`,d(),m("角色配置已更新","success")}catch(h){m(`更新失败: ${h.message}`,"error"),d()}}),e.querySelector("#profile-refresh").addEventListener("click",async()=>{await f({showSuccessToast:!0})}),await f({showSuccessToast:!1})}function at({columns:e,rows:t,empty:i="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${n(i)}</div>`;const l=e.map(r=>`<th class="${r.class||""}">${n(r.label)}</th>`).join(""),s=t.map(r=>`<tr>${e.map(a=>`<td class="${a.class||""}">${a.render?a.render(r):n(r[a.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${l}</tr></thead>
        <tbody>${s}</tbody>
      </table>
    </div>
  `}const Ze=D();async function ci(e){e.innerHTML=`
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
  `;const t=e.querySelector("#gw-reply"),i=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{i.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const a=e.querySelector("#gw-publish-btn"),u=e.querySelector("#gw-comment-id").value.trim(),c=e.querySelector("#gw-reply").value.trim(),p=e.querySelector("#gw-source").value.trim(),d=e.querySelector("#gw-force").checked;if(!u||!c){m("Comment ID 和回复内容不能为空","warning");return}a.disabled=!0,a.textContent="发布中...";try{await Ze.publishGatewayReply({comment_id:u,reply_text:c,source:p,force_publish:d}),m("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",i.textContent="0 字",await r()}catch(f){m(`发布失败: ${f.message}`,"error")}finally{a.disabled=!1,a.textContent="发布"}});async function l(){const a=e.querySelector("#gw-events-wrapper"),u=e.querySelector("#gw-events-meta"),c=e.querySelector("#gw-limit").value;a.innerHTML='<div class="page-loading">加载中...</div>',u.textContent="";try{const p=await Ze.getGatewayLogs({limit:c}),d=Array.isArray(p==null?void 0:p.items)?p.items:[];if(u.textContent=`最近返回 ${d.length} 条网关事件`,d.length===0){a.innerHTML='<div class="table-empty">暂无网关日志</div>';return}a.innerHTML=at({columns:[{key:"id",label:"ID",class:"cell-id",render:f=>{var y;return n((y=f.id)==null?void 0:y.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:f=>{var y;return n((y=f.comment_id)==null?void 0:y.substring(0,12))}},{key:"status",label:"状态",render:f=>Pe(f.status)},{key:"platform",label:"平台",render:f=>n(f.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:f=>{var y;return n((y=f.reply_text)==null?void 0:y.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:f=>O(f.created_at)}],rows:d})}catch(p){a.innerHTML=`<div class="page-error">加载失败: ${n(p.message)}</div>`}}async function s(){const a=e.querySelector("#gw-publish-wrapper"),u=e.querySelector("#gw-publish-meta"),c=e.querySelector("#gw-limit").value,p=e.querySelector("#gw-status").value;a.innerHTML='<div class="page-loading">加载中...</div>',u.textContent="";try{const d=await Ze.getGatewayPublishLogs({limit:c,status:p}),f=Array.isArray(d==null?void 0:d.items)?d.items:[],y=Number((d==null?void 0:d.total)??f.length)||f.length;if(u.textContent=p?`状态 ${p}，返回 ${f.length} / ${y} 条发布日志`:`返回 ${f.length} / ${y} 条发布日志`,f.length===0){a.innerHTML='<div class="table-empty">暂无发布日志</div>';return}a.innerHTML=at({columns:[{key:"comment_id",label:"Comment ID",class:"cell-id",render:h=>n((h.comment_id||h.canonical_comment_id||"-").toString().substring(0,16))},{key:"status",label:"状态",render:h=>Pe(h.status)},{key:"source",label:"来源",render:h=>n(h.source||"-")},{key:"failure_reason",label:"失败原因",class:"cell-truncate",render:h=>n(h.failure_reason||"-")},{key:"reply_hash",label:"Hash",class:"cell-id",render:h=>n((h.reply_hash||"-").toString().substring(0,12))},{key:"published_at",label:"发布于",class:"cell-time",render:h=>h.published_at?O(h.published_at):"-"},{key:"created_at",label:"记录时间",class:"cell-time",render:h=>O(h.created_at)}],rows:f})}catch(d){a.innerHTML=`<div class="page-error">加载失败: ${n(d.message)}</div>`}}async function r(){await Promise.all([l(),s()])}e.querySelector("#gw-refresh").addEventListener("click",r),e.querySelector("#gw-filter-btn").addEventListener("click",r),await r()}const Xe=D();async function di(e){e.innerHTML=`
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
  `;async function t(){try{const l=await Xe.getAuditSummary({days:7}),s=e.querySelector("#audit-summary-cards");s.innerHTML=`
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
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function i(){const l=e.querySelector("#audit-table-wrapper");l.innerHTML='<div class="page-loading">加载中...</div>';const s=e.querySelector("#audit-action").value.trim(),r=e.querySelector("#audit-ok").value,a=e.querySelector("#audit-limit").value;try{const u=await Xe.getAuditLogs({action:s,ok:r,limit:a}),c=Array.isArray(u==null?void 0:u.items)?u.items:[];if(c.length===0){l.innerHTML='<div class="table-empty">暂无审计日志</div>';return}l.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${c.map(p=>{var d;return`<tr>
              <td class="cell-id">${n((d=p.id)==null?void 0:d.toString().substring(0,8))}</td>
              <td>${n(p.action)}</td>
              <td class="cell-truncate">${n(p.target_id||"-")}</td>
              <td>${p.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${n(p.detail||"-")}</td>
              <td class="cell-time">${O(p.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(u){l.innerHTML=`<div class="page-error">加载失败: ${n(u.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),i()}),e.querySelector("#audit-filter-btn").addEventListener("click",i),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await Xe.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),m("导出成功","success")}catch(l){m(`导出失败: ${l.message}`,"error")}}),await Promise.all([t(),i()])}const ui=/^BV[a-zA-Z0-9]{10}$/,pi={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},bi={"auth:no active credential":"缺少可用的激活凭证，请先添加并激活。","auth:credential_validation_failed":"凭证字段存在，但运行时认证失败，请检查登录状态或凭证是否失效。","config:bilibili_enabled is false":"B 站集成总开关已关闭，请先启用配置。","dependency:diagnostics_unavailable":"诊断信息暂时不可用，请稍后刷新重试。"},fi={manual_queue:"人工队列发布",simulated:"模拟发布流程",webhook:"Webhook 推送",real_publish:"真实发布流程",native_bilibili:"原生 B 站发布"},ge=50;function j(e){const t=e instanceof Error?e.message:String(e??"request_failed");return pi[t]||t}function yi(e){return e?ui.test(e)?null:"invalid_bvid_format":"bvid_required"}function mi(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function vi(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function gi(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(i=>bi[i]||`未识别阻塞原因: ${i}`).join("；")}function hi(e){const t=String(e??"").trim().toLowerCase();return t?fi[t]||`未识别发布模式: ${t}`:"未设置发布模式"}function et(e,t,i){return e?t:i}function $i(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"未设置轮询间隔":t%60===0?`${t/60} 分钟`:`${t} 秒`}function _i(e){const t=Number(e);if(!Number.isFinite(t)||t<=0)return"未设置轮询间隔，请检查轮询配置";if(t<60){const s=60/t;return`约每分钟 ${s.toFixed(s>=10?0:1).replace(/\.0$/,"")} 轮`}if(t<3600){const s=3600/t;return`约每小时 ${s.toFixed(s>=10?0:1).replace(/\.0$/,"")} 轮`}const i=t/3600;return`约每 ${i.toFixed(i>=10?0:1).replace(/\.0$/,"")} 小时 1 轮`}function xi(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"未设置速率限制":`${t} 次/分钟`}function Si(e){const t=Number(e);if(!Number.isFinite(t)||t<=0)return"未设置速率限制，请检查抓取配置";const i=t/60;if(i>=1)return`约每秒 ${i.toFixed(i>=10?0:1).replace(/\.0$/,"")} 次`;const l=60/t;return`约每 ${l.toFixed(l>=10?0:1).replace(/\.0$/,"")} 秒 1 次`}function gt(e,t,i="覆盖率"){const l=Number(t??0);if(!Number.isFinite(l)||l<=0)return`暂无视频，无法计算${i}，请先添加监控对象`;const s=Number(e??0),r=Number.isFinite(s)?Math.min(l,Math.max(0,s)):0,a=(r/l*100).toFixed(1).replace(/\.0$/,"");return`${i} ${a}%（${r}/${l}）`}function wi(e,t){const i=Number(e??0);if(!Number.isFinite(i)||i<=0)return"暂无视频，请先添加 BVID 监控对象";const l=Number(t??0),s=Number.isFinite(l)?Math.min(i,Math.max(0,l)):0,r=Math.max(0,i-s);return`共 ${i} 个视频，轮询中 ${s}，停用 ${r}`}function ht(e,t={}){const i=Number((e==null?void 0:e.videos)??0),l=Number((e==null?void 0:e.comments)??0),s=Number((e==null?void 0:e.events_injected)??l),r=t.subject||(i===1?"视频":"轮询");return l>0||s>0?`${r}完成，处理 ${i} 个视频，新增 ${l} 条评论，已注入 ${s} 个事件。`:i>0?`${r}完成，处理 ${i} 个视频，暂无新增评论，已保留当前评论状态。`:`${r}完成，暂无可处理视频，请先确认监控对象已同步。`}function he(e,t){if(!t)return"";const i=dt(t),l=V(t);return i?`${e}: ${i}（${l}）`:`${e}: ${l}`}function $t(e,t){return e?t?"活跃凭证字段完整，可用于鉴权":"活跃凭证已激活，但缺少关键字段，请检查凭证配置":"当前无活跃凭证，请先添加并激活"}function ki(e){var c,p,d,f,y,h;const t=!!((p=(c=e==null?void 0:e.checks)==null?void 0:c.auth)!=null&&p.ready),i=!!((f=(d=e==null?void 0:e.checks)==null?void 0:d.worker_or_publish)!=null&&f.ready),l=!!((y=e==null?void 0:e.signals)!=null&&y.polling_worker_enabled),s=!!((h=e==null?void 0:e.signals)!=null&&h.native_publish_enabled),r=Array.isArray(e==null?void 0:e.blocking_reasons)?e.blocking_reasons.filter(Boolean):[],a=r.length>0?`，阻塞 ${r.length} 项，详见下方阻塞原因`:"";return l||s?t&&i?`鉴权已就绪，执行链路可用${a}`:t?`鉴权已就绪，但执行链路阻塞${a}`:i?`执行链路可用，但鉴权未就绪${a}`:`鉴权未就绪，执行链路阻塞${a}`:r.length>0?`当前无需鉴权，但诊断校验仍受阻${a}`:"轮询与发布链路均未启用，可按需开启"}function qi(e){var s,r,a;const t=!!((s=e==null?void 0:e.signals)!=null&&s.publish_mode_config_ready),i=!!((r=e==null?void 0:e.signals)!=null&&r.native_publish_enabled),l=!!((a=e==null?void 0:e.signals)!=null&&a.polling_worker_enabled);return[t?"模式配置就绪":"模式配置缺失，请检查发布配置",i?"原生发布启用，可直接进入 B 站发布链路":"原生发布停用，当前不会直接走 B 站发布",l?"轮询链路启用，可配合自动处理评论侧流程":"轮询链路停用，评论侧仅支持手动同步"].join("，")}const _t={ok:{label:"轮询成功",cls:"badge-success"},no_new:{label:"无新增评论",cls:"badge-muted"},error:{label:"轮询失败",cls:"badge-danger"}},$e={no_aid:"缺少视频 aid，暂时无法轮询评论。",retry_exhausted:"评论抓取重试耗尽。"};function Ci(e,t,i){const l=String(e??"").trim().toLowerCase();if(!l)return"-";const s=_t[l]||{label:"未识别轮询状态",cls:"badge-muted"},r=l==="error"&&t?$e[String(t).trim().toLowerCase()]||String(t):"",a=r?` title="${n(r)}"`:"",u=typeof i=="number"&&Number.isFinite(i)?`评论游标: ${i}`:"",p=[l==="ok"?u?"轮询完成，评论游标已推进":"轮询完成":l==="no_new"?u?"本次未发现新评论，评论游标已保留":"本次未发现新评论":_t[l]?"":`原始状态值: ${l}`,r,u].filter(Boolean).map(d=>`<div class="form-hint" style="margin-top:4px;">${n(d)}</div>`).join("");return`<span class="status-badge ${s.cls}"${a}>${n(s.label)}</span>${p}`}function Ei(e){if(String((e==null?void 0:e.last_poll_status)??"").trim().toLowerCase())return Ci(e==null?void 0:e.last_poll_status,e==null?void 0:e.last_poll_error,e==null?void 0:e.last_rpid);if(!(e!=null&&e.last_polled_at))return`<span class="status-badge badge-muted">未轮询</span><div class="form-hint" style="margin-top:4px;">${n(pt(e))}</div>`;const i=typeof(e==null?void 0:e.last_rpid)=="number"&&Number.isFinite(e.last_rpid)?"已轮询但未记录结果，评论游标已保留":"已轮询但未记录结果";return`<span class="status-badge badge-muted">轮询完成</span><div class="form-hint" style="margin-top:4px;">${n(i)}</div>`}function Li(e){if(e==="true")return!0;if(e==="false")return!1}function Ti(e){return e==="true"?"当前筛选暂无轮询中视频，可切换筛选查看停用项":e==="false"?"当前筛选暂无已停用视频，可切换筛选查看轮询中项":"暂无监控视频，请先添加 BVID 作为监控对象"}function H(e){return typeof(e==null?void 0:e.aid)=="number"&&Number.isFinite(e.aid)}function pt(e){return H(e)?e!=null&&e.poll_enabled?"等待首次自动轮询，可稍后刷新查看":"轮询未启用，可手动同步评论":$e.no_aid}function Mi(e){return e.filter(t=>!H(t)).length}function Bi(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)).length}function Ai(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)&&!H(t)).length}function ji(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&H(t)).length}function Ii(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&!H(t)).length}function Pi(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&!(t!=null&&t.last_polled_at)).length}function Ni(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&(t==null?void 0:t.last_polled_at)).length}function Hi(e){return e.filter(t=>(t==null?void 0:t.poll_enabled)&&!(t!=null&&t.last_polled_at)).length}function Ri(e){return e.filter(t=>(t==null?void 0:t.poll_enabled)&&(t==null?void 0:t.last_polled_at)).length}function Oi(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="error").length}function Di(e){return e.filter(t=>{const i=String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase();return i==="ok"||i==="no_new"}).length}function Vi(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="ok").length}function Ui(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="no_new").length}function Ji(e){return e.filter(t=>!(t!=null&&t.last_polled_at)).length}function Wi(e){return e.filter(t=>H(t)&&!(t!=null&&t.last_polled_at)).length}function Ki(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function Fi(e){return e.filter(t=>typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function zi(e){return e.filter(t=>String((t==null?void 0:t.title)??"").trim().length>0).length}function Gi(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0).length}function Yi(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&Number((t==null?void 0:t.comment_count)??0)<=0).length}function Qi(e){return e.filter(t=>typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function Zi(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function Xi(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)<=0&&typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function er(e){return e.filter(t=>H(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function tr(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(H(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid))).length}function ir(e){return e.reduce((t,i)=>{const l=Number((i==null?void 0:i.comment_count)??0);return t+(Number.isFinite(l)&&l>0?l:0)},0)}function rr(e){const t=H(e),i=String((e==null?void 0:e.bvid)??"").trim(),l=String((e==null?void 0:e.id)??(e==null?void 0:e.video_id)??"").trim(),s=[t?`aid: ${e.aid}`:$e.no_aid];return i||s.push(l?`记录 ID: ${l}`:"未同步 BVID"),`${n(i||"未同步 BVID")}${s.filter(Boolean).map(r=>`<div class="form-hint" style="margin-top:4px;">${n(r)}</div>`).join("")}`}function lr(e){const t=[];return H(e)||t.push("aid"),String((e==null?void 0:e.title)??"").trim()||t.push("标题"),typeof(e==null?void 0:e.owner_mid)=="number"&&Number.isFinite(e.owner_mid)||t.push("UP主 MID"),t}function sr(e){const t=[],i=String((e==null?void 0:e.title)??"").trim(),l=lr(e);return l.length>0&&t.push(`缺少 ${l.join(" / ")}`),typeof(e==null?void 0:e.owner_mid)=="number"&&Number.isFinite(e.owner_mid)&&t.push(`UP主 MID: ${e.owner_mid}`),e!=null&&e.updated_at&&t.push(he("更新",e.updated_at)),e!=null&&e.created_at&&t.push(he("创建",e.created_at)),`${n(i||"未同步标题")}${t.map(s=>`<div class="form-hint" style="margin-top:4px;">${n(s)}</div>`).join("")}`}function ar(e){const t=H(e),i=t?"":" disabled",l=t?"":` title="${n($e.no_aid)}"`;return`<button class="btn btn-sm bili-sync" data-id="${n(e.id||e.video_id)}" data-has-aid="${t?"true":"false"}"${i}${l}>同步</button>`}function nr(e){const t=H(e);let i=$e.no_aid;return t&&(i=e!=null&&e.poll_enabled?"自动轮询中，等待计划任务执行":"轮询停用，可手动同步评论"),`${ut(e==null?void 0:e.poll_enabled)}<div class="form-hint" style="margin-top:4px;">${n(i)}</div>`}function or(e){const t=Number((e==null?void 0:e.comment_count)??0),i=Number.isFinite(t)&&t>0?t:0,l=typeof(e==null?void 0:e.last_rpid)=="number"&&Number.isFinite(e.last_rpid);let s=pt(e);return i>0?s=l?"已有评论，游标已记录":"已有评论，缺少游标":e!=null&&e.last_polled_at&&(s=l?"已轮询无评论，保留游标":"已轮询无评论，未记录游标"),`${n(i)}<div class="form-hint" style="margin-top:4px;">${n(s)}</div>`}function cr(e){if(e!=null&&e.last_polled_at){const t=typeof(e==null?void 0:e.last_rpid)=="number"&&Number.isFinite(e.last_rpid)?`评论游标: ${e.last_rpid}`:"未记录评论游标，可在下次轮询后补齐";return`${O(e.last_polled_at)}<div class="form-hint" style="margin-top:4px;">${n(t)}</div>`}return`从未轮询<div class="form-hint" style="margin-top:4px;">${n(pt(e))}</div>`}function dr(e,t,i,l=0,s=ge,r=[]){const a=i==="true"?"轮询中":i==="false"?"已停用":"全部状态",u=Math.floor(l/s)+1,c=Math.max(1,Math.ceil(e/s)),p=Bi(r),d=Math.max(0,r.length-p),f=Ai(r),y=ji(r),h=Ii(r),g=Pi(r),v=Ni(r),b=Hi(r),_=Ri(r),B=Mi(r),x=Math.max(0,r.length-B),C=Oi(r),q=Di(r),L=Vi(r),A=Ui(r),E=Ji(r),I=Wi(r),S=Math.max(0,r.length-E),P=Fi(r),se=Math.max(0,r.length-P),Z=zi(r),ae=Math.max(0,r.length-Z),R=Gi(r),U=Math.max(0,r.length-R),J=Yi(r),X=Qi(r),ne=Zi(r),oe=Xi(r),ee=Math.max(0,r.length-X),ce=Ki(r),K=er(r),de=Math.max(0,r.length-K),te=tr(r),F=ir(r),_e=B>0?`，当前页缺少 aid ${B} 条`:"",ue=i===""&&p>0?`，当前页轮询开启 ${p} 条`:"",pe=i===""&&d>0?`，当前页轮询停用 ${d} 条`:"",be=i===""&&f>0?`，轮询开启但缺少 aid ${f} 条`:"",fe=i===""&&y>0?`，轮询停用但可手动同步 ${y} 条`:"",z=i===""&&h>0?`，轮询停用且缺少 aid ${h} 条`:"",Ce=i===""&&g>0?`，轮询停用且从未轮询 ${g} 条`:"",ie=i===""&&v>0?`，轮询停用且已有轮询记录 ${v} 条`:"",xe=i===""&&b>0?`，轮询开启但尚未轮询 ${b} 条`:"",G=i===""&&_>0?`，轮询开启且已有轮询记录 ${_} 条`:"",re=x>0?`，可手动同步 ${x} 条`:"",Se=q>0?`，正常轮询 ${q} 条`:"",we=L>0?`，成功轮询 ${L} 条`:"",ye=A>0?`，无新增评论 ${A} 条`:"",Y=C>0?`，轮询失败 ${C} 条`:"",Ee=S>0?`，已有轮询记录 ${S} 条`:"",Ne=E>0?`，尚未轮询 ${E} 条`:"",Le=I>0?`，可手动同步但尚未轮询 ${I} 条`:"",He=P>0?`，已识别 UP 主 ${P} 条`:"",Te=se>0?`，缺少 UP 主 ${se} 条`:"",Re=Z>0?`，已抓取标题 ${Z} 条`:"",Oe=ae>0?`，缺少标题 ${ae} 条`:"",De=K>0?`，信息完整 ${K} 条`:"",Ve=de>0?`，信息不完整 ${de} 条`:"",Ue=te>0?`，已轮询但信息不完整 ${te} 条`:"",Me=R>0?`，已有评论视频 ${R} 条`:"",Je=U>0?`，无评论视频 ${U} 条`:"",Be=J>0?`，已轮询但无评论 ${J} 条`:"",We=X>0?`，已有评论游标 ${X} 条`:"",Ae=ne>0?`，有评论但无游标 ${ne} 条`:"",Ke=oe>0?`，无评论但有游标 ${oe} 条`:"",Fe=ee>0?`，无评论游标 ${ee} 条`:"",ze=ce>0?`，已轮询但无游标 ${ce} 条`:"",Ge=F>0?`，关联评论 ${F} 条`:"";return`筛选条件: ${a}，共 ${e} 条，当前展示 ${t} 条，第 ${u}/${c} 页${ue}${pe}${_e}${be}${fe}${z}${Ce}${ie}${xe}${G}${re}${Se}${we}${ye}${Y}${Ee}${Ne}${Le}${He}${Te}${Re}${Oe}${De}${Ve}${Ue}${Me}${Je}${Be}${We}${Ae}${Ke}${Fe}${ze}${Ge}`}const ur=7*24*60*60*1e3;function tt(e,t=Date.now()){const i=new Date(e);if(Number.isNaN(i.getTime()))return"";const l=i.getTime()-t,s=Math.abs(l),r=60*1e3,a=60*r,u=24*a;let c,p;return s<a?(c=Math.max(1,Math.round(s/r)),p="分钟"):s<u?(c=Math.max(1,Math.round(s/a)),p="小时"):(c=Math.max(1,Math.round(s/u)),p="天"),l<=0?`${c}${p}前`:`${c}${p}后`}function w(e,t=Date.now()){if(!e)return{hasExpiry:!1,expired:!1,expiringSoon:!1,label:"未设置过期时间",cls:"badge-muted",detail:""};const i=new Date(e);if(Number.isNaN(i.getTime()))return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"过期时间异常",cls:"badge-danger",detail:String(e)};const l=i.getTime()-t;if(l<=0){const r=tt(e,t);return{hasExpiry:!0,expired:!0,expiringSoon:!1,label:"已过期",cls:"badge-danger",detail:r?`${r}过期，${V(e)}`:V(e)}}if(l<=ur){const r=tt(e,t);return{hasExpiry:!0,expired:!1,expiringSoon:!0,label:"即将过期",cls:"badge-warning",detail:r?`${r}到期，${V(e)}`:V(e)}}const s=tt(e,t);return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"有效期内",cls:"badge-success",detail:s?`${s}到期，${V(e)}`:V(e)}}function nt(e,t=!0){if(!t)return"当前无活跃凭证，无法评估过期状态";const i=e.hasExpiry?e.label==="过期时间异常"?"请检查过期时间格式后重试":e.expired?"建议尽快更新":e.expiringSoon?"建议提前轮换":"当前仍可使用":"需手动确认有效性并定期轮换";return[e.detail||(e.hasExpiry?"":"未设置过期时间"),i].filter(Boolean).join("，")}function pr(e){const t=w(e),i=nt(t),l=i?`<div class="form-hint" style="margin-top:4px;">${n(i)}</div>`:"";return`<span class="status-badge ${t.cls}">${n(t.label)}</span>${l}`}function ot(e,t="未命名凭证"){const i=[],l=String((e==null?void 0:e.name)??"").trim();return!l&&e&&i.push("未填写凭证名称，当前展示默认标签"),e!=null&&e.updated_at&&i.push(he("更新",e.updated_at)),e!=null&&e.created_at&&i.push(he("创建",e.created_at)),`${n(l||t)}${i.map(s=>`<div class="form-hint" style="margin-top:4px;">${n(s)}</div>`).join("")}`}function xt(e){return(e==null?void 0:e.cls)==="badge-danger"?"var(--danger-color)":(e==null?void 0:e.cls)==="badge-warning"?"var(--warning-color)":(e==null?void 0:e.cls)==="badge-success"?"var(--success-color)":"var(--grey-2)"}function ct(e){if(!e)return{label:"未配置凭证",detail:"请先添加并激活凭证用于鉴权"};const t=!!(e!=null&&e.is_active||e!=null&&e.active),i=k(e),l=i?"":bt(e).join(" / "),s=i?"":`缺少 ${l}`;if(e!=null&&e.last_used_at)return{label:dt(e.last_used_at)||"已使用",detail:`${V(e.last_used_at)}，${t?"当前生效":"当前未激活，历史使用记录保留"}${i?"，字段完整":`，${s}`}`};const r=[];return t?r.push(i?"当前生效，等待首次使用":`当前生效，但${s}`):r.push(i?"待手动激活，激活后可用于鉴权":`待补齐 ${l} 后激活`),e!=null&&e.updated_at&&r.push(he("更新",e.updated_at)),e!=null&&e.created_at&&r.push(he("创建",e.created_at)),{label:"从未使用",detail:r.join("，")}}function br(e){const t=ct(e),i=t.detail?`<div class="form-hint" style="margin-top:4px;">${n(t.detail)}</div>`:"";return`${n(t.label)}${i}`}function fr(e){const t=!!(e!=null&&e.is_active||e!=null&&e.active),i=k(e),l=i?"":bt(e).join(" / "),s=i?"":`缺少 ${l}`,r=t?i?"当前生效，字段完整，可用于鉴权":`当前生效，但${s}`:i?"待手动激活，字段完整，激活后即可切换使用":`待补齐 ${l} 后激活`;return`${ut(t)}<div class="form-hint" style="margin-top:4px;">${n(r)}</div>`}function k(e){return!!(e!=null&&e.has_sessdata&&(e!=null&&e.has_bili_jct)&&(e!=null&&e.buvid3))}function bt(e){const t=[];return e!=null&&e.has_sessdata||t.push("SESSDATA"),e!=null&&e.has_bili_jct||t.push("bili_jct"),e!=null&&e.buvid3||t.push("buvid3"),t}function yr(e,t=4){const i=String(e??"").trim();return i?i.endsWith("...")||i.length<=t?i:`...${i.slice(-t)}`:""}function mr(e){const t=[e!=null&&e.has_sessdata?"SESSDATA":"",e!=null&&e.has_bili_jct?"bili_jct":"",e!=null&&e.buvid3?`buvid3:${yr(e.buvid3)}`:""].filter(Boolean).join(" / ")||"未配置指纹",i=[k(e)?"字段完整，可用于鉴权":`缺少 ${bt(e).join(" / ")}`,e!=null&&e.buvid3?"仅展示指纹摘要":"未记录 buvid3 指纹摘要"].filter(Boolean).join("，");return`${n(t)}${i?`<div class="form-hint" style="margin-top:4px;">${n(i)}</div>`:""}`}function jt(e="",t=""){return`激活筛选: ${e==="active"?"仅激活":e==="inactive"?"仅未激活":"全部"}，过期筛选: ${t==="expired"?"已过期":t==="expiring"?"即将过期":t==="valid"?"有效期内":t==="unset"?"未设置过期时间":"全部"}`}function vr(e,t="",i="",l=e.length){const s=e.length,r=It(e,t,i),a=e.filter(o=>o.is_active||o.active),u=e.filter(o=>!(o.is_active||o.active)),c=a.length,p=u.length,d=e.filter(o=>k(o)).length,f=e.filter(o=>(o.is_active||o.active)&&k(o)).length,y=Math.max(0,d-f),h=Math.max(0,c-f),g=Math.max(0,p-y),v=a.filter(o=>o.last_used_at).length,b=Math.max(0,c-v),_=u.filter(o=>o.last_used_at).length,B=Math.max(0,p-_),x=e.filter(o=>k(o)&&o.last_used_at).length,C=Math.max(0,d-x),q=Math.max(0,s-d),L=e.filter(o=>!k(o)&&o.last_used_at).length,A=Math.max(0,q-L),E=e.filter(o=>!o.last_used_at).length,I=Math.max(0,s-E),S=Date.now(),P=e.filter(o=>k(o)&&w(o.expires_at,S).hasExpiry&&!w(o.expires_at,S).expired).length,se=e.filter(o=>k(o)&&w(o.expires_at,S).expired).length,Z=e.filter(o=>k(o)&&w(o.expires_at,S).expiringSoon).length,ae=e.filter(o=>k(o)&&!w(o.expires_at,S).hasExpiry).length,R=e.map(o=>w(o.expires_at,S)),U=a.map(o=>w(o.expires_at,S)),J=u.map(o=>w(o.expires_at,S)),X=R.filter(o=>o.hasExpiry).length,ne=R.filter(o=>o.hasExpiry&&!o.expired).length,oe=R.filter(o=>o.expired).length,ee=R.filter(o=>o.expiringSoon).length,ce=U.filter(o=>o.hasExpiry&&!o.expired).length,K=U.filter(o=>o.expired).length,de=U.filter(o=>o.expiringSoon).length,te=U.filter(o=>!o.hasExpiry).length,F=J.filter(o=>o.hasExpiry&&!o.expired).length,_e=J.filter(o=>o.expired).length,ue=J.filter(o=>o.expiringSoon).length,pe=J.filter(o=>!o.hasExpiry).length,be=e.filter(o=>!k(o)&&w(o.expires_at,S).hasExpiry&&!w(o.expires_at,S).expired).length,fe=e.filter(o=>!k(o)&&w(o.expires_at,S).expired).length,z=e.filter(o=>!k(o)&&w(o.expires_at,S).expiringSoon).length,Ce=e.filter(o=>!k(o)&&!w(o.expires_at,S).hasExpiry).length,ie=R.filter(o=>!o.hasExpiry).length,xe=jt(t,i),G=r.filter(o=>k(o)).length,re=Math.max(0,r.length-G),Se=r.filter(o=>{if(!k(o))return!1;const Q=w(o.expires_at,S);return Q.hasExpiry&&!Q.expired}).length,we=r.filter(o=>k(o)?w(o.expires_at,S).expired:!1).length,ye=r.filter(o=>k(o)?w(o.expires_at,S).expiringSoon:!1).length,Y=r.filter(o=>k(o)?!w(o.expires_at,S).hasExpiry:!1).length,Ee=r.filter(o=>k(o)&&(o.is_active||o.active)).length,Ne=Math.max(0,G-Ee),Le=r.filter(o=>k(o)&&o.last_used_at).length,He=Math.max(0,G-Le),Te=r.filter(o=>!k(o)&&o.last_used_at).length,Re=Math.max(0,re-Te),Oe=r.filter(o=>{if(k(o))return!1;const Q=w(o.expires_at,S);return Q.hasExpiry&&!Q.expired}).length,De=r.filter(o=>k(o)?!1:w(o.expires_at,S).expired).length,Ve=r.filter(o=>k(o)?!1:w(o.expires_at,S).expiringSoon).length,Ue=r.filter(o=>k(o)?!1:!w(o.expires_at,S).hasExpiry).length,Me=r.filter(o=>!k(o)&&(o.is_active||o.active)).length,Je=Math.max(0,re-Me),Be=r.filter(o=>o.is_active||o.active).length,We=Math.max(0,r.length-Be),Ae=r.filter(o=>o.last_used_at).length,Ke=Math.max(0,r.length-Ae),Fe=r.filter(o=>{const Q=w(o.expires_at,S);return Q.hasExpiry&&!Q.expired}).length,ze=r.filter(o=>w(o.expires_at,S).expired).length,Ge=r.filter(o=>w(o.expires_at,S).expiringSoon).length,Ot=r.filter(o=>!w(o.expires_at,S).hasExpiry).length,Dt=t?"":`，激活 ${Be} 个，未激活 ${We} 个`,Vt=t?"":`，完整且激活 ${Ee} 个，完整但未激活 ${Ne} 个`,Ut=t?"":`，缺字段且激活 ${Me} 个，缺字段且未激活 ${Je} 个`,Jt=t||i?`，筛选结果完整 ${G} 个${Vt}，完整且有效 ${Se} 个，完整且已过期 ${we} 个，完整且即将过期 ${ye} 个，完整且未设置过期 ${Y} 个，完整且已使用 ${Le} 个，完整但未使用 ${He} 个，缺字段 ${re} 个${Ut}，缺字段但已使用 ${Te} 个，缺字段且从未使用 ${Re} 个，缺字段但有效 ${Oe} 个，缺字段且已过期 ${De} 个，缺字段且即将过期 ${Ve} 个，缺字段且未设置过期 ${Ue} 个${Dt}，已使用 ${Ae} 个，从未使用 ${Ke} 个，有效 ${Fe} 个，已过期 ${ze} 个，即将过期 ${Ge} 个，未设置过期 ${Ot} 个`:"";return`共 ${s} 个凭证，激活中 ${c} 个，未激活 ${p} 个，激活且完整 ${f} 个，未激活但完整 ${y} 个，激活但缺字段 ${h} 个，未激活且缺字段 ${g} 个，激活且已使用 ${v} 个，激活但从未使用 ${b} 个，未激活且已使用 ${_} 个，未激活但从未使用 ${B} 个，激活且有效 ${ce} 个，未激活且有效 ${F} 个，激活已过期 ${K} 个，未激活已过期 ${_e} 个，激活即将过期 ${de} 个，未激活即将过期 ${ue} 个，激活未设置过期 ${te} 个，未激活未设置过期 ${pe} 个，字段完整 ${d} 个，完整且有效 ${P} 个，完整且已过期 ${se} 个，完整即将过期 ${Z} 个，完整未设置过期 ${ae} 个，完整且已使用 ${x} 个，完整但未使用 ${C} 个，字段缺失 ${q} 个，缺字段但已使用 ${L} 个，缺字段且未使用 ${A} 个，缺字段但有效 ${be} 个，缺字段且已过期 ${fe} 个，缺字段即将过期 ${z} 个，缺字段未设置过期 ${Ce} 个，已使用 ${I} 个，从未使用 ${E} 个，设置过期时间 ${X} 个，有效 ${ne} 个，已过期 ${oe} 个，即将过期 ${ee} 个，未设置 ${ie} 个；筛选条件: ${xe}，当前展示 ${l} 个${Jt}`}function It(e,t="",i=""){const l=Date.now();return e.filter(s=>{const r=s.is_active||s.active;if(t==="active"&&!r||t==="inactive"&&r)return!1;const a=w(s.expires_at,l);return!(i==="expired"&&!a.expired||i==="expiring"&&!a.expiringSoon||i==="valid"&&(!a.hasExpiry||a.expired)||i==="unset"&&a.hasExpiry)})}function gr(e="",t=""){return e||t?`当前筛选暂无匹配凭证（${jt(e,t)}），可调整筛选条件后重试`:"暂无凭证，请先添加并激活可用凭证用于鉴权"}const N=D(),hr={llm_generation:"LLM 生成",search_enrichment:"搜索增强",webhook_publish:"Webhook 发布",native_bilibili_publish:"原生 B 站发布"},$r={configured:"已就绪",inactive:"未启用",fallback_only:"仅回退",missing_inputs:"缺少配置",runtime_credentials_required:"凭证缺失",unsupported:"不支持"};function St(e,t,i){const l=e.querySelector(i);t.forEach(s=>{const r=e.querySelector(s);r==null||r.addEventListener("keydown",a=>{a.key==="Enter"&&(a.preventDefault(),l.disabled||l.click())})})}function Ie(e){return Array.isArray(e)?e.map(t=>String(t??"").trim()).filter(Boolean):[]}function wt(e){return e===!0?{label:"就绪",color:"var(--success-color)"}:e===!1?{label:"阻塞",color:"var(--danger-color)"}:{label:"未知",color:"var(--warning-color)"}}function _r(e){if(!e||typeof e!="object"||Array.isArray(e))return[];const t=e.delivery_capabilities;return!t||typeof t!="object"||Array.isArray(t)?[]:(Array.isArray(t.summary)?t.summary:Array.isArray(t.capabilities)?t.capabilities:[]).filter(l=>l&&typeof l=="object"&&!Array.isArray(l)).map(l=>{const s=l;return{capability:String(s.capability??"").trim(),status:String(s.status??"").trim(),mode:String(s.mode??"").trim(),missing_inputs:Ie(s.missing_inputs)}}).filter(l=>l.capability)}function xr(e){const t=hr[e.capability]??e.capability,i=$r[e.status]??(e.status||"未知"),l=e.mode?`mode=${e.mode}`:"mode=unknown",s=e.missing_inputs.length>0?e.missing_inputs.join(", "):"未提供缺失项";return`${t} [${e.capability}] (${i}, ${l}): ${s}`}function Sr(e){if(!e||typeof e!="object"||Array.isArray(e))return"";const t=e.release_gates,i=e.signals;if(!!(t&&typeof t=="object"&&t.real_auth_ready)||!!(i&&typeof i=="object"&&i.real_auth_ready))return"";const s=typeof i=="object"&&i&&!Array.isArray(i)&&typeof i.auth_probe_reason=="string"?i.auth_probe_reason.trim():"";return!s||s==="not_required"||s==="verified"?"":s}function wr(e){if(!e||typeof e!="object"||Array.isArray(e))return{credentialPresent:!1,credentialComplete:!1,realAuthReady:!1};const t=e.release_gates,i=e.signals;return{credentialPresent:!!((i==null?void 0:i.credential_present)??(t==null?void 0:t.credential_present)),credentialComplete:!!((i==null?void 0:i.credential_complete)??(t==null?void 0:t.credential_complete)),realAuthReady:!!((i==null?void 0:i.real_auth_ready)??(t==null?void 0:t.real_auth_ready))}}function kr(e){const t=e==null?void 0:e.credential,i=wr(e==null?void 0:e.diagnostics);if(t){const s=w(t==null?void 0:t.expires_at);return{activeCredentialName:ot(t,"未配置活跃凭证"),credentialHealth:$t(i.credentialPresent,i.credentialComplete),credentialExpiry:s,credentialExpiryColor:xt(s),credentialExpiryDetail:nt(s,!0),credentialUsage:ct(t)}}if(i.credentialPresent){const s=i.realAuthReady?"运行时外部凭证":"运行时外部凭证（待验证）",r=i.realAuthReady?"后台未托管该凭证，当前运行时鉴权已通过":"后台未托管该凭证，当前仍需检查运行时鉴权状态",a={label:i.realAuthReady?"外部管理":"待确认",cls:i.realAuthReady?"badge-success":"badge-warning"};return{activeCredentialName:`${n(s)}<div class="form-hint" style="margin-top:4px;">${n(r)}</div>`,credentialHealth:i.credentialComplete?i.realAuthReady?"运行时外部凭证字段完整，鉴权探针已通过":"运行时外部凭证字段完整，但鉴权探针尚未通过":"运行时外部凭证已注入，但缺少关键字段，请检查运行时配置",credentialExpiry:a,credentialExpiryColor:i.realAuthReady?"var(--success-color)":"var(--warning-color)",credentialExpiryDetail:i.realAuthReady?"后台未托管该凭证，过期时间需在运行时环境中确认":"后台未托管该凭证，过期时间与有效性需在运行时环境中确认",credentialUsage:{label:i.realAuthReady?"运行时已验证":"运行时待验证",detail:i.realAuthReady?"认证探针已通过，但后台列表未托管该凭证":"后台列表未托管该凭证，请结合运行时诊断继续确认"}}}const l=w(void 0);return{activeCredentialName:ot(null,"未配置活跃凭证"),credentialHealth:$t(!1,!1),credentialExpiry:l,credentialExpiryColor:xt(l),credentialExpiryDetail:nt(l,!1),credentialUsage:ct(null)}}async function qr(e){let t=0;e.innerHTML=`
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
  `;async function i(){var a,u,c,p,d,f,y,h;const r=e.querySelector("#bili-status-cards");r.innerHTML='<div class="page-loading">加载中...</div>';try{const[g,v]=await Promise.allSettled([N.getBilibiliStatus(),N.getReadinessStatus()]);if(g.status!=="fulfilled")throw g.reason;const b=g.value,_=v.status==="fulfilled"&&v.value&&typeof v.value=="object"&&!Array.isArray(v.value)?v.value:null,B=v.status==="rejected"?j(v.reason):"",x=Number((b==null?void 0:b.video_count)??0),C=Number(((a=b==null?void 0:b.videos)==null?void 0:a.poll_enabled_count)??0),q=Math.max(0,x-C),L=wi(x,C),A=gt(C,x),E=gt(q,x,"停用占比"),I=!!((u=b==null?void 0:b.diagnostics)!=null&&u.ready),S=gi((c=b==null?void 0:b.diagnostics)==null?void 0:c.blocking_reasons),P=kr(b),se=P.activeCredentialName,Z=P.credentialHealth,ae=ki(b==null?void 0:b.diagnostics),R=hi((p=b==null?void 0:b.diagnostics)==null?void 0:p.effective_publish_mode),U=qi(b==null?void 0:b.diagnostics),J=et(b==null?void 0:b.enabled,"B 站集成已启用，可管理凭证与视频","B 站集成已停用，当前不会触发轮询或发布"),X=et(b==null?void 0:b.polling_enabled,"评论轮询已启用，会按配置自动抓取评论","评论轮询已停用，仅支持手动同步"),ne=et(b==null?void 0:b.publish_enabled,"发布链路已启用，满足条件后可进入发布流程","发布链路已停用，不会进入自动发布流程"),oe=$i((d=b==null?void 0:b.config)==null?void 0:d.poll_interval_seconds),ee=_i((f=b==null?void 0:b.config)==null?void 0:f.poll_interval_seconds),ce=xi((y=b==null?void 0:b.config)==null?void 0:y.rate_limit_per_minute),K=Si((h=b==null?void 0:b.config)==null?void 0:h.rate_limit_per_minute),de=P.credentialExpiry,te=P.credentialExpiryDetail,F=P.credentialUsage,_e=P.credentialExpiryColor,ue=wt(_==null?void 0:_.foundation_ready),pe=wt(_==null?void 0:_.delivery_ready),be=Ie(_==null?void 0:_.foundation_blockers),fe=Ie(_==null?void 0:_.delivery_blockers),z=Ie(_==null?void 0:_.delivery_capability_blockers),ie=_r(_).filter(Y=>Y.status!=="configured"&&Y.status!=="inactive"),xe=be.length>0?be.join(", "):"无",G=fe.length>0?fe.join(", "):"无",re=z.length>0?z.join(", "):"无",Se=_?ie.length>0?ie.map(Y=>xr(Y)).join("； "):"无":"readiness_unavailable",we=B||ie.length>0?"page-error":"form-hint",ye=Sr(b==null?void 0:b.diagnostics);r.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${b!=null&&b.enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${n(J)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询</div>
          <div class="stat-value">${b!=null&&b.polling_enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${n(X)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布</div>
          <div class="stat-value">${b!=null&&b.publish_enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${n(ne)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">视频数</div>
          <div class="stat-value">${x}</div>
          <div class="form-hint" style="margin-top:6px;">${n(L)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${C}</div>
          <div class="form-hint" style="margin-top:6px;">${n(A)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">停用视频</div>
          <div class="stat-value">${q}</div>
          <div class="form-hint" style="margin-top:6px;">${n(E)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${se}</div>
          <div class="form-hint" style="margin-top:6px;">${n(Z)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${I?"var(--success-color)":"var(--danger-color)"}">${I?"就绪":"阻塞"}</div>
          <div class="form-hint" style="margin-top:6px;">${n(ae)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">基础就绪</div>
          <div class="stat-value" style="color:${ue.color}">${ue.label}</div>
          <div class="form-hint" style="margin-top:6px;">${n(`blockers: ${xe}`)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">交付就绪</div>
          <div class="stat-value" style="color:${pe.color}">${pe.label}</div>
          <div class="form-hint" style="margin-top:6px;">${n(`blockers: ${G}`)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">能力阻塞</div>
          <div class="stat-value" style="color:${z.length>0?"var(--danger-color)":"var(--success-color)"}">${_?z.length:"N/A"}</div>
          <div class="form-hint" style="margin-top:6px;">${n(`canonical: ${_?re:"readiness_unavailable"}`)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布模式</div>
          <div class="stat-value">${n(R)}</div>
          <div class="form-hint" style="margin-top:6px;">${n(U)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询间隔</div>
          <div class="stat-value">${n(oe)}</div>
          ${ee?`<div class="form-hint" style="margin-top:6px;">${n(ee)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">速率限制</div>
          <div class="stat-value">${n(ce)}</div>
          ${K?`<div class="form-hint" style="margin-top:6px;">${n(K)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">凭证过期</div>
          <div class="stat-value" style="font-size:14px; color:${_e}">${n(de.label)}</div>
          ${te?`<div class="form-hint" style="margin-top:6px;">${n(te)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">最近使用</div>
          <div class="stat-value" style="font-size:14px;">${n(F.label)}</div>
          ${F.detail?`<div class="form-hint" style="margin-top:6px;">${n(F.detail)}</div>`:""}
        </div>
        ${S?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">当前阻塞原因: ${n(S)}</div>`:""}
        ${ye?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">原生认证探针: ${n(ye)}</div>`:""}
        ${B?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">Readiness 状态加载失败: ${n(B)}</div>`:""}
        <div class="${we}" style="grid-column: 1 / -1; margin: 0;">
          关键缺失项: ${n(Se)}
        </div>
      `}catch(g){r.innerHTML=`<div class="page-error">状态加载失败: ${n(j(g))}</div>`}}async function l(){const r=e.querySelector("#bili-videos-wrapper"),a=e.querySelector("#bili-video-summary"),u=e.querySelector("#bili-video-filter-btn"),c=e.querySelector("#bili-video-poll-filter"),p=e.querySelector("#bili-video-prev"),d=e.querySelector("#bili-video-next"),f=c.value;a.textContent="加载中...",r.innerHTML='<div class="page-loading">加载中...</div>',c.disabled=!0,u.disabled=!0,p.disabled=!0,d.disabled=!0;try{const y=await N.getBilibiliVideos({limit:ge,offset:t,poll_enabled:Li(f)}),h=Array.isArray(y==null?void 0:y.items)?y.items:Array.isArray(y)?y:[],g=Number((y==null?void 0:y.total)??h.length);if(h.length===0&&g>0&&t>0){t=Math.max(0,t-ge),await l();return}if(a.textContent=dr(g,h.length,f,t,ge,h),p.disabled=t<=0,d.disabled=t+h.length>=g,h.length===0){r.innerHTML=`<div class="table-empty">${n(Ti(f))}</div>`;return}r.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${h.map(v=>`<tr data-id="${n(v.id||v.video_id)}">
              <td class="cell-id">${rr(v)}</td>
              <td class="cell-truncate">${sr(v)}</td>
              <td>${nr(v)}</td>
              <td>${or(v)}</td>
              <td class="cell-time">${cr(v)}</td>
              <td>${Ei(v)}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${n(v.id||v.video_id)}">${v.poll_enabled?"禁用轮询":"启用轮询"}</button>
                ${ar(v)}
                <button class="btn btn-sm btn-danger bili-delete" data-id="${n(v.id||v.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,r.querySelectorAll(".bili-toggle-poll").forEach(v=>{v.addEventListener("click",async()=>{v.disabled=!0;try{await N.toggleBilibiliVideoPoll(v.dataset.id),m("操作成功","success"),await Promise.all([i(),l()])}catch(b){m(`失败: ${j(b)}`,"error")}finally{v.disabled=!1}})}),r.querySelectorAll(".bili-sync").forEach(v=>{v.addEventListener("click",async()=>{if(v.dataset.hasAid==="false"){m($e.no_aid,"warning");return}const b=v.textContent;v.disabled=!0,v.textContent="同步中...";try{const _=await N.syncBilibiliVideo(v.dataset.id);m(ht(_==null?void 0:_.result,{subject:"同步"}),"success"),await Promise.all([i(),l()])}catch(_){m(`同步失败: ${j(_)}`,"error")}finally{v.disabled=!1,v.textContent=b}})}),r.querySelectorAll(".bili-delete").forEach(v=>{v.addEventListener("click",async()=>{if(confirm("确定删除此视频？")){v.disabled=!0;try{await N.deleteBilibiliVideo(v.dataset.id),m("已删除","success"),await Promise.all([i(),l()])}catch(b){m(`删除失败: ${j(b)}`,"error")}finally{v.disabled=!1}}})})}catch(y){a.textContent="视频加载失败",r.innerHTML=`<div class="page-error">加载失败: ${n(j(y))}</div>`}finally{c.disabled=!1,u.disabled=!1}}async function s(){const r=e.querySelector("#bili-creds-wrapper"),a=e.querySelector("#bili-cred-summary"),u=e.querySelector("#bili-cred-active-filter"),c=e.querySelector("#bili-cred-expiry-filter"),p=u.value,d=c.value;a.textContent="加载中...",r.innerHTML='<div class="page-loading">加载中...</div>',u.disabled=!0,c.disabled=!0;try{const f=await N.getBilibiliCredentials(),y=Array.isArray(f==null?void 0:f.items)?f.items:Array.isArray(f)?f:[],h=It(y,p,d);if(a.textContent=vr(y,p,d,h.length),h.length===0){r.innerHTML=`<div class="table-empty">${n(gr(p,d))}</div>`;return}r.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期状态</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${h.map(g=>`<tr data-id="${n(g.id||g.credential_id)}">
              <td>${ot(g)}</td>
              <td class="cell-id">${mr(g)}</td>
              <td>${fr(g)}</td>
              <td>${pr(g.expires_at)}</td>
              <td class="cell-time">${br(g)}</td>
              <td class="cell-actions">
                ${g.is_active||g.active?"":`<button class="btn btn-sm cred-activate" data-id="${n(g.id||g.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${n(g.id||g.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,r.querySelectorAll(".cred-activate").forEach(g=>{g.addEventListener("click",async()=>{g.disabled=!0;try{await N.activateBilibiliCredential(g.dataset.id),m("已激活","success"),await Promise.all([i(),s()])}catch(v){m(`激活失败: ${j(v)}`,"error")}finally{g.disabled=!1}})}),r.querySelectorAll(".cred-delete").forEach(g=>{g.addEventListener("click",async()=>{if(confirm("确定删除此凭证？")){g.disabled=!0;try{await N.deleteBilibiliCredential(g.dataset.id),m("已删除","success"),await Promise.all([i(),s()])}catch(v){m(`删除失败: ${j(v)}`,"error")}finally{g.disabled=!1}}})})}catch(f){a.textContent="凭证加载失败",r.innerHTML=`<div class="page-error">加载失败: ${n(j(f))}</div>`}finally{u.disabled=!1,c.disabled=!1}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const r=e.querySelector("#bili-video-add"),a=e.querySelector("#bili-video-bvid").value.trim(),u=yi(a);if(u){m(j(u),"warning");return}r.disabled=!0,r.textContent="添加中...";try{await N.addBilibiliVideo(a),m("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([i(),l()])}catch(c){m(`添加失败: ${j(c)}`,"error")}finally{r.disabled=!1,r.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{var p;const r=e.querySelector("#cred-add"),a=vi(e.querySelector("#cred-expires").value),u={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:a},c=mi(u);if(c){m(j(c),"warning");return}r.disabled=!0,r.textContent="添加中...";try{const d=await N.addBilibiliCredential(u);m((p=d==null?void 0:d.item)!=null&&p.is_active?"凭证添加成功，已自动激活":"凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([i(),s()])}catch(d){m(`添加失败: ${j(d)}`,"error")}finally{r.disabled=!1,r.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const r=e.querySelector("#bili-poll-btn");r.disabled=!0,r.textContent="轮询中...";try{const a=await N.triggerBilibiliPoll();m(ht(a==null?void 0:a.result),"success"),await Promise.all([i(),l()])}catch(a){m(`轮询失败: ${j(a)}`,"error")}finally{r.disabled=!1,r.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",async()=>{const r=e.querySelector("#bili-refresh");r.disabled=!0,r.textContent="刷新中...";try{await Promise.all([i(),l(),s()])}finally{r.disabled=!1,r.innerHTML='<svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新'}}),e.querySelector("#bili-video-filter-btn").addEventListener("click",()=>{t=0,l()}),e.querySelector("#bili-video-poll-filter").addEventListener("change",()=>{t=0,l()}),e.querySelector("#bili-video-prev").addEventListener("click",()=>{t<=0||(t=Math.max(0,t-ge),l())}),e.querySelector("#bili-video-next").addEventListener("click",()=>{t+=ge,l()}),e.querySelector("#bili-cred-active-filter").addEventListener("change",s),e.querySelector("#bili-cred-expiry-filter").addEventListener("change",s),St(e,["#bili-video-bvid"],"#bili-video-add"),St(e,["#cred-name","#cred-sessdata","#cred-bili-jct","#cred-buvid3","#cred-buvid4","#cred-expires"],"#cred-add"),await Promise.all([i(),l(),s()])}const it=D(),rt="query_recent_comment_ids",lt="query_recent_job_ids",Cr=5;function Pt(e){try{const t=JSON.parse(sessionStorage.getItem(e)||"[]");return Array.isArray(t)?t.filter(i=>typeof i=="string"&&i.trim()!==""):[]}catch{return[]}}function kt(e,t){const i=String(t||"").trim();if(!i)return;const l=Pt(e).filter(s=>s!==i);l.unshift(i),sessionStorage.setItem(e,JSON.stringify(l.slice(0,Cr)))}async function qt(e){var l;const t=JSON.stringify(e,null,2),i=(l=globalThis.navigator)==null?void 0:l.clipboard;return i&&typeof i.writeText=="function"?(await i.writeText(t),!0):!1}function Ct(e){const t=Object.entries(e||{});return t.length===0?'<div class="table-empty">未返回可展示字段</div>':`
    <div class="detail-card">
      ${t.map(([i,l])=>`
        <div class="detail-row">
          <span class="detail-key">${n(i)}</span>
          <span class="detail-value">${n(typeof l=="object"?JSON.stringify(l,null,2):String(l??"-"))}</span>
        </div>
      `).join("")}
    </div>
  `}function Et(e){return String((e==null?void 0:e.canonical_comment_id)||(e==null?void 0:e.comment_id)||(e==null?void 0:e.id)||"").trim()}async function Er(e){e.innerHTML=`
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
  `;const t=e.querySelector("#query-comment-id"),i=e.querySelector("#query-comment-result"),l=e.querySelector("#query-comment-meta"),s=e.querySelector("#query-comment-recent"),r=e.querySelector("#query-comment-copy");let a=null;const u=e.querySelector("#query-job-id"),c=e.querySelector("#query-job-result"),p=e.querySelector("#query-job-meta"),d=e.querySelector("#query-job-recent"),f=e.querySelector("#query-job-copy");let y=null;const h=e.querySelector("#query-comments-meta"),g=e.querySelector("#query-comments-wrapper");function v(x,C,q){const L=Pt(C);if(L.length===0){x.textContent="";return}x.innerHTML=`
      最近查询：
      ${L.map(A=>`<button class="btn btn-link" data-query-id="${n(A)}" type="button">${n(A)}</button>`).join("")}
    `,x.querySelectorAll("[data-query-id]").forEach(A=>{A.addEventListener("click",()=>q(A.dataset.queryId||""))})}async function b(x=""){const C=(x||t.value).trim();if(t.value=C,!C){m("请输入 Comment ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>',r.disabled=!0;try{a=await it.getComment(C)||{},r.disabled=!1,i.innerHTML=Ct(a),l.textContent=`查询成功，共 ${Object.keys(a).length} 个字段`,kt(rt,C),v(s,rt,b)}catch(q){a=null,i.innerHTML=`<div class="page-error">查询失败: ${n(q.message)}</div>`,l.textContent=""}}async function _(x=""){const C=(x||u.value).trim();if(u.value=C,!C){m("请输入 Job ID","warning");return}c.innerHTML='<div class="page-loading">查询中...</div>',f.disabled=!0;try{y=await it.getJob(C)||{},f.disabled=!1,c.innerHTML=`
        ${Ct(y)}
        ${y!=null&&y.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${n(y.comment_id)}">查看关联评论 →</a></div>`:""}
      `,p.textContent=`查询成功，共 ${Object.keys(y).length} 个字段`,kt(lt,C),v(d,lt,_);const L=c.querySelector("#query-goto-comment");L&&L.addEventListener("click",()=>{b(L.dataset.id)})}catch(q){y=null,c.innerHTML=`<div class="page-error">查询失败: ${n(q.message)}</div>`,p.textContent=""}}async function B(){const x=e.querySelector("#query-comments-limit").value,C=e.querySelector("#query-comments-offset").value;g.innerHTML='<div class="page-loading">加载中...</div>',h.textContent="";try{const q=await it.getComments({limit:x,offset:C}),L=Array.isArray(q==null?void 0:q.items)?q.items:[],A=Number((q==null?void 0:q.total)??L.length)||L.length;if(h.textContent=`返回 ${L.length} / ${A} 条评论`,L.length===0){g.innerHTML='<div class="table-empty">暂无评论</div>';return}g.innerHTML=at({columns:[{key:"comment_id",label:"Comment ID",class:"cell-id",render:E=>n(Et(E).substring(0,18)||"-")},{key:"platform",label:"平台",render:E=>n(E.platform||"-")},{key:"source",label:"来源",render:E=>n(E.source||"-")},{key:"content",label:"评论内容",class:"cell-truncate",render:E=>n((E.content||"-").toString().substring(0,80))},{key:"created_at",label:"时间",class:"cell-time",render:E=>O(E.created_at)},{key:"actions",label:"操作",class:"cell-actions",render:E=>{const I=Et(E);return I?`<button class="btn btn-sm query-comment-open" data-comment-id="${n(I)}" type="button">查看详情</button>`:'<span class="form-hint">缺少 ID</span>'}}],rows:L}),g.querySelectorAll(".query-comment-open").forEach(E=>{E.addEventListener("click",()=>{const I=E.dataset.commentId||"";t.value=I,b(I)})})}catch(q){g.innerHTML=`<div class="page-error">加载失败: ${n(q.message)}</div>`}}e.querySelector("#query-comment-btn").addEventListener("click",()=>{b()}),e.querySelector("#query-job-btn").addEventListener("click",()=>{_()}),e.querySelector("#query-comments-load").addEventListener("click",B),t.addEventListener("keydown",x=>{x.key==="Enter"&&b()}),u.addEventListener("keydown",x=>{x.key==="Enter"&&_()}),e.querySelector("#query-comment-clear").addEventListener("click",()=>{t.value="",a=null,r.disabled=!0,l.textContent="",i.innerHTML=""}),e.querySelector("#query-job-clear").addEventListener("click",()=>{u.value="",y=null,f.disabled=!0,p.textContent="",c.innerHTML=""}),r.addEventListener("click",async()=>{if(!a){m("暂无可复制的评论查询结果","warning");return}const x=await qt(a);m(x?"评论查询结果已复制":"当前环境不支持复制，请手动复制",x?"success":"warning")}),f.addEventListener("click",async()=>{if(!y){m("暂无可复制的任务查询结果","warning");return}const x=await qt(y);m(x?"任务查询结果已复制":"当前环境不支持复制，请手动复制",x?"success":"warning")}),v(s,rt,b),v(d,lt,_),await B()}const st={dashboard:{render:At,title:"仪表盘"},jobs:{render:Zt,title:"任务管理"},"daily-metrics":{render:ei,title:"每日指标"},knowledge:{render:ti,title:"知识库"},memory:{render:ai,title:"Memory 管理"},"role-cards":{render:ni,title:"角色卡"},profiles:{render:oi,title:"风格配置"},gateway:{render:ci,title:"网关"},audit:{render:di,title:"审计日志"},bilibili:{render:qr,title:"B站集成"},query:{render:Er,title:"查询"}};let Nt=null;function Lr(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function Ht(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function Rt(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function Tr(e){e.preventDefault();const t=document.getElementById("login-api-key"),i=document.getElementById("login-error"),l=t.value.trim();if(l){window.__ADMIN_API_KEY__=l;try{await $("/api/admin/overview"),sessionStorage.setItem("admin_api_key",l),Rt(),ft("dashboard")}catch{i.textContent="API Key 无效或服务不可用",i.style.display="block",window.__ADMIN_API_KEY__=""}}}function Mr(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",Ht()}function ft(e){if(!st[e])return;Nt=e,document.querySelectorAll("#nav-list .nav-item").forEach(i=>{i.classList.toggle("active",i.dataset.page===e)}),document.getElementById("page-title").textContent=st[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',st[e].render(t).catch(i=>{t.innerHTML=`<div class="page-error">加载失败: ${i.message}</div>`})}function Br(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==Nt&&ft(t)})})}function Ar(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),i=document.getElementById("expand-left-btn");t&&i&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),i.style.display="block"}),i.addEventListener("click",()=>{e.classList.remove("collapsed"),i.style.display="none"}))}function jr(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let i=0;e.addEventListener("click",()=>{i=(i+1)%t.length,t[i]?document.body.setAttribute("data-theme",t[i]):document.body.removeAttribute("data-theme")})}function Ir(){Ar(),jr(),Br(),document.getElementById("login-form").addEventListener("submit",Tr),document.getElementById("logout-btn").addEventListener("click",Mr),Lr()?(Rt(),ft("dashboard")):Ht()}Ir();
