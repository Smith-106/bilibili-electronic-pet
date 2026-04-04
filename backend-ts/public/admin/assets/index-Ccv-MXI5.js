(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))l(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&l(a)}).observe(document,{childList:!0,subtree:!0});function i(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function l(r){if(r.ep)return;r.ep=!0;const s=i(r);fetch(r.href,s)}})();function ne(e,t,i){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof i=="string"&&i.trim()?i.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function Z(){return(window.__ADMIN_API_KEY__||"").trim()}async function m(e,t={}){const i=Z(),l=new Headers(t.headers||{});i&&l.set("x-api-key",i);const r=await fetch(e,{...t,headers:l}),s=await r.json().catch(()=>({}));if(!r.ok){const a=(s==null?void 0:s.detail)||(s==null?void 0:s.error);throw new Error(ne(a,r.status,r.statusText))}return s}async function z(e,t){const i=Z(),l=new Headers;i&&l.set("x-api-key",i);const r=await fetch(e,{headers:l});if(!r.ok)throw new Error("download_failed");const s=await r.blob(),a=URL.createObjectURL(s),u=document.createElement("a");u.href=a,u.download=t,document.body.appendChild(u),u.click(),document.body.removeChild(u),URL.revokeObjectURL(a)}function S(e){const t=new URLSearchParams;for(const[l,r]of Object.entries(e))r!=null&&r!==""&&t.set(l,String(r));const i=t.toString();return i?`?${i}`:""}function _(){return{getOverview(){return m("/api/admin/overview")},getJobs({status:e,limit:t}={}){return m(`/api/admin/jobs${S({status:e,limit:t})}`)},getJob(e){return m(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return m(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return m(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return m("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return m("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return z(`/export/jobs.csv${S({status:e,limit:t})}`,"jobs.csv")},getComment(e){return m(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,comment_id:t}={}){return m(`/api/admin/gateway/logs${S({limit:e,comment_id:t})}`)},publishGatewayReply(e){return m("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:i}={}){return m(`/api/admin/audit/summary${S({days:e,action:t,ok:i})}`)},getAuditLogs({limit:e,action:t,ok:i}={}){return m(`/api/audit-log${S({limit:e,action:t,ok:i})}`)},exportAuditCsv({limit:e,action:t,ok:i}={}){return z(`/export/audit-logs.csv${S({limit:e,action:t,ok:i})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return m(`/api/metrics/daily${S({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return m(`/api/admin/knowledge${S({limit:e,offset:t})}`)},createKnowledgeEntry(e){return m("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return m(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getRoleCards({limit:e,offset:t}={}){return m(`/api/admin/role-cards${S({limit:e,offset:t})}`)},createRoleCard(e){return m("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return m(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return m(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return m(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return m("/api/admin/style-profile")},setStyleProfile(e){return m("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return m("/api/admin/role-profile")},setRoleProfile(e){return m("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return m("/api/admin/bilibili/status")},getBilibiliVideos({poll_enabled:e,limit:t,offset:i}={}){return m(`/api/admin/bilibili/videos${S({poll_enabled:e,limit:t,offset:i})}`)},addBilibiliVideo(e){return m("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return m(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return m(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return m(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return m("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return m("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return m("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return m(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return m(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function d(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function T(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function de(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const i=Date.now()-t.getTime(),l=Math.floor(i/1e3);if(l<60)return"刚刚";const r=Math.floor(l/60);if(r<60)return`${r}分钟前`;const s=Math.floor(r/60);if(s<24)return`${s}小时前`;const a=Math.floor(s/24);if(a<30)return`${a}天前`;const u=Math.floor(a/30);return u<12?`${u}个月前`:`${Math.floor(u/12)}年前`}catch{return""}}function C(e){const t=de(e),i=T(e);return t?`<span title="${d(i)}">${d(t)}</span>`:`<span title="${d(i)}">${d(i)}</span>`}function q(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const oe={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function K(e){if(!e)return"";const t=oe[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${d(t.label)}</span>`}function J(e,t="是",i="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${d(e?t:i)}</span>`}let O=null;function v(e,t="info"){const i=document.getElementById("app-toast");i&&i.remove(),O&&clearTimeout(O);const l={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},r=document.createElement("div");r.id="app-toast",r.className="toast-notification",r.style.setProperty("--toast-color",l[t]||l.info),r.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(r),requestAnimationFrame(()=>r.classList.add("show"));const s=()=>{r.classList.remove("show"),setTimeout(()=>r.remove(),300)};r.querySelector(".toast-close").onclick=s,O=setTimeout(s,4e3)}const j=_();async function Q(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,i,l,r]=await Promise.all([j.getOverview().catch(()=>null),j.getJobs({limit:5}).catch(()=>null),j.getGatewayLogs({limit:5}).catch(()=>null),j.getAuditSummary({days:7}).catch(()=>null)]),s=t||{},a=Array.isArray(i==null?void 0:i.items)?i.items:[],u=Array.isArray(l==null?void 0:l.items)?l.items:[];e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${q(s.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${q(s.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${q(s.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${q(s.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${q(s.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${q(u.length)}</div>
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
                    <td>${K(n.status)}</td>
                    <td class="cell-truncate">${d((c=n.comment_text)==null?void 0:c.substring(0,60))}</td>
                    <td class="cell-time">${d(T(n.created_at))}</td>
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
              <div class="stat-value">${q(r==null?void 0:r.total)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">成功</div>
              <div class="stat-value" style="color:var(--success-color)">${q(r==null?void 0:r.ok_count)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">失败</div>
              <div class="stat-value" style="color:var(--danger-color)">${q(r==null?void 0:r.failed_count)}</div>
            </div>
          </div>
        </div>
      </div>
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{v("正在刷新...","info"),Q(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${d(t.message)}</div>`}}const E=_();async function ce(e){let t=new Set;e.innerHTML=`
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
  `;const i=e.querySelector("#jobs-status"),l=e.querySelector("#jobs-limit");async function r(){var u;t.clear(),s();const a=e.querySelector("#jobs-table-wrapper");a.innerHTML='<div class="page-loading">加载中...</div>';try{const n=await E.getJobs({status:i.value,limit:l.value}),b=Array.isArray(n==null?void 0:n.items)?n.items:[];if(b.length===0){a.innerHTML='<div class="table-empty">暂无任务</div>';return}a.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${b.map(c=>{var f,g,y,o;return`
              <tr data-id="${d(c.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${d(c.id)}" /></td>
                <td class="cell-id" title="${d(c.id)}">${d((f=c.id)==null?void 0:f.substring(0,8))}</td>
                <td>${K(c.status)}</td>
                <td class="cell-truncate" title="${d(c.comment_text)}">${d((g=c.comment_text)==null?void 0:g.substring(0,80))}</td>
                <td class="cell-truncate">${d((y=c.reply_text)==null?void 0:y.substring(0,60))}</td>
                <td>${(o=c.risk_flags)!=null&&o.length?c.risk_flags.map(p=>`<span class="risk-flag">${d(p)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${C(c.created_at)}</td>
                <td class="cell-actions">
                  ${c.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${d(c.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${d(c.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(u=a.querySelector("#jobs-select-all"))==null||u.addEventListener("change",c=>{const f=c.target.checked;a.querySelectorAll(".job-checkbox").forEach(g=>{g.checked=f,f?t.add(g.dataset.id):t.delete(g.dataset.id)}),s()}),a.querySelectorAll(".job-checkbox").forEach(c=>{c.addEventListener("change",()=>{c.checked?t.add(c.dataset.id):t.delete(c.dataset.id),s()})}),a.querySelectorAll(".job-approve").forEach(c=>{c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="审批中...";try{await E.approveJob(c.dataset.id),v("审批成功","success"),r()}catch(f){v(`审批失败: ${f.message}`,"error"),c.disabled=!1,c.textContent="审批"}})}),a.querySelectorAll(".job-retry").forEach(c=>{c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="重试中...";try{await E.retryJob(c.dataset.id),v("重试已提交","success"),r()}catch(f){v(`重试失败: ${f.message}`,"error"),c.disabled=!1,c.textContent="重试"}})})}catch(n){a.innerHTML=`<div class="page-error">加载失败: ${d(n.message)}</div>`}}function s(){const a=e.querySelector("#jobs-batch-bar"),u=e.querySelector("#jobs-selected-count");t.size>0?(a.style.display="flex",u.textContent=`已选 ${t.size} 项`):a.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",r),e.querySelector("#jobs-refresh").addEventListener("click",r),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await E.exportJobsCsv({status:i.value,limit:l.value}),v("导出成功","success")}catch(a){v(`导出失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await E.batchApprove([...t]),v(`批量审批 ${t.size} 项成功`,"success"),r()}catch(a){v(`批量审批失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await E.batchRetry([...t]),v(`批量重试 ${t.size} 项成功`,"success"),r()}catch(a){v(`批量重试失败: ${a.message}`,"error")}}),await r()}const ue=_();async function ve(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#metrics-days").value,l=e.querySelector("#metrics-table-wrapper");l.innerHTML='<div class="page-loading">加载中...</div>';try{const r=await ue.getDailyMetrics({days:i}),s=Array.isArray(r==null?void 0:r.items)?r.items:Array.isArray(r)?r:[];if(s.length===0){l.innerHTML='<div class="table-empty">暂无指标数据</div>';return}l.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${s.map(a=>`<tr>
              <td class="cell-time">${d(a.date||a.day)}</td>
              <td>${d(a.comments??a.comment_count??0)}</td>
              <td>${d(a.jobs??a.job_count??0)}</td>
              <td style="color:var(--success-color)">${d(a.published??a.published_count??0)}</td>
              <td style="color:var(--danger-color)">${d(a.failed??a.failed_count??0)}</td>
              <td>${d(a.skipped??a.skipped_count??0)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      `}catch(r){l.innerHTML=`<div class="page-error">加载失败: ${d(r.message)}</div>`}}e.querySelector("#metrics-load").addEventListener("click",t),await t()}const N=_();async function be(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#knowledge-table-wrapper");i.innerHTML='<div class="page-loading">加载中...</div>';try{const l=await N.getKnowledgeEntries({limit:50}),r=Array.isArray(l==null?void 0:l.items)?l.items:[];if(r.length===0){i.innerHTML='<div class="table-empty">暂无知识条目</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${r.map(s=>{var a,u;return`<tr>
              <td class="cell-id">${d((a=s.id)==null?void 0:a.toString().substring(0,8))}</td>
              <td>${d(s.category)}</td>
              <td>${d(s.title)}</td>
              <td class="cell-truncate">${d((u=s.content)==null?void 0:u.substring(0,80))}</td>
              <td>${J(s.enabled!==!1)}</td>
              <td class="cell-time">${C(s.created_at)}</td>
              <td class="cell-actions">
                ${s.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${d(s.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".knowledge-disable").forEach(s=>{s.addEventListener("click",async()=>{try{await N.disableKnowledgeEntry(s.dataset.id),v("已禁用","success"),t()}catch(a){v(`操作失败: ${a.message}`,"error")}})})}catch(l){i.innerHTML=`<div class="page-error">加载失败: ${d(l.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const i=e.querySelector("#knowledge-category").value.trim(),l=e.querySelector("#knowledge-title").value.trim(),r=e.querySelector("#knowledge-content").value.trim();if(!l||!r){v("标题和内容不能为空","warning");return}try{await N.createKnowledgeEntry({category:i,title:l,content:r}),v("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(s){v(`创建失败: ${s.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const A=_();let M=!1,h=null;async function pe(e){M=!1,h=null,e.innerHTML=`
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
  `;const t=e.querySelector("#rc-select"),i=e.querySelector("#rc-editor");let l=[];function r(){M=!0}function s(){return M?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function a(n){h=n,e.querySelector("#rc-key").value=(n==null?void 0:n.key)||"",e.querySelector("#rc-key").disabled=!!n,e.querySelector("#rc-name").value=(n==null?void 0:n.name)||"",e.querySelector("#rc-desc").value=(n==null?void 0:n.description)||"",e.querySelector("#rc-system-prompt").value=(n==null?void 0:n.system_prompt)||"",e.querySelector("#rc-tone").value=(n==null?void 0:n.tone)||"",e.querySelector("#rc-constraints").value=typeof(n==null?void 0:n.constraints)=="string"?n.constraints:JSON.stringify((n==null?void 0:n.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=n?`编辑: ${n.name||n.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=n&&n.enabled!==!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=n&&n.enabled!==!1?"inline-flex":"none",i.style.display="block",M=!1}i.querySelectorAll(".form-input").forEach(n=>n.addEventListener("input",r));async function u(){try{const n=await A.getRoleCards({limit:100});l=Array.isArray(n==null?void 0:n.items)?n.items:Array.isArray(n)?n:[],t.innerHTML='<option value="">-- 新建 --</option>'+l.map(b=>`<option value="${d(b.key)}">${d(b.name||b.key)}${b.enabled===!1?" (禁用)":""}</option>`).join("")}catch(n){v(`加载失败: ${n.message}`,"error")}}t.addEventListener("change",()=>{if(!s()){t.value=(h==null?void 0:h.key)||"";return}const n=t.value,b=l.find(c=>c.key===n);a(b||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{s()&&(t.value="",a(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const n={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},b=e.querySelector("#rc-constraints").value.trim();try{n.constraints=b?JSON.parse(b):""}catch{n.constraints=b}if(!n.key){v("Key 不能为空","warning");return}try{h!=null&&h.key?(await A.updateRoleCard(h.key,n),v("保存成功","success")):(await A.createRoleCard(n),v("创建成功","success")),M=!1,await u(),t.value=n.key}catch(c){v(`操作失败: ${c.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(h!=null&&h.key)try{await A.activateRoleCard(h.key),v("已激活","success"),await u()}catch(n){v(`激活失败: ${n.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(h!=null&&h.key)try{await A.disableRoleCard(h.key),v("已禁用","success"),await u()}catch(n){v(`禁用失败: ${n.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{u()}),await u()}const P=_();async function me(e){e.innerHTML=`
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
  `;async function t(){try{const[i,l]=await Promise.all([P.getStyleProfile().catch(()=>null),P.getRoleProfile().catch(()=>null)]);i!=null&&i.style&&(e.querySelector("#profile-style").value=i.style,e.querySelector("#profile-style-current").textContent=`当前: ${i.style}`),l!=null&&l.role&&(e.querySelector("#profile-role").value=l.role,e.querySelector("#profile-role-current").textContent=`当前: ${l.role}`)}catch(i){v(`加载配置失败: ${i.message}`,"error")}}e.querySelector("#profile-style-apply").addEventListener("click",async()=>{const i=e.querySelector("#profile-style").value;try{await P.setStyleProfile(i),e.querySelector("#profile-style-current").textContent=`当前: ${i}`,v("风格已更新","success")}catch(l){v(`更新失败: ${l.message}`,"error")}}),e.querySelector("#profile-role-apply").addEventListener("click",async()=>{const i=e.querySelector("#profile-role").value;try{await P.setRoleProfile(i),e.querySelector("#profile-role-current").textContent=`当前: ${i}`,v("角色配置已更新","success")}catch(l){v(`更新失败: ${l.message}`,"error")}}),await t()}function ye({columns:e,rows:t,empty:i="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${d(i)}</div>`;const l=e.map(s=>`<th class="${s.class||""}">${d(s.label)}</th>`).join(""),r=t.map(s=>`<tr>${e.map(a=>`<td class="${a.class||""}">${a.render?a.render(s):d(s[a.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${l}</tr></thead>
        <tbody>${r}</tbody>
      </table>
    </div>
  `}const G=_();async function fe(e){e.innerHTML=`
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
  `;const t=e.querySelector("#gw-reply"),i=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{i.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const r=e.querySelector("#gw-publish-btn"),s=e.querySelector("#gw-comment-id").value.trim(),a=e.querySelector("#gw-reply").value.trim(),u=e.querySelector("#gw-source").value.trim(),n=e.querySelector("#gw-force").checked;if(!s||!a){v("Comment ID 和回复内容不能为空","warning");return}r.disabled=!0,r.textContent="发布中...";try{await G.publishGatewayReply({comment_id:s,reply_text:a,source:u,force_publish:n}),v("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",i.textContent="0/0",l()}catch(b){v(`发布失败: ${b.message}`,"error")}finally{r.disabled=!1,r.textContent="发布"}});async function l(){const r=e.querySelector("#gw-table-wrapper"),s=e.querySelector("#gw-limit").value;r.innerHTML='<div class="page-loading">加载中...</div>';try{const a=await G.getGatewayLogs({limit:s}),u=Array.isArray(a==null?void 0:a.items)?a.items:[];if(u.length===0){r.innerHTML='<div class="table-empty">暂无网关日志</div>';return}r.innerHTML=ye({columns:[{key:"id",label:"ID",class:"cell-id",render:n=>{var b;return d((b=n.id)==null?void 0:b.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:n=>{var b;return d((b=n.comment_id)==null?void 0:b.substring(0,12))}},{key:"status",label:"状态",render:n=>K(n.status)},{key:"platform",label:"平台",render:n=>d(n.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:n=>{var b;return d((b=n.reply_text)==null?void 0:b.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:n=>C(n.created_at)}],rows:u})}catch(a){r.innerHTML=`<div class="page-error">加载失败: ${d(a.message)}</div>`}}e.querySelector("#gw-refresh").addEventListener("click",l),e.querySelector("#gw-filter-btn").addEventListener("click",l),await l()}const R=_();async function ge(e){e.innerHTML=`
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
  `;async function t(){try{const l=await R.getAuditSummary({days:7}),r=e.querySelector("#audit-summary-cards");r.innerHTML=`
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
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function i(){const l=e.querySelector("#audit-table-wrapper");l.innerHTML='<div class="page-loading">加载中...</div>';const r=e.querySelector("#audit-action").value.trim(),s=e.querySelector("#audit-ok").value,a=e.querySelector("#audit-limit").value;try{const u=await R.getAuditLogs({action:r,ok:s,limit:a}),n=Array.isArray(u==null?void 0:u.items)?u.items:[];if(n.length===0){l.innerHTML='<div class="table-empty">暂无审计日志</div>';return}l.innerHTML=`
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
              <td class="cell-time">${C(b.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(u){l.innerHTML=`<div class="page-error">加载失败: ${d(u.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),i()}),e.querySelector("#audit-filter-btn").addEventListener("click",i),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await R.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),v("导出成功","success")}catch(l){v(`导出失败: ${l.message}`,"error")}}),await Promise.all([t(),i()])}const w=_(),he=/^BV[a-zA-Z0-9]{10}$/,$e={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},we={"auth:no active credential":"缺少可用的激活凭证。","dependency:diagnostics_unavailable":"诊断信息暂时不可用。"},Se={manual_queue:"人工队列",simulated:"模拟发布",webhook:"Webhook",real_publish:"真实发布",native_bilibili:"原生 B 站发布"},_e={ok:{label:"成功",cls:"badge-success"},no_new:{label:"无新增",cls:"badge-muted"},error:{label:"失败",cls:"badge-danger"}},I={no_aid:"缺少视频 aid，暂时无法轮询。",retry_exhausted:"评论抓取重试耗尽。"},k=50,qe=7*24*60*60*1e3;function $(e){const t=e instanceof Error?e.message:String(e??"request_failed");return $e[t]||t}function xe(e){return e?he.test(e)?null:"invalid_bvid_format":"bvid_required"}function Le(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function Ee(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function ke(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(i=>we[i]||i).join("；")}function Te(e){const t=String(e??"").trim().toLowerCase();return Se[t]||t||"-"}function Ce(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":t%60===0?`${t/60} 分钟`:`${t} 秒`}function Ae(e,t,i){const l=String(e??"").trim().toLowerCase();if(!l)return"-";const r=_e[l]||{label:l,cls:"badge-muted"},s=l==="error"&&t?I[String(t).trim().toLowerCase()]||String(t):"",a=s?` title="${d(s)}"`:"",u=typeof i=="number"&&Number.isFinite(i)?`评论游标: ${i}`:"",n=[s,u].filter(Boolean).map(b=>`<div class="form-hint" style="margin-top:4px;">${d(b)}</div>`).join("");return`<span class="status-badge ${r.cls}"${a}>${d(r.label)}</span>${n}`}function Me(e){return e?T(e):"-"}function Be(e){if(e==="true")return!0;if(e==="false")return!1}function je(e){return e==="true"?"暂无轮询中视频":e==="false"?"暂无已停用视频":"暂无视频"}function U(e){return typeof(e==null?void 0:e.aid)=="number"&&Number.isFinite(e.aid)}function Pe(e){return e.filter(t=>!U(t)).length}function Ie(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="error").length}function He(e){const i=U(e)?`aid: ${e.aid}`:I.no_aid;return`${d((e==null?void 0:e.bvid)||"-")}${i?`<div class="form-hint" style="margin-top:4px;">${d(i)}</div>`:""}`}function Oe(e){const t=U(e),i=t?"":" disabled",l=t?"":` title="${d(I.no_aid)}"`;return`<button class="btn btn-sm bili-sync" data-id="${d(e.id||e.video_id)}" data-has-aid="${t?"true":"false"}"${i}${l}>同步</button>`}function Ne(e,t,i,l=0,r=k,s=[]){const a=i==="true"?"轮询中":i==="false"?"已停用":"全部",u=Math.floor(l/r)+1,n=Math.max(1,Math.ceil(e/r)),b=Pe(s),c=Ie(s),f=b>0?`，当前页缺少 aid ${b} 条`:"",g=c>0?`，轮询失败 ${c} 条`:"";return`筛选: ${a}，共 ${e} 条，当前展示 ${t} 条，第 ${u}/${n} 页${f}${g}`}function Y(e,t={}){const i=Number((e==null?void 0:e.videos)??0),l=Number((e==null?void 0:e.comments)??0),r=Number((e==null?void 0:e.events_injected)??l),s=t.subject||(i===1?"视频":"轮询");return l>0||r>0?`${s}完成，处理 ${i} 个视频，新增 ${l} 条评论，注入 ${r} 个事件。`:i>0?`${s}完成，处理 ${i} 个视频，暂无新增评论。`:`${s}完成，暂无可处理视频。`}function H(e,t=Date.now()){if(!e)return{hasExpiry:!1,expired:!1,expiringSoon:!1,label:"未设置",cls:"badge-muted",detail:""};const i=new Date(e);if(Number.isNaN(i.getTime()))return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"时间异常",cls:"badge-danger",detail:String(e)};const l=i.getTime()-t;return l<=0?{hasExpiry:!0,expired:!0,expiringSoon:!1,label:"已过期",cls:"badge-danger",detail:T(e)}:l<=qe?{hasExpiry:!0,expired:!1,expiringSoon:!0,label:"即将过期",cls:"badge-warning",detail:T(e)}:{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"有效",cls:"badge-success",detail:T(e)}}function Re(e){const t=H(e),i=t.detail?`<div class="form-hint" style="margin-top:4px;">${d(t.detail)}</div>`:"";return`<span class="status-badge ${t.cls}">${d(t.label)}</span>${i}`}function De(e){return(e==null?void 0:e.cls)==="badge-danger"?"var(--danger-color)":(e==null?void 0:e.cls)==="badge-warning"?"var(--warning-color)":(e==null?void 0:e.cls)==="badge-success"?"var(--success-color)":"var(--grey-2)"}function X(e="",t=""){return`激活: ${e==="active"?"仅激活":e==="inactive"?"仅未激活":"全部"}，过期: ${t==="expired"?"已过期":t==="expiring"?"即将过期":t==="valid"?"有效":t==="unset"?"未设置过期时间":"全部"}`}function Je(e,t="",i="",l=e.length){const r=e.length,s=e.filter(y=>y.is_active||y.active).length,a=Date.now(),u=e.map(y=>H(y.expires_at,a)),n=u.filter(y=>y.hasExpiry).length,b=u.filter(y=>y.expired).length,c=u.filter(y=>y.expiringSoon).length,f=u.filter(y=>!y.hasExpiry).length,g=X(t,i);return`共 ${r} 个凭证，激活中 ${s} 个，设置过期时间 ${n} 个，已过期 ${b} 个，即将过期 ${c} 个，未设置 ${f} 个；筛选: ${g}，当前展示 ${l} 个`}function Ke(e,t="",i=""){const l=Date.now();return e.filter(r=>{const s=r.is_active||r.active;if(t==="active"&&!s||t==="inactive"&&s)return!1;const a=H(r.expires_at,l);return!(i==="expired"&&!a.expired||i==="expiring"&&!a.expiringSoon||i==="valid"&&(!a.hasExpiry||a.expired)||i==="unset"&&a.hasExpiry)})}function Ue(e="",t=""){return e||t?`暂无匹配筛选条件的凭证（${X(e,t)}）`:"暂无凭证"}function F(e,t,i){const l=e.querySelector(i);t.forEach(r=>{const s=e.querySelector(r);s==null||s.addEventListener("keydown",a=>{a.key==="Enter"&&(a.preventDefault(),l.disabled||l.click())})})}async function Ve(e){let t=0;e.innerHTML=`
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
  `;async function i(){var a,u,n,b,c,f,g,y;const s=e.querySelector("#bili-status-cards");s.innerHTML='<div class="page-loading">加载中...</div>';try{const o=await w.getBilibiliStatus(),p=Number(((a=o==null?void 0:o.videos)==null?void 0:a.poll_enabled_count)??0),x=!!((u=o==null?void 0:o.diagnostics)!=null&&u.ready),L=ke((n=o==null?void 0:o.diagnostics)==null?void 0:n.blocking_reasons),se=(b=o==null?void 0:o.credential)!=null&&b.name?d(o.credential.name):"未配置",le=Te((c=o==null?void 0:o.diagnostics)==null?void 0:c.effective_publish_mode),re=Ce((f=o==null?void 0:o.config)==null?void 0:f.poll_interval_seconds),B=H((g=o==null?void 0:o.credential)==null?void 0:g.expires_at),ae=Me((y=o==null?void 0:o.credential)==null?void 0:y.last_used_at);s.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${o!=null&&o.enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询</div>
          <div class="stat-value">${o!=null&&o.polling_enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布</div>
          <div class="stat-value">${o!=null&&o.publish_enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">视频数</div>
          <div class="stat-value">${(o==null?void 0:o.video_count)??0}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${p}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${se}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${x?"var(--success-color)":"var(--danger-color)"}">${x?"就绪":"阻塞"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布模式</div>
          <div class="stat-value">${d(le)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询间隔</div>
          <div class="stat-value">${d(re)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">凭证过期</div>
          <div class="stat-value" style="font-size:14px; color:${De(B)}">${d(B.label)}</div>
          ${B.detail?`<div class="form-hint" style="margin-top:6px;">${d(B.detail)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">最近使用</div>
          <div class="stat-value" style="font-size:14px;">${d(ae)}</div>
        </div>
        ${L?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">阻塞原因: ${d(L)}</div>`:""}
      `}catch(o){s.innerHTML=`<div class="page-error">状态加载失败: ${d($(o))}</div>`}}async function l(){const s=e.querySelector("#bili-videos-wrapper"),a=e.querySelector("#bili-video-summary"),u=e.querySelector("#bili-video-filter-btn"),n=e.querySelector("#bili-video-poll-filter"),b=e.querySelector("#bili-video-prev"),c=e.querySelector("#bili-video-next"),f=n.value;a.textContent="加载中...",s.innerHTML='<div class="page-loading">加载中...</div>',n.disabled=!0,u.disabled=!0,b.disabled=!0,c.disabled=!0;try{const g=await w.getBilibiliVideos({limit:k,offset:t,poll_enabled:Be(f)}),y=Array.isArray(g==null?void 0:g.items)?g.items:Array.isArray(g)?g:[],o=Number((g==null?void 0:g.total)??y.length);if(y.length===0&&o>0&&t>0){t=Math.max(0,t-k),await l();return}if(a.textContent=Ne(o,y.length,f,t,k,y),b.disabled=t<=0,c.disabled=t+y.length>=o,y.length===0){s.innerHTML=`<div class="table-empty">${d(je(f))}</div>`;return}s.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${y.map(p=>`<tr data-id="${d(p.id||p.video_id)}">
              <td class="cell-id">${He(p)}</td>
              <td class="cell-truncate">${d(p.title||"-")}</td>
              <td>${J(p.poll_enabled)}</td>
              <td>${p.comment_count??"-"}</td>
              <td class="cell-time">${p.last_polled_at?C(p.last_polled_at):"-"}</td>
              <td>${Ae(p.last_poll_status,p.last_poll_error,p.last_rpid)}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${d(p.id||p.video_id)}">${p.poll_enabled?"禁用轮询":"启用轮询"}</button>
                ${Oe(p)}
                <button class="btn btn-sm btn-danger bili-delete" data-id="${d(p.id||p.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,s.querySelectorAll(".bili-toggle-poll").forEach(p=>{p.addEventListener("click",async()=>{p.disabled=!0;try{await w.toggleBilibiliVideoPoll(p.dataset.id),v("操作成功","success"),await Promise.all([i(),l()])}catch(x){v(`失败: ${$(x)}`,"error")}finally{p.disabled=!1}})}),s.querySelectorAll(".bili-sync").forEach(p=>{p.addEventListener("click",async()=>{if(p.dataset.hasAid==="false"){v(I.no_aid,"warning");return}const x=p.textContent;p.disabled=!0,p.textContent="同步中...";try{const L=await w.syncBilibiliVideo(p.dataset.id);v(Y(L==null?void 0:L.result,{subject:"同步"}),"success"),await Promise.all([i(),l()])}catch(L){v(`同步失败: ${$(L)}`,"error")}finally{p.disabled=!1,p.textContent=x}})}),s.querySelectorAll(".bili-delete").forEach(p=>{p.addEventListener("click",async()=>{if(confirm("确定删除此视频？")){p.disabled=!0;try{await w.deleteBilibiliVideo(p.dataset.id),v("已删除","success"),await Promise.all([i(),l()])}catch(x){v(`删除失败: ${$(x)}`,"error")}finally{p.disabled=!1}}})})}catch(g){a.textContent="视频加载失败",s.innerHTML=`<div class="page-error">加载失败: ${d($(g))}</div>`}finally{n.disabled=!1,u.disabled=!1}}async function r(){const s=e.querySelector("#bili-creds-wrapper"),a=e.querySelector("#bili-cred-summary"),u=e.querySelector("#bili-cred-active-filter"),n=e.querySelector("#bili-cred-expiry-filter"),b=u.value,c=n.value;a.textContent="加载中...",s.innerHTML='<div class="page-loading">加载中...</div>',u.disabled=!0,n.disabled=!0;try{const f=await w.getBilibiliCredentials(),g=Array.isArray(f==null?void 0:f.items)?f.items:Array.isArray(f)?f:[],y=Ke(g,b,c);if(a.textContent=Je(g,b,c,y.length),y.length===0){s.innerHTML=`<div class="table-empty">${d(Ue(b,c))}</div>`;return}s.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期状态</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${y.map(o=>`<tr data-id="${d(o.id||o.credential_id)}">
              <td>${d(o.name||"-")}</td>
              <td class="cell-id">${d([o.has_sessdata?"SESSDATA":"",o.has_bili_jct?"bili_jct":"",o.buvid3?`buvid3:${o.buvid3}`:""].filter(Boolean).join(" / ")||"-")}</td>
              <td>${J(o.is_active||o.active)}</td>
              <td>${Re(o.expires_at)}</td>
              <td class="cell-time">${o.last_used_at?C(o.last_used_at):"-"}</td>
              <td class="cell-actions">
                ${o.is_active||o.active?"":`<button class="btn btn-sm cred-activate" data-id="${d(o.id||o.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${d(o.id||o.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,s.querySelectorAll(".cred-activate").forEach(o=>{o.addEventListener("click",async()=>{o.disabled=!0;try{await w.activateBilibiliCredential(o.dataset.id),v("已激活","success"),await Promise.all([i(),r()])}catch(p){v(`激活失败: ${$(p)}`,"error")}finally{o.disabled=!1}})}),s.querySelectorAll(".cred-delete").forEach(o=>{o.addEventListener("click",async()=>{if(confirm("确定删除此凭证？")){o.disabled=!0;try{await w.deleteBilibiliCredential(o.dataset.id),v("已删除","success"),await Promise.all([i(),r()])}catch(p){v(`删除失败: ${$(p)}`,"error")}finally{o.disabled=!1}}})})}catch(f){a.textContent="凭证加载失败",s.innerHTML=`<div class="page-error">加载失败: ${d($(f))}</div>`}finally{u.disabled=!1,n.disabled=!1}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const s=e.querySelector("#bili-video-add"),a=e.querySelector("#bili-video-bvid").value.trim(),u=xe(a);if(u){v($(u),"warning");return}s.disabled=!0,s.textContent="添加中...";try{await w.addBilibiliVideo(a),v("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([i(),l()])}catch(n){v(`添加失败: ${$(n)}`,"error")}finally{s.disabled=!1,s.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{var b;const s=e.querySelector("#cred-add"),a=Ee(e.querySelector("#cred-expires").value),u={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:a},n=Le(u);if(n){v($(n),"warning");return}s.disabled=!0,s.textContent="添加中...";try{const c=await w.addBilibiliCredential(u);v((b=c==null?void 0:c.item)!=null&&b.is_active?"凭证添加成功，已自动激活":"凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([i(),r()])}catch(c){v(`添加失败: ${$(c)}`,"error")}finally{s.disabled=!1,s.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const s=e.querySelector("#bili-poll-btn");s.disabled=!0,s.textContent="轮询中...";try{const a=await w.triggerBilibiliPoll();v(Y(a==null?void 0:a.result),"success"),await Promise.all([i(),l()])}catch(a){v(`轮询失败: ${$(a)}`,"error")}finally{s.disabled=!1,s.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",async()=>{const s=e.querySelector("#bili-refresh");s.disabled=!0,s.textContent="刷新中...";try{await Promise.all([i(),l(),r()])}finally{s.disabled=!1,s.innerHTML='<svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新'}}),e.querySelector("#bili-video-filter-btn").addEventListener("click",()=>{t=0,l()}),e.querySelector("#bili-video-poll-filter").addEventListener("change",()=>{t=0,l()}),e.querySelector("#bili-video-prev").addEventListener("click",()=>{t<=0||(t=Math.max(0,t-k),l())}),e.querySelector("#bili-video-next").addEventListener("click",()=>{t+=k,l()}),e.querySelector("#bili-cred-active-filter").addEventListener("change",r),e.querySelector("#bili-cred-expiry-filter").addEventListener("change",r),F(e,["#bili-video-bvid"],"#bili-video-add"),F(e,["#cred-name","#cred-sessdata","#cred-bili-jct","#cred-buvid3","#cred-buvid4","#cred-expires"],"#cred-add"),await Promise.all([i(),l(),r()])}const W=_();async function ze(e){e.innerHTML=`
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
  `,e.querySelector("#query-comment-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-comment-id").value.trim(),i=e.querySelector("#query-comment-result");if(!t){v("请输入 Comment ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>';try{const l=await W.getComment(t);i.innerHTML=`
        <div class="detail-card">
          ${Object.entries(l||{}).map(([r,s])=>`
            <div class="detail-row">
              <span class="detail-key">${d(r)}</span>
              <span class="detail-value">${d(typeof s=="object"?JSON.stringify(s,null,2):String(s??"-"))}</span>
            </div>
          `).join("")}
        </div>
      `}catch(l){i.innerHTML=`<div class="page-error">查询失败: ${d(l.message)}</div>`}}),e.querySelector("#query-job-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-job-id").value.trim(),i=e.querySelector("#query-job-result");if(!t){v("请输入 Job ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>';try{const l=await W.getJob(t);i.innerHTML=`
        <div class="detail-card">
          ${Object.entries(l||{}).map(([s,a])=>`
            <div class="detail-row">
              <span class="detail-key">${d(s)}</span>
              <span class="detail-value">${d(typeof a=="object"?JSON.stringify(a,null,2):String(a??"-"))}</span>
            </div>
          `).join("")}
        </div>
        ${l!=null&&l.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${d(l.comment_id)}">查看关联评论 →</a></div>`:""}
      `;const r=i.querySelector("#query-goto-comment");r&&r.addEventListener("click",()=>{e.querySelector("#query-comment-id").value=r.dataset.id,e.querySelector("#query-comment-btn").click()})}catch(l){i.innerHTML=`<div class="page-error">查询失败: ${d(l.message)}</div>`}})}const D={dashboard:{render:Q,title:"仪表盘"},jobs:{render:ce,title:"任务管理"},"daily-metrics":{render:ve,title:"每日指标"},knowledge:{render:be,title:"知识库"},"role-cards":{render:pe,title:"角色卡"},profiles:{render:me,title:"风格配置"},gateway:{render:fe,title:"网关"},audit:{render:ge,title:"审计日志"},bilibili:{render:Ve,title:"B站集成"},query:{render:ze,title:"查询"}};let ee=null;function Ge(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function te(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function ie(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function Ye(e){e.preventDefault();const t=document.getElementById("login-api-key"),i=document.getElementById("login-error"),l=t.value.trim();if(l){window.__ADMIN_API_KEY__=l;try{await m("/api/admin/overview"),sessionStorage.setItem("admin_api_key",l),ie(),V("dashboard")}catch{i.textContent="API Key 无效或服务不可用",i.style.display="block",window.__ADMIN_API_KEY__=""}}}function Fe(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",te()}function V(e){if(!D[e])return;ee=e,document.querySelectorAll("#nav-list .nav-item").forEach(i=>{i.classList.toggle("active",i.dataset.page===e)}),document.getElementById("page-title").textContent=D[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',D[e].render(t).catch(i=>{t.innerHTML=`<div class="page-error">加载失败: ${i.message}</div>`})}function We(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==ee&&V(t)})})}function Ze(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),i=document.getElementById("expand-left-btn");t&&i&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),i.style.display="block"}),i.addEventListener("click",()=>{e.classList.remove("collapsed"),i.style.display="none"}))}function Qe(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let i=0;e.addEventListener("click",()=>{i=(i+1)%t.length,t[i]?document.body.setAttribute("data-theme",t[i]):document.body.removeAttribute("data-theme")})}function Xe(){Ze(),Qe(),We(),document.getElementById("login-form").addEventListener("submit",Ye),document.getElementById("logout-btn").addEventListener("click",Fe),Ge()?(ie(),V("dashboard")):te()}Xe();
