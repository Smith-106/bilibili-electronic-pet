(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))l(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&l(a)}).observe(document,{childList:!0,subtree:!0});function i(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function l(s){if(s.ep)return;s.ep=!0;const r=i(s);fetch(s.href,r)}})();function le(e,t,i){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof i=="string"&&i.trim()?i.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function F(){return(window.__ADMIN_API_KEY__||"").trim()}async function p(e,t={}){const i=F(),l=new Headers(t.headers||{});i&&l.set("x-api-key",i);const s=await fetch(e,{...t,headers:l}),r=await s.json().catch(()=>({}));if(!s.ok){const a=(r==null?void 0:r.detail)||(r==null?void 0:r.error);throw new Error(le(a,s.status,s.statusText))}return r}async function J(e,t){const i=F(),l=new Headers;i&&l.set("x-api-key",i);const s=await fetch(e,{headers:l});if(!s.ok)throw new Error("download_failed");const r=await s.blob(),a=URL.createObjectURL(r),v=document.createElement("a");v.href=a,v.download=t,document.body.appendChild(v),v.click(),document.body.removeChild(v),URL.revokeObjectURL(a)}function w(e){const t=new URLSearchParams;for(const[l,s]of Object.entries(e))s!=null&&s!==""&&t.set(l,String(s));const i=t.toString();return i?`?${i}`:""}function $(){return{getOverview(){return p("/api/admin/overview")},getJobs({status:e,limit:t}={}){return p(`/api/admin/jobs${w({status:e,limit:t})}`)},getJob(e){return p(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return p(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return p(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return p("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return p("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return J(`/export/jobs.csv${w({status:e,limit:t})}`,"jobs.csv")},getComment(e){return p(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,comment_id:t}={}){return p(`/api/admin/gateway/logs${w({limit:e,comment_id:t})}`)},publishGatewayReply(e){return p("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:i}={}){return p(`/api/admin/audit/summary${w({days:e,action:t,ok:i})}`)},getAuditLogs({limit:e,action:t,ok:i}={}){return p(`/api/audit-log${w({limit:e,action:t,ok:i})}`)},exportAuditCsv({limit:e,action:t,ok:i}={}){return J(`/export/audit-logs.csv${w({limit:e,action:t,ok:i})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return p(`/api/metrics/daily${w({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return p(`/api/admin/knowledge${w({limit:e,offset:t})}`)},createKnowledgeEntry(e){return p("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return p(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getRoleCards({limit:e,offset:t}={}){return p(`/api/admin/role-cards${w({limit:e,offset:t})}`)},createRoleCard(e){return p("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return p(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return p(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return p(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return p("/api/admin/style-profile")},setStyleProfile(e){return p("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return p("/api/admin/role-profile")},setRoleProfile(e){return p("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return p("/api/admin/bilibili/status")},getBilibiliVideos({poll_enabled:e,limit:t,offset:i}={}){return p(`/api/admin/bilibili/videos${w({poll_enabled:e,limit:t,offset:i})}`)},addBilibiliVideo(e){return p("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return p(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return p(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return p(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return p("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return p("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return p("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return p(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return p(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function o(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function j(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function re(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const i=Date.now()-t.getTime(),l=Math.floor(i/1e3);if(l<60)return"刚刚";const s=Math.floor(l/60);if(s<60)return`${s}分钟前`;const r=Math.floor(s/60);if(r<24)return`${r}小时前`;const a=Math.floor(r/24);if(a<30)return`${a}天前`;const v=Math.floor(a/30);return v<12?`${v}个月前`:`${Math.floor(v/12)}年前`}catch{return""}}function E(e){const t=re(e),i=j(e);return t?`<span title="${o(i)}">${o(t)}</span>`:`<span title="${o(i)}">${o(i)}</span>`}function q(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const ae={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function N(e){if(!e)return"";const t=ae[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${o(t.label)}</span>`}function O(e,t="是",i="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${o(e?t:i)}</span>`}let B=null;function b(e,t="info"){const i=document.getElementById("app-toast");i&&i.remove(),B&&clearTimeout(B);const l={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},s=document.createElement("div");s.id="app-toast",s.className="toast-notification",s.style.setProperty("--toast-color",l[t]||l.info),s.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(s),requestAnimationFrame(()=>s.classList.add("show"));const r=()=>{s.classList.remove("show"),setTimeout(()=>s.remove(),300)};s.querySelector(".toast-close").onclick=r,B=setTimeout(r,4e3)}const A=$();async function Y(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,i,l,s]=await Promise.all([A.getOverview().catch(()=>null),A.getJobs({limit:5}).catch(()=>null),A.getGatewayLogs({limit:5}).catch(()=>null),A.getAuditSummary({days:7}).catch(()=>null)]),r=t||{},a=Array.isArray(i==null?void 0:i.items)?i.items:[],v=Array.isArray(l==null?void 0:l.items)?l.items:[];e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${q(r.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${q(r.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${q(r.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${q(r.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${q(r.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${q(v.length)}</div>
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
                ${a.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':a.map(d=>{var c,u;return`<tr>
                    <td class="cell-id">${o((c=d.id)==null?void 0:c.substring(0,8))}</td>
                    <td>${N(d.status)}</td>
                    <td class="cell-truncate">${o((u=d.comment_text)==null?void 0:u.substring(0,60))}</td>
                    <td class="cell-time">${o(j(d.created_at))}</td>
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
              <div class="stat-value">${q(s==null?void 0:s.total)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">成功</div>
              <div class="stat-value" style="color:var(--success-color)">${q(s==null?void 0:s.ok_count)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">失败</div>
              <div class="stat-value" style="color:var(--danger-color)">${q(s==null?void 0:s.failed_count)}</div>
            </div>
          </div>
        </div>
      </div>
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{b("正在刷新...","info"),Y(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${o(t.message)}</div>`}}const x=$();async function de(e){let t=new Set;e.innerHTML=`
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
  `;const i=e.querySelector("#jobs-status"),l=e.querySelector("#jobs-limit");async function s(){var v;t.clear(),r();const a=e.querySelector("#jobs-table-wrapper");a.innerHTML='<div class="page-loading">加载中...</div>';try{const d=await x.getJobs({status:i.value,limit:l.value}),c=Array.isArray(d==null?void 0:d.items)?d.items:[];if(c.length===0){a.innerHTML='<div class="table-empty">暂无任务</div>';return}a.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${c.map(u=>{var m,f,S,n;return`
              <tr data-id="${o(u.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${o(u.id)}" /></td>
                <td class="cell-id" title="${o(u.id)}">${o((m=u.id)==null?void 0:m.substring(0,8))}</td>
                <td>${N(u.status)}</td>
                <td class="cell-truncate" title="${o(u.comment_text)}">${o((f=u.comment_text)==null?void 0:f.substring(0,80))}</td>
                <td class="cell-truncate">${o((S=u.reply_text)==null?void 0:S.substring(0,60))}</td>
                <td>${(n=u.risk_flags)!=null&&n.length?u.risk_flags.map(_=>`<span class="risk-flag">${o(_)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${E(u.created_at)}</td>
                <td class="cell-actions">
                  ${u.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${o(u.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${o(u.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(v=a.querySelector("#jobs-select-all"))==null||v.addEventListener("change",u=>{const m=u.target.checked;a.querySelectorAll(".job-checkbox").forEach(f=>{f.checked=m,m?t.add(f.dataset.id):t.delete(f.dataset.id)}),r()}),a.querySelectorAll(".job-checkbox").forEach(u=>{u.addEventListener("change",()=>{u.checked?t.add(u.dataset.id):t.delete(u.dataset.id),r()})}),a.querySelectorAll(".job-approve").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="审批中...";try{await x.approveJob(u.dataset.id),b("审批成功","success"),s()}catch(m){b(`审批失败: ${m.message}`,"error"),u.disabled=!1,u.textContent="审批"}})}),a.querySelectorAll(".job-retry").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="重试中...";try{await x.retryJob(u.dataset.id),b("重试已提交","success"),s()}catch(m){b(`重试失败: ${m.message}`,"error"),u.disabled=!1,u.textContent="重试"}})})}catch(d){a.innerHTML=`<div class="page-error">加载失败: ${o(d.message)}</div>`}}function r(){const a=e.querySelector("#jobs-batch-bar"),v=e.querySelector("#jobs-selected-count");t.size>0?(a.style.display="flex",v.textContent=`已选 ${t.size} 项`):a.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",s),e.querySelector("#jobs-refresh").addEventListener("click",s),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await x.exportJobsCsv({status:i.value,limit:l.value}),b("导出成功","success")}catch(a){b(`导出失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await x.batchApprove([...t]),b(`批量审批 ${t.size} 项成功`,"success"),s()}catch(a){b(`批量审批失败: ${a.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await x.batchRetry([...t]),b(`批量重试 ${t.size} 项成功`,"success"),s()}catch(a){b(`批量重试失败: ${a.message}`,"error")}}),await s()}const oe=$();async function ne(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#metrics-days").value,l=e.querySelector("#metrics-table-wrapper");l.innerHTML='<div class="page-loading">加载中...</div>';try{const s=await oe.getDailyMetrics({days:i}),r=Array.isArray(s==null?void 0:s.items)?s.items:Array.isArray(s)?s:[];if(r.length===0){l.innerHTML='<div class="table-empty">暂无指标数据</div>';return}l.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${r.map(a=>`<tr>
              <td class="cell-time">${o(a.date||a.day)}</td>
              <td>${o(a.comments??a.comment_count??0)}</td>
              <td>${o(a.jobs??a.job_count??0)}</td>
              <td style="color:var(--success-color)">${o(a.published??a.published_count??0)}</td>
              <td style="color:var(--danger-color)">${o(a.failed??a.failed_count??0)}</td>
              <td>${o(a.skipped??a.skipped_count??0)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      `}catch(s){l.innerHTML=`<div class="page-error">加载失败: ${o(s.message)}</div>`}}e.querySelector("#metrics-load").addEventListener("click",t),await t()}const P=$();async function ce(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#knowledge-table-wrapper");i.innerHTML='<div class="page-loading">加载中...</div>';try{const l=await P.getKnowledgeEntries({limit:50}),s=Array.isArray(l==null?void 0:l.items)?l.items:[];if(s.length===0){i.innerHTML='<div class="table-empty">暂无知识条目</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${s.map(r=>{var a,v;return`<tr>
              <td class="cell-id">${o((a=r.id)==null?void 0:a.toString().substring(0,8))}</td>
              <td>${o(r.category)}</td>
              <td>${o(r.title)}</td>
              <td class="cell-truncate">${o((v=r.content)==null?void 0:v.substring(0,80))}</td>
              <td>${O(r.enabled!==!1)}</td>
              <td class="cell-time">${E(r.created_at)}</td>
              <td class="cell-actions">
                ${r.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${o(r.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".knowledge-disable").forEach(r=>{r.addEventListener("click",async()=>{try{await P.disableKnowledgeEntry(r.dataset.id),b("已禁用","success"),t()}catch(a){b(`操作失败: ${a.message}`,"error")}})})}catch(l){i.innerHTML=`<div class="page-error">加载失败: ${o(l.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const i=e.querySelector("#knowledge-category").value.trim(),l=e.querySelector("#knowledge-title").value.trim(),s=e.querySelector("#knowledge-content").value.trim();if(!l||!s){b("标题和内容不能为空","warning");return}try{await P.createKnowledgeEntry({category:i,title:l,content:s}),b("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(r){b(`创建失败: ${r.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const T=$();let C=!1,y=null;async function ue(e){C=!1,y=null,e.innerHTML=`
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
  `;const t=e.querySelector("#rc-select"),i=e.querySelector("#rc-editor");let l=[];function s(){C=!0}function r(){return C?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function a(d){y=d,e.querySelector("#rc-key").value=(d==null?void 0:d.key)||"",e.querySelector("#rc-key").disabled=!!d,e.querySelector("#rc-name").value=(d==null?void 0:d.name)||"",e.querySelector("#rc-desc").value=(d==null?void 0:d.description)||"",e.querySelector("#rc-system-prompt").value=(d==null?void 0:d.system_prompt)||"",e.querySelector("#rc-tone").value=(d==null?void 0:d.tone)||"",e.querySelector("#rc-constraints").value=typeof(d==null?void 0:d.constraints)=="string"?d.constraints:JSON.stringify((d==null?void 0:d.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=d?`编辑: ${d.name||d.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=d&&d.enabled!==!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=d&&d.enabled!==!1?"inline-flex":"none",i.style.display="block",C=!1}i.querySelectorAll(".form-input").forEach(d=>d.addEventListener("input",s));async function v(){try{const d=await T.getRoleCards({limit:100});l=Array.isArray(d==null?void 0:d.items)?d.items:Array.isArray(d)?d:[],t.innerHTML='<option value="">-- 新建 --</option>'+l.map(c=>`<option value="${o(c.key)}">${o(c.name||c.key)}${c.enabled===!1?" (禁用)":""}</option>`).join("")}catch(d){b(`加载失败: ${d.message}`,"error")}}t.addEventListener("change",()=>{if(!r()){t.value=(y==null?void 0:y.key)||"";return}const d=t.value,c=l.find(u=>u.key===d);a(c||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{r()&&(t.value="",a(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const d={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},c=e.querySelector("#rc-constraints").value.trim();try{d.constraints=c?JSON.parse(c):""}catch{d.constraints=c}if(!d.key){b("Key 不能为空","warning");return}try{y!=null&&y.key?(await T.updateRoleCard(y.key,d),b("保存成功","success")):(await T.createRoleCard(d),b("创建成功","success")),C=!1,await v(),t.value=d.key}catch(u){b(`操作失败: ${u.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(y!=null&&y.key)try{await T.activateRoleCard(y.key),b("已激活","success"),await v()}catch(d){b(`激活失败: ${d.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(y!=null&&y.key)try{await T.disableRoleCard(y.key),b("已禁用","success"),await v()}catch(d){b(`禁用失败: ${d.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{v()}),await v()}const M=$();async function ve(e){e.innerHTML=`
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
  `;async function t(){try{const[i,l]=await Promise.all([M.getStyleProfile().catch(()=>null),M.getRoleProfile().catch(()=>null)]);i!=null&&i.style&&(e.querySelector("#profile-style").value=i.style,e.querySelector("#profile-style-current").textContent=`当前: ${i.style}`),l!=null&&l.role&&(e.querySelector("#profile-role").value=l.role,e.querySelector("#profile-role-current").textContent=`当前: ${l.role}`)}catch(i){b(`加载配置失败: ${i.message}`,"error")}}e.querySelector("#profile-style-apply").addEventListener("click",async()=>{const i=e.querySelector("#profile-style").value;try{await M.setStyleProfile(i),e.querySelector("#profile-style-current").textContent=`当前: ${i}`,b("风格已更新","success")}catch(l){b(`更新失败: ${l.message}`,"error")}}),e.querySelector("#profile-role-apply").addEventListener("click",async()=>{const i=e.querySelector("#profile-role").value;try{await M.setRoleProfile(i),e.querySelector("#profile-role-current").textContent=`当前: ${i}`,b("角色配置已更新","success")}catch(l){b(`更新失败: ${l.message}`,"error")}}),await t()}function be({columns:e,rows:t,empty:i="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${o(i)}</div>`;const l=e.map(r=>`<th class="${r.class||""}">${o(r.label)}</th>`).join(""),s=t.map(r=>`<tr>${e.map(a=>`<td class="${a.class||""}">${a.render?a.render(r):o(r[a.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${l}</tr></thead>
        <tbody>${s}</tbody>
      </table>
    </div>
  `}const V=$();async function pe(e){e.innerHTML=`
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
  `;const t=e.querySelector("#gw-reply"),i=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{i.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const s=e.querySelector("#gw-publish-btn"),r=e.querySelector("#gw-comment-id").value.trim(),a=e.querySelector("#gw-reply").value.trim(),v=e.querySelector("#gw-source").value.trim(),d=e.querySelector("#gw-force").checked;if(!r||!a){b("Comment ID 和回复内容不能为空","warning");return}s.disabled=!0,s.textContent="发布中...";try{await V.publishGatewayReply({comment_id:r,reply_text:a,source:v,force_publish:d}),b("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",i.textContent="0/0",l()}catch(c){b(`发布失败: ${c.message}`,"error")}finally{s.disabled=!1,s.textContent="发布"}});async function l(){const s=e.querySelector("#gw-table-wrapper"),r=e.querySelector("#gw-limit").value;s.innerHTML='<div class="page-loading">加载中...</div>';try{const a=await V.getGatewayLogs({limit:r}),v=Array.isArray(a==null?void 0:a.items)?a.items:[];if(v.length===0){s.innerHTML='<div class="table-empty">暂无网关日志</div>';return}s.innerHTML=be({columns:[{key:"id",label:"ID",class:"cell-id",render:d=>{var c;return o((c=d.id)==null?void 0:c.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:d=>{var c;return o((c=d.comment_id)==null?void 0:c.substring(0,12))}},{key:"status",label:"状态",render:d=>N(d.status)},{key:"platform",label:"平台",render:d=>o(d.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:d=>{var c;return o((c=d.reply_text)==null?void 0:c.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:d=>E(d.created_at)}],rows:v})}catch(a){s.innerHTML=`<div class="page-error">加载失败: ${o(a.message)}</div>`}}e.querySelector("#gw-refresh").addEventListener("click",l),e.querySelector("#gw-filter-btn").addEventListener("click",l),await l()}const I=$();async function me(e){e.innerHTML=`
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
  `;async function t(){try{const l=await I.getAuditSummary({days:7}),s=e.querySelector("#audit-summary-cards");s.innerHTML=`
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
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function i(){const l=e.querySelector("#audit-table-wrapper");l.innerHTML='<div class="page-loading">加载中...</div>';const s=e.querySelector("#audit-action").value.trim(),r=e.querySelector("#audit-ok").value,a=e.querySelector("#audit-limit").value;try{const v=await I.getAuditLogs({action:s,ok:r,limit:a}),d=Array.isArray(v==null?void 0:v.items)?v.items:[];if(d.length===0){l.innerHTML='<div class="table-empty">暂无审计日志</div>';return}l.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${d.map(c=>{var u;return`<tr>
              <td class="cell-id">${o((u=c.id)==null?void 0:u.toString().substring(0,8))}</td>
              <td>${o(c.action)}</td>
              <td class="cell-truncate">${o(c.target_id||"-")}</td>
              <td>${c.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${o(c.detail||"-")}</td>
              <td class="cell-time">${E(c.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(v){l.innerHTML=`<div class="page-error">加载失败: ${o(v.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),i()}),e.querySelector("#audit-filter-btn").addEventListener("click",i),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await I.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),b("导出成功","success")}catch(l){b(`导出失败: ${l.message}`,"error")}}),await Promise.all([t(),i()])}const h=$(),ye=/^BV[a-zA-Z0-9]{10}$/,fe={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},ge={"auth:no active credential":"缺少可用的激活凭证。","dependency:diagnostics_unavailable":"诊断信息暂时不可用。"},he={manual_queue:"人工队列",simulated:"模拟发布",webhook:"Webhook",real_publish:"真实发布",native_bilibili:"原生 B 站发布"},we={ok:{label:"成功",cls:"badge-success"},no_new:{label:"无新增",cls:"badge-muted"},error:{label:"失败",cls:"badge-danger"}},$e={no_aid:"缺少视频 aid，暂时无法轮询。",retry_exhausted:"评论抓取重试耗尽。"},L=50;function g(e){const t=e instanceof Error?e.message:String(e??"request_failed");return fe[t]||t}function Se(e){return e?ye.test(e)?null:"invalid_bvid_format":"bvid_required"}function _e(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function qe(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function ke(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(i=>ge[i]||i).join("；")}function xe(e){const t=String(e??"").trim().toLowerCase();return he[t]||t||"-"}function Le(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":t%60===0?`${t/60} 分钟`:`${t} 秒`}function Ee(e,t){const i=String(e??"").trim().toLowerCase();if(!i)return"-";const l=we[i]||{label:i,cls:"badge-muted"},s=i==="error"&&t?$e[String(t).trim().toLowerCase()]||String(t):"",r=s?` title="${o(s)}"`:"";return`<span class="status-badge ${l.cls}"${r}>${o(l.label)}</span>${s?`<div class="form-hint" style="margin-top:4px;">${o(s)}</div>`:""}`}function K(e){return e?j(e):"-"}function Te(e){if(e==="true")return!0;if(e==="false")return!1}function Ce(e){return e==="true"?"暂无轮询中视频":e==="false"?"暂无已停用视频":"暂无视频"}function Ae(e,t,i,l=0,s=L){const r=i==="true"?"轮询中":i==="false"?"已停用":"全部",a=Math.floor(l/s)+1,v=Math.max(1,Math.ceil(e/s));return`筛选: ${r}，共 ${e} 条，当前展示 ${t} 条，第 ${a}/${v} 页`}function U(e,t={}){const i=Number((e==null?void 0:e.videos)??0),l=Number((e==null?void 0:e.comments)??0),s=Number((e==null?void 0:e.events_injected)??l),r=t.subject||(i===1?"视频":"轮询");return l>0||s>0?`${r}完成，处理 ${i} 个视频，新增 ${l} 条评论，注入 ${s} 个事件。`:i>0?`${r}完成，处理 ${i} 个视频，暂无新增评论。`:`${r}完成，暂无可处理视频。`}function Me(e){const t=e.length,i=e.filter(s=>s.is_active||s.active).length,l=e.filter(s=>s.expires_at).length;return`共 ${t} 个凭证，激活中 ${i} 个，设置过期时间 ${l} 个`}function z(e,t,i){const l=e.querySelector(i);t.forEach(s=>{const r=e.querySelector(s);r==null||r.addEventListener("keydown",a=>{a.key==="Enter"&&(a.preventDefault(),l.disabled||l.click())})})}async function je(e){let t=0;e.innerHTML=`
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
      <div class="form-hint" id="bili-cred-summary" style="padding: 0 16px 16px;">加载中...</div>
      <div class="table-wrapper" id="bili-creds-wrapper">
        <div class="page-loading">加载中...</div>
      </div>
    </div>
  `;async function i(){var a,v,d,c,u,m,f,S;const r=e.querySelector("#bili-status-cards");try{const n=await h.getBilibiliStatus(),_=Number(((a=n==null?void 0:n.videos)==null?void 0:a.poll_enabled_count)??0),k=!!((v=n==null?void 0:n.diagnostics)!=null&&v.ready),D=ke((d=n==null?void 0:n.diagnostics)==null?void 0:d.blocking_reasons),X=(c=n==null?void 0:n.credential)!=null&&c.name?o(n.credential.name):"未配置",ee=xe((u=n==null?void 0:n.diagnostics)==null?void 0:u.effective_publish_mode),te=Le((m=n==null?void 0:n.config)==null?void 0:m.poll_interval_seconds),ie=K((f=n==null?void 0:n.credential)==null?void 0:f.expires_at),se=K((S=n==null?void 0:n.credential)==null?void 0:S.last_used_at);r.innerHTML=`
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
      `}catch(n){r.innerHTML=`<div class="page-error">状态加载失败: ${o(g(n))}</div>`}}async function l(){const r=e.querySelector("#bili-videos-wrapper"),a=e.querySelector("#bili-video-summary"),v=e.querySelector("#bili-video-filter-btn"),d=e.querySelector("#bili-video-prev"),c=e.querySelector("#bili-video-next"),u=e.querySelector("#bili-video-poll-filter").value;a.textContent="加载中...",v.disabled=!0,d.disabled=!0,c.disabled=!0;try{const m=await h.getBilibiliVideos({limit:L,offset:t,poll_enabled:Te(u)}),f=Array.isArray(m==null?void 0:m.items)?m.items:Array.isArray(m)?m:[],S=Number((m==null?void 0:m.total)??f.length);if(f.length===0&&S>0&&t>0){t=Math.max(0,t-L),await l();return}if(a.textContent=Ae(S,f.length,u,t,L),d.disabled=t<=0,c.disabled=t+f.length>=S,f.length===0){r.innerHTML=`<div class="table-empty">${o(Ce(u))}</div>`;return}r.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${f.map(n=>`<tr data-id="${o(n.id||n.video_id)}">
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
      `,r.querySelectorAll(".bili-toggle-poll").forEach(n=>{n.addEventListener("click",async()=>{n.disabled=!0;try{await h.toggleBilibiliVideoPoll(n.dataset.id),b("操作成功","success"),await Promise.all([i(),l()])}catch(_){b(`失败: ${g(_)}`,"error")}finally{n.disabled=!1}})}),r.querySelectorAll(".bili-sync").forEach(n=>{n.addEventListener("click",async()=>{const _=n.textContent;n.disabled=!0,n.textContent="同步中...";try{const k=await h.syncBilibiliVideo(n.dataset.id);b(U(k==null?void 0:k.result,{subject:"同步"}),"success"),await Promise.all([i(),l()])}catch(k){b(`同步失败: ${g(k)}`,"error")}finally{n.disabled=!1,n.textContent=_}})}),r.querySelectorAll(".bili-delete").forEach(n=>{n.addEventListener("click",async()=>{if(confirm("确定删除此视频？")){n.disabled=!0;try{await h.deleteBilibiliVideo(n.dataset.id),b("已删除","success"),await Promise.all([i(),l()])}catch(_){b(`删除失败: ${g(_)}`,"error")}finally{n.disabled=!1}}})})}catch(m){a.textContent="视频加载失败",r.innerHTML=`<div class="page-error">加载失败: ${o(g(m))}</div>`}finally{v.disabled=!1}}async function s(){const r=e.querySelector("#bili-creds-wrapper"),a=e.querySelector("#bili-cred-summary");try{const v=await h.getBilibiliCredentials(),d=Array.isArray(v==null?void 0:v.items)?v.items:Array.isArray(v)?v:[];if(a.textContent=Me(d),d.length===0){r.innerHTML='<div class="table-empty">暂无凭证</div>';return}r.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${d.map(c=>`<tr data-id="${o(c.id||c.credential_id)}">
              <td>${o(c.name||"-")}</td>
              <td class="cell-id">${o([c.has_sessdata?"SESSDATA":"",c.has_bili_jct?"bili_jct":"",c.buvid3?`buvid3:${c.buvid3}`:""].filter(Boolean).join(" / ")||"-")}</td>
              <td>${O(c.is_active||c.active)}</td>
              <td class="cell-time">${o(c.expires_at?j(c.expires_at):"-")}</td>
              <td class="cell-time">${c.last_used_at?E(c.last_used_at):"-"}</td>
              <td class="cell-actions">
                ${c.is_active||c.active?"":`<button class="btn btn-sm cred-activate" data-id="${o(c.id||c.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${o(c.id||c.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,r.querySelectorAll(".cred-activate").forEach(c=>{c.addEventListener("click",async()=>{c.disabled=!0;try{await h.activateBilibiliCredential(c.dataset.id),b("已激活","success"),await Promise.all([i(),s()])}catch(u){b(`激活失败: ${g(u)}`,"error")}finally{c.disabled=!1}})}),r.querySelectorAll(".cred-delete").forEach(c=>{c.addEventListener("click",async()=>{if(confirm("确定删除此凭证？")){c.disabled=!0;try{await h.deleteBilibiliCredential(c.dataset.id),b("已删除","success"),await Promise.all([i(),s()])}catch(u){b(`删除失败: ${g(u)}`,"error")}finally{c.disabled=!1}}})})}catch(v){a.textContent="凭证加载失败",r.innerHTML=`<div class="page-error">加载失败: ${o(g(v))}</div>`}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const r=e.querySelector("#bili-video-add"),a=e.querySelector("#bili-video-bvid").value.trim(),v=Se(a);if(v){b(g(v),"warning");return}r.disabled=!0,r.textContent="添加中...";try{await h.addBilibiliVideo(a),b("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([i(),l()])}catch(d){b(`添加失败: ${g(d)}`,"error")}finally{r.disabled=!1,r.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{var c;const r=e.querySelector("#cred-add"),a=qe(e.querySelector("#cred-expires").value),v={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:a},d=_e(v);if(d){b(g(d),"warning");return}r.disabled=!0,r.textContent="添加中...";try{const u=await h.addBilibiliCredential(v);b((c=u==null?void 0:u.item)!=null&&c.is_active?"凭证添加成功，已自动激活":"凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([i(),s()])}catch(u){b(`添加失败: ${g(u)}`,"error")}finally{r.disabled=!1,r.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const r=e.querySelector("#bili-poll-btn");r.disabled=!0,r.textContent="轮询中...";try{const a=await h.triggerBilibiliPoll();b(U(a==null?void 0:a.result),"success"),await Promise.all([i(),l()])}catch(a){b(`轮询失败: ${g(a)}`,"error")}finally{r.disabled=!1,r.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",()=>{i(),l(),s()}),e.querySelector("#bili-video-filter-btn").addEventListener("click",()=>{t=0,l()}),e.querySelector("#bili-video-poll-filter").addEventListener("change",()=>{t=0,l()}),e.querySelector("#bili-video-prev").addEventListener("click",()=>{t<=0||(t=Math.max(0,t-L),l())}),e.querySelector("#bili-video-next").addEventListener("click",()=>{t+=L,l()}),z(e,["#bili-video-bvid"],"#bili-video-add"),z(e,["#cred-name","#cred-sessdata","#cred-bili-jct","#cred-buvid3","#cred-buvid4","#cred-expires"],"#cred-add"),await Promise.all([i(),l(),s()])}const G=$();async function Be(e){e.innerHTML=`
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
  `,e.querySelector("#query-comment-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-comment-id").value.trim(),i=e.querySelector("#query-comment-result");if(!t){b("请输入 Comment ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>';try{const l=await G.getComment(t);i.innerHTML=`
        <div class="detail-card">
          ${Object.entries(l||{}).map(([s,r])=>`
            <div class="detail-row">
              <span class="detail-key">${o(s)}</span>
              <span class="detail-value">${o(typeof r=="object"?JSON.stringify(r,null,2):String(r??"-"))}</span>
            </div>
          `).join("")}
        </div>
      `}catch(l){i.innerHTML=`<div class="page-error">查询失败: ${o(l.message)}</div>`}}),e.querySelector("#query-job-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-job-id").value.trim(),i=e.querySelector("#query-job-result");if(!t){b("请输入 Job ID","warning");return}i.innerHTML='<div class="page-loading">查询中...</div>';try{const l=await G.getJob(t);i.innerHTML=`
        <div class="detail-card">
          ${Object.entries(l||{}).map(([r,a])=>`
            <div class="detail-row">
              <span class="detail-key">${o(r)}</span>
              <span class="detail-value">${o(typeof a=="object"?JSON.stringify(a,null,2):String(a??"-"))}</span>
            </div>
          `).join("")}
        </div>
        ${l!=null&&l.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${o(l.comment_id)}">查看关联评论 →</a></div>`:""}
      `;const s=i.querySelector("#query-goto-comment");s&&s.addEventListener("click",()=>{e.querySelector("#query-comment-id").value=s.dataset.id,e.querySelector("#query-comment-btn").click()})}catch(l){i.innerHTML=`<div class="page-error">查询失败: ${o(l.message)}</div>`}})}const H={dashboard:{render:Y,title:"仪表盘"},jobs:{render:de,title:"任务管理"},"daily-metrics":{render:ne,title:"每日指标"},knowledge:{render:ce,title:"知识库"},"role-cards":{render:ue,title:"角色卡"},profiles:{render:ve,title:"风格配置"},gateway:{render:pe,title:"网关"},audit:{render:me,title:"审计日志"},bilibili:{render:je,title:"B站集成"},query:{render:Be,title:"查询"}};let W=null;function Pe(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function Z(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function Q(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function Ie(e){e.preventDefault();const t=document.getElementById("login-api-key"),i=document.getElementById("login-error"),l=t.value.trim();if(l){window.__ADMIN_API_KEY__=l;try{await p("/api/admin/overview"),sessionStorage.setItem("admin_api_key",l),Q(),R("dashboard")}catch{i.textContent="API Key 无效或服务不可用",i.style.display="block",window.__ADMIN_API_KEY__=""}}}function He(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",Z()}function R(e){if(!H[e])return;W=e,document.querySelectorAll("#nav-list .nav-item").forEach(i=>{i.classList.toggle("active",i.dataset.page===e)}),document.getElementById("page-title").textContent=H[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',H[e].render(t).catch(i=>{t.innerHTML=`<div class="page-error">加载失败: ${i.message}</div>`})}function Oe(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==W&&R(t)})})}function Ne(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),i=document.getElementById("expand-left-btn");t&&i&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),i.style.display="block"}),i.addEventListener("click",()=>{e.classList.remove("collapsed"),i.style.display="none"}))}function Re(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let i=0;e.addEventListener("click",()=>{i=(i+1)%t.length,t[i]?document.body.setAttribute("data-theme",t[i]):document.body.removeAttribute("data-theme")})}function De(){Ne(),Re(),Oe(),document.getElementById("login-form").addEventListener("submit",Ie),document.getElementById("logout-btn").addEventListener("click",He),Pe()?(Q(),R("dashboard")):Z()}De();
