(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))s(l);new MutationObserver(l=>{for(const r of l)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function i(l){const r={};return l.integrity&&(r.integrity=l.integrity),l.referrerPolicy&&(r.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?r.credentials="include":l.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(l){if(l.ep)return;l.ep=!0;const r=i(l);fetch(l.href,r)}})();function de(e,t,i){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof i=="string"&&i.trim()?i.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function W(){return(window.__ADMIN_API_KEY__||"").trim()}async function y(e,t={}){const i=W(),s=new Headers(t.headers||{});i&&s.set("x-api-key",i);const l=await fetch(e,{...t,headers:s}),r=await l.json().catch(()=>({}));if(!l.ok){const a=(r==null?void 0:r.detail)||(r==null?void 0:r.error);throw new Error(de(a,l.status,l.statusText))}return r}async function K(e,t){const i=W(),s=new Headers;i&&s.set("x-api-key",i);const l=await fetch(e,{headers:s});if(!l.ok)throw new Error("download_failed");const r=await l.blob(),a=URL.createObjectURL(r),u=document.createElement("a");u.href=a,u.download=t,document.body.appendChild(u),u.click(),document.body.removeChild(u),URL.revokeObjectURL(a)}function w(e){const t=new URLSearchParams;for(const[s,l]of Object.entries(e))l!=null&&l!==""&&t.set(s,String(l));const i=t.toString();return i?`?${i}`:""}function S(){return{getOverview(){return y("/api/admin/overview")},getJobs({status:e,limit:t}={}){return y(`/api/admin/jobs${w({status:e,limit:t})}`)},getJob(e){return y(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return y(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return y(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return y("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return y("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return K(`/export/jobs.csv${w({status:e,limit:t})}`,"jobs.csv")},getComment(e){return y(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,comment_id:t}={}){return y(`/api/admin/gateway/logs${w({limit:e,comment_id:t})}`)},publishGatewayReply(e){return y("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:i}={}){return y(`/api/admin/audit/summary${w({days:e,action:t,ok:i})}`)},getAuditLogs({limit:e,action:t,ok:i}={}){return y(`/api/audit-log${w({limit:e,action:t,ok:i})}`)},exportAuditCsv({limit:e,action:t,ok:i}={}){return K(`/export/audit-logs.csv${w({limit:e,action:t,ok:i})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return y(`/api/metrics/daily${w({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return y(`/api/admin/knowledge${w({limit:e,offset:t})}`)},createKnowledgeEntry(e){return y("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return y(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getRoleCards({limit:e,offset:t}={}){return y(`/api/admin/role-cards${w({limit:e,offset:t})}`)},createRoleCard(e){return y("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return y(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return y(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return y(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return y("/api/admin/style-profile")},setStyleProfile(e){return y("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return y("/api/admin/role-profile")},setRoleProfile(e){return y("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return y("/api/admin/bilibili/status")},getBilibiliVideos({poll_enabled:e,limit:t,offset:i}={}){return y(`/api/admin/bilibili/videos${w({poll_enabled:e,limit:t,offset:i})}`)},addBilibiliVideo(e){return y("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return y(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return y(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return y(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return y("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return y("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return y("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return y(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return y(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function n(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function E(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function ne(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const i=Date.now()-t.getTime(),s=Math.floor(i/1e3);if(s<60)return"刚刚";const l=Math.floor(s/60);if(l<60)return`${l}分钟前`;const r=Math.floor(l/60);if(r<24)return`${r}小时前`;const a=Math.floor(r/24);if(a<30)return`${a}天前`;const u=Math.floor(a/30);return u<12?`${u}个月前`:`${Math.floor(u/12)}年前`}catch{return""}}function T(e){const t=ne(e),i=E(e);return t?`<span title="${n(i)}">${n(t)}</span>`:`<span title="${n(i)}">${n(i)}</span>`}function x(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const oe={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function N(e){if(!e)return"";const t=oe[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${n(t.label)}</span>`}function O(e,t="是",i="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${n(e?t:i)}</span>`}let B=null;function b(e,t="info"){const i=document.getElementById("app-toast");i&&i.remove(),B&&clearTimeout(B);const s={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},l=document.createElement("div");l.id="app-toast",l.className="toast-notification",l.style.setProperty("--toast-color",s[t]||s.info),l.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(l),requestAnimationFrame(()=>l.classList.add("show"));const r=()=>{l.classList.remove("show"),setTimeout(()=>l.remove(),300)};l.querySelector(".toast-close").onclick=r,B=setTimeout(r,4e3)}const M=S();async function Z(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,i,s,l]=await Promise.all([M.getOverview().catch(()=>null),M.getJobs({limit:5}).catch(()=>null),M.getGatewayLogs({limit:5}).catch(()=>null),M.getAuditSummary({days:7}).catch(()=>null)]),r=t||{},a=Array.isArray(i==null?void 0:i.items)?i.items:[],u=Array.isArray(s==null?void 0:s.items)?s.items:[];e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${x(r.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${x(r.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${x(r.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${x(r.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${x(r.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${x(u.length)}</div>
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
                ${a.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':a.map(d=>{var v,c;return`<tr>
                    <td class="cell-id">${n((v=d.id)==null?void 0:v.substring(0,8))}</td>
                    <td>${N(d.status)}</td>
                    <td class="cell-truncate">${n((c=d.comment_text)==null?void 0:c.substring(0,60))}</td>
                    <td class="cell-time">${n(E(d.created_at))}</td>
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
              <div class="stat-value">${x(l==null?void 0:l.total)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">成功</div>
              <div class="stat-value" style="color:var(--success-color)">${x(l==null?void 0:l.ok_count)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">失败</div>
              <div class="stat-value" style="color:var(--danger-color)">${x(l==null?void 0:l.failed_count)}</div>
            </div>
          </div>
        </div>
      </div>
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{b("正在刷新...","info"),Z(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${n(t.message)}</div>`}}const k=S();async function ce(e){let t=new Set;e.innerHTML=`
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
  `;const i=e.querySelector("#jobs-status"),s=e.querySelector("#jobs-limit");async function l(){var u;t.clear(),r();const a=e.querySelector("#jobs-table-wrapper");a.innerHTML='<div class="page-loading">加载中...</div>';try{const d=await k.getJobs({status:i.value,limit:s.value}),v=Array.isArray(d==null?void 0:d.items)?d.items:[];if(v.length===0){a.innerHTML='<div class="table-empty">暂无任务</div>';return}a.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${v.map(c=>{var m,p,g,o;return`
              <tr data-id="${n(c.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${n(c.id)}" /></td>
                <td class="cell-id" title="${n(c.id)}">${n((m=c.id)==null?void 0:m.substring(0,8))}</td>
                <td>${N(c.status)}</td>
                <td class="cell-truncate" title="${n(c.comment_text)}">${n((p=c.comment_text)==null?void 0:p.substring(0,80))}</td>
                <td class="cell-truncate">${n((g=c.reply_text)==null?void 0:g.substring(0,60))}</td>
                <td>${(o=c.risk_flags)!=null&&o.length?c.risk_flags.map(q=>`<span class="risk-flag">${n(q)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${T(c.created_at)}</td>
                <td class="cell-actions">
                  ${c.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${n(c.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${n(c.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(u=a.querySelector("#jobs-select-all"))==null||u.addEventListener("change",c=>{const m=c.target.checked;a.querySelectorAll(".job-checkbox").forEach(p=>{p.checked=m,m?t.add(p.dataset.id):t.delete(p.dataset.id)}),r()}),a.querySelectorAll(".job-checkbox").forEach(c=>{c.addEventListener("change",()=>{c.checked?t.add(c.dataset.id):t.delete(c.dataset.id),r()})}),a.querySelectorAll(".job-approve").forEach(c=>{c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="审批中...";try{await k.approveJob(c.dataset.id),b("审批成功","success"),l()}catch(m){b(`审批失败: ${m.message}`,"error"),c.disabled=!1,c.textContent="审批"}})}),a.querySelectorAll(".job-retry").forEach(c=>{c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="重试中...";try{await k.retryJob(c.dataset.id),b("重试已提交","success"),l()}catch(m){b(`重试失败: ${m.message}`,"error"),c.disabled=!1,c.textContent="重试"}})})}catch(d){a.innerHTML=`<div class="page-error">加载失败: ${n(d.message)}</div>`}}function r(){const a=e.querySelector("#jobs-batch-bar"),u=e.querySelector("#jobs-selected-count");t.size>0?(a.style.display="flex",u.textContent=`已选 ${t.size} 项`):a.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",l),e.querySelector("#jobs-refresh").addEventListener("click",l),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await k.exportJobsCsv({status:i.value,limit:s.value}),b("导出成功","success")}catch(a){b(`导出失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await k.batchApprove([...t]),b(`批量审批 ${t.size} 项成功`,"success"),l()}catch(a){b(`批量审批失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await k.batchRetry([...t]),b(`批量重试 ${t.size} 项成功`,"success"),l()}catch(a){b(`批量重试失败: ${a.message}`,"error")}}),await l()}const ue=S();async function ve(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#metrics-days").value,s=e.querySelector("#metrics-table-wrapper");s.innerHTML='<div class="page-loading">加载中...</div>';try{const l=await ue.getDailyMetrics({days:i}),r=Array.isArray(l==null?void 0:l.items)?l.items:Array.isArray(l)?l:[];if(r.length===0){s.innerHTML='<div class="table-empty">暂无指标数据</div>';return}s.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${r.map(a=>`<tr>
              <td class="cell-time">${n(a.date||a.day)}</td>
              <td>${n(a.comments??a.comment_count??0)}</td>
              <td>${n(a.jobs??a.job_count??0)}</td>
              <td style="color:var(--success-color)">${n(a.published??a.published_count??0)}</td>
              <td style="color:var(--danger-color)">${n(a.failed??a.failed_count??0)}</td>
              <td>${n(a.skipped??a.skipped_count??0)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      `}catch(l){s.innerHTML=`<div class="page-error">加载失败: ${n(l.message)}</div>`}}e.querySelector("#metrics-load").addEventListener("click",t),await t()}const I=S();async function be(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#knowledge-table-wrapper");i.innerHTML='<div class="page-loading">加载中...</div>';try{const s=await I.getKnowledgeEntries({limit:50}),l=Array.isArray(s==null?void 0:s.items)?s.items:[];if(l.length===0){i.innerHTML='<div class="table-empty">暂无知识条目</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${l.map(r=>{var a,u;return`<tr>
              <td class="cell-id">${n((a=r.id)==null?void 0:a.toString().substring(0,8))}</td>
              <td>${n(r.category)}</td>
              <td>${n(r.title)}</td>
              <td class="cell-truncate">${n((u=r.content)==null?void 0:u.substring(0,80))}</td>
              <td>${O(r.enabled!==!1)}</td>
              <td class="cell-time">${T(r.created_at)}</td>
              <td class="cell-actions">
                ${r.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${n(r.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".knowledge-disable").forEach(r=>{r.addEventListener("click",async()=>{try{await I.disableKnowledgeEntry(r.dataset.id),b("已禁用","success"),t()}catch(a){b(`操作失败: ${a.message}`,"error")}})})}catch(s){i.innerHTML=`<div class="page-error">加载失败: ${n(s.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const i=e.querySelector("#knowledge-category").value.trim(),s=e.querySelector("#knowledge-title").value.trim(),l=e.querySelector("#knowledge-content").value.trim();if(!s||!l){b("标题和内容不能为空","warning");return}try{await I.createKnowledgeEntry({category:i,title:s,content:l}),b("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(r){b(`创建失败: ${r.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const C=S();let A=!1,f=null;async function pe(e){A=!1,f=null,e.innerHTML=`
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
  `;const t=e.querySelector("#rc-select"),i=e.querySelector("#rc-editor");let s=[];function l(){A=!0}function r(){return A?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function a(d){f=d,e.querySelector("#rc-key").value=(d==null?void 0:d.key)||"",e.querySelector("#rc-key").disabled=!!d,e.querySelector("#rc-name").value=(d==null?void 0:d.name)||"",e.querySelector("#rc-desc").value=(d==null?void 0:d.description)||"",e.querySelector("#rc-system-prompt").value=(d==null?void 0:d.system_prompt)||"",e.querySelector("#rc-tone").value=(d==null?void 0:d.tone)||"",e.querySelector("#rc-constraints").value=typeof(d==null?void 0:d.constraints)=="string"?d.constraints:JSON.stringify((d==null?void 0:d.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=d?`编辑: ${d.name||d.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=d&&d.enabled!==!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=d&&d.enabled!==!1?"inline-flex":"none",i.style.display="block",A=!1}i.querySelectorAll(".form-input").forEach(d=>d.addEventListener("input",l));async function u(){try{const d=await C.getRoleCards({limit:100});s=Array.isArray(d==null?void 0:d.items)?d.items:Array.isArray(d)?d:[],t.innerHTML='<option value="">-- 新建 --</option>'+s.map(v=>`<option value="${n(v.key)}">${n(v.name||v.key)}${v.enabled===!1?" (禁用)":""}</option>`).join("")}catch(d){b(`加载失败: ${d.message}`,"error")}}t.addEventListener("change",()=>{if(!r()){t.value=(f==null?void 0:f.key)||"";return}const d=t.value,v=s.find(c=>c.key===d);a(v||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{r()&&(t.value="",a(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const d={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},v=e.querySelector("#rc-constraints").value.trim();try{d.constraints=v?JSON.parse(v):""}catch{d.constraints=v}if(!d.key){b("Key 不能为空","warning");return}try{f!=null&&f.key?(await C.updateRoleCard(f.key,d),b("保存成功","success")):(await C.createRoleCard(d),b("创建成功","success")),A=!1,await u(),t.value=d.key}catch(c){b(`操作失败: ${c.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(f!=null&&f.key)try{await C.activateRoleCard(f.key),b("已激活","success"),await u()}catch(d){b(`激活失败: ${d.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(f!=null&&f.key)try{await C.disableRoleCard(f.key),b("已禁用","success"),await u()}catch(d){b(`禁用失败: ${d.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{u()}),await u()}const j=S();async function me(e){e.innerHTML=`
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
  `;async function t(){try{const[i,s]=await Promise.all([j.getStyleProfile().catch(()=>null),j.getRoleProfile().catch(()=>null)]);i!=null&&i.style&&(e.querySelector("#profile-style").value=i.style,e.querySelector("#profile-style-current").textContent=`当前: ${i.style}`),s!=null&&s.role&&(e.querySelector("#profile-role").value=s.role,e.querySelector("#profile-role-current").textContent=`当前: ${s.role}`)}catch(i){b(`加载配置失败: ${i.message}`,"error")}}e.querySelector("#profile-style-apply").addEventListener("click",async()=>{const i=e.querySelector("#profile-style").value;try{await j.setStyleProfile(i),e.querySelector("#profile-style-current").textContent=`当前: ${i}`,b("风格已更新","success")}catch(s){b(`更新失败: ${s.message}`,"error")}}),e.querySelector("#profile-role-apply").addEventListener("click",async()=>{const i=e.querySelector("#profile-role").value;try{await j.setRoleProfile(i),e.querySelector("#profile-role-current").textContent=`当前: ${i}`,b("角色配置已更新","success")}catch(s){b(`更新失败: ${s.message}`,"error")}}),await t()}function ye({columns:e,rows:t,empty:i="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${n(i)}</div>`;const s=e.map(r=>`<th class="${r.class||""}">${n(r.label)}</th>`).join(""),l=t.map(r=>`<tr>${e.map(a=>`<td class="${a.class||""}">${a.render?a.render(r):n(r[a.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${s}</tr></thead>
        <tbody>${l}</tbody>
      </table>
    </div>
  `}const U=S();async function fe(e){e.innerHTML=`
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
  `;const t=e.querySelector("#gw-reply"),i=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{i.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const l=e.querySelector("#gw-publish-btn"),r=e.querySelector("#gw-comment-id").value.trim(),a=e.querySelector("#gw-reply").value.trim(),u=e.querySelector("#gw-source").value.trim(),d=e.querySelector("#gw-force").checked;if(!r||!a){b("Comment ID 和回复内容不能为空","warning");return}l.disabled=!0,l.textContent="发布中...";try{await U.publishGatewayReply({comment_id:r,reply_text:a,source:u,force_publish:d}),b("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",i.textContent="0/0",s()}catch(v){b(`发布失败: ${v.message}`,"error")}finally{l.disabled=!1,l.textContent="发布"}});async function s(){const l=e.querySelector("#gw-table-wrapper"),r=e.querySelector("#gw-limit").value;l.innerHTML='<div class="page-loading">加载中...</div>';try{const a=await U.getGatewayLogs({limit:r}),u=Array.isArray(a==null?void 0:a.items)?a.items:[];if(u.length===0){l.innerHTML='<div class="table-empty">暂无网关日志</div>';return}l.innerHTML=ye({columns:[{key:"id",label:"ID",class:"cell-id",render:d=>{var v;return n((v=d.id)==null?void 0:v.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:d=>{var v;return n((v=d.comment_id)==null?void 0:v.substring(0,12))}},{key:"status",label:"状态",render:d=>N(d.status)},{key:"platform",label:"平台",render:d=>n(d.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:d=>{var v;return n((v=d.reply_text)==null?void 0:v.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:d=>T(d.created_at)}],rows:u})}catch(a){l.innerHTML=`<div class="page-error">加载失败: ${n(a.message)}</div>`}}e.querySelector("#gw-refresh").addEventListener("click",s),e.querySelector("#gw-filter-btn").addEventListener("click",s),await s()}const P=S();async function ge(e){e.innerHTML=`
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
  `;async function t(){try{const s=await P.getAuditSummary({days:7}),l=e.querySelector("#audit-summary-cards");l.innerHTML=`
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
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function i(){const s=e.querySelector("#audit-table-wrapper");s.innerHTML='<div class="page-loading">加载中...</div>';const l=e.querySelector("#audit-action").value.trim(),r=e.querySelector("#audit-ok").value,a=e.querySelector("#audit-limit").value;try{const u=await P.getAuditLogs({action:l,ok:r,limit:a}),d=Array.isArray(u==null?void 0:u.items)?u.items:[];if(d.length===0){s.innerHTML='<div class="table-empty">暂无审计日志</div>';return}s.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${d.map(v=>{var c;return`<tr>
              <td class="cell-id">${n((c=v.id)==null?void 0:c.toString().substring(0,8))}</td>
              <td>${n(v.action)}</td>
              <td class="cell-truncate">${n(v.target_id||"-")}</td>
              <td>${v.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${n(v.detail||"-")}</td>
              <td class="cell-time">${T(v.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(u){s.innerHTML=`<div class="page-error">加载失败: ${n(u.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),i()}),e.querySelector("#audit-filter-btn").addEventListener("click",i),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await P.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),b("导出成功","success")}catch(s){b(`导出失败: ${s.message}`,"error")}}),await Promise.all([t(),i()])}const $=S(),he=/^BV[a-zA-Z0-9]{10}$/,$e={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},we={"auth:no active credential":"缺少可用的激活凭证。","dependency:diagnostics_unavailable":"诊断信息暂时不可用。"},Se={manual_queue:"人工队列",simulated:"模拟发布",webhook:"Webhook",real_publish:"真实发布",native_bilibili:"原生 B 站发布"},qe={ok:{label:"成功",cls:"badge-success"},no_new:{label:"无新增",cls:"badge-muted"},error:{label:"失败",cls:"badge-danger"}},F={no_aid:"缺少视频 aid，暂时无法轮询。",retry_exhausted:"评论抓取重试耗尽。"},L=50,xe=7*24*60*60*1e3;function h(e){const t=e instanceof Error?e.message:String(e??"request_failed");return $e[t]||t}function _e(e){return e?he.test(e)?null:"invalid_bvid_format":"bvid_required"}function ke(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function Le(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function Ee(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(i=>we[i]||i).join("；")}function Te(e){const t=String(e??"").trim().toLowerCase();return Se[t]||t||"-"}function Ce(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":t%60===0?`${t/60} 分钟`:`${t} 秒`}function Ae(e,t){const i=String(e??"").trim().toLowerCase();if(!i)return"-";const s=qe[i]||{label:i,cls:"badge-muted"},l=i==="error"&&t?F[String(t).trim().toLowerCase()]||String(t):"",r=l?` title="${n(l)}"`:"";return`<span class="status-badge ${s.cls}"${r}>${n(s.label)}</span>${l?`<div class="form-hint" style="margin-top:4px;">${n(l)}</div>`:""}`}function z(e){return e?E(e):"-"}function Me(e){if(e==="true")return!0;if(e==="false")return!1}function je(e){return e==="true"?"暂无轮询中视频":e==="false"?"暂无已停用视频":"暂无视频"}function Be(e){return e.filter(t=>!(typeof(t==null?void 0:t.aid)=="number"&&Number.isFinite(t.aid))).length}function Ie(e){const i=typeof(e==null?void 0:e.aid)=="number"&&Number.isFinite(e.aid)?`aid: ${e.aid}`:F.no_aid;return`${n((e==null?void 0:e.bvid)||"-")}${i?`<div class="form-hint" style="margin-top:4px;">${n(i)}</div>`:""}`}function Pe(e,t,i,s=0,l=L,r=[]){const a=i==="true"?"轮询中":i==="false"?"已停用":"全部",u=Math.floor(s/l)+1,d=Math.max(1,Math.ceil(e/l)),v=Be(r),c=v>0?`，当前页缺少 aid ${v} 条`:"";return`筛选: ${a}，共 ${e} 条，当前展示 ${t} 条，第 ${u}/${d} 页${c}`}function V(e,t={}){const i=Number((e==null?void 0:e.videos)??0),s=Number((e==null?void 0:e.comments)??0),l=Number((e==null?void 0:e.events_injected)??s),r=t.subject||(i===1?"视频":"轮询");return s>0||l>0?`${r}完成，处理 ${i} 个视频，新增 ${s} 条评论，注入 ${l} 个事件。`:i>0?`${r}完成，处理 ${i} 个视频，暂无新增评论。`:`${r}完成，暂无可处理视频。`}function R(e,t=Date.now()){if(!e)return{hasExpiry:!1,expired:!1,expiringSoon:!1,label:"未设置",cls:"badge-muted",detail:""};const i=new Date(e);if(Number.isNaN(i.getTime()))return{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"时间异常",cls:"badge-danger",detail:String(e)};const s=i.getTime()-t;return s<=0?{hasExpiry:!0,expired:!0,expiringSoon:!1,label:"已过期",cls:"badge-danger",detail:E(e)}:s<=xe?{hasExpiry:!0,expired:!1,expiringSoon:!0,label:"即将过期",cls:"badge-warning",detail:E(e)}:{hasExpiry:!0,expired:!1,expiringSoon:!1,label:"有效",cls:"badge-success",detail:E(e)}}function He(e){const t=R(e),i=t.detail?`<div class="form-hint" style="margin-top:4px;">${n(t.detail)}</div>`:"";return`<span class="status-badge ${t.cls}">${n(t.label)}</span>${i}`}function Q(e="",t=""){return`激活: ${e==="active"?"仅激活":e==="inactive"?"仅未激活":"全部"}，过期: ${t==="expired"?"已过期":t==="expiring"?"即将过期":t==="valid"?"有效":t==="unset"?"未设置过期时间":"全部"}`}function Oe(e,t="",i="",s=e.length){const l=e.length,r=e.filter(m=>m.is_active||m.active).length,a=Date.now(),u=e.map(m=>R(m.expires_at,a)),d=u.filter(m=>m.hasExpiry).length,v=u.filter(m=>m.expired).length,c=Q(t,i);return`共 ${l} 个凭证，激活中 ${r} 个，设置过期时间 ${d} 个，已过期 ${v} 个；筛选: ${c}，当前展示 ${s} 个`}function Ne(e,t="",i=""){const s=Date.now();return e.filter(l=>{const r=l.is_active||l.active;if(t==="active"&&!r||t==="inactive"&&r)return!1;const a=R(l.expires_at,s);return!(i==="expired"&&!a.expired||i==="expiring"&&!a.expiringSoon||i==="valid"&&(!a.hasExpiry||a.expired)||i==="unset"&&a.hasExpiry)})}function Re(e="",t=""){return e||t?`暂无匹配筛选条件的凭证（${Q(e,t)}）`:"暂无凭证"}function G(e,t,i){const s=e.querySelector(i);t.forEach(l=>{const r=e.querySelector(l);r==null||r.addEventListener("keydown",a=>{a.key==="Enter"&&(a.preventDefault(),s.disabled||s.click())})})}async function De(e){let t=0;e.innerHTML=`
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
  `;async function i(){var a,u,d,v,c,m,p,g;const r=e.querySelector("#bili-status-cards");try{const o=await $.getBilibiliStatus(),q=Number(((a=o==null?void 0:o.videos)==null?void 0:a.poll_enabled_count)??0),_=!!((u=o==null?void 0:o.diagnostics)!=null&&u.ready),J=Ee((d=o==null?void 0:o.diagnostics)==null?void 0:d.blocking_reasons),ie=(v=o==null?void 0:o.credential)!=null&&v.name?n(o.credential.name):"未配置",se=Te((c=o==null?void 0:o.diagnostics)==null?void 0:c.effective_publish_mode),le=Ce((m=o==null?void 0:o.config)==null?void 0:m.poll_interval_seconds),re=z((p=o==null?void 0:o.credential)==null?void 0:p.expires_at),ae=z((g=o==null?void 0:o.credential)==null?void 0:g.last_used_at);r.innerHTML=`
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
          <div class="stat-value">${q}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${ie}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${_?"var(--success-color)":"var(--danger-color)"}">${_?"就绪":"阻塞"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布模式</div>
          <div class="stat-value">${n(se)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询间隔</div>
          <div class="stat-value">${n(le)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">凭证过期</div>
          <div class="stat-value" style="font-size:14px;">${n(re)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">最近使用</div>
          <div class="stat-value" style="font-size:14px;">${n(ae)}</div>
        </div>
        ${J?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">阻塞原因: ${n(J)}</div>`:""}
      `}catch(o){r.innerHTML=`<div class="page-error">状态加载失败: ${n(h(o))}</div>`}}async function s(){const r=e.querySelector("#bili-videos-wrapper"),a=e.querySelector("#bili-video-summary"),u=e.querySelector("#bili-video-filter-btn"),d=e.querySelector("#bili-video-prev"),v=e.querySelector("#bili-video-next"),c=e.querySelector("#bili-video-poll-filter").value;a.textContent="加载中...",u.disabled=!0,d.disabled=!0,v.disabled=!0;try{const m=await $.getBilibiliVideos({limit:L,offset:t,poll_enabled:Me(c)}),p=Array.isArray(m==null?void 0:m.items)?m.items:Array.isArray(m)?m:[],g=Number((m==null?void 0:m.total)??p.length);if(p.length===0&&g>0&&t>0){t=Math.max(0,t-L),await s();return}if(a.textContent=Pe(g,p.length,c,t,L,p),d.disabled=t<=0,v.disabled=t+p.length>=g,p.length===0){r.innerHTML=`<div class="table-empty">${n(je(c))}</div>`;return}r.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${p.map(o=>`<tr data-id="${n(o.id||o.video_id)}">
              <td class="cell-id">${Ie(o)}</td>
              <td class="cell-truncate">${n(o.title||"-")}</td>
              <td>${O(o.poll_enabled)}</td>
              <td>${o.comment_count??"-"}</td>
              <td class="cell-time">${o.last_polled_at?T(o.last_polled_at):"-"}</td>
              <td>${Ae(o.last_poll_status,o.last_poll_error)}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${n(o.id||o.video_id)}">${o.poll_enabled?"禁用轮询":"启用轮询"}</button>
                <button class="btn btn-sm bili-sync" data-id="${n(o.id||o.video_id)}">同步</button>
                <button class="btn btn-sm btn-danger bili-delete" data-id="${n(o.id||o.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,r.querySelectorAll(".bili-toggle-poll").forEach(o=>{o.addEventListener("click",async()=>{o.disabled=!0;try{await $.toggleBilibiliVideoPoll(o.dataset.id),b("操作成功","success"),await Promise.all([i(),s()])}catch(q){b(`失败: ${h(q)}`,"error")}finally{o.disabled=!1}})}),r.querySelectorAll(".bili-sync").forEach(o=>{o.addEventListener("click",async()=>{const q=o.textContent;o.disabled=!0,o.textContent="同步中...";try{const _=await $.syncBilibiliVideo(o.dataset.id);b(V(_==null?void 0:_.result,{subject:"同步"}),"success"),await Promise.all([i(),s()])}catch(_){b(`同步失败: ${h(_)}`,"error")}finally{o.disabled=!1,o.textContent=q}})}),r.querySelectorAll(".bili-delete").forEach(o=>{o.addEventListener("click",async()=>{if(confirm("确定删除此视频？")){o.disabled=!0;try{await $.deleteBilibiliVideo(o.dataset.id),b("已删除","success"),await Promise.all([i(),s()])}catch(q){b(`删除失败: ${h(q)}`,"error")}finally{o.disabled=!1}}})})}catch(m){a.textContent="视频加载失败",r.innerHTML=`<div class="page-error">加载失败: ${n(h(m))}</div>`}finally{u.disabled=!1}}async function l(){const r=e.querySelector("#bili-creds-wrapper"),a=e.querySelector("#bili-cred-summary"),u=e.querySelector("#bili-cred-active-filter").value,d=e.querySelector("#bili-cred-expiry-filter").value;try{const v=await $.getBilibiliCredentials(),c=Array.isArray(v==null?void 0:v.items)?v.items:Array.isArray(v)?v:[],m=Ne(c,u,d);if(a.textContent=Oe(c,u,d,m.length),m.length===0){r.innerHTML=`<div class="table-empty">${n(Re(u,d))}</div>`;return}r.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期状态</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${m.map(p=>`<tr data-id="${n(p.id||p.credential_id)}">
              <td>${n(p.name||"-")}</td>
              <td class="cell-id">${n([p.has_sessdata?"SESSDATA":"",p.has_bili_jct?"bili_jct":"",p.buvid3?`buvid3:${p.buvid3}`:""].filter(Boolean).join(" / ")||"-")}</td>
              <td>${O(p.is_active||p.active)}</td>
              <td>${He(p.expires_at)}</td>
              <td class="cell-time">${p.last_used_at?T(p.last_used_at):"-"}</td>
              <td class="cell-actions">
                ${p.is_active||p.active?"":`<button class="btn btn-sm cred-activate" data-id="${n(p.id||p.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${n(p.id||p.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,r.querySelectorAll(".cred-activate").forEach(p=>{p.addEventListener("click",async()=>{p.disabled=!0;try{await $.activateBilibiliCredential(p.dataset.id),b("已激活","success"),await Promise.all([i(),l()])}catch(g){b(`激活失败: ${h(g)}`,"error")}finally{p.disabled=!1}})}),r.querySelectorAll(".cred-delete").forEach(p=>{p.addEventListener("click",async()=>{if(confirm("确定删除此凭证？")){p.disabled=!0;try{await $.deleteBilibiliCredential(p.dataset.id),b("已删除","success"),await Promise.all([i(),l()])}catch(g){b(`删除失败: ${h(g)}`,"error")}finally{p.disabled=!1}}})})}catch(v){a.textContent="凭证加载失败",r.innerHTML=`<div class="page-error">加载失败: ${n(h(v))}</div>`}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const r=e.querySelector("#bili-video-add"),a=e.querySelector("#bili-video-bvid").value.trim(),u=_e(a);if(u){b(h(u),"warning");return}r.disabled=!0,r.textContent="添加中...";try{await $.addBilibiliVideo(a),b("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([i(),s()])}catch(d){b(`添加失败: ${h(d)}`,"error")}finally{r.disabled=!1,r.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{var v;const r=e.querySelector("#cred-add"),a=Le(e.querySelector("#cred-expires").value),u={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:a},d=ke(u);if(d){b(h(d),"warning");return}r.disabled=!0,r.textContent="添加中...";try{const c=await $.addBilibiliCredential(u);b((v=c==null?void 0:c.item)!=null&&v.is_active?"凭证添加成功，已自动激活":"凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([i(),l()])}catch(c){b(`添加失败: ${h(c)}`,"error")}finally{r.disabled=!1,r.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const r=e.querySelector("#bili-poll-btn");r.disabled=!0,r.textContent="轮询中...";try{const a=await $.triggerBilibiliPoll();b(V(a==null?void 0:a.result),"success"),await Promise.all([i(),s()])}catch(a){b(`轮询失败: ${h(a)}`,"error")}finally{r.disabled=!1,r.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",()=>{i(),s(),l()}),e.querySelector("#bili-video-filter-btn").addEventListener("click",()=>{t=0,s()}),e.querySelector("#bili-video-poll-filter").addEventListener("change",()=>{t=0,s()}),e.querySelector("#bili-video-prev").addEventListener("click",()=>{t<=0||(t=Math.max(0,t-L),s())}),e.querySelector("#bili-video-next").addEventListener("click",()=>{t+=L,s()}),e.querySelector("#bili-cred-active-filter").addEventListener("change",l),e.querySelector("#bili-cred-expiry-filter").addEventListener("change",l),G(e,["#bili-video-bvid"],"#bili-video-add"),G(e,["#cred-name","#cred-sessdata","#cred-bili-jct","#cred-buvid3","#cred-buvid4","#cred-expires"],"#cred-add"),await Promise.all([i(),s(),l()])}const Y=S();async function Je(e){e.innerHTML=`
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
  `,e.querySelector("#query-comment-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-comment-id").value.trim(),i=e.querySelector("#query-comment-result");if(!t){b("请输入 Comment ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>';try{const s=await Y.getComment(t);i.innerHTML=`
        <div class="detail-card">
          ${Object.entries(s||{}).map(([l,r])=>`
            <div class="detail-row">
              <span class="detail-key">${n(l)}</span>
              <span class="detail-value">${n(typeof r=="object"?JSON.stringify(r,null,2):String(r??"-"))}</span>
            </div>
          `).join("")}
        </div>
      `}catch(s){i.innerHTML=`<div class="page-error">查询失败: ${n(s.message)}</div>`}}),e.querySelector("#query-job-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-job-id").value.trim(),i=e.querySelector("#query-job-result");if(!t){b("请输入 Job ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>';try{const s=await Y.getJob(t);i.innerHTML=`
        <div class="detail-card">
          ${Object.entries(s||{}).map(([r,a])=>`
            <div class="detail-row">
              <span class="detail-key">${n(r)}</span>
              <span class="detail-value">${n(typeof a=="object"?JSON.stringify(a,null,2):String(a??"-"))}</span>
            </div>
          `).join("")}
        </div>
        ${s!=null&&s.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${n(s.comment_id)}">查看关联评论 →</a></div>`:""}
      `;const l=i.querySelector("#query-goto-comment");l&&l.addEventListener("click",()=>{e.querySelector("#query-comment-id").value=l.dataset.id,e.querySelector("#query-comment-btn").click()})}catch(s){i.innerHTML=`<div class="page-error">查询失败: ${n(s.message)}</div>`}})}const H={dashboard:{render:Z,title:"仪表盘"},jobs:{render:ce,title:"任务管理"},"daily-metrics":{render:ve,title:"每日指标"},knowledge:{render:be,title:"知识库"},"role-cards":{render:pe,title:"角色卡"},profiles:{render:me,title:"风格配置"},gateway:{render:fe,title:"网关"},audit:{render:ge,title:"审计日志"},bilibili:{render:De,title:"B站集成"},query:{render:Je,title:"查询"}};let X=null;function Ke(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function ee(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function te(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function Ue(e){e.preventDefault();const t=document.getElementById("login-api-key"),i=document.getElementById("login-error"),s=t.value.trim();if(s){window.__ADMIN_API_KEY__=s;try{await y("/api/admin/overview"),sessionStorage.setItem("admin_api_key",s),te(),D("dashboard")}catch{i.textContent="API Key 无效或服务不可用",i.style.display="block",window.__ADMIN_API_KEY__=""}}}function ze(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",ee()}function D(e){if(!H[e])return;X=e,document.querySelectorAll("#nav-list .nav-item").forEach(i=>{i.classList.toggle("active",i.dataset.page===e)}),document.getElementById("page-title").textContent=H[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',H[e].render(t).catch(i=>{t.innerHTML=`<div class="page-error">加载失败: ${i.message}</div>`})}function Ve(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==X&&D(t)})})}function Ge(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),i=document.getElementById("expand-left-btn");t&&i&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),i.style.display="block"}),i.addEventListener("click",()=>{e.classList.remove("collapsed"),i.style.display="none"}))}function Ye(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let i=0;e.addEventListener("click",()=>{i=(i+1)%t.length,t[i]?document.body.setAttribute("data-theme",t[i]):document.body.removeAttribute("data-theme")})}function We(){Ge(),Ye(),Ve(),document.getElementById("login-form").addEventListener("submit",Ue),document.getElementById("logout-btn").addEventListener("click",ze),Ke()?(te(),D("dashboard")):ee()}We();
