(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const l of r)if(l.type==="childList")for(const d of l.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&s(d)}).observe(document,{childList:!0,subtree:!0});function i(r){const l={};return r.integrity&&(l.integrity=r.integrity),r.referrerPolicy&&(l.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?l.credentials="include":r.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(r){if(r.ep)return;r.ep=!0;const l=i(r);fetch(r.href,l)}})();function le(e,t,i){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof i=="string"&&i.trim()?i.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function F(){return(window.__ADMIN_API_KEY__||"").trim()}async function m(e,t={}){const i=F(),s=new Headers(t.headers||{});i&&s.set("x-api-key",i);const r=await fetch(e,{...t,headers:s}),l=await r.json().catch(()=>({}));if(!r.ok){const d=(l==null?void 0:l.detail)||(l==null?void 0:l.error);throw new Error(le(d,r.status,r.statusText))}return l}async function J(e,t){const i=F(),s=new Headers;i&&s.set("x-api-key",i);const r=await fetch(e,{headers:s});if(!r.ok)throw new Error("download_failed");const l=await r.blob(),d=URL.createObjectURL(l),u=document.createElement("a");u.href=d,u.download=t,document.body.appendChild(u),u.click(),document.body.removeChild(u),URL.revokeObjectURL(d)}function w(e){const t=new URLSearchParams;for(const[s,r]of Object.entries(e))r!=null&&r!==""&&t.set(s,String(r));const i=t.toString();return i?`?${i}`:""}function $(){return{getOverview(){return m("/api/admin/overview")},getJobs({status:e,limit:t}={}){return m(`/api/admin/jobs${w({status:e,limit:t})}`)},getJob(e){return m(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return m(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return m(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return m("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return m("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return J(`/export/jobs.csv${w({status:e,limit:t})}`,"jobs.csv")},getComment(e){return m(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,comment_id:t}={}){return m(`/api/admin/gateway/logs${w({limit:e,comment_id:t})}`)},publishGatewayReply(e){return m("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:i}={}){return m(`/api/admin/audit/summary${w({days:e,action:t,ok:i})}`)},getAuditLogs({limit:e,action:t,ok:i}={}){return m(`/api/audit-log${w({limit:e,action:t,ok:i})}`)},exportAuditCsv({limit:e,action:t,ok:i}={}){return J(`/export/audit-logs.csv${w({limit:e,action:t,ok:i})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return m(`/api/metrics/daily${w({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return m(`/api/admin/knowledge${w({limit:e,offset:t})}`)},createKnowledgeEntry(e){return m("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return m(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getRoleCards({limit:e,offset:t}={}){return m(`/api/admin/role-cards${w({limit:e,offset:t})}`)},createRoleCard(e){return m("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return m(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return m(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return m(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return m("/api/admin/style-profile")},setStyleProfile(e){return m("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return m("/api/admin/role-profile")},setRoleProfile(e){return m("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return m("/api/admin/bilibili/status")},getBilibiliVideos({poll_enabled:e,limit:t,offset:i}={}){return m(`/api/admin/bilibili/videos${w({poll_enabled:e,limit:t,offset:i})}`)},addBilibiliVideo(e){return m("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return m(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return m(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return m(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return m("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return m("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return m("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return m(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return m(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function o(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function j(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function re(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const i=Date.now()-t.getTime(),s=Math.floor(i/1e3);if(s<60)return"刚刚";const r=Math.floor(s/60);if(r<60)return`${r}分钟前`;const l=Math.floor(r/60);if(l<24)return`${l}小时前`;const d=Math.floor(l/24);if(d<30)return`${d}天前`;const u=Math.floor(d/30);return u<12?`${u}个月前`:`${Math.floor(u/12)}年前`}catch{return""}}function E(e){const t=re(e),i=j(e);return t?`<span title="${o(i)}">${o(t)}</span>`:`<span title="${o(i)}">${o(i)}</span>`}function q(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const ae={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function N(e){if(!e)return"";const t=ae[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${o(t.label)}</span>`}function O(e,t="是",i="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${o(e?t:i)}</span>`}let B=null;function v(e,t="info"){const i=document.getElementById("app-toast");i&&i.remove(),B&&clearTimeout(B);const s={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},r=document.createElement("div");r.id="app-toast",r.className="toast-notification",r.style.setProperty("--toast-color",s[t]||s.info),r.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(r),requestAnimationFrame(()=>r.classList.add("show"));const l=()=>{r.classList.remove("show"),setTimeout(()=>r.remove(),300)};r.querySelector(".toast-close").onclick=l,B=setTimeout(l,4e3)}const A=$();async function Y(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,i,s,r]=await Promise.all([A.getOverview().catch(()=>null),A.getJobs({limit:5}).catch(()=>null),A.getGatewayLogs({limit:5}).catch(()=>null),A.getAuditSummary({days:7}).catch(()=>null)]),l=t||{},d=Array.isArray(i==null?void 0:i.items)?i.items:[],u=Array.isArray(s==null?void 0:s.items)?s.items:[];e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${q(l.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${q(l.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${q(l.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${q(l.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${q(l.total_failed)}</div>
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
                ${d.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':d.map(a=>{var p,c;return`<tr>
                    <td class="cell-id">${o((p=a.id)==null?void 0:p.substring(0,8))}</td>
                    <td>${N(a.status)}</td>
                    <td class="cell-truncate">${o((c=a.comment_text)==null?void 0:c.substring(0,60))}</td>
                    <td class="cell-time">${o(j(a.created_at))}</td>
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
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{v("正在刷新...","info"),Y(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${o(t.message)}</div>`}}const x=$();async function de(e){let t=new Set;e.innerHTML=`
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
  `;const i=e.querySelector("#jobs-status"),s=e.querySelector("#jobs-limit");async function r(){var u;t.clear(),l();const d=e.querySelector("#jobs-table-wrapper");d.innerHTML='<div class="page-loading">加载中...</div>';try{const a=await x.getJobs({status:i.value,limit:s.value}),p=Array.isArray(a==null?void 0:a.items)?a.items:[];if(p.length===0){d.innerHTML='<div class="table-empty">暂无任务</div>';return}d.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${p.map(c=>{var b,y,S,n;return`
              <tr data-id="${o(c.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${o(c.id)}" /></td>
                <td class="cell-id" title="${o(c.id)}">${o((b=c.id)==null?void 0:b.substring(0,8))}</td>
                <td>${N(c.status)}</td>
                <td class="cell-truncate" title="${o(c.comment_text)}">${o((y=c.comment_text)==null?void 0:y.substring(0,80))}</td>
                <td class="cell-truncate">${o((S=c.reply_text)==null?void 0:S.substring(0,60))}</td>
                <td>${(n=c.risk_flags)!=null&&n.length?c.risk_flags.map(_=>`<span class="risk-flag">${o(_)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${E(c.created_at)}</td>
                <td class="cell-actions">
                  ${c.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${o(c.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${o(c.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(u=d.querySelector("#jobs-select-all"))==null||u.addEventListener("change",c=>{const b=c.target.checked;d.querySelectorAll(".job-checkbox").forEach(y=>{y.checked=b,b?t.add(y.dataset.id):t.delete(y.dataset.id)}),l()}),d.querySelectorAll(".job-checkbox").forEach(c=>{c.addEventListener("change",()=>{c.checked?t.add(c.dataset.id):t.delete(c.dataset.id),l()})}),d.querySelectorAll(".job-approve").forEach(c=>{c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="审批中...";try{await x.approveJob(c.dataset.id),v("审批成功","success"),r()}catch(b){v(`审批失败: ${b.message}`,"error"),c.disabled=!1,c.textContent="审批"}})}),d.querySelectorAll(".job-retry").forEach(c=>{c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="重试中...";try{await x.retryJob(c.dataset.id),v("重试已提交","success"),r()}catch(b){v(`重试失败: ${b.message}`,"error"),c.disabled=!1,c.textContent="重试"}})})}catch(a){d.innerHTML=`<div class="page-error">加载失败: ${o(a.message)}</div>`}}function l(){const d=e.querySelector("#jobs-batch-bar"),u=e.querySelector("#jobs-selected-count");t.size>0?(d.style.display="flex",u.textContent=`已选 ${t.size} 项`):d.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",r),e.querySelector("#jobs-refresh").addEventListener("click",r),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await x.exportJobsCsv({status:i.value,limit:s.value}),v("导出成功","success")}catch(d){v(`导出失败: ${d.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await x.batchApprove([...t]),v(`批量审批 ${t.size} 项成功`,"success"),r()}catch(d){v(`批量审批失败: ${d.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await x.batchRetry([...t]),v(`批量重试 ${t.size} 项成功`,"success"),r()}catch(d){v(`批量重试失败: ${d.message}`,"error")}}),await r()}const oe=$();async function ne(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#metrics-days").value,s=e.querySelector("#metrics-table-wrapper");s.innerHTML='<div class="page-loading">加载中...</div>';try{const r=await oe.getDailyMetrics({days:i}),l=Array.isArray(r==null?void 0:r.items)?r.items:Array.isArray(r)?r:[];if(l.length===0){s.innerHTML='<div class="table-empty">暂无指标数据</div>';return}s.innerHTML=`
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
      `}catch(r){s.innerHTML=`<div class="page-error">加载失败: ${o(r.message)}</div>`}}e.querySelector("#metrics-load").addEventListener("click",t),await t()}const I=$();async function ce(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#knowledge-table-wrapper");i.innerHTML='<div class="page-loading">加载中...</div>';try{const s=await I.getKnowledgeEntries({limit:50}),r=Array.isArray(s==null?void 0:s.items)?s.items:[];if(r.length===0){i.innerHTML='<div class="table-empty">暂无知识条目</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${r.map(l=>{var d,u;return`<tr>
              <td class="cell-id">${o((d=l.id)==null?void 0:d.toString().substring(0,8))}</td>
              <td>${o(l.category)}</td>
              <td>${o(l.title)}</td>
              <td class="cell-truncate">${o((u=l.content)==null?void 0:u.substring(0,80))}</td>
              <td>${O(l.enabled!==!1)}</td>
              <td class="cell-time">${E(l.created_at)}</td>
              <td class="cell-actions">
                ${l.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${o(l.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".knowledge-disable").forEach(l=>{l.addEventListener("click",async()=>{try{await I.disableKnowledgeEntry(l.dataset.id),v("已禁用","success"),t()}catch(d){v(`操作失败: ${d.message}`,"error")}})})}catch(s){i.innerHTML=`<div class="page-error">加载失败: ${o(s.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const i=e.querySelector("#knowledge-category").value.trim(),s=e.querySelector("#knowledge-title").value.trim(),r=e.querySelector("#knowledge-content").value.trim();if(!s||!r){v("标题和内容不能为空","warning");return}try{await I.createKnowledgeEntry({category:i,title:s,content:r}),v("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(l){v(`创建失败: ${l.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const T=$();let C=!1,f=null;async function ue(e){C=!1,f=null,e.innerHTML=`
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
  `;const t=e.querySelector("#rc-select"),i=e.querySelector("#rc-editor");let s=[];function r(){C=!0}function l(){return C?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function d(a){f=a,e.querySelector("#rc-key").value=(a==null?void 0:a.key)||"",e.querySelector("#rc-key").disabled=!!a,e.querySelector("#rc-name").value=(a==null?void 0:a.name)||"",e.querySelector("#rc-desc").value=(a==null?void 0:a.description)||"",e.querySelector("#rc-system-prompt").value=(a==null?void 0:a.system_prompt)||"",e.querySelector("#rc-tone").value=(a==null?void 0:a.tone)||"",e.querySelector("#rc-constraints").value=typeof(a==null?void 0:a.constraints)=="string"?a.constraints:JSON.stringify((a==null?void 0:a.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=a?`编辑: ${a.name||a.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=a&&a.enabled!==!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=a&&a.enabled!==!1?"inline-flex":"none",i.style.display="block",C=!1}i.querySelectorAll(".form-input").forEach(a=>a.addEventListener("input",r));async function u(){try{const a=await T.getRoleCards({limit:100});s=Array.isArray(a==null?void 0:a.items)?a.items:Array.isArray(a)?a:[],t.innerHTML='<option value="">-- 新建 --</option>'+s.map(p=>`<option value="${o(p.key)}">${o(p.name||p.key)}${p.enabled===!1?" (禁用)":""}</option>`).join("")}catch(a){v(`加载失败: ${a.message}`,"error")}}t.addEventListener("change",()=>{if(!l()){t.value=(f==null?void 0:f.key)||"";return}const a=t.value,p=s.find(c=>c.key===a);d(p||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{l()&&(t.value="",d(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const a={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},p=e.querySelector("#rc-constraints").value.trim();try{a.constraints=p?JSON.parse(p):""}catch{a.constraints=p}if(!a.key){v("Key 不能为空","warning");return}try{f!=null&&f.key?(await T.updateRoleCard(f.key,a),v("保存成功","success")):(await T.createRoleCard(a),v("创建成功","success")),C=!1,await u(),t.value=a.key}catch(c){v(`操作失败: ${c.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(f!=null&&f.key)try{await T.activateRoleCard(f.key),v("已激活","success"),await u()}catch(a){v(`激活失败: ${a.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(f!=null&&f.key)try{await T.disableRoleCard(f.key),v("已禁用","success"),await u()}catch(a){v(`禁用失败: ${a.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{u()}),await u()}const M=$();async function ve(e){e.innerHTML=`
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
  `;async function t(){try{const[i,s]=await Promise.all([M.getStyleProfile().catch(()=>null),M.getRoleProfile().catch(()=>null)]);i!=null&&i.style&&(e.querySelector("#profile-style").value=i.style,e.querySelector("#profile-style-current").textContent=`当前: ${i.style}`),s!=null&&s.role&&(e.querySelector("#profile-role").value=s.role,e.querySelector("#profile-role-current").textContent=`当前: ${s.role}`)}catch(i){v(`加载配置失败: ${i.message}`,"error")}}e.querySelector("#profile-style-apply").addEventListener("click",async()=>{const i=e.querySelector("#profile-style").value;try{await M.setStyleProfile(i),e.querySelector("#profile-style-current").textContent=`当前: ${i}`,v("风格已更新","success")}catch(s){v(`更新失败: ${s.message}`,"error")}}),e.querySelector("#profile-role-apply").addEventListener("click",async()=>{const i=e.querySelector("#profile-role").value;try{await M.setRoleProfile(i),e.querySelector("#profile-role-current").textContent=`当前: ${i}`,v("角色配置已更新","success")}catch(s){v(`更新失败: ${s.message}`,"error")}}),await t()}function be({columns:e,rows:t,empty:i="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${o(i)}</div>`;const s=e.map(l=>`<th class="${l.class||""}">${o(l.label)}</th>`).join(""),r=t.map(l=>`<tr>${e.map(d=>`<td class="${d.class||""}">${d.render?d.render(l):o(l[d.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${s}</tr></thead>
        <tbody>${r}</tbody>
      </table>
    </div>
  `}const K=$();async function pe(e){e.innerHTML=`
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
  `;const t=e.querySelector("#gw-reply"),i=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{i.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const r=e.querySelector("#gw-publish-btn"),l=e.querySelector("#gw-comment-id").value.trim(),d=e.querySelector("#gw-reply").value.trim(),u=e.querySelector("#gw-source").value.trim(),a=e.querySelector("#gw-force").checked;if(!l||!d){v("Comment ID 和回复内容不能为空","warning");return}r.disabled=!0,r.textContent="发布中...";try{await K.publishGatewayReply({comment_id:l,reply_text:d,source:u,force_publish:a}),v("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",i.textContent="0/0",s()}catch(p){v(`发布失败: ${p.message}`,"error")}finally{r.disabled=!1,r.textContent="发布"}});async function s(){const r=e.querySelector("#gw-table-wrapper"),l=e.querySelector("#gw-limit").value;r.innerHTML='<div class="page-loading">加载中...</div>';try{const d=await K.getGatewayLogs({limit:l}),u=Array.isArray(d==null?void 0:d.items)?d.items:[];if(u.length===0){r.innerHTML='<div class="table-empty">暂无网关日志</div>';return}r.innerHTML=be({columns:[{key:"id",label:"ID",class:"cell-id",render:a=>{var p;return o((p=a.id)==null?void 0:p.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:a=>{var p;return o((p=a.comment_id)==null?void 0:p.substring(0,12))}},{key:"status",label:"状态",render:a=>N(a.status)},{key:"platform",label:"平台",render:a=>o(a.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:a=>{var p;return o((p=a.reply_text)==null?void 0:p.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:a=>E(a.created_at)}],rows:u})}catch(d){r.innerHTML=`<div class="page-error">加载失败: ${o(d.message)}</div>`}}e.querySelector("#gw-refresh").addEventListener("click",s),e.querySelector("#gw-filter-btn").addEventListener("click",s),await s()}const P=$();async function me(e){e.innerHTML=`
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
  `;async function t(){try{const s=await P.getAuditSummary({days:7}),r=e.querySelector("#audit-summary-cards");r.innerHTML=`
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
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function i(){const s=e.querySelector("#audit-table-wrapper");s.innerHTML='<div class="page-loading">加载中...</div>';const r=e.querySelector("#audit-action").value.trim(),l=e.querySelector("#audit-ok").value,d=e.querySelector("#audit-limit").value;try{const u=await P.getAuditLogs({action:r,ok:l,limit:d}),a=Array.isArray(u==null?void 0:u.items)?u.items:[];if(a.length===0){s.innerHTML='<div class="table-empty">暂无审计日志</div>';return}s.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${a.map(p=>{var c;return`<tr>
              <td class="cell-id">${o((c=p.id)==null?void 0:c.toString().substring(0,8))}</td>
              <td>${o(p.action)}</td>
              <td class="cell-truncate">${o(p.target_id||"-")}</td>
              <td>${p.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${o(p.detail||"-")}</td>
              <td class="cell-time">${E(p.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(u){s.innerHTML=`<div class="page-error">加载失败: ${o(u.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),i()}),e.querySelector("#audit-filter-btn").addEventListener("click",i),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await P.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),v("导出成功","success")}catch(s){v(`导出失败: ${s.message}`,"error")}}),await Promise.all([t(),i()])}const h=$(),ye=/^BV[a-zA-Z0-9]{10}$/,fe={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},ge={"auth:no active credential":"缺少可用的激活凭证。","dependency:diagnostics_unavailable":"诊断信息暂时不可用。"},he={manual_queue:"人工队列",simulated:"模拟发布",webhook:"Webhook",real_publish:"真实发布",native_bilibili:"原生 B 站发布"},we={ok:{label:"成功",cls:"badge-success"},no_new:{label:"无新增",cls:"badge-muted"},error:{label:"失败",cls:"badge-danger"}},$e={no_aid:"缺少视频 aid，暂时无法轮询。",retry_exhausted:"评论抓取重试耗尽。"},L=50;function g(e){const t=e instanceof Error?e.message:String(e??"request_failed");return fe[t]||t}function Se(e){return e?ye.test(e)?null:"invalid_bvid_format":"bvid_required"}function _e(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function qe(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function ke(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(i=>ge[i]||i).join("；")}function xe(e){const t=String(e??"").trim().toLowerCase();return he[t]||t||"-"}function Le(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":t%60===0?`${t/60} 分钟`:`${t} 秒`}function Ee(e,t){const i=String(e??"").trim().toLowerCase();if(!i)return"-";const s=we[i]||{label:i,cls:"badge-muted"},r=i==="error"&&t?$e[String(t).trim().toLowerCase()]||String(t):"",l=r?` title="${o(r)}"`:"";return`<span class="status-badge ${s.cls}"${l}>${o(s.label)}</span>${r?`<div class="form-hint" style="margin-top:4px;">${o(r)}</div>`:""}`}function V(e){return e?j(e):"-"}function Te(e){if(e==="true")return!0;if(e==="false")return!1}function Ce(e){return e==="true"?"暂无轮询中视频":e==="false"?"暂无已停用视频":"暂无视频"}function Ae(e,t,i,s=0,r=L){const l=i==="true"?"轮询中":i==="false"?"已停用":"全部",d=Math.floor(s/r)+1,u=Math.max(1,Math.ceil(e/r));return`筛选: ${l}，共 ${e} 条，当前展示 ${t} 条，第 ${d}/${u} 页`}function U(e,t={}){const i=Number((e==null?void 0:e.videos)??0),s=Number((e==null?void 0:e.comments)??0),r=Number((e==null?void 0:e.events_injected)??s),l=t.subject||(i===1?"视频":"轮询");return s>0||r>0?`${l}完成，处理 ${i} 个视频，新增 ${s} 条评论，注入 ${r} 个事件。`:i>0?`${l}完成，处理 ${i} 个视频，暂无新增评论。`:`${l}完成，暂无可处理视频。`}function Me(e,t="",i=e.length){const s=e.length,r=e.filter(u=>u.is_active||u.active).length,l=e.filter(u=>u.expires_at).length;return`共 ${s} 个凭证，激活中 ${r} 个，设置过期时间 ${l} 个；筛选: ${t==="active"?"仅激活":t==="inactive"?"仅未激活":"全部"}，当前展示 ${i} 个`}function je(e,t){return t==="active"?e.filter(i=>i.is_active||i.active):t==="inactive"?e.filter(i=>!(i.is_active||i.active)):e}function Be(e){return e==="active"?"暂无激活中的凭证":e==="inactive"?"暂无未激活凭证":"暂无凭证"}function z(e,t,i){const s=e.querySelector(i);t.forEach(r=>{const l=e.querySelector(r);l==null||l.addEventListener("keydown",d=>{d.key==="Enter"&&(d.preventDefault(),s.disabled||s.click())})})}async function Ie(e){let t=0;e.innerHTML=`
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
      </div>
      <div class="form-hint" id="bili-cred-summary" style="padding: 0 16px 16px;">加载中...</div>
      <div class="table-wrapper" id="bili-creds-wrapper">
        <div class="page-loading">加载中...</div>
      </div>
    </div>
  `;async function i(){var d,u,a,p,c,b,y,S;const l=e.querySelector("#bili-status-cards");try{const n=await h.getBilibiliStatus(),_=Number(((d=n==null?void 0:n.videos)==null?void 0:d.poll_enabled_count)??0),k=!!((u=n==null?void 0:n.diagnostics)!=null&&u.ready),D=ke((a=n==null?void 0:n.diagnostics)==null?void 0:a.blocking_reasons),X=(p=n==null?void 0:n.credential)!=null&&p.name?o(n.credential.name):"未配置",ee=xe((c=n==null?void 0:n.diagnostics)==null?void 0:c.effective_publish_mode),te=Le((b=n==null?void 0:n.config)==null?void 0:b.poll_interval_seconds),ie=V((y=n==null?void 0:n.credential)==null?void 0:y.expires_at),se=V((S=n==null?void 0:n.credential)==null?void 0:S.last_used_at);l.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${n!=null&&n.enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询</div>
          <div class="stat-value">${n!=null&&n.polling_enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布</div>
          <div class="stat-value">${n!=null&&n.publish_enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">视频数</div>
          <div class="stat-value">${(n==null?void 0:n.video_count)??0}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${_}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${X}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${k?"var(--success-color)":"var(--danger-color)"}">${k?"就绪":"阻塞"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布模式</div>
          <div class="stat-value">${o(ee)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询间隔</div>
          <div class="stat-value">${o(te)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">凭证过期</div>
          <div class="stat-value" style="font-size:14px;">${o(ie)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">最近使用</div>
          <div class="stat-value" style="font-size:14px;">${o(se)}</div>
        </div>
        ${D?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">阻塞原因: ${o(D)}</div>`:""}
      `}catch(n){l.innerHTML=`<div class="page-error">状态加载失败: ${o(g(n))}</div>`}}async function s(){const l=e.querySelector("#bili-videos-wrapper"),d=e.querySelector("#bili-video-summary"),u=e.querySelector("#bili-video-filter-btn"),a=e.querySelector("#bili-video-prev"),p=e.querySelector("#bili-video-next"),c=e.querySelector("#bili-video-poll-filter").value;d.textContent="加载中...",u.disabled=!0,a.disabled=!0,p.disabled=!0;try{const b=await h.getBilibiliVideos({limit:L,offset:t,poll_enabled:Te(c)}),y=Array.isArray(b==null?void 0:b.items)?b.items:Array.isArray(b)?b:[],S=Number((b==null?void 0:b.total)??y.length);if(y.length===0&&S>0&&t>0){t=Math.max(0,t-L),await s();return}if(d.textContent=Ae(S,y.length,c,t,L),a.disabled=t<=0,p.disabled=t+y.length>=S,y.length===0){l.innerHTML=`<div class="table-empty">${o(Ce(c))}</div>`;return}l.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${y.map(n=>`<tr data-id="${o(n.id||n.video_id)}">
              <td class="cell-id">${o(n.bvid)}</td>
              <td class="cell-truncate">${o(n.title||"-")}</td>
              <td>${O(n.poll_enabled)}</td>
              <td>${n.comment_count??"-"}</td>
              <td class="cell-time">${n.last_polled_at?E(n.last_polled_at):"-"}</td>
              <td>${Ee(n.last_poll_status,n.last_poll_error)}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${o(n.id||n.video_id)}">${n.poll_enabled?"禁用轮询":"启用轮询"}</button>
                <button class="btn btn-sm bili-sync" data-id="${o(n.id||n.video_id)}">同步</button>
                <button class="btn btn-sm btn-danger bili-delete" data-id="${o(n.id||n.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,l.querySelectorAll(".bili-toggle-poll").forEach(n=>{n.addEventListener("click",async()=>{n.disabled=!0;try{await h.toggleBilibiliVideoPoll(n.dataset.id),v("操作成功","success"),await Promise.all([i(),s()])}catch(_){v(`失败: ${g(_)}`,"error")}finally{n.disabled=!1}})}),l.querySelectorAll(".bili-sync").forEach(n=>{n.addEventListener("click",async()=>{const _=n.textContent;n.disabled=!0,n.textContent="同步中...";try{const k=await h.syncBilibiliVideo(n.dataset.id);v(U(k==null?void 0:k.result,{subject:"同步"}),"success"),await Promise.all([i(),s()])}catch(k){v(`同步失败: ${g(k)}`,"error")}finally{n.disabled=!1,n.textContent=_}})}),l.querySelectorAll(".bili-delete").forEach(n=>{n.addEventListener("click",async()=>{if(confirm("确定删除此视频？")){n.disabled=!0;try{await h.deleteBilibiliVideo(n.dataset.id),v("已删除","success"),await Promise.all([i(),s()])}catch(_){v(`删除失败: ${g(_)}`,"error")}finally{n.disabled=!1}}})})}catch(b){d.textContent="视频加载失败",l.innerHTML=`<div class="page-error">加载失败: ${o(g(b))}</div>`}finally{u.disabled=!1}}async function r(){const l=e.querySelector("#bili-creds-wrapper"),d=e.querySelector("#bili-cred-summary"),u=e.querySelector("#bili-cred-active-filter").value;try{const a=await h.getBilibiliCredentials(),p=Array.isArray(a==null?void 0:a.items)?a.items:Array.isArray(a)?a:[],c=je(p,u);if(d.textContent=Me(p,u,c.length),c.length===0){l.innerHTML=`<div class="table-empty">${o(Be(u))}</div>`;return}l.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${c.map(b=>`<tr data-id="${o(b.id||b.credential_id)}">
              <td>${o(b.name||"-")}</td>
              <td class="cell-id">${o([b.has_sessdata?"SESSDATA":"",b.has_bili_jct?"bili_jct":"",b.buvid3?`buvid3:${b.buvid3}`:""].filter(Boolean).join(" / ")||"-")}</td>
              <td>${O(b.is_active||b.active)}</td>
              <td class="cell-time">${o(b.expires_at?j(b.expires_at):"-")}</td>
              <td class="cell-time">${b.last_used_at?E(b.last_used_at):"-"}</td>
              <td class="cell-actions">
                ${b.is_active||b.active?"":`<button class="btn btn-sm cred-activate" data-id="${o(b.id||b.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${o(b.id||b.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,l.querySelectorAll(".cred-activate").forEach(b=>{b.addEventListener("click",async()=>{b.disabled=!0;try{await h.activateBilibiliCredential(b.dataset.id),v("已激活","success"),await Promise.all([i(),r()])}catch(y){v(`激活失败: ${g(y)}`,"error")}finally{b.disabled=!1}})}),l.querySelectorAll(".cred-delete").forEach(b=>{b.addEventListener("click",async()=>{if(confirm("确定删除此凭证？")){b.disabled=!0;try{await h.deleteBilibiliCredential(b.dataset.id),v("已删除","success"),await Promise.all([i(),r()])}catch(y){v(`删除失败: ${g(y)}`,"error")}finally{b.disabled=!1}}})})}catch(a){d.textContent="凭证加载失败",l.innerHTML=`<div class="page-error">加载失败: ${o(g(a))}</div>`}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const l=e.querySelector("#bili-video-add"),d=e.querySelector("#bili-video-bvid").value.trim(),u=Se(d);if(u){v(g(u),"warning");return}l.disabled=!0,l.textContent="添加中...";try{await h.addBilibiliVideo(d),v("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([i(),s()])}catch(a){v(`添加失败: ${g(a)}`,"error")}finally{l.disabled=!1,l.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{var p;const l=e.querySelector("#cred-add"),d=qe(e.querySelector("#cred-expires").value),u={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:d},a=_e(u);if(a){v(g(a),"warning");return}l.disabled=!0,l.textContent="添加中...";try{const c=await h.addBilibiliCredential(u);v((p=c==null?void 0:c.item)!=null&&p.is_active?"凭证添加成功，已自动激活":"凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([i(),r()])}catch(c){v(`添加失败: ${g(c)}`,"error")}finally{l.disabled=!1,l.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const l=e.querySelector("#bili-poll-btn");l.disabled=!0,l.textContent="轮询中...";try{const d=await h.triggerBilibiliPoll();v(U(d==null?void 0:d.result),"success"),await Promise.all([i(),s()])}catch(d){v(`轮询失败: ${g(d)}`,"error")}finally{l.disabled=!1,l.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",()=>{i(),s(),r()}),e.querySelector("#bili-video-filter-btn").addEventListener("click",()=>{t=0,s()}),e.querySelector("#bili-video-poll-filter").addEventListener("change",()=>{t=0,s()}),e.querySelector("#bili-video-prev").addEventListener("click",()=>{t<=0||(t=Math.max(0,t-L),s())}),e.querySelector("#bili-video-next").addEventListener("click",()=>{t+=L,s()}),e.querySelector("#bili-cred-active-filter").addEventListener("change",r),z(e,["#bili-video-bvid"],"#bili-video-add"),z(e,["#cred-name","#cred-sessdata","#cred-bili-jct","#cred-buvid3","#cred-buvid4","#cred-expires"],"#cred-add"),await Promise.all([i(),s(),r()])}const G=$();async function Pe(e){e.innerHTML=`
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
  `,e.querySelector("#query-comment-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-comment-id").value.trim(),i=e.querySelector("#query-comment-result");if(!t){v("请输入 Comment ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>';try{const s=await G.getComment(t);i.innerHTML=`
        <div class="detail-card">
          ${Object.entries(s||{}).map(([r,l])=>`
            <div class="detail-row">
              <span class="detail-key">${o(r)}</span>
              <span class="detail-value">${o(typeof l=="object"?JSON.stringify(l,null,2):String(l??"-"))}</span>
            </div>
          `).join("")}
        </div>
      `}catch(s){i.innerHTML=`<div class="page-error">查询失败: ${o(s.message)}</div>`}}),e.querySelector("#query-job-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-job-id").value.trim(),i=e.querySelector("#query-job-result");if(!t){v("请输入 Job ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>';try{const s=await G.getJob(t);i.innerHTML=`
        <div class="detail-card">
          ${Object.entries(s||{}).map(([l,d])=>`
            <div class="detail-row">
              <span class="detail-key">${o(l)}</span>
              <span class="detail-value">${o(typeof d=="object"?JSON.stringify(d,null,2):String(d??"-"))}</span>
            </div>
          `).join("")}
        </div>
        ${s!=null&&s.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${o(s.comment_id)}">查看关联评论 →</a></div>`:""}
      `;const r=i.querySelector("#query-goto-comment");r&&r.addEventListener("click",()=>{e.querySelector("#query-comment-id").value=r.dataset.id,e.querySelector("#query-comment-btn").click()})}catch(s){i.innerHTML=`<div class="page-error">查询失败: ${o(s.message)}</div>`}})}const H={dashboard:{render:Y,title:"仪表盘"},jobs:{render:de,title:"任务管理"},"daily-metrics":{render:ne,title:"每日指标"},knowledge:{render:ce,title:"知识库"},"role-cards":{render:ue,title:"角色卡"},profiles:{render:ve,title:"风格配置"},gateway:{render:pe,title:"网关"},audit:{render:me,title:"审计日志"},bilibili:{render:Ie,title:"B站集成"},query:{render:Pe,title:"查询"}};let W=null;function He(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function Z(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function Q(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function Oe(e){e.preventDefault();const t=document.getElementById("login-api-key"),i=document.getElementById("login-error"),s=t.value.trim();if(s){window.__ADMIN_API_KEY__=s;try{await m("/api/admin/overview"),sessionStorage.setItem("admin_api_key",s),Q(),R("dashboard")}catch{i.textContent="API Key 无效或服务不可用",i.style.display="block",window.__ADMIN_API_KEY__=""}}}function Ne(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",Z()}function R(e){if(!H[e])return;W=e,document.querySelectorAll("#nav-list .nav-item").forEach(i=>{i.classList.toggle("active",i.dataset.page===e)}),document.getElementById("page-title").textContent=H[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',H[e].render(t).catch(i=>{t.innerHTML=`<div class="page-error">加载失败: ${i.message}</div>`})}function Re(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==W&&R(t)})})}function De(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),i=document.getElementById("expand-left-btn");t&&i&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),i.style.display="block"}),i.addEventListener("click",()=>{e.classList.remove("collapsed"),i.style.display="none"}))}function Je(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let i=0;e.addEventListener("click",()=>{i=(i+1)%t.length,t[i]?document.body.setAttribute("data-theme",t[i]):document.body.removeAttribute("data-theme")})}function Ke(){De(),Je(),Re(),document.getElementById("login-form").addEventListener("submit",Oe),document.getElementById("logout-btn").addEventListener("click",Ne),He()?(Q(),R("dashboard")):Z()}Ke();
