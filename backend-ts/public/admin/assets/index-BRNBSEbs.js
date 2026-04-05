(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const l of s)if(l.type==="childList")for(const a of l.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&r(a)}).observe(document,{childList:!0,subtree:!0});function i(s){const l={};return s.integrity&&(l.integrity=s.integrity),s.referrerPolicy&&(l.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?l.credentials="include":s.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(s){if(s.ep)return;s.ep=!0;const l=i(s);fetch(s.href,l)}})();function Et(e,t,i){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof i=="string"&&i.trim()?i.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function ct(){return(window.__ADMIN_API_KEY__||"").trim()}async function g(e,t={}){const i=ct(),r=new Headers(t.headers||{});i&&r.set("x-api-key",i);const s=await fetch(e,{...t,headers:r}),l=await s.json().catch(()=>({}));if(!s.ok){const a=(l==null?void 0:l.detail)||(l==null?void 0:l.error);throw new Error(Et(a,s.status,s.statusText))}return l}async function lt(e,t){const i=ct(),r=new Headers;i&&r.set("x-api-key",i);const s=await fetch(e,{headers:r});if(!s.ok)throw new Error("download_failed");const l=await s.blob(),a=URL.createObjectURL(l),p=document.createElement("a");p.href=a,p.download=t,document.body.appendChild(p),p.click(),document.body.removeChild(p),URL.revokeObjectURL(a)}function M(e){const t=new URLSearchParams;for(const[r,s]of Object.entries(e))s!=null&&s!==""&&t.set(r,String(s));const i=t.toString();return i?`?${i}`:""}function A(){return{getOverview(){return g("/api/admin/overview")},getJobs({status:e,limit:t}={}){return g(`/api/admin/jobs${M({status:e,limit:t})}`)},getJob(e){return g(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return g(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return g(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return g("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return g("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return lt(`/export/jobs.csv${M({status:e,limit:t})}`,"jobs.csv")},getComment(e){return g(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,comment_id:t}={}){return g(`/api/admin/gateway/logs${M({limit:e,comment_id:t})}`)},publishGatewayReply(e){return g("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:i}={}){return g(`/api/admin/audit/summary${M({days:e,action:t,ok:i})}`)},getAuditLogs({limit:e,action:t,ok:i}={}){return g(`/api/audit-log${M({limit:e,action:t,ok:i})}`)},exportAuditCsv({limit:e,action:t,ok:i}={}){return lt(`/export/audit-logs.csv${M({limit:e,action:t,ok:i})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return g(`/api/metrics/daily${M({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return g(`/api/admin/knowledge${M({limit:e,offset:t})}`)},createKnowledgeEntry(e){return g("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return g(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getRoleCards({limit:e,offset:t}={}){return g(`/api/admin/role-cards${M({limit:e,offset:t})}`)},createRoleCard(e){return g("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return g(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return g(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return g(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return g("/api/admin/style-profile")},setStyleProfile(e){return g("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return g("/api/admin/role-profile")},setRoleProfile(e){return g("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return g("/api/admin/bilibili/status")},getBilibiliVideos({poll_enabled:e,limit:t,offset:i}={}){return g(`/api/admin/bilibili/videos${M({poll_enabled:e,limit:t,offset:i})}`)},addBilibiliVideo(e){return g("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return g(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return g(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return g(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return g("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return g("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return g("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return g(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return g(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function d(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function P(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function Xe(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const i=Date.now()-t.getTime(),r=Math.floor(i/1e3);if(r<60)return"刚刚";const s=Math.floor(r/60);if(s<60)return`${s}分钟前`;const l=Math.floor(s/60);if(l<24)return`${l}小时前`;const a=Math.floor(l/24);if(a<30)return`${a}天前`;const p=Math.floor(a/30);return p<12?`${p}个月前`:`${Math.floor(p/12)}年前`}catch{return""}}function ye(e){const t=Xe(e),i=P(e);return t?`<span title="${d(i)}">${d(t)}</span>`:`<span title="${d(i)}">${d(i)}</span>`}function H(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const Ct={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function et(e){if(!e)return"";const t=Ct[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${d(t.label)}</span>`}function tt(e,t="是",i="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${d(e?t:i)}</span>`}let Ke=null;function f(e,t="info"){const i=document.getElementById("app-toast");i&&i.remove(),Ke&&clearTimeout(Ke);const r={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},s=document.createElement("div");s.id="app-toast",s.className="toast-notification",s.style.setProperty("--toast-color",r[t]||r.info),s.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(s),requestAnimationFrame(()=>s.classList.add("show"));const l=()=>{s.classList.remove("show"),setTimeout(()=>s.remove(),300)};s.querySelector(".toast-close").onclick=l,Ke=setTimeout(l,4e3)}const Ee=A();async function ut(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,i,r,s]=await Promise.all([Ee.getOverview().catch(()=>null),Ee.getJobs({limit:5}).catch(()=>null),Ee.getGatewayLogs({limit:5}).catch(()=>null),Ee.getAuditSummary({days:7}).catch(()=>null)]),l=t||{},a=Array.isArray(i==null?void 0:i.items)?i.items:[],p=Array.isArray(r==null?void 0:r.items)?r.items:[];e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${H(l.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${H(l.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${H(l.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${H(l.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${H(l.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${H(p.length)}</div>
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
                ${a.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':a.map(o=>{var b,u;return`<tr>
                    <td class="cell-id">${d((b=o.id)==null?void 0:b.substring(0,8))}</td>
                    <td>${et(o.status)}</td>
                    <td class="cell-truncate">${d((u=o.comment_text)==null?void 0:u.substring(0,60))}</td>
                    <td class="cell-time">${d(P(o.created_at))}</td>
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
              <div class="stat-value">${H(s==null?void 0:s.total)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">成功</div>
              <div class="stat-value" style="color:var(--success-color)">${H(s==null?void 0:s.ok_count)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">失败</div>
              <div class="stat-value" style="color:var(--danger-color)">${H(s==null?void 0:s.failed_count)}</div>
            </div>
          </div>
        </div>
      </div>
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{f("正在刷新...","info"),ut(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${d(t.message)}</div>`}}const ce=A();async function qt(e){let t=new Set;e.innerHTML=`
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
  `;const i=e.querySelector("#jobs-status"),r=e.querySelector("#jobs-limit");async function s(){var p;t.clear(),l();const a=e.querySelector("#jobs-table-wrapper");a.innerHTML='<div class="page-loading">加载中...</div>';try{const o=await ce.getJobs({status:i.value,limit:r.value}),b=Array.isArray(o==null?void 0:o.items)?o.items:[];if(b.length===0){a.innerHTML='<div class="table-empty">暂无任务</div>';return}a.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${b.map(u=>{var y,m,w,h;return`
              <tr data-id="${d(u.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${d(u.id)}" /></td>
                <td class="cell-id" title="${d(u.id)}">${d((y=u.id)==null?void 0:y.substring(0,8))}</td>
                <td>${et(u.status)}</td>
                <td class="cell-truncate" title="${d(u.comment_text)}">${d((m=u.comment_text)==null?void 0:m.substring(0,80))}</td>
                <td class="cell-truncate">${d((w=u.reply_text)==null?void 0:w.substring(0,60))}</td>
                <td>${(h=u.risk_flags)!=null&&h.length?u.risk_flags.map(v=>`<span class="risk-flag">${d(v)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${ye(u.created_at)}</td>
                <td class="cell-actions">
                  ${u.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${d(u.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${d(u.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(p=a.querySelector("#jobs-select-all"))==null||p.addEventListener("change",u=>{const y=u.target.checked;a.querySelectorAll(".job-checkbox").forEach(m=>{m.checked=y,y?t.add(m.dataset.id):t.delete(m.dataset.id)}),l()}),a.querySelectorAll(".job-checkbox").forEach(u=>{u.addEventListener("change",()=>{u.checked?t.add(u.dataset.id):t.delete(u.dataset.id),l()})}),a.querySelectorAll(".job-approve").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="审批中...";try{await ce.approveJob(u.dataset.id),f("审批成功","success"),s()}catch(y){f(`审批失败: ${y.message}`,"error"),u.disabled=!1,u.textContent="审批"}})}),a.querySelectorAll(".job-retry").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="重试中...";try{await ce.retryJob(u.dataset.id),f("重试已提交","success"),s()}catch(y){f(`重试失败: ${y.message}`,"error"),u.disabled=!1,u.textContent="重试"}})})}catch(o){a.innerHTML=`<div class="page-error">加载失败: ${d(o.message)}</div>`}}function l(){const a=e.querySelector("#jobs-batch-bar"),p=e.querySelector("#jobs-selected-count");t.size>0?(a.style.display="flex",p.textContent=`已选 ${t.size} 项`):a.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",s),e.querySelector("#jobs-refresh").addEventListener("click",s),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await ce.exportJobsCsv({status:i.value,limit:r.value}),f("导出成功","success")}catch(a){f(`导出失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await ce.batchApprove([...t]),f(`批量审批 ${t.size} 项成功`,"success"),s()}catch(a){f(`批量审批失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await ce.batchRetry([...t]),f(`批量重试 ${t.size} 项成功`,"success"),s()}catch(a){f(`批量重试失败: ${a.message}`,"error")}}),await s()}const Bt=A();async function kt(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#metrics-days").value,r=e.querySelector("#metrics-table-wrapper");r.innerHTML='<div class="page-loading">加载中...</div>';try{const s=await Bt.getDailyMetrics({days:i}),l=Array.isArray(s==null?void 0:s.items)?s.items:Array.isArray(s)?s:[];if(l.length===0){r.innerHTML='<div class="table-empty">暂无指标数据</div>';return}r.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${l.map(a=>`<tr>
              <td class="cell-time">${d(a.date||a.day)}</td>
              <td>${d(a.comments??a.comment_count??0)}</td>
              <td>${d(a.jobs??a.job_count??0)}</td>
              <td style="color:var(--success-color)">${d(a.published??a.published_count??0)}</td>
              <td style="color:var(--danger-color)">${d(a.failed??a.failed_count??0)}</td>
              <td>${d(a.skipped??a.skipped_count??0)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      `}catch(s){r.innerHTML=`<div class="page-error">加载失败: ${d(s.message)}</div>`}}e.querySelector("#metrics-load").addEventListener("click",t),await t()}const ze=A();async function Tt(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#knowledge-table-wrapper");i.innerHTML='<div class="page-loading">加载中...</div>';try{const r=await ze.getKnowledgeEntries({limit:50}),s=Array.isArray(r==null?void 0:r.items)?r.items:[];if(s.length===0){i.innerHTML='<div class="table-empty">暂无知识条目</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${s.map(l=>{var a,p;return`<tr>
              <td class="cell-id">${d((a=l.id)==null?void 0:a.toString().substring(0,8))}</td>
              <td>${d(l.category)}</td>
              <td>${d(l.title)}</td>
              <td class="cell-truncate">${d((p=l.content)==null?void 0:p.substring(0,80))}</td>
              <td>${tt(l.enabled!==!1)}</td>
              <td class="cell-time">${ye(l.created_at)}</td>
              <td class="cell-actions">
                ${l.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${d(l.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".knowledge-disable").forEach(l=>{l.addEventListener("click",async()=>{try{await ze.disableKnowledgeEntry(l.dataset.id),f("已禁用","success"),t()}catch(a){f(`操作失败: ${a.message}`,"error")}})})}catch(r){i.innerHTML=`<div class="page-error">加载失败: ${d(r.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const i=e.querySelector("#knowledge-category").value.trim(),r=e.querySelector("#knowledge-title").value.trim(),s=e.querySelector("#knowledge-content").value.trim();if(!r||!s){f("标题和内容不能为空","warning");return}try{await ze.createKnowledgeEntry({category:i,title:r,content:s}),f("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(l){f(`创建失败: ${l.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const he=A();let ge=!1,S=null;async function Lt(e){ge=!1,S=null,e.innerHTML=`
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
  `;const t=e.querySelector("#rc-select"),i=e.querySelector("#rc-editor");let r=[];function s(){ge=!0}function l(){return ge?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function a(o){S=o,e.querySelector("#rc-key").value=(o==null?void 0:o.key)||"",e.querySelector("#rc-key").disabled=!!o,e.querySelector("#rc-name").value=(o==null?void 0:o.name)||"",e.querySelector("#rc-desc").value=(o==null?void 0:o.description)||"",e.querySelector("#rc-system-prompt").value=(o==null?void 0:o.system_prompt)||"",e.querySelector("#rc-tone").value=(o==null?void 0:o.tone)||"",e.querySelector("#rc-constraints").value=typeof(o==null?void 0:o.constraints)=="string"?o.constraints:JSON.stringify((o==null?void 0:o.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=o?`编辑: ${o.name||o.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=o&&o.enabled!==!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=o&&o.enabled!==!1?"inline-flex":"none",i.style.display="block",ge=!1}i.querySelectorAll(".form-input").forEach(o=>o.addEventListener("input",s));async function p(){try{const o=await he.getRoleCards({limit:100});r=Array.isArray(o==null?void 0:o.items)?o.items:Array.isArray(o)?o:[],t.innerHTML='<option value="">-- 新建 --</option>'+r.map(b=>`<option value="${d(b.key)}">${d(b.name||b.key)}${b.enabled===!1?" (禁用)":""}</option>`).join("")}catch(o){f(`加载失败: ${o.message}`,"error")}}t.addEventListener("change",()=>{if(!l()){t.value=(S==null?void 0:S.key)||"";return}const o=t.value,b=r.find(u=>u.key===o);a(b||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{l()&&(t.value="",a(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const o={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},b=e.querySelector("#rc-constraints").value.trim();try{o.constraints=b?JSON.parse(b):""}catch{o.constraints=b}if(!o.key){f("Key 不能为空","warning");return}try{S!=null&&S.key?(await he.updateRoleCard(S.key,o),f("保存成功","success")):(await he.createRoleCard(o),f("创建成功","success")),ge=!1,await p(),t.value=o.key}catch(u){f(`操作失败: ${u.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(S!=null&&S.key)try{await he.activateRoleCard(S.key),f("已激活","success"),await p()}catch(o){f(`激活失败: ${o.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(S!=null&&S.key)try{await he.disableRoleCard(S.key),f("已禁用","success"),await p()}catch(o){f(`禁用失败: ${o.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{p()}),await p()}const Ce=A();async function Mt(e){e.innerHTML=`
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
  `;async function t(){try{const[i,r]=await Promise.all([Ce.getStyleProfile().catch(()=>null),Ce.getRoleProfile().catch(()=>null)]);i!=null&&i.style&&(e.querySelector("#profile-style").value=i.style,e.querySelector("#profile-style-current").textContent=`当前: ${i.style}`),r!=null&&r.role&&(e.querySelector("#profile-role").value=r.role,e.querySelector("#profile-role-current").textContent=`当前: ${r.role}`)}catch(i){f(`加载配置失败: ${i.message}`,"error")}}e.querySelector("#profile-style-apply").addEventListener("click",async()=>{const i=e.querySelector("#profile-style").value;try{await Ce.setStyleProfile(i),e.querySelector("#profile-style-current").textContent=`当前: ${i}`,f("风格已更新","success")}catch(r){f(`更新失败: ${r.message}`,"error")}}),e.querySelector("#profile-role-apply").addEventListener("click",async()=>{const i=e.querySelector("#profile-role").value;try{await Ce.setRoleProfile(i),e.querySelector("#profile-role-current").textContent=`当前: ${i}`,f("角色配置已更新","success")}catch(r){f(`更新失败: ${r.message}`,"error")}}),await t()}function Pt({columns:e,rows:t,empty:i="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${d(i)}</div>`;const r=e.map(l=>`<th class="${l.class||""}">${d(l.label)}</th>`).join(""),s=t.map(l=>`<tr>${e.map(a=>`<td class="${a.class||""}">${a.render?a.render(l):d(l[a.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${r}</tr></thead>
        <tbody>${s}</tbody>
      </table>
    </div>
  `}const rt=A();async function At(e){e.innerHTML=`
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
  `;const t=e.querySelector("#gw-reply"),i=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{i.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const s=e.querySelector("#gw-publish-btn"),l=e.querySelector("#gw-comment-id").value.trim(),a=e.querySelector("#gw-reply").value.trim(),p=e.querySelector("#gw-source").value.trim(),o=e.querySelector("#gw-force").checked;if(!l||!a){f("Comment ID 和回复内容不能为空","warning");return}s.disabled=!0,s.textContent="发布中...";try{await rt.publishGatewayReply({comment_id:l,reply_text:a,source:p,force_publish:o}),f("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",i.textContent="0/0",r()}catch(b){f(`发布失败: ${b.message}`,"error")}finally{s.disabled=!1,s.textContent="发布"}});async function r(){const s=e.querySelector("#gw-table-wrapper"),l=e.querySelector("#gw-limit").value;s.innerHTML='<div class="page-loading">加载中...</div>';try{const a=await rt.getGatewayLogs({limit:l}),p=Array.isArray(a==null?void 0:a.items)?a.items:[];if(p.length===0){s.innerHTML='<div class="table-empty">暂无网关日志</div>';return}s.innerHTML=Pt({columns:[{key:"id",label:"ID",class:"cell-id",render:o=>{var b;return d((b=o.id)==null?void 0:b.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:o=>{var b;return d((b=o.comment_id)==null?void 0:b.substring(0,12))}},{key:"status",label:"状态",render:o=>et(o.status)},{key:"platform",label:"平台",render:o=>d(o.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:o=>{var b;return d((b=o.reply_text)==null?void 0:b.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:o=>ye(o.created_at)}],rows:p})}catch(a){s.innerHTML=`<div class="page-error">加载失败: ${d(a.message)}</div>`}}e.querySelector("#gw-refresh").addEventListener("click",r),e.querySelector("#gw-filter-btn").addEventListener("click",r),await r()}const Ge=A();async function Nt(e){e.innerHTML=`
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
  `;async function t(){try{const r=await Ge.getAuditSummary({days:7}),s=e.querySelector("#audit-summary-cards");s.innerHTML=`
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
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function i(){const r=e.querySelector("#audit-table-wrapper");r.innerHTML='<div class="page-loading">加载中...</div>';const s=e.querySelector("#audit-action").value.trim(),l=e.querySelector("#audit-ok").value,a=e.querySelector("#audit-limit").value;try{const p=await Ge.getAuditLogs({action:s,ok:l,limit:a}),o=Array.isArray(p==null?void 0:p.items)?p.items:[];if(o.length===0){r.innerHTML='<div class="table-empty">暂无审计日志</div>';return}r.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${o.map(b=>{var u;return`<tr>
              <td class="cell-id">${d((u=b.id)==null?void 0:u.toString().substring(0,8))}</td>
              <td>${d(b.action)}</td>
              <td class="cell-truncate">${d(b.target_id||"-")}</td>
              <td>${b.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${d(b.detail||"-")}</td>
              <td class="cell-time">${ye(b.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(p){r.innerHTML=`<div class="page-error">加载失败: ${d(p.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),i()}),e.querySelector("#audit-filter-btn").addEventListener("click",i),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await Ge.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),f("导出成功","success")}catch(r){f(`导出失败: ${r.message}`,"error")}}),await Promise.all([t(),i()])}const L=A(),It=/^BV[a-zA-Z0-9]{10}$/,jt={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},Ht={"auth:no active credential":"缺少可用的激活凭证。","dependency:diagnostics_unavailable":"诊断信息暂时不可用。"},Dt={manual_queue:"人工队列",simulated:"模拟发布",webhook:"Webhook",real_publish:"真实发布",native_bilibili:"原生 B 站发布"},Rt={ok:{label:"成功",cls:"badge-success"},no_new:{label:"无新增",cls:"badge-muted"},error:{label:"失败",cls:"badge-danger"}},be={no_aid:"缺少视频 aid，暂时无法轮询。",retry_exhausted:"评论抓取重试耗尽。"},ue=50,Ot=7*24*60*60*1e3;function q(e){const t=e instanceof Error?e.message:String(e??"request_failed");return jt[t]||t}function Vt(e){return e?It.test(e)?null:"invalid_bvid_format":"bvid_required"}function Ut(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function Wt(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function Jt(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(i=>Ht[i]||i).join("；")}function Ft(e){const t=String(e??"").trim().toLowerCase();return Dt[t]||t||"-"}function Ye(e,t,i){return e?t:i}function Kt(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":t%60===0?`${t/60} 分钟`:`${t} 秒`}function zt(e){const t=Number(e);if(!Number.isFinite(t)||t<=0)return"未设置轮询间隔";if(t<60){const s=60/t;return`约每分钟 ${s.toFixed(s>=10?0:1).replace(/\.0$/,"")} 轮`}if(t<3600){const s=3600/t;return`约每小时 ${s.toFixed(s>=10?0:1).replace(/\.0$/,"")} 轮`}const i=t/3600;return`约每 ${i.toFixed(i>=10?0:1).replace(/\.0$/,"")} 小时 1 轮`}function Gt(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":`${t} 次/分钟`}function Yt(e){const t=Number(e);if(!Number.isFinite(t)||t<=0)return"未设置速率限制";const i=t/60;if(i>=1)return`约每秒 ${i.toFixed(i>=10?0:1).replace(/\.0$/,"")} 次`;const r=60/t;return`约每 ${r.toFixed(r>=10?0:1).replace(/\.0$/,"")} 秒 1 次`}function st(e,t,i="覆盖率"){const r=Number(t??0);if(!Number.isFinite(r)||r<=0)return`暂无视频，无法计算${i}`;const s=Number(e??0),a=((Number.isFinite(s)?Math.min(r,Math.max(0,s)):0)/r*100).toFixed(1).replace(/\.0$/,"");return`${i} ${a}%`}function Zt(e,t){const i=Number(e??0);if(!Number.isFinite(i)||i<=0)return"暂无视频，等待添加监控对象";const r=Number(t??0),s=Number.isFinite(r)?Math.min(i,Math.max(0,r)):0,l=Math.max(0,i-s);return`轮询中 ${s}，停用 ${l}`}function Qt(e,t,i){const r=String(e??"").trim().toLowerCase();if(!r)return"-";const s=Rt[r]||{label:r,cls:"badge-muted"},l=r==="error"&&t?be[String(t).trim().toLowerCase()]||String(t):"",a=l?` title="${d(l)}"`:"",p=typeof i=="number"&&Number.isFinite(i)?`评论游标: ${i}`:"",b=[r==="ok"?p?"轮询完成，评论游标已推进":"轮询完成":r==="no_new"?p?"本次未发现新评论，评论游标已保留":"本次未发现新评论":"",l,p].filter(Boolean).map(u=>`<div class="form-hint" style="margin-top:4px;">${d(u)}</div>`).join("");return`<span class="status-badge ${s.cls}"${a}>${d(s.label)}</span>${b}`}function Xt(e){if(String((e==null?void 0:e.last_poll_status)??"").trim().toLowerCase())return Qt(e==null?void 0:e.last_poll_status,e==null?void 0:e.last_poll_error,e==null?void 0:e.last_rpid);const i=e!=null&&e.poll_enabled?"等待首次轮询":"轮询未启用";if(!(e!=null&&e.last_polled_at))return`<span class="status-badge badge-muted">未轮询</span><div class="form-hint" style="margin-top:4px;">${d(i)}</div>`;const r=typeof(e==null?void 0:e.last_rpid)=="number"&&Number.isFinite(e.last_rpid)?"已轮询但未记录结果，评论游标已保留":"已轮询但未记录结果";return`<span class="status-badge badge-muted">无状态</span><div class="form-hint" style="margin-top:4px;">${d(r)}</div>`}function ei(e){if(e==="true")return!0;if(e==="false")return!1}function ti(e){return e==="true"?"暂无轮询中视频":e==="false"?"暂无已停用视频":"暂无视频"}function T(e){return typeof(e==null?void 0:e.aid)=="number"&&Number.isFinite(e.aid)}function ii(e){return e.filter(t=>!T(t)).length}function li(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)).length}function ri(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)&&!T(t)).length}function si(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&T(t)).length}function ni(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&!T(t)).length}function ai(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&!(t!=null&&t.last_polled_at)).length}function oi(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&(t==null?void 0:t.last_polled_at)).length}function di(e){return e.filter(t=>(t==null?void 0:t.poll_enabled)&&!(t!=null&&t.last_polled_at)).length}function ci(e){return e.filter(t=>(t==null?void 0:t.poll_enabled)&&(t==null?void 0:t.last_polled_at)).length}function ui(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="error").length}function pi(e){return e.filter(t=>{const i=String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase();return i==="ok"||i==="no_new"}).length}function bi(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="ok").length}function fi(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="no_new").length}function vi(e){return e.filter(t=>!(t!=null&&t.last_polled_at)).length}function hi(e){return e.filter(t=>T(t)&&!(t!=null&&t.last_polled_at)).length}function gi(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function yi(e){return e.filter(t=>typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function mi(e){return e.filter(t=>String((t==null?void 0:t.title)??"").trim().length>0).length}function $i(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0).length}function xi(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&Number((t==null?void 0:t.comment_count)??0)<=0).length}function _i(e){return e.filter(t=>typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function wi(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function Si(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)<=0&&typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function Ei(e){return e.filter(t=>T(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function Ci(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(T(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid))).length}function qi(e){return e.reduce((t,i)=>{const r=Number((i==null?void 0:i.comment_count)??0);return t+(Number.isFinite(r)&&r>0?r:0)},0)}function Bi(e){const t=T(e),i=String((e==null?void 0:e.bvid)??"").trim(),r=String((e==null?void 0:e.id)??(e==null?void 0:e.video_id)??"").trim(),s=[t?`aid: ${e.aid}`:be.no_aid];return i||s.push(r?`记录 ID: ${r}`:"未同步 BVID"),`${d(i||"未同步 BVID")}${s.filter(Boolean).map(l=>`<div class="form-hint" style="margin-top:4px;">${d(l)}</div>`).join("")}`}function pe(e,t){if(!t)return"";const i=Xe(t),r=P(t);return i?`${e}: ${i}（${r}）`:`${e}: ${r}`}function ki(e){const t=[];return T(e)||t.push("aid"),String((e==null?void 0:e.title)??"").trim()||t.push("标题"),typeof(e==null?void 0:e.owner_mid)=="number"&&Number.isFinite(e.owner_mid)||t.push("UP主 MID"),t}function Ti(e){const t=[],i=String((e==null?void 0:e.title)??"").trim(),r=ki(e);return r.length>0&&t.push(`缺少 ${r.join(" / ")}`),typeof(e==null?void 0:e.owner_mid)=="number"&&Number.isFinite(e.owner_mid)&&t.push(`UP主 MID: ${e.owner_mid}`),e!=null&&e.updated_at&&t.push(pe("更新",e.updated_at)),e!=null&&e.created_at&&t.push(pe("创建",e.created_at)),`${d(i||"未同步标题")}${t.map(s=>`<div class="form-hint" style="margin-top:4px;">${d(s)}</div>`).join("")}`}function Li(e){const t=T(e),i=t?"":" disabled",r=t?"":` title="${d(be.no_aid)}"`;return`<button class="btn btn-sm bili-sync" data-id="${d(e.id||e.video_id)}" data-has-aid="${t?"true":"false"}"${i}${r}>同步</button>`}function Mi(e){const t=T(e);let i=be.no_aid;return t&&(i=e!=null&&e.poll_enabled?"自动轮询中":"轮询停用，可手动同步"),`${tt(e==null?void 0:e.poll_enabled)}<div class="form-hint" style="margin-top:4px;">${d(i)}</div>`}function Pi(e){const t=Number((e==null?void 0:e.comment_count)??0),i=Number.isFinite(t)&&t>0?t:0,r=typeof(e==null?void 0:e.last_rpid)=="number"&&Number.isFinite(e.last_rpid);let s="尚未轮询";return i>0?s=r?"已有评论，游标已记录":"已有评论，缺少游标":e!=null&&e.last_polled_at&&(s=r?"已轮询无评论，保留游标":"已轮询无评论"),`${d(i)}<div class="form-hint" style="margin-top:4px;">${d(s)}</div>`}function Ai(e){if(e!=null&&e.last_polled_at){const i=typeof(e==null?void 0:e.last_rpid)=="number"&&Number.isFinite(e.last_rpid)?`评论游标: ${e.last_rpid}`:"未记录评论游标";return`${ye(e.last_polled_at)}<div class="form-hint" style="margin-top:4px;">${d(i)}</div>`}const t=T(e)?"可立即同步":be.no_aid;return`从未轮询<div class="form-hint" style="margin-top:4px;">${d(t)}</div>`}function Ni(e,t,i,r=0,s=ue,l=[]){const a=i==="true"?"轮询中":i==="false"?"已停用":"全部",p=Math.floor(r/s)+1,o=Math.max(1,Math.ceil(e/s)),b=li(l),u=Math.max(0,l.length-b),y=ri(l),m=si(l),w=ni(l),h=ai(l),v=oi(l),C=di(l),E=ci(l),D=ii(l),R=Math.max(0,l.length-D),W=ui(l),O=pi(l),V=bi(l),c=fi(l),B=vi(l),N=hi(l),$=Math.max(0,l.length-B),J=yi(l),Q=Math.max(0,l.length-J),F=mi(l),K=Math.max(0,l.length-F),k=$i(l),I=Math.max(0,l.length-k),j=xi(l),z=_i(l),X=wi(l),ee=Si(l),te=Math.max(0,l.length-z),ie=gi(l),G=Ei(l),le=Math.max(0,l.length-G),re=Ci(l),se=qi(l),ne=D>0?`，当前页缺少 aid ${D} 条`:"",fe=i===""&&b>0?`，当前页轮询开启 ${b} 条`:"",ae=i===""&&u>0?`，当前页轮询停用 ${u} 条`:"",Y=i===""&&y>0?`，轮询开启但缺少 aid ${y} 条`:"",oe=i===""&&m>0?`，轮询停用但可同步 ${m} 条`:"",Z=i===""&&w>0?`，轮询停用且缺少 aid ${w} 条`:"",qe=i===""&&h>0?`，轮询停用且从未轮询 ${h} 条`:"",Be=i===""&&v>0?`，轮询停用且已有轮询记录 ${v} 条`:"",ke=i===""&&C>0?`，轮询开启但尚未轮询 ${C} 条`:"",de=i===""&&E>0?`，轮询开启且已有轮询记录 ${E} 条`:"",ve=R>0?`，可同步 ${R} 条`:"",Te=O>0?`，正常轮询 ${O} 条`:"",Le=V>0?`，成功轮询 ${V} 条`:"",Me=c>0?`，无新增 ${c} 条`:"",Pe=W>0?`，轮询失败 ${W} 条`:"",me=$>0?`，已有轮询记录 ${$} 条`:"",Ae=B>0?`，尚未轮询 ${B} 条`:"",$e=N>0?`，可同步但尚未轮询 ${N} 条`:"",Ne=J>0?`，已识别 UP 主 ${J} 条`:"",xe=Q>0?`，缺少 UP 主 ${Q} 条`:"",Ie=F>0?`，已抓取标题 ${F} 条`:"",je=K>0?`，缺少标题 ${K} 条`:"",He=G>0?`，信息完整 ${G} 条`:"",De=le>0?`，信息不完整 ${le} 条`:"",Re=re>0?`，已轮询但信息不完整 ${re} 条`:"",_e=k>0?`，已有评论视频 ${k} 条`:"",Oe=I>0?`，无评论视频 ${I} 条`:"",we=j>0?`，已轮询但无评论 ${j} 条`:"",Ve=z>0?`，已有评论游标 ${z} 条`:"",Se=X>0?`，有评论但无游标 ${X} 条`:"",Ue=ee>0?`，无评论但有游标 ${ee} 条`:"",We=te>0?`，无评论游标 ${te} 条`:"",Je=ie>0?`，已轮询但无游标 ${ie} 条`:"",Fe=se>0?`，关联评论 ${se} 条`:"";return`筛选: ${a}，共 ${e} 条，当前展示 ${t} 条，第 ${p}/${o} 页${fe}${ae}${ne}${Y}${oe}${Z}${qe}${Be}${ke}${de}${ve}${Te}${Le}${Me}${Pe}${me}${Ae}${$e}${Ne}${xe}${Ie}${je}${He}${De}${Re}${_e}${Oe}${we}${Ve}${Se}${Ue}${We}${Je}${Fe}`}function nt(e,t={}){const i=Number((e==null?void 0:e.videos)??0),r=Number((e==null?void 0:e.comments)??0),s=Number((e==null?void 0:e.events_injected)??r),l=t.subject||(i===1?"视频":"轮询");return r>0||s>0?`${l}完成，处理 ${i} 个视频，新增 ${r} 条评论，注入 ${s} 个事件。`:i>0?`${l}完成，处理 ${i} 个视频，暂无新增评论。`:`${l}完成，暂无可处理视频。`}function Ze(e,t=Date.now()){const i=new Date(e);if(Number.isNaN(i.getTime()))return"";const r=i.getTime()-t,s=Math.abs(r),l=60*1e3,a=60*l,p=24*a;let o,b;return s<a?(o=Math.max(1,Math.round(s/l)),b="分钟"):s<p?(o=Math.max(1,Math.round(s/a)),b="小时"):(o=Math.max(1,Math.round(s/p)),b="天"),r<=0?`${o}${b}前`:`${o}${b}后`}function x(e,t=Date.now()){if(!e)return{hasExpiry:!1,expired:!1,expiringSoon:!1,label:"未设置",cls:"badge-muted",detail:""};const i=new Date(e);if(Number.isNaN(i.getTime()))return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"时间异常",cls:"badge-danger",detail:String(e)};const r=i.getTime()-t;if(r<=0){const l=Ze(e,t);return{hasExpiry:!0,expired:!0,expiringSoon:!1,label:"已过期",cls:"badge-danger",detail:l?`${l}过期，${P(e)}`:P(e)}}if(r<=Ot){const l=Ze(e,t);return{hasExpiry:!0,expired:!1,expiringSoon:!0,label:"即将过期",cls:"badge-warning",detail:l?`${l}到期，${P(e)}`:P(e)}}const s=Ze(e,t);return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"有效",cls:"badge-success",detail:s?`${s}到期，${P(e)}`:P(e)}}function pt(e,t=!0){if(!t)return"当前无活跃凭证";const i=e.hasExpiry?e.label==="时间异常"?"请检查过期时间格式":e.expired?"建议尽快更新":e.expiringSoon?"建议提前轮换":"当前仍可使用":"需手动确认有效性";return[e.detail||(e.hasExpiry?"":"未设置过期时间"),i].filter(Boolean).join("，")}function Ii(e){const t=x(e),i=pt(t),r=i?`<div class="form-hint" style="margin-top:4px;">${d(i)}</div>`:"";return`<span class="status-badge ${t.cls}">${d(t.label)}</span>${r}`}function at(e,t="未命名凭证"){const i=[],r=String((e==null?void 0:e.name)??"").trim();return!r&&e&&i.push("未填写凭证名称"),e!=null&&e.updated_at&&i.push(pe("更新",e.updated_at)),e!=null&&e.created_at&&i.push(pe("创建",e.created_at)),`${d(r||t)}${i.map(s=>`<div class="form-hint" style="margin-top:4px;">${d(s)}</div>`).join("")}`}function ji(e){return(e==null?void 0:e.cls)==="badge-danger"?"var(--danger-color)":(e==null?void 0:e.cls)==="badge-warning"?"var(--warning-color)":(e==null?void 0:e.cls)==="badge-success"?"var(--success-color)":"var(--grey-2)"}function bt(e){if(!e)return{label:"未配置",detail:"请先添加并激活凭证"};if(e!=null&&e.last_used_at){const r=Xe(e.last_used_at),s=!!(e!=null&&e.is_active||e!=null&&e.active);return{label:r||"已使用",detail:`${P(e.last_used_at)}，${s?"当前生效":"当前未激活"}`}}const t=[],i=!!(e!=null&&e.is_active||e!=null&&e.active);return t.push(i?"当前生效，等待首次使用":"待激活后使用"),e!=null&&e.updated_at&&t.push(pe("更新",e.updated_at)),e!=null&&e.created_at&&t.push(pe("创建",e.created_at)),{label:"从未使用",detail:t.join("，")}}function Hi(e){const t=bt(e),i=t.detail?`<div class="form-hint" style="margin-top:4px;">${d(t.detail)}</div>`:"";return`${d(t.label)}${i}`}function Di(e){const t=!!(e!=null&&e.is_active||e!=null&&e.active),i=_(e),r=i?"":`，缺少 ${ft(e).join(" / ")}`,s=t?`当前生效${i?"，字段完整":r}`:`待手动激活${i?"，字段完整":r}`;return`${tt(t)}<div class="form-hint" style="margin-top:4px;">${d(s)}</div>`}function _(e){return!!(e!=null&&e.has_sessdata&&(e!=null&&e.has_bili_jct)&&(e!=null&&e.buvid3))}function ft(e){const t=[];return e!=null&&e.has_sessdata||t.push("SESSDATA"),e!=null&&e.has_bili_jct||t.push("bili_jct"),e!=null&&e.buvid3||t.push("buvid3"),t}function Ri(e,t){return e?t?"活跃凭证字段完整":"活跃凭证缺少关键字段":"当前无活跃凭证"}function Oi(e){var o,b,u,y,m,w;const t=!!((b=(o=e==null?void 0:e.checks)==null?void 0:o.auth)!=null&&b.ready),i=!!((y=(u=e==null?void 0:e.checks)==null?void 0:u.worker_or_publish)!=null&&y.ready),r=!!((m=e==null?void 0:e.signals)!=null&&m.polling_worker_enabled),s=!!((w=e==null?void 0:e.signals)!=null&&w.native_publish_enabled),l=Array.isArray(e==null?void 0:e.blocking_reasons)?e.blocking_reasons.filter(Boolean):[],a=l.length>0?`，阻塞 ${l.length} 项`:"";return r||s?t&&i?`鉴权已就绪，执行链路可用${a}`:t?`鉴权已就绪，但执行链路阻塞${a}`:i?`执行链路可用，但鉴权未就绪${a}`:`鉴权未就绪，执行链路阻塞${a}`:l.length>0?`当前无需鉴权，但诊断仍受阻${a}`:"轮询与发布链路均未启用，可按需开启"}function Vi(e){var s,l,a;const t=!!((s=e==null?void 0:e.signals)!=null&&s.publish_mode_config_ready),i=!!((l=e==null?void 0:e.signals)!=null&&l.native_publish_enabled),r=!!((a=e==null?void 0:e.signals)!=null&&a.polling_worker_enabled);return[t?"模式配置就绪":"模式配置缺失，请检查发布配置",i?"原生发布启用":"原生发布停用",r?"轮询链路启用":"轮询链路停用"].join("，")}function Ui(e,t=4){const i=String(e??"").trim();return i?i.endsWith("...")||i.length<=t?i:`...${i.slice(-t)}`:""}function Wi(e){const t=[e!=null&&e.has_sessdata?"SESSDATA":"",e!=null&&e.has_bili_jct?"bili_jct":"",e!=null&&e.buvid3?`buvid3:${Ui(e.buvid3)}`:""].filter(Boolean).join(" / ")||"未配置指纹",i=[_(e)?"字段完整":`缺少 ${ft(e).join(" / ")}`,e!=null&&e.buvid3?"仅展示指纹摘要":""].filter(Boolean).join("，");return`${d(t)}${i?`<div class="form-hint" style="margin-top:4px;">${d(i)}</div>`:""}`}function vt(e="",t=""){return`激活: ${e==="active"?"仅激活":e==="inactive"?"仅未激活":"全部"}，过期: ${t==="expired"?"已过期":t==="expiring"?"即将过期":t==="valid"?"有效":t==="unset"?"未设置过期时间":"全部"}`}function Ji(e,t="",i="",r=e.length){const s=e.length,l=ht(e,t,i),a=e.filter(n=>n.is_active||n.active),p=e.filter(n=>!(n.is_active||n.active)),o=a.length,b=p.length,u=e.filter(n=>_(n)).length,y=e.filter(n=>(n.is_active||n.active)&&_(n)).length,m=Math.max(0,u-y),w=Math.max(0,o-y),h=Math.max(0,b-m),v=a.filter(n=>n.last_used_at).length,C=Math.max(0,o-v),E=p.filter(n=>n.last_used_at).length,D=Math.max(0,b-E),R=e.filter(n=>_(n)&&n.last_used_at).length,W=Math.max(0,u-R),O=Math.max(0,s-u),V=e.filter(n=>!_(n)&&n.last_used_at).length,c=Math.max(0,O-V),B=e.filter(n=>!n.last_used_at).length,N=Math.max(0,s-B),$=Date.now(),J=e.filter(n=>_(n)&&x(n.expires_at,$).hasExpiry&&!x(n.expires_at,$).expired).length,Q=e.filter(n=>_(n)&&x(n.expires_at,$).expired).length,F=e.filter(n=>_(n)&&x(n.expires_at,$).expiringSoon).length,K=e.filter(n=>_(n)&&!x(n.expires_at,$).hasExpiry).length,k=e.map(n=>x(n.expires_at,$)),I=a.map(n=>x(n.expires_at,$)),j=p.map(n=>x(n.expires_at,$)),z=k.filter(n=>n.hasExpiry).length,X=k.filter(n=>n.hasExpiry&&!n.expired).length,ee=k.filter(n=>n.expired).length,te=k.filter(n=>n.expiringSoon).length,ie=I.filter(n=>n.hasExpiry&&!n.expired).length,G=I.filter(n=>n.expired).length,le=I.filter(n=>n.expiringSoon).length,re=I.filter(n=>!n.hasExpiry).length,se=j.filter(n=>n.hasExpiry&&!n.expired).length,ne=j.filter(n=>n.expired).length,fe=j.filter(n=>n.expiringSoon).length,ae=j.filter(n=>!n.hasExpiry).length,Y=e.filter(n=>!_(n)&&x(n.expires_at,$).hasExpiry&&!x(n.expires_at,$).expired).length,oe=e.filter(n=>!_(n)&&x(n.expires_at,$).expired).length,Z=e.filter(n=>!_(n)&&x(n.expires_at,$).expiringSoon).length,qe=e.filter(n=>!_(n)&&!x(n.expires_at,$).hasExpiry).length,Be=k.filter(n=>!n.hasExpiry).length,ke=vt(t,i),de=l.filter(n=>_(n)).length,ve=Math.max(0,l.length-de),Te=l.filter(n=>{if(!_(n))return!1;const U=x(n.expires_at,$);return U.hasExpiry&&!U.expired}).length,Le=l.filter(n=>_(n)?x(n.expires_at,$).expired:!1).length,Me=l.filter(n=>_(n)?x(n.expires_at,$).expiringSoon:!1).length,Pe=l.filter(n=>_(n)?!x(n.expires_at,$).hasExpiry:!1).length,me=l.filter(n=>_(n)&&(n.is_active||n.active)).length,Ae=Math.max(0,de-me),$e=l.filter(n=>_(n)&&n.last_used_at).length,Ne=Math.max(0,de-$e),xe=l.filter(n=>!_(n)&&n.last_used_at).length,Ie=Math.max(0,ve-xe),je=l.filter(n=>{if(_(n))return!1;const U=x(n.expires_at,$);return U.hasExpiry&&!U.expired}).length,He=l.filter(n=>_(n)?!1:x(n.expires_at,$).expired).length,De=l.filter(n=>_(n)?!1:x(n.expires_at,$).expiringSoon).length,Re=l.filter(n=>_(n)?!1:!x(n.expires_at,$).hasExpiry).length,_e=l.filter(n=>!_(n)&&(n.is_active||n.active)).length,Oe=Math.max(0,ve-_e),we=l.filter(n=>n.is_active||n.active).length,Ve=Math.max(0,l.length-we),Se=l.filter(n=>n.last_used_at).length,Ue=Math.max(0,l.length-Se),We=l.filter(n=>{const U=x(n.expires_at,$);return U.hasExpiry&&!U.expired}).length,Je=l.filter(n=>x(n.expires_at,$).expired).length,Fe=l.filter(n=>x(n.expires_at,$).expiringSoon).length,$t=l.filter(n=>!x(n.expires_at,$).hasExpiry).length,xt=t?"":`，激活 ${we} 个，未激活 ${Ve} 个`,_t=t?"":`，完整且激活 ${me} 个，完整但未激活 ${Ae} 个`,wt=t?"":`，缺字段且激活 ${_e} 个，缺字段且未激活 ${Oe} 个`,St=t||i?`，筛选结果完整 ${de} 个${_t}，完整且有效 ${Te} 个，完整且已过期 ${Le} 个，完整且即将过期 ${Me} 个，完整且未设置过期 ${Pe} 个，完整且已使用 ${$e} 个，完整但未使用 ${Ne} 个，缺字段 ${ve} 个${wt}，缺字段但已使用 ${xe} 个，缺字段且从未使用 ${Ie} 个，缺字段但有效 ${je} 个，缺字段且已过期 ${He} 个，缺字段且即将过期 ${De} 个，缺字段且未设置过期 ${Re} 个${xt}，已使用 ${Se} 个，从未使用 ${Ue} 个，有效 ${We} 个，已过期 ${Je} 个，即将过期 ${Fe} 个，未设置过期 ${$t} 个`:"";return`共 ${s} 个凭证，激活中 ${o} 个，未激活 ${b} 个，激活且完整 ${y} 个，未激活但完整 ${m} 个，激活但缺字段 ${w} 个，未激活且缺字段 ${h} 个，激活且已使用 ${v} 个，激活但从未使用 ${C} 个，未激活且已使用 ${E} 个，未激活但从未使用 ${D} 个，激活且有效 ${ie} 个，未激活且有效 ${se} 个，激活已过期 ${G} 个，未激活已过期 ${ne} 个，激活即将过期 ${le} 个，未激活即将过期 ${fe} 个，激活未设置过期 ${re} 个，未激活未设置过期 ${ae} 个，字段完整 ${u} 个，完整且有效 ${J} 个，完整且已过期 ${Q} 个，完整即将过期 ${F} 个，完整未设置过期 ${K} 个，完整且已使用 ${R} 个，完整但未使用 ${W} 个，字段缺失 ${O} 个，缺字段但已使用 ${V} 个，缺字段且未使用 ${c} 个，缺字段但有效 ${Y} 个，缺字段且已过期 ${oe} 个，缺字段即将过期 ${Z} 个，缺字段未设置过期 ${qe} 个，已使用 ${N} 个，从未使用 ${B} 个，设置过期时间 ${z} 个，有效 ${X} 个，已过期 ${ee} 个，即将过期 ${te} 个，未设置 ${Be} 个；筛选: ${ke}，当前展示 ${r} 个${St}`}function ht(e,t="",i=""){const r=Date.now();return e.filter(s=>{const l=s.is_active||s.active;if(t==="active"&&!l||t==="inactive"&&l)return!1;const a=x(s.expires_at,r);return!(i==="expired"&&!a.expired||i==="expiring"&&!a.expiringSoon||i==="valid"&&(!a.hasExpiry||a.expired)||i==="unset"&&a.hasExpiry)})}function Fi(e="",t=""){return e||t?`暂无匹配筛选条件的凭证（${vt(e,t)}）`:"暂无凭证"}function ot(e,t,i){const r=e.querySelector(i);t.forEach(s=>{const l=e.querySelector(s);l==null||l.addEventListener("keydown",a=>{a.key==="Enter"&&(a.preventDefault(),r.disabled||r.click())})})}async function Ki(e){let t=0;e.innerHTML=`
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
      <div class="filter-bar" style="padding: 0 16px 16px;">
        <div class="form-group">
          <label class="form-label">激活状态</label>
          <select id="bili-cred-active-filter" class="form-input">
            <option value="">全部</option>
            <option value="active">仅激活</option>
            <option value="inactive">仅未激活</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">过期状态</label>
          <select id="bili-cred-expiry-filter" class="form-input">
            <option value="">全部</option>
            <option value="expired">已过期</option>
            <option value="expiring">即将过期</option>
            <option value="valid">有效</option>
            <option value="unset">未设置</option>
          </select>
        </div>
      </div>
      <div class="form-hint" id="bili-cred-summary" style="padding: 0 16px 16px;">加载中...</div>
      <div class="table-wrapper" id="bili-creds-wrapper">
        <div class="page-loading">加载中...</div>
      </div>
    </div>
  `;async function i(){var a,p,o,b,u,y,m,w,h,v,C,E,D,R,W,O,V;const l=e.querySelector("#bili-status-cards");l.innerHTML='<div class="page-loading">加载中...</div>';try{const c=await L.getBilibiliStatus(),B=Number((c==null?void 0:c.video_count)??0),N=Number(((a=c==null?void 0:c.videos)==null?void 0:a.poll_enabled_count)??0),$=Math.max(0,B-N),J=Zt(B,N),Q=st(N,B),F=st($,B,"占比"),K=!!((p=c==null?void 0:c.diagnostics)!=null&&p.ready),k=Jt((o=c==null?void 0:c.diagnostics)==null?void 0:o.blocking_reasons),I=at(c==null?void 0:c.credential,"未配置"),j=!!(((u=(b=c==null?void 0:c.diagnostics)==null?void 0:b.signals)==null?void 0:u.credential_present)??((m=(y=c==null?void 0:c.diagnostics)==null?void 0:y.release_gates)==null?void 0:m.credential_present)),z=!!(((h=(w=c==null?void 0:c.diagnostics)==null?void 0:w.signals)==null?void 0:h.credential_complete)??((C=(v=c==null?void 0:c.diagnostics)==null?void 0:v.release_gates)==null?void 0:C.credential_complete)),X=Ri(j,z),ee=Oi(c==null?void 0:c.diagnostics),te=Ft((E=c==null?void 0:c.diagnostics)==null?void 0:E.effective_publish_mode),ie=Vi(c==null?void 0:c.diagnostics),G=Ye(c==null?void 0:c.enabled,"B 站集成已启用，可管理凭证与视频","B 站集成已停用，当前不会触发轮询或发布"),le=Ye(c==null?void 0:c.polling_enabled,"评论轮询已启用，会按配置自动抓取评论","评论轮询已停用，仅支持手动同步"),re=Ye(c==null?void 0:c.publish_enabled,"发布链路已启用，满足条件后可进入发布流程","发布链路已停用，不会进入自动发布流程"),se=Kt((D=c==null?void 0:c.config)==null?void 0:D.poll_interval_seconds),ne=zt((R=c==null?void 0:c.config)==null?void 0:R.poll_interval_seconds),fe=Gt((W=c==null?void 0:c.config)==null?void 0:W.rate_limit_per_minute),ae=Yt((O=c==null?void 0:c.config)==null?void 0:O.rate_limit_per_minute),Y=x((V=c==null?void 0:c.credential)==null?void 0:V.expires_at),oe=pt(Y,!!(c!=null&&c.credential)),Z=bt(c==null?void 0:c.credential);l.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${c!=null&&c.enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${d(G)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询</div>
          <div class="stat-value">${c!=null&&c.polling_enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${d(le)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布</div>
          <div class="stat-value">${c!=null&&c.publish_enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${d(re)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">视频数</div>
          <div class="stat-value">${B}</div>
          <div class="form-hint" style="margin-top:6px;">${d(J)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${N}</div>
          <div class="form-hint" style="margin-top:6px;">${d(Q)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">停用视频</div>
          <div class="stat-value">${$}</div>
          <div class="form-hint" style="margin-top:6px;">${d(F)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${I}</div>
          <div class="form-hint" style="margin-top:6px;">${d(X)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${K?"var(--success-color)":"var(--danger-color)"}">${K?"就绪":"阻塞"}</div>
          <div class="form-hint" style="margin-top:6px;">${d(ee)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布模式</div>
          <div class="stat-value">${d(te)}</div>
          <div class="form-hint" style="margin-top:6px;">${d(ie)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询间隔</div>
          <div class="stat-value">${d(se)}</div>
          ${ne?`<div class="form-hint" style="margin-top:6px;">${d(ne)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">速率限制</div>
          <div class="stat-value">${d(fe)}</div>
          ${ae?`<div class="form-hint" style="margin-top:6px;">${d(ae)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">凭证过期</div>
          <div class="stat-value" style="font-size:14px; color:${ji(Y)}">${d(Y.label)}</div>
          ${oe?`<div class="form-hint" style="margin-top:6px;">${d(oe)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">最近使用</div>
          <div class="stat-value" style="font-size:14px;">${d(Z.label)}</div>
          ${Z.detail?`<div class="form-hint" style="margin-top:6px;">${d(Z.detail)}</div>`:""}
        </div>
        ${k?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">阻塞原因: ${d(k)}</div>`:""}
      `}catch(c){l.innerHTML=`<div class="page-error">状态加载失败: ${d(q(c))}</div>`}}async function r(){const l=e.querySelector("#bili-videos-wrapper"),a=e.querySelector("#bili-video-summary"),p=e.querySelector("#bili-video-filter-btn"),o=e.querySelector("#bili-video-poll-filter"),b=e.querySelector("#bili-video-prev"),u=e.querySelector("#bili-video-next"),y=o.value;a.textContent="加载中...",l.innerHTML='<div class="page-loading">加载中...</div>',o.disabled=!0,p.disabled=!0,b.disabled=!0,u.disabled=!0;try{const m=await L.getBilibiliVideos({limit:ue,offset:t,poll_enabled:ei(y)}),w=Array.isArray(m==null?void 0:m.items)?m.items:Array.isArray(m)?m:[],h=Number((m==null?void 0:m.total)??w.length);if(w.length===0&&h>0&&t>0){t=Math.max(0,t-ue),await r();return}if(a.textContent=Ni(h,w.length,y,t,ue,w),b.disabled=t<=0,u.disabled=t+w.length>=h,w.length===0){l.innerHTML=`<div class="table-empty">${d(ti(y))}</div>`;return}l.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${w.map(v=>`<tr data-id="${d(v.id||v.video_id)}">
              <td class="cell-id">${Bi(v)}</td>
              <td class="cell-truncate">${Ti(v)}</td>
              <td>${Mi(v)}</td>
              <td>${Pi(v)}</td>
              <td class="cell-time">${Ai(v)}</td>
              <td>${Xt(v)}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${d(v.id||v.video_id)}">${v.poll_enabled?"禁用轮询":"启用轮询"}</button>
                ${Li(v)}
                <button class="btn btn-sm btn-danger bili-delete" data-id="${d(v.id||v.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,l.querySelectorAll(".bili-toggle-poll").forEach(v=>{v.addEventListener("click",async()=>{v.disabled=!0;try{await L.toggleBilibiliVideoPoll(v.dataset.id),f("操作成功","success"),await Promise.all([i(),r()])}catch(C){f(`失败: ${q(C)}`,"error")}finally{v.disabled=!1}})}),l.querySelectorAll(".bili-sync").forEach(v=>{v.addEventListener("click",async()=>{if(v.dataset.hasAid==="false"){f(be.no_aid,"warning");return}const C=v.textContent;v.disabled=!0,v.textContent="同步中...";try{const E=await L.syncBilibiliVideo(v.dataset.id);f(nt(E==null?void 0:E.result,{subject:"同步"}),"success"),await Promise.all([i(),r()])}catch(E){f(`同步失败: ${q(E)}`,"error")}finally{v.disabled=!1,v.textContent=C}})}),l.querySelectorAll(".bili-delete").forEach(v=>{v.addEventListener("click",async()=>{if(confirm("确定删除此视频？")){v.disabled=!0;try{await L.deleteBilibiliVideo(v.dataset.id),f("已删除","success"),await Promise.all([i(),r()])}catch(C){f(`删除失败: ${q(C)}`,"error")}finally{v.disabled=!1}}})})}catch(m){a.textContent="视频加载失败",l.innerHTML=`<div class="page-error">加载失败: ${d(q(m))}</div>`}finally{o.disabled=!1,p.disabled=!1}}async function s(){const l=e.querySelector("#bili-creds-wrapper"),a=e.querySelector("#bili-cred-summary"),p=e.querySelector("#bili-cred-active-filter"),o=e.querySelector("#bili-cred-expiry-filter"),b=p.value,u=o.value;a.textContent="加载中...",l.innerHTML='<div class="page-loading">加载中...</div>',p.disabled=!0,o.disabled=!0;try{const y=await L.getBilibiliCredentials(),m=Array.isArray(y==null?void 0:y.items)?y.items:Array.isArray(y)?y:[],w=ht(m,b,u);if(a.textContent=Ji(m,b,u,w.length),w.length===0){l.innerHTML=`<div class="table-empty">${d(Fi(b,u))}</div>`;return}l.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期状态</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${w.map(h=>`<tr data-id="${d(h.id||h.credential_id)}">
              <td>${at(h)}</td>
              <td class="cell-id">${Wi(h)}</td>
              <td>${Di(h)}</td>
              <td>${Ii(h.expires_at)}</td>
              <td class="cell-time">${Hi(h)}</td>
              <td class="cell-actions">
                ${h.is_active||h.active?"":`<button class="btn btn-sm cred-activate" data-id="${d(h.id||h.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${d(h.id||h.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,l.querySelectorAll(".cred-activate").forEach(h=>{h.addEventListener("click",async()=>{h.disabled=!0;try{await L.activateBilibiliCredential(h.dataset.id),f("已激活","success"),await Promise.all([i(),s()])}catch(v){f(`激活失败: ${q(v)}`,"error")}finally{h.disabled=!1}})}),l.querySelectorAll(".cred-delete").forEach(h=>{h.addEventListener("click",async()=>{if(confirm("确定删除此凭证？")){h.disabled=!0;try{await L.deleteBilibiliCredential(h.dataset.id),f("已删除","success"),await Promise.all([i(),s()])}catch(v){f(`删除失败: ${q(v)}`,"error")}finally{h.disabled=!1}}})})}catch(y){a.textContent="凭证加载失败",l.innerHTML=`<div class="page-error">加载失败: ${d(q(y))}</div>`}finally{p.disabled=!1,o.disabled=!1}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const l=e.querySelector("#bili-video-add"),a=e.querySelector("#bili-video-bvid").value.trim(),p=Vt(a);if(p){f(q(p),"warning");return}l.disabled=!0,l.textContent="添加中...";try{await L.addBilibiliVideo(a),f("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([i(),r()])}catch(o){f(`添加失败: ${q(o)}`,"error")}finally{l.disabled=!1,l.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{var b;const l=e.querySelector("#cred-add"),a=Wt(e.querySelector("#cred-expires").value),p={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:a},o=Ut(p);if(o){f(q(o),"warning");return}l.disabled=!0,l.textContent="添加中...";try{const u=await L.addBilibiliCredential(p);f((b=u==null?void 0:u.item)!=null&&b.is_active?"凭证添加成功，已自动激活":"凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([i(),s()])}catch(u){f(`添加失败: ${q(u)}`,"error")}finally{l.disabled=!1,l.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const l=e.querySelector("#bili-poll-btn");l.disabled=!0,l.textContent="轮询中...";try{const a=await L.triggerBilibiliPoll();f(nt(a==null?void 0:a.result),"success"),await Promise.all([i(),r()])}catch(a){f(`轮询失败: ${q(a)}`,"error")}finally{l.disabled=!1,l.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",async()=>{const l=e.querySelector("#bili-refresh");l.disabled=!0,l.textContent="刷新中...";try{await Promise.all([i(),r(),s()])}finally{l.disabled=!1,l.innerHTML='<svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新'}}),e.querySelector("#bili-video-filter-btn").addEventListener("click",()=>{t=0,r()}),e.querySelector("#bili-video-poll-filter").addEventListener("change",()=>{t=0,r()}),e.querySelector("#bili-video-prev").addEventListener("click",()=>{t<=0||(t=Math.max(0,t-ue),r())}),e.querySelector("#bili-video-next").addEventListener("click",()=>{t+=ue,r()}),e.querySelector("#bili-cred-active-filter").addEventListener("change",s),e.querySelector("#bili-cred-expiry-filter").addEventListener("change",s),ot(e,["#bili-video-bvid"],"#bili-video-add"),ot(e,["#cred-name","#cred-sessdata","#cred-bili-jct","#cred-buvid3","#cred-buvid4","#cred-expires"],"#cred-add"),await Promise.all([i(),r(),s()])}const dt=A();async function zi(e){e.innerHTML=`
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
  `,e.querySelector("#query-comment-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-comment-id").value.trim(),i=e.querySelector("#query-comment-result");if(!t){f("请输入 Comment ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>';try{const r=await dt.getComment(t);i.innerHTML=`
        <div class="detail-card">
          ${Object.entries(r||{}).map(([s,l])=>`
            <div class="detail-row">
              <span class="detail-key">${d(s)}</span>
              <span class="detail-value">${d(typeof l=="object"?JSON.stringify(l,null,2):String(l??"-"))}</span>
            </div>
          `).join("")}
        </div>
      `}catch(r){i.innerHTML=`<div class="page-error">查询失败: ${d(r.message)}</div>`}}),e.querySelector("#query-job-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-job-id").value.trim(),i=e.querySelector("#query-job-result");if(!t){f("请输入 Job ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>';try{const r=await dt.getJob(t);i.innerHTML=`
        <div class="detail-card">
          ${Object.entries(r||{}).map(([l,a])=>`
            <div class="detail-row">
              <span class="detail-key">${d(l)}</span>
              <span class="detail-value">${d(typeof a=="object"?JSON.stringify(a,null,2):String(a??"-"))}</span>
            </div>
          `).join("")}
        </div>
        ${r!=null&&r.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${d(r.comment_id)}">查看关联评论 →</a></div>`:""}
      `;const s=i.querySelector("#query-goto-comment");s&&s.addEventListener("click",()=>{e.querySelector("#query-comment-id").value=s.dataset.id,e.querySelector("#query-comment-btn").click()})}catch(r){i.innerHTML=`<div class="page-error">查询失败: ${d(r.message)}</div>`}})}const Qe={dashboard:{render:ut,title:"仪表盘"},jobs:{render:qt,title:"任务管理"},"daily-metrics":{render:kt,title:"每日指标"},knowledge:{render:Tt,title:"知识库"},"role-cards":{render:Lt,title:"角色卡"},profiles:{render:Mt,title:"风格配置"},gateway:{render:At,title:"网关"},audit:{render:Nt,title:"审计日志"},bilibili:{render:Ki,title:"B站集成"},query:{render:zi,title:"查询"}};let gt=null;function Gi(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function yt(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function mt(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function Yi(e){e.preventDefault();const t=document.getElementById("login-api-key"),i=document.getElementById("login-error"),r=t.value.trim();if(r){window.__ADMIN_API_KEY__=r;try{await g("/api/admin/overview"),sessionStorage.setItem("admin_api_key",r),mt(),it("dashboard")}catch{i.textContent="API Key 无效或服务不可用",i.style.display="block",window.__ADMIN_API_KEY__=""}}}function Zi(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",yt()}function it(e){if(!Qe[e])return;gt=e,document.querySelectorAll("#nav-list .nav-item").forEach(i=>{i.classList.toggle("active",i.dataset.page===e)}),document.getElementById("page-title").textContent=Qe[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',Qe[e].render(t).catch(i=>{t.innerHTML=`<div class="page-error">加载失败: ${i.message}</div>`})}function Qi(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==gt&&it(t)})})}function Xi(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),i=document.getElementById("expand-left-btn");t&&i&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),i.style.display="block"}),i.addEventListener("click",()=>{e.classList.remove("collapsed"),i.style.display="none"}))}function el(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let i=0;e.addEventListener("click",()=>{i=(i+1)%t.length,t[i]?document.body.setAttribute("data-theme",t[i]):document.body.removeAttribute("data-theme")})}function tl(){Xi(),el(),Qi(),document.getElementById("login-form").addEventListener("submit",Yi),document.getElementById("logout-btn").addEventListener("click",Zi),Gi()?(mt(),it("dashboard")):yt()}tl();
