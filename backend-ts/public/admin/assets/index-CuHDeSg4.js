(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const l of r)if(l.type==="childList")for(const a of l.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function i(r){const l={};return r.integrity&&(l.integrity=r.integrity),r.referrerPolicy&&(l.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?l.credentials="include":r.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(r){if(r.ep)return;r.ep=!0;const l=i(r);fetch(r.href,l)}})();function it(e,t,i){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof i=="string"&&i.trim()?i.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function Fe(){return(window.__ADMIN_API_KEY__||"").trim()}async function g(e,t={}){const i=Fe(),s=new Headers(t.headers||{});i&&s.set("x-api-key",i);const r=await fetch(e,{...t,headers:s}),l=await r.json().catch(()=>({}));if(!r.ok){const a=(l==null?void 0:l.detail)||(l==null?void 0:l.error);throw new Error(it(a,r.status,r.statusText))}return l}async function Ue(e,t){const i=Fe(),s=new Headers;i&&s.set("x-api-key",i);const r=await fetch(e,{headers:s});if(!r.ok)throw new Error("download_failed");const l=await r.blob(),a=URL.createObjectURL(l),p=document.createElement("a");p.href=a,p.download=t,document.body.appendChild(p),p.click(),document.body.removeChild(p),URL.revokeObjectURL(a)}function T(e){const t=new URLSearchParams;for(const[s,r]of Object.entries(e))r!=null&&r!==""&&t.set(s,String(r));const i=t.toString();return i?`?${i}`:""}function M(){return{getOverview(){return g("/api/admin/overview")},getJobs({status:e,limit:t}={}){return g(`/api/admin/jobs${T({status:e,limit:t})}`)},getJob(e){return g(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return g(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return g(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return g("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return g("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return Ue(`/export/jobs.csv${T({status:e,limit:t})}`,"jobs.csv")},getComment(e){return g(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,comment_id:t}={}){return g(`/api/admin/gateway/logs${T({limit:e,comment_id:t})}`)},publishGatewayReply(e){return g("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:i}={}){return g(`/api/admin/audit/summary${T({days:e,action:t,ok:i})}`)},getAuditLogs({limit:e,action:t,ok:i}={}){return g(`/api/audit-log${T({limit:e,action:t,ok:i})}`)},exportAuditCsv({limit:e,action:t,ok:i}={}){return Ue(`/export/audit-logs.csv${T({limit:e,action:t,ok:i})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return g(`/api/metrics/daily${T({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return g(`/api/admin/knowledge${T({limit:e,offset:t})}`)},createKnowledgeEntry(e){return g("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return g(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getRoleCards({limit:e,offset:t}={}){return g(`/api/admin/role-cards${T({limit:e,offset:t})}`)},createRoleCard(e){return g("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return g(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return g(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return g(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return g("/api/admin/style-profile")},setStyleProfile(e){return g("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return g("/api/admin/role-profile")},setRoleProfile(e){return g("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return g("/api/admin/bilibili/status")},getBilibiliVideos({poll_enabled:e,limit:t,offset:i}={}){return g(`/api/admin/bilibili/videos${T({poll_enabled:e,limit:t,offset:i})}`)},addBilibiliVideo(e){return g("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return g(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return g(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return g(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return g("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return g("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return g("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return g(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return g(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function d(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function B(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function lt(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const i=Date.now()-t.getTime(),s=Math.floor(i/1e3);if(s<60)return"刚刚";const r=Math.floor(s/60);if(r<60)return`${r}分钟前`;const l=Math.floor(r/60);if(l<24)return`${l}小时前`;const a=Math.floor(l/24);if(a<30)return`${a}天前`;const p=Math.floor(a/30);return p<12?`${p}个月前`:`${Math.floor(p/12)}年前`}catch{return""}}function te(e){const t=lt(e),i=B(e);return t?`<span title="${d(i)}">${d(t)}</span>`:`<span title="${d(i)}">${d(i)}</span>`}function H(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const st={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function Re(e){if(!e)return"";const t=st[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${d(t.label)}</span>`}function Oe(e,t="是",i="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${d(e?t:i)}</span>`}let je=null;function v(e,t="info"){const i=document.getElementById("app-toast");i&&i.remove(),je&&clearTimeout(je);const s={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},r=document.createElement("div");r.id="app-toast",r.className="toast-notification",r.style.setProperty("--toast-color",s[t]||s.info),r.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(r),requestAnimationFrame(()=>r.classList.add("show"));const l=()=>{r.classList.remove("show"),setTimeout(()=>r.remove(),300)};r.querySelector(".toast-close").onclick=l,je=setTimeout(l,4e3)}const de=M();async function Ge(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,i,s,r]=await Promise.all([de.getOverview().catch(()=>null),de.getJobs({limit:5}).catch(()=>null),de.getGatewayLogs({limit:5}).catch(()=>null),de.getAuditSummary({days:7}).catch(()=>null)]),l=t||{},a=Array.isArray(i==null?void 0:i.items)?i.items:[],p=Array.isArray(s==null?void 0:s.items)?s.items:[];e.innerHTML=`
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
                ${a.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':a.map(n=>{var b,c;return`<tr>
                    <td class="cell-id">${d((b=n.id)==null?void 0:b.substring(0,8))}</td>
                    <td>${Re(n.status)}</td>
                    <td class="cell-truncate">${d((c=n.comment_text)==null?void 0:c.substring(0,60))}</td>
                    <td class="cell-time">${d(B(n.created_at))}</td>
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
              <div class="stat-value">${H(r==null?void 0:r.total)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">成功</div>
              <div class="stat-value" style="color:var(--success-color)">${H(r==null?void 0:r.ok_count)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">失败</div>
              <div class="stat-value" style="color:var(--danger-color)">${H(r==null?void 0:r.failed_count)}</div>
            </div>
          </div>
        </div>
      </div>
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{v("正在刷新...","info"),Ge(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${d(t.message)}</div>`}}const X=M();async function rt(e){let t=new Set;e.innerHTML=`
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
  `;const i=e.querySelector("#jobs-status"),s=e.querySelector("#jobs-limit");async function r(){var p;t.clear(),l();const a=e.querySelector("#jobs-table-wrapper");a.innerHTML='<div class="page-loading">加载中...</div>';try{const n=await X.getJobs({status:i.value,limit:s.value}),b=Array.isArray(n==null?void 0:n.items)?n.items:[];if(b.length===0){a.innerHTML='<div class="table-empty">暂无任务</div>';return}a.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${b.map(c=>{var h,m,$,y;return`
              <tr data-id="${d(c.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${d(c.id)}" /></td>
                <td class="cell-id" title="${d(c.id)}">${d((h=c.id)==null?void 0:h.substring(0,8))}</td>
                <td>${Re(c.status)}</td>
                <td class="cell-truncate" title="${d(c.comment_text)}">${d((m=c.comment_text)==null?void 0:m.substring(0,80))}</td>
                <td class="cell-truncate">${d(($=c.reply_text)==null?void 0:$.substring(0,60))}</td>
                <td>${(y=c.risk_flags)!=null&&y.length?c.risk_flags.map(f=>`<span class="risk-flag">${d(f)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${te(c.created_at)}</td>
                <td class="cell-actions">
                  ${c.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${d(c.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${d(c.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(p=a.querySelector("#jobs-select-all"))==null||p.addEventListener("change",c=>{const h=c.target.checked;a.querySelectorAll(".job-checkbox").forEach(m=>{m.checked=h,h?t.add(m.dataset.id):t.delete(m.dataset.id)}),l()}),a.querySelectorAll(".job-checkbox").forEach(c=>{c.addEventListener("change",()=>{c.checked?t.add(c.dataset.id):t.delete(c.dataset.id),l()})}),a.querySelectorAll(".job-approve").forEach(c=>{c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="审批中...";try{await X.approveJob(c.dataset.id),v("审批成功","success"),r()}catch(h){v(`审批失败: ${h.message}`,"error"),c.disabled=!1,c.textContent="审批"}})}),a.querySelectorAll(".job-retry").forEach(c=>{c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="重试中...";try{await X.retryJob(c.dataset.id),v("重试已提交","success"),r()}catch(h){v(`重试失败: ${h.message}`,"error"),c.disabled=!1,c.textContent="重试"}})})}catch(n){a.innerHTML=`<div class="page-error">加载失败: ${d(n.message)}</div>`}}function l(){const a=e.querySelector("#jobs-batch-bar"),p=e.querySelector("#jobs-selected-count");t.size>0?(a.style.display="flex",p.textContent=`已选 ${t.size} 项`):a.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",r),e.querySelector("#jobs-refresh").addEventListener("click",r),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await X.exportJobsCsv({status:i.value,limit:s.value}),v("导出成功","success")}catch(a){v(`导出失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await X.batchApprove([...t]),v(`批量审批 ${t.size} 项成功`,"success"),r()}catch(a){v(`批量审批失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await X.batchRetry([...t]),v(`批量重试 ${t.size} 项成功`,"success"),r()}catch(a){v(`批量重试失败: ${a.message}`,"error")}}),await r()}const at=M();async function nt(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#metrics-days").value,s=e.querySelector("#metrics-table-wrapper");s.innerHTML='<div class="page-loading">加载中...</div>';try{const r=await at.getDailyMetrics({days:i}),l=Array.isArray(r==null?void 0:r.items)?r.items:Array.isArray(r)?r:[];if(l.length===0){s.innerHTML='<div class="table-empty">暂无指标数据</div>';return}s.innerHTML=`
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
      `}catch(r){s.innerHTML=`<div class="page-error">加载失败: ${d(r.message)}</div>`}}e.querySelector("#metrics-load").addEventListener("click",t),await t()}const Ne=M();async function ot(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#knowledge-table-wrapper");i.innerHTML='<div class="page-loading">加载中...</div>';try{const s=await Ne.getKnowledgeEntries({limit:50}),r=Array.isArray(s==null?void 0:s.items)?s.items:[];if(r.length===0){i.innerHTML='<div class="table-empty">暂无知识条目</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${r.map(l=>{var a,p;return`<tr>
              <td class="cell-id">${d((a=l.id)==null?void 0:a.toString().substring(0,8))}</td>
              <td>${d(l.category)}</td>
              <td>${d(l.title)}</td>
              <td class="cell-truncate">${d((p=l.content)==null?void 0:p.substring(0,80))}</td>
              <td>${Oe(l.enabled!==!1)}</td>
              <td class="cell-time">${te(l.created_at)}</td>
              <td class="cell-actions">
                ${l.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${d(l.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".knowledge-disable").forEach(l=>{l.addEventListener("click",async()=>{try{await Ne.disableKnowledgeEntry(l.dataset.id),v("已禁用","success"),t()}catch(a){v(`操作失败: ${a.message}`,"error")}})})}catch(s){i.innerHTML=`<div class="page-error">加载失败: ${d(s.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const i=e.querySelector("#knowledge-category").value.trim(),s=e.querySelector("#knowledge-title").value.trim(),r=e.querySelector("#knowledge-content").value.trim();if(!s||!r){v("标题和内容不能为空","warning");return}try{await Ne.createKnowledgeEntry({category:i,title:s,content:r}),v("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(l){v(`创建失败: ${l.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const le=M();let se=!1,w=null;async function dt(e){se=!1,w=null,e.innerHTML=`
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
  `;const t=e.querySelector("#rc-select"),i=e.querySelector("#rc-editor");let s=[];function r(){se=!0}function l(){return se?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function a(n){w=n,e.querySelector("#rc-key").value=(n==null?void 0:n.key)||"",e.querySelector("#rc-key").disabled=!!n,e.querySelector("#rc-name").value=(n==null?void 0:n.name)||"",e.querySelector("#rc-desc").value=(n==null?void 0:n.description)||"",e.querySelector("#rc-system-prompt").value=(n==null?void 0:n.system_prompt)||"",e.querySelector("#rc-tone").value=(n==null?void 0:n.tone)||"",e.querySelector("#rc-constraints").value=typeof(n==null?void 0:n.constraints)=="string"?n.constraints:JSON.stringify((n==null?void 0:n.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=n?`编辑: ${n.name||n.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=n&&n.enabled!==!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=n&&n.enabled!==!1?"inline-flex":"none",i.style.display="block",se=!1}i.querySelectorAll(".form-input").forEach(n=>n.addEventListener("input",r));async function p(){try{const n=await le.getRoleCards({limit:100});s=Array.isArray(n==null?void 0:n.items)?n.items:Array.isArray(n)?n:[],t.innerHTML='<option value="">-- 新建 --</option>'+s.map(b=>`<option value="${d(b.key)}">${d(b.name||b.key)}${b.enabled===!1?" (禁用)":""}</option>`).join("")}catch(n){v(`加载失败: ${n.message}`,"error")}}t.addEventListener("change",()=>{if(!l()){t.value=(w==null?void 0:w.key)||"";return}const n=t.value,b=s.find(c=>c.key===n);a(b||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{l()&&(t.value="",a(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const n={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},b=e.querySelector("#rc-constraints").value.trim();try{n.constraints=b?JSON.parse(b):""}catch{n.constraints=b}if(!n.key){v("Key 不能为空","warning");return}try{w!=null&&w.key?(await le.updateRoleCard(w.key,n),v("保存成功","success")):(await le.createRoleCard(n),v("创建成功","success")),se=!1,await p(),t.value=n.key}catch(c){v(`操作失败: ${c.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(w!=null&&w.key)try{await le.activateRoleCard(w.key),v("已激活","success"),await p()}catch(n){v(`激活失败: ${n.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(w!=null&&w.key)try{await le.disableRoleCard(w.key),v("已禁用","success"),await p()}catch(n){v(`禁用失败: ${n.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{p()}),await p()}const ce=M();async function ct(e){e.innerHTML=`
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
  `;async function t(){try{const[i,s]=await Promise.all([ce.getStyleProfile().catch(()=>null),ce.getRoleProfile().catch(()=>null)]);i!=null&&i.style&&(e.querySelector("#profile-style").value=i.style,e.querySelector("#profile-style-current").textContent=`当前: ${i.style}`),s!=null&&s.role&&(e.querySelector("#profile-role").value=s.role,e.querySelector("#profile-role-current").textContent=`当前: ${s.role}`)}catch(i){v(`加载配置失败: ${i.message}`,"error")}}e.querySelector("#profile-style-apply").addEventListener("click",async()=>{const i=e.querySelector("#profile-style").value;try{await ce.setStyleProfile(i),e.querySelector("#profile-style-current").textContent=`当前: ${i}`,v("风格已更新","success")}catch(s){v(`更新失败: ${s.message}`,"error")}}),e.querySelector("#profile-role-apply").addEventListener("click",async()=>{const i=e.querySelector("#profile-role").value;try{await ce.setRoleProfile(i),e.querySelector("#profile-role-current").textContent=`当前: ${i}`,v("角色配置已更新","success")}catch(s){v(`更新失败: ${s.message}`,"error")}}),await t()}function ut({columns:e,rows:t,empty:i="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${d(i)}</div>`;const s=e.map(l=>`<th class="${l.class||""}">${d(l.label)}</th>`).join(""),r=t.map(l=>`<tr>${e.map(a=>`<td class="${a.class||""}">${a.render?a.render(l):d(l[a.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${s}</tr></thead>
        <tbody>${r}</tbody>
      </table>
    </div>
  `}const Ve=M();async function pt(e){e.innerHTML=`
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
  `;const t=e.querySelector("#gw-reply"),i=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{i.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const r=e.querySelector("#gw-publish-btn"),l=e.querySelector("#gw-comment-id").value.trim(),a=e.querySelector("#gw-reply").value.trim(),p=e.querySelector("#gw-source").value.trim(),n=e.querySelector("#gw-force").checked;if(!l||!a){v("Comment ID 和回复内容不能为空","warning");return}r.disabled=!0,r.textContent="发布中...";try{await Ve.publishGatewayReply({comment_id:l,reply_text:a,source:p,force_publish:n}),v("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",i.textContent="0/0",s()}catch(b){v(`发布失败: ${b.message}`,"error")}finally{r.disabled=!1,r.textContent="发布"}});async function s(){const r=e.querySelector("#gw-table-wrapper"),l=e.querySelector("#gw-limit").value;r.innerHTML='<div class="page-loading">加载中...</div>';try{const a=await Ve.getGatewayLogs({limit:l}),p=Array.isArray(a==null?void 0:a.items)?a.items:[];if(p.length===0){r.innerHTML='<div class="table-empty">暂无网关日志</div>';return}r.innerHTML=ut({columns:[{key:"id",label:"ID",class:"cell-id",render:n=>{var b;return d((b=n.id)==null?void 0:b.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:n=>{var b;return d((b=n.comment_id)==null?void 0:b.substring(0,12))}},{key:"status",label:"状态",render:n=>Re(n.status)},{key:"platform",label:"平台",render:n=>d(n.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:n=>{var b;return d((b=n.reply_text)==null?void 0:b.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:n=>te(n.created_at)}],rows:p})}catch(a){r.innerHTML=`<div class="page-error">加载失败: ${d(a.message)}</div>`}}e.querySelector("#gw-refresh").addEventListener("click",s),e.querySelector("#gw-filter-btn").addEventListener("click",s),await s()}const Ie=M();async function bt(e){e.innerHTML=`
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
  `;async function t(){try{const s=await Ie.getAuditSummary({days:7}),r=e.querySelector("#audit-summary-cards");r.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">总操作</div>
          <div class="stat-value">${(s==null?void 0:s.total)??0}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">成功</div>
          <div class="stat-value" style="color:var(--success-color)">${(s==null?void 0:s.ok_count)??0}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">失败</div>
          <div class="stat-value" style="color:var(--danger-color)">${(s==null?void 0:s.failed_count)??0}</div>
        </div>
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function i(){const s=e.querySelector("#audit-table-wrapper");s.innerHTML='<div class="page-loading">加载中...</div>';const r=e.querySelector("#audit-action").value.trim(),l=e.querySelector("#audit-ok").value,a=e.querySelector("#audit-limit").value;try{const p=await Ie.getAuditLogs({action:r,ok:l,limit:a}),n=Array.isArray(p==null?void 0:p.items)?p.items:[];if(n.length===0){s.innerHTML='<div class="table-empty">暂无审计日志</div>';return}s.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${n.map(b=>{var c;return`<tr>
              <td class="cell-id">${d((c=b.id)==null?void 0:c.toString().substring(0,8))}</td>
              <td>${d(b.action)}</td>
              <td class="cell-truncate">${d(b.target_id||"-")}</td>
              <td>${b.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${d(b.detail||"-")}</td>
              <td class="cell-time">${te(b.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(p){s.innerHTML=`<div class="page-error">加载失败: ${d(p.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),i()}),e.querySelector("#audit-filter-btn").addEventListener("click",i),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await Ie.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),v("导出成功","success")}catch(s){v(`导出失败: ${s.message}`,"error")}}),await Promise.all([t(),i()])}const k=M(),vt=/^BV[a-zA-Z0-9]{10}$/,ft={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},yt={"auth:no active credential":"缺少可用的激活凭证。","dependency:diagnostics_unavailable":"诊断信息暂时不可用。"},gt={manual_queue:"人工队列",simulated:"模拟发布",webhook:"Webhook",real_publish:"真实发布",native_bilibili:"原生 B 站发布"},ht={ok:{label:"成功",cls:"badge-success"},no_new:{label:"无新增",cls:"badge-muted"},error:{label:"失败",cls:"badge-danger"}},ue={no_aid:"缺少视频 aid，暂时无法轮询。",retry_exhausted:"评论抓取重试耗尽。"},ee=50,mt=7*24*60*60*1e3;function q(e){const t=e instanceof Error?e.message:String(e??"request_failed");return ft[t]||t}function $t(e){return e?vt.test(e)?null:"invalid_bvid_format":"bvid_required"}function _t(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function xt(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function wt(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(i=>yt[i]||i).join("；")}function St(e){const t=String(e??"").trim().toLowerCase();return gt[t]||t||"-"}function Et(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":t%60===0?`${t/60} 分钟`:`${t} 秒`}function Ct(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":`${t} 次/分钟`}function qt(e,t){const i=Number(t??0);if(!Number.isFinite(i)||i<=0)return"暂无视频";const s=Number(e??0);return`覆盖率 ${((Number.isFinite(s)?Math.min(i,Math.max(0,s)):0)/i*100).toFixed(1).replace(/\.0$/,"")}%`}function kt(e,t,i){const s=String(e??"").trim().toLowerCase();if(!s)return"-";const r=ht[s]||{label:s,cls:"badge-muted"},l=s==="error"&&t?ue[String(t).trim().toLowerCase()]||String(t):"",a=l?` title="${d(l)}"`:"",p=typeof i=="number"&&Number.isFinite(i)?`评论游标: ${i}`:"",n=[l,p].filter(Boolean).map(b=>`<div class="form-hint" style="margin-top:4px;">${d(b)}</div>`).join("");return`<span class="status-badge ${r.cls}"${a}>${d(r.label)}</span>${n}`}function Lt(e){return e?B(e):"-"}function Tt(e){if(e==="true")return!0;if(e==="false")return!1}function Bt(e){return e==="true"?"暂无轮询中视频":e==="false"?"暂无已停用视频":"暂无视频"}function V(e){return typeof(e==null?void 0:e.aid)=="number"&&Number.isFinite(e.aid)}function Mt(e){return e.filter(t=>!V(t)).length}function Pt(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)).length}function At(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)&&!V(t)).length}function jt(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&V(t)).length}function Nt(e){return e.filter(t=>(t==null?void 0:t.poll_enabled)&&!(t!=null&&t.last_polled_at)).length}function It(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="error").length}function Ht(e){return e.filter(t=>{const i=String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase();return i==="ok"||i==="no_new"}).length}function Ot(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="ok").length}function Rt(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="no_new").length}function Dt(e){return e.filter(t=>!(t!=null&&t.last_polled_at)).length}function Ut(e){return e.filter(t=>V(t)&&!(t!=null&&t.last_polled_at)).length}function Vt(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function Wt(e){return e.filter(t=>typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function Jt(e){return e.filter(t=>String((t==null?void 0:t.title)??"").trim().length>0).length}function Kt(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0).length}function zt(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&Number((t==null?void 0:t.comment_count)??0)<=0).length}function Ft(e){return e.filter(t=>typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function Gt(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function Yt(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)<=0&&typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function Zt(e){return e.filter(t=>V(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function Qt(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(V(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid))).length}function Xt(e){return e.reduce((t,i)=>{const s=Number((i==null?void 0:i.comment_count)??0);return t+(Number.isFinite(s)&&s>0?s:0)},0)}function ei(e){const i=V(e)?`aid: ${e.aid}`:ue.no_aid;return`${d((e==null?void 0:e.bvid)||"-")}${i?`<div class="form-hint" style="margin-top:4px;">${d(i)}</div>`:""}`}function ti(e){const t=[];return typeof(e==null?void 0:e.owner_mid)=="number"&&Number.isFinite(e.owner_mid)&&t.push(`UP主 MID: ${e.owner_mid}`),e!=null&&e.updated_at&&t.push(`更新: ${B(e.updated_at)}`),e!=null&&e.created_at&&t.push(`创建: ${B(e.created_at)}`),`${d((e==null?void 0:e.title)||"-")}${t.map(i=>`<div class="form-hint" style="margin-top:4px;">${d(i)}</div>`).join("")}`}function ii(e){const t=V(e),i=t?"":" disabled",s=t?"":` title="${d(ue.no_aid)}"`;return`<button class="btn btn-sm bili-sync" data-id="${d(e.id||e.video_id)}" data-has-aid="${t?"true":"false"}"${i}${s}>同步</button>`}function li(e,t,i,s=0,r=ee,l=[]){const a=i==="true"?"轮询中":i==="false"?"已停用":"全部",p=Math.floor(s/r)+1,n=Math.max(1,Math.ceil(e/r)),b=Pt(l),c=Math.max(0,l.length-b),h=At(l),m=jt(l),$=Nt(l),y=Mt(l),f=Math.max(0,l.length-y),C=It(l),E=Ht(l),W=Ot(l),O=Rt(l),R=Dt(l),D=Ut(l),u=Math.max(0,l.length-R),P=Wt(l),A=Math.max(0,l.length-P),J=Jt(l),_=Math.max(0,l.length-J),U=Kt(l),K=Math.max(0,l.length-U),G=zt(l),z=Ft(l),L=Gt(l),j=Yt(l),N=Math.max(0,l.length-z),Y=Vt(l),F=Zt(l),Z=Math.max(0,l.length-F),Q=Qt(l),I=Xt(l),ie=y>0?`，当前页缺少 aid ${y} 条`:"",pe=i===""&&b>0?`，当前页轮询开启 ${b} 条`:"",be=i===""&&c>0?`，当前页轮询停用 ${c} 条`:"",ve=i===""&&h>0?`，轮询开启但缺少 aid ${h} 条`:"",fe=i===""&&m>0?`，轮询停用但可同步 ${m} 条`:"",ye=i===""&&$>0?`，轮询开启但尚未轮询 ${$} 条`:"",ge=f>0?`，可同步 ${f} 条`:"",he=E>0?`，正常轮询 ${E} 条`:"",me=W>0?`，成功轮询 ${W} 条`:"",$e=O>0?`，无新增 ${O} 条`:"",_e=C>0?`，轮询失败 ${C} 条`:"",xe=u>0?`，已有轮询记录 ${u} 条`:"",we=R>0?`，尚未轮询 ${R} 条`:"",re=D>0?`，可同步但尚未轮询 ${D} 条`:"",Se=P>0?`，已识别 UP 主 ${P} 条`:"",Ee=A>0?`，缺少 UP 主 ${A} 条`:"",Ce=J>0?`，已抓取标题 ${J} 条`:"",ae=_>0?`，缺少标题 ${_} 条`:"",qe=F>0?`，信息完整 ${F} 条`:"",ne=Z>0?`，信息不完整 ${Z} 条`:"",ke=Q>0?`，已轮询但信息不完整 ${Q} 条`:"",Le=U>0?`，已有评论视频 ${U} 条`:"",Te=K>0?`，无评论视频 ${K} 条`:"",Be=G>0?`，已轮询但无评论 ${G} 条`:"",Me=z>0?`，已有评论游标 ${z} 条`:"",Pe=L>0?`，有评论但无游标 ${L} 条`:"",Ae=j>0?`，无评论但有游标 ${j} 条`:"",o=N>0?`，无评论游标 ${N} 条`:"",oe=Y>0?`，已轮询但无游标 ${Y} 条`:"",tt=I>0?`，关联评论 ${I} 条`:"";return`筛选: ${a}，共 ${e} 条，当前展示 ${t} 条，第 ${p}/${n} 页${pe}${be}${ie}${ve}${fe}${ye}${ge}${he}${me}${$e}${_e}${xe}${we}${re}${Se}${Ee}${Ce}${ae}${qe}${ne}${ke}${Le}${Te}${Be}${Me}${Pe}${Ae}${o}${oe}${tt}`}function We(e,t={}){const i=Number((e==null?void 0:e.videos)??0),s=Number((e==null?void 0:e.comments)??0),r=Number((e==null?void 0:e.events_injected)??s),l=t.subject||(i===1?"视频":"轮询");return s>0||r>0?`${l}完成，处理 ${i} 个视频，新增 ${s} 条评论，注入 ${r} 个事件。`:i>0?`${l}完成，处理 ${i} 个视频，暂无新增评论。`:`${l}完成，暂无可处理视频。`}function x(e,t=Date.now()){if(!e)return{hasExpiry:!1,expired:!1,expiringSoon:!1,label:"未设置",cls:"badge-muted",detail:""};const i=new Date(e);if(Number.isNaN(i.getTime()))return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"时间异常",cls:"badge-danger",detail:String(e)};const s=i.getTime()-t;return s<=0?{hasExpiry:!0,expired:!0,expiringSoon:!1,label:"已过期",cls:"badge-danger",detail:B(e)}:s<=mt?{hasExpiry:!0,expired:!1,expiringSoon:!0,label:"即将过期",cls:"badge-warning",detail:B(e)}:{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"有效",cls:"badge-success",detail:B(e)}}function si(e){const t=x(e),i=t.detail?`<div class="form-hint" style="margin-top:4px;">${d(t.detail)}</div>`:"";return`<span class="status-badge ${t.cls}">${d(t.label)}</span>${i}`}function Je(e,t="-"){const i=[];return e!=null&&e.updated_at&&i.push(`更新: ${B(e.updated_at)}`),e!=null&&e.created_at&&i.push(`创建: ${B(e.created_at)}`),`${d((e==null?void 0:e.name)||t)}${i.map(s=>`<div class="form-hint" style="margin-top:4px;">${d(s)}</div>`).join("")}`}function ri(e){return(e==null?void 0:e.cls)==="badge-danger"?"var(--danger-color)":(e==null?void 0:e.cls)==="badge-warning"?"var(--warning-color)":(e==null?void 0:e.cls)==="badge-success"?"var(--success-color)":"var(--grey-2)"}function S(e){return!!(e!=null&&e.has_sessdata&&(e!=null&&e.has_bili_jct)&&(e!=null&&e.buvid3))}function ai(e){const t=[];return e!=null&&e.has_sessdata||t.push("SESSDATA"),e!=null&&e.has_bili_jct||t.push("bili_jct"),e!=null&&e.buvid3||t.push("buvid3"),t}function ni(e,t){return e?t?"凭证字段完整":"凭证字段缺失":"未配置凭证"}function oi(e){var a,p,n,b,c,h;const t=!!((p=(a=e==null?void 0:e.checks)==null?void 0:a.auth)!=null&&p.ready),i=!!((b=(n=e==null?void 0:e.checks)==null?void 0:n.worker_or_publish)!=null&&b.ready),s=!!((c=e==null?void 0:e.signals)!=null&&c.polling_worker_enabled),r=!!((h=e==null?void 0:e.signals)!=null&&h.native_publish_enabled);return s||r?`${t?"鉴权已就绪":"鉴权未就绪"}，${i?"执行链路可用":"执行链路阻塞"}`:"当前无需鉴权"}function di(e){var r,l,a;const t=!!((r=e==null?void 0:e.signals)!=null&&r.publish_mode_config_ready),i=!!((l=e==null?void 0:e.signals)!=null&&l.native_publish_enabled),s=!!((a=e==null?void 0:e.signals)!=null&&a.polling_worker_enabled);return[t?"模式配置就绪":"模式配置缺失",i?"原生发布启用":"原生发布停用",s?"轮询链路启用":"轮询链路停用"].join("，")}function ci(e){const t=[e!=null&&e.has_sessdata?"SESSDATA":"",e!=null&&e.has_bili_jct?"bili_jct":"",e!=null&&e.buvid3?`buvid3:${e.buvid3}`:""].filter(Boolean).join(" / ")||"-",i=S(e)?"字段完整":`缺少 ${ai(e).join(" / ")}`;return`${d(t)}${i?`<div class="form-hint" style="margin-top:4px;">${d(i)}</div>`:""}`}function Ye(e="",t=""){return`激活: ${e==="active"?"仅激活":e==="inactive"?"仅未激活":"全部"}，过期: ${t==="expired"?"已过期":t==="expiring"?"即将过期":t==="valid"?"有效":t==="unset"?"未设置过期时间":"全部"}`}function ui(e,t="",i="",s=e.length){const r=e.length,l=Ze(e,t,i),a=e.filter(o=>o.is_active||o.active),p=e.filter(o=>!(o.is_active||o.active)),n=a.length,b=p.length,c=e.filter(o=>S(o)).length,h=e.filter(o=>(o.is_active||o.active)&&S(o)).length,m=Math.max(0,c-h),$=Math.max(0,n-h),y=Math.max(0,b-m),f=a.filter(o=>o.last_used_at).length,C=Math.max(0,n-f),E=p.filter(o=>o.last_used_at).length,W=Math.max(0,b-E),O=e.filter(o=>S(o)&&o.last_used_at).length,R=Math.max(0,c-O),D=Math.max(0,r-c),u=e.filter(o=>!S(o)&&o.last_used_at).length,P=Math.max(0,D-u),A=e.filter(o=>!o.last_used_at).length,J=Math.max(0,r-A),_=Date.now(),U=e.filter(o=>S(o)&&x(o.expires_at,_).hasExpiry&&!x(o.expires_at,_).expired).length,K=e.filter(o=>S(o)&&x(o.expires_at,_).expired).length,G=e.filter(o=>S(o)&&x(o.expires_at,_).expiringSoon).length,z=e.filter(o=>S(o)&&!x(o.expires_at,_).hasExpiry).length,L=e.map(o=>x(o.expires_at,_)),j=a.map(o=>x(o.expires_at,_)),N=p.map(o=>x(o.expires_at,_)),Y=L.filter(o=>o.hasExpiry).length,F=L.filter(o=>o.hasExpiry&&!o.expired).length,Z=L.filter(o=>o.expired).length,Q=L.filter(o=>o.expiringSoon).length,I=j.filter(o=>o.hasExpiry&&!o.expired).length,ie=j.filter(o=>o.expired).length,pe=j.filter(o=>o.expiringSoon).length,be=j.filter(o=>!o.hasExpiry).length,ve=N.filter(o=>o.hasExpiry&&!o.expired).length,fe=N.filter(o=>o.expired).length,ye=N.filter(o=>o.expiringSoon).length,ge=N.filter(o=>!o.hasExpiry).length,he=e.filter(o=>!S(o)&&x(o.expires_at,_).hasExpiry&&!x(o.expires_at,_).expired).length,me=e.filter(o=>!S(o)&&x(o.expires_at,_).expired).length,$e=e.filter(o=>!S(o)&&x(o.expires_at,_).expiringSoon).length,_e=e.filter(o=>!S(o)&&!x(o.expires_at,_).hasExpiry).length,xe=L.filter(o=>!o.hasExpiry).length,we=Ye(t,i),re=l.filter(o=>S(o)).length,Se=Math.max(0,l.length-re),Ee=l.filter(o=>S(o)&&o.last_used_at).length,Ce=l.filter(o=>!S(o)&&o.last_used_at).length,ae=l.filter(o=>o.is_active||o.active).length,qe=Math.max(0,l.length-ae),ne=l.filter(o=>o.last_used_at).length,ke=Math.max(0,l.length-ne),Le=l.filter(o=>{const oe=x(o.expires_at,_);return oe.hasExpiry&&!oe.expired}).length,Te=l.filter(o=>x(o.expires_at,_).expired).length,Be=l.filter(o=>x(o.expires_at,_).expiringSoon).length,Me=l.filter(o=>!x(o.expires_at,_).hasExpiry).length,Pe=t?"":`，激活 ${ae} 个，未激活 ${qe} 个`,Ae=t||i?`，筛选结果完整 ${re} 个，完整且已使用 ${Ee} 个，缺字段 ${Se} 个，缺字段但已使用 ${Ce} 个${Pe}，已使用 ${ne} 个，从未使用 ${ke} 个，有效 ${Le} 个，已过期 ${Te} 个，即将过期 ${Be} 个，未设置过期 ${Me} 个`:"";return`共 ${r} 个凭证，激活中 ${n} 个，未激活 ${b} 个，激活且完整 ${h} 个，未激活但完整 ${m} 个，激活但缺字段 ${$} 个，未激活且缺字段 ${y} 个，激活且已使用 ${f} 个，激活但从未使用 ${C} 个，未激活且已使用 ${E} 个，未激活但从未使用 ${W} 个，激活且有效 ${I} 个，未激活且有效 ${ve} 个，激活已过期 ${ie} 个，未激活已过期 ${fe} 个，激活即将过期 ${pe} 个，未激活即将过期 ${ye} 个，激活未设置过期 ${be} 个，未激活未设置过期 ${ge} 个，字段完整 ${c} 个，完整且有效 ${U} 个，完整且已过期 ${K} 个，完整即将过期 ${G} 个，完整未设置过期 ${z} 个，完整且已使用 ${O} 个，完整但未使用 ${R} 个，字段缺失 ${D} 个，缺字段但已使用 ${u} 个，缺字段且未使用 ${P} 个，缺字段但有效 ${he} 个，缺字段且已过期 ${me} 个，缺字段即将过期 ${$e} 个，缺字段未设置过期 ${_e} 个，已使用 ${J} 个，从未使用 ${A} 个，设置过期时间 ${Y} 个，有效 ${F} 个，已过期 ${Z} 个，即将过期 ${Q} 个，未设置 ${xe} 个；筛选: ${we}，当前展示 ${s} 个${Ae}`}function Ze(e,t="",i=""){const s=Date.now();return e.filter(r=>{const l=r.is_active||r.active;if(t==="active"&&!l||t==="inactive"&&l)return!1;const a=x(r.expires_at,s);return!(i==="expired"&&!a.expired||i==="expiring"&&!a.expiringSoon||i==="valid"&&(!a.hasExpiry||a.expired)||i==="unset"&&a.hasExpiry)})}function pi(e="",t=""){return e||t?`暂无匹配筛选条件的凭证（${Ye(e,t)}）`:"暂无凭证"}function Ke(e,t,i){const s=e.querySelector(i);t.forEach(r=>{const l=e.querySelector(r);l==null||l.addEventListener("keydown",a=>{a.key==="Enter"&&(a.preventDefault(),s.disabled||s.click())})})}async function bi(e){let t=0;e.innerHTML=`
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
  `;async function i(){var a,p,n,b,c,h,m,$,y,f,C,E,W,O,R,D;const l=e.querySelector("#bili-status-cards");l.innerHTML='<div class="page-loading">加载中...</div>';try{const u=await k.getBilibiliStatus(),P=Number((u==null?void 0:u.video_count)??0),A=Number(((a=u==null?void 0:u.videos)==null?void 0:a.poll_enabled_count)??0),J=Math.max(0,P-A),_=qt(A,P),U=!!((p=u==null?void 0:u.diagnostics)!=null&&p.ready),K=wt((n=u==null?void 0:u.diagnostics)==null?void 0:n.blocking_reasons),G=Je(u==null?void 0:u.credential,"未配置"),z=!!(((c=(b=u==null?void 0:u.diagnostics)==null?void 0:b.signals)==null?void 0:c.credential_present)??((m=(h=u==null?void 0:u.diagnostics)==null?void 0:h.release_gates)==null?void 0:m.credential_present)),L=!!(((y=($=u==null?void 0:u.diagnostics)==null?void 0:$.signals)==null?void 0:y.credential_complete)??((C=(f=u==null?void 0:u.diagnostics)==null?void 0:f.release_gates)==null?void 0:C.credential_complete)),j=ni(z,L),N=oi(u==null?void 0:u.diagnostics),Y=St((E=u==null?void 0:u.diagnostics)==null?void 0:E.effective_publish_mode),F=di(u==null?void 0:u.diagnostics),Z=Et((W=u==null?void 0:u.config)==null?void 0:W.poll_interval_seconds),Q=Ct((O=u==null?void 0:u.config)==null?void 0:O.rate_limit_per_minute),I=x((R=u==null?void 0:u.credential)==null?void 0:R.expires_at),ie=Lt((D=u==null?void 0:u.credential)==null?void 0:D.last_used_at);l.innerHTML=`
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
          <div class="stat-value">${P}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${A}</div>
          <div class="form-hint" style="margin-top:6px;">${d(_)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">停用视频</div>
          <div class="stat-value">${J}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${G}</div>
          <div class="form-hint" style="margin-top:6px;">${d(j)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${U?"var(--success-color)":"var(--danger-color)"}">${U?"就绪":"阻塞"}</div>
          <div class="form-hint" style="margin-top:6px;">${d(N)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布模式</div>
          <div class="stat-value">${d(Y)}</div>
          <div class="form-hint" style="margin-top:6px;">${d(F)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询间隔</div>
          <div class="stat-value">${d(Z)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">速率限制</div>
          <div class="stat-value">${d(Q)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">凭证过期</div>
          <div class="stat-value" style="font-size:14px; color:${ri(I)}">${d(I.label)}</div>
          ${I.detail?`<div class="form-hint" style="margin-top:6px;">${d(I.detail)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">最近使用</div>
          <div class="stat-value" style="font-size:14px;">${d(ie)}</div>
        </div>
        ${K?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">阻塞原因: ${d(K)}</div>`:""}
      `}catch(u){l.innerHTML=`<div class="page-error">状态加载失败: ${d(q(u))}</div>`}}async function s(){const l=e.querySelector("#bili-videos-wrapper"),a=e.querySelector("#bili-video-summary"),p=e.querySelector("#bili-video-filter-btn"),n=e.querySelector("#bili-video-poll-filter"),b=e.querySelector("#bili-video-prev"),c=e.querySelector("#bili-video-next"),h=n.value;a.textContent="加载中...",l.innerHTML='<div class="page-loading">加载中...</div>',n.disabled=!0,p.disabled=!0,b.disabled=!0,c.disabled=!0;try{const m=await k.getBilibiliVideos({limit:ee,offset:t,poll_enabled:Tt(h)}),$=Array.isArray(m==null?void 0:m.items)?m.items:Array.isArray(m)?m:[],y=Number((m==null?void 0:m.total)??$.length);if($.length===0&&y>0&&t>0){t=Math.max(0,t-ee),await s();return}if(a.textContent=li(y,$.length,h,t,ee,$),b.disabled=t<=0,c.disabled=t+$.length>=y,$.length===0){l.innerHTML=`<div class="table-empty">${d(Bt(h))}</div>`;return}l.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${$.map(f=>`<tr data-id="${d(f.id||f.video_id)}">
              <td class="cell-id">${ei(f)}</td>
              <td class="cell-truncate">${ti(f)}</td>
              <td>${Oe(f.poll_enabled)}</td>
              <td>${f.comment_count??"-"}</td>
              <td class="cell-time">${f.last_polled_at?te(f.last_polled_at):"-"}</td>
              <td>${kt(f.last_poll_status,f.last_poll_error,f.last_rpid)}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${d(f.id||f.video_id)}">${f.poll_enabled?"禁用轮询":"启用轮询"}</button>
                ${ii(f)}
                <button class="btn btn-sm btn-danger bili-delete" data-id="${d(f.id||f.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,l.querySelectorAll(".bili-toggle-poll").forEach(f=>{f.addEventListener("click",async()=>{f.disabled=!0;try{await k.toggleBilibiliVideoPoll(f.dataset.id),v("操作成功","success"),await Promise.all([i(),s()])}catch(C){v(`失败: ${q(C)}`,"error")}finally{f.disabled=!1}})}),l.querySelectorAll(".bili-sync").forEach(f=>{f.addEventListener("click",async()=>{if(f.dataset.hasAid==="false"){v(ue.no_aid,"warning");return}const C=f.textContent;f.disabled=!0,f.textContent="同步中...";try{const E=await k.syncBilibiliVideo(f.dataset.id);v(We(E==null?void 0:E.result,{subject:"同步"}),"success"),await Promise.all([i(),s()])}catch(E){v(`同步失败: ${q(E)}`,"error")}finally{f.disabled=!1,f.textContent=C}})}),l.querySelectorAll(".bili-delete").forEach(f=>{f.addEventListener("click",async()=>{if(confirm("确定删除此视频？")){f.disabled=!0;try{await k.deleteBilibiliVideo(f.dataset.id),v("已删除","success"),await Promise.all([i(),s()])}catch(C){v(`删除失败: ${q(C)}`,"error")}finally{f.disabled=!1}}})})}catch(m){a.textContent="视频加载失败",l.innerHTML=`<div class="page-error">加载失败: ${d(q(m))}</div>`}finally{n.disabled=!1,p.disabled=!1}}async function r(){const l=e.querySelector("#bili-creds-wrapper"),a=e.querySelector("#bili-cred-summary"),p=e.querySelector("#bili-cred-active-filter"),n=e.querySelector("#bili-cred-expiry-filter"),b=p.value,c=n.value;a.textContent="加载中...",l.innerHTML='<div class="page-loading">加载中...</div>',p.disabled=!0,n.disabled=!0;try{const h=await k.getBilibiliCredentials(),m=Array.isArray(h==null?void 0:h.items)?h.items:Array.isArray(h)?h:[],$=Ze(m,b,c);if(a.textContent=ui(m,b,c,$.length),$.length===0){l.innerHTML=`<div class="table-empty">${d(pi(b,c))}</div>`;return}l.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期状态</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${$.map(y=>`<tr data-id="${d(y.id||y.credential_id)}">
              <td>${Je(y)}</td>
              <td class="cell-id">${ci(y)}</td>
              <td>${Oe(y.is_active||y.active)}</td>
              <td>${si(y.expires_at)}</td>
              <td class="cell-time">${y.last_used_at?te(y.last_used_at):"-"}</td>
              <td class="cell-actions">
                ${y.is_active||y.active?"":`<button class="btn btn-sm cred-activate" data-id="${d(y.id||y.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${d(y.id||y.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,l.querySelectorAll(".cred-activate").forEach(y=>{y.addEventListener("click",async()=>{y.disabled=!0;try{await k.activateBilibiliCredential(y.dataset.id),v("已激活","success"),await Promise.all([i(),r()])}catch(f){v(`激活失败: ${q(f)}`,"error")}finally{y.disabled=!1}})}),l.querySelectorAll(".cred-delete").forEach(y=>{y.addEventListener("click",async()=>{if(confirm("确定删除此凭证？")){y.disabled=!0;try{await k.deleteBilibiliCredential(y.dataset.id),v("已删除","success"),await Promise.all([i(),r()])}catch(f){v(`删除失败: ${q(f)}`,"error")}finally{y.disabled=!1}}})})}catch(h){a.textContent="凭证加载失败",l.innerHTML=`<div class="page-error">加载失败: ${d(q(h))}</div>`}finally{p.disabled=!1,n.disabled=!1}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const l=e.querySelector("#bili-video-add"),a=e.querySelector("#bili-video-bvid").value.trim(),p=$t(a);if(p){v(q(p),"warning");return}l.disabled=!0,l.textContent="添加中...";try{await k.addBilibiliVideo(a),v("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([i(),s()])}catch(n){v(`添加失败: ${q(n)}`,"error")}finally{l.disabled=!1,l.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{var b;const l=e.querySelector("#cred-add"),a=xt(e.querySelector("#cred-expires").value),p={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:a},n=_t(p);if(n){v(q(n),"warning");return}l.disabled=!0,l.textContent="添加中...";try{const c=await k.addBilibiliCredential(p);v((b=c==null?void 0:c.item)!=null&&b.is_active?"凭证添加成功，已自动激活":"凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([i(),r()])}catch(c){v(`添加失败: ${q(c)}`,"error")}finally{l.disabled=!1,l.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const l=e.querySelector("#bili-poll-btn");l.disabled=!0,l.textContent="轮询中...";try{const a=await k.triggerBilibiliPoll();v(We(a==null?void 0:a.result),"success"),await Promise.all([i(),s()])}catch(a){v(`轮询失败: ${q(a)}`,"error")}finally{l.disabled=!1,l.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",async()=>{const l=e.querySelector("#bili-refresh");l.disabled=!0,l.textContent="刷新中...";try{await Promise.all([i(),s(),r()])}finally{l.disabled=!1,l.innerHTML='<svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新'}}),e.querySelector("#bili-video-filter-btn").addEventListener("click",()=>{t=0,s()}),e.querySelector("#bili-video-poll-filter").addEventListener("change",()=>{t=0,s()}),e.querySelector("#bili-video-prev").addEventListener("click",()=>{t<=0||(t=Math.max(0,t-ee),s())}),e.querySelector("#bili-video-next").addEventListener("click",()=>{t+=ee,s()}),e.querySelector("#bili-cred-active-filter").addEventListener("change",r),e.querySelector("#bili-cred-expiry-filter").addEventListener("change",r),Ke(e,["#bili-video-bvid"],"#bili-video-add"),Ke(e,["#cred-name","#cred-sessdata","#cred-bili-jct","#cred-buvid3","#cred-buvid4","#cred-expires"],"#cred-add"),await Promise.all([i(),s(),r()])}const ze=M();async function vi(e){e.innerHTML=`
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
  `,e.querySelector("#query-comment-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-comment-id").value.trim(),i=e.querySelector("#query-comment-result");if(!t){v("请输入 Comment ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>';try{const s=await ze.getComment(t);i.innerHTML=`
        <div class="detail-card">
          ${Object.entries(s||{}).map(([r,l])=>`
            <div class="detail-row">
              <span class="detail-key">${d(r)}</span>
              <span class="detail-value">${d(typeof l=="object"?JSON.stringify(l,null,2):String(l??"-"))}</span>
            </div>
          `).join("")}
        </div>
      `}catch(s){i.innerHTML=`<div class="page-error">查询失败: ${d(s.message)}</div>`}}),e.querySelector("#query-job-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-job-id").value.trim(),i=e.querySelector("#query-job-result");if(!t){v("请输入 Job ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>';try{const s=await ze.getJob(t);i.innerHTML=`
        <div class="detail-card">
          ${Object.entries(s||{}).map(([l,a])=>`
            <div class="detail-row">
              <span class="detail-key">${d(l)}</span>
              <span class="detail-value">${d(typeof a=="object"?JSON.stringify(a,null,2):String(a??"-"))}</span>
            </div>
          `).join("")}
        </div>
        ${s!=null&&s.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${d(s.comment_id)}">查看关联评论 →</a></div>`:""}
      `;const r=i.querySelector("#query-goto-comment");r&&r.addEventListener("click",()=>{e.querySelector("#query-comment-id").value=r.dataset.id,e.querySelector("#query-comment-btn").click()})}catch(s){i.innerHTML=`<div class="page-error">查询失败: ${d(s.message)}</div>`}})}const He={dashboard:{render:Ge,title:"仪表盘"},jobs:{render:rt,title:"任务管理"},"daily-metrics":{render:nt,title:"每日指标"},knowledge:{render:ot,title:"知识库"},"role-cards":{render:dt,title:"角色卡"},profiles:{render:ct,title:"风格配置"},gateway:{render:pt,title:"网关"},audit:{render:bt,title:"审计日志"},bilibili:{render:bi,title:"B站集成"},query:{render:vi,title:"查询"}};let Qe=null;function fi(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function Xe(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function et(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function yi(e){e.preventDefault();const t=document.getElementById("login-api-key"),i=document.getElementById("login-error"),s=t.value.trim();if(s){window.__ADMIN_API_KEY__=s;try{await g("/api/admin/overview"),sessionStorage.setItem("admin_api_key",s),et(),De("dashboard")}catch{i.textContent="API Key 无效或服务不可用",i.style.display="block",window.__ADMIN_API_KEY__=""}}}function gi(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",Xe()}function De(e){if(!He[e])return;Qe=e,document.querySelectorAll("#nav-list .nav-item").forEach(i=>{i.classList.toggle("active",i.dataset.page===e)}),document.getElementById("page-title").textContent=He[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',He[e].render(t).catch(i=>{t.innerHTML=`<div class="page-error">加载失败: ${i.message}</div>`})}function hi(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==Qe&&De(t)})})}function mi(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),i=document.getElementById("expand-left-btn");t&&i&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),i.style.display="block"}),i.addEventListener("click",()=>{e.classList.remove("collapsed"),i.style.display="none"}))}function $i(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let i=0;e.addEventListener("click",()=>{i=(i+1)%t.length,t[i]?document.body.setAttribute("data-theme",t[i]):document.body.removeAttribute("data-theme")})}function _i(){mi(),$i(),hi(),document.getElementById("login-form").addEventListener("submit",yi),document.getElementById("logout-btn").addEventListener("click",gi),fi()?(et(),De("dashboard")):Xe()}_i();
