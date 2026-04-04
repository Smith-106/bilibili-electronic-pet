(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))a(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&a(o)}).observe(document,{childList:!0,subtree:!0});function s(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function a(i){if(i.ep)return;i.ep=!0;const r=s(i);fetch(i.href,r)}})();function G(e,t,s){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof s=="string"&&s.trim()?s.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function J(){return(window.__ADMIN_API_KEY__||"").trim()}async function p(e,t={}){const s=J(),a=new Headers(t.headers||{});s&&a.set("x-api-key",s);const i=await fetch(e,{...t,headers:a}),r=await i.json().catch(()=>({}));if(!i.ok){const o=(r==null?void 0:r.detail)||(r==null?void 0:r.error);throw new Error(G(o,i.status,i.statusText))}return r}async function O(e,t){const s=J(),a=new Headers;s&&a.set("x-api-key",s);const i=await fetch(e,{headers:a});if(!i.ok)throw new Error("download_failed");const r=await i.blob(),o=URL.createObjectURL(r),d=document.createElement("a");d.href=o,d.download=t,document.body.appendChild(d),d.click(),document.body.removeChild(d),URL.revokeObjectURL(o)}function f(e){const t=new URLSearchParams;for(const[a,i]of Object.entries(e))i!=null&&i!==""&&t.set(a,String(i));const s=t.toString();return s?`?${s}`:""}function h(){return{getOverview(){return p("/api/admin/overview")},getJobs({status:e,limit:t}={}){return p(`/api/admin/jobs${f({status:e,limit:t})}`)},getJob(e){return p(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return p(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return p(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return p("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return p("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return O(`/export/jobs.csv${f({status:e,limit:t})}`,"jobs.csv")},getComment(e){return p(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,comment_id:t}={}){return p(`/api/admin/gateway/logs${f({limit:e,comment_id:t})}`)},publishGatewayReply(e){return p("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:s}={}){return p(`/api/admin/audit/summary${f({days:e,action:t,ok:s})}`)},getAuditLogs({limit:e,action:t,ok:s}={}){return p(`/api/audit-log${f({limit:e,action:t,ok:s})}`)},exportAuditCsv({limit:e,action:t,ok:s}={}){return O(`/export/audit-logs.csv${f({limit:e,action:t,ok:s})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return p(`/api/metrics/daily${f({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return p(`/api/admin/knowledge${f({limit:e,offset:t})}`)},createKnowledgeEntry(e){return p("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return p(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getRoleCards({limit:e,offset:t}={}){return p(`/api/admin/role-cards${f({limit:e,offset:t})}`)},createRoleCard(e){return p("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return p(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return p(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return p(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return p("/api/admin/style-profile")},setStyleProfile(e){return p("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return p("/api/admin/role-profile")},setRoleProfile(e){return p("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return p("/api/admin/bilibili/status")},getBilibiliVideos({poll_enabled:e,limit:t,offset:s}={}){return p(`/api/admin/bilibili/videos${f({poll_enabled:e,limit:t,offset:s})}`)},addBilibiliVideo(e){return p("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return p(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return p(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return p(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return p("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return p("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return p("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return p(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return p(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function n(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function I(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function Y(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const s=Date.now()-t.getTime(),a=Math.floor(s/1e3);if(a<60)return"刚刚";const i=Math.floor(a/60);if(i<60)return`${i}分钟前`;const r=Math.floor(i/60);if(r<24)return`${r}小时前`;const o=Math.floor(r/24);if(o<30)return`${o}天前`;const d=Math.floor(o/30);return d<12?`${d}个月前`:`${Math.floor(d/12)}年前`}catch{return""}}function x(e){const t=Y(e),s=I(e);return t?`<span title="${n(s)}">${n(t)}</span>`:`<span title="${n(s)}">${n(s)}</span>`}function $(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const F={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function B(e){if(!e)return"";const t=F[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${n(t.label)}</span>`}function M(e,t="是",s="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${n(e?t:s)}</span>`}let T=null;function u(e,t="info"){const s=document.getElementById("app-toast");s&&s.remove(),T&&clearTimeout(T);const a={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},i=document.createElement("div");i.id="app-toast",i.className="toast-notification",i.style.setProperty("--toast-color",a[t]||a.info),i.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(i),requestAnimationFrame(()=>i.classList.add("show"));const r=()=>{i.classList.remove("show"),setTimeout(()=>i.remove(),300)};i.querySelector(".toast-close").onclick=r,T=setTimeout(r,4e3)}const L=h();async function D(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,s,a,i]=await Promise.all([L.getOverview().catch(()=>null),L.getJobs({limit:5}).catch(()=>null),L.getGatewayLogs({limit:5}).catch(()=>null),L.getAuditSummary({days:7}).catch(()=>null)]),r=t||{},o=Array.isArray(s==null?void 0:s.items)?s.items:[],d=Array.isArray(a==null?void 0:a.items)?a.items:[];e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${$(r.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${$(r.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${$(r.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${$(r.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${$(r.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${$(d.length)}</div>
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
                ${o.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':o.map(l=>{var c,v;return`<tr>
                    <td class="cell-id">${n((c=l.id)==null?void 0:c.substring(0,8))}</td>
                    <td>${B(l.status)}</td>
                    <td class="cell-truncate">${n((v=l.comment_text)==null?void 0:v.substring(0,60))}</td>
                    <td class="cell-time">${n(I(l.created_at))}</td>
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
              <div class="stat-value">${$(i==null?void 0:i.total)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">成功</div>
              <div class="stat-value" style="color:var(--success-color)">${$(i==null?void 0:i.ok_count)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">失败</div>
              <div class="stat-value" style="color:var(--danger-color)">${$(i==null?void 0:i.failed_count)}</div>
            </div>
          </div>
        </div>
      </div>
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{u("正在刷新...","info"),D(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${n(t.message)}</div>`}}const S=h();async function Z(e){let t=new Set;e.innerHTML=`
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
  `;const s=e.querySelector("#jobs-status"),a=e.querySelector("#jobs-limit");async function i(){var d;t.clear(),r();const o=e.querySelector("#jobs-table-wrapper");o.innerHTML='<div class="page-loading">加载中...</div>';try{const l=await S.getJobs({status:s.value,limit:a.value}),c=Array.isArray(l==null?void 0:l.items)?l.items:[];if(c.length===0){o.innerHTML='<div class="table-empty">暂无任务</div>';return}o.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${c.map(v=>{var y,w,k,H;return`
              <tr data-id="${n(v.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${n(v.id)}" /></td>
                <td class="cell-id" title="${n(v.id)}">${n((y=v.id)==null?void 0:y.substring(0,8))}</td>
                <td>${B(v.status)}</td>
                <td class="cell-truncate" title="${n(v.comment_text)}">${n((w=v.comment_text)==null?void 0:w.substring(0,80))}</td>
                <td class="cell-truncate">${n((k=v.reply_text)==null?void 0:k.substring(0,60))}</td>
                <td>${(H=v.risk_flags)!=null&&H.length?v.risk_flags.map(z=>`<span class="risk-flag">${n(z)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${x(v.created_at)}</td>
                <td class="cell-actions">
                  ${v.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${n(v.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${n(v.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(d=o.querySelector("#jobs-select-all"))==null||d.addEventListener("change",v=>{const y=v.target.checked;o.querySelectorAll(".job-checkbox").forEach(w=>{w.checked=y,y?t.add(w.dataset.id):t.delete(w.dataset.id)}),r()}),o.querySelectorAll(".job-checkbox").forEach(v=>{v.addEventListener("change",()=>{v.checked?t.add(v.dataset.id):t.delete(v.dataset.id),r()})}),o.querySelectorAll(".job-approve").forEach(v=>{v.addEventListener("click",async()=>{v.disabled=!0,v.textContent="审批中...";try{await S.approveJob(v.dataset.id),u("审批成功","success"),i()}catch(y){u(`审批失败: ${y.message}`,"error"),v.disabled=!1,v.textContent="审批"}})}),o.querySelectorAll(".job-retry").forEach(v=>{v.addEventListener("click",async()=>{v.disabled=!0,v.textContent="重试中...";try{await S.retryJob(v.dataset.id),u("重试已提交","success"),i()}catch(y){u(`重试失败: ${y.message}`,"error"),v.disabled=!1,v.textContent="重试"}})})}catch(l){o.innerHTML=`<div class="page-error">加载失败: ${n(l.message)}</div>`}}function r(){const o=e.querySelector("#jobs-batch-bar"),d=e.querySelector("#jobs-selected-count");t.size>0?(o.style.display="flex",d.textContent=`已选 ${t.size} 项`):o.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",i),e.querySelector("#jobs-refresh").addEventListener("click",i),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await S.exportJobsCsv({status:s.value,limit:a.value}),u("导出成功","success")}catch(o){u(`导出失败: ${o.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await S.batchApprove([...t]),u(`批量审批 ${t.size} 项成功`,"success"),i()}catch(o){u(`批量审批失败: ${o.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await S.batchRetry([...t]),u(`批量重试 ${t.size} 项成功`,"success"),i()}catch(o){u(`批量重试失败: ${o.message}`,"error")}}),await i()}const Q=h();async function W(e){e.innerHTML=`
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
  `;async function t(){const s=e.querySelector("#metrics-days").value,a=e.querySelector("#metrics-table-wrapper");a.innerHTML='<div class="page-loading">加载中...</div>';try{const i=await Q.getDailyMetrics({days:s}),r=Array.isArray(i==null?void 0:i.items)?i.items:Array.isArray(i)?i:[];if(r.length===0){a.innerHTML='<div class="table-empty">暂无指标数据</div>';return}a.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${r.map(o=>`<tr>
              <td class="cell-time">${n(o.date||o.day)}</td>
              <td>${n(o.comments??o.comment_count??0)}</td>
              <td>${n(o.jobs??o.job_count??0)}</td>
              <td style="color:var(--success-color)">${n(o.published??o.published_count??0)}</td>
              <td style="color:var(--danger-color)">${n(o.failed??o.failed_count??0)}</td>
              <td>${n(o.skipped??o.skipped_count??0)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      `}catch(i){a.innerHTML=`<div class="page-error">加载失败: ${n(i.message)}</div>`}}e.querySelector("#metrics-load").addEventListener("click",t),await t()}const C=h();async function X(e){e.innerHTML=`
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
  `;async function t(){const s=e.querySelector("#knowledge-table-wrapper");s.innerHTML='<div class="page-loading">加载中...</div>';try{const a=await C.getKnowledgeEntries({limit:50}),i=Array.isArray(a==null?void 0:a.items)?a.items:[];if(i.length===0){s.innerHTML='<div class="table-empty">暂无知识条目</div>';return}s.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${i.map(r=>{var o,d;return`<tr>
              <td class="cell-id">${n((o=r.id)==null?void 0:o.toString().substring(0,8))}</td>
              <td>${n(r.category)}</td>
              <td>${n(r.title)}</td>
              <td class="cell-truncate">${n((d=r.content)==null?void 0:d.substring(0,80))}</td>
              <td>${M(r.enabled!==!1)}</td>
              <td class="cell-time">${x(r.created_at)}</td>
              <td class="cell-actions">
                ${r.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${n(r.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,s.querySelectorAll(".knowledge-disable").forEach(r=>{r.addEventListener("click",async()=>{try{await C.disableKnowledgeEntry(r.dataset.id),u("已禁用","success"),t()}catch(o){u(`操作失败: ${o.message}`,"error")}})})}catch(a){s.innerHTML=`<div class="page-error">加载失败: ${n(a.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const s=e.querySelector("#knowledge-category").value.trim(),a=e.querySelector("#knowledge-title").value.trim(),i=e.querySelector("#knowledge-content").value.trim();if(!a||!i){u("标题和内容不能为空","warning");return}try{await C.createKnowledgeEntry({category:s,title:a,content:i}),u("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(r){u(`创建失败: ${r.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const q=h();let _=!1,b=null;async function ee(e){_=!1,b=null,e.innerHTML=`
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
  `;const t=e.querySelector("#rc-select"),s=e.querySelector("#rc-editor");let a=[];function i(){_=!0}function r(){return _?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function o(l){b=l,e.querySelector("#rc-key").value=(l==null?void 0:l.key)||"",e.querySelector("#rc-key").disabled=!!l,e.querySelector("#rc-name").value=(l==null?void 0:l.name)||"",e.querySelector("#rc-desc").value=(l==null?void 0:l.description)||"",e.querySelector("#rc-system-prompt").value=(l==null?void 0:l.system_prompt)||"",e.querySelector("#rc-tone").value=(l==null?void 0:l.tone)||"",e.querySelector("#rc-constraints").value=typeof(l==null?void 0:l.constraints)=="string"?l.constraints:JSON.stringify((l==null?void 0:l.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=l?`编辑: ${l.name||l.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=l&&l.enabled!==!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=l&&l.enabled!==!1?"inline-flex":"none",s.style.display="block",_=!1}s.querySelectorAll(".form-input").forEach(l=>l.addEventListener("input",i));async function d(){try{const l=await q.getRoleCards({limit:100});a=Array.isArray(l==null?void 0:l.items)?l.items:Array.isArray(l)?l:[],t.innerHTML='<option value="">-- 新建 --</option>'+a.map(c=>`<option value="${n(c.key)}">${n(c.name||c.key)}${c.enabled===!1?" (禁用)":""}</option>`).join("")}catch(l){u(`加载失败: ${l.message}`,"error")}}t.addEventListener("change",()=>{if(!r()){t.value=(b==null?void 0:b.key)||"";return}const l=t.value,c=a.find(v=>v.key===l);o(c||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{r()&&(t.value="",o(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const l={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},c=e.querySelector("#rc-constraints").value.trim();try{l.constraints=c?JSON.parse(c):""}catch{l.constraints=c}if(!l.key){u("Key 不能为空","warning");return}try{b!=null&&b.key?(await q.updateRoleCard(b.key,l),u("保存成功","success")):(await q.createRoleCard(l),u("创建成功","success")),_=!1,await d(),t.value=l.key}catch(v){u(`操作失败: ${v.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(b!=null&&b.key)try{await q.activateRoleCard(b.key),u("已激活","success"),await d()}catch(l){u(`激活失败: ${l.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(b!=null&&b.key)try{await q.disableRoleCard(b.key),u("已禁用","success"),await d()}catch(l){u(`禁用失败: ${l.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{d()}),await d()}const E=h();async function te(e){e.innerHTML=`
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
  `;async function t(){try{const[s,a]=await Promise.all([E.getStyleProfile().catch(()=>null),E.getRoleProfile().catch(()=>null)]);s!=null&&s.style&&(e.querySelector("#profile-style").value=s.style,e.querySelector("#profile-style-current").textContent=`当前: ${s.style}`),a!=null&&a.role&&(e.querySelector("#profile-role").value=a.role,e.querySelector("#profile-role-current").textContent=`当前: ${a.role}`)}catch(s){u(`加载配置失败: ${s.message}`,"error")}}e.querySelector("#profile-style-apply").addEventListener("click",async()=>{const s=e.querySelector("#profile-style").value;try{await E.setStyleProfile(s),e.querySelector("#profile-style-current").textContent=`当前: ${s}`,u("风格已更新","success")}catch(a){u(`更新失败: ${a.message}`,"error")}}),e.querySelector("#profile-role-apply").addEventListener("click",async()=>{const s=e.querySelector("#profile-role").value;try{await E.setRoleProfile(s),e.querySelector("#profile-role-current").textContent=`当前: ${s}`,u("角色配置已更新","success")}catch(a){u(`更新失败: ${a.message}`,"error")}}),await t()}function ie({columns:e,rows:t,empty:s="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${n(s)}</div>`;const a=e.map(r=>`<th class="${r.class||""}">${n(r.label)}</th>`).join(""),i=t.map(r=>`<tr>${e.map(o=>`<td class="${o.class||""}">${o.render?o.render(r):n(r[o.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${a}</tr></thead>
        <tbody>${i}</tbody>
      </table>
    </div>
  `}const R=h();async function se(e){e.innerHTML=`
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
  `;const t=e.querySelector("#gw-reply"),s=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{s.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const i=e.querySelector("#gw-publish-btn"),r=e.querySelector("#gw-comment-id").value.trim(),o=e.querySelector("#gw-reply").value.trim(),d=e.querySelector("#gw-source").value.trim(),l=e.querySelector("#gw-force").checked;if(!r||!o){u("Comment ID 和回复内容不能为空","warning");return}i.disabled=!0,i.textContent="发布中...";try{await R.publishGatewayReply({comment_id:r,reply_text:o,source:d,force_publish:l}),u("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",s.textContent="0/0",a()}catch(c){u(`发布失败: ${c.message}`,"error")}finally{i.disabled=!1,i.textContent="发布"}});async function a(){const i=e.querySelector("#gw-table-wrapper"),r=e.querySelector("#gw-limit").value;i.innerHTML='<div class="page-loading">加载中...</div>';try{const o=await R.getGatewayLogs({limit:r}),d=Array.isArray(o==null?void 0:o.items)?o.items:[];if(d.length===0){i.innerHTML='<div class="table-empty">暂无网关日志</div>';return}i.innerHTML=ie({columns:[{key:"id",label:"ID",class:"cell-id",render:l=>{var c;return n((c=l.id)==null?void 0:c.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:l=>{var c;return n((c=l.comment_id)==null?void 0:c.substring(0,12))}},{key:"status",label:"状态",render:l=>B(l.status)},{key:"platform",label:"平台",render:l=>n(l.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:l=>{var c;return n((c=l.reply_text)==null?void 0:c.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:l=>x(l.created_at)}],rows:d})}catch(o){i.innerHTML=`<div class="page-error">加载失败: ${n(o.message)}</div>`}}e.querySelector("#gw-refresh").addEventListener("click",a),e.querySelector("#gw-filter-btn").addEventListener("click",a),await a()}const A=h();async function re(e){e.innerHTML=`
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
  `;async function t(){try{const a=await A.getAuditSummary({days:7}),i=e.querySelector("#audit-summary-cards");i.innerHTML=`
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
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function s(){const a=e.querySelector("#audit-table-wrapper");a.innerHTML='<div class="page-loading">加载中...</div>';const i=e.querySelector("#audit-action").value.trim(),r=e.querySelector("#audit-ok").value,o=e.querySelector("#audit-limit").value;try{const d=await A.getAuditLogs({action:i,ok:r,limit:o}),l=Array.isArray(d==null?void 0:d.items)?d.items:[];if(l.length===0){a.innerHTML='<div class="table-empty">暂无审计日志</div>';return}a.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${l.map(c=>{var v;return`<tr>
              <td class="cell-id">${n((v=c.id)==null?void 0:v.toString().substring(0,8))}</td>
              <td>${n(c.action)}</td>
              <td class="cell-truncate">${n(c.target_id||"-")}</td>
              <td>${c.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${n(c.detail||"-")}</td>
              <td class="cell-time">${x(c.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(d){a.innerHTML=`<div class="page-error">加载失败: ${n(d.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),s()}),e.querySelector("#audit-filter-btn").addEventListener("click",s),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await A.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),u("导出成功","success")}catch(a){u(`导出失败: ${a.message}`,"error")}}),await Promise.all([t(),s()])}const g=h(),ae=/^BV[a-zA-Z0-9]{10}$/,le={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},de={"auth:no active credential":"缺少可用的激活凭证。","dependency:diagnostics_unavailable":"诊断信息暂时不可用。"};function m(e){const t=e instanceof Error?e.message:String(e??"request_failed");return le[t]||t}function oe(e){return e?ae.test(e)?null:"invalid_bvid_format":"bvid_required"}function ne(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function ce(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function ue(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(s=>de[s]||s).join("；")}async function ve(e){e.innerHTML=`
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
  `;async function t(){var r,o,d,l;const i=e.querySelector("#bili-status-cards");try{const c=await g.getBilibiliStatus(),v=Number(((r=c==null?void 0:c.videos)==null?void 0:r.poll_enabled_count)??0),y=!!((o=c==null?void 0:c.diagnostics)!=null&&o.ready),w=ue((d=c==null?void 0:c.diagnostics)==null?void 0:d.blocking_reasons),k=(l=c==null?void 0:c.credential)!=null&&l.name?n(c.credential.name):"未配置";i.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${c!=null&&c.enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询</div>
          <div class="stat-value">${c!=null&&c.polling_enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布</div>
          <div class="stat-value">${c!=null&&c.publish_enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">视频数</div>
          <div class="stat-value">${(c==null?void 0:c.video_count)??0}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${v}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${k}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${y?"var(--success-color)":"var(--danger-color)"}">${y?"就绪":"阻塞"}</div>
        </div>
        ${w?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">阻塞原因: ${n(w)}</div>`:""}
      `}catch(c){i.innerHTML=`<div class="page-error">状态加载失败: ${n(m(c))}</div>`}}async function s(){const i=e.querySelector("#bili-videos-wrapper");try{const r=await g.getBilibiliVideos({limit:50}),o=Array.isArray(r==null?void 0:r.items)?r.items:Array.isArray(r)?r:[];if(o.length===0){i.innerHTML='<div class="table-empty">暂无视频</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>操作</th></tr></thead>
          <tbody>
            ${o.map(d=>`<tr data-id="${n(d.id||d.video_id)}">
              <td class="cell-id">${n(d.bvid)}</td>
              <td class="cell-truncate">${n(d.title||"-")}</td>
              <td>${M(d.poll_enabled)}</td>
              <td>${d.comment_count??"-"}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${n(d.id||d.video_id)}">${d.poll_enabled?"禁用轮询":"启用轮询"}</button>
                <button class="btn btn-sm bili-sync" data-id="${n(d.id||d.video_id)}">同步</button>
                <button class="btn btn-sm btn-danger bili-delete" data-id="${n(d.id||d.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".bili-toggle-poll").forEach(d=>{d.addEventListener("click",async()=>{try{await g.toggleBilibiliVideoPoll(d.dataset.id),u("操作成功","success"),await Promise.all([t(),s()])}catch(l){u(`失败: ${m(l)}`,"error")}})}),i.querySelectorAll(".bili-sync").forEach(d=>{d.addEventListener("click",async()=>{d.disabled=!0;try{await g.syncBilibiliVideo(d.dataset.id),u("同步完成","success"),s()}catch(l){u(`同步失败: ${m(l)}`,"error"),d.disabled=!1}})}),i.querySelectorAll(".bili-delete").forEach(d=>{d.addEventListener("click",async()=>{if(confirm("确定删除此视频？"))try{await g.deleteBilibiliVideo(d.dataset.id),u("已删除","success"),await Promise.all([t(),s()])}catch(l){u(`删除失败: ${m(l)}`,"error")}})})}catch(r){i.innerHTML=`<div class="page-error">加载失败: ${n(m(r))}</div>`}}async function a(){const i=e.querySelector("#bili-creds-wrapper");try{const r=await g.getBilibiliCredentials(),o=Array.isArray(r==null?void 0:r.items)?r.items:Array.isArray(r)?r:[];if(o.length===0){i.innerHTML='<div class="table-empty">暂无凭证</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期</th><th>操作</th></tr></thead>
          <tbody>
            ${o.map(d=>`<tr data-id="${n(d.id||d.credential_id)}">
              <td>${n(d.name||"-")}</td>
              <td class="cell-id">${n([d.has_sessdata?"SESSDATA":"",d.has_bili_jct?"bili_jct":"",d.buvid3?`buvid3:${d.buvid3}`:""].filter(Boolean).join(" / ")||"-")}</td>
              <td>${M(d.is_active||d.active)}</td>
              <td class="cell-time">${n(d.expires_at?I(d.expires_at):"-")}</td>
              <td class="cell-actions">
                ${d.is_active||d.active?"":`<button class="btn btn-sm cred-activate" data-id="${n(d.id||d.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${n(d.id||d.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".cred-activate").forEach(d=>{d.addEventListener("click",async()=>{try{await g.activateBilibiliCredential(d.dataset.id),u("已激活","success"),await Promise.all([t(),a()])}catch(l){u(`激活失败: ${m(l)}`,"error")}})}),i.querySelectorAll(".cred-delete").forEach(d=>{d.addEventListener("click",async()=>{if(confirm("确定删除此凭证？"))try{await g.deleteBilibiliCredential(d.dataset.id),u("已删除","success"),await Promise.all([t(),a()])}catch(l){u(`删除失败: ${m(l)}`,"error")}})})}catch(r){i.innerHTML=`<div class="page-error">加载失败: ${n(m(r))}</div>`}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const i=e.querySelector("#bili-video-add"),r=e.querySelector("#bili-video-bvid").value.trim(),o=oe(r);if(o){u(m(o),"warning");return}i.disabled=!0,i.textContent="添加中...";try{await g.addBilibiliVideo(r),u("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([t(),s()])}catch(d){u(`添加失败: ${m(d)}`,"error")}finally{i.disabled=!1,i.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{const i=e.querySelector("#cred-add"),r=ce(e.querySelector("#cred-expires").value),o={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:r},d=ne(o);if(d){u(m(d),"warning");return}i.disabled=!0,i.textContent="添加中...";try{await g.addBilibiliCredential(o),u("凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([t(),a()])}catch(l){u(`添加失败: ${m(l)}`,"error")}finally{i.disabled=!1,i.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const i=e.querySelector("#bili-poll-btn");i.disabled=!0,i.textContent="轮询中...";try{await g.triggerBilibiliPoll(),u("轮询完成","success"),s()}catch(r){u(`轮询失败: ${m(r)}`,"error")}finally{i.disabled=!1,i.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",()=>{t(),s(),a()}),await Promise.all([t(),s(),a()])}const N=h();async function pe(e){e.innerHTML=`
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
  `,e.querySelector("#query-comment-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-comment-id").value.trim(),s=e.querySelector("#query-comment-result");if(!t){u("请输入 Comment ID","warning");return}s.innerHTML='<div class="page-loading">查询中...</div>';try{const a=await N.getComment(t);s.innerHTML=`
        <div class="detail-card">
          ${Object.entries(a||{}).map(([i,r])=>`
            <div class="detail-row">
              <span class="detail-key">${n(i)}</span>
              <span class="detail-value">${n(typeof r=="object"?JSON.stringify(r,null,2):String(r??"-"))}</span>
            </div>
          `).join("")}
        </div>
      `}catch(a){s.innerHTML=`<div class="page-error">查询失败: ${n(a.message)}</div>`}}),e.querySelector("#query-job-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-job-id").value.trim(),s=e.querySelector("#query-job-result");if(!t){u("请输入 Job ID","warning");return}s.innerHTML='<div class="page-loading">查询中...</div>';try{const a=await N.getJob(t);s.innerHTML=`
        <div class="detail-card">
          ${Object.entries(a||{}).map(([r,o])=>`
            <div class="detail-row">
              <span class="detail-key">${n(r)}</span>
              <span class="detail-value">${n(typeof o=="object"?JSON.stringify(o,null,2):String(o??"-"))}</span>
            </div>
          `).join("")}
        </div>
        ${a!=null&&a.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${n(a.comment_id)}">查看关联评论 →</a></div>`:""}
      `;const i=s.querySelector("#query-goto-comment");i&&i.addEventListener("click",()=>{e.querySelector("#query-comment-id").value=i.dataset.id,e.querySelector("#query-comment-btn").click()})}catch(a){s.innerHTML=`<div class="page-error">查询失败: ${n(a.message)}</div>`}})}const j={dashboard:{render:D,title:"仪表盘"},jobs:{render:Z,title:"任务管理"},"daily-metrics":{render:W,title:"每日指标"},knowledge:{render:X,title:"知识库"},"role-cards":{render:ee,title:"角色卡"},profiles:{render:te,title:"风格配置"},gateway:{render:se,title:"网关"},audit:{render:re,title:"审计日志"},bilibili:{render:ve,title:"B站集成"},query:{render:pe,title:"查询"}};let V=null;function be(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function K(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function U(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function me(e){e.preventDefault();const t=document.getElementById("login-api-key"),s=document.getElementById("login-error"),a=t.value.trim();if(a){window.__ADMIN_API_KEY__=a;try{await p("/api/admin/overview"),sessionStorage.setItem("admin_api_key",a),U(),P("dashboard")}catch{s.textContent="API Key 无效或服务不可用",s.style.display="block",window.__ADMIN_API_KEY__=""}}}function ye(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",K()}function P(e){if(!j[e])return;V=e,document.querySelectorAll("#nav-list .nav-item").forEach(s=>{s.classList.toggle("active",s.dataset.page===e)}),document.getElementById("page-title").textContent=j[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',j[e].render(t).catch(s=>{t.innerHTML=`<div class="page-error">加载失败: ${s.message}</div>`})}function ge(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==V&&P(t)})})}function fe(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),s=document.getElementById("expand-left-btn");t&&s&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),s.style.display="block"}),s.addEventListener("click",()=>{e.classList.remove("collapsed"),s.style.display="none"}))}function he(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let s=0;e.addEventListener("click",()=>{s=(s+1)%t.length,t[s]?document.body.setAttribute("data-theme",t[s]):document.body.removeAttribute("data-theme")})}function we(){fe(),he(),ge(),document.getElementById("login-form").addEventListener("submit",me),document.getElementById("logout-btn").addEventListener("click",ye),be()?(U(),P("dashboard")):K()}we();
