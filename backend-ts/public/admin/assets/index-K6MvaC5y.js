(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const l of r)if(l.type==="childList")for(const a of l.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function i(r){const l={};return r.integrity&&(l.integrity=r.integrity),r.referrerPolicy&&(l.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?l.credentials="include":r.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(r){if(r.ep)return;r.ep=!0;const l=i(r);fetch(r.href,l)}})();function Ae(e,t,i){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof i=="string"&&i.trim()?i.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function $e(){return(window.__ADMIN_API_KEY__||"").trim()}async function m(e,t={}){const i=$e(),s=new Headers(t.headers||{});i&&s.set("x-api-key",i);const r=await fetch(e,{...t,headers:s}),l=await r.json().catch(()=>({}));if(!r.ok){const a=(l==null?void 0:l.detail)||(l==null?void 0:l.error);throw new Error(Ae(a,r.status,r.statusText))}return l}async function ve(e,t){const i=$e(),s=new Headers;i&&s.set("x-api-key",i);const r=await fetch(e,{headers:s});if(!r.ok)throw new Error("download_failed");const l=await r.blob(),a=URL.createObjectURL(l),c=document.createElement("a");c.href=a,c.download=t,document.body.appendChild(c),c.click(),document.body.removeChild(c),URL.revokeObjectURL(a)}function L(e){const t=new URLSearchParams;for(const[s,r]of Object.entries(e))r!=null&&r!==""&&t.set(s,String(r));const i=t.toString();return i?`?${i}`:""}function M(){return{getOverview(){return m("/api/admin/overview")},getJobs({status:e,limit:t}={}){return m(`/api/admin/jobs${L({status:e,limit:t})}`)},getJob(e){return m(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return m(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return m(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return m("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return m("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return ve(`/export/jobs.csv${L({status:e,limit:t})}`,"jobs.csv")},getComment(e){return m(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,comment_id:t}={}){return m(`/api/admin/gateway/logs${L({limit:e,comment_id:t})}`)},publishGatewayReply(e){return m("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:i}={}){return m(`/api/admin/audit/summary${L({days:e,action:t,ok:i})}`)},getAuditLogs({limit:e,action:t,ok:i}={}){return m(`/api/audit-log${L({limit:e,action:t,ok:i})}`)},exportAuditCsv({limit:e,action:t,ok:i}={}){return ve(`/export/audit-logs.csv${L({limit:e,action:t,ok:i})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return m(`/api/metrics/daily${L({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return m(`/api/admin/knowledge${L({limit:e,offset:t})}`)},createKnowledgeEntry(e){return m("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return m(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getRoleCards({limit:e,offset:t}={}){return m(`/api/admin/role-cards${L({limit:e,offset:t})}`)},createRoleCard(e){return m("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return m(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return m(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return m(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return m("/api/admin/style-profile")},setStyleProfile(e){return m("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return m("/api/admin/role-profile")},setRoleProfile(e){return m("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return m("/api/admin/bilibili/status")},getBilibiliVideos({poll_enabled:e,limit:t,offset:i}={}){return m(`/api/admin/bilibili/videos${L({poll_enabled:e,limit:t,offset:i})}`)},addBilibiliVideo(e){return m("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return m(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return m(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return m(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return m("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return m("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return m("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return m(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return m(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function o(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function T(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function Pe(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const i=Date.now()-t.getTime(),s=Math.floor(i/1e3);if(s<60)return"刚刚";const r=Math.floor(s/60);if(r<60)return`${r}分钟前`;const l=Math.floor(r/60);if(l<24)return`${l}小时前`;const a=Math.floor(l/24);if(a<30)return`${a}天前`;const c=Math.floor(a/30);return c<12?`${c}个月前`:`${Math.floor(c/12)}年前`}catch{return""}}function J(e){const t=Pe(e),i=T(e);return t?`<span title="${o(i)}">${o(t)}</span>`:`<span title="${o(i)}">${o(i)}</span>`}function A(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const je={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function be(e){if(!e)return"";const t=je[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${o(t.label)}</span>`}function ue(e,t="是",i="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${o(e?t:i)}</span>`}let ne=null;function p(e,t="info"){const i=document.getElementById("app-toast");i&&i.remove(),ne&&clearTimeout(ne);const s={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},r=document.createElement("div");r.id="app-toast",r.className="toast-notification",r.style.setProperty("--toast-color",s[t]||s.info),r.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(r),requestAnimationFrame(()=>r.classList.add("show"));const l=()=>{r.classList.remove("show"),setTimeout(()=>r.remove(),300)};r.querySelector(".toast-close").onclick=l,ne=setTimeout(l,4e3)}const ie=M();async function we(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,i,s,r]=await Promise.all([ie.getOverview().catch(()=>null),ie.getJobs({limit:5}).catch(()=>null),ie.getGatewayLogs({limit:5}).catch(()=>null),ie.getAuditSummary({days:7}).catch(()=>null)]),l=t||{},a=Array.isArray(i==null?void 0:i.items)?i.items:[],c=Array.isArray(s==null?void 0:s.items)?s.items:[];e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${A(l.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${A(l.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${A(l.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${A(l.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${A(l.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${A(c.length)}</div>
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
                ${a.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':a.map(n=>{var b,d;return`<tr>
                    <td class="cell-id">${o((b=n.id)==null?void 0:b.substring(0,8))}</td>
                    <td>${be(n.status)}</td>
                    <td class="cell-truncate">${o((d=n.comment_text)==null?void 0:d.substring(0,60))}</td>
                    <td class="cell-time">${o(T(n.created_at))}</td>
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
              <div class="stat-value">${A(r==null?void 0:r.total)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">成功</div>
              <div class="stat-value" style="color:var(--success-color)">${A(r==null?void 0:r.ok_count)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">失败</div>
              <div class="stat-value" style="color:var(--danger-color)">${A(r==null?void 0:r.failed_count)}</div>
            </div>
          </div>
        </div>
      </div>
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{p("正在刷新...","info"),we(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${o(t.message)}</div>`}}const D=M();async function Ie(e){let t=new Set;e.innerHTML=`
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
  `;const i=e.querySelector("#jobs-status"),s=e.querySelector("#jobs-limit");async function r(){var c;t.clear(),l();const a=e.querySelector("#jobs-table-wrapper");a.innerHTML='<div class="page-loading">加载中...</div>';try{const n=await D.getJobs({status:i.value,limit:s.value}),b=Array.isArray(n==null?void 0:n.items)?n.items:[];if(b.length===0){a.innerHTML='<div class="table-empty">暂无任务</div>';return}a.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${b.map(d=>{var g,h,$,y;return`
              <tr data-id="${o(d.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${o(d.id)}" /></td>
                <td class="cell-id" title="${o(d.id)}">${o((g=d.id)==null?void 0:g.substring(0,8))}</td>
                <td>${be(d.status)}</td>
                <td class="cell-truncate" title="${o(d.comment_text)}">${o((h=d.comment_text)==null?void 0:h.substring(0,80))}</td>
                <td class="cell-truncate">${o(($=d.reply_text)==null?void 0:$.substring(0,60))}</td>
                <td>${(y=d.risk_flags)!=null&&y.length?d.risk_flags.map(f=>`<span class="risk-flag">${o(f)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${J(d.created_at)}</td>
                <td class="cell-actions">
                  ${d.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${o(d.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${o(d.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(c=a.querySelector("#jobs-select-all"))==null||c.addEventListener("change",d=>{const g=d.target.checked;a.querySelectorAll(".job-checkbox").forEach(h=>{h.checked=g,g?t.add(h.dataset.id):t.delete(h.dataset.id)}),l()}),a.querySelectorAll(".job-checkbox").forEach(d=>{d.addEventListener("change",()=>{d.checked?t.add(d.dataset.id):t.delete(d.dataset.id),l()})}),a.querySelectorAll(".job-approve").forEach(d=>{d.addEventListener("click",async()=>{d.disabled=!0,d.textContent="审批中...";try{await D.approveJob(d.dataset.id),p("审批成功","success"),r()}catch(g){p(`审批失败: ${g.message}`,"error"),d.disabled=!1,d.textContent="审批"}})}),a.querySelectorAll(".job-retry").forEach(d=>{d.addEventListener("click",async()=>{d.disabled=!0,d.textContent="重试中...";try{await D.retryJob(d.dataset.id),p("重试已提交","success"),r()}catch(g){p(`重试失败: ${g.message}`,"error"),d.disabled=!1,d.textContent="重试"}})})}catch(n){a.innerHTML=`<div class="page-error">加载失败: ${o(n.message)}</div>`}}function l(){const a=e.querySelector("#jobs-batch-bar"),c=e.querySelector("#jobs-selected-count");t.size>0?(a.style.display="flex",c.textContent=`已选 ${t.size} 项`):a.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",r),e.querySelector("#jobs-refresh").addEventListener("click",r),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await D.exportJobsCsv({status:i.value,limit:s.value}),p("导出成功","success")}catch(a){p(`导出失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await D.batchApprove([...t]),p(`批量审批 ${t.size} 项成功`,"success"),r()}catch(a){p(`批量审批失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await D.batchRetry([...t]),p(`批量重试 ${t.size} 项成功`,"success"),r()}catch(a){p(`批量重试失败: ${a.message}`,"error")}}),await r()}const Ne=M();async function He(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#metrics-days").value,s=e.querySelector("#metrics-table-wrapper");s.innerHTML='<div class="page-loading">加载中...</div>';try{const r=await Ne.getDailyMetrics({days:i}),l=Array.isArray(r==null?void 0:r.items)?r.items:Array.isArray(r)?r:[];if(l.length===0){s.innerHTML='<div class="table-empty">暂无指标数据</div>';return}s.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${l.map(a=>`<tr>
              <td class="cell-time">${o(a.date||a.day)}</td>
              <td>${o(a.comments??a.comment_count??0)}</td>
              <td>${o(a.jobs??a.job_count??0)}</td>
              <td style="color:var(--success-color)">${o(a.published??a.published_count??0)}</td>
              <td style="color:var(--danger-color)">${o(a.failed??a.failed_count??0)}</td>
              <td>${o(a.skipped??a.skipped_count??0)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      `}catch(r){s.innerHTML=`<div class="page-error">加载失败: ${o(r.message)}</div>`}}e.querySelector("#metrics-load").addEventListener("click",t),await t()}const oe=M();async function Oe(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#knowledge-table-wrapper");i.innerHTML='<div class="page-loading">加载中...</div>';try{const s=await oe.getKnowledgeEntries({limit:50}),r=Array.isArray(s==null?void 0:s.items)?s.items:[];if(r.length===0){i.innerHTML='<div class="table-empty">暂无知识条目</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${r.map(l=>{var a,c;return`<tr>
              <td class="cell-id">${o((a=l.id)==null?void 0:a.toString().substring(0,8))}</td>
              <td>${o(l.category)}</td>
              <td>${o(l.title)}</td>
              <td class="cell-truncate">${o((c=l.content)==null?void 0:c.substring(0,80))}</td>
              <td>${ue(l.enabled!==!1)}</td>
              <td class="cell-time">${J(l.created_at)}</td>
              <td class="cell-actions">
                ${l.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${o(l.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".knowledge-disable").forEach(l=>{l.addEventListener("click",async()=>{try{await oe.disableKnowledgeEntry(l.dataset.id),p("已禁用","success"),t()}catch(a){p(`操作失败: ${a.message}`,"error")}})})}catch(s){i.innerHTML=`<div class="page-error">加载失败: ${o(s.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const i=e.querySelector("#knowledge-category").value.trim(),s=e.querySelector("#knowledge-title").value.trim(),r=e.querySelector("#knowledge-content").value.trim();if(!s||!r){p("标题和内容不能为空","warning");return}try{await oe.createKnowledgeEntry({category:i,title:s,content:r}),p("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(l){p(`创建失败: ${l.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const ee=M();let te=!1,w=null;async function Re(e){te=!1,w=null,e.innerHTML=`
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
  `;const t=e.querySelector("#rc-select"),i=e.querySelector("#rc-editor");let s=[];function r(){te=!0}function l(){return te?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function a(n){w=n,e.querySelector("#rc-key").value=(n==null?void 0:n.key)||"",e.querySelector("#rc-key").disabled=!!n,e.querySelector("#rc-name").value=(n==null?void 0:n.name)||"",e.querySelector("#rc-desc").value=(n==null?void 0:n.description)||"",e.querySelector("#rc-system-prompt").value=(n==null?void 0:n.system_prompt)||"",e.querySelector("#rc-tone").value=(n==null?void 0:n.tone)||"",e.querySelector("#rc-constraints").value=typeof(n==null?void 0:n.constraints)=="string"?n.constraints:JSON.stringify((n==null?void 0:n.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=n?`编辑: ${n.name||n.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=n&&n.enabled!==!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=n&&n.enabled!==!1?"inline-flex":"none",i.style.display="block",te=!1}i.querySelectorAll(".form-input").forEach(n=>n.addEventListener("input",r));async function c(){try{const n=await ee.getRoleCards({limit:100});s=Array.isArray(n==null?void 0:n.items)?n.items:Array.isArray(n)?n:[],t.innerHTML='<option value="">-- 新建 --</option>'+s.map(b=>`<option value="${o(b.key)}">${o(b.name||b.key)}${b.enabled===!1?" (禁用)":""}</option>`).join("")}catch(n){p(`加载失败: ${n.message}`,"error")}}t.addEventListener("change",()=>{if(!l()){t.value=(w==null?void 0:w.key)||"";return}const n=t.value,b=s.find(d=>d.key===n);a(b||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{l()&&(t.value="",a(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const n={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},b=e.querySelector("#rc-constraints").value.trim();try{n.constraints=b?JSON.parse(b):""}catch{n.constraints=b}if(!n.key){p("Key 不能为空","warning");return}try{w!=null&&w.key?(await ee.updateRoleCard(w.key,n),p("保存成功","success")):(await ee.createRoleCard(n),p("创建成功","success")),te=!1,await c(),t.value=n.key}catch(d){p(`操作失败: ${d.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(w!=null&&w.key)try{await ee.activateRoleCard(w.key),p("已激活","success"),await c()}catch(n){p(`激活失败: ${n.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(w!=null&&w.key)try{await ee.disableRoleCard(w.key),p("已禁用","success"),await c()}catch(n){p(`禁用失败: ${n.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{c()}),await c()}const le=M();async function De(e){e.innerHTML=`
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
  `;async function t(){try{const[i,s]=await Promise.all([le.getStyleProfile().catch(()=>null),le.getRoleProfile().catch(()=>null)]);i!=null&&i.style&&(e.querySelector("#profile-style").value=i.style,e.querySelector("#profile-style-current").textContent=`当前: ${i.style}`),s!=null&&s.role&&(e.querySelector("#profile-role").value=s.role,e.querySelector("#profile-role-current").textContent=`当前: ${s.role}`)}catch(i){p(`加载配置失败: ${i.message}`,"error")}}e.querySelector("#profile-style-apply").addEventListener("click",async()=>{const i=e.querySelector("#profile-style").value;try{await le.setStyleProfile(i),e.querySelector("#profile-style-current").textContent=`当前: ${i}`,p("风格已更新","success")}catch(s){p(`更新失败: ${s.message}`,"error")}}),e.querySelector("#profile-role-apply").addEventListener("click",async()=>{const i=e.querySelector("#profile-role").value;try{await le.setRoleProfile(i),e.querySelector("#profile-role-current").textContent=`当前: ${i}`,p("角色配置已更新","success")}catch(s){p(`更新失败: ${s.message}`,"error")}}),await t()}function Ve({columns:e,rows:t,empty:i="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${o(i)}</div>`;const s=e.map(l=>`<th class="${l.class||""}">${o(l.label)}</th>`).join(""),r=t.map(l=>`<tr>${e.map(a=>`<td class="${a.class||""}">${a.render?a.render(l):o(l[a.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${s}</tr></thead>
        <tbody>${r}</tbody>
      </table>
    </div>
  `}const fe=M();async function Ue(e){e.innerHTML=`
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
  `;const t=e.querySelector("#gw-reply"),i=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{i.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const r=e.querySelector("#gw-publish-btn"),l=e.querySelector("#gw-comment-id").value.trim(),a=e.querySelector("#gw-reply").value.trim(),c=e.querySelector("#gw-source").value.trim(),n=e.querySelector("#gw-force").checked;if(!l||!a){p("Comment ID 和回复内容不能为空","warning");return}r.disabled=!0,r.textContent="发布中...";try{await fe.publishGatewayReply({comment_id:l,reply_text:a,source:c,force_publish:n}),p("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",i.textContent="0/0",s()}catch(b){p(`发布失败: ${b.message}`,"error")}finally{r.disabled=!1,r.textContent="发布"}});async function s(){const r=e.querySelector("#gw-table-wrapper"),l=e.querySelector("#gw-limit").value;r.innerHTML='<div class="page-loading">加载中...</div>';try{const a=await fe.getGatewayLogs({limit:l}),c=Array.isArray(a==null?void 0:a.items)?a.items:[];if(c.length===0){r.innerHTML='<div class="table-empty">暂无网关日志</div>';return}r.innerHTML=Ve({columns:[{key:"id",label:"ID",class:"cell-id",render:n=>{var b;return o((b=n.id)==null?void 0:b.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:n=>{var b;return o((b=n.comment_id)==null?void 0:b.substring(0,12))}},{key:"status",label:"状态",render:n=>be(n.status)},{key:"platform",label:"平台",render:n=>o(n.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:n=>{var b;return o((b=n.reply_text)==null?void 0:b.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:n=>J(n.created_at)}],rows:c})}catch(a){r.innerHTML=`<div class="page-error">加载失败: ${o(a.message)}</div>`}}e.querySelector("#gw-refresh").addEventListener("click",s),e.querySelector("#gw-filter-btn").addEventListener("click",s),await s()}const de=M();async function Je(e){e.innerHTML=`
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
  `;async function t(){try{const s=await de.getAuditSummary({days:7}),r=e.querySelector("#audit-summary-cards");r.innerHTML=`
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
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function i(){const s=e.querySelector("#audit-table-wrapper");s.innerHTML='<div class="page-loading">加载中...</div>';const r=e.querySelector("#audit-action").value.trim(),l=e.querySelector("#audit-ok").value,a=e.querySelector("#audit-limit").value;try{const c=await de.getAuditLogs({action:r,ok:l,limit:a}),n=Array.isArray(c==null?void 0:c.items)?c.items:[];if(n.length===0){s.innerHTML='<div class="table-empty">暂无审计日志</div>';return}s.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${n.map(b=>{var d;return`<tr>
              <td class="cell-id">${o((d=b.id)==null?void 0:d.toString().substring(0,8))}</td>
              <td>${o(b.action)}</td>
              <td class="cell-truncate">${o(b.target_id||"-")}</td>
              <td>${b.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${o(b.detail||"-")}</td>
              <td class="cell-time">${J(b.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(c){s.innerHTML=`<div class="page-error">加载失败: ${o(c.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),i()}),e.querySelector("#audit-filter-btn").addEventListener("click",i),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await de.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),p("导出成功","success")}catch(s){p(`导出失败: ${s.message}`,"error")}}),await Promise.all([t(),i()])}const C=M(),Ke=/^BV[a-zA-Z0-9]{10}$/,ze={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},We={"auth:no active credential":"缺少可用的激活凭证。","dependency:diagnostics_unavailable":"诊断信息暂时不可用。"},Fe={manual_queue:"人工队列",simulated:"模拟发布",webhook:"Webhook",real_publish:"真实发布",native_bilibili:"原生 B 站发布"},Ge={ok:{label:"成功",cls:"badge-success"},no_new:{label:"无新增",cls:"badge-muted"},error:{label:"失败",cls:"badge-danger"}},re={no_aid:"缺少视频 aid，暂时无法轮询。",retry_exhausted:"评论抓取重试耗尽。"},V=50,Ye=7*24*60*60*1e3;function x(e){const t=e instanceof Error?e.message:String(e??"request_failed");return ze[t]||t}function Ze(e){return e?Ke.test(e)?null:"invalid_bvid_format":"bvid_required"}function Qe(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function Xe(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function et(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(i=>We[i]||i).join("；")}function tt(e){const t=String(e??"").trim().toLowerCase();return Fe[t]||t||"-"}function it(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":t%60===0?`${t/60} 分钟`:`${t} 秒`}function lt(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":`${t} 次/分钟`}function st(e,t){const i=Number(t??0);if(!Number.isFinite(i)||i<=0)return"暂无视频";const s=Number(e??0);return`覆盖率 ${((Number.isFinite(s)?Math.min(i,Math.max(0,s)):0)/i*100).toFixed(1).replace(/\.0$/,"")}%`}function rt(e,t,i){const s=String(e??"").trim().toLowerCase();if(!s)return"-";const r=Ge[s]||{label:s,cls:"badge-muted"},l=s==="error"&&t?re[String(t).trim().toLowerCase()]||String(t):"",a=l?` title="${o(l)}"`:"",c=typeof i=="number"&&Number.isFinite(i)?`评论游标: ${i}`:"",n=[l,c].filter(Boolean).map(b=>`<div class="form-hint" style="margin-top:4px;">${o(b)}</div>`).join("");return`<span class="status-badge ${r.cls}"${a}>${o(r.label)}</span>${n}`}function at(e){return e?T(e):"-"}function nt(e){if(e==="true")return!0;if(e==="false")return!1}function ot(e){return e==="true"?"暂无轮询中视频":e==="false"?"暂无已停用视频":"暂无视频"}function ae(e){return typeof(e==null?void 0:e.aid)=="number"&&Number.isFinite(e.aid)}function dt(e){return e.filter(t=>!ae(t)).length}function ct(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="error").length}function ut(e){return e.filter(t=>{const i=String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase();return i==="ok"||i==="no_new"}).length}function bt(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="ok").length}function pt(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="no_new").length}function vt(e){return e.filter(t=>!(t!=null&&t.last_polled_at)).length}function ft(e){return e.filter(t=>typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function yt(e){return e.filter(t=>String((t==null?void 0:t.title)??"").trim().length>0).length}function mt(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0).length}function gt(e){return e.filter(t=>typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function ht(e){return e.filter(t=>ae(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function $t(e){return e.reduce((t,i)=>{const s=Number((i==null?void 0:i.comment_count)??0);return t+(Number.isFinite(s)&&s>0?s:0)},0)}function wt(e){const i=ae(e)?`aid: ${e.aid}`:re.no_aid;return`${o((e==null?void 0:e.bvid)||"-")}${i?`<div class="form-hint" style="margin-top:4px;">${o(i)}</div>`:""}`}function _t(e){const t=[];return typeof(e==null?void 0:e.owner_mid)=="number"&&Number.isFinite(e.owner_mid)&&t.push(`UP主 MID: ${e.owner_mid}`),e!=null&&e.updated_at&&t.push(`更新: ${T(e.updated_at)}`),e!=null&&e.created_at&&t.push(`创建: ${T(e.created_at)}`),`${o((e==null?void 0:e.title)||"-")}${t.map(i=>`<div class="form-hint" style="margin-top:4px;">${o(i)}</div>`).join("")}`}function St(e){const t=ae(e),i=t?"":" disabled",s=t?"":` title="${o(re.no_aid)}"`;return`<button class="btn btn-sm bili-sync" data-id="${o(e.id||e.video_id)}" data-has-aid="${t?"true":"false"}"${i}${s}>同步</button>`}function xt(e,t,i,s=0,r=V,l=[]){const a=i==="true"?"轮询中":i==="false"?"已停用":"全部",c=Math.floor(s/r)+1,n=Math.max(1,Math.ceil(e/r)),b=dt(l),d=Math.max(0,l.length-b),g=ct(l),h=ut(l),$=bt(l),y=pt(l),f=vt(l),_=Math.max(0,l.length-f),S=ft(l),P=Math.max(0,l.length-S),j=yt(l),N=Math.max(0,l.length-j),B=mt(l),u=Math.max(0,l.length-B),E=gt(l),q=Math.max(0,l.length-E),k=ht(l),H=Math.max(0,l.length-k),O=$t(l),R=b>0?`，当前页缺少 aid ${b} 条`:"",K=d>0?`，可同步 ${d} 条`:"",z=h>0?`，正常轮询 ${h} 条`:"",W=$>0?`，成功轮询 ${$} 条`:"",F=y>0?`，无新增 ${y} 条`:"",G=g>0?`，轮询失败 ${g} 条`:"",Y=_>0?`，已有轮询记录 ${_} 条`:"",Z=f>0?`，尚未轮询 ${f} 条`:"",Q=S>0?`，已识别 UP 主 ${S} 条`:"",X=P>0?`，缺少 UP 主 ${P} 条`:"",I=j>0?`，已抓取标题 ${j} 条`:"",v=N>0?`，缺少标题 ${N} 条`:"",Ee=k>0?`，信息完整 ${k} 条`:"",Ce=H>0?`，信息不完整 ${H} 条`:"",ke=B>0?`，已有评论视频 ${B} 条`:"",Le=u>0?`，无评论视频 ${u} 条`:"",Te=E>0?`，已有评论游标 ${E} 条`:"",Me=q>0?`，无评论游标 ${q} 条`:"",Be=O>0?`，关联评论 ${O} 条`:"";return`筛选: ${a}，共 ${e} 条，当前展示 ${t} 条，第 ${c}/${n} 页${R}${K}${z}${W}${F}${G}${Y}${Z}${Q}${X}${I}${v}${Ee}${Ce}${ke}${Le}${Te}${Me}${Be}`}function ye(e,t={}){const i=Number((e==null?void 0:e.videos)??0),s=Number((e==null?void 0:e.comments)??0),r=Number((e==null?void 0:e.events_injected)??s),l=t.subject||(i===1?"视频":"轮询");return s>0||r>0?`${l}完成，处理 ${i} 个视频，新增 ${s} 条评论，注入 ${r} 个事件。`:i>0?`${l}完成，处理 ${i} 个视频，暂无新增评论。`:`${l}完成，暂无可处理视频。`}function U(e,t=Date.now()){if(!e)return{hasExpiry:!1,expired:!1,expiringSoon:!1,label:"未设置",cls:"badge-muted",detail:""};const i=new Date(e);if(Number.isNaN(i.getTime()))return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"时间异常",cls:"badge-danger",detail:String(e)};const s=i.getTime()-t;return s<=0?{hasExpiry:!0,expired:!0,expiringSoon:!1,label:"已过期",cls:"badge-danger",detail:T(e)}:s<=Ye?{hasExpiry:!0,expired:!1,expiringSoon:!0,label:"即将过期",cls:"badge-warning",detail:T(e)}:{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"有效",cls:"badge-success",detail:T(e)}}function qt(e){const t=U(e),i=t.detail?`<div class="form-hint" style="margin-top:4px;">${o(t.detail)}</div>`:"";return`<span class="status-badge ${t.cls}">${o(t.label)}</span>${i}`}function me(e,t="-"){const i=[];return e!=null&&e.updated_at&&i.push(`更新: ${T(e.updated_at)}`),e!=null&&e.created_at&&i.push(`创建: ${T(e.created_at)}`),`${o((e==null?void 0:e.name)||t)}${i.map(s=>`<div class="form-hint" style="margin-top:4px;">${o(s)}</div>`).join("")}`}function Et(e){return(e==null?void 0:e.cls)==="badge-danger"?"var(--danger-color)":(e==null?void 0:e.cls)==="badge-warning"?"var(--warning-color)":(e==null?void 0:e.cls)==="badge-success"?"var(--success-color)":"var(--grey-2)"}function se(e){return!!(e!=null&&e.has_sessdata&&(e!=null&&e.has_bili_jct)&&(e!=null&&e.buvid3))}function Ct(e){const t=[];return e!=null&&e.has_sessdata||t.push("SESSDATA"),e!=null&&e.has_bili_jct||t.push("bili_jct"),e!=null&&e.buvid3||t.push("buvid3"),t}function kt(e,t){return e?t?"凭证字段完整":"凭证字段缺失":"未配置凭证"}function Lt(e){var a,c,n,b,d,g;const t=!!((c=(a=e==null?void 0:e.checks)==null?void 0:a.auth)!=null&&c.ready),i=!!((b=(n=e==null?void 0:e.checks)==null?void 0:n.worker_or_publish)!=null&&b.ready),s=!!((d=e==null?void 0:e.signals)!=null&&d.polling_worker_enabled),r=!!((g=e==null?void 0:e.signals)!=null&&g.native_publish_enabled);return s||r?`${t?"鉴权已就绪":"鉴权未就绪"}，${i?"执行链路可用":"执行链路阻塞"}`:"当前无需鉴权"}function Tt(e){var r,l,a;const t=!!((r=e==null?void 0:e.signals)!=null&&r.publish_mode_config_ready),i=!!((l=e==null?void 0:e.signals)!=null&&l.native_publish_enabled),s=!!((a=e==null?void 0:e.signals)!=null&&a.polling_worker_enabled);return[t?"模式配置就绪":"模式配置缺失",i?"原生发布启用":"原生发布停用",s?"轮询链路启用":"轮询链路停用"].join("，")}function Mt(e){const t=[e!=null&&e.has_sessdata?"SESSDATA":"",e!=null&&e.has_bili_jct?"bili_jct":"",e!=null&&e.buvid3?`buvid3:${e.buvid3}`:""].filter(Boolean).join(" / ")||"-",i=se(e)?"字段完整":`缺少 ${Ct(e).join(" / ")}`;return`${o(t)}${i?`<div class="form-hint" style="margin-top:4px;">${o(i)}</div>`:""}`}function _e(e="",t=""){return`激活: ${e==="active"?"仅激活":e==="inactive"?"仅未激活":"全部"}，过期: ${t==="expired"?"已过期":t==="expiring"?"即将过期":t==="valid"?"有效":t==="unset"?"未设置过期时间":"全部"}`}function Bt(e,t="",i="",s=e.length){const r=e.length,l=e.filter(v=>v.is_active||v.active),a=e.filter(v=>!(v.is_active||v.active)),c=l.length,n=a.length,b=e.filter(v=>se(v)).length,d=e.filter(v=>(v.is_active||v.active)&&se(v)).length,g=Math.max(0,b-d),h=Math.max(0,c-d),$=Math.max(0,n-g),y=l.filter(v=>v.last_used_at).length,f=Math.max(0,c-y),_=a.filter(v=>v.last_used_at).length,S=Math.max(0,n-_),P=e.filter(v=>se(v)&&v.last_used_at).length,j=Math.max(0,b-P),N=Math.max(0,r-b),B=e.filter(v=>!v.last_used_at).length,u=Math.max(0,r-B),E=Date.now(),q=e.map(v=>U(v.expires_at,E)),k=l.map(v=>U(v.expires_at,E)),H=a.map(v=>U(v.expires_at,E)),O=q.filter(v=>v.hasExpiry).length,R=q.filter(v=>v.hasExpiry&&!v.expired).length,K=q.filter(v=>v.expired).length,z=q.filter(v=>v.expiringSoon).length,W=k.filter(v=>v.hasExpiry&&!v.expired).length,F=k.filter(v=>v.expired).length,G=k.filter(v=>v.expiringSoon).length,Y=k.filter(v=>!v.hasExpiry).length,Z=H.filter(v=>v.expired).length,Q=H.filter(v=>!v.hasExpiry).length,X=q.filter(v=>!v.hasExpiry).length,I=_e(t,i);return`共 ${r} 个凭证，激活中 ${c} 个，未激活 ${n} 个，激活且完整 ${d} 个，未激活但完整 ${g} 个，激活但缺字段 ${h} 个，未激活且缺字段 ${$} 个，激活且已使用 ${y} 个，激活但从未使用 ${f} 个，未激活且已使用 ${_} 个，未激活但从未使用 ${S} 个，激活且有效 ${W} 个，激活已过期 ${F} 个，未激活已过期 ${Z} 个，激活即将过期 ${G} 个，激活未设置过期 ${Y} 个，未激活未设置过期 ${Q} 个，字段完整 ${b} 个，完整且已使用 ${P} 个，完整但未使用 ${j} 个，字段缺失 ${N} 个，已使用 ${u} 个，从未使用 ${B} 个，设置过期时间 ${O} 个，有效 ${R} 个，已过期 ${K} 个，即将过期 ${z} 个，未设置 ${X} 个；筛选: ${I}，当前展示 ${s} 个`}function At(e,t="",i=""){const s=Date.now();return e.filter(r=>{const l=r.is_active||r.active;if(t==="active"&&!l||t==="inactive"&&l)return!1;const a=U(r.expires_at,s);return!(i==="expired"&&!a.expired||i==="expiring"&&!a.expiringSoon||i==="valid"&&(!a.hasExpiry||a.expired)||i==="unset"&&a.hasExpiry)})}function Pt(e="",t=""){return e||t?`暂无匹配筛选条件的凭证（${_e(e,t)}）`:"暂无凭证"}function ge(e,t,i){const s=e.querySelector(i);t.forEach(r=>{const l=e.querySelector(r);l==null||l.addEventListener("keydown",a=>{a.key==="Enter"&&(a.preventDefault(),s.disabled||s.click())})})}async function jt(e){let t=0;e.innerHTML=`
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
  `;async function i(){var a,c,n,b,d,g,h,$,y,f,_,S,P,j,N,B;const l=e.querySelector("#bili-status-cards");l.innerHTML='<div class="page-loading">加载中...</div>';try{const u=await C.getBilibiliStatus(),E=Number((u==null?void 0:u.video_count)??0),q=Number(((a=u==null?void 0:u.videos)==null?void 0:a.poll_enabled_count)??0),k=Math.max(0,E-q),H=st(q,E),O=!!((c=u==null?void 0:u.diagnostics)!=null&&c.ready),R=et((n=u==null?void 0:u.diagnostics)==null?void 0:n.blocking_reasons),K=me(u==null?void 0:u.credential,"未配置"),z=!!(((d=(b=u==null?void 0:u.diagnostics)==null?void 0:b.signals)==null?void 0:d.credential_present)??((h=(g=u==null?void 0:u.diagnostics)==null?void 0:g.release_gates)==null?void 0:h.credential_present)),W=!!(((y=($=u==null?void 0:u.diagnostics)==null?void 0:$.signals)==null?void 0:y.credential_complete)??((_=(f=u==null?void 0:u.diagnostics)==null?void 0:f.release_gates)==null?void 0:_.credential_complete)),F=kt(z,W),G=Lt(u==null?void 0:u.diagnostics),Y=tt((S=u==null?void 0:u.diagnostics)==null?void 0:S.effective_publish_mode),Z=Tt(u==null?void 0:u.diagnostics),Q=it((P=u==null?void 0:u.config)==null?void 0:P.poll_interval_seconds),X=lt((j=u==null?void 0:u.config)==null?void 0:j.rate_limit_per_minute),I=U((N=u==null?void 0:u.credential)==null?void 0:N.expires_at),v=at((B=u==null?void 0:u.credential)==null?void 0:B.last_used_at);l.innerHTML=`
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
          <div class="stat-value">${E}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${q}</div>
          <div class="form-hint" style="margin-top:6px;">${o(H)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">停用视频</div>
          <div class="stat-value">${k}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${K}</div>
          <div class="form-hint" style="margin-top:6px;">${o(F)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${O?"var(--success-color)":"var(--danger-color)"}">${O?"就绪":"阻塞"}</div>
          <div class="form-hint" style="margin-top:6px;">${o(G)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布模式</div>
          <div class="stat-value">${o(Y)}</div>
          <div class="form-hint" style="margin-top:6px;">${o(Z)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询间隔</div>
          <div class="stat-value">${o(Q)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">速率限制</div>
          <div class="stat-value">${o(X)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">凭证过期</div>
          <div class="stat-value" style="font-size:14px; color:${Et(I)}">${o(I.label)}</div>
          ${I.detail?`<div class="form-hint" style="margin-top:6px;">${o(I.detail)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">最近使用</div>
          <div class="stat-value" style="font-size:14px;">${o(v)}</div>
        </div>
        ${R?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">阻塞原因: ${o(R)}</div>`:""}
      `}catch(u){l.innerHTML=`<div class="page-error">状态加载失败: ${o(x(u))}</div>`}}async function s(){const l=e.querySelector("#bili-videos-wrapper"),a=e.querySelector("#bili-video-summary"),c=e.querySelector("#bili-video-filter-btn"),n=e.querySelector("#bili-video-poll-filter"),b=e.querySelector("#bili-video-prev"),d=e.querySelector("#bili-video-next"),g=n.value;a.textContent="加载中...",l.innerHTML='<div class="page-loading">加载中...</div>',n.disabled=!0,c.disabled=!0,b.disabled=!0,d.disabled=!0;try{const h=await C.getBilibiliVideos({limit:V,offset:t,poll_enabled:nt(g)}),$=Array.isArray(h==null?void 0:h.items)?h.items:Array.isArray(h)?h:[],y=Number((h==null?void 0:h.total)??$.length);if($.length===0&&y>0&&t>0){t=Math.max(0,t-V),await s();return}if(a.textContent=xt(y,$.length,g,t,V,$),b.disabled=t<=0,d.disabled=t+$.length>=y,$.length===0){l.innerHTML=`<div class="table-empty">${o(ot(g))}</div>`;return}l.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${$.map(f=>`<tr data-id="${o(f.id||f.video_id)}">
              <td class="cell-id">${wt(f)}</td>
              <td class="cell-truncate">${_t(f)}</td>
              <td>${ue(f.poll_enabled)}</td>
              <td>${f.comment_count??"-"}</td>
              <td class="cell-time">${f.last_polled_at?J(f.last_polled_at):"-"}</td>
              <td>${rt(f.last_poll_status,f.last_poll_error,f.last_rpid)}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${o(f.id||f.video_id)}">${f.poll_enabled?"禁用轮询":"启用轮询"}</button>
                ${St(f)}
                <button class="btn btn-sm btn-danger bili-delete" data-id="${o(f.id||f.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,l.querySelectorAll(".bili-toggle-poll").forEach(f=>{f.addEventListener("click",async()=>{f.disabled=!0;try{await C.toggleBilibiliVideoPoll(f.dataset.id),p("操作成功","success"),await Promise.all([i(),s()])}catch(_){p(`失败: ${x(_)}`,"error")}finally{f.disabled=!1}})}),l.querySelectorAll(".bili-sync").forEach(f=>{f.addEventListener("click",async()=>{if(f.dataset.hasAid==="false"){p(re.no_aid,"warning");return}const _=f.textContent;f.disabled=!0,f.textContent="同步中...";try{const S=await C.syncBilibiliVideo(f.dataset.id);p(ye(S==null?void 0:S.result,{subject:"同步"}),"success"),await Promise.all([i(),s()])}catch(S){p(`同步失败: ${x(S)}`,"error")}finally{f.disabled=!1,f.textContent=_}})}),l.querySelectorAll(".bili-delete").forEach(f=>{f.addEventListener("click",async()=>{if(confirm("确定删除此视频？")){f.disabled=!0;try{await C.deleteBilibiliVideo(f.dataset.id),p("已删除","success"),await Promise.all([i(),s()])}catch(_){p(`删除失败: ${x(_)}`,"error")}finally{f.disabled=!1}}})})}catch(h){a.textContent="视频加载失败",l.innerHTML=`<div class="page-error">加载失败: ${o(x(h))}</div>`}finally{n.disabled=!1,c.disabled=!1}}async function r(){const l=e.querySelector("#bili-creds-wrapper"),a=e.querySelector("#bili-cred-summary"),c=e.querySelector("#bili-cred-active-filter"),n=e.querySelector("#bili-cred-expiry-filter"),b=c.value,d=n.value;a.textContent="加载中...",l.innerHTML='<div class="page-loading">加载中...</div>',c.disabled=!0,n.disabled=!0;try{const g=await C.getBilibiliCredentials(),h=Array.isArray(g==null?void 0:g.items)?g.items:Array.isArray(g)?g:[],$=At(h,b,d);if(a.textContent=Bt(h,b,d,$.length),$.length===0){l.innerHTML=`<div class="table-empty">${o(Pt(b,d))}</div>`;return}l.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期状态</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${$.map(y=>`<tr data-id="${o(y.id||y.credential_id)}">
              <td>${me(y)}</td>
              <td class="cell-id">${Mt(y)}</td>
              <td>${ue(y.is_active||y.active)}</td>
              <td>${qt(y.expires_at)}</td>
              <td class="cell-time">${y.last_used_at?J(y.last_used_at):"-"}</td>
              <td class="cell-actions">
                ${y.is_active||y.active?"":`<button class="btn btn-sm cred-activate" data-id="${o(y.id||y.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${o(y.id||y.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,l.querySelectorAll(".cred-activate").forEach(y=>{y.addEventListener("click",async()=>{y.disabled=!0;try{await C.activateBilibiliCredential(y.dataset.id),p("已激活","success"),await Promise.all([i(),r()])}catch(f){p(`激活失败: ${x(f)}`,"error")}finally{y.disabled=!1}})}),l.querySelectorAll(".cred-delete").forEach(y=>{y.addEventListener("click",async()=>{if(confirm("确定删除此凭证？")){y.disabled=!0;try{await C.deleteBilibiliCredential(y.dataset.id),p("已删除","success"),await Promise.all([i(),r()])}catch(f){p(`删除失败: ${x(f)}`,"error")}finally{y.disabled=!1}}})})}catch(g){a.textContent="凭证加载失败",l.innerHTML=`<div class="page-error">加载失败: ${o(x(g))}</div>`}finally{c.disabled=!1,n.disabled=!1}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const l=e.querySelector("#bili-video-add"),a=e.querySelector("#bili-video-bvid").value.trim(),c=Ze(a);if(c){p(x(c),"warning");return}l.disabled=!0,l.textContent="添加中...";try{await C.addBilibiliVideo(a),p("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([i(),s()])}catch(n){p(`添加失败: ${x(n)}`,"error")}finally{l.disabled=!1,l.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{var b;const l=e.querySelector("#cred-add"),a=Xe(e.querySelector("#cred-expires").value),c={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:a},n=Qe(c);if(n){p(x(n),"warning");return}l.disabled=!0,l.textContent="添加中...";try{const d=await C.addBilibiliCredential(c);p((b=d==null?void 0:d.item)!=null&&b.is_active?"凭证添加成功，已自动激活":"凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([i(),r()])}catch(d){p(`添加失败: ${x(d)}`,"error")}finally{l.disabled=!1,l.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const l=e.querySelector("#bili-poll-btn");l.disabled=!0,l.textContent="轮询中...";try{const a=await C.triggerBilibiliPoll();p(ye(a==null?void 0:a.result),"success"),await Promise.all([i(),s()])}catch(a){p(`轮询失败: ${x(a)}`,"error")}finally{l.disabled=!1,l.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",async()=>{const l=e.querySelector("#bili-refresh");l.disabled=!0,l.textContent="刷新中...";try{await Promise.all([i(),s(),r()])}finally{l.disabled=!1,l.innerHTML='<svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新'}}),e.querySelector("#bili-video-filter-btn").addEventListener("click",()=>{t=0,s()}),e.querySelector("#bili-video-poll-filter").addEventListener("change",()=>{t=0,s()}),e.querySelector("#bili-video-prev").addEventListener("click",()=>{t<=0||(t=Math.max(0,t-V),s())}),e.querySelector("#bili-video-next").addEventListener("click",()=>{t+=V,s()}),e.querySelector("#bili-cred-active-filter").addEventListener("change",r),e.querySelector("#bili-cred-expiry-filter").addEventListener("change",r),ge(e,["#bili-video-bvid"],"#bili-video-add"),ge(e,["#cred-name","#cred-sessdata","#cred-bili-jct","#cred-buvid3","#cred-buvid4","#cred-expires"],"#cred-add"),await Promise.all([i(),s(),r()])}const he=M();async function It(e){e.innerHTML=`
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
  `,e.querySelector("#query-comment-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-comment-id").value.trim(),i=e.querySelector("#query-comment-result");if(!t){p("请输入 Comment ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>';try{const s=await he.getComment(t);i.innerHTML=`
        <div class="detail-card">
          ${Object.entries(s||{}).map(([r,l])=>`
            <div class="detail-row">
              <span class="detail-key">${o(r)}</span>
              <span class="detail-value">${o(typeof l=="object"?JSON.stringify(l,null,2):String(l??"-"))}</span>
            </div>
          `).join("")}
        </div>
      `}catch(s){i.innerHTML=`<div class="page-error">查询失败: ${o(s.message)}</div>`}}),e.querySelector("#query-job-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-job-id").value.trim(),i=e.querySelector("#query-job-result");if(!t){p("请输入 Job ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>';try{const s=await he.getJob(t);i.innerHTML=`
        <div class="detail-card">
          ${Object.entries(s||{}).map(([l,a])=>`
            <div class="detail-row">
              <span class="detail-key">${o(l)}</span>
              <span class="detail-value">${o(typeof a=="object"?JSON.stringify(a,null,2):String(a??"-"))}</span>
            </div>
          `).join("")}
        </div>
        ${s!=null&&s.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${o(s.comment_id)}">查看关联评论 →</a></div>`:""}
      `;const r=i.querySelector("#query-goto-comment");r&&r.addEventListener("click",()=>{e.querySelector("#query-comment-id").value=r.dataset.id,e.querySelector("#query-comment-btn").click()})}catch(s){i.innerHTML=`<div class="page-error">查询失败: ${o(s.message)}</div>`}})}const ce={dashboard:{render:we,title:"仪表盘"},jobs:{render:Ie,title:"任务管理"},"daily-metrics":{render:He,title:"每日指标"},knowledge:{render:Oe,title:"知识库"},"role-cards":{render:Re,title:"角色卡"},profiles:{render:De,title:"风格配置"},gateway:{render:Ue,title:"网关"},audit:{render:Je,title:"审计日志"},bilibili:{render:jt,title:"B站集成"},query:{render:It,title:"查询"}};let Se=null;function Nt(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function xe(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function qe(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function Ht(e){e.preventDefault();const t=document.getElementById("login-api-key"),i=document.getElementById("login-error"),s=t.value.trim();if(s){window.__ADMIN_API_KEY__=s;try{await m("/api/admin/overview"),sessionStorage.setItem("admin_api_key",s),qe(),pe("dashboard")}catch{i.textContent="API Key 无效或服务不可用",i.style.display="block",window.__ADMIN_API_KEY__=""}}}function Ot(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",xe()}function pe(e){if(!ce[e])return;Se=e,document.querySelectorAll("#nav-list .nav-item").forEach(i=>{i.classList.toggle("active",i.dataset.page===e)}),document.getElementById("page-title").textContent=ce[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',ce[e].render(t).catch(i=>{t.innerHTML=`<div class="page-error">加载失败: ${i.message}</div>`})}function Rt(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==Se&&pe(t)})})}function Dt(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),i=document.getElementById("expand-left-btn");t&&i&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),i.style.display="block"}),i.addEventListener("click",()=>{e.classList.remove("collapsed"),i.style.display="none"}))}function Vt(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let i=0;e.addEventListener("click",()=>{i=(i+1)%t.length,t[i]?document.body.setAttribute("data-theme",t[i]):document.body.removeAttribute("data-theme")})}function Ut(){Dt(),Vt(),Rt(),document.getElementById("login-form").addEventListener("submit",Ht),document.getElementById("logout-btn").addEventListener("click",Ot),Nt()?(qe(),pe("dashboard")):xe()}Ut();
