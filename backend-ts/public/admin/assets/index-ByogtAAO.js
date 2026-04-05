(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const n of i.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&r(n)}).observe(document,{childList:!0,subtree:!0});function l(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function r(s){if(s.ep)return;s.ep=!0;const i=l(s);fetch(s.href,i)}})();function gt(e,t,l){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof l=="string"&&l.trim()?l.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function rt(){return(window.__ADMIN_API_KEY__||"").trim()}async function h(e,t={}){const l=rt(),r=new Headers(t.headers||{});l&&r.set("x-api-key",l);const s=await fetch(e,{...t,headers:r}),i=await s.json().catch(()=>({}));if(!s.ok){const n=(i==null?void 0:i.detail)||(i==null?void 0:i.error);throw new Error(gt(n,s.status,s.statusText))}return i}async function Ze(e,t){const l=rt(),r=new Headers;l&&r.set("x-api-key",l);const s=await fetch(e,{headers:r});if(!s.ok)throw new Error("download_failed");const i=await s.blob(),n=URL.createObjectURL(i),p=document.createElement("a");p.href=n,p.download=t,document.body.appendChild(p),p.click(),document.body.removeChild(p),URL.revokeObjectURL(n)}function A(e){const t=new URLSearchParams;for(const[r,s]of Object.entries(e))s!=null&&s!==""&&t.set(r,String(s));const l=t.toString();return l?`?${l}`:""}function N(){return{getOverview(){return h("/api/admin/overview")},getJobs({status:e,limit:t}={}){return h(`/api/admin/jobs${A({status:e,limit:t})}`)},getJob(e){return h(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return h(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return h(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return h("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return h("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return Ze(`/export/jobs.csv${A({status:e,limit:t})}`,"jobs.csv")},getComment(e){return h(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,comment_id:t}={}){return h(`/api/admin/gateway/logs${A({limit:e,comment_id:t})}`)},publishGatewayReply(e){return h("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:l}={}){return h(`/api/admin/audit/summary${A({days:e,action:t,ok:l})}`)},getAuditLogs({limit:e,action:t,ok:l}={}){return h(`/api/audit-log${A({limit:e,action:t,ok:l})}`)},exportAuditCsv({limit:e,action:t,ok:l}={}){return Ze(`/export/audit-logs.csv${A({limit:e,action:t,ok:l})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return h(`/api/metrics/daily${A({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return h(`/api/admin/knowledge${A({limit:e,offset:t})}`)},createKnowledgeEntry(e){return h("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return h(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getRoleCards({limit:e,offset:t}={}){return h(`/api/admin/role-cards${A({limit:e,offset:t})}`)},createRoleCard(e){return h("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return h(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return h(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return h(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return h("/api/admin/style-profile")},setStyleProfile(e){return h("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return h("/api/admin/role-profile")},setRoleProfile(e){return h("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return h("/api/admin/bilibili/status")},getBilibiliVideos({poll_enabled:e,limit:t,offset:l}={}){return h(`/api/admin/bilibili/videos${A({poll_enabled:e,limit:t,offset:l})}`)},addBilibiliVideo(e){return h("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return h(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return h(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return h(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return h("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return h("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return h("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return h(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return h(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function d(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function k(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function mt(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const l=Date.now()-t.getTime(),r=Math.floor(l/1e3);if(r<60)return"刚刚";const s=Math.floor(r/60);if(s<60)return`${s}分钟前`;const i=Math.floor(s/60);if(i<24)return`${i}小时前`;const n=Math.floor(i/24);if(n<30)return`${n}天前`;const p=Math.floor(n/30);return p<12?`${p}个月前`:`${Math.floor(p/12)}年前`}catch{return""}}function se(e){const t=mt(e),l=k(e);return t?`<span title="${d(l)}">${d(t)}</span>`:`<span title="${d(l)}">${d(l)}</span>`}function H(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const $t={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function Ge(e){if(!e)return"";const t=$t[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${d(t.label)}</span>`}function Fe(e,t="是",l="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${d(e?t:l)}</span>`}let We=null;function v(e,t="info"){const l=document.getElementById("app-toast");l&&l.remove(),We&&clearTimeout(We);const r={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},s=document.createElement("div");s.id="app-toast",s.className="toast-notification",s.style.setProperty("--toast-color",r[t]||r.info),s.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(s),requestAnimationFrame(()=>s.classList.add("show"));const i=()=>{s.classList.remove("show"),setTimeout(()=>s.remove(),300)};s.querySelector(".toast-close").onclick=i,We=setTimeout(i,4e3)}const ye=N();async function st(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,l,r,s]=await Promise.all([ye.getOverview().catch(()=>null),ye.getJobs({limit:5}).catch(()=>null),ye.getGatewayLogs({limit:5}).catch(()=>null),ye.getAuditSummary({days:7}).catch(()=>null)]),i=t||{},n=Array.isArray(l==null?void 0:l.items)?l.items:[],p=Array.isArray(r==null?void 0:r.items)?r.items:[];e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${H(i.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${H(i.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${H(i.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${H(i.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${H(i.total_failed)}</div>
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
                ${n.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':n.map(o=>{var b,c;return`<tr>
                    <td class="cell-id">${d((b=o.id)==null?void 0:b.substring(0,8))}</td>
                    <td>${Ge(o.status)}</td>
                    <td class="cell-truncate">${d((c=o.comment_text)==null?void 0:c.substring(0,60))}</td>
                    <td class="cell-time">${d(k(o.created_at))}</td>
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
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{v("正在刷新...","info"),st(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${d(t.message)}</div>`}}const le=N();async function xt(e){let t=new Set;e.innerHTML=`
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
  `;const l=e.querySelector("#jobs-status"),r=e.querySelector("#jobs-limit");async function s(){var p;t.clear(),i();const n=e.querySelector("#jobs-table-wrapper");n.innerHTML='<div class="page-loading">加载中...</div>';try{const o=await le.getJobs({status:l.value,limit:r.value}),b=Array.isArray(o==null?void 0:o.items)?o.items:[];if(b.length===0){n.innerHTML='<div class="table-empty">暂无任务</div>';return}n.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${b.map(c=>{var g,$,w,y;return`
              <tr data-id="${d(c.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${d(c.id)}" /></td>
                <td class="cell-id" title="${d(c.id)}">${d((g=c.id)==null?void 0:g.substring(0,8))}</td>
                <td>${Ge(c.status)}</td>
                <td class="cell-truncate" title="${d(c.comment_text)}">${d(($=c.comment_text)==null?void 0:$.substring(0,80))}</td>
                <td class="cell-truncate">${d((w=c.reply_text)==null?void 0:w.substring(0,60))}</td>
                <td>${(y=c.risk_flags)!=null&&y.length?c.risk_flags.map(f=>`<span class="risk-flag">${d(f)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${se(c.created_at)}</td>
                <td class="cell-actions">
                  ${c.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${d(c.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${d(c.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(p=n.querySelector("#jobs-select-all"))==null||p.addEventListener("change",c=>{const g=c.target.checked;n.querySelectorAll(".job-checkbox").forEach($=>{$.checked=g,g?t.add($.dataset.id):t.delete($.dataset.id)}),i()}),n.querySelectorAll(".job-checkbox").forEach(c=>{c.addEventListener("change",()=>{c.checked?t.add(c.dataset.id):t.delete(c.dataset.id),i()})}),n.querySelectorAll(".job-approve").forEach(c=>{c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="审批中...";try{await le.approveJob(c.dataset.id),v("审批成功","success"),s()}catch(g){v(`审批失败: ${g.message}`,"error"),c.disabled=!1,c.textContent="审批"}})}),n.querySelectorAll(".job-retry").forEach(c=>{c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="重试中...";try{await le.retryJob(c.dataset.id),v("重试已提交","success"),s()}catch(g){v(`重试失败: ${g.message}`,"error"),c.disabled=!1,c.textContent="重试"}})})}catch(o){n.innerHTML=`<div class="page-error">加载失败: ${d(o.message)}</div>`}}function i(){const n=e.querySelector("#jobs-batch-bar"),p=e.querySelector("#jobs-selected-count");t.size>0?(n.style.display="flex",p.textContent=`已选 ${t.size} 项`):n.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",s),e.querySelector("#jobs-refresh").addEventListener("click",s),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await le.exportJobsCsv({status:l.value,limit:r.value}),v("导出成功","success")}catch(n){v(`导出失败: ${n.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await le.batchApprove([...t]),v(`批量审批 ${t.size} 项成功`,"success"),s()}catch(n){v(`批量审批失败: ${n.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await le.batchRetry([...t]),v(`批量重试 ${t.size} 项成功`,"success"),s()}catch(n){v(`批量重试失败: ${n.message}`,"error")}}),await s()}const _t=N();async function wt(e){e.innerHTML=`
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
  `;async function t(){const l=e.querySelector("#metrics-days").value,r=e.querySelector("#metrics-table-wrapper");r.innerHTML='<div class="page-loading">加载中...</div>';try{const s=await _t.getDailyMetrics({days:l}),i=Array.isArray(s==null?void 0:s.items)?s.items:Array.isArray(s)?s:[];if(i.length===0){r.innerHTML='<div class="table-empty">暂无指标数据</div>';return}r.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${i.map(n=>`<tr>
              <td class="cell-time">${d(n.date||n.day)}</td>
              <td>${d(n.comments??n.comment_count??0)}</td>
              <td>${d(n.jobs??n.job_count??0)}</td>
              <td style="color:var(--success-color)">${d(n.published??n.published_count??0)}</td>
              <td style="color:var(--danger-color)">${d(n.failed??n.failed_count??0)}</td>
              <td>${d(n.skipped??n.skipped_count??0)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      `}catch(s){r.innerHTML=`<div class="page-error">加载失败: ${d(s.message)}</div>`}}e.querySelector("#metrics-load").addEventListener("click",t),await t()}const Je=N();async function St(e){e.innerHTML=`
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
  `;async function t(){const l=e.querySelector("#knowledge-table-wrapper");l.innerHTML='<div class="page-loading">加载中...</div>';try{const r=await Je.getKnowledgeEntries({limit:50}),s=Array.isArray(r==null?void 0:r.items)?r.items:[];if(s.length===0){l.innerHTML='<div class="table-empty">暂无知识条目</div>';return}l.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${s.map(i=>{var n,p;return`<tr>
              <td class="cell-id">${d((n=i.id)==null?void 0:n.toString().substring(0,8))}</td>
              <td>${d(i.category)}</td>
              <td>${d(i.title)}</td>
              <td class="cell-truncate">${d((p=i.content)==null?void 0:p.substring(0,80))}</td>
              <td>${Fe(i.enabled!==!1)}</td>
              <td class="cell-time">${se(i.created_at)}</td>
              <td class="cell-actions">
                ${i.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${d(i.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,l.querySelectorAll(".knowledge-disable").forEach(i=>{i.addEventListener("click",async()=>{try{await Je.disableKnowledgeEntry(i.dataset.id),v("已禁用","success"),t()}catch(n){v(`操作失败: ${n.message}`,"error")}})})}catch(r){l.innerHTML=`<div class="page-error">加载失败: ${d(r.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const l=e.querySelector("#knowledge-category").value.trim(),r=e.querySelector("#knowledge-title").value.trim(),s=e.querySelector("#knowledge-content").value.trim();if(!r||!s){v("标题和内容不能为空","warning");return}try{await Je.createKnowledgeEntry({category:l,title:r,content:s}),v("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(i){v(`创建失败: ${i.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const ne=N();let oe=!1,S=null;async function Et(e){oe=!1,S=null,e.innerHTML=`
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
  `;const t=e.querySelector("#rc-select"),l=e.querySelector("#rc-editor");let r=[];function s(){oe=!0}function i(){return oe?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function n(o){S=o,e.querySelector("#rc-key").value=(o==null?void 0:o.key)||"",e.querySelector("#rc-key").disabled=!!o,e.querySelector("#rc-name").value=(o==null?void 0:o.name)||"",e.querySelector("#rc-desc").value=(o==null?void 0:o.description)||"",e.querySelector("#rc-system-prompt").value=(o==null?void 0:o.system_prompt)||"",e.querySelector("#rc-tone").value=(o==null?void 0:o.tone)||"",e.querySelector("#rc-constraints").value=typeof(o==null?void 0:o.constraints)=="string"?o.constraints:JSON.stringify((o==null?void 0:o.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=o?`编辑: ${o.name||o.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=o&&o.enabled!==!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=o&&o.enabled!==!1?"inline-flex":"none",l.style.display="block",oe=!1}l.querySelectorAll(".form-input").forEach(o=>o.addEventListener("input",s));async function p(){try{const o=await ne.getRoleCards({limit:100});r=Array.isArray(o==null?void 0:o.items)?o.items:Array.isArray(o)?o:[],t.innerHTML='<option value="">-- 新建 --</option>'+r.map(b=>`<option value="${d(b.key)}">${d(b.name||b.key)}${b.enabled===!1?" (禁用)":""}</option>`).join("")}catch(o){v(`加载失败: ${o.message}`,"error")}}t.addEventListener("change",()=>{if(!i()){t.value=(S==null?void 0:S.key)||"";return}const o=t.value,b=r.find(c=>c.key===o);n(b||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{i()&&(t.value="",n(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const o={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},b=e.querySelector("#rc-constraints").value.trim();try{o.constraints=b?JSON.parse(b):""}catch{o.constraints=b}if(!o.key){v("Key 不能为空","warning");return}try{S!=null&&S.key?(await ne.updateRoleCard(S.key,o),v("保存成功","success")):(await ne.createRoleCard(o),v("创建成功","success")),oe=!1,await p(),t.value=o.key}catch(c){v(`操作失败: ${c.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(S!=null&&S.key)try{await ne.activateRoleCard(S.key),v("已激活","success"),await p()}catch(o){v(`激活失败: ${o.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(S!=null&&S.key)try{await ne.disableRoleCard(S.key),v("已禁用","success"),await p()}catch(o){v(`禁用失败: ${o.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{p()}),await p()}const he=N();async function Ct(e){e.innerHTML=`
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
  `;async function t(){try{const[l,r]=await Promise.all([he.getStyleProfile().catch(()=>null),he.getRoleProfile().catch(()=>null)]);l!=null&&l.style&&(e.querySelector("#profile-style").value=l.style,e.querySelector("#profile-style-current").textContent=`当前: ${l.style}`),r!=null&&r.role&&(e.querySelector("#profile-role").value=r.role,e.querySelector("#profile-role-current").textContent=`当前: ${r.role}`)}catch(l){v(`加载配置失败: ${l.message}`,"error")}}e.querySelector("#profile-style-apply").addEventListener("click",async()=>{const l=e.querySelector("#profile-style").value;try{await he.setStyleProfile(l),e.querySelector("#profile-style-current").textContent=`当前: ${l}`,v("风格已更新","success")}catch(r){v(`更新失败: ${r.message}`,"error")}}),e.querySelector("#profile-role-apply").addEventListener("click",async()=>{const l=e.querySelector("#profile-role").value;try{await he.setRoleProfile(l),e.querySelector("#profile-role-current").textContent=`当前: ${l}`,v("角色配置已更新","success")}catch(r){v(`更新失败: ${r.message}`,"error")}}),await t()}function qt({columns:e,rows:t,empty:l="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${d(l)}</div>`;const r=e.map(i=>`<th class="${i.class||""}">${d(i.label)}</th>`).join(""),s=t.map(i=>`<tr>${e.map(n=>`<td class="${n.class||""}">${n.render?n.render(i):d(i[n.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${r}</tr></thead>
        <tbody>${s}</tbody>
      </table>
    </div>
  `}const Qe=N();async function kt(e){e.innerHTML=`
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
  `;const t=e.querySelector("#gw-reply"),l=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{l.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const s=e.querySelector("#gw-publish-btn"),i=e.querySelector("#gw-comment-id").value.trim(),n=e.querySelector("#gw-reply").value.trim(),p=e.querySelector("#gw-source").value.trim(),o=e.querySelector("#gw-force").checked;if(!i||!n){v("Comment ID 和回复内容不能为空","warning");return}s.disabled=!0,s.textContent="发布中...";try{await Qe.publishGatewayReply({comment_id:i,reply_text:n,source:p,force_publish:o}),v("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",l.textContent="0/0",r()}catch(b){v(`发布失败: ${b.message}`,"error")}finally{s.disabled=!1,s.textContent="发布"}});async function r(){const s=e.querySelector("#gw-table-wrapper"),i=e.querySelector("#gw-limit").value;s.innerHTML='<div class="page-loading">加载中...</div>';try{const n=await Qe.getGatewayLogs({limit:i}),p=Array.isArray(n==null?void 0:n.items)?n.items:[];if(p.length===0){s.innerHTML='<div class="table-empty">暂无网关日志</div>';return}s.innerHTML=qt({columns:[{key:"id",label:"ID",class:"cell-id",render:o=>{var b;return d((b=o.id)==null?void 0:b.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:o=>{var b;return d((b=o.comment_id)==null?void 0:b.substring(0,12))}},{key:"status",label:"状态",render:o=>Ge(o.status)},{key:"platform",label:"平台",render:o=>d(o.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:o=>{var b;return d((b=o.reply_text)==null?void 0:b.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:o=>se(o.created_at)}],rows:p})}catch(n){s.innerHTML=`<div class="page-error">加载失败: ${d(n.message)}</div>`}}e.querySelector("#gw-refresh").addEventListener("click",r),e.querySelector("#gw-filter-btn").addEventListener("click",r),await r()}const Ke=N();async function Lt(e){e.innerHTML=`
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
  `;async function t(){try{const r=await Ke.getAuditSummary({days:7}),s=e.querySelector("#audit-summary-cards");s.innerHTML=`
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
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function l(){const r=e.querySelector("#audit-table-wrapper");r.innerHTML='<div class="page-loading">加载中...</div>';const s=e.querySelector("#audit-action").value.trim(),i=e.querySelector("#audit-ok").value,n=e.querySelector("#audit-limit").value;try{const p=await Ke.getAuditLogs({action:s,ok:i,limit:n}),o=Array.isArray(p==null?void 0:p.items)?p.items:[];if(o.length===0){r.innerHTML='<div class="table-empty">暂无审计日志</div>';return}r.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${o.map(b=>{var c;return`<tr>
              <td class="cell-id">${d((c=b.id)==null?void 0:c.toString().substring(0,8))}</td>
              <td>${d(b.action)}</td>
              <td class="cell-truncate">${d(b.target_id||"-")}</td>
              <td>${b.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${d(b.detail||"-")}</td>
              <td class="cell-time">${se(b.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(p){r.innerHTML=`<div class="page-error">加载失败: ${d(p.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),l()}),e.querySelector("#audit-filter-btn").addEventListener("click",l),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await Ke.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),v("导出成功","success")}catch(r){v(`导出失败: ${r.message}`,"error")}}),await Promise.all([t(),l()])}const T=N(),Tt=/^BV[a-zA-Z0-9]{10}$/,Bt={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},Mt={"auth:no active credential":"缺少可用的激活凭证。","dependency:diagnostics_unavailable":"诊断信息暂时不可用。"},Pt={manual_queue:"人工队列",simulated:"模拟发布",webhook:"Webhook",real_publish:"真实发布",native_bilibili:"原生 B 站发布"},At={ok:{label:"成功",cls:"badge-success"},no_new:{label:"无新增",cls:"badge-muted"},error:{label:"失败",cls:"badge-danger"}},ge={no_aid:"缺少视频 aid，暂时无法轮询。",retry_exhausted:"评论抓取重试耗尽。"},re=50,Nt=7*24*60*60*1e3;function q(e){const t=e instanceof Error?e.message:String(e??"request_failed");return Bt[t]||t}function It(e){return e?Tt.test(e)?null:"invalid_bvid_format":"bvid_required"}function jt(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function Ht(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function Ot(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(l=>Mt[l]||l).join("；")}function Rt(e){const t=String(e??"").trim().toLowerCase();return Pt[t]||t||"-"}function Dt(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":t%60===0?`${t/60} 分钟`:`${t} 秒`}function Ut(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":`${t} 次/分钟`}function Xe(e,t,l="覆盖率"){const r=Number(t??0);if(!Number.isFinite(r)||r<=0)return"暂无视频";const s=Number(e??0),n=((Number.isFinite(s)?Math.min(r,Math.max(0,s)):0)/r*100).toFixed(1).replace(/\.0$/,"");return`${l} ${n}%`}function Vt(e,t){const l=Number(e??0);if(!Number.isFinite(l)||l<=0)return"暂无视频";const r=Number(t??0),s=Number.isFinite(r)?Math.min(l,Math.max(0,r)):0,i=Math.max(0,l-s);return`轮询中 ${s}，停用 ${i}`}function Wt(e,t,l){const r=String(e??"").trim().toLowerCase();if(!r)return"-";const s=At[r]||{label:r,cls:"badge-muted"},i=r==="error"&&t?ge[String(t).trim().toLowerCase()]||String(t):"",n=i?` title="${d(i)}"`:"",p=typeof l=="number"&&Number.isFinite(l)?`评论游标: ${l}`:"",o=[i,p].filter(Boolean).map(b=>`<div class="form-hint" style="margin-top:4px;">${d(b)}</div>`).join("");return`<span class="status-badge ${s.cls}"${n}>${d(s.label)}</span>${o}`}function Jt(e){if(e==="true")return!0;if(e==="false")return!1}function Kt(e){return e==="true"?"暂无轮询中视频":e==="false"?"暂无已停用视频":"暂无视频"}function W(e){return typeof(e==null?void 0:e.aid)=="number"&&Number.isFinite(e.aid)}function zt(e){return e.filter(t=>!W(t)).length}function Ft(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)).length}function Gt(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)&&!W(t)).length}function Yt(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&W(t)).length}function Zt(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&!(t!=null&&t.last_polled_at)).length}function Qt(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&(t==null?void 0:t.last_polled_at)).length}function Xt(e){return e.filter(t=>(t==null?void 0:t.poll_enabled)&&!(t!=null&&t.last_polled_at)).length}function ei(e){return e.filter(t=>(t==null?void 0:t.poll_enabled)&&(t==null?void 0:t.last_polled_at)).length}function ti(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="error").length}function ii(e){return e.filter(t=>{const l=String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase();return l==="ok"||l==="no_new"}).length}function li(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="ok").length}function ri(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="no_new").length}function si(e){return e.filter(t=>!(t!=null&&t.last_polled_at)).length}function ai(e){return e.filter(t=>W(t)&&!(t!=null&&t.last_polled_at)).length}function ni(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function oi(e){return e.filter(t=>typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function di(e){return e.filter(t=>String((t==null?void 0:t.title)??"").trim().length>0).length}function ci(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0).length}function ui(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&Number((t==null?void 0:t.comment_count)??0)<=0).length}function pi(e){return e.filter(t=>typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function bi(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function vi(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)<=0&&typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function fi(e){return e.filter(t=>W(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function yi(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(W(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid))).length}function hi(e){return e.reduce((t,l)=>{const r=Number((l==null?void 0:l.comment_count)??0);return t+(Number.isFinite(r)&&r>0?r:0)},0)}function gi(e){const l=W(e)?`aid: ${e.aid}`:ge.no_aid;return`${d((e==null?void 0:e.bvid)||"-")}${l?`<div class="form-hint" style="margin-top:4px;">${d(l)}</div>`:""}`}function mi(e){const t=[];return typeof(e==null?void 0:e.owner_mid)=="number"&&Number.isFinite(e.owner_mid)&&t.push(`UP主 MID: ${e.owner_mid}`),e!=null&&e.updated_at&&t.push(`更新: ${k(e.updated_at)}`),e!=null&&e.created_at&&t.push(`创建: ${k(e.created_at)}`),`${d((e==null?void 0:e.title)||"-")}${t.map(l=>`<div class="form-hint" style="margin-top:4px;">${d(l)}</div>`).join("")}`}function $i(e){const t=W(e),l=t?"":" disabled",r=t?"":` title="${d(ge.no_aid)}"`;return`<button class="btn btn-sm bili-sync" data-id="${d(e.id||e.video_id)}" data-has-aid="${t?"true":"false"}"${l}${r}>同步</button>`}function xi(e,t,l,r=0,s=re,i=[]){const n=l==="true"?"轮询中":l==="false"?"已停用":"全部",p=Math.floor(r/s)+1,o=Math.max(1,Math.ceil(e/s)),b=Ft(i),c=Math.max(0,i.length-b),g=Gt(i),$=Yt(i),w=Zt(i),y=Qt(i),f=Xt(i),C=ei(i),E=zt(i),J=Math.max(0,i.length-E),O=ti(i),K=ii(i),u=li(i),L=ri(i),B=si(i),R=ai(i),Y=Math.max(0,i.length-B),m=oi(i),Z=Math.max(0,i.length-m),D=di(i),z=Math.max(0,i.length-D),F=ci(i),M=Math.max(0,i.length-F),I=ui(i),P=pi(i),Q=bi(i),X=vi(i),ee=Math.max(0,i.length-P),te=ni(i),G=fi(i),j=Math.max(0,i.length-G),U=yi(i),de=hi(i),me=E>0?`，当前页缺少 aid ${E} 条`:"",$e=l===""&&b>0?`，当前页轮询开启 ${b} 条`:"",xe=l===""&&c>0?`，当前页轮询停用 ${c} 条`:"",_e=l===""&&g>0?`，轮询开启但缺少 aid ${g} 条`:"",we=l===""&&$>0?`，轮询停用但可同步 ${$} 条`:"",Se=l===""&&w>0?`，轮询停用且从未轮询 ${w} 条`:"",Ee=l===""&&y>0?`，轮询停用且已有轮询记录 ${y} 条`:"",Ce=l===""&&f>0?`，轮询开启但尚未轮询 ${f} 条`:"",qe=l===""&&C>0?`，轮询开启且已有轮询记录 ${C} 条`:"",ke=J>0?`，可同步 ${J} 条`:"",ie=K>0?`，正常轮询 ${K} 条`:"",ae=u>0?`，成功轮询 ${u} 条`:"",Le=L>0?`，无新增 ${L} 条`:"",Te=O>0?`，轮询失败 ${O} 条`:"",Be=Y>0?`，已有轮询记录 ${Y} 条`:"",Me=B>0?`，尚未轮询 ${B} 条`:"",ce=R>0?`，可同步但尚未轮询 ${R} 条`:"",Pe=m>0?`，已识别 UP 主 ${m} 条`:"",ue=Z>0?`，缺少 UP 主 ${Z} 条`:"",Ae=D>0?`，已抓取标题 ${D} 条`:"",pe=z>0?`，缺少标题 ${z} 条`:"",Ne=G>0?`，信息完整 ${G} 条`:"",Ie=j>0?`，信息不完整 ${j} 条`:"",je=U>0?`，已轮询但信息不完整 ${U} 条`:"",He=F>0?`，已有评论视频 ${F} 条`:"",Oe=M>0?`，无评论视频 ${M} 条`:"",be=I>0?`，已轮询但无评论 ${I} 条`:"",Re=P>0?`，已有评论游标 ${P} 条`:"",ve=Q>0?`，有评论但无游标 ${Q} 条`:"",De=X>0?`，无评论但有游标 ${X} 条`:"",fe=ee>0?`，无评论游标 ${ee} 条`:"",Ue=te>0?`，已轮询但无游标 ${te} 条`:"",Ve=de>0?`，关联评论 ${de} 条`:"";return`筛选: ${n}，共 ${e} 条，当前展示 ${t} 条，第 ${p}/${o} 页${$e}${xe}${me}${_e}${we}${Se}${Ee}${Ce}${qe}${ke}${ie}${ae}${Le}${Te}${Be}${Me}${ce}${Pe}${ue}${Ae}${pe}${Ne}${Ie}${je}${He}${Oe}${be}${Re}${ve}${De}${fe}${Ue}${Ve}`}function et(e,t={}){const l=Number((e==null?void 0:e.videos)??0),r=Number((e==null?void 0:e.comments)??0),s=Number((e==null?void 0:e.events_injected)??r),i=t.subject||(l===1?"视频":"轮询");return r>0||s>0?`${i}完成，处理 ${l} 个视频，新增 ${r} 条评论，注入 ${s} 个事件。`:l>0?`${i}完成，处理 ${l} 个视频，暂无新增评论。`:`${i}完成，暂无可处理视频。`}function x(e,t=Date.now()){if(!e)return{hasExpiry:!1,expired:!1,expiringSoon:!1,label:"未设置",cls:"badge-muted",detail:""};const l=new Date(e);if(Number.isNaN(l.getTime()))return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"时间异常",cls:"badge-danger",detail:String(e)};const r=l.getTime()-t;return r<=0?{hasExpiry:!0,expired:!0,expiringSoon:!1,label:"已过期",cls:"badge-danger",detail:k(e)}:r<=Nt?{hasExpiry:!0,expired:!1,expiringSoon:!0,label:"即将过期",cls:"badge-warning",detail:k(e)}:{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"有效",cls:"badge-success",detail:k(e)}}function _i(e){const t=x(e),l=t.detail?`<div class="form-hint" style="margin-top:4px;">${d(t.detail)}</div>`:"";return`<span class="status-badge ${t.cls}">${d(t.label)}</span>${l}`}function tt(e,t="-"){const l=[];return e!=null&&e.updated_at&&l.push(`更新: ${k(e.updated_at)}`),e!=null&&e.created_at&&l.push(`创建: ${k(e.created_at)}`),`${d((e==null?void 0:e.name)||t)}${l.map(r=>`<div class="form-hint" style="margin-top:4px;">${d(r)}</div>`).join("")}`}function wi(e){return(e==null?void 0:e.cls)==="badge-danger"?"var(--danger-color)":(e==null?void 0:e.cls)==="badge-warning"?"var(--warning-color)":(e==null?void 0:e.cls)==="badge-success"?"var(--success-color)":"var(--grey-2)"}function Si(e){if(!e)return{label:"未配置",detail:""};if(e!=null&&e.last_used_at)return{label:k(e.last_used_at),detail:""};const t=[];return e!=null&&e.updated_at&&t.push(`更新: ${k(e.updated_at)}`),e!=null&&e.created_at&&t.push(`创建: ${k(e.created_at)}`),{label:"从未使用",detail:t.join("，")}}function _(e){return!!(e!=null&&e.has_sessdata&&(e!=null&&e.has_bili_jct)&&(e!=null&&e.buvid3))}function Ei(e){const t=[];return e!=null&&e.has_sessdata||t.push("SESSDATA"),e!=null&&e.has_bili_jct||t.push("bili_jct"),e!=null&&e.buvid3||t.push("buvid3"),t}function Ci(e,t){return e?t?"凭证字段完整":"凭证字段缺失":"未配置凭证"}function qi(e){var n,p,o,b,c,g;const t=!!((p=(n=e==null?void 0:e.checks)==null?void 0:n.auth)!=null&&p.ready),l=!!((b=(o=e==null?void 0:e.checks)==null?void 0:o.worker_or_publish)!=null&&b.ready),r=!!((c=e==null?void 0:e.signals)!=null&&c.polling_worker_enabled),s=!!((g=e==null?void 0:e.signals)!=null&&g.native_publish_enabled);return r||s?`${t?"鉴权已就绪":"鉴权未就绪"}，${l?"执行链路可用":"执行链路阻塞"}`:"当前无需鉴权"}function ki(e){var s,i,n;const t=!!((s=e==null?void 0:e.signals)!=null&&s.publish_mode_config_ready),l=!!((i=e==null?void 0:e.signals)!=null&&i.native_publish_enabled),r=!!((n=e==null?void 0:e.signals)!=null&&n.polling_worker_enabled);return[t?"模式配置就绪":"模式配置缺失",l?"原生发布启用":"原生发布停用",r?"轮询链路启用":"轮询链路停用"].join("，")}function Li(e){const t=[e!=null&&e.has_sessdata?"SESSDATA":"",e!=null&&e.has_bili_jct?"bili_jct":"",e!=null&&e.buvid3?`buvid3:${e.buvid3}`:""].filter(Boolean).join(" / ")||"-",l=_(e)?"字段完整":`缺少 ${Ei(e).join(" / ")}`;return`${d(t)}${l?`<div class="form-hint" style="margin-top:4px;">${d(l)}</div>`:""}`}function at(e="",t=""){return`激活: ${e==="active"?"仅激活":e==="inactive"?"仅未激活":"全部"}，过期: ${t==="expired"?"已过期":t==="expiring"?"即将过期":t==="valid"?"有效":t==="unset"?"未设置过期时间":"全部"}`}function Ti(e,t="",l="",r=e.length){const s=e.length,i=nt(e,t,l),n=e.filter(a=>a.is_active||a.active),p=e.filter(a=>!(a.is_active||a.active)),o=n.length,b=p.length,c=e.filter(a=>_(a)).length,g=e.filter(a=>(a.is_active||a.active)&&_(a)).length,$=Math.max(0,c-g),w=Math.max(0,o-g),y=Math.max(0,b-$),f=n.filter(a=>a.last_used_at).length,C=Math.max(0,o-f),E=p.filter(a=>a.last_used_at).length,J=Math.max(0,b-E),O=e.filter(a=>_(a)&&a.last_used_at).length,K=Math.max(0,c-O),u=Math.max(0,s-c),L=e.filter(a=>!_(a)&&a.last_used_at).length,B=Math.max(0,u-L),R=e.filter(a=>!a.last_used_at).length,Y=Math.max(0,s-R),m=Date.now(),Z=e.filter(a=>_(a)&&x(a.expires_at,m).hasExpiry&&!x(a.expires_at,m).expired).length,D=e.filter(a=>_(a)&&x(a.expires_at,m).expired).length,z=e.filter(a=>_(a)&&x(a.expires_at,m).expiringSoon).length,F=e.filter(a=>_(a)&&!x(a.expires_at,m).hasExpiry).length,M=e.map(a=>x(a.expires_at,m)),I=n.map(a=>x(a.expires_at,m)),P=p.map(a=>x(a.expires_at,m)),Q=M.filter(a=>a.hasExpiry).length,X=M.filter(a=>a.hasExpiry&&!a.expired).length,ee=M.filter(a=>a.expired).length,te=M.filter(a=>a.expiringSoon).length,G=I.filter(a=>a.hasExpiry&&!a.expired).length,j=I.filter(a=>a.expired).length,U=I.filter(a=>a.expiringSoon).length,de=I.filter(a=>!a.hasExpiry).length,me=P.filter(a=>a.hasExpiry&&!a.expired).length,$e=P.filter(a=>a.expired).length,xe=P.filter(a=>a.expiringSoon).length,_e=P.filter(a=>!a.hasExpiry).length,we=e.filter(a=>!_(a)&&x(a.expires_at,m).hasExpiry&&!x(a.expires_at,m).expired).length,Se=e.filter(a=>!_(a)&&x(a.expires_at,m).expired).length,Ee=e.filter(a=>!_(a)&&x(a.expires_at,m).expiringSoon).length,Ce=e.filter(a=>!_(a)&&!x(a.expires_at,m).hasExpiry).length,qe=M.filter(a=>!a.hasExpiry).length,ke=at(t,l),ie=i.filter(a=>_(a)).length,ae=Math.max(0,i.length-ie),Le=i.filter(a=>{if(!_(a))return!1;const V=x(a.expires_at,m);return V.hasExpiry&&!V.expired}).length,Te=i.filter(a=>_(a)?x(a.expires_at,m).expired:!1).length,Be=i.filter(a=>_(a)?x(a.expires_at,m).expiringSoon:!1).length,Me=i.filter(a=>_(a)?!x(a.expires_at,m).hasExpiry:!1).length,ce=i.filter(a=>_(a)&&(a.is_active||a.active)).length,Pe=Math.max(0,ie-ce),ue=i.filter(a=>_(a)&&a.last_used_at).length,Ae=Math.max(0,ie-ue),pe=i.filter(a=>!_(a)&&a.last_used_at).length,Ne=Math.max(0,ae-pe),Ie=i.filter(a=>{if(_(a))return!1;const V=x(a.expires_at,m);return V.hasExpiry&&!V.expired}).length,je=i.filter(a=>_(a)?!1:x(a.expires_at,m).expired).length,He=i.filter(a=>_(a)?!1:x(a.expires_at,m).expiringSoon).length,Oe=i.filter(a=>_(a)?!1:!x(a.expires_at,m).hasExpiry).length,be=i.filter(a=>!_(a)&&(a.is_active||a.active)).length,Re=Math.max(0,ae-be),ve=i.filter(a=>a.is_active||a.active).length,De=Math.max(0,i.length-ve),fe=i.filter(a=>a.last_used_at).length,Ue=Math.max(0,i.length-fe),Ve=i.filter(a=>{const V=x(a.expires_at,m);return V.hasExpiry&&!V.expired}).length,ut=i.filter(a=>x(a.expires_at,m).expired).length,pt=i.filter(a=>x(a.expires_at,m).expiringSoon).length,bt=i.filter(a=>!x(a.expires_at,m).hasExpiry).length,vt=t?"":`，激活 ${ve} 个，未激活 ${De} 个`,ft=t?"":`，完整且激活 ${ce} 个，完整但未激活 ${Pe} 个`,yt=t?"":`，缺字段且激活 ${be} 个，缺字段且未激活 ${Re} 个`,ht=t||l?`，筛选结果完整 ${ie} 个${ft}，完整且有效 ${Le} 个，完整且已过期 ${Te} 个，完整且即将过期 ${Be} 个，完整且未设置过期 ${Me} 个，完整且已使用 ${ue} 个，完整但未使用 ${Ae} 个，缺字段 ${ae} 个${yt}，缺字段但已使用 ${pe} 个，缺字段且从未使用 ${Ne} 个，缺字段但有效 ${Ie} 个，缺字段且已过期 ${je} 个，缺字段且即将过期 ${He} 个，缺字段且未设置过期 ${Oe} 个${vt}，已使用 ${fe} 个，从未使用 ${Ue} 个，有效 ${Ve} 个，已过期 ${ut} 个，即将过期 ${pt} 个，未设置过期 ${bt} 个`:"";return`共 ${s} 个凭证，激活中 ${o} 个，未激活 ${b} 个，激活且完整 ${g} 个，未激活但完整 ${$} 个，激活但缺字段 ${w} 个，未激活且缺字段 ${y} 个，激活且已使用 ${f} 个，激活但从未使用 ${C} 个，未激活且已使用 ${E} 个，未激活但从未使用 ${J} 个，激活且有效 ${G} 个，未激活且有效 ${me} 个，激活已过期 ${j} 个，未激活已过期 ${$e} 个，激活即将过期 ${U} 个，未激活即将过期 ${xe} 个，激活未设置过期 ${de} 个，未激活未设置过期 ${_e} 个，字段完整 ${c} 个，完整且有效 ${Z} 个，完整且已过期 ${D} 个，完整即将过期 ${z} 个，完整未设置过期 ${F} 个，完整且已使用 ${O} 个，完整但未使用 ${K} 个，字段缺失 ${u} 个，缺字段但已使用 ${L} 个，缺字段且未使用 ${B} 个，缺字段但有效 ${we} 个，缺字段且已过期 ${Se} 个，缺字段即将过期 ${Ee} 个，缺字段未设置过期 ${Ce} 个，已使用 ${Y} 个，从未使用 ${R} 个，设置过期时间 ${Q} 个，有效 ${X} 个，已过期 ${ee} 个，即将过期 ${te} 个，未设置 ${qe} 个；筛选: ${ke}，当前展示 ${r} 个${ht}`}function nt(e,t="",l=""){const r=Date.now();return e.filter(s=>{const i=s.is_active||s.active;if(t==="active"&&!i||t==="inactive"&&i)return!1;const n=x(s.expires_at,r);return!(l==="expired"&&!n.expired||l==="expiring"&&!n.expiringSoon||l==="valid"&&(!n.hasExpiry||n.expired)||l==="unset"&&n.hasExpiry)})}function Bi(e="",t=""){return e||t?`暂无匹配筛选条件的凭证（${at(e,t)}）`:"暂无凭证"}function it(e,t,l){const r=e.querySelector(l);t.forEach(s=>{const i=e.querySelector(s);i==null||i.addEventListener("keydown",n=>{n.key==="Enter"&&(n.preventDefault(),r.disabled||r.click())})})}async function Mi(e){let t=0;e.innerHTML=`
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
  `;async function l(){var n,p,o,b,c,g,$,w,y,f,C,E,J,O,K;const i=e.querySelector("#bili-status-cards");i.innerHTML='<div class="page-loading">加载中...</div>';try{const u=await T.getBilibiliStatus(),L=Number((u==null?void 0:u.video_count)??0),B=Number(((n=u==null?void 0:u.videos)==null?void 0:n.poll_enabled_count)??0),R=Math.max(0,L-B),Y=Vt(L,B),m=Xe(B,L),Z=Xe(R,L,"占比"),D=!!((p=u==null?void 0:u.diagnostics)!=null&&p.ready),z=Ot((o=u==null?void 0:u.diagnostics)==null?void 0:o.blocking_reasons),F=tt(u==null?void 0:u.credential,"未配置"),M=!!(((c=(b=u==null?void 0:u.diagnostics)==null?void 0:b.signals)==null?void 0:c.credential_present)??(($=(g=u==null?void 0:u.diagnostics)==null?void 0:g.release_gates)==null?void 0:$.credential_present)),I=!!(((y=(w=u==null?void 0:u.diagnostics)==null?void 0:w.signals)==null?void 0:y.credential_complete)??((C=(f=u==null?void 0:u.diagnostics)==null?void 0:f.release_gates)==null?void 0:C.credential_complete)),P=Ci(M,I),Q=qi(u==null?void 0:u.diagnostics),X=Rt((E=u==null?void 0:u.diagnostics)==null?void 0:E.effective_publish_mode),ee=ki(u==null?void 0:u.diagnostics),te=Dt((J=u==null?void 0:u.config)==null?void 0:J.poll_interval_seconds),G=Ut((O=u==null?void 0:u.config)==null?void 0:O.rate_limit_per_minute),j=x((K=u==null?void 0:u.credential)==null?void 0:K.expires_at),U=Si(u==null?void 0:u.credential);i.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${u!=null&&u.enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询</div>
          <div class="stat-value">${u!=null&&u.polling_enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布</div>
          <div class="stat-value">${u!=null&&u.publish_enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">视频数</div>
          <div class="stat-value">${L}</div>
          <div class="form-hint" style="margin-top:6px;">${d(Y)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${B}</div>
          <div class="form-hint" style="margin-top:6px;">${d(m)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">停用视频</div>
          <div class="stat-value">${R}</div>
          <div class="form-hint" style="margin-top:6px;">${d(Z)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${F}</div>
          <div class="form-hint" style="margin-top:6px;">${d(P)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${D?"var(--success-color)":"var(--danger-color)"}">${D?"就绪":"阻塞"}</div>
          <div class="form-hint" style="margin-top:6px;">${d(Q)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布模式</div>
          <div class="stat-value">${d(X)}</div>
          <div class="form-hint" style="margin-top:6px;">${d(ee)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询间隔</div>
          <div class="stat-value">${d(te)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">速率限制</div>
          <div class="stat-value">${d(G)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">凭证过期</div>
          <div class="stat-value" style="font-size:14px; color:${wi(j)}">${d(j.label)}</div>
          ${j.detail?`<div class="form-hint" style="margin-top:6px;">${d(j.detail)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">最近使用</div>
          <div class="stat-value" style="font-size:14px;">${d(U.label)}</div>
          ${U.detail?`<div class="form-hint" style="margin-top:6px;">${d(U.detail)}</div>`:""}
        </div>
        ${z?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">阻塞原因: ${d(z)}</div>`:""}
      `}catch(u){i.innerHTML=`<div class="page-error">状态加载失败: ${d(q(u))}</div>`}}async function r(){const i=e.querySelector("#bili-videos-wrapper"),n=e.querySelector("#bili-video-summary"),p=e.querySelector("#bili-video-filter-btn"),o=e.querySelector("#bili-video-poll-filter"),b=e.querySelector("#bili-video-prev"),c=e.querySelector("#bili-video-next"),g=o.value;n.textContent="加载中...",i.innerHTML='<div class="page-loading">加载中...</div>',o.disabled=!0,p.disabled=!0,b.disabled=!0,c.disabled=!0;try{const $=await T.getBilibiliVideos({limit:re,offset:t,poll_enabled:Jt(g)}),w=Array.isArray($==null?void 0:$.items)?$.items:Array.isArray($)?$:[],y=Number(($==null?void 0:$.total)??w.length);if(w.length===0&&y>0&&t>0){t=Math.max(0,t-re),await r();return}if(n.textContent=xi(y,w.length,g,t,re,w),b.disabled=t<=0,c.disabled=t+w.length>=y,w.length===0){i.innerHTML=`<div class="table-empty">${d(Kt(g))}</div>`;return}i.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${w.map(f=>`<tr data-id="${d(f.id||f.video_id)}">
              <td class="cell-id">${gi(f)}</td>
              <td class="cell-truncate">${mi(f)}</td>
              <td>${Fe(f.poll_enabled)}</td>
              <td>${f.comment_count??"-"}</td>
              <td class="cell-time">${f.last_polled_at?se(f.last_polled_at):"-"}</td>
              <td>${Wt(f.last_poll_status,f.last_poll_error,f.last_rpid)}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${d(f.id||f.video_id)}">${f.poll_enabled?"禁用轮询":"启用轮询"}</button>
                ${$i(f)}
                <button class="btn btn-sm btn-danger bili-delete" data-id="${d(f.id||f.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".bili-toggle-poll").forEach(f=>{f.addEventListener("click",async()=>{f.disabled=!0;try{await T.toggleBilibiliVideoPoll(f.dataset.id),v("操作成功","success"),await Promise.all([l(),r()])}catch(C){v(`失败: ${q(C)}`,"error")}finally{f.disabled=!1}})}),i.querySelectorAll(".bili-sync").forEach(f=>{f.addEventListener("click",async()=>{if(f.dataset.hasAid==="false"){v(ge.no_aid,"warning");return}const C=f.textContent;f.disabled=!0,f.textContent="同步中...";try{const E=await T.syncBilibiliVideo(f.dataset.id);v(et(E==null?void 0:E.result,{subject:"同步"}),"success"),await Promise.all([l(),r()])}catch(E){v(`同步失败: ${q(E)}`,"error")}finally{f.disabled=!1,f.textContent=C}})}),i.querySelectorAll(".bili-delete").forEach(f=>{f.addEventListener("click",async()=>{if(confirm("确定删除此视频？")){f.disabled=!0;try{await T.deleteBilibiliVideo(f.dataset.id),v("已删除","success"),await Promise.all([l(),r()])}catch(C){v(`删除失败: ${q(C)}`,"error")}finally{f.disabled=!1}}})})}catch($){n.textContent="视频加载失败",i.innerHTML=`<div class="page-error">加载失败: ${d(q($))}</div>`}finally{o.disabled=!1,p.disabled=!1}}async function s(){const i=e.querySelector("#bili-creds-wrapper"),n=e.querySelector("#bili-cred-summary"),p=e.querySelector("#bili-cred-active-filter"),o=e.querySelector("#bili-cred-expiry-filter"),b=p.value,c=o.value;n.textContent="加载中...",i.innerHTML='<div class="page-loading">加载中...</div>',p.disabled=!0,o.disabled=!0;try{const g=await T.getBilibiliCredentials(),$=Array.isArray(g==null?void 0:g.items)?g.items:Array.isArray(g)?g:[],w=nt($,b,c);if(n.textContent=Ti($,b,c,w.length),w.length===0){i.innerHTML=`<div class="table-empty">${d(Bi(b,c))}</div>`;return}i.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期状态</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${w.map(y=>`<tr data-id="${d(y.id||y.credential_id)}">
              <td>${tt(y)}</td>
              <td class="cell-id">${Li(y)}</td>
              <td>${Fe(y.is_active||y.active)}</td>
              <td>${_i(y.expires_at)}</td>
              <td class="cell-time">${y.last_used_at?se(y.last_used_at):"-"}</td>
              <td class="cell-actions">
                ${y.is_active||y.active?"":`<button class="btn btn-sm cred-activate" data-id="${d(y.id||y.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${d(y.id||y.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".cred-activate").forEach(y=>{y.addEventListener("click",async()=>{y.disabled=!0;try{await T.activateBilibiliCredential(y.dataset.id),v("已激活","success"),await Promise.all([l(),s()])}catch(f){v(`激活失败: ${q(f)}`,"error")}finally{y.disabled=!1}})}),i.querySelectorAll(".cred-delete").forEach(y=>{y.addEventListener("click",async()=>{if(confirm("确定删除此凭证？")){y.disabled=!0;try{await T.deleteBilibiliCredential(y.dataset.id),v("已删除","success"),await Promise.all([l(),s()])}catch(f){v(`删除失败: ${q(f)}`,"error")}finally{y.disabled=!1}}})})}catch(g){n.textContent="凭证加载失败",i.innerHTML=`<div class="page-error">加载失败: ${d(q(g))}</div>`}finally{p.disabled=!1,o.disabled=!1}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const i=e.querySelector("#bili-video-add"),n=e.querySelector("#bili-video-bvid").value.trim(),p=It(n);if(p){v(q(p),"warning");return}i.disabled=!0,i.textContent="添加中...";try{await T.addBilibiliVideo(n),v("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([l(),r()])}catch(o){v(`添加失败: ${q(o)}`,"error")}finally{i.disabled=!1,i.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{var b;const i=e.querySelector("#cred-add"),n=Ht(e.querySelector("#cred-expires").value),p={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:n},o=jt(p);if(o){v(q(o),"warning");return}i.disabled=!0,i.textContent="添加中...";try{const c=await T.addBilibiliCredential(p);v((b=c==null?void 0:c.item)!=null&&b.is_active?"凭证添加成功，已自动激活":"凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([l(),s()])}catch(c){v(`添加失败: ${q(c)}`,"error")}finally{i.disabled=!1,i.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const i=e.querySelector("#bili-poll-btn");i.disabled=!0,i.textContent="轮询中...";try{const n=await T.triggerBilibiliPoll();v(et(n==null?void 0:n.result),"success"),await Promise.all([l(),r()])}catch(n){v(`轮询失败: ${q(n)}`,"error")}finally{i.disabled=!1,i.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",async()=>{const i=e.querySelector("#bili-refresh");i.disabled=!0,i.textContent="刷新中...";try{await Promise.all([l(),r(),s()])}finally{i.disabled=!1,i.innerHTML='<svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新'}}),e.querySelector("#bili-video-filter-btn").addEventListener("click",()=>{t=0,r()}),e.querySelector("#bili-video-poll-filter").addEventListener("change",()=>{t=0,r()}),e.querySelector("#bili-video-prev").addEventListener("click",()=>{t<=0||(t=Math.max(0,t-re),r())}),e.querySelector("#bili-video-next").addEventListener("click",()=>{t+=re,r()}),e.querySelector("#bili-cred-active-filter").addEventListener("change",s),e.querySelector("#bili-cred-expiry-filter").addEventListener("change",s),it(e,["#bili-video-bvid"],"#bili-video-add"),it(e,["#cred-name","#cred-sessdata","#cred-bili-jct","#cred-buvid3","#cred-buvid4","#cred-expires"],"#cred-add"),await Promise.all([l(),r(),s()])}const lt=N();async function Pi(e){e.innerHTML=`
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
  `,e.querySelector("#query-comment-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-comment-id").value.trim(),l=e.querySelector("#query-comment-result");if(!t){v("请输入 Comment ID","warning");return}l.innerHTML='<div class="page-loading">查询中...</div>';try{const r=await lt.getComment(t);l.innerHTML=`
        <div class="detail-card">
          ${Object.entries(r||{}).map(([s,i])=>`
            <div class="detail-row">
              <span class="detail-key">${d(s)}</span>
              <span class="detail-value">${d(typeof i=="object"?JSON.stringify(i,null,2):String(i??"-"))}</span>
            </div>
          `).join("")}
        </div>
      `}catch(r){l.innerHTML=`<div class="page-error">查询失败: ${d(r.message)}</div>`}}),e.querySelector("#query-job-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-job-id").value.trim(),l=e.querySelector("#query-job-result");if(!t){v("请输入 Job ID","warning");return}l.innerHTML='<div class="page-loading">查询中...</div>';try{const r=await lt.getJob(t);l.innerHTML=`
        <div class="detail-card">
          ${Object.entries(r||{}).map(([i,n])=>`
            <div class="detail-row">
              <span class="detail-key">${d(i)}</span>
              <span class="detail-value">${d(typeof n=="object"?JSON.stringify(n,null,2):String(n??"-"))}</span>
            </div>
          `).join("")}
        </div>
        ${r!=null&&r.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${d(r.comment_id)}">查看关联评论 →</a></div>`:""}
      `;const s=l.querySelector("#query-goto-comment");s&&s.addEventListener("click",()=>{e.querySelector("#query-comment-id").value=s.dataset.id,e.querySelector("#query-comment-btn").click()})}catch(r){l.innerHTML=`<div class="page-error">查询失败: ${d(r.message)}</div>`}})}const ze={dashboard:{render:st,title:"仪表盘"},jobs:{render:xt,title:"任务管理"},"daily-metrics":{render:wt,title:"每日指标"},knowledge:{render:St,title:"知识库"},"role-cards":{render:Et,title:"角色卡"},profiles:{render:Ct,title:"风格配置"},gateway:{render:kt,title:"网关"},audit:{render:Lt,title:"审计日志"},bilibili:{render:Mi,title:"B站集成"},query:{render:Pi,title:"查询"}};let ot=null;function Ai(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function dt(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function ct(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function Ni(e){e.preventDefault();const t=document.getElementById("login-api-key"),l=document.getElementById("login-error"),r=t.value.trim();if(r){window.__ADMIN_API_KEY__=r;try{await h("/api/admin/overview"),sessionStorage.setItem("admin_api_key",r),ct(),Ye("dashboard")}catch{l.textContent="API Key 无效或服务不可用",l.style.display="block",window.__ADMIN_API_KEY__=""}}}function Ii(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",dt()}function Ye(e){if(!ze[e])return;ot=e,document.querySelectorAll("#nav-list .nav-item").forEach(l=>{l.classList.toggle("active",l.dataset.page===e)}),document.getElementById("page-title").textContent=ze[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',ze[e].render(t).catch(l=>{t.innerHTML=`<div class="page-error">加载失败: ${l.message}</div>`})}function ji(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==ot&&Ye(t)})})}function Hi(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),l=document.getElementById("expand-left-btn");t&&l&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),l.style.display="block"}),l.addEventListener("click",()=>{e.classList.remove("collapsed"),l.style.display="none"}))}function Oi(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let l=0;e.addEventListener("click",()=>{l=(l+1)%t.length,t[l]?document.body.setAttribute("data-theme",t[l]):document.body.removeAttribute("data-theme")})}function Ri(){Hi(),Oi(),ji(),document.getElementById("login-form").addEventListener("submit",Ni),document.getElementById("logout-btn").addEventListener("click",Ii),Ai()?(ct(),Ye("dashboard")):dt()}Ri();
