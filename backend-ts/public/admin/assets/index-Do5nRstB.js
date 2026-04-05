(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const a of i.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&r(a)}).observe(document,{childList:!0,subtree:!0});function l(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function r(s){if(s.ep)return;s.ep=!0;const i=l(s);fetch(s.href,i)}})();function _t(e,t,l){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof l=="string"&&l.trim()?l.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function ot(){return(window.__ADMIN_API_KEY__||"").trim()}async function h(e,t={}){const l=ot(),r=new Headers(t.headers||{});l&&r.set("x-api-key",l);const s=await fetch(e,{...t,headers:r}),i=await s.json().catch(()=>({}));if(!s.ok){const a=(i==null?void 0:i.detail)||(i==null?void 0:i.error);throw new Error(_t(a,s.status,s.statusText))}return i}async function tt(e,t){const l=ot(),r=new Headers;l&&r.set("x-api-key",l);const s=await fetch(e,{headers:r});if(!s.ok)throw new Error("download_failed");const i=await s.blob(),a=URL.createObjectURL(i),b=document.createElement("a");b.href=a,b.download=t,document.body.appendChild(b),b.click(),document.body.removeChild(b),URL.revokeObjectURL(a)}function B(e){const t=new URLSearchParams;for(const[r,s]of Object.entries(e))s!=null&&s!==""&&t.set(r,String(s));const l=t.toString();return l?`?${l}`:""}function A(){return{getOverview(){return h("/api/admin/overview")},getJobs({status:e,limit:t}={}){return h(`/api/admin/jobs${B({status:e,limit:t})}`)},getJob(e){return h(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return h(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return h(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return h("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return h("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return tt(`/export/jobs.csv${B({status:e,limit:t})}`,"jobs.csv")},getComment(e){return h(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,comment_id:t}={}){return h(`/api/admin/gateway/logs${B({limit:e,comment_id:t})}`)},publishGatewayReply(e){return h("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:l}={}){return h(`/api/admin/audit/summary${B({days:e,action:t,ok:l})}`)},getAuditLogs({limit:e,action:t,ok:l}={}){return h(`/api/audit-log${B({limit:e,action:t,ok:l})}`)},exportAuditCsv({limit:e,action:t,ok:l}={}){return tt(`/export/audit-logs.csv${B({limit:e,action:t,ok:l})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return h(`/api/metrics/daily${B({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return h(`/api/admin/knowledge${B({limit:e,offset:t})}`)},createKnowledgeEntry(e){return h("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return h(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getRoleCards({limit:e,offset:t}={}){return h(`/api/admin/role-cards${B({limit:e,offset:t})}`)},createRoleCard(e){return h("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return h(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return h(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return h(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return h("/api/admin/style-profile")},setStyleProfile(e){return h("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return h("/api/admin/role-profile")},setRoleProfile(e){return h("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return h("/api/admin/bilibili/status")},getBilibiliVideos({poll_enabled:e,limit:t,offset:l}={}){return h(`/api/admin/bilibili/videos${B({poll_enabled:e,limit:t,offset:l})}`)},addBilibiliVideo(e){return h("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return h(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return h(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return h(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return h("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return h("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return h("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return h(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return h(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function d(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function P(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function Qe(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const l=Date.now()-t.getTime(),r=Math.floor(l/1e3);if(r<60)return"刚刚";const s=Math.floor(r/60);if(s<60)return`${s}分钟前`;const i=Math.floor(s/60);if(i<24)return`${i}小时前`;const a=Math.floor(i/24);if(a<30)return`${a}天前`;const b=Math.floor(a/30);return b<12?`${b}个月前`:`${Math.floor(b/12)}年前`}catch{return""}}function ue(e){const t=Qe(e),l=P(e);return t?`<span title="${d(l)}">${d(t)}</span>`:`<span title="${d(l)}">${d(l)}</span>`}function j(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const wt={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function Xe(e){if(!e)return"";const t=wt[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${d(t.label)}</span>`}function Ze(e,t="是",l="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${d(e?t:l)}</span>`}let Je=null;function v(e,t="info"){const l=document.getElementById("app-toast");l&&l.remove(),Je&&clearTimeout(Je);const r={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},s=document.createElement("div");s.id="app-toast",s.className="toast-notification",s.style.setProperty("--toast-color",r[t]||r.info),s.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(s),requestAnimationFrame(()=>s.classList.add("show"));const i=()=>{s.classList.remove("show"),setTimeout(()=>s.remove(),300)};s.querySelector(".toast-close").onclick=i,Je=setTimeout(i,4e3)}const Se=A();async function dt(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,l,r,s]=await Promise.all([Se.getOverview().catch(()=>null),Se.getJobs({limit:5}).catch(()=>null),Se.getGatewayLogs({limit:5}).catch(()=>null),Se.getAuditSummary({days:7}).catch(()=>null)]),i=t||{},a=Array.isArray(l==null?void 0:l.items)?l.items:[],b=Array.isArray(r==null?void 0:r.items)?r.items:[];e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${j(i.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${j(i.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${j(i.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${j(i.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${j(i.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${j(b.length)}</div>
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
                ${a.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':a.map(o=>{var p,u;return`<tr>
                    <td class="cell-id">${d((p=o.id)==null?void 0:p.substring(0,8))}</td>
                    <td>${Xe(o.status)}</td>
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
              <div class="stat-value">${j(s==null?void 0:s.total)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">成功</div>
              <div class="stat-value" style="color:var(--success-color)">${j(s==null?void 0:s.ok_count)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">失败</div>
              <div class="stat-value" style="color:var(--danger-color)">${j(s==null?void 0:s.failed_count)}</div>
            </div>
          </div>
        </div>
      </div>
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{v("正在刷新...","info"),dt(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${d(t.message)}</div>`}}const de=A();async function St(e){let t=new Set;e.innerHTML=`
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
  `;const l=e.querySelector("#jobs-status"),r=e.querySelector("#jobs-limit");async function s(){var b;t.clear(),i();const a=e.querySelector("#jobs-table-wrapper");a.innerHTML='<div class="page-loading">加载中...</div>';try{const o=await de.getJobs({status:l.value,limit:r.value}),p=Array.isArray(o==null?void 0:o.items)?o.items:[];if(p.length===0){a.innerHTML='<div class="table-empty">暂无任务</div>';return}a.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${p.map(u=>{var g,m,w,y;return`
              <tr data-id="${d(u.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${d(u.id)}" /></td>
                <td class="cell-id" title="${d(u.id)}">${d((g=u.id)==null?void 0:g.substring(0,8))}</td>
                <td>${Xe(u.status)}</td>
                <td class="cell-truncate" title="${d(u.comment_text)}">${d((m=u.comment_text)==null?void 0:m.substring(0,80))}</td>
                <td class="cell-truncate">${d((w=u.reply_text)==null?void 0:w.substring(0,60))}</td>
                <td>${(y=u.risk_flags)!=null&&y.length?u.risk_flags.map(f=>`<span class="risk-flag">${d(f)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${ue(u.created_at)}</td>
                <td class="cell-actions">
                  ${u.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${d(u.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${d(u.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(b=a.querySelector("#jobs-select-all"))==null||b.addEventListener("change",u=>{const g=u.target.checked;a.querySelectorAll(".job-checkbox").forEach(m=>{m.checked=g,g?t.add(m.dataset.id):t.delete(m.dataset.id)}),i()}),a.querySelectorAll(".job-checkbox").forEach(u=>{u.addEventListener("change",()=>{u.checked?t.add(u.dataset.id):t.delete(u.dataset.id),i()})}),a.querySelectorAll(".job-approve").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="审批中...";try{await de.approveJob(u.dataset.id),v("审批成功","success"),s()}catch(g){v(`审批失败: ${g.message}`,"error"),u.disabled=!1,u.textContent="审批"}})}),a.querySelectorAll(".job-retry").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="重试中...";try{await de.retryJob(u.dataset.id),v("重试已提交","success"),s()}catch(g){v(`重试失败: ${g.message}`,"error"),u.disabled=!1,u.textContent="重试"}})})}catch(o){a.innerHTML=`<div class="page-error">加载失败: ${d(o.message)}</div>`}}function i(){const a=e.querySelector("#jobs-batch-bar"),b=e.querySelector("#jobs-selected-count");t.size>0?(a.style.display="flex",b.textContent=`已选 ${t.size} 项`):a.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",s),e.querySelector("#jobs-refresh").addEventListener("click",s),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await de.exportJobsCsv({status:l.value,limit:r.value}),v("导出成功","success")}catch(a){v(`导出失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await de.batchApprove([...t]),v(`批量审批 ${t.size} 项成功`,"success"),s()}catch(a){v(`批量审批失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await de.batchRetry([...t]),v(`批量重试 ${t.size} 项成功`,"success"),s()}catch(a){v(`批量重试失败: ${a.message}`,"error")}}),await s()}const Et=A();async function Ct(e){e.innerHTML=`
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
  `;async function t(){const l=e.querySelector("#metrics-days").value,r=e.querySelector("#metrics-table-wrapper");r.innerHTML='<div class="page-loading">加载中...</div>';try{const s=await Et.getDailyMetrics({days:l}),i=Array.isArray(s==null?void 0:s.items)?s.items:Array.isArray(s)?s:[];if(i.length===0){r.innerHTML='<div class="table-empty">暂无指标数据</div>';return}r.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${i.map(a=>`<tr>
              <td class="cell-time">${d(a.date||a.day)}</td>
              <td>${d(a.comments??a.comment_count??0)}</td>
              <td>${d(a.jobs??a.job_count??0)}</td>
              <td style="color:var(--success-color)">${d(a.published??a.published_count??0)}</td>
              <td style="color:var(--danger-color)">${d(a.failed??a.failed_count??0)}</td>
              <td>${d(a.skipped??a.skipped_count??0)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      `}catch(s){r.innerHTML=`<div class="page-error">加载失败: ${d(s.message)}</div>`}}e.querySelector("#metrics-load").addEventListener("click",t),await t()}const Ke=A();async function qt(e){e.innerHTML=`
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
  `;async function t(){const l=e.querySelector("#knowledge-table-wrapper");l.innerHTML='<div class="page-loading">加载中...</div>';try{const r=await Ke.getKnowledgeEntries({limit:50}),s=Array.isArray(r==null?void 0:r.items)?r.items:[];if(s.length===0){l.innerHTML='<div class="table-empty">暂无知识条目</div>';return}l.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${s.map(i=>{var a,b;return`<tr>
              <td class="cell-id">${d((a=i.id)==null?void 0:a.toString().substring(0,8))}</td>
              <td>${d(i.category)}</td>
              <td>${d(i.title)}</td>
              <td class="cell-truncate">${d((b=i.content)==null?void 0:b.substring(0,80))}</td>
              <td>${Ze(i.enabled!==!1)}</td>
              <td class="cell-time">${ue(i.created_at)}</td>
              <td class="cell-actions">
                ${i.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${d(i.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,l.querySelectorAll(".knowledge-disable").forEach(i=>{i.addEventListener("click",async()=>{try{await Ke.disableKnowledgeEntry(i.dataset.id),v("已禁用","success"),t()}catch(a){v(`操作失败: ${a.message}`,"error")}})})}catch(r){l.innerHTML=`<div class="page-error">加载失败: ${d(r.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const l=e.querySelector("#knowledge-category").value.trim(),r=e.querySelector("#knowledge-title").value.trim(),s=e.querySelector("#knowledge-content").value.trim();if(!r||!s){v("标题和内容不能为空","warning");return}try{await Ke.createKnowledgeEntry({category:l,title:r,content:s}),v("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(i){v(`创建失败: ${i.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const ye=A();let he=!1,S=null;async function kt(e){he=!1,S=null,e.innerHTML=`
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
  `;const t=e.querySelector("#rc-select"),l=e.querySelector("#rc-editor");let r=[];function s(){he=!0}function i(){return he?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function a(o){S=o,e.querySelector("#rc-key").value=(o==null?void 0:o.key)||"",e.querySelector("#rc-key").disabled=!!o,e.querySelector("#rc-name").value=(o==null?void 0:o.name)||"",e.querySelector("#rc-desc").value=(o==null?void 0:o.description)||"",e.querySelector("#rc-system-prompt").value=(o==null?void 0:o.system_prompt)||"",e.querySelector("#rc-tone").value=(o==null?void 0:o.tone)||"",e.querySelector("#rc-constraints").value=typeof(o==null?void 0:o.constraints)=="string"?o.constraints:JSON.stringify((o==null?void 0:o.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=o?`编辑: ${o.name||o.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=o&&o.enabled!==!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=o&&o.enabled!==!1?"inline-flex":"none",l.style.display="block",he=!1}l.querySelectorAll(".form-input").forEach(o=>o.addEventListener("input",s));async function b(){try{const o=await ye.getRoleCards({limit:100});r=Array.isArray(o==null?void 0:o.items)?o.items:Array.isArray(o)?o:[],t.innerHTML='<option value="">-- 新建 --</option>'+r.map(p=>`<option value="${d(p.key)}">${d(p.name||p.key)}${p.enabled===!1?" (禁用)":""}</option>`).join("")}catch(o){v(`加载失败: ${o.message}`,"error")}}t.addEventListener("change",()=>{if(!i()){t.value=(S==null?void 0:S.key)||"";return}const o=t.value,p=r.find(u=>u.key===o);a(p||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{i()&&(t.value="",a(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const o={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},p=e.querySelector("#rc-constraints").value.trim();try{o.constraints=p?JSON.parse(p):""}catch{o.constraints=p}if(!o.key){v("Key 不能为空","warning");return}try{S!=null&&S.key?(await ye.updateRoleCard(S.key,o),v("保存成功","success")):(await ye.createRoleCard(o),v("创建成功","success")),he=!1,await b(),t.value=o.key}catch(u){v(`操作失败: ${u.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(S!=null&&S.key)try{await ye.activateRoleCard(S.key),v("已激活","success"),await b()}catch(o){v(`激活失败: ${o.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(S!=null&&S.key)try{await ye.disableRoleCard(S.key),v("已禁用","success"),await b()}catch(o){v(`禁用失败: ${o.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{b()}),await b()}const Ee=A();async function Tt(e){e.innerHTML=`
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
  `;async function t(){try{const[l,r]=await Promise.all([Ee.getStyleProfile().catch(()=>null),Ee.getRoleProfile().catch(()=>null)]);l!=null&&l.style&&(e.querySelector("#profile-style").value=l.style,e.querySelector("#profile-style-current").textContent=`当前: ${l.style}`),r!=null&&r.role&&(e.querySelector("#profile-role").value=r.role,e.querySelector("#profile-role-current").textContent=`当前: ${r.role}`)}catch(l){v(`加载配置失败: ${l.message}`,"error")}}e.querySelector("#profile-style-apply").addEventListener("click",async()=>{const l=e.querySelector("#profile-style").value;try{await Ee.setStyleProfile(l),e.querySelector("#profile-style-current").textContent=`当前: ${l}`,v("风格已更新","success")}catch(r){v(`更新失败: ${r.message}`,"error")}}),e.querySelector("#profile-role-apply").addEventListener("click",async()=>{const l=e.querySelector("#profile-role").value;try{await Ee.setRoleProfile(l),e.querySelector("#profile-role-current").textContent=`当前: ${l}`,v("角色配置已更新","success")}catch(r){v(`更新失败: ${r.message}`,"error")}}),await t()}function Lt({columns:e,rows:t,empty:l="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${d(l)}</div>`;const r=e.map(i=>`<th class="${i.class||""}">${d(i.label)}</th>`).join(""),s=t.map(i=>`<tr>${e.map(a=>`<td class="${a.class||""}">${a.render?a.render(i):d(i[a.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${r}</tr></thead>
        <tbody>${s}</tbody>
      </table>
    </div>
  `}const it=A();async function Mt(e){e.innerHTML=`
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
  `;const t=e.querySelector("#gw-reply"),l=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{l.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const s=e.querySelector("#gw-publish-btn"),i=e.querySelector("#gw-comment-id").value.trim(),a=e.querySelector("#gw-reply").value.trim(),b=e.querySelector("#gw-source").value.trim(),o=e.querySelector("#gw-force").checked;if(!i||!a){v("Comment ID 和回复内容不能为空","warning");return}s.disabled=!0,s.textContent="发布中...";try{await it.publishGatewayReply({comment_id:i,reply_text:a,source:b,force_publish:o}),v("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",l.textContent="0/0",r()}catch(p){v(`发布失败: ${p.message}`,"error")}finally{s.disabled=!1,s.textContent="发布"}});async function r(){const s=e.querySelector("#gw-table-wrapper"),i=e.querySelector("#gw-limit").value;s.innerHTML='<div class="page-loading">加载中...</div>';try{const a=await it.getGatewayLogs({limit:i}),b=Array.isArray(a==null?void 0:a.items)?a.items:[];if(b.length===0){s.innerHTML='<div class="table-empty">暂无网关日志</div>';return}s.innerHTML=Lt({columns:[{key:"id",label:"ID",class:"cell-id",render:o=>{var p;return d((p=o.id)==null?void 0:p.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:o=>{var p;return d((p=o.comment_id)==null?void 0:p.substring(0,12))}},{key:"status",label:"状态",render:o=>Xe(o.status)},{key:"platform",label:"平台",render:o=>d(o.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:o=>{var p;return d((p=o.reply_text)==null?void 0:p.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:o=>ue(o.created_at)}],rows:b})}catch(a){s.innerHTML=`<div class="page-error">加载失败: ${d(a.message)}</div>`}}e.querySelector("#gw-refresh").addEventListener("click",r),e.querySelector("#gw-filter-btn").addEventListener("click",r),await r()}const Fe=A();async function Bt(e){e.innerHTML=`
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
  `;async function t(){try{const r=await Fe.getAuditSummary({days:7}),s=e.querySelector("#audit-summary-cards");s.innerHTML=`
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
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function l(){const r=e.querySelector("#audit-table-wrapper");r.innerHTML='<div class="page-loading">加载中...</div>';const s=e.querySelector("#audit-action").value.trim(),i=e.querySelector("#audit-ok").value,a=e.querySelector("#audit-limit").value;try{const b=await Fe.getAuditLogs({action:s,ok:i,limit:a}),o=Array.isArray(b==null?void 0:b.items)?b.items:[];if(o.length===0){r.innerHTML='<div class="table-empty">暂无审计日志</div>';return}r.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${o.map(p=>{var u;return`<tr>
              <td class="cell-id">${d((u=p.id)==null?void 0:u.toString().substring(0,8))}</td>
              <td>${d(p.action)}</td>
              <td class="cell-truncate">${d(p.target_id||"-")}</td>
              <td>${p.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${d(p.detail||"-")}</td>
              <td class="cell-time">${ue(p.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(b){r.innerHTML=`<div class="page-error">加载失败: ${d(b.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),l()}),e.querySelector("#audit-filter-btn").addEventListener("click",l),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await Fe.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),v("导出成功","success")}catch(r){v(`导出失败: ${r.message}`,"error")}}),await Promise.all([t(),l()])}const L=A(),Pt=/^BV[a-zA-Z0-9]{10}$/,At={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},Nt={"auth:no active credential":"缺少可用的激活凭证。","dependency:diagnostics_unavailable":"诊断信息暂时不可用。"},It={manual_queue:"人工队列",simulated:"模拟发布",webhook:"Webhook",real_publish:"真实发布",native_bilibili:"原生 B 站发布"},jt={ok:{label:"成功",cls:"badge-success"},no_new:{label:"无新增",cls:"badge-muted"},error:{label:"失败",cls:"badge-danger"}},Ce={no_aid:"缺少视频 aid，暂时无法轮询。",retry_exhausted:"评论抓取重试耗尽。"},ce=50,Ht=7*24*60*60*1e3;function q(e){const t=e instanceof Error?e.message:String(e??"request_failed");return At[t]||t}function Rt(e){return e?Pt.test(e)?null:"invalid_bvid_format":"bvid_required"}function Ot(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function Dt(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function Ut(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(l=>Nt[l]||l).join("；")}function Vt(e){const t=String(e??"").trim().toLowerCase();return It[t]||t||"-"}function ze(e,t,l){return e?t:l}function Wt(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":t%60===0?`${t/60} 分钟`:`${t} 秒`}function Jt(e){const t=Number(e);if(!Number.isFinite(t)||t<=0)return"";if(t<60){const s=60/t;return`约每分钟 ${s.toFixed(s>=10?0:1).replace(/\.0$/,"")} 轮`}if(t<3600){const s=3600/t;return`约每小时 ${s.toFixed(s>=10?0:1).replace(/\.0$/,"")} 轮`}const l=t/3600;return`约每 ${l.toFixed(l>=10?0:1).replace(/\.0$/,"")} 小时 1 轮`}function Kt(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":`${t} 次/分钟`}function Ft(e){const t=Number(e);if(!Number.isFinite(t)||t<=0)return"";const l=t/60;if(l>=1)return`约每秒 ${l.toFixed(l>=10?0:1).replace(/\.0$/,"")} 次`;const r=60/t;return`约每 ${r.toFixed(r>=10?0:1).replace(/\.0$/,"")} 秒 1 次`}function lt(e,t,l="覆盖率"){const r=Number(t??0);if(!Number.isFinite(r)||r<=0)return"暂无视频";const s=Number(e??0),a=((Number.isFinite(s)?Math.min(r,Math.max(0,s)):0)/r*100).toFixed(1).replace(/\.0$/,"");return`${l} ${a}%`}function zt(e,t){const l=Number(e??0);if(!Number.isFinite(l)||l<=0)return"暂无视频";const r=Number(t??0),s=Number.isFinite(r)?Math.min(l,Math.max(0,r)):0,i=Math.max(0,l-s);return`轮询中 ${s}，停用 ${i}`}function Gt(e,t,l){const r=String(e??"").trim().toLowerCase();if(!r)return"-";const s=jt[r]||{label:r,cls:"badge-muted"},i=r==="error"&&t?Ce[String(t).trim().toLowerCase()]||String(t):"",a=i?` title="${d(i)}"`:"",b=typeof l=="number"&&Number.isFinite(l)?`评论游标: ${l}`:"",o=[i,b].filter(Boolean).map(p=>`<div class="form-hint" style="margin-top:4px;">${d(p)}</div>`).join("");return`<span class="status-badge ${s.cls}"${a}>${d(s.label)}</span>${o}`}function Yt(e){if(e==="true")return!0;if(e==="false")return!1}function Zt(e){return e==="true"?"暂无轮询中视频":e==="false"?"暂无已停用视频":"暂无视频"}function V(e){return typeof(e==null?void 0:e.aid)=="number"&&Number.isFinite(e.aid)}function Qt(e){return e.filter(t=>!V(t)).length}function Xt(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)).length}function ei(e){return e.filter(t=>!!(t!=null&&t.poll_enabled)&&!V(t)).length}function ti(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&V(t)).length}function ii(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&!(t!=null&&t.last_polled_at)).length}function li(e){return e.filter(t=>!(t!=null&&t.poll_enabled)&&(t==null?void 0:t.last_polled_at)).length}function ri(e){return e.filter(t=>(t==null?void 0:t.poll_enabled)&&!(t!=null&&t.last_polled_at)).length}function si(e){return e.filter(t=>(t==null?void 0:t.poll_enabled)&&(t==null?void 0:t.last_polled_at)).length}function ni(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="error").length}function ai(e){return e.filter(t=>{const l=String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase();return l==="ok"||l==="no_new"}).length}function oi(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="ok").length}function di(e){return e.filter(t=>String((t==null?void 0:t.last_poll_status)??"").trim().toLowerCase()==="no_new").length}function ci(e){return e.filter(t=>!(t!=null&&t.last_polled_at)).length}function ui(e){return e.filter(t=>V(t)&&!(t!=null&&t.last_polled_at)).length}function pi(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function bi(e){return e.filter(t=>typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function vi(e){return e.filter(t=>String((t==null?void 0:t.title)??"").trim().length>0).length}function fi(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0).length}function yi(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&Number((t==null?void 0:t.comment_count)??0)<=0).length}function hi(e){return e.filter(t=>typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function gi(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)>0&&!(typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid))).length}function mi(e){return e.filter(t=>Number((t==null?void 0:t.comment_count)??0)<=0&&typeof(t==null?void 0:t.last_rpid)=="number"&&Number.isFinite(t.last_rpid)).length}function $i(e){return e.filter(t=>V(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid)).length}function xi(e){return e.filter(t=>(t==null?void 0:t.last_polled_at)&&!(V(t)&&String((t==null?void 0:t.title)??"").trim().length>0&&typeof(t==null?void 0:t.owner_mid)=="number"&&Number.isFinite(t.owner_mid))).length}function _i(e){return e.reduce((t,l)=>{const r=Number((l==null?void 0:l.comment_count)??0);return t+(Number.isFinite(r)&&r>0?r:0)},0)}function wi(e){const l=V(e)?`aid: ${e.aid}`:Ce.no_aid;return`${d((e==null?void 0:e.bvid)||"-")}${l?`<div class="form-hint" style="margin-top:4px;">${d(l)}</div>`:""}`}function pe(e,t){if(!t)return"";const l=Qe(t),r=P(t);return l?`${e}: ${l}（${r}）`:`${e}: ${r}`}function Si(e){const t=[];return typeof(e==null?void 0:e.owner_mid)=="number"&&Number.isFinite(e.owner_mid)&&t.push(`UP主 MID: ${e.owner_mid}`),e!=null&&e.updated_at&&t.push(pe("更新",e.updated_at)),e!=null&&e.created_at&&t.push(pe("创建",e.created_at)),`${d((e==null?void 0:e.title)||"-")}${t.map(l=>`<div class="form-hint" style="margin-top:4px;">${d(l)}</div>`).join("")}`}function Ei(e){const t=V(e),l=t?"":" disabled",r=t?"":` title="${d(Ce.no_aid)}"`;return`<button class="btn btn-sm bili-sync" data-id="${d(e.id||e.video_id)}" data-has-aid="${t?"true":"false"}"${l}${r}>同步</button>`}function Ci(e,t,l,r=0,s=ce,i=[]){const a=l==="true"?"轮询中":l==="false"?"已停用":"全部",b=Math.floor(r/s)+1,o=Math.max(1,Math.ceil(e/s)),p=Xt(i),u=Math.max(0,i.length-p),g=ei(i),m=ti(i),w=ii(i),y=li(i),f=ri(i),C=si(i),E=Qt(i),W=Math.max(0,i.length-E),H=ni(i),J=ai(i),R=oi(i),O=di(i),c=ci(i),k=ui(i),N=Math.max(0,i.length-c),$=bi(i),Y=Math.max(0,i.length-$),K=vi(i),Z=Math.max(0,i.length-K),D=fi(i),T=Math.max(0,i.length-D),I=yi(i),M=hi(i),Q=gi(i),X=mi(i),ee=Math.max(0,i.length-M),te=pi(i),F=$i(i),ie=Math.max(0,i.length-F),le=xi(i),re=_i(i),be=E>0?`，当前页缺少 aid ${E} 条`:"",se=l===""&&p>0?`，当前页轮询开启 ${p} 条`:"",ve=l===""&&u>0?`，当前页轮询停用 ${u} 条`:"",ne=l===""&&g>0?`，轮询开启但缺少 aid ${g} 条`:"",z=l===""&&m>0?`，轮询停用但可同步 ${m} 条`:"",ae=l===""&&w>0?`，轮询停用且从未轮询 ${w} 条`:"",G=l===""&&y>0?`，轮询停用且已有轮询记录 ${y} 条`:"",qe=l===""&&f>0?`，轮询开启但尚未轮询 ${f} 条`:"",ke=l===""&&C>0?`，轮询开启且已有轮询记录 ${C} 条`:"",Te=W>0?`，可同步 ${W} 条`:"",oe=J>0?`，正常轮询 ${J} 条`:"",fe=R>0?`，成功轮询 ${R} 条`:"",Le=O>0?`，无新增 ${O} 条`:"",Me=H>0?`，轮询失败 ${H} 条`:"",Be=N>0?`，已有轮询记录 ${N} 条`:"",Pe=c>0?`，尚未轮询 ${c} 条`:"",ge=k>0?`，可同步但尚未轮询 ${k} 条`:"",Ae=$>0?`，已识别 UP 主 ${$} 条`:"",me=Y>0?`，缺少 UP 主 ${Y} 条`:"",Ne=K>0?`，已抓取标题 ${K} 条`:"",$e=Z>0?`，缺少标题 ${Z} 条`:"",Ie=F>0?`，信息完整 ${F} 条`:"",je=ie>0?`，信息不完整 ${ie} 条`:"",He=le>0?`，已轮询但信息不完整 ${le} 条`:"",Re=D>0?`，已有评论视频 ${D} 条`:"",Oe=T>0?`，无评论视频 ${T} 条`:"",xe=I>0?`，已轮询但无评论 ${I} 条`:"",De=M>0?`，已有评论游标 ${M} 条`:"",_e=Q>0?`，有评论但无游标 ${Q} 条`:"",Ue=X>0?`，无评论但有游标 ${X} 条`:"",we=ee>0?`，无评论游标 ${ee} 条`:"",Ve=te>0?`，已轮询但无游标 ${te} 条`:"",We=re>0?`，关联评论 ${re} 条`:"";return`筛选: ${a}，共 ${e} 条，当前展示 ${t} 条，第 ${b}/${o} 页${se}${ve}${be}${ne}${z}${ae}${G}${qe}${ke}${Te}${oe}${fe}${Le}${Me}${Be}${Pe}${ge}${Ae}${me}${Ne}${$e}${Ie}${je}${He}${Re}${Oe}${xe}${De}${_e}${Ue}${we}${Ve}${We}`}function rt(e,t={}){const l=Number((e==null?void 0:e.videos)??0),r=Number((e==null?void 0:e.comments)??0),s=Number((e==null?void 0:e.events_injected)??r),i=t.subject||(l===1?"视频":"轮询");return r>0||s>0?`${i}完成，处理 ${l} 个视频，新增 ${r} 条评论，注入 ${s} 个事件。`:l>0?`${i}完成，处理 ${l} 个视频，暂无新增评论。`:`${i}完成，暂无可处理视频。`}function Ge(e,t=Date.now()){const l=new Date(e);if(Number.isNaN(l.getTime()))return"";const r=l.getTime()-t,s=Math.abs(r),i=60*1e3,a=60*i,b=24*a;let o,p;return s<a?(o=Math.max(1,Math.round(s/i)),p="分钟"):s<b?(o=Math.max(1,Math.round(s/a)),p="小时"):(o=Math.max(1,Math.round(s/b)),p="天"),r<=0?`${o}${p}前`:`${o}${p}后`}function x(e,t=Date.now()){if(!e)return{hasExpiry:!1,expired:!1,expiringSoon:!1,label:"未设置",cls:"badge-muted",detail:""};const l=new Date(e);if(Number.isNaN(l.getTime()))return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"时间异常",cls:"badge-danger",detail:String(e)};const r=l.getTime()-t;if(r<=0){const i=Ge(e,t);return{hasExpiry:!0,expired:!0,expiringSoon:!1,label:"已过期",cls:"badge-danger",detail:i?`${i}过期，${P(e)}`:P(e)}}if(r<=Ht){const i=Ge(e,t);return{hasExpiry:!0,expired:!1,expiringSoon:!0,label:"即将过期",cls:"badge-warning",detail:i?`${i}到期，${P(e)}`:P(e)}}const s=Ge(e,t);return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"有效",cls:"badge-success",detail:s?`${s}到期，${P(e)}`:P(e)}}function qi(e){const t=x(e),l=t.detail||(t.hasExpiry?"":"未设置过期时间"),r=l?`<div class="form-hint" style="margin-top:4px;">${d(l)}</div>`:"";return`<span class="status-badge ${t.cls}">${d(t.label)}</span>${r}`}function st(e,t="-"){const l=[];return e!=null&&e.updated_at&&l.push(pe("更新",e.updated_at)),e!=null&&e.created_at&&l.push(pe("创建",e.created_at)),`${d((e==null?void 0:e.name)||t)}${l.map(r=>`<div class="form-hint" style="margin-top:4px;">${d(r)}</div>`).join("")}`}function ki(e){return(e==null?void 0:e.cls)==="badge-danger"?"var(--danger-color)":(e==null?void 0:e.cls)==="badge-warning"?"var(--warning-color)":(e==null?void 0:e.cls)==="badge-success"?"var(--success-color)":"var(--grey-2)"}function Ti(e){if(!e)return{label:"未配置",detail:""};if(e!=null&&e.last_used_at)return{label:Qe(e.last_used_at)||"已使用",detail:P(e.last_used_at)};const t=[];return e!=null&&e.updated_at&&t.push(pe("更新",e.updated_at)),e!=null&&e.created_at&&t.push(pe("创建",e.created_at)),{label:"从未使用",detail:t.join("，")}}function _(e){return!!(e!=null&&e.has_sessdata&&(e!=null&&e.has_bili_jct)&&(e!=null&&e.buvid3))}function Li(e){const t=[];return e!=null&&e.has_sessdata||t.push("SESSDATA"),e!=null&&e.has_bili_jct||t.push("bili_jct"),e!=null&&e.buvid3||t.push("buvid3"),t}function Mi(e,t){return e?t?"凭证字段完整":"凭证字段缺失":"未配置凭证"}function Bi(e){var o,p,u,g,m,w;const t=!!((p=(o=e==null?void 0:e.checks)==null?void 0:o.auth)!=null&&p.ready),l=!!((g=(u=e==null?void 0:e.checks)==null?void 0:u.worker_or_publish)!=null&&g.ready),r=!!((m=e==null?void 0:e.signals)!=null&&m.polling_worker_enabled),s=!!((w=e==null?void 0:e.signals)!=null&&w.native_publish_enabled),i=Array.isArray(e==null?void 0:e.blocking_reasons)?e.blocking_reasons.filter(Boolean):[],a=i.length>0?`，阻塞 ${i.length} 项`:"";return r||s?`${t?"鉴权已就绪":"鉴权未就绪"}，${l?"执行链路可用":"执行链路阻塞"}${a}`:i.length>0?`当前无需鉴权，但诊断仍受阻${a}`:"轮询与发布链路均未启用"}function Pi(e){var s,i,a;const t=!!((s=e==null?void 0:e.signals)!=null&&s.publish_mode_config_ready),l=!!((i=e==null?void 0:e.signals)!=null&&i.native_publish_enabled),r=!!((a=e==null?void 0:e.signals)!=null&&a.polling_worker_enabled);return[t?"模式配置就绪":"模式配置缺失",l?"原生发布启用":"原生发布停用",r?"轮询链路启用":"轮询链路停用"].join("，")}function Ai(e){const t=[e!=null&&e.has_sessdata?"SESSDATA":"",e!=null&&e.has_bili_jct?"bili_jct":"",e!=null&&e.buvid3?`buvid3:${e.buvid3}`:""].filter(Boolean).join(" / ")||"-",l=_(e)?"字段完整":`缺少 ${Li(e).join(" / ")}`;return`${d(t)}${l?`<div class="form-hint" style="margin-top:4px;">${d(l)}</div>`:""}`}function ct(e="",t=""){return`激活: ${e==="active"?"仅激活":e==="inactive"?"仅未激活":"全部"}，过期: ${t==="expired"?"已过期":t==="expiring"?"即将过期":t==="valid"?"有效":t==="unset"?"未设置过期时间":"全部"}`}function Ni(e,t="",l="",r=e.length){const s=e.length,i=ut(e,t,l),a=e.filter(n=>n.is_active||n.active),b=e.filter(n=>!(n.is_active||n.active)),o=a.length,p=b.length,u=e.filter(n=>_(n)).length,g=e.filter(n=>(n.is_active||n.active)&&_(n)).length,m=Math.max(0,u-g),w=Math.max(0,o-g),y=Math.max(0,p-m),f=a.filter(n=>n.last_used_at).length,C=Math.max(0,o-f),E=b.filter(n=>n.last_used_at).length,W=Math.max(0,p-E),H=e.filter(n=>_(n)&&n.last_used_at).length,J=Math.max(0,u-H),R=Math.max(0,s-u),O=e.filter(n=>!_(n)&&n.last_used_at).length,c=Math.max(0,R-O),k=e.filter(n=>!n.last_used_at).length,N=Math.max(0,s-k),$=Date.now(),Y=e.filter(n=>_(n)&&x(n.expires_at,$).hasExpiry&&!x(n.expires_at,$).expired).length,K=e.filter(n=>_(n)&&x(n.expires_at,$).expired).length,Z=e.filter(n=>_(n)&&x(n.expires_at,$).expiringSoon).length,D=e.filter(n=>_(n)&&!x(n.expires_at,$).hasExpiry).length,T=e.map(n=>x(n.expires_at,$)),I=a.map(n=>x(n.expires_at,$)),M=b.map(n=>x(n.expires_at,$)),Q=T.filter(n=>n.hasExpiry).length,X=T.filter(n=>n.hasExpiry&&!n.expired).length,ee=T.filter(n=>n.expired).length,te=T.filter(n=>n.expiringSoon).length,F=I.filter(n=>n.hasExpiry&&!n.expired).length,ie=I.filter(n=>n.expired).length,le=I.filter(n=>n.expiringSoon).length,re=I.filter(n=>!n.hasExpiry).length,be=M.filter(n=>n.hasExpiry&&!n.expired).length,se=M.filter(n=>n.expired).length,ve=M.filter(n=>n.expiringSoon).length,ne=M.filter(n=>!n.hasExpiry).length,z=e.filter(n=>!_(n)&&x(n.expires_at,$).hasExpiry&&!x(n.expires_at,$).expired).length,ae=e.filter(n=>!_(n)&&x(n.expires_at,$).expired).length,G=e.filter(n=>!_(n)&&x(n.expires_at,$).expiringSoon).length,qe=e.filter(n=>!_(n)&&!x(n.expires_at,$).hasExpiry).length,ke=T.filter(n=>!n.hasExpiry).length,Te=ct(t,l),oe=i.filter(n=>_(n)).length,fe=Math.max(0,i.length-oe),Le=i.filter(n=>{if(!_(n))return!1;const U=x(n.expires_at,$);return U.hasExpiry&&!U.expired}).length,Me=i.filter(n=>_(n)?x(n.expires_at,$).expired:!1).length,Be=i.filter(n=>_(n)?x(n.expires_at,$).expiringSoon:!1).length,Pe=i.filter(n=>_(n)?!x(n.expires_at,$).hasExpiry:!1).length,ge=i.filter(n=>_(n)&&(n.is_active||n.active)).length,Ae=Math.max(0,oe-ge),me=i.filter(n=>_(n)&&n.last_used_at).length,Ne=Math.max(0,oe-me),$e=i.filter(n=>!_(n)&&n.last_used_at).length,Ie=Math.max(0,fe-$e),je=i.filter(n=>{if(_(n))return!1;const U=x(n.expires_at,$);return U.hasExpiry&&!U.expired}).length,He=i.filter(n=>_(n)?!1:x(n.expires_at,$).expired).length,Re=i.filter(n=>_(n)?!1:x(n.expires_at,$).expiringSoon).length,Oe=i.filter(n=>_(n)?!1:!x(n.expires_at,$).hasExpiry).length,xe=i.filter(n=>!_(n)&&(n.is_active||n.active)).length,De=Math.max(0,fe-xe),_e=i.filter(n=>n.is_active||n.active).length,Ue=Math.max(0,i.length-_e),we=i.filter(n=>n.last_used_at).length,Ve=Math.max(0,i.length-we),We=i.filter(n=>{const U=x(n.expires_at,$);return U.hasExpiry&&!U.expired}).length,ft=i.filter(n=>x(n.expires_at,$).expired).length,yt=i.filter(n=>x(n.expires_at,$).expiringSoon).length,ht=i.filter(n=>!x(n.expires_at,$).hasExpiry).length,gt=t?"":`，激活 ${_e} 个，未激活 ${Ue} 个`,mt=t?"":`，完整且激活 ${ge} 个，完整但未激活 ${Ae} 个`,$t=t?"":`，缺字段且激活 ${xe} 个，缺字段且未激活 ${De} 个`,xt=t||l?`，筛选结果完整 ${oe} 个${mt}，完整且有效 ${Le} 个，完整且已过期 ${Me} 个，完整且即将过期 ${Be} 个，完整且未设置过期 ${Pe} 个，完整且已使用 ${me} 个，完整但未使用 ${Ne} 个，缺字段 ${fe} 个${$t}，缺字段但已使用 ${$e} 个，缺字段且从未使用 ${Ie} 个，缺字段但有效 ${je} 个，缺字段且已过期 ${He} 个，缺字段且即将过期 ${Re} 个，缺字段且未设置过期 ${Oe} 个${gt}，已使用 ${we} 个，从未使用 ${Ve} 个，有效 ${We} 个，已过期 ${ft} 个，即将过期 ${yt} 个，未设置过期 ${ht} 个`:"";return`共 ${s} 个凭证，激活中 ${o} 个，未激活 ${p} 个，激活且完整 ${g} 个，未激活但完整 ${m} 个，激活但缺字段 ${w} 个，未激活且缺字段 ${y} 个，激活且已使用 ${f} 个，激活但从未使用 ${C} 个，未激活且已使用 ${E} 个，未激活但从未使用 ${W} 个，激活且有效 ${F} 个，未激活且有效 ${be} 个，激活已过期 ${ie} 个，未激活已过期 ${se} 个，激活即将过期 ${le} 个，未激活即将过期 ${ve} 个，激活未设置过期 ${re} 个，未激活未设置过期 ${ne} 个，字段完整 ${u} 个，完整且有效 ${Y} 个，完整且已过期 ${K} 个，完整即将过期 ${Z} 个，完整未设置过期 ${D} 个，完整且已使用 ${H} 个，完整但未使用 ${J} 个，字段缺失 ${R} 个，缺字段但已使用 ${O} 个，缺字段且未使用 ${c} 个，缺字段但有效 ${z} 个，缺字段且已过期 ${ae} 个，缺字段即将过期 ${G} 个，缺字段未设置过期 ${qe} 个，已使用 ${N} 个，从未使用 ${k} 个，设置过期时间 ${Q} 个，有效 ${X} 个，已过期 ${ee} 个，即将过期 ${te} 个，未设置 ${ke} 个；筛选: ${Te}，当前展示 ${r} 个${xt}`}function ut(e,t="",l=""){const r=Date.now();return e.filter(s=>{const i=s.is_active||s.active;if(t==="active"&&!i||t==="inactive"&&i)return!1;const a=x(s.expires_at,r);return!(l==="expired"&&!a.expired||l==="expiring"&&!a.expiringSoon||l==="valid"&&(!a.hasExpiry||a.expired)||l==="unset"&&a.hasExpiry)})}function Ii(e="",t=""){return e||t?`暂无匹配筛选条件的凭证（${ct(e,t)}）`:"暂无凭证"}function nt(e,t,l){const r=e.querySelector(l);t.forEach(s=>{const i=e.querySelector(s);i==null||i.addEventListener("keydown",a=>{a.key==="Enter"&&(a.preventDefault(),r.disabled||r.click())})})}async function ji(e){let t=0;e.innerHTML=`
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
  `;async function l(){var a,b,o,p,u,g,m,w,y,f,C,E,W,H,J,R,O;const i=e.querySelector("#bili-status-cards");i.innerHTML='<div class="page-loading">加载中...</div>';try{const c=await L.getBilibiliStatus(),k=Number((c==null?void 0:c.video_count)??0),N=Number(((a=c==null?void 0:c.videos)==null?void 0:a.poll_enabled_count)??0),$=Math.max(0,k-N),Y=zt(k,N),K=lt(N,k),Z=lt($,k,"占比"),D=!!((b=c==null?void 0:c.diagnostics)!=null&&b.ready),T=Ut((o=c==null?void 0:c.diagnostics)==null?void 0:o.blocking_reasons),I=st(c==null?void 0:c.credential,"未配置"),M=!!(((u=(p=c==null?void 0:c.diagnostics)==null?void 0:p.signals)==null?void 0:u.credential_present)??((m=(g=c==null?void 0:c.diagnostics)==null?void 0:g.release_gates)==null?void 0:m.credential_present)),Q=!!(((y=(w=c==null?void 0:c.diagnostics)==null?void 0:w.signals)==null?void 0:y.credential_complete)??((C=(f=c==null?void 0:c.diagnostics)==null?void 0:f.release_gates)==null?void 0:C.credential_complete)),X=Mi(M,Q),ee=Bi(c==null?void 0:c.diagnostics),te=Vt((E=c==null?void 0:c.diagnostics)==null?void 0:E.effective_publish_mode),F=Pi(c==null?void 0:c.diagnostics),ie=ze(c==null?void 0:c.enabled,"B 站集成已启用","B 站集成已停用"),le=ze(c==null?void 0:c.polling_enabled,"评论轮询已启用","评论轮询已停用"),re=ze(c==null?void 0:c.publish_enabled,"发布链路已启用","发布链路已停用"),be=Wt((W=c==null?void 0:c.config)==null?void 0:W.poll_interval_seconds),se=Jt((H=c==null?void 0:c.config)==null?void 0:H.poll_interval_seconds),ve=Kt((J=c==null?void 0:c.config)==null?void 0:J.rate_limit_per_minute),ne=Ft((R=c==null?void 0:c.config)==null?void 0:R.rate_limit_per_minute),z=x((O=c==null?void 0:c.credential)==null?void 0:O.expires_at),ae=z.detail||(c!=null&&c.credential?"未设置过期时间":"当前无活跃凭证"),G=Ti(c==null?void 0:c.credential);i.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${c!=null&&c.enabled?"✅":"❌"}</div>
          <div class="form-hint" style="margin-top:6px;">${d(ie)}</div>
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
          <div class="stat-value">${k}</div>
          <div class="form-hint" style="margin-top:6px;">${d(Y)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${N}</div>
          <div class="form-hint" style="margin-top:6px;">${d(K)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">停用视频</div>
          <div class="stat-value">${$}</div>
          <div class="form-hint" style="margin-top:6px;">${d(Z)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${I}</div>
          <div class="form-hint" style="margin-top:6px;">${d(X)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${D?"var(--success-color)":"var(--danger-color)"}">${D?"就绪":"阻塞"}</div>
          <div class="form-hint" style="margin-top:6px;">${d(ee)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布模式</div>
          <div class="stat-value">${d(te)}</div>
          <div class="form-hint" style="margin-top:6px;">${d(F)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询间隔</div>
          <div class="stat-value">${d(be)}</div>
          ${se?`<div class="form-hint" style="margin-top:6px;">${d(se)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">速率限制</div>
          <div class="stat-value">${d(ve)}</div>
          ${ne?`<div class="form-hint" style="margin-top:6px;">${d(ne)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">凭证过期</div>
          <div class="stat-value" style="font-size:14px; color:${ki(z)}">${d(z.label)}</div>
          ${ae?`<div class="form-hint" style="margin-top:6px;">${d(ae)}</div>`:""}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">最近使用</div>
          <div class="stat-value" style="font-size:14px;">${d(G.label)}</div>
          ${G.detail?`<div class="form-hint" style="margin-top:6px;">${d(G.detail)}</div>`:""}
        </div>
        ${T?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">阻塞原因: ${d(T)}</div>`:""}
      `}catch(c){i.innerHTML=`<div class="page-error">状态加载失败: ${d(q(c))}</div>`}}async function r(){const i=e.querySelector("#bili-videos-wrapper"),a=e.querySelector("#bili-video-summary"),b=e.querySelector("#bili-video-filter-btn"),o=e.querySelector("#bili-video-poll-filter"),p=e.querySelector("#bili-video-prev"),u=e.querySelector("#bili-video-next"),g=o.value;a.textContent="加载中...",i.innerHTML='<div class="page-loading">加载中...</div>',o.disabled=!0,b.disabled=!0,p.disabled=!0,u.disabled=!0;try{const m=await L.getBilibiliVideos({limit:ce,offset:t,poll_enabled:Yt(g)}),w=Array.isArray(m==null?void 0:m.items)?m.items:Array.isArray(m)?m:[],y=Number((m==null?void 0:m.total)??w.length);if(w.length===0&&y>0&&t>0){t=Math.max(0,t-ce),await r();return}if(a.textContent=Ci(y,w.length,g,t,ce,w),p.disabled=t<=0,u.disabled=t+w.length>=y,w.length===0){i.innerHTML=`<div class="table-empty">${d(Zt(g))}</div>`;return}i.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${w.map(f=>`<tr data-id="${d(f.id||f.video_id)}">
              <td class="cell-id">${wi(f)}</td>
              <td class="cell-truncate">${Si(f)}</td>
              <td>${Ze(f.poll_enabled)}</td>
              <td>${f.comment_count??"-"}</td>
              <td class="cell-time">${f.last_polled_at?ue(f.last_polled_at):"-"}</td>
              <td>${Gt(f.last_poll_status,f.last_poll_error,f.last_rpid)}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${d(f.id||f.video_id)}">${f.poll_enabled?"禁用轮询":"启用轮询"}</button>
                ${Ei(f)}
                <button class="btn btn-sm btn-danger bili-delete" data-id="${d(f.id||f.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".bili-toggle-poll").forEach(f=>{f.addEventListener("click",async()=>{f.disabled=!0;try{await L.toggleBilibiliVideoPoll(f.dataset.id),v("操作成功","success"),await Promise.all([l(),r()])}catch(C){v(`失败: ${q(C)}`,"error")}finally{f.disabled=!1}})}),i.querySelectorAll(".bili-sync").forEach(f=>{f.addEventListener("click",async()=>{if(f.dataset.hasAid==="false"){v(Ce.no_aid,"warning");return}const C=f.textContent;f.disabled=!0,f.textContent="同步中...";try{const E=await L.syncBilibiliVideo(f.dataset.id);v(rt(E==null?void 0:E.result,{subject:"同步"}),"success"),await Promise.all([l(),r()])}catch(E){v(`同步失败: ${q(E)}`,"error")}finally{f.disabled=!1,f.textContent=C}})}),i.querySelectorAll(".bili-delete").forEach(f=>{f.addEventListener("click",async()=>{if(confirm("确定删除此视频？")){f.disabled=!0;try{await L.deleteBilibiliVideo(f.dataset.id),v("已删除","success"),await Promise.all([l(),r()])}catch(C){v(`删除失败: ${q(C)}`,"error")}finally{f.disabled=!1}}})})}catch(m){a.textContent="视频加载失败",i.innerHTML=`<div class="page-error">加载失败: ${d(q(m))}</div>`}finally{o.disabled=!1,b.disabled=!1}}async function s(){const i=e.querySelector("#bili-creds-wrapper"),a=e.querySelector("#bili-cred-summary"),b=e.querySelector("#bili-cred-active-filter"),o=e.querySelector("#bili-cred-expiry-filter"),p=b.value,u=o.value;a.textContent="加载中...",i.innerHTML='<div class="page-loading">加载中...</div>',b.disabled=!0,o.disabled=!0;try{const g=await L.getBilibiliCredentials(),m=Array.isArray(g==null?void 0:g.items)?g.items:Array.isArray(g)?g:[],w=ut(m,p,u);if(a.textContent=Ni(m,p,u,w.length),w.length===0){i.innerHTML=`<div class="table-empty">${d(Ii(p,u))}</div>`;return}i.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期状态</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${w.map(y=>`<tr data-id="${d(y.id||y.credential_id)}">
              <td>${st(y)}</td>
              <td class="cell-id">${Ai(y)}</td>
              <td>${Ze(y.is_active||y.active)}</td>
              <td>${qi(y.expires_at)}</td>
              <td class="cell-time">${y.last_used_at?ue(y.last_used_at):"-"}</td>
              <td class="cell-actions">
                ${y.is_active||y.active?"":`<button class="btn btn-sm cred-activate" data-id="${d(y.id||y.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${d(y.id||y.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".cred-activate").forEach(y=>{y.addEventListener("click",async()=>{y.disabled=!0;try{await L.activateBilibiliCredential(y.dataset.id),v("已激活","success"),await Promise.all([l(),s()])}catch(f){v(`激活失败: ${q(f)}`,"error")}finally{y.disabled=!1}})}),i.querySelectorAll(".cred-delete").forEach(y=>{y.addEventListener("click",async()=>{if(confirm("确定删除此凭证？")){y.disabled=!0;try{await L.deleteBilibiliCredential(y.dataset.id),v("已删除","success"),await Promise.all([l(),s()])}catch(f){v(`删除失败: ${q(f)}`,"error")}finally{y.disabled=!1}}})})}catch(g){a.textContent="凭证加载失败",i.innerHTML=`<div class="page-error">加载失败: ${d(q(g))}</div>`}finally{b.disabled=!1,o.disabled=!1}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const i=e.querySelector("#bili-video-add"),a=e.querySelector("#bili-video-bvid").value.trim(),b=Rt(a);if(b){v(q(b),"warning");return}i.disabled=!0,i.textContent="添加中...";try{await L.addBilibiliVideo(a),v("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([l(),r()])}catch(o){v(`添加失败: ${q(o)}`,"error")}finally{i.disabled=!1,i.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{var p;const i=e.querySelector("#cred-add"),a=Dt(e.querySelector("#cred-expires").value),b={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:a},o=Ot(b);if(o){v(q(o),"warning");return}i.disabled=!0,i.textContent="添加中...";try{const u=await L.addBilibiliCredential(b);v((p=u==null?void 0:u.item)!=null&&p.is_active?"凭证添加成功，已自动激活":"凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([l(),s()])}catch(u){v(`添加失败: ${q(u)}`,"error")}finally{i.disabled=!1,i.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const i=e.querySelector("#bili-poll-btn");i.disabled=!0,i.textContent="轮询中...";try{const a=await L.triggerBilibiliPoll();v(rt(a==null?void 0:a.result),"success"),await Promise.all([l(),r()])}catch(a){v(`轮询失败: ${q(a)}`,"error")}finally{i.disabled=!1,i.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",async()=>{const i=e.querySelector("#bili-refresh");i.disabled=!0,i.textContent="刷新中...";try{await Promise.all([l(),r(),s()])}finally{i.disabled=!1,i.innerHTML='<svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新'}}),e.querySelector("#bili-video-filter-btn").addEventListener("click",()=>{t=0,r()}),e.querySelector("#bili-video-poll-filter").addEventListener("change",()=>{t=0,r()}),e.querySelector("#bili-video-prev").addEventListener("click",()=>{t<=0||(t=Math.max(0,t-ce),r())}),e.querySelector("#bili-video-next").addEventListener("click",()=>{t+=ce,r()}),e.querySelector("#bili-cred-active-filter").addEventListener("change",s),e.querySelector("#bili-cred-expiry-filter").addEventListener("change",s),nt(e,["#bili-video-bvid"],"#bili-video-add"),nt(e,["#cred-name","#cred-sessdata","#cred-bili-jct","#cred-buvid3","#cred-buvid4","#cred-expires"],"#cred-add"),await Promise.all([l(),r(),s()])}const at=A();async function Hi(e){e.innerHTML=`
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
  `,e.querySelector("#query-comment-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-comment-id").value.trim(),l=e.querySelector("#query-comment-result");if(!t){v("请输入 Comment ID","warning");return}l.innerHTML='<div class="page-loading">查询中...</div>';try{const r=await at.getComment(t);l.innerHTML=`
        <div class="detail-card">
          ${Object.entries(r||{}).map(([s,i])=>`
            <div class="detail-row">
              <span class="detail-key">${d(s)}</span>
              <span class="detail-value">${d(typeof i=="object"?JSON.stringify(i,null,2):String(i??"-"))}</span>
            </div>
          `).join("")}
        </div>
      `}catch(r){l.innerHTML=`<div class="page-error">查询失败: ${d(r.message)}</div>`}}),e.querySelector("#query-job-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-job-id").value.trim(),l=e.querySelector("#query-job-result");if(!t){v("请输入 Job ID","warning");return}l.innerHTML='<div class="page-loading">查询中...</div>';try{const r=await at.getJob(t);l.innerHTML=`
        <div class="detail-card">
          ${Object.entries(r||{}).map(([i,a])=>`
            <div class="detail-row">
              <span class="detail-key">${d(i)}</span>
              <span class="detail-value">${d(typeof a=="object"?JSON.stringify(a,null,2):String(a??"-"))}</span>
            </div>
          `).join("")}
        </div>
        ${r!=null&&r.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${d(r.comment_id)}">查看关联评论 →</a></div>`:""}
      `;const s=l.querySelector("#query-goto-comment");s&&s.addEventListener("click",()=>{e.querySelector("#query-comment-id").value=s.dataset.id,e.querySelector("#query-comment-btn").click()})}catch(r){l.innerHTML=`<div class="page-error">查询失败: ${d(r.message)}</div>`}})}const Ye={dashboard:{render:dt,title:"仪表盘"},jobs:{render:St,title:"任务管理"},"daily-metrics":{render:Ct,title:"每日指标"},knowledge:{render:qt,title:"知识库"},"role-cards":{render:kt,title:"角色卡"},profiles:{render:Tt,title:"风格配置"},gateway:{render:Mt,title:"网关"},audit:{render:Bt,title:"审计日志"},bilibili:{render:ji,title:"B站集成"},query:{render:Hi,title:"查询"}};let pt=null;function Ri(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function bt(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function vt(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function Oi(e){e.preventDefault();const t=document.getElementById("login-api-key"),l=document.getElementById("login-error"),r=t.value.trim();if(r){window.__ADMIN_API_KEY__=r;try{await h("/api/admin/overview"),sessionStorage.setItem("admin_api_key",r),vt(),et("dashboard")}catch{l.textContent="API Key 无效或服务不可用",l.style.display="block",window.__ADMIN_API_KEY__=""}}}function Di(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",bt()}function et(e){if(!Ye[e])return;pt=e,document.querySelectorAll("#nav-list .nav-item").forEach(l=>{l.classList.toggle("active",l.dataset.page===e)}),document.getElementById("page-title").textContent=Ye[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',Ye[e].render(t).catch(l=>{t.innerHTML=`<div class="page-error">加载失败: ${l.message}</div>`})}function Ui(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==pt&&et(t)})})}function Vi(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),l=document.getElementById("expand-left-btn");t&&l&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),l.style.display="block"}),l.addEventListener("click",()=>{e.classList.remove("collapsed"),l.style.display="none"}))}function Wi(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let l=0;e.addEventListener("click",()=>{l=(l+1)%t.length,t[l]?document.body.setAttribute("data-theme",t[l]):document.body.removeAttribute("data-theme")})}function Ji(){Vi(),Wi(),Ui(),document.getElementById("login-form").addEventListener("submit",Oi),document.getElementById("logout-btn").addEventListener("click",Di),Ri()?(vt(),et("dashboard")):bt()}Ji();
