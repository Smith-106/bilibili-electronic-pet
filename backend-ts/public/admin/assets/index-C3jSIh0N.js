(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const l of s)if(l.type==="childList")for(const n of l.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&r(n)}).observe(document,{childList:!0,subtree:!0});function i(s){const l={};return s.integrity&&(l.integrity=s.integrity),s.referrerPolicy&&(l.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?l.credentials="include":s.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(s){if(s.ep)return;s.ep=!0;const l=i(s);fetch(s.href,l)}})();function Vt(e,t,i){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof i=="string"&&i.trim()?i.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function kt(){return(window.__ADMIN_API_KEY__||"").trim()}async function $(e,t={}){const i=kt(),r=new Headers(t.headers||{});i&&r.set("x-api-key",i);const s=await fetch(e,{...t,headers:r}),l=await s.json().catch(()=>({}));if(!s.ok){const n=(l==null?void 0:l.detail)||(l==null?void 0:l.error);throw new Error(Vt(n,s.status,s.statusText))}return l}async function ft(e,t){const i=kt(),r=new Headers;i&&r.set("x-api-key",i);const s=await fetch(e,{headers:r});if(!s.ok)throw new Error("download_failed");const l=await s.blob(),n=URL.createObjectURL(l),u=document.createElement("a");u.href=n,u.download=t,document.body.appendChild(u),u.click(),document.body.removeChild(u),URL.revokeObjectURL(n)}function j(e){const t=new URLSearchParams;for(const[r,s]of Object.entries(e))s!=null&&s!==""&&t.set(r,String(s));const i=t.toString();return i?`?${i}`:""}function D(){return{getOverview(){return $("/api/admin/overview")},getMetricsOverview(){return $("/api/admin/metrics/overview")},getObservabilitySummary({windowMinutes:e,window_minutes:t}={}){return $(`/api/admin/observability/summary${j({window_minutes:e??t})}`)},getJobs({status:e,limit:t}={}){return $(`/api/admin/jobs${j({status:e,limit:t})}`)},getJob(e){return $(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return $(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return $(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return $("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return $("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return ft(`/export/jobs.csv${j({status:e,limit:t})}`,"jobs.csv")},getComments({limit:e,offset:t}={}){return $(`/comments${j({limit:e,offset:t})}`)},getComment(e){return $(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,commentId:t,comment_id:i}={}){return $(`/api/admin/gateway/logs${j({limit:e,comment_id:t??i})}`)},getGatewayPublishLogs({limit:e,offset:t,status:i}={}){return $(`/gateway/publish-logs${j({limit:e,offset:t,status:i})}`)},publishGatewayReply(e){return $("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:i}={}){return $(`/api/admin/audit/summary${j({days:e,action:t,ok:i})}`)},getAuditLogs({limit:e,action:t,ok:i}={}){return $(`/api/audit-log${j({limit:e,action:t,ok:i})}`)},exportAuditCsv({limit:e,action:t,ok:i}={}){return ft(`/export/audit-logs.csv${j({limit:e,action:t,ok:i})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return $(`/api/metrics/daily${j({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return $(`/api/admin/knowledge${j({limit:e,offset:t})}`)},createKnowledgeEntry(e){return $("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return $(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getRoleCards({limit:e,offset:t}={}){return $(`/api/admin/role-cards${j({limit:e,offset:t})}`)},createRoleCard(e){return $("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return $(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return $(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return $(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return $("/api/admin/style-profile")},setStyleProfile(e){return $("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return $("/api/admin/role-profile")},setRoleProfile(e){return $("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return $("/api/admin/bilibili/status")},getReadinessStatus(){return $("/readiness")},getBilibiliVideos({poll_enabled:e,limit:t,offset:i}={}){return $(`/api/admin/bilibili/videos${j({poll_enabled:e,limit:t,offset:i})}`)},addBilibiliVideo(e){return $("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return $(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return $(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return $(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return $("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return $("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return $("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return $(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return $(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function o(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function O(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function dt(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const i=Date.now()-t.getTime(),r=Math.floor(i/1e3);if(r<60)return"刚刚";const s=Math.floor(r/60);if(s<60)return`${s}分钟前`;const l=Math.floor(s/60);if(l<24)return`${l}小时前`;const n=Math.floor(l/24);if(n<30)return`${n}天前`;const u=Math.floor(n/30);return u<12?`${u}个月前`:`${Math.floor(u/12)}年前`}catch{return""}}function Q(e){const t=dt(e),i=O(e);return t?`<span title="${o(i)}">${o(t)}</span>`:`<span title="${o(i)}">${o(i)}</span>`}function W(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const Ut={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function je(e){if(!e)return"";const t=Ut[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${o(t.label)}</span>`}function ct(e,t="是",i="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${o(e?t:i)}</span>`}let Ge=null;function y(e,t="info"){const i=document.getElementById("app-toast");i&&i.remove(),Ge&&clearTimeout(Ge);const r={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},s=document.createElement("div");s.id="app-toast",s.className="toast-notification",s.style.setProperty("--toast-color",r[t]||r.info),s.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(s),requestAnimationFrame(()=>s.classList.add("show"));const l=()=>{s.classList.remove("show"),setTimeout(()=>s.remove(),300)};s.querySelector(".toast-close").onclick=l,Ge=setTimeout(l,4e3)}const ve=D(),Wt=[{label:"LLM 提供方",keys:["llm_provider","llmProvider"]},{label:"搜索提供方",keys:["search_provider","searchProvider"]},{label:"发布模式",keys:["publisher_mode","publisherMode"]},{label:"LLM Key",keys:["llm_api_key_configured","llmApiKeyConfigured"],format:"configured"},{label:"搜索 Key",keys:["search_api_key_configured","searchApiKeyConfigured"],format:"configured"},{label:"Webhook",keys:["publisher_webhook_url_configured","publisherWebhookUrlConfigured"],format:"configured"},{label:"B站采集",keys:["bilibili_enabled","bilibiliEnabled"],format:"enabled"},{label:"B站发布",keys:["bilibili_publish_enabled","bilibiliPublishEnabled"],format:"enabled"},{label:"Kill Switch",keys:["kill_switch","killSwitch"],format:"enabled"}];function Jt(e,t){for(const i of t)if((e==null?void 0:e[i])!==void 0&&(e==null?void 0:e[i])!==null&&(e==null?void 0:e[i])!=="")return e[i]}function Ft(e,t){return t==="configured"?e?"已配置":"未配置":t==="enabled"?e?"开启":"关闭":typeof e=="boolean"?e?"是":"否":String(e)}function Kt(e){return Wt.map(t=>{const i=Jt(e,t.keys);return i===void 0?null:{label:t.label,value:Ft(i,t.format)}}).filter(Boolean)}function vt(e){return String(e).replace(/([a-z0-9])([A-Z])/g,"$1 $2").replace(/[._]/g," ").replace(/\s+/g," ").trim()}function Lt(e,t=""){if(!e||typeof e!="object"||Array.isArray(e))return[];const i=[];for(const[r,s]of Object.entries(e)){const l=t?`${t}.${r}`:r;if(!(s==null||s==="")){if(typeof s=="object"&&!Array.isArray(s)){i.push(...Lt(s,l));continue}if(Array.isArray(s)){s.length>0&&i.push({label:vt(l),value:`${s.length} 项`});continue}i.push({label:vt(l),value:String(s)})}}return i}function yt(e,t){return e.length?`
    <div class="audit-summary-grid">
      ${e.map(i=>`
        <div class="stat-card mini">
          <div class="stat-label">${o(i.label)}</div>
          <div class="stat-value">${o(i.value)}</div>
        </div>
      `).join("")}
    </div>
  `:`<div class="table-empty" style="padding:16px;">${o(t)}</div>`}async function Tt(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,i,r,s,l,n]=await Promise.all([ve.getOverview().catch(()=>null),ve.getJobs({limit:5}).catch(()=>null),ve.getGatewayLogs({limit:5}).catch(()=>null),ve.getAuditSummary({days:7}).catch(()=>null),ve.getMetricsOverview().catch(()=>null),ve.getObservabilitySummary({windowMinutes:120}).catch(()=>null)]),u=t||{},d=Array.isArray(i==null?void 0:i.items)?i.items:[],p=Array.isArray(r==null?void 0:r.items)?r.items:[],c=Kt(l||{}),f=Lt((n==null?void 0:n.summary)||n||{}).slice(0,6);e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${W(u.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${W(u.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${W(u.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${W(u.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${W(u.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${W(p.length)}</div>
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
                ${d.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':d.map(b=>{var g,h;return`<tr>
                    <td class="cell-id">${o((g=b.id)==null?void 0:g.substring(0,8))}</td>
                    <td>${je(b.status)}</td>
                    <td class="cell-truncate">${o((h=b.comment_text)==null?void 0:h.substring(0,60))}</td>
                    <td class="cell-time">${o(O(b.created_at))}</td>
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
          ${yt(c,"未返回运行时配置摘要")}
        </div>

        <div class="section-card">
          <div class="section-card-header">
            <h3>可观测性摘要 (120分钟)</h3>
          </div>
          ${yt(f,"未返回可观测性摘要")}
        </div>
      </div>
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{y("正在刷新...","info"),Tt(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${o(t.message)}</div>`}}const ye=D();async function zt(e){let t=new Set;e.innerHTML=`
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
  `;const i=e.querySelector("#jobs-status"),r=e.querySelector("#jobs-limit");async function s(){var u;t.clear(),l();const n=e.querySelector("#jobs-table-wrapper");n.innerHTML='<div class="page-loading">加载中...</div>';try{const d=await ye.getJobs({status:i.value,limit:r.value}),p=Array.isArray(d==null?void 0:d.items)?d.items:[];if(p.length===0){n.innerHTML='<div class="table-empty">暂无任务</div>';return}n.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${p.map(c=>{var f,b,g,h;return`
              <tr data-id="${o(c.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${o(c.id)}" /></td>
                <td class="cell-id" title="${o(c.id)}">${o((f=c.id)==null?void 0:f.substring(0,8))}</td>
                <td>${je(c.status)}</td>
                <td class="cell-truncate" title="${o(c.comment_text)}">${o((b=c.comment_text)==null?void 0:b.substring(0,80))}</td>
                <td class="cell-truncate">${o((g=c.reply_text)==null?void 0:g.substring(0,60))}</td>
                <td>${(h=c.risk_flags)!=null&&h.length?c.risk_flags.map(m=>`<span class="risk-flag">${o(m)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${Q(c.created_at)}</td>
                <td class="cell-actions">
                  ${c.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${o(c.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${o(c.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(u=n.querySelector("#jobs-select-all"))==null||u.addEventListener("change",c=>{const f=c.target.checked;n.querySelectorAll(".job-checkbox").forEach(b=>{b.checked=f,f?t.add(b.dataset.id):t.delete(b.dataset.id)}),l()}),n.querySelectorAll(".job-checkbox").forEach(c=>{c.addEventListener("change",()=>{c.checked?t.add(c.dataset.id):t.delete(c.dataset.id),l()})}),n.querySelectorAll(".job-approve").forEach(c=>{c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="审批中...";try{await ye.approveJob(c.dataset.id),y("审批成功","success"),s()}catch(f){y(`审批失败: ${f.message}`,"error"),c.disabled=!1,c.textContent="审批"}})}),n.querySelectorAll(".job-retry").forEach(c=>{c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="重试中...";try{await ye.retryJob(c.dataset.id),y("重试已提交","success"),s()}catch(f){y(`重试失败: ${f.message}`,"error"),c.disabled=!1,c.textContent="重试"}})})}catch(d){n.innerHTML=`<div class="page-error">加载失败: ${o(d.message)}</div>`}}function l(){const n=e.querySelector("#jobs-batch-bar"),u=e.querySelector("#jobs-selected-count");t.size>0?(n.style.display="flex",u.textContent=`已选 ${t.size} 项`):n.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",s),e.querySelector("#jobs-refresh").addEventListener("click",s),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await ye.exportJobsCsv({status:i.value,limit:r.value}),y("导出成功","success")}catch(n){y(`导出失败: ${n.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await ye.batchApprove([...t]),y(`批量审批 ${t.size} 项成功`,"success"),s()}catch(n){y(`批量审批失败: ${n.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await ye.batchRetry([...t]),y(`批量重试 ${t.size} 项成功`,"success"),s()}catch(n){y(`批量重试失败: ${n.message}`,"error")}}),await s()}const Gt=D();async function Yt(e){e.innerHTML=`
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
  `;const t=e.querySelector("#metrics-days"),i=e.querySelector("#metrics-summary"),r=e.querySelector("#metrics-table-wrapper");function s(n){const u=Number.parseInt(String(n).trim(),10);return!Number.isFinite(u)||u<1?{value:1,warning:"天数必须在 1-365 之间，已自动调整为 1"}:u>365?{value:365,warning:"最大支持 365 天，已自动调整为 365"}:{value:u,warning:""}}async function l(){const n=s(t.value);t.value=String(n.value),n.warning&&y(n.warning,"warning"),r.innerHTML='<div class="page-loading">加载中...</div>',i.textContent="";try{const u=await Gt.getDailyMetrics({days:String(n.value)}),d=Array.isArray(u==null?void 0:u.items)?u.items:Array.isArray(u)?u:[];if(d.length===0){i.textContent=`最近 ${n.value} 天暂无可展示指标`,r.innerHTML='<div class="table-empty">暂无指标数据</div>';return}const p=d.reduce((c,f)=>(c.comments+=Number(f.comments??f.comment_count??0)||0,c.jobs+=Number(f.jobs??f.job_count??0)||0,c.published+=Number(f.published??f.published_count??0)||0,c.failed+=Number(f.failed??f.failed_count??0)||0,c.skipped+=Number(f.skipped??f.skipped_count??0)||0,c),{comments:0,jobs:0,published:0,failed:0,skipped:0});i.textContent=`最近 ${n.value} 天合计：评论 ${p.comments}，任务 ${p.jobs}，已发布 ${p.published}，失败 ${p.failed}，跳过 ${p.skipped}`,r.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${d.map(c=>`<tr>
              <td class="cell-time">${o(c.date||c.day)}</td>
              <td>${o(c.comments??c.comment_count??0)}</td>
              <td>${o(c.jobs??c.job_count??0)}</td>
              <td style="color:var(--success-color)">${o(c.published??c.published_count??0)}</td>
              <td style="color:var(--danger-color)">${o(c.failed??c.failed_count??0)}</td>
              <td>${o(c.skipped??c.skipped_count??0)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      `}catch(u){i.textContent="",r.innerHTML=`<div class="page-error">加载失败: ${o(u.message)}</div>`,y(`加载每日指标失败: ${u.message}`,"error")}}e.querySelector("#metrics-days-7").addEventListener("click",async()=>{t.value="7",await l()}),e.querySelector("#metrics-days-30").addEventListener("click",async()=>{t.value="30",await l()}),e.querySelector("#metrics-days-90").addEventListener("click",async()=>{t.value="90",await l()}),t.addEventListener("keydown",async n=>{n.key==="Enter"&&await l()}),e.querySelector("#metrics-load").addEventListener("click",l),await l()}const Ye=D();async function Qt(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#knowledge-table-wrapper");i.innerHTML='<div class="page-loading">加载中...</div>';try{const r=await Ye.getKnowledgeEntries({limit:50}),s=Array.isArray(r==null?void 0:r.items)?r.items:[];if(s.length===0){i.innerHTML='<div class="table-empty">暂无知识条目</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${s.map(l=>{var n,u;return`<tr>
              <td class="cell-id">${o((n=l.id)==null?void 0:n.toString().substring(0,8))}</td>
              <td>${o(l.category)}</td>
              <td>${o(l.title)}</td>
              <td class="cell-truncate">${o((u=l.content)==null?void 0:u.substring(0,80))}</td>
              <td>${ct(l.enabled!==!1)}</td>
              <td class="cell-time">${Q(l.created_at)}</td>
              <td class="cell-actions">
                ${l.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${o(l.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".knowledge-disable").forEach(l=>{l.addEventListener("click",async()=>{try{await Ye.disableKnowledgeEntry(l.dataset.id),y("已禁用","success"),t()}catch(n){y(`操作失败: ${n.message}`,"error")}})})}catch(r){i.innerHTML=`<div class="page-error">加载失败: ${o(r.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const i=e.querySelector("#knowledge-category").value.trim(),r=e.querySelector("#knowledge-title").value.trim(),s=e.querySelector("#knowledge-content").value.trim();if(!i||!r||!s){y("分类、标题和内容不能为空","warning");return}try{await Ye.createKnowledgeEntry({category:i,title:r,content:s}),y("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(l){y(`创建失败: ${l.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const Se=D();let Ce=!1,T=null;async function Zt(e){Ce=!1,T=null,e.innerHTML=`
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
  `;const t=e.querySelector("#rc-select"),i=e.querySelector("#rc-editor");let r=[];function s(){Ce=!0}function l(){return Ce?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function n(d){T=d,e.querySelector("#rc-key").value=(d==null?void 0:d.key)||"",e.querySelector("#rc-key").disabled=!!d,e.querySelector("#rc-name").value=(d==null?void 0:d.name)||"",e.querySelector("#rc-desc").value=(d==null?void 0:d.description)||"",e.querySelector("#rc-system-prompt").value=(d==null?void 0:d.system_prompt)||"",e.querySelector("#rc-tone").value=(d==null?void 0:d.tone)||"",e.querySelector("#rc-constraints").value=typeof(d==null?void 0:d.constraints)=="string"?d.constraints:JSON.stringify((d==null?void 0:d.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=d?`编辑: ${d.name||d.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=d&&d.enabled===!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=d&&d.enabled!==!1?"inline-flex":"none",i.style.display="block",Ce=!1}i.querySelectorAll(".form-input").forEach(d=>d.addEventListener("input",s));async function u(){try{const d=await Se.getRoleCards({limit:100});r=Array.isArray(d==null?void 0:d.items)?d.items:Array.isArray(d)?d:[],t.innerHTML='<option value="">-- 新建 --</option>'+r.map(p=>`<option value="${o(p.key)}">${o(p.name||p.key)}${p.enabled===!1?" (禁用)":""}</option>`).join("")}catch(d){y(`加载失败: ${d.message}`,"error")}}t.addEventListener("change",()=>{if(!l()){t.value=(T==null?void 0:T.key)||"";return}const d=t.value,p=r.find(c=>c.key===d);n(p||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{l()&&(t.value="",n(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const d={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},p=e.querySelector("#rc-constraints").value.trim();try{d.constraints=p?JSON.parse(p):""}catch{d.constraints=p}if(!d.key){y("Key 不能为空","warning");return}try{T!=null&&T.key?(await Se.updateRoleCard(T.key,d),y("保存成功","success")):(await Se.createRoleCard(d),y("创建成功","success")),Ce=!1,await u(),t.value=d.key}catch(c){y(`操作失败: ${c.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(T!=null&&T.key)try{await Se.activateRoleCard(T.key),y("已激活","success"),await u()}catch(d){y(`激活失败: ${d.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(T!=null&&T.key)try{await Se.disableRoleCard(T.key),y("已禁用","success"),await u()}catch(d){y(`禁用失败: ${d.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{u()}),await u()}const Ae=D();async function Xt(e){e.innerHTML=`
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
  `;const t=e.querySelector("#profile-style"),i=e.querySelector("#profile-role"),r=e.querySelector("#profile-style-current"),s=e.querySelector("#profile-role-current"),l=e.querySelector("#profile-style-apply"),n=e.querySelector("#profile-role-apply"),u=e.querySelector("#profile-pending-state");let d=t.value,p=i.value;function c(){const b=t.value!==d,g=i.value!==p;if(l.disabled=!b,n.disabled=!g,b&&g){u.textContent="检测到风格与角色配置均有未应用变更";return}if(b){u.textContent="检测到风格配置有未应用变更";return}if(g){u.textContent="检测到角色配置有未应用变更";return}u.textContent="当前配置与服务端已同步"}async function f({showSuccessToast:b=!1}={}){var v,_,B,x;const[g,h]=await Promise.allSettled([Ae.getStyleProfile(),Ae.getRoleProfile()]),m=[];if(g.status==="fulfilled"&&((v=g.value)!=null&&v.style)?(d=g.value.style,t.value=d,r.textContent=`当前: ${d}`):g.status==="rejected"&&m.push(((_=g.reason)==null?void 0:_.message)||"风格配置加载失败"),h.status==="fulfilled"&&((B=h.value)!=null&&B.role)?(p=h.value.role,i.value=p,s.textContent=`当前: ${p}`):h.status==="rejected"&&m.push(((x=h.reason)==null?void 0:x.message)||"角色配置加载失败"),c(),m.length>0){y(`加载配置失败: ${m.join("；")}`,"error");return}b&&y("已从服务端刷新配置","success")}t.addEventListener("change",c),i.addEventListener("change",c),l.addEventListener("click",async()=>{const b=t.value;if(b===d){y("风格未发生变化，无需应用","warning");return}try{await Ae.setStyleProfile(b),d=b,r.textContent=`当前: ${b}`,c(),y("风格已更新","success")}catch(g){y(`更新失败: ${g.message}`,"error"),c()}}),n.addEventListener("click",async()=>{const b=i.value;if(b===p){y("角色配置未发生变化，无需应用","warning");return}try{await Ae.setRoleProfile(b),p=b,s.textContent=`当前: ${b}`,c(),y("角色配置已更新","success")}catch(g){y(`更新失败: ${g.message}`,"error"),c()}}),e.querySelector("#profile-refresh").addEventListener("click",async()=>{await f({showSuccessToast:!0})}),await f({showSuccessToast:!1})}function st({columns:e,rows:t,empty:i="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${o(i)}</div>`;const r=e.map(l=>`<th class="${l.class||""}">${o(l.label)}</th>`).join(""),s=t.map(l=>`<tr>${e.map(n=>`<td class="${n.class||""}">${n.render?n.render(l):o(l[n.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${r}</tr></thead>
        <tbody>${s}</tbody>
      </table>
    </div>
  `}const Qe=D();async function ei(e){e.innerHTML=`
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
  `;const t=e.querySelector("#gw-reply"),i=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{i.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const n=e.querySelector("#gw-publish-btn"),u=e.querySelector("#gw-comment-id").value.trim(),d=e.querySelector("#gw-reply").value.trim(),p=e.querySelector("#gw-source").value.trim(),c=e.querySelector("#gw-force").checked;if(!u||!d){y("Comment ID 和回复内容不能为空","warning");return}n.disabled=!0,n.textContent="发布中...";try{await Qe.publishGatewayReply({comment_id:u,reply_text:d,source:p,force_publish:c}),y("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",i.textContent="0 字",await l()}catch(f){y(`发布失败: ${f.message}`,"error")}finally{n.disabled=!1,n.textContent="发布"}});async function r(){const n=e.querySelector("#gw-events-wrapper"),u=e.querySelector("#gw-events-meta"),d=e.querySelector("#gw-limit").value;n.innerHTML='<div class="page-loading">加载中...</div>',u.textContent="";try{const p=await Qe.getGatewayLogs({limit:d}),c=Array.isArray(p==null?void 0:p.items)?p.items:[];if(u.textContent=`最近返回 ${c.length} 条网关事件`,c.length===0){n.innerHTML='<div class="table-empty">暂无网关日志</div>';return}n.innerHTML=st({columns:[{key:"id",label:"ID",class:"cell-id",render:f=>{var b;return o((b=f.id)==null?void 0:b.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:f=>{var b;return o((b=f.comment_id)==null?void 0:b.substring(0,12))}},{key:"status",label:"状态",render:f=>je(f.status)},{key:"platform",label:"平台",render:f=>o(f.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:f=>{var b;return o((b=f.reply_text)==null?void 0:b.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:f=>Q(f.created_at)}],rows:c})}catch(p){n.innerHTML=`<div class="page-error">加载失败: ${o(p.message)}</div>`}}async function s(){const n=e.querySelector("#gw-publish-wrapper"),u=e.querySelector("#gw-publish-meta"),d=e.querySelector("#gw-limit").value,p=e.querySelector("#gw-status").value;n.innerHTML='<div class="page-loading">加载中...</div>',u.textContent="";try{const c=await Qe.getGatewayPublishLogs({limit:d,status:p}),f=Array.isArray(c==null?void 0:c.items)?c.items:[],b=Number((c==null?void 0:c.total)??f.length)||f.length;if(u.textContent=p?`状态 ${p}，返回 ${f.length} / ${b} 条发布日志`:`返回 ${f.length} / ${b} 条发布日志`,f.length===0){n.innerHTML='<div class="table-empty">暂无发布日志</div>';return}n.innerHTML=st({columns:[{key:"comment_id",label:"Comment ID",class:"cell-id",render:g=>o((g.comment_id||g.canonical_comment_id||"-").toString().substring(0,16))},{key:"status",label:"状态",render:g=>je(g.status)},{key:"source",label:"来源",render:g=>o(g.source||"-")},{key:"failure_reason",label:"失败原因",class:"cell-truncate",render:g=>o(g.failure_reason||"-")},{key:"reply_hash",label:"Hash",class:"cell-id",render:g=>o((g.reply_hash||"-").toString().substring(0,12))},{key:"published_at",label:"发布于",class:"cell-time",render:g=>g.published_at?Q(g.published_at):"-"},{key:"created_at",label:"记录时间",class:"cell-time",render:g=>Q(g.created_at)}],rows:f})}catch(c){n.innerHTML=`<div class="page-error">加载失败: ${o(c.message)}</div>`}}async function l(){await Promise.all([r(),s()])}e.querySelector("#gw-refresh").addEventListener("click",l),e.querySelector("#gw-filter-btn").addEventListener("click",l),await l()}const Ze=D();async function ti(e){e.innerHTML=`
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
  `;async function t(){try{const r=await Ze.getAuditSummary({days:7}),s=e.querySelector("#audit-summary-cards");s.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">总操作</div>
          <div class="stat-value">${(r==null?void 0:r.total)??0}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">成功</div>
          <div class="stat-value" style="color:var(--success-color)">${(r==null?void 0:r.ok_count)??0}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">失败</div>
          <div class="stat-value" style="color:var(--danger-color)">${(r==null?void 0:r.failed_count)??0}</div>
        </div>
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function i(){const r=e.querySelector("#audit-table-wrapper");r.innerHTML='<div class="page-loading">加载中...</div>';const s=e.querySelector("#audit-action").value.trim(),l=e.querySelector("#audit-ok").value,n=e.querySelector("#audit-limit").value;try{const u=await Ze.getAuditLogs({action:s,ok:l,limit:n}),d=Array.isArray(u==null?void 0:u.items)?u.items:[];if(d.length===0){r.innerHTML='<div class="table-empty">暂无审计日志</div>';return}r.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${d.map(p=>{var c;return`<tr>
              <td class="cell-id">${o((c=p.id)==null?void 0:c.toString().substring(0,8))}</td>
              <td>${o(p.action)}</td>
              <td class="cell-truncate">${o(p.target_id||"-")}</td>
              <td>${p.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${o(p.detail||"-")}</td>
              <td class="cell-time">${Q(p.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(u){r.innerHTML=`<div class="page-error">加载失败: ${o(u.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),i()}),e.querySelector("#audit-filter-btn").addEventListener("click",i),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await Ze.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),y("导出成功","success")}catch(r){y(`导出失败: ${r.message}`,"error")}}),await Promise.all([t(),i()])}const ii=/^BV[a-zA-Z0-9]{10}$/,li={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},ri={"auth:no active credential":"缺少可用的激活凭证，请先添加并激活。","auth:credential_validation_failed":"凭证字段存在，但运行时认证失败，请检查登录状态或凭证是否失效。","config:bilibili_enabled is false":"B 站集成总开关已关闭，请先启用配置。","dependency:diagnostics_unavailable":"诊断信息暂时不可用，请稍后刷新重试。"},si={manual_queue:"人工队列发布",simulated:"模拟发布流程",webhook:"Webhook 推送",real_publish:"真实发布流程",native_bilibili:"原生 B 站发布"},me=50;function A(e){const t=e instanceof Error?e.message:String(e??"request_failed");return li[t]||t}function ni(e){return e?ii.test(e)?null:"invalid_bvid_format":"bvid_required"}function ai(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function oi(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function di(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(i=>ri[i]||`未识别阻塞原因: ${i}`).join("；")}function ci(e){const t=String(e??"").trim().toLowerCase();return t?si[t]||`未识别发布模式: ${t}`:"未设置发布模式"}function Xe(e,t,i){return e?t:i}function ui(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"未设置轮询间隔":t%60===0?`${t/60} 分钟`:`${t} 秒`}function pi(e){const t=Number(e);if(!Number.isFinite(t)||t<=0)return"未设置轮询间隔，请检查轮询配置";if(t<60){const s=60/t;return`约每分钟 ${s.toFixed(s>=10?0:1).replace(/\.0$/,"")} 轮`}if(t<3600){const s=3600/t;return`约每小时 ${s.toFixed(s>=10?0:1).replace(/\.0$/,"")} 轮`}const i=t/3600;return`约每 ${i.toFixed(i>=10?0:1).replace(/\.0$/,"")} 小时 1 轮`}function bi(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"未设置速率限制":`${t} 次/分钟`}function fi(e){const t=Number(e);if(!Number.isFinite(t)||t<=0)return"未设置速率限制，请检查抓取配置";const i=t/60;if(i>=1)return`约每秒 ${i.toFixed(i>=10?0:1).replace(/\.0$/,"")} 次`;const r=60/t;return`约每 ${r.toFixed(r>=10?0:1).replace(/\.0$/,"")} 秒 1 次`}function mt(e,t,i="覆盖率"){const r=Number(t??0);if(!Number.isFinite(r)||r<=0)return`暂无视频，无法计算${i}，请先添加监控对象`;const s=Number(e??0),l=Number.isFinite(s)?Math.min(r,Math.max(0,s)):0,n=(l/r*100).toFixed(1).replace(/\.0$/,"");return`${i} ${n}%（${l}/${r}）`}function vi(e,t){const i=Number(e??0);if(!Number.isFinite(i)||i<=0)return"暂无视频，请先添加 BVID 监控对象";const r=Number(t??0),s=Number.isFinite(r)?Math.min(i,Math.max(0,r)):0,l=Math.max(0,i-s);return`共 ${i} 个视频，轮询中 ${s}，停用 ${l}`}function gt(e,t={}){const i=Number((e==null?void 0:e.videos)??0),r=Number((e==null?void 0:e.comments)??0),s=Number((e==null?void 0:e.events_injected)??r),l=t.subject||(i===1?"视频":"轮询");return r>0||s>0?`${l}完成，处理 ${i} 个视频，新增 ${r} 条评论，已注入 ${s} 个事件。`:i>0?`${l}完成，处理 ${i} 个视频，暂无新增评论，已保留当前评论状态。`:`${l}完成，暂无可处理视频，请先确认监控对象已同步。`}function ge(e,t){if(!t)return"";const i=dt(t),r=O(t);return i?`${e}: ${i}（${r}）`:`${e}: ${r}`}function ht(e,t){return e?t?"活跃凭证字段完整，可用于鉴权":"活跃凭证已激活，但缺少关键字段，请检查凭证配置":"当前无活跃凭证，请先添加并激活"}function yi(e){var d,p,c,f,b,g;const t=!!((p=(d=e==null?void 0:e.checks)==null?void 0:d.auth)!=null&&p.ready),i=!!((f=(c=e==null?void 0:e.checks)==null?void 0:c.worker_or_publish)!=null&&f.ready),r=!!((b=e==null?void 0:e.signals)!=null&&b.polling_worker_enabled),s=!!((g=e==null?void 0:e.signals)!=null&&g.native_publish_enabled),l=Array.isArray(e==null?void 0:e.blocking_reasons)?e.blocking_reasons.filter(Boolean):[],n=l.length>0?`，阻塞 ${l.length} 项，详见下方阻塞原因`:"";return r||s?t&&i?`鉴权已就绪，执行链路可用${n}`:t?`鉴权已就绪，但执行链路阻塞${n}`:i?`执行链路可用，但鉴权未就绪${n}`:`鉴权未就绪，执行链路阻塞${n}`:l.length>0?`当前无需鉴权，但诊断校验仍受阻${n}`:"轮询与发布链路均未启用，可按需开启"}function mi(e){var s,l,n;const t=!!((s=e==null?void 0:e.signals)!=null&&s.publish_mode_config_ready),i=!!((l=e==null?void 0:e.signals)!=null&&l.native_publish_enabled),r=!!((n=e==null?void 0:e.signals)!=null&&n.polling_worker_enabled);return[t?"模式配置就绪":"模式配置缺失，请检查发布配置",i?"原生发布启用，可直接进入 B 站发布链路":"原生发布停用，当前不会直接走 B 站发布",r?"轮询链路启用，可配合自动处理评论侧流程":"轮询链路停用，评论侧仅支持手动同步"].join("，")}const $t={ok:{label:"轮询成功",cls:"badge-success"},no_new:{label:"无新增评论",cls:"badge-muted"},error:{label:"轮询失败",cls:"badge-danger"}},he={no_aid:"缺少视频 aid，暂时无法轮询评论。",retry_exhausted:"评论抓取重试耗尽。"};function gi(e,t,i){const r=String(e??"").trim().toLowerCase();if(!r)return"-";const s=$t[r]||{label:"未识别轮询状态",cls:"badge-muted"},l=r==="error"&&t?he[String(t).trim().toLowerCase()]||String(t):"",n=l?` title="${o(l)}"`:"",u=typeof i=="number"&&Number.isFinite(i)?`评论游标: ${i}`:"",p=[r==="ok"?u?"轮询完成，评论游标已推进":"轮询完成":r==="no_new"?u?"本次未发现新评论，评论游标已保留":"本次未发现新评论":$t[r]?"":`原始状态值: ${r}`,l,u].filter(Boolean).map(c=>`<div class="form-hint" style="margin-top:4px;">${o(c)}</div>`).join("");return`<span class="status-badge ${s.cls}"${n}>${o(s.label)}</span>${p}`}function hi(e){if(String((e==null?void 0:e.last_poll_status)??"").trim().toLowerCase())return gi(e==null?void 0:e.last_poll_status,e==null?void 0:e.last_poll_error,e==null?void 0:e.last_rpid);if(!(e!=null&&e.last_polled_at))return`<span class="status-badge badge-muted">未轮询</span><div class="form-hint" style="margin-top:4px;">${o(ut(e))}</div>`;const i=typeof(e==null?void 0:e.last_rpid)=="number"&&Number.isFinite(e.last_rpid)?"已轮询但未记录结果，评论游标已保留":"已轮询但未记录结果";return`<span class="status-badge badge-muted">轮询完成</span><div class="form-hint" style="margin-top:4px;">${o(i)}</div>`}function $i(e){if(e==="true")return!0;if(e==="false")return!1}function _i(e){return e==="true"?"当前筛选暂无轮询中视频，可切换筛选查看停用项":e==="false"?"当前筛选暂无已停用视频，可切换筛选查看轮询中项":"暂无监控视频，请先添加 BVID 作为监控对象"}function H(e){return typeof(e==null?void 0:e.aid)=="number"&&Number.isFinite(e.aid)}function ut(e){return H(e)?e!=null&&e.poll_enabled?"等待首次自动轮询，可稍后刷新查看":"轮询未启用，可手动同步评论":he.no_aid}function xi(e){return e.filter(t=>!H(t)).length}function wi(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)).length}function Si(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)&&!H(t)).length}function Ci(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&H(t)).length}function Ei(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&!H(t)).length}function qi(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&!(t!=null&&t.last_polled_at)).length}function ki(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&(t==null?void 0:t.last_polled_at)).length}function Li(e){return e.filter(t=>(t==null?void 0:t.poll_enabled)&&!(t!=null&&t.last_polled_at)).length}function Ti(e){return e.filter(t=>(t==null?void 0:t.poll_enabled)&&(t==null?void 0:t.last_polled_at)).length}function Bi(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="error").length}function Mi(e){return e.filter(t=>{const i=String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase();return i==="ok"||i==="no_new"}).length}function Ai(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="ok").length}function Pi(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="no_new").length}function ji(e){return e.filter(t=>!(t!=null&&t.last_polled_at)).length}function Ii(e){return e.filter(t=>H(t)&&!(t!=null&&t.last_polled_at)).length}function Ni(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function Hi(e){return e.filter(t=>typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function Ri(e){return e.filter(t=>String((t==null?void 0:t.title)??"").trim().length>0).length}function Oi(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0).length}function Di(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&Number((t==null?void 0:t.comment_count)??0)<=0).length}function Vi(e){return e.filter(t=>typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function Ui(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function Wi(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)<=0&&typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function Ji(e){return e.filter(t=>H(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function Fi(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(H(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid))).length}function Ki(e){return e.reduce((t,i)=>{const r=Number((i==null?void 0:i.comment_count)??0);return t+(Number.isFinite(r)&&r>0?r:0)},0)}function zi(e){const t=H(e),i=String((e==null?void 0:e.bvid)??"").trim(),r=String((e==null?void 0:e.id)??(e==null?void 0:e.video_id)??"").trim(),s=[t?`aid: ${e.aid}`:he.no_aid];return i||s.push(r?`记录 ID: ${r}`:"未同步 BVID"),`${o(i||"未同步 BVID")}${s.filter(Boolean).map(l=>`<div class="form-hint" style="margin-top:4px;">${o(l)}</div>`).join("")}`}function Gi(e){const t=[];return H(e)||t.push("aid"),String((e==null?void 0:e.title)??"").trim()||t.push("标题"),typeof(e==null?void 0:e.owner_mid)=="number"&&Number.isFinite(e.owner_mid)||t.push("UP主 MID"),t}function Yi(e){const t=[],i=String((e==null?void 0:e.title)??"").trim(),r=Gi(e);return r.length>0&&t.push(`缺少 ${r.join(" / ")}`),typeof(e==null?void 0:e.owner_mid)=="number"&&Number.isFinite(e.owner_mid)&&t.push(`UP主 MID: ${e.owner_mid}`),e!=null&&e.updated_at&&t.push(ge("更新",e.updated_at)),e!=null&&e.created_at&&t.push(ge("创建",e.created_at)),`${o(i||"未同步标题")}${t.map(s=>`<div class="form-hint" style="margin-top:4px;">${o(s)}</div>`).join("")}`}function Qi(e){const t=H(e),i=t?"":" disabled",r=t?"":` title="${o(he.no_aid)}"`;return`<button class="btn btn-sm bili-sync" data-id="${o(e.id||e.video_id)}" data-has-aid="${t?"true":"false"}"${i}${r}>同步</button>`}function Zi(e){const t=H(e);let i=he.no_aid;return t&&(i=e!=null&&e.poll_enabled?"自动轮询中，等待计划任务执行":"轮询停用，可手动同步评论"),`${ct(e==null?void 0:e.poll_enabled)}<div class="form-hint" style="margin-top:4px;">${o(i)}</div>`}function Xi(e){const t=Number((e==null?void 0:e.comment_count)??0),i=Number.isFinite(t)&&t>0?t:0,r=typeof(e==null?void 0:e.last_rpid)=="number"&&Number.isFinite(e.last_rpid);let s=ut(e);return i>0?s=r?"已有评论，游标已记录":"已有评论，缺少游标":e!=null&&e.last_polled_at&&(s=r?"已轮询无评论，保留游标":"已轮询无评论，未记录游标"),`${o(i)}<div class="form-hint" style="margin-top:4px;">${o(s)}</div>`}function el(e){if(e!=null&&e.last_polled_at){const t=typeof(e==null?void 0:e.last_rpid)=="number"&&Number.isFinite(e.last_rpid)?`评论游标: ${e.last_rpid}`:"未记录评论游标，可在下次轮询后补齐";return`${Q(e.last_polled_at)}<div class="form-hint" style="margin-top:4px;">${o(t)}</div>`}return`从未轮询<div class="form-hint" style="margin-top:4px;">${o(ut(e))}</div>`}function tl(e,t,i,r=0,s=me,l=[]){const n=i==="true"?"轮询中":i==="false"?"已停用":"全部状态",u=Math.floor(r/s)+1,d=Math.max(1,Math.ceil(e/s)),p=wi(l),c=Math.max(0,l.length-p),f=Si(l),b=Ci(l),g=Ei(l),h=qi(l),m=ki(l),v=Li(l),_=Ti(l),B=xi(l),x=Math.max(0,l.length-B),q=Bi(l),E=Mi(l),L=Ai(l),M=Pi(l),k=ji(l),P=Ii(l),w=Math.max(0,l.length-k),I=Hi(l),re=Math.max(0,l.length-I),Z=Ri(l),se=Math.max(0,l.length-Z),R=Oi(l),V=Math.max(0,l.length-R),U=Di(l),X=Vi(l),ne=Ui(l),ae=Wi(l),ee=Math.max(0,l.length-X),oe=Ni(l),J=Ji(l),de=Math.max(0,l.length-J),te=Fi(l),F=Ki(l),$e=B>0?`，当前页缺少 aid ${B} 条`:"",ce=i===""&&p>0?`，当前页轮询开启 ${p} 条`:"",ue=i===""&&c>0?`，当前页轮询停用 ${c} 条`:"",pe=i===""&&f>0?`，轮询开启但缺少 aid ${f} 条`:"",be=i===""&&b>0?`，轮询停用但可手动同步 ${b} 条`:"",K=i===""&&g>0?`，轮询停用且缺少 aid ${g} 条`:"",Ee=i===""&&h>0?`，轮询停用且从未轮询 ${h} 条`:"",ie=i===""&&m>0?`，轮询停用且已有轮询记录 ${m} 条`:"",_e=i===""&&v>0?`，轮询开启但尚未轮询 ${v} 条`:"",z=i===""&&_>0?`，轮询开启且已有轮询记录 ${_} 条`:"",le=x>0?`，可手动同步 ${x} 条`:"",xe=E>0?`，正常轮询 ${E} 条`:"",we=L>0?`，成功轮询 ${L} 条`:"",fe=M>0?`，无新增评论 ${M} 条`:"",G=q>0?`，轮询失败 ${q} 条`:"",qe=w>0?`，已有轮询记录 ${w} 条`:"",Ie=k>0?`，尚未轮询 ${k} 条`:"",ke=P>0?`，可手动同步但尚未轮询 ${P} 条`:"",Ne=I>0?`，已识别 UP 主 ${I} 条`:"",Le=re>0?`，缺少 UP 主 ${re} 条`:"",He=Z>0?`，已抓取标题 ${Z} 条`:"",Re=se>0?`，缺少标题 ${se} 条`:"",Oe=J>0?`，信息完整 ${J} 条`:"",De=de>0?`，信息不完整 ${de} 条`:"",Ve=te>0?`，已轮询但信息不完整 ${te} 条`:"",Te=R>0?`，已有评论视频 ${R} 条`:"",Ue=V>0?`，无评论视频 ${V} 条`:"",Be=U>0?`，已轮询但无评论 ${U} 条`:"",We=X>0?`，已有评论游标 ${X} 条`:"",Me=ne>0?`，有评论但无游标 ${ne} 条`:"",Je=ae>0?`，无评论但有游标 ${ae} 条`:"",Fe=ee>0?`，无评论游标 ${ee} 条`:"",Ke=oe>0?`，已轮询但无游标 ${oe} 条`:"",ze=F>0?`，关联评论 ${F} 条`:"";return`筛选条件: ${n}，共 ${e} 条，当前展示 ${t} 条，第 ${u}/${d} 页${ce}${ue}${$e}${pe}${be}${K}${Ee}${ie}${_e}${z}${le}${xe}${we}${fe}${G}${qe}${Ie}${ke}${Ne}${Le}${He}${Re}${Oe}${De}${Ve}${Te}${Ue}${Be}${We}${Me}${Je}${Fe}${Ke}${ze}`}const il=7*24*60*60*1e3;function et(e,t=Date.now()){const i=new Date(e);if(Number.isNaN(i.getTime()))return"";const r=i.getTime()-t,s=Math.abs(r),l=60*1e3,n=60*l,u=24*n;let d,p;return s<n?(d=Math.max(1,Math.round(s/l)),p="分钟"):s<u?(d=Math.max(1,Math.round(s/n)),p="小时"):(d=Math.max(1,Math.round(s/u)),p="天"),r<=0?`${d}${p}前`:`${d}${p}后`}function S(e,t=Date.now()){if(!e)return{hasExpiry:!1,expired:!1,expiringSoon:!1,label:"未设置过期时间",cls:"badge-muted",detail:""};const i=new Date(e);if(Number.isNaN(i.getTime()))return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"过期时间异常",cls:"badge-danger",detail:String(e)};const r=i.getTime()-t;if(r<=0){const l=et(e,t);return{hasExpiry:!0,expired:!0,expiringSoon:!1,label:"已过期",cls:"badge-danger",detail:l?`${l}过期，${O(e)}`:O(e)}}if(r<=il){const l=et(e,t);return{hasExpiry:!0,expired:!1,expiringSoon:!0,label:"即将过期",cls:"badge-warning",detail:l?`${l}到期，${O(e)}`:O(e)}}const s=et(e,t);return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"有效期内",cls:"badge-success",detail:s?`${s}到期，${O(e)}`:O(e)}}function nt(e,t=!0){if(!t)return"当前无活跃凭证，无法评估过期状态";const i=e.hasExpiry?e.label==="过期时间异常"?"请检查过期时间格式后重试":e.expired?"建议尽快更新":e.expiringSoon?"建议提前轮换":"当前仍可使用":"需手动确认有效性并定期轮换";return[e.detail||(e.hasExpiry?"":"未设置过期时间"),i].filter(Boolean).join("，")}function ll(e){const t=S(e),i=nt(t),r=i?`<div class="form-hint" style="margin-top:4px;">${o(i)}</div>`:"";return`<span class="status-badge ${t.cls}">${o(t.label)}</span>${r}`}function at(e,t="未命名凭证"){const i=[],r=String((e==null?void 0:e.name)??"").trim();return!r&&e&&i.push("未填写凭证名称，当前展示默认标签"),e!=null&&e.updated_at&&i.push(ge("更新",e.updated_at)),e!=null&&e.created_at&&i.push(ge("创建",e.created_at)),`${o(r||t)}${i.map(s=>`<div class="form-hint" style="margin-top:4px;">${o(s)}</div>`).join("")}`}function _t(e){return(e==null?void 0:e.cls)==="badge-danger"?"var(--danger-color)":(e==null?void 0:e.cls)==="badge-warning"?"var(--warning-color)":(e==null?void 0:e.cls)==="badge-success"?"var(--success-color)":"var(--grey-2)"}function ot(e){if(!e)return{label:"未配置凭证",detail:"请先添加并激活凭证用于鉴权"};const t=!!(e!=null&&e.is_active||e!=null&&e.active),i=C(e),r=i?"":pt(e).join(" / "),s=i?"":`缺少 ${r}`;if(e!=null&&e.last_used_at)return{label:dt(e.last_used_at)||"已使用",detail:`${O(e.last_used_at)}，${t?"当前生效":"当前未激活，历史使用记录保留"}${i?"，字段完整":`，${s}`}`};const l=[];return t?l.push(i?"当前生效，等待首次使用":`当前生效，但${s}`):l.push(i?"待手动激活，激活后可用于鉴权":`待补齐 ${r} 后激活`),e!=null&&e.updated_at&&l.push(ge("更新",e.updated_at)),e!=null&&e.created_at&&l.push(ge("创建",e.created_at)),{label:"从未使用",detail:l.join("，")}}function rl(e){const t=ot(e),i=t.detail?`<div class="form-hint" style="margin-top:4px;">${o(t.detail)}</div>`:"";return`${o(t.label)}${i}`}function sl(e){const t=!!(e!=null&&e.is_active||e!=null&&e.active),i=C(e),r=i?"":pt(e).join(" / "),s=i?"":`缺少 ${r}`,l=t?i?"当前生效，字段完整，可用于鉴权":`当前生效，但${s}`:i?"待手动激活，字段完整，激活后即可切换使用":`待补齐 ${r} 后激活`;return`${ct(t)}<div class="form-hint" style="margin-top:4px;">${o(l)}</div>`}function C(e){return!!(e!=null&&e.has_sessdata&&(e!=null&&e.has_bili_jct)&&(e!=null&&e.buvid3))}function pt(e){const t=[];return e!=null&&e.has_sessdata||t.push("SESSDATA"),e!=null&&e.has_bili_jct||t.push("bili_jct"),e!=null&&e.buvid3||t.push("buvid3"),t}function nl(e,t=4){const i=String(e??"").trim();return i?i.endsWith("...")||i.length<=t?i:`...${i.slice(-t)}`:""}function al(e){const t=[e!=null&&e.has_sessdata?"SESSDATA":"",e!=null&&e.has_bili_jct?"bili_jct":"",e!=null&&e.buvid3?`buvid3:${nl(e.buvid3)}`:""].filter(Boolean).join(" / ")||"未配置指纹",i=[C(e)?"字段完整，可用于鉴权":`缺少 ${pt(e).join(" / ")}`,e!=null&&e.buvid3?"仅展示指纹摘要":"未记录 buvid3 指纹摘要"].filter(Boolean).join("，");return`${o(t)}${i?`<div class="form-hint" style="margin-top:4px;">${o(i)}</div>`:""}`}function Bt(e="",t=""){return`激活筛选: ${e==="active"?"仅激活":e==="inactive"?"仅未激活":"全部"}，过期筛选: ${t==="expired"?"已过期":t==="expiring"?"即将过期":t==="valid"?"有效期内":t==="unset"?"未设置过期时间":"全部"}`}function ol(e,t="",i="",r=e.length){const s=e.length,l=Mt(e,t,i),n=e.filter(a=>a.is_active||a.active),u=e.filter(a=>!(a.is_active||a.active)),d=n.length,p=u.length,c=e.filter(a=>C(a)).length,f=e.filter(a=>(a.is_active||a.active)&&C(a)).length,b=Math.max(0,c-f),g=Math.max(0,d-f),h=Math.max(0,p-b),m=n.filter(a=>a.last_used_at).length,v=Math.max(0,d-m),_=u.filter(a=>a.last_used_at).length,B=Math.max(0,p-_),x=e.filter(a=>C(a)&&a.last_used_at).length,q=Math.max(0,c-x),E=Math.max(0,s-c),L=e.filter(a=>!C(a)&&a.last_used_at).length,M=Math.max(0,E-L),k=e.filter(a=>!a.last_used_at).length,P=Math.max(0,s-k),w=Date.now(),I=e.filter(a=>C(a)&&S(a.expires_at,w).hasExpiry&&!S(a.expires_at,w).expired).length,re=e.filter(a=>C(a)&&S(a.expires_at,w).expired).length,Z=e.filter(a=>C(a)&&S(a.expires_at,w).expiringSoon).length,se=e.filter(a=>C(a)&&!S(a.expires_at,w).hasExpiry).length,R=e.map(a=>S(a.expires_at,w)),V=n.map(a=>S(a.expires_at,w)),U=u.map(a=>S(a.expires_at,w)),X=R.filter(a=>a.hasExpiry).length,ne=R.filter(a=>a.hasExpiry&&!a.expired).length,ae=R.filter(a=>a.expired).length,ee=R.filter(a=>a.expiringSoon).length,oe=V.filter(a=>a.hasExpiry&&!a.expired).length,J=V.filter(a=>a.expired).length,de=V.filter(a=>a.expiringSoon).length,te=V.filter(a=>!a.hasExpiry).length,F=U.filter(a=>a.hasExpiry&&!a.expired).length,$e=U.filter(a=>a.expired).length,ce=U.filter(a=>a.expiringSoon).length,ue=U.filter(a=>!a.hasExpiry).length,pe=e.filter(a=>!C(a)&&S(a.expires_at,w).hasExpiry&&!S(a.expires_at,w).expired).length,be=e.filter(a=>!C(a)&&S(a.expires_at,w).expired).length,K=e.filter(a=>!C(a)&&S(a.expires_at,w).expiringSoon).length,Ee=e.filter(a=>!C(a)&&!S(a.expires_at,w).hasExpiry).length,ie=R.filter(a=>!a.hasExpiry).length,_e=Bt(t,i),z=l.filter(a=>C(a)).length,le=Math.max(0,l.length-z),xe=l.filter(a=>{if(!C(a))return!1;const Y=S(a.expires_at,w);return Y.hasExpiry&&!Y.expired}).length,we=l.filter(a=>C(a)?S(a.expires_at,w).expired:!1).length,fe=l.filter(a=>C(a)?S(a.expires_at,w).expiringSoon:!1).length,G=l.filter(a=>C(a)?!S(a.expires_at,w).hasExpiry:!1).length,qe=l.filter(a=>C(a)&&(a.is_active||a.active)).length,Ie=Math.max(0,z-qe),ke=l.filter(a=>C(a)&&a.last_used_at).length,Ne=Math.max(0,z-ke),Le=l.filter(a=>!C(a)&&a.last_used_at).length,He=Math.max(0,le-Le),Re=l.filter(a=>{if(C(a))return!1;const Y=S(a.expires_at,w);return Y.hasExpiry&&!Y.expired}).length,Oe=l.filter(a=>C(a)?!1:S(a.expires_at,w).expired).length,De=l.filter(a=>C(a)?!1:S(a.expires_at,w).expiringSoon).length,Ve=l.filter(a=>C(a)?!1:!S(a.expires_at,w).hasExpiry).length,Te=l.filter(a=>!C(a)&&(a.is_active||a.active)).length,Ue=Math.max(0,le-Te),Be=l.filter(a=>a.is_active||a.active).length,We=Math.max(0,l.length-Be),Me=l.filter(a=>a.last_used_at).length,Je=Math.max(0,l.length-Me),Fe=l.filter(a=>{const Y=S(a.expires_at,w);return Y.hasExpiry&&!Y.expired}).length,Ke=l.filter(a=>S(a.expires_at,w).expired).length,ze=l.filter(a=>S(a.expires_at,w).expiringSoon).length,Nt=l.filter(a=>!S(a.expires_at,w).hasExpiry).length,Ht=t?"":`，激活 ${Be} 个，未激活 ${We} 个`,Rt=t?"":`，完整且激活 ${qe} 个，完整但未激活 ${Ie} 个`,Ot=t?"":`，缺字段且激活 ${Te} 个，缺字段且未激活 ${Ue} 个`,Dt=t||i?`，筛选结果完整 ${z} 个${Rt}，完整且有效 ${xe} 个，完整且已过期 ${we} 个，完整且即将过期 ${fe} 个，完整且未设置过期 ${G} 个，完整且已使用 ${ke} 个，完整但未使用 ${Ne} 个，缺字段 ${le} 个${Ot}，缺字段但已使用 ${Le} 个，缺字段且从未使用 ${He} 个，缺字段但有效 ${Re} 个，缺字段且已过期 ${Oe} 个，缺字段且即将过期 ${De} 个，缺字段且未设置过期 ${Ve} 个${Ht}，已使用 ${Me} 个，从未使用 ${Je} 个，有效 ${Fe} 个，已过期 ${Ke} 个，即将过期 ${ze} 个，未设置过期 ${Nt} 个`:"";return`共 ${s} 个凭证，激活中 ${d} 个，未激活 ${p} 个，激活且完整 ${f} 个，未激活但完整 ${b} 个，激活但缺字段 ${g} 个，未激活且缺字段 ${h} 个，激活且已使用 ${m} 个，激活但从未使用 ${v} 个，未激活且已使用 ${_} 个，未激活但从未使用 ${B} 个，激活且有效 ${oe} 个，未激活且有效 ${F} 个，激活已过期 ${J} 个，未激活已过期 ${$e} 个，激活即将过期 ${de} 个，未激活即将过期 ${ce} 个，激活未设置过期 ${te} 个，未激活未设置过期 ${ue} 个，字段完整 ${c} 个，完整且有效 ${I} 个，完整且已过期 ${re} 个，完整即将过期 ${Z} 个，完整未设置过期 ${se} 个，完整且已使用 ${x} 个，完整但未使用 ${q} 个，字段缺失 ${E} 个，缺字段但已使用 ${L} 个，缺字段且未使用 ${M} 个，缺字段但有效 ${pe} 个，缺字段且已过期 ${be} 个，缺字段即将过期 ${K} 个，缺字段未设置过期 ${Ee} 个，已使用 ${P} 个，从未使用 ${k} 个，设置过期时间 ${X} 个，有效 ${ne} 个，已过期 ${ae} 个，即将过期 ${ee} 个，未设置 ${ie} 个；筛选条件: ${_e}，当前展示 ${r} 个${Dt}`}function Mt(e,t="",i=""){const r=Date.now();return e.filter(s=>{const l=s.is_active||s.active;if(t==="active"&&!l||t==="inactive"&&l)return!1;const n=S(s.expires_at,r);return!(i==="expired"&&!n.expired||i==="expiring"&&!n.expiringSoon||i==="valid"&&(!n.hasExpiry||n.expired)||i==="unset"&&n.hasExpiry)})}function dl(e="",t=""){return e||t?`当前筛选暂无匹配凭证（${Bt(e,t)}），可调整筛选条件后重试`:"暂无凭证，请先添加并激活可用凭证用于鉴权"}const N=D(),cl={llm_generation:"LLM 生成",search_enrichment:"搜索增强",webhook_publish:"Webhook 发布",native_bilibili_publish:"原生 B 站发布"},ul={configured:"已就绪",inactive:"未启用",fallback_only:"仅回退",missing_inputs:"缺少配置",runtime_credentials_required:"凭证缺失",unsupported:"不支持"};function xt(e,t,i){const r=e.querySelector(i);t.forEach(s=>{const l=e.querySelector(s);l==null||l.addEventListener("keydown",n=>{n.key==="Enter"&&(n.preventDefault(),r.disabled||r.click())})})}function Pe(e){return Array.isArray(e)?e.map(t=>String(t??"").trim()).filter(Boolean):[]}function wt(e){return e===!0?{label:"就绪",color:"var(--success-color)"}:e===!1?{label:"阻塞",color:"var(--danger-color)"}:{label:"未知",color:"var(--warning-color)"}}function pl(e){if(!e||typeof e!="object"||Array.isArray(e))return[];const t=e.delivery_capabilities;return!t||typeof t!="object"||Array.isArray(t)?[]:(Array.isArray(t.summary)?t.summary:Array.isArray(t.capabilities)?t.capabilities:[]).filter(r=>r&&typeof r=="object"&&!Array.isArray(r)).map(r=>{const s=r;return{capability:String(s.capability??"").trim(),status:String(s.status??"").trim(),mode:String(s.mode??"").trim(),missing_inputs:Pe(s.missing_inputs)}}).filter(r=>r.capability)}function bl(e){const t=cl[e.capability]??e.capability,i=ul[e.status]??(e.status||"未知"),r=e.mode?`mode=${e.mode}`:"mode=unknown",s=e.missing_inputs.length>0?e.missing_inputs.join(", "):"未提供缺失项";return`${t} [${e.capability}] (${i}, ${r}): ${s}`}function fl(e){if(!e||typeof e!="object"||Array.isArray(e))return"";const t=e.release_gates,i=e.signals;if(!!(t&&typeof t=="object"&&t.real_auth_ready)||!!(i&&typeof i=="object"&&i.real_auth_ready))return"";const s=typeof i=="object"&&i&&!Array.isArray(i)&&typeof i.auth_probe_reason=="string"?i.auth_probe_reason.trim():"";return!s||s==="not_required"||s==="verified"?"":s}function vl(e){if(!e||typeof e!="object"||Array.isArray(e))return{credentialPresent:!1,credentialComplete:!1,realAuthReady:!1};const t=e.release_gates,i=e.signals;return{credentialPresent:!!((i==null?void 0:i.credential_present)??(t==null?void 0:t.credential_present)),credentialComplete:!!((i==null?void 0:i.credential_complete)??(t==null?void 0:t.credential_complete)),realAuthReady:!!((i==null?void 0:i.real_auth_ready)??(t==null?void 0:t.real_auth_ready))}}function yl(e){const t=e==null?void 0:e.credential,i=vl(e==null?void 0:e.diagnostics);if(t){const s=S(t==null?void 0:t.expires_at);return{activeCredentialName:at(t,"未配置活跃凭证"),credentialHealth:ht(i.credentialPresent,i.credentialComplete),credentialExpiry:s,credentialExpiryColor:_t(s),credentialExpiryDetail:nt(s,!0),credentialUsage:ot(t)}}if(i.credentialPresent){const s=i.realAuthReady?"运行时外部凭证":"运行时外部凭证（待验证）",l=i.realAuthReady?"后台未托管该凭证，当前运行时鉴权已通过":"后台未托管该凭证，当前仍需检查运行时鉴权状态",n={label:i.realAuthReady?"外部管理":"待确认",cls:i.realAuthReady?"badge-success":"badge-warning"};return{activeCredentialName:`${o(s)}<div class="form-hint" style="margin-top:4px;">${o(l)}</div>`,credentialHealth:i.credentialComplete?i.realAuthReady?"运行时外部凭证字段完整，鉴权探针已通过":"运行时外部凭证字段完整，但鉴权探针尚未通过":"运行时外部凭证已注入，但缺少关键字段，请检查运行时配置",credentialExpiry:n,credentialExpiryColor:i.realAuthReady?"var(--success-color)":"var(--warning-color)",credentialExpiryDetail:i.realAuthReady?"后台未托管该凭证，过期时间需在运行时环境中确认":"后台未托管该凭证，过期时间与有效性需在运行时环境中确认",credentialUsage:{label:i.realAuthReady?"运行时已验证":"运行时待验证",detail:i.realAuthReady?"认证探针已通过，但后台列表未托管该凭证":"后台列表未托管该凭证，请结合运行时诊断继续确认"}}}const r=S(void 0);return{activeCredentialName:at(null,"未配置活跃凭证"),credentialHealth:ht(!1,!1),credentialExpiry:r,credentialExpiryColor:_t(r),credentialExpiryDetail:nt(r,!1),credentialUsage:ot(null)}}async function ml(e){let t=0;e.innerHTML=`
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
  `;async function i(){var n,u,d,p,c,f,b,g;const l=e.querySelector("#bili-status-cards");l.innerHTML='<div class="page-loading">加载中...</div>';try{const[h,m]=await Promise.allSettled([N.getBilibiliStatus(),N.getReadinessStatus()]);if(h.status!=="fulfilled")throw h.reason;const v=h.value,_=m.status==="fulfilled"&&m.value&&typeof m.value=="object"&&!Array.isArray(m.value)?m.value:null,B=m.status==="rejected"?A(m.reason):"",x=Number((v==null?void 0:v.video_count)??0),q=Number(((n=v==null?void 0:v.videos)==null?void 0:n.poll_enabled_count)??0),E=Math.max(0,x-q),L=vi(x,q),M=mt(q,x),k=mt(E,x,"停用占比"),P=!!((u=v==null?void 0:v.diagnostics)!=null&&u.ready),w=di((d=v==null?void 0:v.diagnostics)==null?void 0:d.blocking_reasons),I=yl(v),re=I.activeCredentialName,Z=I.credentialHealth,se=yi(v==null?void 0:v.diagnostics),R=ci((p=v==null?void 0:v.diagnostics)==null?void 0:p.effective_publish_mode),V=mi(v==null?void 0:v.diagnostics),U=Xe(v==null?void 0:v.enabled,"B 站集成已启用，可管理凭证与视频","B 站集成已停用，当前不会触发轮询或发布"),X=Xe(v==null?void 0:v.polling_enabled,"评论轮询已启用，会按配置自动抓取评论","评论轮询已停用，仅支持手动同步"),ne=Xe(v==null?void 0:v.publish_enabled,"发布链路已启用，满足条件后可进入发布流程","发布链路已停用，不会进入自动发布流程"),ae=ui((c=v==null?void 0:v.config)==null?void 0:c.poll_interval_seconds),ee=pi((f=v==null?void 0:v.config)==null?void 0:f.poll_interval_seconds),oe=bi((b=v==null?void 0:v.config)==null?void 0:b.rate_limit_per_minute),J=fi((g=v==null?void 0:v.config)==null?void 0:g.rate_limit_per_minute),de=I.credentialExpiry,te=I.credentialExpiryDetail,F=I.credentialUsage,$e=I.credentialExpiryColor,ce=wt(_==null?void 0:_.foundation_ready),ue=wt(_==null?void 0:_.delivery_ready),pe=Pe(_==null?void 0:_.foundation_blockers),be=Pe(_==null?void 0:_.delivery_blockers),K=Pe(_==null?void 0:_.delivery_capability_blockers),ie=pl(_).filter(G=>G.status!=="configured"&&G.status!=="inactive"),_e=pe.length>0?pe.join(", "):"无",z=be.length>0?be.join(", "):"无",le=K.length>0?K.join(", "):"无",xe=_?ie.length>0?ie.map(G=>bl(G)).join("； "):"无":"readiness_unavailable",we=B||ie.length>0?"page-error":"form-hint",fe=fl(v==null?void 0:v.diagnostics);l.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${v!=null&&v.enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${o(U)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询</div>
          <div class="stat-value">${v!=null&&v.polling_enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${o(X)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布</div>
          <div class="stat-value">${v!=null&&v.publish_enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${o(ne)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">视频数</div>
          <div class="stat-value">${x}</div>
          <div class="form-hint" style="margin-top:6px;">${o(L)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${q}</div>
          <div class="form-hint" style="margin-top:6px;">${o(M)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">停用视频</div>
          <div class="stat-value">${E}</div>
          <div class="form-hint" style="margin-top:6px;">${o(k)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${re}</div>
          <div class="form-hint" style="margin-top:6px;">${o(Z)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${P?"var(--success-color)":"var(--danger-color)"}">${P?"就绪":"阻塞"}</div>
          <div class="form-hint" style="margin-top:6px;">${o(se)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">基础就绪</div>
          <div class="stat-value" style="color:${ce.color}">${ce.label}</div>
          <div class="form-hint" style="margin-top:6px;">${o(`blockers: ${_e}`)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">交付就绪</div>
          <div class="stat-value" style="color:${ue.color}">${ue.label}</div>
          <div class="form-hint" style="margin-top:6px;">${o(`blockers: ${z}`)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">能力阻塞</div>
          <div class="stat-value" style="color:${K.length>0?"var(--danger-color)":"var(--success-color)"}">${_?K.length:"N/A"}</div>
          <div class="form-hint" style="margin-top:6px;">${o(`canonical: ${_?le:"readiness_unavailable"}`)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布模式</div>
          <div class="stat-value">${o(R)}</div>
          <div class="form-hint" style="margin-top:6px;">${o(V)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询间隔</div>
          <div class="stat-value">${o(ae)}</div>
          ${ee?`<div class="form-hint" style="margin-top:6px;">${o(ee)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">速率限制</div>
          <div class="stat-value">${o(oe)}</div>
          ${J?`<div class="form-hint" style="margin-top:6px;">${o(J)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">凭证过期</div>
          <div class="stat-value" style="font-size:14px; color:${$e}">${o(de.label)}</div>
          ${te?`<div class="form-hint" style="margin-top:6px;">${o(te)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">最近使用</div>
          <div class="stat-value" style="font-size:14px;">${o(F.label)}</div>
          ${F.detail?`<div class="form-hint" style="margin-top:6px;">${o(F.detail)}</div>`:""}
        </div>
        ${w?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">当前阻塞原因: ${o(w)}</div>`:""}
        ${fe?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">原生认证探针: ${o(fe)}</div>`:""}
        ${B?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">Readiness 状态加载失败: ${o(B)}</div>`:""}
        <div class="${we}" style="grid-column: 1 / -1; margin: 0;">
          关键缺失项: ${o(xe)}
        </div>
      `}catch(h){l.innerHTML=`<div class="page-error">状态加载失败: ${o(A(h))}</div>`}}async function r(){const l=e.querySelector("#bili-videos-wrapper"),n=e.querySelector("#bili-video-summary"),u=e.querySelector("#bili-video-filter-btn"),d=e.querySelector("#bili-video-poll-filter"),p=e.querySelector("#bili-video-prev"),c=e.querySelector("#bili-video-next"),f=d.value;n.textContent="加载中...",l.innerHTML='<div class="page-loading">加载中...</div>',d.disabled=!0,u.disabled=!0,p.disabled=!0,c.disabled=!0;try{const b=await N.getBilibiliVideos({limit:me,offset:t,poll_enabled:$i(f)}),g=Array.isArray(b==null?void 0:b.items)?b.items:Array.isArray(b)?b:[],h=Number((b==null?void 0:b.total)??g.length);if(g.length===0&&h>0&&t>0){t=Math.max(0,t-me),await r();return}if(n.textContent=tl(h,g.length,f,t,me,g),p.disabled=t<=0,c.disabled=t+g.length>=h,g.length===0){l.innerHTML=`<div class="table-empty">${o(_i(f))}</div>`;return}l.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${g.map(m=>`<tr data-id="${o(m.id||m.video_id)}">
              <td class="cell-id">${zi(m)}</td>
              <td class="cell-truncate">${Yi(m)}</td>
              <td>${Zi(m)}</td>
              <td>${Xi(m)}</td>
              <td class="cell-time">${el(m)}</td>
              <td>${hi(m)}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${o(m.id||m.video_id)}">${m.poll_enabled?"禁用轮询":"启用轮询"}</button>
                ${Qi(m)}
                <button class="btn btn-sm btn-danger bili-delete" data-id="${o(m.id||m.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,l.querySelectorAll(".bili-toggle-poll").forEach(m=>{m.addEventListener("click",async()=>{m.disabled=!0;try{await N.toggleBilibiliVideoPoll(m.dataset.id),y("操作成功","success"),await Promise.all([i(),r()])}catch(v){y(`失败: ${A(v)}`,"error")}finally{m.disabled=!1}})}),l.querySelectorAll(".bili-sync").forEach(m=>{m.addEventListener("click",async()=>{if(m.dataset.hasAid==="false"){y(he.no_aid,"warning");return}const v=m.textContent;m.disabled=!0,m.textContent="同步中...";try{const _=await N.syncBilibiliVideo(m.dataset.id);y(gt(_==null?void 0:_.result,{subject:"同步"}),"success"),await Promise.all([i(),r()])}catch(_){y(`同步失败: ${A(_)}`,"error")}finally{m.disabled=!1,m.textContent=v}})}),l.querySelectorAll(".bili-delete").forEach(m=>{m.addEventListener("click",async()=>{if(confirm("确定删除此视频？")){m.disabled=!0;try{await N.deleteBilibiliVideo(m.dataset.id),y("已删除","success"),await Promise.all([i(),r()])}catch(v){y(`删除失败: ${A(v)}`,"error")}finally{m.disabled=!1}}})})}catch(b){n.textContent="视频加载失败",l.innerHTML=`<div class="page-error">加载失败: ${o(A(b))}</div>`}finally{d.disabled=!1,u.disabled=!1}}async function s(){const l=e.querySelector("#bili-creds-wrapper"),n=e.querySelector("#bili-cred-summary"),u=e.querySelector("#bili-cred-active-filter"),d=e.querySelector("#bili-cred-expiry-filter"),p=u.value,c=d.value;n.textContent="加载中...",l.innerHTML='<div class="page-loading">加载中...</div>',u.disabled=!0,d.disabled=!0;try{const f=await N.getBilibiliCredentials(),b=Array.isArray(f==null?void 0:f.items)?f.items:Array.isArray(f)?f:[],g=Mt(b,p,c);if(n.textContent=ol(b,p,c,g.length),g.length===0){l.innerHTML=`<div class="table-empty">${o(dl(p,c))}</div>`;return}l.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期状态</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${g.map(h=>`<tr data-id="${o(h.id||h.credential_id)}">
              <td>${at(h)}</td>
              <td class="cell-id">${al(h)}</td>
              <td>${sl(h)}</td>
              <td>${ll(h.expires_at)}</td>
              <td class="cell-time">${rl(h)}</td>
              <td class="cell-actions">
                ${h.is_active||h.active?"":`<button class="btn btn-sm cred-activate" data-id="${o(h.id||h.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${o(h.id||h.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,l.querySelectorAll(".cred-activate").forEach(h=>{h.addEventListener("click",async()=>{h.disabled=!0;try{await N.activateBilibiliCredential(h.dataset.id),y("已激活","success"),await Promise.all([i(),s()])}catch(m){y(`激活失败: ${A(m)}`,"error")}finally{h.disabled=!1}})}),l.querySelectorAll(".cred-delete").forEach(h=>{h.addEventListener("click",async()=>{if(confirm("确定删除此凭证？")){h.disabled=!0;try{await N.deleteBilibiliCredential(h.dataset.id),y("已删除","success"),await Promise.all([i(),s()])}catch(m){y(`删除失败: ${A(m)}`,"error")}finally{h.disabled=!1}}})})}catch(f){n.textContent="凭证加载失败",l.innerHTML=`<div class="page-error">加载失败: ${o(A(f))}</div>`}finally{u.disabled=!1,d.disabled=!1}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const l=e.querySelector("#bili-video-add"),n=e.querySelector("#bili-video-bvid").value.trim(),u=ni(n);if(u){y(A(u),"warning");return}l.disabled=!0,l.textContent="添加中...";try{await N.addBilibiliVideo(n),y("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([i(),r()])}catch(d){y(`添加失败: ${A(d)}`,"error")}finally{l.disabled=!1,l.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{var p;const l=e.querySelector("#cred-add"),n=oi(e.querySelector("#cred-expires").value),u={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:n},d=ai(u);if(d){y(A(d),"warning");return}l.disabled=!0,l.textContent="添加中...";try{const c=await N.addBilibiliCredential(u);y((p=c==null?void 0:c.item)!=null&&p.is_active?"凭证添加成功，已自动激活":"凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([i(),s()])}catch(c){y(`添加失败: ${A(c)}`,"error")}finally{l.disabled=!1,l.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const l=e.querySelector("#bili-poll-btn");l.disabled=!0,l.textContent="轮询中...";try{const n=await N.triggerBilibiliPoll();y(gt(n==null?void 0:n.result),"success"),await Promise.all([i(),r()])}catch(n){y(`轮询失败: ${A(n)}`,"error")}finally{l.disabled=!1,l.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",async()=>{const l=e.querySelector("#bili-refresh");l.disabled=!0,l.textContent="刷新中...";try{await Promise.all([i(),r(),s()])}finally{l.disabled=!1,l.innerHTML='<svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新'}}),e.querySelector("#bili-video-filter-btn").addEventListener("click",()=>{t=0,r()}),e.querySelector("#bili-video-poll-filter").addEventListener("change",()=>{t=0,r()}),e.querySelector("#bili-video-prev").addEventListener("click",()=>{t<=0||(t=Math.max(0,t-me),r())}),e.querySelector("#bili-video-next").addEventListener("click",()=>{t+=me,r()}),e.querySelector("#bili-cred-active-filter").addEventListener("change",s),e.querySelector("#bili-cred-expiry-filter").addEventListener("change",s),xt(e,["#bili-video-bvid"],"#bili-video-add"),xt(e,["#cred-name","#cred-sessdata","#cred-bili-jct","#cred-buvid3","#cred-buvid4","#cred-expires"],"#cred-add"),await Promise.all([i(),r(),s()])}const tt=D(),it="query_recent_comment_ids",lt="query_recent_job_ids",gl=5;function At(e){try{const t=JSON.parse(sessionStorage.getItem(e)||"[]");return Array.isArray(t)?t.filter(i=>typeof i=="string"&&i.trim()!==""):[]}catch{return[]}}function St(e,t){const i=String(t||"").trim();if(!i)return;const r=At(e).filter(s=>s!==i);r.unshift(i),sessionStorage.setItem(e,JSON.stringify(r.slice(0,gl)))}async function Ct(e){var r;const t=JSON.stringify(e,null,2),i=(r=globalThis.navigator)==null?void 0:r.clipboard;return i&&typeof i.writeText=="function"?(await i.writeText(t),!0):!1}function Et(e){const t=Object.entries(e||{});return t.length===0?'<div class="table-empty">未返回可展示字段</div>':`
    <div class="detail-card">
      ${t.map(([i,r])=>`
        <div class="detail-row">
          <span class="detail-key">${o(i)}</span>
          <span class="detail-value">${o(typeof r=="object"?JSON.stringify(r,null,2):String(r??"-"))}</span>
        </div>
      `).join("")}
    </div>
  `}function qt(e){return String((e==null?void 0:e.canonical_comment_id)||(e==null?void 0:e.comment_id)||(e==null?void 0:e.id)||"").trim()}async function hl(e){e.innerHTML=`
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
  `;const t=e.querySelector("#query-comment-id"),i=e.querySelector("#query-comment-result"),r=e.querySelector("#query-comment-meta"),s=e.querySelector("#query-comment-recent"),l=e.querySelector("#query-comment-copy");let n=null;const u=e.querySelector("#query-job-id"),d=e.querySelector("#query-job-result"),p=e.querySelector("#query-job-meta"),c=e.querySelector("#query-job-recent"),f=e.querySelector("#query-job-copy");let b=null;const g=e.querySelector("#query-comments-meta"),h=e.querySelector("#query-comments-wrapper");function m(x,q,E){const L=At(q);if(L.length===0){x.textContent="";return}x.innerHTML=`
      最近查询：
      ${L.map(M=>`<button class="btn btn-link" data-query-id="${o(M)}" type="button">${o(M)}</button>`).join("")}
    `,x.querySelectorAll("[data-query-id]").forEach(M=>{M.addEventListener("click",()=>E(M.dataset.queryId||""))})}async function v(x=""){const q=(x||t.value).trim();if(t.value=q,!q){y("请输入 Comment ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>',l.disabled=!0;try{n=await tt.getComment(q)||{},l.disabled=!1,i.innerHTML=Et(n),r.textContent=`查询成功，共 ${Object.keys(n).length} 个字段`,St(it,q),m(s,it,v)}catch(E){n=null,i.innerHTML=`<div class="page-error">查询失败: ${o(E.message)}</div>`,r.textContent=""}}async function _(x=""){const q=(x||u.value).trim();if(u.value=q,!q){y("请输入 Job ID","warning");return}d.innerHTML='<div class="page-loading">查询中...</div>',f.disabled=!0;try{b=await tt.getJob(q)||{},f.disabled=!1,d.innerHTML=`
        ${Et(b)}
        ${b!=null&&b.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${o(b.comment_id)}">查看关联评论 →</a></div>`:""}
      `,p.textContent=`查询成功，共 ${Object.keys(b).length} 个字段`,St(lt,q),m(c,lt,_);const L=d.querySelector("#query-goto-comment");L&&L.addEventListener("click",()=>{v(L.dataset.id)})}catch(E){b=null,d.innerHTML=`<div class="page-error">查询失败: ${o(E.message)}</div>`,p.textContent=""}}async function B(){const x=e.querySelector("#query-comments-limit").value,q=e.querySelector("#query-comments-offset").value;h.innerHTML='<div class="page-loading">加载中...</div>',g.textContent="";try{const E=await tt.getComments({limit:x,offset:q}),L=Array.isArray(E==null?void 0:E.items)?E.items:[],M=Number((E==null?void 0:E.total)??L.length)||L.length;if(g.textContent=`返回 ${L.length} / ${M} 条评论`,L.length===0){h.innerHTML='<div class="table-empty">暂无评论</div>';return}h.innerHTML=st({columns:[{key:"comment_id",label:"Comment ID",class:"cell-id",render:k=>o(qt(k).substring(0,18)||"-")},{key:"platform",label:"平台",render:k=>o(k.platform||"-")},{key:"source",label:"来源",render:k=>o(k.source||"-")},{key:"content",label:"评论内容",class:"cell-truncate",render:k=>o((k.content||"-").toString().substring(0,80))},{key:"created_at",label:"时间",class:"cell-time",render:k=>Q(k.created_at)},{key:"actions",label:"操作",class:"cell-actions",render:k=>{const P=qt(k);return P?`<button class="btn btn-sm query-comment-open" data-comment-id="${o(P)}" type="button">查看详情</button>`:'<span class="form-hint">缺少 ID</span>'}}],rows:L}),h.querySelectorAll(".query-comment-open").forEach(k=>{k.addEventListener("click",()=>{const P=k.dataset.commentId||"";t.value=P,v(P)})})}catch(E){h.innerHTML=`<div class="page-error">加载失败: ${o(E.message)}</div>`}}e.querySelector("#query-comment-btn").addEventListener("click",()=>{v()}),e.querySelector("#query-job-btn").addEventListener("click",()=>{_()}),e.querySelector("#query-comments-load").addEventListener("click",B),t.addEventListener("keydown",x=>{x.key==="Enter"&&v()}),u.addEventListener("keydown",x=>{x.key==="Enter"&&_()}),e.querySelector("#query-comment-clear").addEventListener("click",()=>{t.value="",n=null,l.disabled=!0,r.textContent="",i.innerHTML=""}),e.querySelector("#query-job-clear").addEventListener("click",()=>{u.value="",b=null,f.disabled=!0,p.textContent="",d.innerHTML=""}),l.addEventListener("click",async()=>{if(!n){y("暂无可复制的评论查询结果","warning");return}const x=await Ct(n);y(x?"评论查询结果已复制":"当前环境不支持复制，请手动复制",x?"success":"warning")}),f.addEventListener("click",async()=>{if(!b){y("暂无可复制的任务查询结果","warning");return}const x=await Ct(b);y(x?"任务查询结果已复制":"当前环境不支持复制，请手动复制",x?"success":"warning")}),m(s,it,v),m(c,lt,_),await B()}const rt={dashboard:{render:Tt,title:"仪表盘"},jobs:{render:zt,title:"任务管理"},"daily-metrics":{render:Yt,title:"每日指标"},knowledge:{render:Qt,title:"知识库"},"role-cards":{render:Zt,title:"角色卡"},profiles:{render:Xt,title:"风格配置"},gateway:{render:ei,title:"网关"},audit:{render:ti,title:"审计日志"},bilibili:{render:ml,title:"B站集成"},query:{render:hl,title:"查询"}};let Pt=null;function $l(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function jt(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function It(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function _l(e){e.preventDefault();const t=document.getElementById("login-api-key"),i=document.getElementById("login-error"),r=t.value.trim();if(r){window.__ADMIN_API_KEY__=r;try{await $("/api/admin/overview"),sessionStorage.setItem("admin_api_key",r),It(),bt("dashboard")}catch{i.textContent="API Key 无效或服务不可用",i.style.display="block",window.__ADMIN_API_KEY__=""}}}function xl(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",jt()}function bt(e){if(!rt[e])return;Pt=e,document.querySelectorAll("#nav-list .nav-item").forEach(i=>{i.classList.toggle("active",i.dataset.page===e)}),document.getElementById("page-title").textContent=rt[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',rt[e].render(t).catch(i=>{t.innerHTML=`<div class="page-error">加载失败: ${i.message}</div>`})}function wl(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==Pt&&bt(t)})})}function Sl(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),i=document.getElementById("expand-left-btn");t&&i&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),i.style.display="block"}),i.addEventListener("click",()=>{e.classList.remove("collapsed"),i.style.display="none"}))}function Cl(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let i=0;e.addEventListener("click",()=>{i=(i+1)%t.length,t[i]?document.body.setAttribute("data-theme",t[i]):document.body.removeAttribute("data-theme")})}function El(){Sl(),Cl(),wl(),document.getElementById("login-form").addEventListener("submit",_l),document.getElementById("logout-btn").addEventListener("click",xl),$l()?(It(),bt("dashboard")):jt()}El();
