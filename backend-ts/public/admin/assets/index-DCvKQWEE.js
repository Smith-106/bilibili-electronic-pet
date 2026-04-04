(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))a(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&a(o)}).observe(document,{childList:!0,subtree:!0});function r(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function a(i){if(i.ep)return;i.ep=!0;const s=r(i);fetch(i.href,s)}})();function G(e,t,r){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof r=="string"&&r.trim()?r.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function J(){return(window.__ADMIN_API_KEY__||"").trim()}async function p(e,t={}){const r=J(),a=new Headers(t.headers||{});r&&a.set("x-api-key",r);const i=await fetch(e,{...t,headers:a}),s=await i.json().catch(()=>({}));if(!i.ok){const o=(s==null?void 0:s.detail)||(s==null?void 0:s.error);throw new Error(G(o,i.status,i.statusText))}return s}async function O(e,t){const r=J(),a=new Headers;r&&a.set("x-api-key",r);const i=await fetch(e,{headers:a});if(!i.ok)throw new Error("download_failed");const s=await i.blob(),o=URL.createObjectURL(s),d=document.createElement("a");d.href=o,d.download=t,document.body.appendChild(d),d.click(),document.body.removeChild(d),URL.revokeObjectURL(o)}function g(e){const t=new URLSearchParams;for(const[a,i]of Object.entries(e))i!=null&&i!==""&&t.set(a,String(i));const r=t.toString();return r?`?${r}`:""}function f(){return{getOverview(){return p("/api/admin/overview")},getJobs({status:e,limit:t}={}){return p(`/api/admin/jobs${g({status:e,limit:t})}`)},getJob(e){return p(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return p(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return p(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return p("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return p("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return O(`/export/jobs.csv${g({status:e,limit:t})}`,"jobs.csv")},getComment(e){return p(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,comment_id:t}={}){return p(`/api/admin/gateway/logs${g({limit:e,comment_id:t})}`)},publishGatewayReply(e){return p("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:r}={}){return p(`/api/admin/audit/summary${g({days:e,action:t,ok:r})}`)},getAuditLogs({limit:e,action:t,ok:r}={}){return p(`/api/audit-log${g({limit:e,action:t,ok:r})}`)},exportAuditCsv({limit:e,action:t,ok:r}={}){return O(`/export/audit-logs.csv${g({limit:e,action:t,ok:r})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return p(`/api/metrics/daily${g({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return p(`/api/admin/knowledge${g({limit:e,offset:t})}`)},createKnowledgeEntry(e){return p("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return p(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getRoleCards({limit:e,offset:t}={}){return p(`/api/admin/role-cards${g({limit:e,offset:t})}`)},createRoleCard(e){return p("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return p(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return p(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return p(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return p("/api/admin/style-profile")},setStyleProfile(e){return p("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return p("/api/admin/role-profile")},setRoleProfile(e){return p("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return p("/api/admin/bilibili/status")},getBilibiliVideos({poll_enabled:e,limit:t,offset:r}={}){return p(`/api/admin/bilibili/videos${g({poll_enabled:e,limit:t,offset:r})}`)},addBilibiliVideo(e){return p("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return p(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return p(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return p(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return p("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return p("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return p("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return p(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return p(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function n(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function M(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function Y(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const r=Date.now()-t.getTime(),a=Math.floor(r/1e3);if(a<60)return"刚刚";const i=Math.floor(a/60);if(i<60)return`${i}分钟前`;const s=Math.floor(i/60);if(s<24)return`${s}小时前`;const o=Math.floor(s/24);if(o<30)return`${o}天前`;const d=Math.floor(o/30);return d<12?`${d}个月前`:`${Math.floor(d/12)}年前`}catch{return""}}function E(e){const t=Y(e),r=M(e);return t?`<span title="${n(r)}">${n(t)}</span>`:`<span title="${n(r)}">${n(r)}</span>`}function w(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const F={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function I(e){if(!e)return"";const t=F[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${n(t.label)}</span>`}function j(e,t="是",r="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${n(e?t:r)}</span>`}let x=null;function c(e,t="info"){const r=document.getElementById("app-toast");r&&r.remove(),x&&clearTimeout(x);const a={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},i=document.createElement("div");i.id="app-toast",i.className="toast-notification",i.style.setProperty("--toast-color",a[t]||a.info),i.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(i),requestAnimationFrame(()=>i.classList.add("show"));const s=()=>{i.classList.remove("show"),setTimeout(()=>i.remove(),300)};i.querySelector(".toast-close").onclick=s,x=setTimeout(s,4e3)}const _=f();async function D(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,r,a,i]=await Promise.all([_.getOverview().catch(()=>null),_.getJobs({limit:5}).catch(()=>null),_.getGatewayLogs({limit:5}).catch(()=>null),_.getAuditSummary({days:7}).catch(()=>null)]),s=t||{},o=Array.isArray(r==null?void 0:r.items)?r.items:[],d=Array.isArray(a==null?void 0:a.items)?a.items:[];e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${w(s.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${w(s.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${w(s.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${w(s.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${w(s.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${w(d.length)}</div>
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
                    <td>${I(l.status)}</td>
                    <td class="cell-truncate">${n((u=l.comment_text)==null?void 0:u.substring(0,60))}</td>
                    <td class="cell-time">${n(M(l.created_at))}</td>
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
              <div class="stat-value">${w(i==null?void 0:i.total)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">成功</div>
              <div class="stat-value" style="color:var(--success-color)">${w(i==null?void 0:i.ok_count)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">失败</div>
              <div class="stat-value" style="color:var(--danger-color)">${w(i==null?void 0:i.failed_count)}</div>
            </div>
          </div>
        </div>
      </div>
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{c("正在刷新...","info"),D(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${n(t.message)}</div>`}}const $=f();async function Q(e){let t=new Set;e.innerHTML=`
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
  `;const r=e.querySelector("#jobs-status"),a=e.querySelector("#jobs-limit");async function i(){var d;t.clear(),s();const o=e.querySelector("#jobs-table-wrapper");o.innerHTML='<div class="page-loading">加载中...</div>';try{const l=await $.getJobs({status:r.value,limit:a.value}),v=Array.isArray(l==null?void 0:l.items)?l.items:[];if(v.length===0){o.innerHTML='<div class="table-empty">暂无任务</div>';return}o.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${v.map(u=>{var h,S,H,P;return`
              <tr data-id="${n(u.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${n(u.id)}" /></td>
                <td class="cell-id" title="${n(u.id)}">${n((h=u.id)==null?void 0:h.substring(0,8))}</td>
                <td>${I(u.status)}</td>
                <td class="cell-truncate" title="${n(u.comment_text)}">${n((S=u.comment_text)==null?void 0:S.substring(0,80))}</td>
                <td class="cell-truncate">${n((H=u.reply_text)==null?void 0:H.substring(0,60))}</td>
                <td>${(P=u.risk_flags)!=null&&P.length?u.risk_flags.map(z=>`<span class="risk-flag">${n(z)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${E(u.created_at)}</td>
                <td class="cell-actions">
                  ${u.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${n(u.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${n(u.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(d=o.querySelector("#jobs-select-all"))==null||d.addEventListener("change",u=>{const h=u.target.checked;o.querySelectorAll(".job-checkbox").forEach(S=>{S.checked=h,h?t.add(S.dataset.id):t.delete(S.dataset.id)}),s()}),o.querySelectorAll(".job-checkbox").forEach(u=>{u.addEventListener("change",()=>{u.checked?t.add(u.dataset.id):t.delete(u.dataset.id),s()})}),o.querySelectorAll(".job-approve").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="审批中...";try{await $.approveJob(u.dataset.id),c("审批成功","success"),i()}catch(h){c(`审批失败: ${h.message}`,"error"),u.disabled=!1,u.textContent="审批"}})}),o.querySelectorAll(".job-retry").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="重试中...";try{await $.retryJob(u.dataset.id),c("重试已提交","success"),i()}catch(h){c(`重试失败: ${h.message}`,"error"),u.disabled=!1,u.textContent="重试"}})})}catch(l){o.innerHTML=`<div class="page-error">加载失败: ${n(l.message)}</div>`}}function s(){const o=e.querySelector("#jobs-batch-bar"),d=e.querySelector("#jobs-selected-count");t.size>0?(o.style.display="flex",d.textContent=`已选 ${t.size} 项`):o.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",i),e.querySelector("#jobs-refresh").addEventListener("click",i),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await $.exportJobsCsv({status:r.value,limit:a.value}),c("导出成功","success")}catch(o){c(`导出失败: ${o.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await $.batchApprove([...t]),c(`批量审批 ${t.size} 项成功`,"success"),i()}catch(o){c(`批量审批失败: ${o.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await $.batchRetry([...t]),c(`批量重试 ${t.size} 项成功`,"success"),i()}catch(o){c(`批量重试失败: ${o.message}`,"error")}}),await i()}const W=f();async function X(e){e.innerHTML=`
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
  `;async function t(){const r=e.querySelector("#metrics-days").value,a=e.querySelector("#metrics-table-wrapper");a.innerHTML='<div class="page-loading">加载中...</div>';try{const i=await W.getDailyMetrics({days:r}),s=Array.isArray(i==null?void 0:i.items)?i.items:Array.isArray(i)?i:[];if(s.length===0){a.innerHTML='<div class="table-empty">暂无指标数据</div>';return}a.innerHTML=`
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
      `}catch(i){a.innerHTML=`<div class="page-error">加载失败: ${n(i.message)}</div>`}}e.querySelector("#metrics-load").addEventListener("click",t),await t()}const T=f();async function Z(e){e.innerHTML=`
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
  `;async function t(){const r=e.querySelector("#knowledge-table-wrapper");r.innerHTML='<div class="page-loading">加载中...</div>';try{const a=await T.getKnowledgeEntries({limit:50}),i=Array.isArray(a==null?void 0:a.items)?a.items:[];if(i.length===0){r.innerHTML='<div class="table-empty">暂无知识条目</div>';return}r.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${i.map(s=>{var o,d;return`<tr>
              <td class="cell-id">${n((o=s.id)==null?void 0:o.toString().substring(0,8))}</td>
              <td>${n(s.category)}</td>
              <td>${n(s.title)}</td>
              <td class="cell-truncate">${n((d=s.content)==null?void 0:d.substring(0,80))}</td>
              <td>${j(s.enabled!==!1)}</td>
              <td class="cell-time">${E(s.created_at)}</td>
              <td class="cell-actions">
                ${s.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${n(s.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,r.querySelectorAll(".knowledge-disable").forEach(s=>{s.addEventListener("click",async()=>{try{await T.disableKnowledgeEntry(s.dataset.id),c("已禁用","success"),t()}catch(o){c(`操作失败: ${o.message}`,"error")}})})}catch(a){r.innerHTML=`<div class="page-error">加载失败: ${n(a.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const r=e.querySelector("#knowledge-category").value.trim(),a=e.querySelector("#knowledge-title").value.trim(),i=e.querySelector("#knowledge-content").value.trim();if(!a||!i){c("标题和内容不能为空","warning");return}try{await T.createKnowledgeEntry({category:r,title:a,content:i}),c("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(s){c(`创建失败: ${s.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const q=f();let k=!1,b=null;async function ee(e){k=!1,b=null,e.innerHTML=`
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
  `;const t=e.querySelector("#rc-select"),r=e.querySelector("#rc-editor");let a=[];function i(){k=!0}function s(){return k?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function o(l){b=l,e.querySelector("#rc-key").value=(l==null?void 0:l.key)||"",e.querySelector("#rc-key").disabled=!!l,e.querySelector("#rc-name").value=(l==null?void 0:l.name)||"",e.querySelector("#rc-desc").value=(l==null?void 0:l.description)||"",e.querySelector("#rc-system-prompt").value=(l==null?void 0:l.system_prompt)||"",e.querySelector("#rc-tone").value=(l==null?void 0:l.tone)||"",e.querySelector("#rc-constraints").value=typeof(l==null?void 0:l.constraints)=="string"?l.constraints:JSON.stringify((l==null?void 0:l.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=l?`编辑: ${l.name||l.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=l&&l.enabled!==!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=l&&l.enabled!==!1?"inline-flex":"none",r.style.display="block",k=!1}r.querySelectorAll(".form-input").forEach(l=>l.addEventListener("input",i));async function d(){try{const l=await q.getRoleCards({limit:100});a=Array.isArray(l==null?void 0:l.items)?l.items:Array.isArray(l)?l:[],t.innerHTML='<option value="">-- 新建 --</option>'+a.map(v=>`<option value="${n(v.key)}">${n(v.name||v.key)}${v.enabled===!1?" (禁用)":""}</option>`).join("")}catch(l){c(`加载失败: ${l.message}`,"error")}}t.addEventListener("change",()=>{if(!s()){t.value=(b==null?void 0:b.key)||"";return}const l=t.value,v=a.find(u=>u.key===l);o(v||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{s()&&(t.value="",o(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const l={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},v=e.querySelector("#rc-constraints").value.trim();try{l.constraints=v?JSON.parse(v):""}catch{l.constraints=v}if(!l.key){c("Key 不能为空","warning");return}try{b!=null&&b.key?(await q.updateRoleCard(b.key,l),c("保存成功","success")):(await q.createRoleCard(l),c("创建成功","success")),k=!1,await d(),t.value=l.key}catch(u){c(`操作失败: ${u.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(b!=null&&b.key)try{await q.activateRoleCard(b.key),c("已激活","success"),await d()}catch(l){c(`激活失败: ${l.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(b!=null&&b.key)try{await q.disableRoleCard(b.key),c("已禁用","success"),await d()}catch(l){c(`禁用失败: ${l.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{d()}),await d()}const L=f();async function te(e){e.innerHTML=`
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
  `;async function t(){try{const[r,a]=await Promise.all([L.getStyleProfile().catch(()=>null),L.getRoleProfile().catch(()=>null)]);r!=null&&r.style&&(e.querySelector("#profile-style").value=r.style,e.querySelector("#profile-style-current").textContent=`当前: ${r.style}`),a!=null&&a.role&&(e.querySelector("#profile-role").value=a.role,e.querySelector("#profile-role-current").textContent=`当前: ${a.role}`)}catch(r){c(`加载配置失败: ${r.message}`,"error")}}e.querySelector("#profile-style-apply").addEventListener("click",async()=>{const r=e.querySelector("#profile-style").value;try{await L.setStyleProfile(r),e.querySelector("#profile-style-current").textContent=`当前: ${r}`,c("风格已更新","success")}catch(a){c(`更新失败: ${a.message}`,"error")}}),e.querySelector("#profile-role-apply").addEventListener("click",async()=>{const r=e.querySelector("#profile-role").value;try{await L.setRoleProfile(r),e.querySelector("#profile-role-current").textContent=`当前: ${r}`,c("角色配置已更新","success")}catch(a){c(`更新失败: ${a.message}`,"error")}}),await t()}function ie({columns:e,rows:t,empty:r="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${n(r)}</div>`;const a=e.map(s=>`<th class="${s.class||""}">${n(s.label)}</th>`).join(""),i=t.map(s=>`<tr>${e.map(o=>`<td class="${o.class||""}">${o.render?o.render(s):n(s[o.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${a}</tr></thead>
        <tbody>${i}</tbody>
      </table>
    </div>
  `}const R=f();async function se(e){e.innerHTML=`
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
  `;const t=e.querySelector("#gw-reply"),r=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{r.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const i=e.querySelector("#gw-publish-btn"),s=e.querySelector("#gw-comment-id").value.trim(),o=e.querySelector("#gw-reply").value.trim(),d=e.querySelector("#gw-source").value.trim(),l=e.querySelector("#gw-force").checked;if(!s||!o){c("Comment ID 和回复内容不能为空","warning");return}i.disabled=!0,i.textContent="发布中...";try{await R.publishGatewayReply({comment_id:s,reply_text:o,source:d,force_publish:l}),c("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",r.textContent="0/0",a()}catch(v){c(`发布失败: ${v.message}`,"error")}finally{i.disabled=!1,i.textContent="发布"}});async function a(){const i=e.querySelector("#gw-table-wrapper"),s=e.querySelector("#gw-limit").value;i.innerHTML='<div class="page-loading">加载中...</div>';try{const o=await R.getGatewayLogs({limit:s}),d=Array.isArray(o==null?void 0:o.items)?o.items:[];if(d.length===0){i.innerHTML='<div class="table-empty">暂无网关日志</div>';return}i.innerHTML=ie({columns:[{key:"id",label:"ID",class:"cell-id",render:l=>{var v;return n((v=l.id)==null?void 0:v.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:l=>{var v;return n((v=l.comment_id)==null?void 0:v.substring(0,12))}},{key:"status",label:"状态",render:l=>I(l.status)},{key:"platform",label:"平台",render:l=>n(l.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:l=>{var v;return n((v=l.reply_text)==null?void 0:v.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:l=>E(l.created_at)}],rows:d})}catch(o){i.innerHTML=`<div class="page-error">加载失败: ${n(o.message)}</div>`}}e.querySelector("#gw-refresh").addEventListener("click",a),e.querySelector("#gw-filter-btn").addEventListener("click",a),await a()}const C=f();async function re(e){e.innerHTML=`
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
  `;async function t(){try{const a=await C.getAuditSummary({days:7}),i=e.querySelector("#audit-summary-cards");i.innerHTML=`
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
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function r(){const a=e.querySelector("#audit-table-wrapper");a.innerHTML='<div class="page-loading">加载中...</div>';const i=e.querySelector("#audit-action").value.trim(),s=e.querySelector("#audit-ok").value,o=e.querySelector("#audit-limit").value;try{const d=await C.getAuditLogs({action:i,ok:s,limit:o}),l=Array.isArray(d==null?void 0:d.items)?d.items:[];if(l.length===0){a.innerHTML='<div class="table-empty">暂无审计日志</div>';return}a.innerHTML=`
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
      `}catch(d){a.innerHTML=`<div class="page-error">加载失败: ${n(d.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),r()}),e.querySelector("#audit-filter-btn").addEventListener("click",r),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await C.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),c("导出成功","success")}catch(a){c(`导出失败: ${a.message}`,"error")}}),await Promise.all([t(),r()])}const m=f(),ae={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"};function y(e){const t=e instanceof Error?e.message:String(e??"request_failed");return ae[t]||t}async function le(e){e.innerHTML=`
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
  `;async function t(){const i=e.querySelector("#bili-status-cards");try{const s=await m.getBilibiliStatus();i.innerHTML=`
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
      `}catch(s){i.innerHTML=`<div class="page-error">状态加载失败: ${n(y(s))}</div>`}}async function r(){const i=e.querySelector("#bili-videos-wrapper");try{const s=await m.getBilibiliVideos({limit:50}),o=Array.isArray(s==null?void 0:s.items)?s.items:Array.isArray(s)?s:[];if(o.length===0){i.innerHTML='<div class="table-empty">暂无视频</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>操作</th></tr></thead>
          <tbody>
            ${o.map(d=>`<tr data-id="${n(d.id||d.video_id)}">
              <td class="cell-id">${n(d.bvid)}</td>
              <td class="cell-truncate">${n(d.title||"-")}</td>
              <td>${j(d.poll_enabled)}</td>
              <td>${d.comment_count??"-"}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${n(d.id||d.video_id)}">${d.poll_enabled?"禁用轮询":"启用轮询"}</button>
                <button class="btn btn-sm bili-sync" data-id="${n(d.id||d.video_id)}">同步</button>
                <button class="btn btn-sm btn-danger bili-delete" data-id="${n(d.id||d.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".bili-toggle-poll").forEach(d=>{d.addEventListener("click",async()=>{try{await m.toggleBilibiliVideoPoll(d.dataset.id),c("操作成功","success"),r()}catch(l){c(`失败: ${y(l)}`,"error")}})}),i.querySelectorAll(".bili-sync").forEach(d=>{d.addEventListener("click",async()=>{d.disabled=!0;try{await m.syncBilibiliVideo(d.dataset.id),c("同步完成","success"),r()}catch(l){c(`同步失败: ${y(l)}`,"error"),d.disabled=!1}})}),i.querySelectorAll(".bili-delete").forEach(d=>{d.addEventListener("click",async()=>{if(confirm("确定删除此视频？"))try{await m.deleteBilibiliVideo(d.dataset.id),c("已删除","success"),r()}catch(l){c(`删除失败: ${y(l)}`,"error")}})})}catch(s){i.innerHTML=`<div class="page-error">加载失败: ${n(y(s))}</div>`}}async function a(){const i=e.querySelector("#bili-creds-wrapper");try{const s=await m.getBilibiliCredentials(),o=Array.isArray(s==null?void 0:s.items)?s.items:Array.isArray(s)?s:[];if(o.length===0){i.innerHTML='<div class="table-empty">暂无凭证</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期</th><th>操作</th></tr></thead>
          <tbody>
            ${o.map(d=>`<tr data-id="${n(d.id||d.credential_id)}">
              <td>${n(d.name||"-")}</td>
              <td class="cell-id">${n([d.has_sessdata?"SESSDATA":"",d.has_bili_jct?"bili_jct":"",d.buvid3?`buvid3:${d.buvid3}`:""].filter(Boolean).join(" / ")||"-")}</td>
              <td>${j(d.is_active||d.active)}</td>
              <td class="cell-time">${n(d.expires_at?M(d.expires_at):"-")}</td>
              <td class="cell-actions">
                ${d.is_active||d.active?"":`<button class="btn btn-sm cred-activate" data-id="${n(d.id||d.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${n(d.id||d.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".cred-activate").forEach(d=>{d.addEventListener("click",async()=>{try{await m.activateBilibiliCredential(d.dataset.id),c("已激活","success"),a()}catch(l){c(`激活失败: ${y(l)}`,"error")}})}),i.querySelectorAll(".cred-delete").forEach(d=>{d.addEventListener("click",async()=>{if(confirm("确定删除此凭证？"))try{await m.deleteBilibiliCredential(d.dataset.id),c("已删除","success"),a()}catch(l){c(`删除失败: ${y(l)}`,"error")}})})}catch(s){i.innerHTML=`<div class="page-error">加载失败: ${n(y(s))}</div>`}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const i=e.querySelector("#bili-video-bvid").value.trim();if(!i){c("BVID 不能为空","warning");return}try{await m.addBilibiliVideo(i),c("添加成功","success"),e.querySelector("#bili-video-bvid").value="",r()}catch(s){c(`添加失败: ${y(s)}`,"error")}}),e.querySelector("#cred-add").addEventListener("click",async()=>{const i={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:e.querySelector("#cred-expires").value||void 0};if(!i.name||!i.sessdata){c("名称和 SESSDATA 不能为空","warning");return}try{await m.addBilibiliCredential(i),c("凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",a()}catch(s){c(`添加失败: ${y(s)}`,"error")}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const i=e.querySelector("#bili-poll-btn");i.disabled=!0,i.textContent="轮询中...";try{await m.triggerBilibiliPoll(),c("轮询完成","success"),r()}catch(s){c(`轮询失败: ${y(s)}`,"error")}finally{i.disabled=!1,i.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",()=>{t(),r(),a()}),await Promise.all([t(),r(),a()])}const N=f();async function de(e){e.innerHTML=`
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
  `,e.querySelector("#query-comment-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-comment-id").value.trim(),r=e.querySelector("#query-comment-result");if(!t){c("请输入 Comment ID","warning");return}r.innerHTML='<div class="page-loading">查询中...</div>';try{const a=await N.getComment(t);r.innerHTML=`
        <div class="detail-card">
          ${Object.entries(a||{}).map(([i,s])=>`
            <div class="detail-row">
              <span class="detail-key">${n(i)}</span>
              <span class="detail-value">${n(typeof s=="object"?JSON.stringify(s,null,2):String(s??"-"))}</span>
            </div>
          `).join("")}
        </div>
      `}catch(a){r.innerHTML=`<div class="page-error">查询失败: ${n(a.message)}</div>`}}),e.querySelector("#query-job-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-job-id").value.trim(),r=e.querySelector("#query-job-result");if(!t){c("请输入 Job ID","warning");return}r.innerHTML='<div class="page-loading">查询中...</div>';try{const a=await N.getJob(t);r.innerHTML=`
        <div class="detail-card">
          ${Object.entries(a||{}).map(([s,o])=>`
            <div class="detail-row">
              <span class="detail-key">${n(s)}</span>
              <span class="detail-value">${n(typeof o=="object"?JSON.stringify(o,null,2):String(o??"-"))}</span>
            </div>
          `).join("")}
        </div>
        ${a!=null&&a.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${n(a.comment_id)}">查看关联评论 →</a></div>`:""}
      `;const i=r.querySelector("#query-goto-comment");i&&i.addEventListener("click",()=>{e.querySelector("#query-comment-id").value=i.dataset.id,e.querySelector("#query-comment-btn").click()})}catch(a){r.innerHTML=`<div class="page-error">查询失败: ${n(a.message)}</div>`}})}const A={dashboard:{render:D,title:"仪表盘"},jobs:{render:Q,title:"任务管理"},"daily-metrics":{render:X,title:"每日指标"},knowledge:{render:Z,title:"知识库"},"role-cards":{render:ee,title:"角色卡"},profiles:{render:te,title:"风格配置"},gateway:{render:se,title:"网关"},audit:{render:re,title:"审计日志"},bilibili:{render:le,title:"B站集成"},query:{render:de,title:"查询"}};let K=null;function oe(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function U(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function V(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function ne(e){e.preventDefault();const t=document.getElementById("login-api-key"),r=document.getElementById("login-error"),a=t.value.trim();if(a){window.__ADMIN_API_KEY__=a;try{await p("/api/admin/overview"),sessionStorage.setItem("admin_api_key",a),V(),B("dashboard")}catch{r.textContent="API Key 无效或服务不可用",r.style.display="block",window.__ADMIN_API_KEY__=""}}}function ce(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",U()}function B(e){if(!A[e])return;K=e,document.querySelectorAll("#nav-list .nav-item").forEach(r=>{r.classList.toggle("active",r.dataset.page===e)}),document.getElementById("page-title").textContent=A[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',A[e].render(t).catch(r=>{t.innerHTML=`<div class="page-error">加载失败: ${r.message}</div>`})}function ue(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==K&&B(t)})})}function pe(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),r=document.getElementById("expand-left-btn");t&&r&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),r.style.display="block"}),r.addEventListener("click",()=>{e.classList.remove("collapsed"),r.style.display="none"}))}function ve(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let r=0;e.addEventListener("click",()=>{r=(r+1)%t.length,t[r]?document.body.setAttribute("data-theme",t[r]):document.body.removeAttribute("data-theme")})}function be(){pe(),ve(),ue(),document.getElementById("login-form").addEventListener("submit",ne),document.getElementById("logout-btn").addEventListener("click",ce),oe()?(V(),B("dashboard")):U()}be();
