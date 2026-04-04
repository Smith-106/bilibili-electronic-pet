(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))r(i);new MutationObserver(i=>{for(const l of i)if(l.type==="childList")for(const d of l.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&r(d)}).observe(document,{childList:!0,subtree:!0});function s(i){const l={};return i.integrity&&(l.integrity=i.integrity),i.referrerPolicy&&(l.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?l.credentials="include":i.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(i){if(i.ep)return;i.ep=!0;const l=s(i);fetch(i.href,l)}})();function ie(e,t,s){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof s=="string"&&s.trim()?s.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function z(){return(window.__ADMIN_API_KEY__||"").trim()}async function m(e,t={}){const s=z(),r=new Headers(t.headers||{});s&&r.set("x-api-key",s);const i=await fetch(e,{...t,headers:r}),l=await i.json().catch(()=>({}));if(!i.ok){const d=(l==null?void 0:l.detail)||(l==null?void 0:l.error);throw new Error(ie(d,i.status,i.statusText))}return l}async function R(e,t){const s=z(),r=new Headers;s&&r.set("x-api-key",s);const i=await fetch(e,{headers:r});if(!i.ok)throw new Error("download_failed");const l=await i.blob(),d=URL.createObjectURL(l),n=document.createElement("a");n.href=d,n.download=t,document.body.appendChild(n),n.click(),document.body.removeChild(n),URL.revokeObjectURL(d)}function w(e){const t=new URLSearchParams;for(const[r,i]of Object.entries(e))i!=null&&i!==""&&t.set(r,String(i));const s=t.toString();return s?`?${s}`:""}function $(){return{getOverview(){return m("/api/admin/overview")},getJobs({status:e,limit:t}={}){return m(`/api/admin/jobs${w({status:e,limit:t})}`)},getJob(e){return m(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return m(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return m(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return m("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return m("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return R(`/export/jobs.csv${w({status:e,limit:t})}`,"jobs.csv")},getComment(e){return m(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,comment_id:t}={}){return m(`/api/admin/gateway/logs${w({limit:e,comment_id:t})}`)},publishGatewayReply(e){return m("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:s}={}){return m(`/api/admin/audit/summary${w({days:e,action:t,ok:s})}`)},getAuditLogs({limit:e,action:t,ok:s}={}){return m(`/api/audit-log${w({limit:e,action:t,ok:s})}`)},exportAuditCsv({limit:e,action:t,ok:s}={}){return R(`/export/audit-logs.csv${w({limit:e,action:t,ok:s})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return m(`/api/metrics/daily${w({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return m(`/api/admin/knowledge${w({limit:e,offset:t})}`)},createKnowledgeEntry(e){return m("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return m(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getRoleCards({limit:e,offset:t}={}){return m(`/api/admin/role-cards${w({limit:e,offset:t})}`)},createRoleCard(e){return m("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return m(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return m(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return m(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return m("/api/admin/style-profile")},setStyleProfile(e){return m("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return m("/api/admin/role-profile")},setRoleProfile(e){return m("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return m("/api/admin/bilibili/status")},getBilibiliVideos({poll_enabled:e,limit:t,offset:s}={}){return m(`/api/admin/bilibili/videos${w({poll_enabled:e,limit:t,offset:s})}`)},addBilibiliVideo(e){return m("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return m(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return m(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return m(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return m("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return m("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return m("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return m(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return m(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function o(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function A(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function se(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const s=Date.now()-t.getTime(),r=Math.floor(s/1e3);if(r<60)return"刚刚";const i=Math.floor(r/60);if(i<60)return`${i}分钟前`;const l=Math.floor(i/60);if(l<24)return`${l}小时前`;const d=Math.floor(l/24);if(d<30)return`${d}天前`;const n=Math.floor(d/30);return n<12?`${n}个月前`:`${Math.floor(n/12)}年前`}catch{return""}}function q(e){const t=se(e),s=A(e);return t?`<span title="${o(s)}">${o(t)}</span>`:`<span title="${o(s)}">${o(s)}</span>`}function S(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const le={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function H(e){if(!e)return"";const t=le[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${o(t.label)}</span>`}function P(e,t="是",s="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${o(e?t:s)}</span>`}let j=null;function c(e,t="info"){const s=document.getElementById("app-toast");s&&s.remove(),j&&clearTimeout(j);const r={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},i=document.createElement("div");i.id="app-toast",i.className="toast-notification",i.style.setProperty("--toast-color",r[t]||r.info),i.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(i),requestAnimationFrame(()=>i.classList.add("show"));const l=()=>{i.classList.remove("show"),setTimeout(()=>i.remove(),300)};i.querySelector(".toast-close").onclick=l,j=setTimeout(l,4e3)}const T=$();async function G(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,s,r,i]=await Promise.all([T.getOverview().catch(()=>null),T.getJobs({limit:5}).catch(()=>null),T.getGatewayLogs({limit:5}).catch(()=>null),T.getAuditSummary({days:7}).catch(()=>null)]),l=t||{},d=Array.isArray(s==null?void 0:s.items)?s.items:[],n=Array.isArray(r==null?void 0:r.items)?r.items:[];e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${S(l.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${S(l.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${S(l.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${S(l.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${S(l.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${S(n.length)}</div>
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
                ${d.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':d.map(a=>{var p,u;return`<tr>
                    <td class="cell-id">${o((p=a.id)==null?void 0:p.substring(0,8))}</td>
                    <td>${H(a.status)}</td>
                    <td class="cell-truncate">${o((u=a.comment_text)==null?void 0:u.substring(0,60))}</td>
                    <td class="cell-time">${o(A(a.created_at))}</td>
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
              <div class="stat-value">${S(i==null?void 0:i.total)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">成功</div>
              <div class="stat-value" style="color:var(--success-color)">${S(i==null?void 0:i.ok_count)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">失败</div>
              <div class="stat-value" style="color:var(--danger-color)">${S(i==null?void 0:i.failed_count)}</div>
            </div>
          </div>
        </div>
      </div>
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{c("正在刷新...","info"),G(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${o(t.message)}</div>`}}const _=$();async function re(e){let t=new Set;e.innerHTML=`
    <div class="page-header">
      <h2>任务管理</h2>
      <div class="page-actions">
        <button class="btn" id="jobs-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
        <button class="btn" id="jobs-export"><svg width="14" height="14"><use href="#icon-download"></use></svg> 导出 CSV</button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label class="form-label">状态</label>
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
        <label class="form-label">数量</label>
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
  `;const s=e.querySelector("#jobs-status"),r=e.querySelector("#jobs-limit");async function i(){var n;t.clear(),l();const d=e.querySelector("#jobs-table-wrapper");d.innerHTML='<div class="page-loading">加载中...</div>';try{const a=await _.getJobs({status:s.value,limit:r.value}),p=Array.isArray(a==null?void 0:a.items)?a.items:[];if(p.length===0){d.innerHTML='<div class="table-empty">暂无任务</div>';return}d.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${p.map(u=>{var v,f,b,x;return`
              <tr data-id="${o(u.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${o(u.id)}" /></td>
                <td class="cell-id" title="${o(u.id)}">${o((v=u.id)==null?void 0:v.substring(0,8))}</td>
                <td>${H(u.status)}</td>
                <td class="cell-truncate" title="${o(u.comment_text)}">${o((f=u.comment_text)==null?void 0:f.substring(0,80))}</td>
                <td class="cell-truncate">${o((b=u.reply_text)==null?void 0:b.substring(0,60))}</td>
                <td>${(x=u.risk_flags)!=null&&x.length?u.risk_flags.map(E=>`<span class="risk-flag">${o(E)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${q(u.created_at)}</td>
                <td class="cell-actions">
                  ${u.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${o(u.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${o(u.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(n=d.querySelector("#jobs-select-all"))==null||n.addEventListener("change",u=>{const v=u.target.checked;d.querySelectorAll(".job-checkbox").forEach(f=>{f.checked=v,v?t.add(f.dataset.id):t.delete(f.dataset.id)}),l()}),d.querySelectorAll(".job-checkbox").forEach(u=>{u.addEventListener("change",()=>{u.checked?t.add(u.dataset.id):t.delete(u.dataset.id),l()})}),d.querySelectorAll(".job-approve").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="审批中...";try{await _.approveJob(u.dataset.id),c("审批成功","success"),i()}catch(v){c(`审批失败: ${v.message}`,"error"),u.disabled=!1,u.textContent="审批"}})}),d.querySelectorAll(".job-retry").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="重试中...";try{await _.retryJob(u.dataset.id),c("重试已提交","success"),i()}catch(v){c(`重试失败: ${v.message}`,"error"),u.disabled=!1,u.textContent="重试"}})})}catch(a){d.innerHTML=`<div class="page-error">加载失败: ${o(a.message)}</div>`}}function l(){const d=e.querySelector("#jobs-batch-bar"),n=e.querySelector("#jobs-selected-count");t.size>0?(d.style.display="flex",n.textContent=`已选 ${t.size} 项`):d.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",i),e.querySelector("#jobs-refresh").addEventListener("click",i),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await _.exportJobsCsv({status:s.value,limit:r.value}),c("导出成功","success")}catch(d){c(`导出失败: ${d.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await _.batchApprove([...t]),c(`批量审批 ${t.size} 项成功`,"success"),i()}catch(d){c(`批量审批失败: ${d.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await _.batchRetry([...t]),c(`批量重试 ${t.size} 项成功`,"success"),i()}catch(d){c(`批量重试失败: ${d.message}`,"error")}}),await i()}const ae=$();async function de(e){e.innerHTML=`
    <div class="page-header">
      <h2>每日指标</h2>
      <div class="page-actions">
        <div class="form-group" style="margin:0;">
          <label class="form-label">天数</label>
          <input type="number" id="metrics-days" class="form-input" value="30" min="1" max="365" />
        </div>
        <button class="btn btn-primary" id="metrics-load">查询</button>
      </div>
    </div>
    <div class="table-wrapper" id="metrics-table-wrapper">
      <div class="page-loading">加载中...</div>
    </div>
  `;async function t(){const s=e.querySelector("#metrics-days").value,r=e.querySelector("#metrics-table-wrapper");r.innerHTML='<div class="page-loading">加载中...</div>';try{const i=await ae.getDailyMetrics({days:s}),l=Array.isArray(i==null?void 0:i.items)?i.items:Array.isArray(i)?i:[];if(l.length===0){r.innerHTML='<div class="table-empty">暂无指标数据</div>';return}r.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${l.map(d=>`<tr>
              <td class="cell-time">${o(d.date||d.day)}</td>
              <td>${o(d.comments??d.comment_count??0)}</td>
              <td>${o(d.jobs??d.job_count??0)}</td>
              <td style="color:var(--success-color)">${o(d.published??d.published_count??0)}</td>
              <td style="color:var(--danger-color)">${o(d.failed??d.failed_count??0)}</td>
              <td>${o(d.skipped??d.skipped_count??0)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      `}catch(i){r.innerHTML=`<div class="page-error">加载失败: ${o(i.message)}</div>`}}e.querySelector("#metrics-load").addEventListener("click",t),await t()}const M=$();async function oe(e){e.innerHTML=`
    <div class="page-header">
      <h2>知识库</h2>
      <button class="btn" id="knowledge-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
    </div>

    <div class="form-card">
      <h3>新增条目</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">分类</label>
          <input type="text" id="knowledge-category" class="form-input" placeholder="例: personality" />
        </div>
        <div class="form-group">
          <label class="form-label">标题</label>
          <input type="text" id="knowledge-title" class="form-input" placeholder="条目标题" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">内容</label>
        <textarea id="knowledge-content" class="form-input form-textarea" rows="3" placeholder="知识内容"></textarea>
      </div>
      <button class="btn btn-primary" id="knowledge-create">创建</button>
    </div>

    <div class="table-wrapper" id="knowledge-table-wrapper">
      <div class="page-loading">加载中...</div>
    </div>
  `;async function t(){const s=e.querySelector("#knowledge-table-wrapper");s.innerHTML='<div class="page-loading">加载中...</div>';try{const r=await M.getKnowledgeEntries({limit:50}),i=Array.isArray(r==null?void 0:r.items)?r.items:[];if(i.length===0){s.innerHTML='<div class="table-empty">暂无知识条目</div>';return}s.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${i.map(l=>{var d,n;return`<tr>
              <td class="cell-id">${o((d=l.id)==null?void 0:d.toString().substring(0,8))}</td>
              <td>${o(l.category)}</td>
              <td>${o(l.title)}</td>
              <td class="cell-truncate">${o((n=l.content)==null?void 0:n.substring(0,80))}</td>
              <td>${P(l.enabled!==!1)}</td>
              <td class="cell-time">${q(l.created_at)}</td>
              <td class="cell-actions">
                ${l.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${o(l.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,s.querySelectorAll(".knowledge-disable").forEach(l=>{l.addEventListener("click",async()=>{try{await M.disableKnowledgeEntry(l.dataset.id),c("已禁用","success"),t()}catch(d){c(`操作失败: ${d.message}`,"error")}})})}catch(r){s.innerHTML=`<div class="page-error">加载失败: ${o(r.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const s=e.querySelector("#knowledge-category").value.trim(),r=e.querySelector("#knowledge-title").value.trim(),i=e.querySelector("#knowledge-content").value.trim();if(!r||!i){c("标题和内容不能为空","warning");return}try{await M.createKnowledgeEntry({category:s,title:r,content:i}),c("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(l){c(`创建失败: ${l.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const k=$();let L=!1,y=null;async function ne(e){L=!1,y=null,e.innerHTML=`
    <div class="page-header">
      <h2>角色卡管理</h2>
      <div class="page-actions">
        <button class="btn" id="rc-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label class="form-label">选择角色卡</label>
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
          <label class="form-label">Key</label>
          <input type="text" id="rc-key" class="form-input" placeholder="唯一标识 (英文)" />
        </div>
        <div class="form-group">
          <label class="form-label">名称</label>
          <input type="text" id="rc-name" class="form-input" placeholder="角色名称" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">描述</label>
        <input type="text" id="rc-desc" class="form-input" placeholder="简短描述" />
      </div>
      <div class="form-group">
        <label class="form-label">System Prompt</label>
        <textarea id="rc-system-prompt" class="form-input form-textarea" rows="4" placeholder="系统提示词"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">语气 (Tone)</label>
        <input type="text" id="rc-tone" class="form-input" placeholder="例: friendly, witty" />
      </div>
      <div class="form-group">
        <label class="form-label">约束 (Constraints)</label>
        <textarea id="rc-constraints" class="form-input form-textarea" rows="2" placeholder="行为约束，JSON 或文本"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="rc-save">保存</button>
        <button class="btn" id="rc-activate" style="display:none;">激活</button>
        <button class="btn btn-danger" id="rc-disable" style="display:none;">禁用</button>
      </div>
    </div>
  `;const t=e.querySelector("#rc-select"),s=e.querySelector("#rc-editor");let r=[];function i(){L=!0}function l(){return L?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function d(a){y=a,e.querySelector("#rc-key").value=(a==null?void 0:a.key)||"",e.querySelector("#rc-key").disabled=!!a,e.querySelector("#rc-name").value=(a==null?void 0:a.name)||"",e.querySelector("#rc-desc").value=(a==null?void 0:a.description)||"",e.querySelector("#rc-system-prompt").value=(a==null?void 0:a.system_prompt)||"",e.querySelector("#rc-tone").value=(a==null?void 0:a.tone)||"",e.querySelector("#rc-constraints").value=typeof(a==null?void 0:a.constraints)=="string"?a.constraints:JSON.stringify((a==null?void 0:a.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=a?`编辑: ${a.name||a.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=a&&a.enabled!==!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=a&&a.enabled!==!1?"inline-flex":"none",s.style.display="block",L=!1}s.querySelectorAll(".form-input").forEach(a=>a.addEventListener("input",i));async function n(){try{const a=await k.getRoleCards({limit:100});r=Array.isArray(a==null?void 0:a.items)?a.items:Array.isArray(a)?a:[],t.innerHTML='<option value="">-- 新建 --</option>'+r.map(p=>`<option value="${o(p.key)}">${o(p.name||p.key)}${p.enabled===!1?" (禁用)":""}</option>`).join("")}catch(a){c(`加载失败: ${a.message}`,"error")}}t.addEventListener("change",()=>{if(!l()){t.value=(y==null?void 0:y.key)||"";return}const a=t.value,p=r.find(u=>u.key===a);d(p||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{l()&&(t.value="",d(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const a={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},p=e.querySelector("#rc-constraints").value.trim();try{a.constraints=p?JSON.parse(p):""}catch{a.constraints=p}if(!a.key){c("Key 不能为空","warning");return}try{y!=null&&y.key?(await k.updateRoleCard(y.key,a),c("保存成功","success")):(await k.createRoleCard(a),c("创建成功","success")),L=!1,await n(),t.value=a.key}catch(u){c(`操作失败: ${u.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(y!=null&&y.key)try{await k.activateRoleCard(y.key),c("已激活","success"),await n()}catch(a){c(`激活失败: ${a.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(y!=null&&y.key)try{await k.disableRoleCard(y.key),c("已禁用","success"),await n()}catch(a){c(`禁用失败: ${a.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{n()}),await n()}const C=$();async function ce(e){e.innerHTML=`
    <div class="page-header"><h2>风格配置</h2></div>

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
        <button class="btn btn-primary" id="profile-style-apply">应用</button>
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
        <button class="btn btn-primary" id="profile-role-apply">应用</button>
        <div id="profile-role-current" class="form-hint" style="margin-top:8px;"></div>
      </div>
    </div>
  `;async function t(){try{const[s,r]=await Promise.all([C.getStyleProfile().catch(()=>null),C.getRoleProfile().catch(()=>null)]);s!=null&&s.style&&(e.querySelector("#profile-style").value=s.style,e.querySelector("#profile-style-current").textContent=`当前: ${s.style}`),r!=null&&r.role&&(e.querySelector("#profile-role").value=r.role,e.querySelector("#profile-role-current").textContent=`当前: ${r.role}`)}catch(s){c(`加载配置失败: ${s.message}`,"error")}}e.querySelector("#profile-style-apply").addEventListener("click",async()=>{const s=e.querySelector("#profile-style").value;try{await C.setStyleProfile(s),e.querySelector("#profile-style-current").textContent=`当前: ${s}`,c("风格已更新","success")}catch(r){c(`更新失败: ${r.message}`,"error")}}),e.querySelector("#profile-role-apply").addEventListener("click",async()=>{const s=e.querySelector("#profile-role").value;try{await C.setRoleProfile(s),e.querySelector("#profile-role-current").textContent=`当前: ${s}`,c("角色配置已更新","success")}catch(r){c(`更新失败: ${r.message}`,"error")}}),await t()}function ue({columns:e,rows:t,empty:s="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${o(s)}</div>`;const r=e.map(l=>`<th class="${l.class||""}">${o(l.label)}</th>`).join(""),i=t.map(l=>`<tr>${e.map(d=>`<td class="${d.class||""}">${d.render?d.render(l):o(l[d.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${r}</tr></thead>
        <tbody>${i}</tbody>
      </table>
    </div>
  `}const D=$();async function ve(e){e.innerHTML=`
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
              <label class="form-label">Comment ID</label>
              <input type="text" id="gw-comment-id" class="form-input" placeholder="评论 ID" />
            </div>
            <div class="form-group">
              <label class="form-label">来源</label>
              <input type="text" id="gw-source" class="form-input" value="manual" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">回复内容 <span id="gw-char-count" class="form-hint">0/0</span></label>
            <textarea id="gw-reply" class="form-input form-textarea" rows="3" placeholder="回复文本"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group" style="flex-direction:row; align-items:center; gap:8px;">
              <label class="form-label" style="margin:0;">强制发布</label>
              <input type="checkbox" id="gw-force" />
            </div>
          </div>
          <button class="btn btn-primary" id="gw-publish-btn">发布</button>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label class="form-label">数量</label>
        <input type="number" id="gw-limit" class="form-input" value="20" min="1" max="100" />
      </div>
      <div class="form-group">
        <button class="btn btn-primary" id="gw-filter-btn">查询</button>
      </div>
    </div>

    <div class="table-wrapper" id="gw-table-wrapper">
      <div class="page-loading">加载中...</div>
    </div>
  `;const t=e.querySelector("#gw-reply"),s=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{s.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const i=e.querySelector("#gw-publish-btn"),l=e.querySelector("#gw-comment-id").value.trim(),d=e.querySelector("#gw-reply").value.trim(),n=e.querySelector("#gw-source").value.trim(),a=e.querySelector("#gw-force").checked;if(!l||!d){c("Comment ID 和回复内容不能为空","warning");return}i.disabled=!0,i.textContent="发布中...";try{await D.publishGatewayReply({comment_id:l,reply_text:d,source:n,force_publish:a}),c("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",s.textContent="0/0",r()}catch(p){c(`发布失败: ${p.message}`,"error")}finally{i.disabled=!1,i.textContent="发布"}});async function r(){const i=e.querySelector("#gw-table-wrapper"),l=e.querySelector("#gw-limit").value;i.innerHTML='<div class="page-loading">加载中...</div>';try{const d=await D.getGatewayLogs({limit:l}),n=Array.isArray(d==null?void 0:d.items)?d.items:[];if(n.length===0){i.innerHTML='<div class="table-empty">暂无网关日志</div>';return}i.innerHTML=ue({columns:[{key:"id",label:"ID",class:"cell-id",render:a=>{var p;return o((p=a.id)==null?void 0:p.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:a=>{var p;return o((p=a.comment_id)==null?void 0:p.substring(0,12))}},{key:"status",label:"状态",render:a=>H(a.status)},{key:"platform",label:"平台",render:a=>o(a.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:a=>{var p;return o((p=a.reply_text)==null?void 0:p.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:a=>q(a.created_at)}],rows:n})}catch(d){i.innerHTML=`<div class="page-error">加载失败: ${o(d.message)}</div>`}}e.querySelector("#gw-refresh").addEventListener("click",r),e.querySelector("#gw-filter-btn").addEventListener("click",r),await r()}const B=$();async function be(e){e.innerHTML=`
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
        <label class="form-label">操作类型</label>
        <input type="text" id="audit-action" class="form-input" placeholder="例: approve, retry" />
      </div>
      <div class="form-group">
        <label class="form-label">成功</label>
        <select id="audit-ok" class="form-input">
          <option value="">全部</option>
          <option value="true">成功</option>
          <option value="false">失败</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">数量</label>
        <input type="number" id="audit-limit" class="form-input" value="30" min="1" max="200" />
      </div>
      <div class="form-group">
        <button class="btn btn-primary" id="audit-filter-btn">查询</button>
      </div>
    </div>

    <div class="table-wrapper" id="audit-table-wrapper">
      <div class="page-loading">加载中...</div>
    </div>
  `;async function t(){try{const r=await B.getAuditSummary({days:7}),i=e.querySelector("#audit-summary-cards");i.innerHTML=`
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
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function s(){const r=e.querySelector("#audit-table-wrapper");r.innerHTML='<div class="page-loading">加载中...</div>';const i=e.querySelector("#audit-action").value.trim(),l=e.querySelector("#audit-ok").value,d=e.querySelector("#audit-limit").value;try{const n=await B.getAuditLogs({action:i,ok:l,limit:d}),a=Array.isArray(n==null?void 0:n.items)?n.items:[];if(a.length===0){r.innerHTML='<div class="table-empty">暂无审计日志</div>';return}r.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${a.map(p=>{var u;return`<tr>
              <td class="cell-id">${o((u=p.id)==null?void 0:u.toString().substring(0,8))}</td>
              <td>${o(p.action)}</td>
              <td class="cell-truncate">${o(p.target_id||"-")}</td>
              <td>${p.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${o(p.detail||"-")}</td>
              <td class="cell-time">${q(p.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(n){r.innerHTML=`<div class="page-error">加载失败: ${o(n.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),s()}),e.querySelector("#audit-filter-btn").addEventListener("click",s),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await B.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),c("导出成功","success")}catch(r){c(`导出失败: ${r.message}`,"error")}}),await Promise.all([t(),s()])}const h=$(),pe=/^BV[a-zA-Z0-9]{10}$/,me={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},ye={"auth:no active credential":"缺少可用的激活凭证。","dependency:diagnostics_unavailable":"诊断信息暂时不可用。"},fe={manual_queue:"人工队列",simulated:"模拟发布",webhook:"Webhook",real_publish:"真实发布",native_bilibili:"原生 B 站发布"},ge={ok:{label:"成功",cls:"badge-success"},no_new:{label:"无新增",cls:"badge-muted"},error:{label:"失败",cls:"badge-danger"}},he={no_aid:"缺少视频 aid，暂时无法轮询。",retry_exhausted:"评论抓取重试耗尽。"};function g(e){const t=e instanceof Error?e.message:String(e??"request_failed");return me[t]||t}function we(e){return e?pe.test(e)?null:"invalid_bvid_format":"bvid_required"}function $e(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function Se(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function _e(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(s=>ye[s]||s).join("；")}function qe(e){const t=String(e??"").trim().toLowerCase();return fe[t]||t||"-"}function ke(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":t%60===0?`${t/60} 分钟`:`${t} 秒`}function Le(e,t){const s=String(e??"").trim().toLowerCase();if(!s)return"-";const r=ge[s]||{label:s,cls:"badge-muted"},i=s==="error"&&t?he[String(t).trim().toLowerCase()]||String(t):"",l=i?` title="${o(i)}"`:"";return`<span class="status-badge ${r.cls}"${l}>${o(r.label)}</span>${i?`<div class="form-hint" style="margin-top:4px;">${o(i)}</div>`:""}`}function J(e){return e?A(e):"-"}function xe(e){if(e==="true")return!0;if(e==="false")return!1}function Ee(e){return e==="true"?"暂无轮询中视频":e==="false"?"暂无已停用视频":"暂无视频"}function Te(e,t,s){return`筛选: ${s==="true"?"轮询中":s==="false"?"已停用":"全部"}，共 ${e} 条，当前展示 ${t} 条`}function V(e,t={}){const s=Number((e==null?void 0:e.videos)??0),r=Number((e==null?void 0:e.comments)??0),i=Number((e==null?void 0:e.events_injected)??r),l=t.subject||(s===1?"视频":"轮询");return r>0||i>0?`${l}完成，处理 ${s} 个视频，新增 ${r} 条评论，注入 ${i} 个事件。`:s>0?`${l}完成，处理 ${s} 个视频，暂无新增评论。`:`${l}完成，暂无可处理视频。`}function K(e,t,s){const r=e.querySelector(s);t.forEach(i=>{const l=e.querySelector(i);l==null||l.addEventListener("keydown",d=>{d.key==="Enter"&&(d.preventDefault(),r.disabled||r.click())})})}async function Ce(e){e.innerHTML=`
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
          <input type="text" id="bili-video-bvid" class="form-input" placeholder="输入 BVID" />
          <button class="btn btn-primary" id="bili-video-add">添加</button>
        </div>
      </div>
      <div class="filter-bar" style="padding: 0 16px 16px;">
        <div class="form-group">
          <label class="form-label">轮询状态</label>
          <select id="bili-video-poll-filter" class="form-input">
            <option value="">全部</option>
            <option value="true">仅轮询中</option>
            <option value="false">仅已停用</option>
          </select>
        </div>
        <div class="form-group">
          <button class="btn btn-primary" id="bili-video-filter-btn">查询</button>
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
          <div class="form-group"><label class="form-label">名称</label><input type="text" id="cred-name" class="form-input" /></div>
          <div class="form-group"><label class="form-label">SESSDATA</label><input type="text" id="cred-sessdata" class="form-input" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">bili_jct</label><input type="text" id="cred-bili-jct" class="form-input" /></div>
          <div class="form-group"><label class="form-label">buvid3</label><input type="text" id="cred-buvid3" class="form-input" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">buvid4</label><input type="text" id="cred-buvid4" class="form-input" /></div>
          <div class="form-group"><label class="form-label">过期时间</label><input type="datetime-local" id="cred-expires" class="form-input" /></div>
        </div>
        <button class="btn btn-primary" id="cred-add">添加凭证</button>
      </div>
      <div class="table-wrapper" id="bili-creds-wrapper">
        <div class="page-loading">加载中...</div>
      </div>
    </div>
  `;async function t(){var l,d,n,a,p,u,v,f;const i=e.querySelector("#bili-status-cards");try{const b=await h.getBilibiliStatus(),x=Number(((l=b==null?void 0:b.videos)==null?void 0:l.poll_enabled_count)??0),E=!!((d=b==null?void 0:b.diagnostics)!=null&&d.ready),N=_e((n=b==null?void 0:b.diagnostics)==null?void 0:n.blocking_reasons),Z=(a=b==null?void 0:b.credential)!=null&&a.name?o(b.credential.name):"未配置",Q=qe((p=b==null?void 0:b.diagnostics)==null?void 0:p.effective_publish_mode),X=ke((u=b==null?void 0:b.config)==null?void 0:u.poll_interval_seconds),ee=J((v=b==null?void 0:b.credential)==null?void 0:v.expires_at),te=J((f=b==null?void 0:b.credential)==null?void 0:f.last_used_at);i.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${b!=null&&b.enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询</div>
          <div class="stat-value">${b!=null&&b.polling_enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布</div>
          <div class="stat-value">${b!=null&&b.publish_enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">视频数</div>
          <div class="stat-value">${(b==null?void 0:b.video_count)??0}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${x}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${Z}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${E?"var(--success-color)":"var(--danger-color)"}">${E?"就绪":"阻塞"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布模式</div>
          <div class="stat-value">${o(Q)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询间隔</div>
          <div class="stat-value">${o(X)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">凭证过期</div>
          <div class="stat-value" style="font-size:14px;">${o(ee)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">最近使用</div>
          <div class="stat-value" style="font-size:14px;">${o(te)}</div>
        </div>
        ${N?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">阻塞原因: ${o(N)}</div>`:""}
      `}catch(b){i.innerHTML=`<div class="page-error">状态加载失败: ${o(g(b))}</div>`}}async function s(){const i=e.querySelector("#bili-videos-wrapper"),l=e.querySelector("#bili-video-summary"),d=e.querySelector("#bili-video-filter-btn"),n=e.querySelector("#bili-video-poll-filter").value;l.textContent="加载中...",d.disabled=!0;try{const a=await h.getBilibiliVideos({limit:50,poll_enabled:xe(n)}),p=Array.isArray(a==null?void 0:a.items)?a.items:Array.isArray(a)?a:[],u=Number((a==null?void 0:a.total)??p.length);if(l.textContent=Te(u,p.length,n),p.length===0){i.innerHTML=`<div class="table-empty">${o(Ee(n))}</div>`;return}i.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${p.map(v=>`<tr data-id="${o(v.id||v.video_id)}">
              <td class="cell-id">${o(v.bvid)}</td>
              <td class="cell-truncate">${o(v.title||"-")}</td>
              <td>${P(v.poll_enabled)}</td>
              <td>${v.comment_count??"-"}</td>
              <td class="cell-time">${v.last_polled_at?q(v.last_polled_at):"-"}</td>
              <td>${Le(v.last_poll_status,v.last_poll_error)}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${o(v.id||v.video_id)}">${v.poll_enabled?"禁用轮询":"启用轮询"}</button>
                <button class="btn btn-sm bili-sync" data-id="${o(v.id||v.video_id)}">同步</button>
                <button class="btn btn-sm btn-danger bili-delete" data-id="${o(v.id||v.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".bili-toggle-poll").forEach(v=>{v.addEventListener("click",async()=>{v.disabled=!0;try{await h.toggleBilibiliVideoPoll(v.dataset.id),c("操作成功","success"),await Promise.all([t(),s()])}catch(f){c(`失败: ${g(f)}`,"error")}finally{v.disabled=!1}})}),i.querySelectorAll(".bili-sync").forEach(v=>{v.addEventListener("click",async()=>{const f=v.textContent;v.disabled=!0,v.textContent="同步中...";try{const b=await h.syncBilibiliVideo(v.dataset.id);c(V(b==null?void 0:b.result,{subject:"同步"}),"success"),await Promise.all([t(),s()])}catch(b){c(`同步失败: ${g(b)}`,"error")}finally{v.disabled=!1,v.textContent=f}})}),i.querySelectorAll(".bili-delete").forEach(v=>{v.addEventListener("click",async()=>{if(confirm("确定删除此视频？")){v.disabled=!0;try{await h.deleteBilibiliVideo(v.dataset.id),c("已删除","success"),await Promise.all([t(),s()])}catch(f){c(`删除失败: ${g(f)}`,"error")}finally{v.disabled=!1}}})})}catch(a){l.textContent="视频加载失败",i.innerHTML=`<div class="page-error">加载失败: ${o(g(a))}</div>`}finally{d.disabled=!1}}async function r(){const i=e.querySelector("#bili-creds-wrapper");try{const l=await h.getBilibiliCredentials(),d=Array.isArray(l==null?void 0:l.items)?l.items:Array.isArray(l)?l:[];if(d.length===0){i.innerHTML='<div class="table-empty">暂无凭证</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${d.map(n=>`<tr data-id="${o(n.id||n.credential_id)}">
              <td>${o(n.name||"-")}</td>
              <td class="cell-id">${o([n.has_sessdata?"SESSDATA":"",n.has_bili_jct?"bili_jct":"",n.buvid3?`buvid3:${n.buvid3}`:""].filter(Boolean).join(" / ")||"-")}</td>
              <td>${P(n.is_active||n.active)}</td>
              <td class="cell-time">${o(n.expires_at?A(n.expires_at):"-")}</td>
              <td class="cell-time">${n.last_used_at?q(n.last_used_at):"-"}</td>
              <td class="cell-actions">
                ${n.is_active||n.active?"":`<button class="btn btn-sm cred-activate" data-id="${o(n.id||n.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${o(n.id||n.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".cred-activate").forEach(n=>{n.addEventListener("click",async()=>{n.disabled=!0;try{await h.activateBilibiliCredential(n.dataset.id),c("已激活","success"),await Promise.all([t(),r()])}catch(a){c(`激活失败: ${g(a)}`,"error")}finally{n.disabled=!1}})}),i.querySelectorAll(".cred-delete").forEach(n=>{n.addEventListener("click",async()=>{if(confirm("确定删除此凭证？")){n.disabled=!0;try{await h.deleteBilibiliCredential(n.dataset.id),c("已删除","success"),await Promise.all([t(),r()])}catch(a){c(`删除失败: ${g(a)}`,"error")}finally{n.disabled=!1}}})})}catch(l){i.innerHTML=`<div class="page-error">加载失败: ${o(g(l))}</div>`}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const i=e.querySelector("#bili-video-add"),l=e.querySelector("#bili-video-bvid").value.trim(),d=we(l);if(d){c(g(d),"warning");return}i.disabled=!0,i.textContent="添加中...";try{await h.addBilibiliVideo(l),c("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([t(),s()])}catch(n){c(`添加失败: ${g(n)}`,"error")}finally{i.disabled=!1,i.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{const i=e.querySelector("#cred-add"),l=Se(e.querySelector("#cred-expires").value),d={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:l},n=$e(d);if(n){c(g(n),"warning");return}i.disabled=!0,i.textContent="添加中...";try{await h.addBilibiliCredential(d),c("凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([t(),r()])}catch(a){c(`添加失败: ${g(a)}`,"error")}finally{i.disabled=!1,i.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const i=e.querySelector("#bili-poll-btn");i.disabled=!0,i.textContent="轮询中...";try{const l=await h.triggerBilibiliPoll();c(V(l==null?void 0:l.result),"success"),await Promise.all([t(),s()])}catch(l){c(`轮询失败: ${g(l)}`,"error")}finally{i.disabled=!1,i.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",()=>{t(),s(),r()}),e.querySelector("#bili-video-filter-btn").addEventListener("click",s),e.querySelector("#bili-video-poll-filter").addEventListener("change",s),K(e,["#bili-video-bvid"],"#bili-video-add"),K(e,["#cred-name","#cred-sessdata","#cred-bili-jct","#cred-buvid3","#cred-buvid4","#cred-expires"],"#cred-add"),await Promise.all([t(),s(),r()])}const U=$();async function Ae(e){e.innerHTML=`
    <div class="page-header"><h2>查询</h2></div>

    <div class="section-grid">
      <div class="section-card">
        <div class="section-card-header"><h3>评论详情查询</h3></div>
        <div style="padding: 16px;">
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <input type="text" id="query-comment-id" class="form-input" placeholder="输入 Comment ID" />
            </div>
            <div class="form-group">
              <button class="btn btn-primary" id="query-comment-btn">查询评论</button>
            </div>
          </div>
          <div id="query-comment-result"></div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-card-header"><h3>任务详情查询</h3></div>
        <div style="padding: 16px;">
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <input type="text" id="query-job-id" class="form-input" placeholder="输入 Job ID" />
            </div>
            <div class="form-group">
              <button class="btn btn-primary" id="query-job-btn">查询任务</button>
            </div>
          </div>
          <div id="query-job-result"></div>
        </div>
      </div>
    </div>
  `,e.querySelector("#query-comment-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-comment-id").value.trim(),s=e.querySelector("#query-comment-result");if(!t){c("请输入 Comment ID","warning");return}s.innerHTML='<div class="page-loading">查询中...</div>';try{const r=await U.getComment(t);s.innerHTML=`
        <div class="detail-card">
          ${Object.entries(r||{}).map(([i,l])=>`
            <div class="detail-row">
              <span class="detail-key">${o(i)}</span>
              <span class="detail-value">${o(typeof l=="object"?JSON.stringify(l,null,2):String(l??"-"))}</span>
            </div>
          `).join("")}
        </div>
      `}catch(r){s.innerHTML=`<div class="page-error">查询失败: ${o(r.message)}</div>`}}),e.querySelector("#query-job-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-job-id").value.trim(),s=e.querySelector("#query-job-result");if(!t){c("请输入 Job ID","warning");return}s.innerHTML='<div class="page-loading">查询中...</div>';try{const r=await U.getJob(t);s.innerHTML=`
        <div class="detail-card">
          ${Object.entries(r||{}).map(([l,d])=>`
            <div class="detail-row">
              <span class="detail-key">${o(l)}</span>
              <span class="detail-value">${o(typeof d=="object"?JSON.stringify(d,null,2):String(d??"-"))}</span>
            </div>
          `).join("")}
        </div>
        ${r!=null&&r.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${o(r.comment_id)}">查看关联评论 →</a></div>`:""}
      `;const i=s.querySelector("#query-goto-comment");i&&i.addEventListener("click",()=>{e.querySelector("#query-comment-id").value=i.dataset.id,e.querySelector("#query-comment-btn").click()})}catch(r){s.innerHTML=`<div class="page-error">查询失败: ${o(r.message)}</div>`}})}const I={dashboard:{render:G,title:"仪表盘"},jobs:{render:re,title:"任务管理"},"daily-metrics":{render:de,title:"每日指标"},knowledge:{render:oe,title:"知识库"},"role-cards":{render:ne,title:"角色卡"},profiles:{render:ce,title:"风格配置"},gateway:{render:ve,title:"网关"},audit:{render:be,title:"审计日志"},bilibili:{render:Ce,title:"B站集成"},query:{render:Ae,title:"查询"}};let F=null;function je(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function Y(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function W(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function Me(e){e.preventDefault();const t=document.getElementById("login-api-key"),s=document.getElementById("login-error"),r=t.value.trim();if(r){window.__ADMIN_API_KEY__=r;try{await m("/api/admin/overview"),sessionStorage.setItem("admin_api_key",r),W(),O("dashboard")}catch{s.textContent="API Key 无效或服务不可用",s.style.display="block",window.__ADMIN_API_KEY__=""}}}function Be(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",Y()}function O(e){if(!I[e])return;F=e,document.querySelectorAll("#nav-list .nav-item").forEach(s=>{s.classList.toggle("active",s.dataset.page===e)}),document.getElementById("page-title").textContent=I[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',I[e].render(t).catch(s=>{t.innerHTML=`<div class="page-error">加载失败: ${s.message}</div>`})}function Ie(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==F&&O(t)})})}function Pe(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),s=document.getElementById("expand-left-btn");t&&s&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),s.style.display="block"}),s.addEventListener("click",()=>{e.classList.remove("collapsed"),s.style.display="none"}))}function He(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let s=0;e.addEventListener("click",()=>{s=(s+1)%t.length,t[s]?document.body.setAttribute("data-theme",t[s]):document.body.removeAttribute("data-theme")})}function Oe(){Pe(),He(),Ie(),document.getElementById("login-form").addEventListener("submit",Me),document.getElementById("logout-btn").addEventListener("click",Be),je()?(W(),O("dashboard")):Y()}Oe();
