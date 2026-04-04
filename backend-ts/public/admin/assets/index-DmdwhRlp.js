(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))a(t);new MutationObserver(t=>{for(const s of t)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&a(o)}).observe(document,{childList:!0,subtree:!0});function r(t){const s={};return t.integrity&&(s.integrity=t.integrity),t.referrerPolicy&&(s.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?s.credentials="include":t.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function a(t){if(t.ep)return;t.ep=!0;const s=r(t);fetch(t.href,s)}})();function z(e,i,r){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:i>=500?"request_failed":typeof r=="string"&&r.trim()?r.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function N(){return(window.__ADMIN_API_KEY__||"").trim()}async function p(e,i={}){const r=N(),a=new Headers(i.headers||{});r&&a.set("x-api-key",r);const t=await fetch(e,{...i,headers:a}),s=await t.json().catch(()=>({}));if(!t.ok){const o=(s==null?void 0:s.detail)||(s==null?void 0:s.error);throw new Error(z(o,t.status,t.statusText))}return s}async function P(e,i){const r=N(),a=new Headers;r&&a.set("x-api-key",r);const t=await fetch(e,{headers:a});if(!t.ok)throw new Error("download_failed");const s=await t.blob(),o=URL.createObjectURL(s),d=document.createElement("a");d.href=o,d.download=i,document.body.appendChild(d),d.click(),document.body.removeChild(d),URL.revokeObjectURL(o)}function y(e){const i=new URLSearchParams;for(const[a,t]of Object.entries(e))t!=null&&t!==""&&i.set(a,String(t));const r=i.toString();return r?`?${r}`:""}function g(){return{getOverview(){return p("/api/admin/overview")},getJobs({status:e,limit:i}={}){return p(`/api/admin/jobs${y({status:e,limit:i})}`)},getJob(e){return p(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return p(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,i={}){return p(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)})},batchApprove(e){return p("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return p("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:i}={}){return P(`/export/jobs.csv${y({status:e,limit:i})}`,"jobs.csv")},getComment(e){return p(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,comment_id:i}={}){return p(`/api/admin/gateway/logs${y({limit:e,comment_id:i})}`)},publishGatewayReply(e){return p("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:i,ok:r}={}){return p(`/api/admin/audit/summary${y({days:e,action:i,ok:r})}`)},getAuditLogs({limit:e,action:i,ok:r}={}){return p(`/api/audit-log${y({limit:e,action:i,ok:r})}`)},exportAuditCsv({limit:e,action:i,ok:r}={}){return P(`/export/audit-logs.csv${y({limit:e,action:i,ok:r})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return p(`/api/metrics/daily${y({days:e})}`)},getKnowledgeEntries({limit:e,offset:i}={}){return p(`/api/admin/knowledge${y({limit:e,offset:i})}`)},createKnowledgeEntry(e){return p("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return p(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getRoleCards({limit:e,offset:i}={}){return p(`/api/admin/role-cards${y({limit:e,offset:i})}`)},createRoleCard(e){return p("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,i){return p(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)})},disableRoleCard(e){return p(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return p(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return p("/api/admin/style-profile")},setStyleProfile(e){return p("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return p("/api/admin/role-profile")},setRoleProfile(e){return p("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return p("/api/admin/bilibili/status")},getBilibiliVideos({poll_enabled:e,limit:i,offset:r}={}){return p(`/api/admin/bilibili/videos${y({poll_enabled:e,limit:i,offset:r})}`)},addBilibiliVideo(e){return p("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return p(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return p(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return p(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return p("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return p("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return p("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return p(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return p(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function n(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function j(e){if(!e)return"-";try{const i=new Date(e);return isNaN(i.getTime())?String(e):i.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function G(e){if(!e)return"";try{const i=new Date(e);if(isNaN(i.getTime()))return"";const r=Date.now()-i.getTime(),a=Math.floor(r/1e3);if(a<60)return"刚刚";const t=Math.floor(a/60);if(t<60)return`${t}分钟前`;const s=Math.floor(t/60);if(s<24)return`${s}小时前`;const o=Math.floor(s/24);if(o<30)return`${o}天前`;const d=Math.floor(o/30);return d<12?`${d}个月前`:`${Math.floor(d/12)}年前`}catch{return""}}function E(e){const i=G(e),r=j(e);return i?`<span title="${n(r)}">${n(i)}</span>`:`<span title="${n(r)}">${n(r)}</span>`}function h(e){if(e==null)return"0";const i=Number(e);return isNaN(i)?"0":String(i)}const Y={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function M(e){if(!e)return"";const i=Y[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${i.cls}">${n(i.label)}</span>`}function A(e,i="是",r="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${n(e?i:r)}</span>`}let _=null;function c(e,i="info"){const r=document.getElementById("app-toast");r&&r.remove(),_&&clearTimeout(_);const a={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},t=document.createElement("div");t.id="app-toast",t.className="toast-notification",t.style.setProperty("--toast-color",a[i]||a.info),t.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(t),requestAnimationFrame(()=>t.classList.add("show"));const s=()=>{t.classList.remove("show"),setTimeout(()=>t.remove(),300)};t.querySelector(".toast-close").onclick=s,_=setTimeout(s,4e3)}const k=g();async function J(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[i,r,a,t]=await Promise.all([k.getOverview().catch(()=>null),k.getJobs({limit:5}).catch(()=>null),k.getGatewayLogs({limit:5}).catch(()=>null),k.getAuditSummary({days:7}).catch(()=>null)]),s=i||{},o=Array.isArray(r==null?void 0:r.items)?r.items:[],d=Array.isArray(a==null?void 0:a.items)?a.items:[];e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${h(s.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${h(s.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${h(s.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${h(s.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${h(s.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${h(d.length)}</div>
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
                ${o.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':o.map(l=>{var v,u;return`<tr>
                    <td class="cell-id">${n((v=l.id)==null?void 0:v.substring(0,8))}</td>
                    <td>${M(l.status)}</td>
                    <td class="cell-truncate">${n((u=l.comment_text)==null?void 0:u.substring(0,60))}</td>
                    <td class="cell-time">${n(j(l.created_at))}</td>
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
              <div class="stat-value">${h(t==null?void 0:t.total)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">成功</div>
              <div class="stat-value" style="color:var(--success-color)">${h(t==null?void 0:t.ok_count)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">失败</div>
              <div class="stat-value" style="color:var(--danger-color)">${h(t==null?void 0:t.failed_count)}</div>
            </div>
          </div>
        </div>
      </div>
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{c("正在刷新...","info"),J(e)})}catch(i){e.innerHTML=`<div class="page-error">加载失败: ${n(i.message)}</div>`}}const S=g();async function F(e){let i=new Set;e.innerHTML=`
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
  `;const r=e.querySelector("#jobs-status"),a=e.querySelector("#jobs-limit");async function t(){var d;i.clear(),s();const o=e.querySelector("#jobs-table-wrapper");o.innerHTML='<div class="page-loading">加载中...</div>';try{const l=await S.getJobs({status:r.value,limit:a.value}),v=Array.isArray(l==null?void 0:l.items)?l.items:[];if(v.length===0){o.innerHTML='<div class="table-empty">暂无任务</div>';return}o.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${v.map(u=>{var f,w,H,B;return`
              <tr data-id="${n(u.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${n(u.id)}" /></td>
                <td class="cell-id" title="${n(u.id)}">${n((f=u.id)==null?void 0:f.substring(0,8))}</td>
                <td>${M(u.status)}</td>
                <td class="cell-truncate" title="${n(u.comment_text)}">${n((w=u.comment_text)==null?void 0:w.substring(0,80))}</td>
                <td class="cell-truncate">${n((H=u.reply_text)==null?void 0:H.substring(0,60))}</td>
                <td>${(B=u.risk_flags)!=null&&B.length?u.risk_flags.map(V=>`<span class="risk-flag">${n(V)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${E(u.created_at)}</td>
                <td class="cell-actions">
                  ${u.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${n(u.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${n(u.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(d=o.querySelector("#jobs-select-all"))==null||d.addEventListener("change",u=>{const f=u.target.checked;o.querySelectorAll(".job-checkbox").forEach(w=>{w.checked=f,f?i.add(w.dataset.id):i.delete(w.dataset.id)}),s()}),o.querySelectorAll(".job-checkbox").forEach(u=>{u.addEventListener("change",()=>{u.checked?i.add(u.dataset.id):i.delete(u.dataset.id),s()})}),o.querySelectorAll(".job-approve").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="审批中...";try{await S.approveJob(u.dataset.id),c("审批成功","success"),t()}catch(f){c(`审批失败: ${f.message}`,"error"),u.disabled=!1,u.textContent="审批"}})}),o.querySelectorAll(".job-retry").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="重试中...";try{await S.retryJob(u.dataset.id),c("重试已提交","success"),t()}catch(f){c(`重试失败: ${f.message}`,"error"),u.disabled=!1,u.textContent="重试"}})})}catch(l){o.innerHTML=`<div class="page-error">加载失败: ${n(l.message)}</div>`}}function s(){const o=e.querySelector("#jobs-batch-bar"),d=e.querySelector("#jobs-selected-count");i.size>0?(o.style.display="flex",d.textContent=`已选 ${i.size} 项`):o.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",t),e.querySelector("#jobs-refresh").addEventListener("click",t),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await S.exportJobsCsv({status:r.value,limit:a.value}),c("导出成功","success")}catch(o){c(`导出失败: ${o.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(i.size!==0)try{await S.batchApprove([...i]),c(`批量审批 ${i.size} 项成功`,"success"),t()}catch(o){c(`批量审批失败: ${o.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(i.size!==0)try{await S.batchRetry([...i]),c(`批量重试 ${i.size} 项成功`,"success"),t()}catch(o){c(`批量重试失败: ${o.message}`,"error")}}),await t()}const Q=g();async function W(e){e.innerHTML=`
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
  `;async function i(){const r=e.querySelector("#metrics-days").value,a=e.querySelector("#metrics-table-wrapper");a.innerHTML='<div class="page-loading">加载中...</div>';try{const t=await Q.getDailyMetrics({days:r}),s=Array.isArray(t==null?void 0:t.items)?t.items:Array.isArray(t)?t:[];if(s.length===0){a.innerHTML='<div class="table-empty">暂无指标数据</div>';return}a.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${s.map(o=>`<tr>
              <td class="cell-time">${n(o.date||o.day)}</td>
              <td>${n(o.comments??o.comment_count??0)}</td>
              <td>${n(o.jobs??o.job_count??0)}</td>
              <td style="color:var(--success-color)">${n(o.published??o.published_count??0)}</td>
              <td style="color:var(--danger-color)">${n(o.failed??o.failed_count??0)}</td>
              <td>${n(o.skipped??o.skipped_count??0)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      `}catch(t){a.innerHTML=`<div class="page-error">加载失败: ${n(t.message)}</div>`}}e.querySelector("#metrics-load").addEventListener("click",i),await i()}const x=g();async function X(e){e.innerHTML=`
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
  `;async function i(){const r=e.querySelector("#knowledge-table-wrapper");r.innerHTML='<div class="page-loading">加载中...</div>';try{const a=await x.getKnowledgeEntries({limit:50}),t=Array.isArray(a==null?void 0:a.items)?a.items:[];if(t.length===0){r.innerHTML='<div class="table-empty">暂无知识条目</div>';return}r.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${t.map(s=>{var o,d;return`<tr>
              <td class="cell-id">${n((o=s.id)==null?void 0:o.toString().substring(0,8))}</td>
              <td>${n(s.category)}</td>
              <td>${n(s.title)}</td>
              <td class="cell-truncate">${n((d=s.content)==null?void 0:d.substring(0,80))}</td>
              <td>${A(s.enabled!==!1)}</td>
              <td class="cell-time">${E(s.created_at)}</td>
              <td class="cell-actions">
                ${s.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${n(s.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,r.querySelectorAll(".knowledge-disable").forEach(s=>{s.addEventListener("click",async()=>{try{await x.disableKnowledgeEntry(s.dataset.id),c("已禁用","success"),i()}catch(o){c(`操作失败: ${o.message}`,"error")}})})}catch(a){r.innerHTML=`<div class="page-error">加载失败: ${n(a.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const r=e.querySelector("#knowledge-category").value.trim(),a=e.querySelector("#knowledge-title").value.trim(),t=e.querySelector("#knowledge-content").value.trim();if(!a||!t){c("标题和内容不能为空","warning");return}try{await x.createKnowledgeEntry({category:r,title:a,content:t}),c("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",i()}catch(s){c(`创建失败: ${s.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",i),await i()}const $=g();let q=!1,b=null;async function Z(e){q=!1,b=null,e.innerHTML=`
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
  `;const i=e.querySelector("#rc-select"),r=e.querySelector("#rc-editor");let a=[];function t(){q=!0}function s(){return q?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function o(l){b=l,e.querySelector("#rc-key").value=(l==null?void 0:l.key)||"",e.querySelector("#rc-key").disabled=!!l,e.querySelector("#rc-name").value=(l==null?void 0:l.name)||"",e.querySelector("#rc-desc").value=(l==null?void 0:l.description)||"",e.querySelector("#rc-system-prompt").value=(l==null?void 0:l.system_prompt)||"",e.querySelector("#rc-tone").value=(l==null?void 0:l.tone)||"",e.querySelector("#rc-constraints").value=typeof(l==null?void 0:l.constraints)=="string"?l.constraints:JSON.stringify((l==null?void 0:l.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=l?`编辑: ${l.name||l.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=l&&l.enabled!==!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=l&&l.enabled!==!1?"inline-flex":"none",r.style.display="block",q=!1}r.querySelectorAll(".form-input").forEach(l=>l.addEventListener("input",t));async function d(){try{const l=await $.getRoleCards({limit:100});a=Array.isArray(l==null?void 0:l.items)?l.items:Array.isArray(l)?l:[],i.innerHTML='<option value="">-- 新建 --</option>'+a.map(v=>`<option value="${n(v.key)}">${n(v.name||v.key)}${v.enabled===!1?" (禁用)":""}</option>`).join("")}catch(l){c(`加载失败: ${l.message}`,"error")}}i.addEventListener("change",()=>{if(!s()){i.value=(b==null?void 0:b.key)||"";return}const l=i.value,v=a.find(u=>u.key===l);o(v||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{s()&&(i.value="",o(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const l={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},v=e.querySelector("#rc-constraints").value.trim();try{l.constraints=v?JSON.parse(v):""}catch{l.constraints=v}if(!l.key){c("Key 不能为空","warning");return}try{b!=null&&b.key?(await $.updateRoleCard(b.key,l),c("保存成功","success")):(await $.createRoleCard(l),c("创建成功","success")),q=!1,await d(),i.value=l.key}catch(u){c(`操作失败: ${u.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(b!=null&&b.key)try{await $.activateRoleCard(b.key),c("已激活","success"),await d()}catch(l){c(`激活失败: ${l.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(b!=null&&b.key)try{await $.disableRoleCard(b.key),c("已禁用","success"),await d()}catch(l){c(`禁用失败: ${l.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{d()}),await d()}const L=g();async function ee(e){e.innerHTML=`
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
  `;async function i(){try{const[r,a]=await Promise.all([L.getStyleProfile().catch(()=>null),L.getRoleProfile().catch(()=>null)]);r!=null&&r.style&&(e.querySelector("#profile-style").value=r.style,e.querySelector("#profile-style-current").textContent=`当前: ${r.style}`),a!=null&&a.role&&(e.querySelector("#profile-role").value=a.role,e.querySelector("#profile-role-current").textContent=`当前: ${a.role}`)}catch(r){c(`加载配置失败: ${r.message}`,"error")}}e.querySelector("#profile-style-apply").addEventListener("click",async()=>{const r=e.querySelector("#profile-style").value;try{await L.setStyleProfile(r),e.querySelector("#profile-style-current").textContent=`当前: ${r}`,c("风格已更新","success")}catch(a){c(`更新失败: ${a.message}`,"error")}}),e.querySelector("#profile-role-apply").addEventListener("click",async()=>{const r=e.querySelector("#profile-role").value;try{await L.setRoleProfile(r),e.querySelector("#profile-role-current").textContent=`当前: ${r}`,c("角色配置已更新","success")}catch(a){c(`更新失败: ${a.message}`,"error")}}),await i()}function te({columns:e,rows:i,empty:r="暂无数据"}){if(!i||i.length===0)return`<div class="table-empty">${n(r)}</div>`;const a=e.map(s=>`<th class="${s.class||""}">${n(s.label)}</th>`).join(""),t=i.map(s=>`<tr>${e.map(o=>`<td class="${o.class||""}">${o.render?o.render(s):n(s[o.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${a}</tr></thead>
        <tbody>${t}</tbody>
      </table>
    </div>
  `}const O=g();async function ie(e){e.innerHTML=`
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
  `;const i=e.querySelector("#gw-reply"),r=e.querySelector("#gw-char-count");i.addEventListener("input",()=>{r.textContent=`${i.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const t=e.querySelector("#gw-publish-btn"),s=e.querySelector("#gw-comment-id").value.trim(),o=e.querySelector("#gw-reply").value.trim(),d=e.querySelector("#gw-source").value.trim(),l=e.querySelector("#gw-force").checked;if(!s||!o){c("Comment ID 和回复内容不能为空","warning");return}t.disabled=!0,t.textContent="发布中...";try{await O.publishGatewayReply({comment_id:s,reply_text:o,source:d,force_publish:l}),c("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",r.textContent="0/0",a()}catch(v){c(`发布失败: ${v.message}`,"error")}finally{t.disabled=!1,t.textContent="发布"}});async function a(){const t=e.querySelector("#gw-table-wrapper"),s=e.querySelector("#gw-limit").value;t.innerHTML='<div class="page-loading">加载中...</div>';try{const o=await O.getGatewayLogs({limit:s}),d=Array.isArray(o==null?void 0:o.items)?o.items:[];if(d.length===0){t.innerHTML='<div class="table-empty">暂无网关日志</div>';return}t.innerHTML=te({columns:[{key:"id",label:"ID",class:"cell-id",render:l=>{var v;return n((v=l.id)==null?void 0:v.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:l=>{var v;return n((v=l.comment_id)==null?void 0:v.substring(0,12))}},{key:"status",label:"状态",render:l=>M(l.status)},{key:"platform",label:"平台",render:l=>n(l.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:l=>{var v;return n((v=l.reply_text)==null?void 0:v.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:l=>E(l.created_at)}],rows:d})}catch(o){t.innerHTML=`<div class="page-error">加载失败: ${n(o.message)}</div>`}}e.querySelector("#gw-refresh").addEventListener("click",a),e.querySelector("#gw-filter-btn").addEventListener("click",a),await a()}const T=g();async function se(e){e.innerHTML=`
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
  `;async function i(){try{const a=await T.getAuditSummary({days:7}),t=e.querySelector("#audit-summary-cards");t.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">总操作</div>
          <div class="stat-value">${(a==null?void 0:a.total)??0}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">成功</div>
          <div class="stat-value" style="color:var(--success-color)">${(a==null?void 0:a.ok_count)??0}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">失败</div>
          <div class="stat-value" style="color:var(--danger-color)">${(a==null?void 0:a.failed_count)??0}</div>
        </div>
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function r(){const a=e.querySelector("#audit-table-wrapper");a.innerHTML='<div class="page-loading">加载中...</div>';const t=e.querySelector("#audit-action").value.trim(),s=e.querySelector("#audit-ok").value,o=e.querySelector("#audit-limit").value;try{const d=await T.getAuditLogs({action:t,ok:s,limit:o}),l=Array.isArray(d==null?void 0:d.items)?d.items:[];if(l.length===0){a.innerHTML='<div class="table-empty">暂无审计日志</div>';return}a.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${l.map(v=>{var u;return`<tr>
              <td class="cell-id">${n((u=v.id)==null?void 0:u.toString().substring(0,8))}</td>
              <td>${n(v.action)}</td>
              <td class="cell-truncate">${n(v.target_id||"-")}</td>
              <td>${v.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${n(v.detail||"-")}</td>
              <td class="cell-time">${E(v.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(d){a.innerHTML=`<div class="page-error">加载失败: ${n(d.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{i(),r()}),e.querySelector("#audit-filter-btn").addEventListener("click",r),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await T.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),c("导出成功","success")}catch(a){c(`导出失败: ${a.message}`,"error")}}),await Promise.all([i(),r()])}const m=g();async function re(e){e.innerHTML=`
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
  `;async function i(){const t=e.querySelector("#bili-status-cards");try{const s=await m.getBilibiliStatus();t.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${s!=null&&s.enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询</div>
          <div class="stat-value">${s!=null&&s.polling_enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布</div>
          <div class="stat-value">${s!=null&&s.publish_enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">视频数</div>
          <div class="stat-value">${(s==null?void 0:s.video_count)??0}</div>
        </div>
      `}catch{t.innerHTML='<div class="page-error">状态加载失败</div>'}}async function r(){const t=e.querySelector("#bili-videos-wrapper");try{const s=await m.getBilibiliVideos({limit:50}),o=Array.isArray(s==null?void 0:s.items)?s.items:Array.isArray(s)?s:[];if(o.length===0){t.innerHTML='<div class="table-empty">暂无视频</div>';return}t.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>操作</th></tr></thead>
          <tbody>
            ${o.map(d=>`<tr data-id="${n(d.id||d.video_id)}">
              <td class="cell-id">${n(d.bvid)}</td>
              <td class="cell-truncate">${n(d.title||"-")}</td>
              <td>${A(d.poll_enabled)}</td>
              <td>${d.comment_count??"-"}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${n(d.id||d.video_id)}">${d.poll_enabled?"禁用轮询":"启用轮询"}</button>
                <button class="btn btn-sm bili-sync" data-id="${n(d.id||d.video_id)}">同步</button>
                <button class="btn btn-sm btn-danger bili-delete" data-id="${n(d.id||d.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,t.querySelectorAll(".bili-toggle-poll").forEach(d=>{d.addEventListener("click",async()=>{try{await m.toggleBilibiliVideoPoll(d.dataset.id),c("操作成功","success"),r()}catch(l){c(`失败: ${l.message}`,"error")}})}),t.querySelectorAll(".bili-sync").forEach(d=>{d.addEventListener("click",async()=>{d.disabled=!0;try{await m.syncBilibiliVideo(d.dataset.id),c("同步完成","success"),r()}catch(l){c(`同步失败: ${l.message}`,"error"),d.disabled=!1}})}),t.querySelectorAll(".bili-delete").forEach(d=>{d.addEventListener("click",async()=>{if(confirm("确定删除此视频？"))try{await m.deleteBilibiliVideo(d.dataset.id),c("已删除","success"),r()}catch(l){c(`删除失败: ${l.message}`,"error")}})})}catch(s){t.innerHTML=`<div class="page-error">加载失败: ${n(s.message)}</div>`}}async function a(){const t=e.querySelector("#bili-creds-wrapper");try{const s=await m.getBilibiliCredentials(),o=Array.isArray(s==null?void 0:s.items)?s.items:Array.isArray(s)?s:[];if(o.length===0){t.innerHTML='<div class="table-empty">暂无凭证</div>';return}t.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期</th><th>操作</th></tr></thead>
          <tbody>
            ${o.map(d=>`<tr data-id="${n(d.id||d.credential_id)}">
              <td>${n(d.name||"-")}</td>
              <td class="cell-id">${n([d.has_sessdata?"SESSDATA":"",d.has_bili_jct?"bili_jct":"",d.buvid3?`buvid3:${d.buvid3}`:""].filter(Boolean).join(" / ")||"-")}</td>
              <td>${A(d.is_active||d.active)}</td>
              <td class="cell-time">${n(d.expires_at?j(d.expires_at):"-")}</td>
              <td class="cell-actions">
                ${d.is_active||d.active?"":`<button class="btn btn-sm cred-activate" data-id="${n(d.id||d.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${n(d.id||d.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,t.querySelectorAll(".cred-activate").forEach(d=>{d.addEventListener("click",async()=>{try{await m.activateBilibiliCredential(d.dataset.id),c("已激活","success"),a()}catch(l){c(`激活失败: ${l.message}`,"error")}})}),t.querySelectorAll(".cred-delete").forEach(d=>{d.addEventListener("click",async()=>{if(confirm("确定删除此凭证？"))try{await m.deleteBilibiliCredential(d.dataset.id),c("已删除","success"),a()}catch(l){c(`删除失败: ${l.message}`,"error")}})})}catch(s){t.innerHTML=`<div class="page-error">加载失败: ${n(s.message)}</div>`}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const t=e.querySelector("#bili-video-bvid").value.trim();if(!t){c("BVID 不能为空","warning");return}try{await m.addBilibiliVideo(t),c("添加成功","success"),e.querySelector("#bili-video-bvid").value="",r()}catch(s){c(`添加失败: ${s.message}`,"error")}}),e.querySelector("#cred-add").addEventListener("click",async()=>{const t={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:e.querySelector("#cred-expires").value||void 0};if(!t.name||!t.sessdata){c("名称和 SESSDATA 不能为空","warning");return}try{await m.addBilibiliCredential(t),c("凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",a()}catch(s){c(`添加失败: ${s.message}`,"error")}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const t=e.querySelector("#bili-poll-btn");t.disabled=!0,t.textContent="轮询中...";try{await m.triggerBilibiliPoll(),c("轮询完成","success"),r()}catch(s){c(`轮询失败: ${s.message}`,"error")}finally{t.disabled=!1,t.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",()=>{i(),r(),a()}),await Promise.all([i(),r(),a()])}const R=g();async function ae(e){e.innerHTML=`
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
  `,e.querySelector("#query-comment-btn").addEventListener("click",async()=>{const i=e.querySelector("#query-comment-id").value.trim(),r=e.querySelector("#query-comment-result");if(!i){c("请输入 Comment ID","warning");return}r.innerHTML='<div class="page-loading">查询中...</div>';try{const a=await R.getComment(i);r.innerHTML=`
        <div class="detail-card">
          ${Object.entries(a||{}).map(([t,s])=>`
            <div class="detail-row">
              <span class="detail-key">${n(t)}</span>
              <span class="detail-value">${n(typeof s=="object"?JSON.stringify(s,null,2):String(s??"-"))}</span>
            </div>
          `).join("")}
        </div>
      `}catch(a){r.innerHTML=`<div class="page-error">查询失败: ${n(a.message)}</div>`}}),e.querySelector("#query-job-btn").addEventListener("click",async()=>{const i=e.querySelector("#query-job-id").value.trim(),r=e.querySelector("#query-job-result");if(!i){c("请输入 Job ID","warning");return}r.innerHTML='<div class="page-loading">查询中...</div>';try{const a=await R.getJob(i);r.innerHTML=`
        <div class="detail-card">
          ${Object.entries(a||{}).map(([s,o])=>`
            <div class="detail-row">
              <span class="detail-key">${n(s)}</span>
              <span class="detail-value">${n(typeof o=="object"?JSON.stringify(o,null,2):String(o??"-"))}</span>
            </div>
          `).join("")}
        </div>
        ${a!=null&&a.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${n(a.comment_id)}">查看关联评论 →</a></div>`:""}
      `;const t=r.querySelector("#query-goto-comment");t&&t.addEventListener("click",()=>{e.querySelector("#query-comment-id").value=t.dataset.id,e.querySelector("#query-comment-btn").click()})}catch(a){r.innerHTML=`<div class="page-error">查询失败: ${n(a.message)}</div>`}})}const C={dashboard:{render:J,title:"仪表盘"},jobs:{render:F,title:"任务管理"},"daily-metrics":{render:W,title:"每日指标"},knowledge:{render:X,title:"知识库"},"role-cards":{render:Z,title:"角色卡"},profiles:{render:ee,title:"风格配置"},gateway:{render:ie,title:"网关"},audit:{render:se,title:"审计日志"},bilibili:{render:re,title:"B站集成"},query:{render:ae,title:"查询"}};let D=null;function le(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function K(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function U(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function de(e){e.preventDefault();const i=document.getElementById("login-api-key"),r=document.getElementById("login-error"),a=i.value.trim();if(a){window.__ADMIN_API_KEY__=a;try{await p("/api/admin/overview"),sessionStorage.setItem("admin_api_key",a),U(),I("dashboard")}catch{r.textContent="API Key 无效或服务不可用",r.style.display="block",window.__ADMIN_API_KEY__=""}}}function oe(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",K()}function I(e){if(!C[e])return;D=e,document.querySelectorAll("#nav-list .nav-item").forEach(r=>{r.classList.toggle("active",r.dataset.page===e)}),document.getElementById("page-title").textContent=C[e].title;const i=document.getElementById("page-container");i.innerHTML='<div class="page-loading">加载中...</div>',C[e].render(i).catch(r=>{i.innerHTML=`<div class="page-error">加载失败: ${r.message}</div>`})}function ne(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const i=e.dataset.page;i&&i!==D&&I(i)})})}function ce(){const e=document.getElementById("left-sidebar"),i=document.getElementById("toggle-left-btn"),r=document.getElementById("expand-left-btn");i&&r&&e&&(i.addEventListener("click",()=>{e.classList.add("collapsed"),r.style.display="block"}),r.addEventListener("click",()=>{e.classList.remove("collapsed"),r.style.display="none"}))}function ue(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const i=["","dark","sepia"];let r=0;e.addEventListener("click",()=>{r=(r+1)%i.length,i[r]?document.body.setAttribute("data-theme",i[r]):document.body.removeAttribute("data-theme")})}function pe(){ce(),ue(),ne(),document.getElementById("login-form").addEventListener("submit",de),document.getElementById("logout-btn").addEventListener("click",oe),le()?(U(),I("dashboard")):K()}pe();
