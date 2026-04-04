(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))r(i);new MutationObserver(i=>{for(const a of i)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&r(o)}).observe(document,{childList:!0,subtree:!0});function s(i){const a={};return i.integrity&&(a.integrity=i.integrity),i.referrerPolicy&&(a.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?a.credentials="include":i.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function r(i){if(i.ep)return;i.ep=!0;const a=s(i);fetch(i.href,a)}})();function F(e,t,s){return typeof e=="string"&&/^[a-z0-9_:-]+$/i.test(e)?e:t>=500?"request_failed":typeof s=="string"&&s.trim()?s.trim().toLowerCase().replace(/\s+/g,"_"):"request_failed"}function D(){return(window.__ADMIN_API_KEY__||"").trim()}async function b(e,t={}){const s=D(),r=new Headers(t.headers||{});s&&r.set("x-api-key",s);const i=await fetch(e,{...t,headers:r}),a=await i.json().catch(()=>({}));if(!i.ok){const o=(a==null?void 0:a.detail)||(a==null?void 0:a.error);throw new Error(F(o,i.status,i.statusText))}return a}async function R(e,t){const s=D(),r=new Headers;s&&r.set("x-api-key",s);const i=await fetch(e,{headers:r});if(!i.ok)throw new Error("download_failed");const a=await i.blob(),o=URL.createObjectURL(a),l=document.createElement("a");l.href=o,l.download=t,document.body.appendChild(l),l.click(),document.body.removeChild(l),URL.revokeObjectURL(o)}function g(e){const t=new URLSearchParams;for(const[r,i]of Object.entries(e))i!=null&&i!==""&&t.set(r,String(i));const s=t.toString();return s?`?${s}`:""}function h(){return{getOverview(){return b("/api/admin/overview")},getJobs({status:e,limit:t}={}){return b(`/api/admin/jobs${g({status:e,limit:t})}`)},getJob(e){return b(`/api/jobs/${encodeURIComponent(e)}`)},approveJob(e){return b(`/api/jobs/${encodeURIComponent(e)}/approve`,{method:"POST"})},retryJob(e,t={}){return b(`/api/jobs/${encodeURIComponent(e)}/retry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},batchApprove(e){return b("/api/jobs/approve-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},batchRetry(e){return b("/api/jobs/retry-batch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:e})})},exportJobsCsv({status:e,limit:t}={}){return R(`/export/jobs.csv${g({status:e,limit:t})}`,"jobs.csv")},getComment(e){return b(`/api/comments/${encodeURIComponent(e)}`)},getGatewayLogs({limit:e,comment_id:t}={}){return b(`/api/admin/gateway/logs${g({limit:e,comment_id:t})}`)},publishGatewayReply(e){return b("/gateway/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},getAuditSummary({days:e,action:t,ok:s}={}){return b(`/api/admin/audit/summary${g({days:e,action:t,ok:s})}`)},getAuditLogs({limit:e,action:t,ok:s}={}){return b(`/api/audit-log${g({limit:e,action:t,ok:s})}`)},exportAuditCsv({limit:e,action:t,ok:s}={}){return R(`/export/audit-logs.csv${g({limit:e,action:t,ok:s})}`,"audit-logs.csv")},getDailyMetrics({days:e}={}){return b(`/api/metrics/daily${g({days:e})}`)},getKnowledgeEntries({limit:e,offset:t}={}){return b(`/api/admin/knowledge${g({limit:e,offset:t})}`)},createKnowledgeEntry(e){return b("/api/admin/knowledge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},disableKnowledgeEntry(e){return b(`/api/admin/knowledge/${encodeURIComponent(e)}/disable`,{method:"POST"})},getRoleCards({limit:e,offset:t}={}){return b(`/api/admin/role-cards${g({limit:e,offset:t})}`)},createRoleCard(e){return b("/api/admin/role-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},updateRoleCard(e,t){return b(`/api/admin/role-cards/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})},disableRoleCard(e){return b(`/api/admin/role-cards/${encodeURIComponent(e)}/disable`,{method:"POST"})},activateRoleCard(e){return b(`/api/admin/role-cards/${encodeURIComponent(e)}/activate`,{method:"POST"})},getStyleProfile(){return b("/api/admin/style-profile")},setStyleProfile(e){return b("/api/admin/style-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({style:e})})},getRoleProfile(){return b("/api/admin/role-profile")},setRoleProfile(e){return b("/api/admin/role-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e})})},getBilibiliStatus(){return b("/api/admin/bilibili/status")},getBilibiliVideos({poll_enabled:e,limit:t,offset:s}={}){return b(`/api/admin/bilibili/videos${g({poll_enabled:e,limit:t,offset:s})}`)},addBilibiliVideo(e){return b("/api/admin/bilibili/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bvid:e})})},toggleBilibiliVideoPoll(e){return b(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/toggle-poll`,{method:"POST"})},syncBilibiliVideo(e){return b(`/api/admin/bilibili/videos/${encodeURIComponent(e)}/sync`,{method:"POST"})},deleteBilibiliVideo(e){return b(`/api/admin/bilibili/videos/${encodeURIComponent(e)}`,{method:"DELETE"})},triggerBilibiliPoll(){return b("/api/admin/bilibili/poll",{method:"POST"})},getBilibiliCredentials(){return b("/api/admin/bilibili/credentials")},addBilibiliCredential(e){return b("/api/admin/bilibili/credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})},activateBilibiliCredential(e){return b(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}/activate`,{method:"POST"})},deleteBilibiliCredential(e){return b(`/api/admin/bilibili/credentials/${encodeURIComponent(e)}`,{method:"DELETE"})}}}function n(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function P(e){if(!e)return"-";try{const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}catch{return String(e)}}function W(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const s=Date.now()-t.getTime(),r=Math.floor(s/1e3);if(r<60)return"刚刚";const i=Math.floor(r/60);if(i<60)return`${i}分钟前`;const a=Math.floor(i/60);if(a<24)return`${a}小时前`;const o=Math.floor(a/24);if(o<30)return`${o}天前`;const l=Math.floor(o/30);return l<12?`${l}个月前`:`${Math.floor(l/12)}年前`}catch{return""}}function _(e){const t=W(e),s=P(e);return t?`<span title="${n(s)}">${n(t)}</span>`:`<span title="${n(s)}">${n(s)}</span>`}function w(e){if(e==null)return"0";const t=Number(e);return isNaN(t)?"0":String(t)}const Z={published:{label:"已发布",cls:"badge-success"},failed:{label:"失败",cls:"badge-danger"},queued:{label:"排队中",cls:"badge-warning"},pending_review:{label:"待审核",cls:"badge-warning"},approved:{label:"已审批",cls:"badge-success"},retrying:{label:"重试中",cls:"badge-info"},skipped:{label:"已跳过",cls:"badge-muted"},processing:{label:"处理中",cls:"badge-info"}};function H(e){if(!e)return"";const t=Z[e]||{label:e,cls:"badge-muted"};return`<span class="status-badge ${t.cls}">${n(t.label)}</span>`}function B(e,t="是",s="否"){return`<span class="status-badge ${e?"badge-success":"badge-muted"}">${n(e?t:s)}</span>`}let A=null;function c(e,t="info"){const s=document.getElementById("app-toast");s&&s.remove(),A&&clearTimeout(A);const r={info:"var(--primary-cta)",success:"var(--success-color)",error:"var(--danger-color)",warning:"var(--warning-color)"},i=document.createElement("div");i.id="app-toast",i.className="toast-notification",i.style.setProperty("--toast-color",r[t]||r.info),i.innerHTML=`
    <span class="toast-message">${e}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
  `,document.body.appendChild(i),requestAnimationFrame(()=>i.classList.add("show"));const a=()=>{i.classList.remove("show"),setTimeout(()=>i.remove(),300)};i.querySelector(".toast-close").onclick=a,A=setTimeout(a,4e3)}const E=h();async function V(e){e.innerHTML='<div class="page-loading">加载中...</div>';try{const[t,s,r,i]=await Promise.all([E.getOverview().catch(()=>null),E.getJobs({limit:5}).catch(()=>null),E.getGatewayLogs({limit:5}).catch(()=>null),E.getAuditSummary({days:7}).catch(()=>null)]),a=t||{},o=Array.isArray(s==null?void 0:s.items)?s.items:[],l=Array.isArray(r==null?void 0:r.items)?r.items:[];e.innerHTML=`
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${w(a.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${w(a.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${w(a.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${w(a.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${w(a.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${w(l.length)}</div>
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
                ${o.length===0?'<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>':o.map(d=>{var p,u;return`<tr>
                    <td class="cell-id">${n((p=d.id)==null?void 0:p.substring(0,8))}</td>
                    <td>${H(d.status)}</td>
                    <td class="cell-truncate">${n((u=d.comment_text)==null?void 0:u.substring(0,60))}</td>
                    <td class="cell-time">${n(P(d.created_at))}</td>
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
    `,e.querySelector("#dashboard-refresh").addEventListener("click",()=>{c("正在刷新...","info"),V(e)})}catch(t){e.innerHTML=`<div class="page-error">加载失败: ${n(t.message)}</div>`}}const S=h();async function Q(e){let t=new Set;e.innerHTML=`
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
  `;const s=e.querySelector("#jobs-status"),r=e.querySelector("#jobs-limit");async function i(){var l;t.clear(),a();const o=e.querySelector("#jobs-table-wrapper");o.innerHTML='<div class="page-loading">加载中...</div>';try{const d=await S.getJobs({status:s.value,limit:r.value}),p=Array.isArray(d==null?void 0:d.items)?d.items:[];if(p.length===0){o.innerHTML='<div class="table-empty">暂无任务</div>';return}o.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${p.map(u=>{var v,$,q,k;return`
              <tr data-id="${n(u.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${n(u.id)}" /></td>
                <td class="cell-id" title="${n(u.id)}">${n((v=u.id)==null?void 0:v.substring(0,8))}</td>
                <td>${H(u.status)}</td>
                <td class="cell-truncate" title="${n(u.comment_text)}">${n(($=u.comment_text)==null?void 0:$.substring(0,80))}</td>
                <td class="cell-truncate">${n((q=u.reply_text)==null?void 0:q.substring(0,60))}</td>
                <td>${(k=u.risk_flags)!=null&&k.length?u.risk_flags.map(C=>`<span class="risk-flag">${n(C)}</span>`).join(" "):"-"}</td>
                <td class="cell-time">${_(u.created_at)}</td>
                <td class="cell-actions">
                  ${u.status==="pending_review"?`<button class="btn btn-sm btn-primary job-approve" data-id="${n(u.id)}">审批</button>`:""}
                  <button class="btn btn-sm job-retry" data-id="${n(u.id)}">重试</button>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      `,(l=o.querySelector("#jobs-select-all"))==null||l.addEventListener("change",u=>{const v=u.target.checked;o.querySelectorAll(".job-checkbox").forEach($=>{$.checked=v,v?t.add($.dataset.id):t.delete($.dataset.id)}),a()}),o.querySelectorAll(".job-checkbox").forEach(u=>{u.addEventListener("change",()=>{u.checked?t.add(u.dataset.id):t.delete(u.dataset.id),a()})}),o.querySelectorAll(".job-approve").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="审批中...";try{await S.approveJob(u.dataset.id),c("审批成功","success"),i()}catch(v){c(`审批失败: ${v.message}`,"error"),u.disabled=!1,u.textContent="审批"}})}),o.querySelectorAll(".job-retry").forEach(u=>{u.addEventListener("click",async()=>{u.disabled=!0,u.textContent="重试中...";try{await S.retryJob(u.dataset.id),c("重试已提交","success"),i()}catch(v){c(`重试失败: ${v.message}`,"error"),u.disabled=!1,u.textContent="重试"}})})}catch(d){o.innerHTML=`<div class="page-error">加载失败: ${n(d.message)}</div>`}}function a(){const o=e.querySelector("#jobs-batch-bar"),l=e.querySelector("#jobs-selected-count");t.size>0?(o.style.display="flex",l.textContent=`已选 ${t.size} 项`):o.style.display="none"}e.querySelector("#jobs-filter-btn").addEventListener("click",i),e.querySelector("#jobs-refresh").addEventListener("click",i),e.querySelector("#jobs-export").addEventListener("click",async()=>{try{await S.exportJobsCsv({status:s.value,limit:r.value}),c("导出成功","success")}catch(o){c(`导出失败: ${o.message}`,"error")}}),e.querySelector("#jobs-batch-approve").addEventListener("click",async()=>{if(t.size!==0)try{await S.batchApprove([...t]),c(`批量审批 ${t.size} 项成功`,"success"),i()}catch(o){c(`批量审批失败: ${o.message}`,"error")}}),e.querySelector("#jobs-batch-retry").addEventListener("click",async()=>{if(t.size!==0)try{await S.batchRetry([...t]),c(`批量重试 ${t.size} 项成功`,"success"),i()}catch(o){c(`批量重试失败: ${o.message}`,"error")}}),await i()}const X=h();async function ee(e){e.innerHTML=`
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
  `;async function t(){const s=e.querySelector("#metrics-days").value,r=e.querySelector("#metrics-table-wrapper");r.innerHTML='<div class="page-loading">加载中...</div>';try{const i=await X.getDailyMetrics({days:s}),a=Array.isArray(i==null?void 0:i.items)?i.items:Array.isArray(i)?i:[];if(a.length===0){r.innerHTML='<div class="table-empty">暂无指标数据</div>';return}r.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${a.map(o=>`<tr>
              <td class="cell-time">${n(o.date||o.day)}</td>
              <td>${n(o.comments??o.comment_count??0)}</td>
              <td>${n(o.jobs??o.job_count??0)}</td>
              <td style="color:var(--success-color)">${n(o.published??o.published_count??0)}</td>
              <td style="color:var(--danger-color)">${n(o.failed??o.failed_count??0)}</td>
              <td>${n(o.skipped??o.skipped_count??0)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      `}catch(i){r.innerHTML=`<div class="page-error">加载失败: ${n(i.message)}</div>`}}e.querySelector("#metrics-load").addEventListener("click",t),await t()}const j=h();async function te(e){e.innerHTML=`
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
  `;async function t(){const s=e.querySelector("#knowledge-table-wrapper");s.innerHTML='<div class="page-loading">加载中...</div>';try{const r=await j.getKnowledgeEntries({limit:50}),i=Array.isArray(r==null?void 0:r.items)?r.items:[];if(i.length===0){s.innerHTML='<div class="table-empty">暂无知识条目</div>';return}s.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${i.map(a=>{var o,l;return`<tr>
              <td class="cell-id">${n((o=a.id)==null?void 0:o.toString().substring(0,8))}</td>
              <td>${n(a.category)}</td>
              <td>${n(a.title)}</td>
              <td class="cell-truncate">${n((l=a.content)==null?void 0:l.substring(0,80))}</td>
              <td>${B(a.enabled!==!1)}</td>
              <td class="cell-time">${_(a.created_at)}</td>
              <td class="cell-actions">
                ${a.enabled!==!1?`<button class="btn btn-sm btn-danger knowledge-disable" data-id="${n(a.id)}">禁用</button>`:'<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `,s.querySelectorAll(".knowledge-disable").forEach(a=>{a.addEventListener("click",async()=>{try{await j.disableKnowledgeEntry(a.dataset.id),c("已禁用","success"),t()}catch(o){c(`操作失败: ${o.message}`,"error")}})})}catch(r){s.innerHTML=`<div class="page-error">加载失败: ${n(r.message)}</div>`}}e.querySelector("#knowledge-create").addEventListener("click",async()=>{const s=e.querySelector("#knowledge-category").value.trim(),r=e.querySelector("#knowledge-title").value.trim(),i=e.querySelector("#knowledge-content").value.trim();if(!r||!i){c("标题和内容不能为空","warning");return}try{await j.createKnowledgeEntry({category:s,title:r,content:i}),c("创建成功","success"),e.querySelector("#knowledge-category").value="",e.querySelector("#knowledge-title").value="",e.querySelector("#knowledge-content").value="",t()}catch(a){c(`创建失败: ${a.message}`,"error")}}),e.querySelector("#knowledge-refresh").addEventListener("click",t),await t()}const L=h();let x=!1,m=null;async function ie(e){x=!1,m=null,e.innerHTML=`
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
  `;const t=e.querySelector("#rc-select"),s=e.querySelector("#rc-editor");let r=[];function i(){x=!0}function a(){return x?confirm("当前角色卡有未保存的修改，确定要切换吗？"):!0}function o(d){m=d,e.querySelector("#rc-key").value=(d==null?void 0:d.key)||"",e.querySelector("#rc-key").disabled=!!d,e.querySelector("#rc-name").value=(d==null?void 0:d.name)||"",e.querySelector("#rc-desc").value=(d==null?void 0:d.description)||"",e.querySelector("#rc-system-prompt").value=(d==null?void 0:d.system_prompt)||"",e.querySelector("#rc-tone").value=(d==null?void 0:d.tone)||"",e.querySelector("#rc-constraints").value=typeof(d==null?void 0:d.constraints)=="string"?d.constraints:JSON.stringify((d==null?void 0:d.constraints)||"",null,2),e.querySelector("#rc-editor-title").textContent=d?`编辑: ${d.name||d.key}`:"新建角色卡",e.querySelector("#rc-activate").style.display=d&&d.enabled!==!1?"inline-flex":"none",e.querySelector("#rc-disable").style.display=d&&d.enabled!==!1?"inline-flex":"none",s.style.display="block",x=!1}s.querySelectorAll(".form-input").forEach(d=>d.addEventListener("input",i));async function l(){try{const d=await L.getRoleCards({limit:100});r=Array.isArray(d==null?void 0:d.items)?d.items:Array.isArray(d)?d:[],t.innerHTML='<option value="">-- 新建 --</option>'+r.map(p=>`<option value="${n(p.key)}">${n(p.name||p.key)}${p.enabled===!1?" (禁用)":""}</option>`).join("")}catch(d){c(`加载失败: ${d.message}`,"error")}}t.addEventListener("change",()=>{if(!a()){t.value=(m==null?void 0:m.key)||"";return}const d=t.value,p=r.find(u=>u.key===d);o(p||null)}),e.querySelector("#rc-new").addEventListener("click",()=>{a()&&(t.value="",o(null))}),e.querySelector("#rc-save").addEventListener("click",async()=>{const d={key:e.querySelector("#rc-key").value.trim(),name:e.querySelector("#rc-name").value.trim(),description:e.querySelector("#rc-desc").value.trim(),system_prompt:e.querySelector("#rc-system-prompt").value.trim(),tone:e.querySelector("#rc-tone").value.trim()},p=e.querySelector("#rc-constraints").value.trim();try{d.constraints=p?JSON.parse(p):""}catch{d.constraints=p}if(!d.key){c("Key 不能为空","warning");return}try{m!=null&&m.key?(await L.updateRoleCard(m.key,d),c("保存成功","success")):(await L.createRoleCard(d),c("创建成功","success")),x=!1,await l(),t.value=d.key}catch(u){c(`操作失败: ${u.message}`,"error")}}),e.querySelector("#rc-activate").addEventListener("click",async()=>{if(m!=null&&m.key)try{await L.activateRoleCard(m.key),c("已激活","success"),await l()}catch(d){c(`激活失败: ${d.message}`,"error")}}),e.querySelector("#rc-disable").addEventListener("click",async()=>{if(m!=null&&m.key)try{await L.disableRoleCard(m.key),c("已禁用","success"),await l()}catch(d){c(`禁用失败: ${d.message}`,"error")}}),e.querySelector("#rc-refresh").addEventListener("click",()=>{l()}),await l()}const T=h();async function se(e){e.innerHTML=`
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
  `;async function t(){try{const[s,r]=await Promise.all([T.getStyleProfile().catch(()=>null),T.getRoleProfile().catch(()=>null)]);s!=null&&s.style&&(e.querySelector("#profile-style").value=s.style,e.querySelector("#profile-style-current").textContent=`当前: ${s.style}`),r!=null&&r.role&&(e.querySelector("#profile-role").value=r.role,e.querySelector("#profile-role-current").textContent=`当前: ${r.role}`)}catch(s){c(`加载配置失败: ${s.message}`,"error")}}e.querySelector("#profile-style-apply").addEventListener("click",async()=>{const s=e.querySelector("#profile-style").value;try{await T.setStyleProfile(s),e.querySelector("#profile-style-current").textContent=`当前: ${s}`,c("风格已更新","success")}catch(r){c(`更新失败: ${r.message}`,"error")}}),e.querySelector("#profile-role-apply").addEventListener("click",async()=>{const s=e.querySelector("#profile-role").value;try{await T.setRoleProfile(s),e.querySelector("#profile-role-current").textContent=`当前: ${s}`,c("角色配置已更新","success")}catch(r){c(`更新失败: ${r.message}`,"error")}}),await t()}function le({columns:e,rows:t,empty:s="暂无数据"}){if(!t||t.length===0)return`<div class="table-empty">${n(s)}</div>`;const r=e.map(a=>`<th class="${a.class||""}">${n(a.label)}</th>`).join(""),i=t.map(a=>`<tr>${e.map(o=>`<td class="${o.class||""}">${o.render?o.render(a):n(a[o.key])}</td>`).join("")}</tr>`).join("");return`
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${r}</tr></thead>
        <tbody>${i}</tbody>
      </table>
    </div>
  `}const N=h();async function ae(e){e.innerHTML=`
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
  `;const t=e.querySelector("#gw-reply"),s=e.querySelector("#gw-char-count");t.addEventListener("input",()=>{s.textContent=`${t.value.length} 字`}),e.querySelector("#gw-publish-btn").addEventListener("click",async()=>{const i=e.querySelector("#gw-publish-btn"),a=e.querySelector("#gw-comment-id").value.trim(),o=e.querySelector("#gw-reply").value.trim(),l=e.querySelector("#gw-source").value.trim(),d=e.querySelector("#gw-force").checked;if(!a||!o){c("Comment ID 和回复内容不能为空","warning");return}i.disabled=!0,i.textContent="发布中...";try{await N.publishGatewayReply({comment_id:a,reply_text:o,source:l,force_publish:d}),c("发布成功","success"),e.querySelector("#gw-comment-id").value="",e.querySelector("#gw-reply").value="",s.textContent="0/0",r()}catch(p){c(`发布失败: ${p.message}`,"error")}finally{i.disabled=!1,i.textContent="发布"}});async function r(){const i=e.querySelector("#gw-table-wrapper"),a=e.querySelector("#gw-limit").value;i.innerHTML='<div class="page-loading">加载中...</div>';try{const o=await N.getGatewayLogs({limit:a}),l=Array.isArray(o==null?void 0:o.items)?o.items:[];if(l.length===0){i.innerHTML='<div class="table-empty">暂无网关日志</div>';return}i.innerHTML=le({columns:[{key:"id",label:"ID",class:"cell-id",render:d=>{var p;return n((p=d.id)==null?void 0:p.toString().substring(0,8))}},{key:"comment_id",label:"Comment ID",class:"cell-id",render:d=>{var p;return n((p=d.comment_id)==null?void 0:p.substring(0,12))}},{key:"status",label:"状态",render:d=>H(d.status)},{key:"platform",label:"平台",render:d=>n(d.platform||"-")},{key:"reply_text",label:"回复摘要",class:"cell-truncate",render:d=>{var p;return n((p=d.reply_text)==null?void 0:p.substring(0,60))}},{key:"created_at",label:"时间",class:"cell-time",render:d=>_(d.created_at)}],rows:l})}catch(o){i.innerHTML=`<div class="page-error">加载失败: ${n(o.message)}</div>`}}e.querySelector("#gw-refresh").addEventListener("click",r),e.querySelector("#gw-filter-btn").addEventListener("click",r),await r()}const M=h();async function re(e){e.innerHTML=`
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
  `;async function t(){try{const r=await M.getAuditSummary({days:7}),i=e.querySelector("#audit-summary-cards");i.innerHTML=`
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
      `}catch{e.querySelector("#audit-summary-cards").innerHTML='<div class="page-error">摘要加载失败</div>'}}async function s(){const r=e.querySelector("#audit-table-wrapper");r.innerHTML='<div class="page-loading">加载中...</div>';const i=e.querySelector("#audit-action").value.trim(),a=e.querySelector("#audit-ok").value,o=e.querySelector("#audit-limit").value;try{const l=await M.getAuditLogs({action:i,ok:a,limit:o}),d=Array.isArray(l==null?void 0:l.items)?l.items:[];if(d.length===0){r.innerHTML='<div class="table-empty">暂无审计日志</div>';return}r.innerHTML=`
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${d.map(p=>{var u;return`<tr>
              <td class="cell-id">${n((u=p.id)==null?void 0:u.toString().substring(0,8))}</td>
              <td>${n(p.action)}</td>
              <td class="cell-truncate">${n(p.target_id||"-")}</td>
              <td>${p.ok?'<span class="status-badge badge-success">成功</span>':'<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate">${n(p.detail||"-")}</td>
              <td class="cell-time">${_(p.created_at)}</td>
            </tr>`}).join("")}
          </tbody>
        </table>
      `}catch(l){r.innerHTML=`<div class="page-error">加载失败: ${n(l.message)}</div>`}}e.querySelector("#audit-refresh").addEventListener("click",()=>{t(),s()}),e.querySelector("#audit-filter-btn").addEventListener("click",s),e.querySelector("#audit-export").addEventListener("click",async()=>{try{await M.exportAuditCsv({action:e.querySelector("#audit-action").value.trim(),ok:e.querySelector("#audit-ok").value,limit:e.querySelector("#audit-limit").value}),c("导出成功","success")}catch(r){c(`导出失败: ${r.message}`,"error")}}),await Promise.all([t(),s()])}const f=h(),de=/^BV[a-zA-Z0-9]{10}$/,oe={unauthorized:"未授权，请检查管理 API Key。",bilibili_not_configured:"请先添加并激活可用的 B 站凭证。",bilibili_sync_failed:"同步失败，请稍后重试。",invalid_poll_enabled:"轮询开关参数无效。",invalid_video_id:"视频标识无效。",invalid_credential_id:"凭证标识无效。",video_not_found:"视频不存在或已删除。",credential_not_found:"凭证不存在或已删除。",invalid_bvid_format:"BVID 格式不正确。",bvid_required:"BVID 不能为空。",name_required:"名称不能为空。",sessdata_required:"SESSDATA 不能为空。",bili_jct_required:"bili_jct 不能为空。",buvid3_required:"buvid3 不能为空。",invalid_expires_at:"过期时间格式无效。",request_failed:"请求失败，请稍后重试。"},ne={"auth:no active credential":"缺少可用的激活凭证。","dependency:diagnostics_unavailable":"诊断信息暂时不可用。"},ce={manual_queue:"人工队列",simulated:"模拟发布",webhook:"Webhook",real_publish:"真实发布",native_bilibili:"原生 B 站发布"},ue={ok:{label:"成功",cls:"badge-success"},no_new:{label:"无新增",cls:"badge-muted"},error:{label:"失败",cls:"badge-danger"}},ve={no_aid:"缺少视频 aid，暂时无法轮询。",retry_exhausted:"评论抓取重试耗尽。"};function y(e){const t=e instanceof Error?e.message:String(e??"request_failed");return oe[t]||t}function pe(e){return e?de.test(e)?null:"invalid_bvid_format":"bvid_required"}function be(e){return e.name?e.sessdata?e.bili_jct?e.buvid3?e.expires_at===null?"invalid_expires_at":null:"buvid3_required":"bili_jct_required":"sessdata_required":"name_required"}function me(e){if(!e)return;const t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function ye(e){return(Array.isArray(e)?e.filter(Boolean):[]).map(s=>ne[s]||s).join("；")}function fe(e){const t=String(e??"").trim().toLowerCase();return ce[t]||t||"-"}function ge(e){const t=Number(e);return!Number.isFinite(t)||t<=0?"-":t%60===0?`${t/60} 分钟`:`${t} 秒`}function he(e,t){const s=String(e??"").trim().toLowerCase();if(!s)return"-";const r=ue[s]||{label:s,cls:"badge-muted"},i=s==="error"&&t?ve[String(t).trim().toLowerCase()]||String(t):"",a=i?` title="${n(i)}"`:"";return`<span class="status-badge ${r.cls}"${a}>${n(r.label)}</span>${i?`<div class="form-hint" style="margin-top:4px;">${n(i)}</div>`:""}`}async function we(e){e.innerHTML=`
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
  `;async function t(){var a,o,l,d,p,u;const i=e.querySelector("#bili-status-cards");try{const v=await f.getBilibiliStatus(),$=Number(((a=v==null?void 0:v.videos)==null?void 0:a.poll_enabled_count)??0),q=!!((o=v==null?void 0:v.diagnostics)!=null&&o.ready),k=ye((l=v==null?void 0:v.diagnostics)==null?void 0:l.blocking_reasons),C=(d=v==null?void 0:v.credential)!=null&&d.name?n(v.credential.name):"未配置",G=fe((p=v==null?void 0:v.diagnostics)==null?void 0:p.effective_publish_mode),Y=ge((u=v==null?void 0:v.config)==null?void 0:u.poll_interval_seconds);i.innerHTML=`
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${v!=null&&v.enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询</div>
          <div class="stat-value">${v!=null&&v.polling_enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布</div>
          <div class="stat-value">${v!=null&&v.publish_enabled?"✅":"❌"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">视频数</div>
          <div class="stat-value">${(v==null?void 0:v.video_count)??0}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${$}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${C}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${q?"var(--success-color)":"var(--danger-color)"}">${q?"就绪":"阻塞"}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布模式</div>
          <div class="stat-value">${n(G)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询间隔</div>
          <div class="stat-value">${n(Y)}</div>
        </div>
        ${k?`<div class="page-error" style="grid-column: 1 / -1; margin: 0;">阻塞原因: ${n(k)}</div>`:""}
      `}catch(v){i.innerHTML=`<div class="page-error">状态加载失败: ${n(y(v))}</div>`}}async function s(){const i=e.querySelector("#bili-videos-wrapper");try{const a=await f.getBilibiliVideos({limit:50}),o=Array.isArray(a==null?void 0:a.items)?a.items:Array.isArray(a)?a:[];if(o.length===0){i.innerHTML='<div class="table-empty">暂无视频</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${o.map(l=>`<tr data-id="${n(l.id||l.video_id)}">
              <td class="cell-id">${n(l.bvid)}</td>
              <td class="cell-truncate">${n(l.title||"-")}</td>
              <td>${B(l.poll_enabled)}</td>
              <td>${l.comment_count??"-"}</td>
              <td class="cell-time">${l.last_polled_at?_(l.last_polled_at):"-"}</td>
              <td>${he(l.last_poll_status,l.last_poll_error)}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${n(l.id||l.video_id)}">${l.poll_enabled?"禁用轮询":"启用轮询"}</button>
                <button class="btn btn-sm bili-sync" data-id="${n(l.id||l.video_id)}">同步</button>
                <button class="btn btn-sm btn-danger bili-delete" data-id="${n(l.id||l.video_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".bili-toggle-poll").forEach(l=>{l.addEventListener("click",async()=>{l.disabled=!0;try{await f.toggleBilibiliVideoPoll(l.dataset.id),c("操作成功","success"),await Promise.all([t(),s()])}catch(d){c(`失败: ${y(d)}`,"error")}finally{l.disabled=!1}})}),i.querySelectorAll(".bili-sync").forEach(l=>{l.addEventListener("click",async()=>{const d=l.textContent;l.disabled=!0,l.textContent="同步中...";try{await f.syncBilibiliVideo(l.dataset.id),c("同步完成","success"),await Promise.all([t(),s()])}catch(p){c(`同步失败: ${y(p)}`,"error")}finally{l.disabled=!1,l.textContent=d}})}),i.querySelectorAll(".bili-delete").forEach(l=>{l.addEventListener("click",async()=>{if(confirm("确定删除此视频？")){l.disabled=!0;try{await f.deleteBilibiliVideo(l.dataset.id),c("已删除","success"),await Promise.all([t(),s()])}catch(d){c(`删除失败: ${y(d)}`,"error")}finally{l.disabled=!1}}})})}catch(a){i.innerHTML=`<div class="page-error">加载失败: ${n(y(a))}</div>`}}async function r(){const i=e.querySelector("#bili-creds-wrapper");try{const a=await f.getBilibiliCredentials(),o=Array.isArray(a==null?void 0:a.items)?a.items:Array.isArray(a)?a:[];if(o.length===0){i.innerHTML='<div class="table-empty">暂无凭证</div>';return}i.innerHTML=`
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${o.map(l=>`<tr data-id="${n(l.id||l.credential_id)}">
              <td>${n(l.name||"-")}</td>
              <td class="cell-id">${n([l.has_sessdata?"SESSDATA":"",l.has_bili_jct?"bili_jct":"",l.buvid3?`buvid3:${l.buvid3}`:""].filter(Boolean).join(" / ")||"-")}</td>
              <td>${B(l.is_active||l.active)}</td>
              <td class="cell-time">${n(l.expires_at?P(l.expires_at):"-")}</td>
              <td class="cell-time">${l.last_used_at?_(l.last_used_at):"-"}</td>
              <td class="cell-actions">
                ${l.is_active||l.active?"":`<button class="btn btn-sm cred-activate" data-id="${n(l.id||l.credential_id)}">激活</button>`}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${n(l.id||l.credential_id)}">删除</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll(".cred-activate").forEach(l=>{l.addEventListener("click",async()=>{l.disabled=!0;try{await f.activateBilibiliCredential(l.dataset.id),c("已激活","success"),await Promise.all([t(),r()])}catch(d){c(`激活失败: ${y(d)}`,"error")}finally{l.disabled=!1}})}),i.querySelectorAll(".cred-delete").forEach(l=>{l.addEventListener("click",async()=>{if(confirm("确定删除此凭证？")){l.disabled=!0;try{await f.deleteBilibiliCredential(l.dataset.id),c("已删除","success"),await Promise.all([t(),r()])}catch(d){c(`删除失败: ${y(d)}`,"error")}finally{l.disabled=!1}}})})}catch(a){i.innerHTML=`<div class="page-error">加载失败: ${n(y(a))}</div>`}}e.querySelector("#bili-video-add").addEventListener("click",async()=>{const i=e.querySelector("#bili-video-add"),a=e.querySelector("#bili-video-bvid").value.trim(),o=pe(a);if(o){c(y(o),"warning");return}i.disabled=!0,i.textContent="添加中...";try{await f.addBilibiliVideo(a),c("添加成功","success"),e.querySelector("#bili-video-bvid").value="",await Promise.all([t(),s()])}catch(l){c(`添加失败: ${y(l)}`,"error")}finally{i.disabled=!1,i.textContent="添加"}}),e.querySelector("#cred-add").addEventListener("click",async()=>{const i=e.querySelector("#cred-add"),a=me(e.querySelector("#cred-expires").value),o={name:e.querySelector("#cred-name").value.trim(),sessdata:e.querySelector("#cred-sessdata").value.trim(),bili_jct:e.querySelector("#cred-bili-jct").value.trim(),buvid3:e.querySelector("#cred-buvid3").value.trim(),buvid4:e.querySelector("#cred-buvid4").value.trim(),expires_at:a},l=be(o);if(l){c(y(l),"warning");return}i.disabled=!0,i.textContent="添加中...";try{await f.addBilibiliCredential(o),c("凭证添加成功","success"),e.querySelector("#cred-name").value="",e.querySelector("#cred-sessdata").value="",e.querySelector("#cred-bili-jct").value="",e.querySelector("#cred-buvid3").value="",e.querySelector("#cred-buvid4").value="",e.querySelector("#cred-expires").value="",await Promise.all([t(),r()])}catch(d){c(`添加失败: ${y(d)}`,"error")}finally{i.disabled=!1,i.textContent="添加凭证"}}),e.querySelector("#bili-poll-btn").addEventListener("click",async()=>{const i=e.querySelector("#bili-poll-btn");i.disabled=!0,i.textContent="轮询中...";try{await f.triggerBilibiliPoll(),c("轮询完成","success"),await Promise.all([t(),s()])}catch(a){c(`轮询失败: ${y(a)}`,"error")}finally{i.disabled=!1,i.textContent="触发轮询"}}),e.querySelector("#bili-refresh").addEventListener("click",()=>{t(),s(),r()}),await Promise.all([t(),s(),r()])}const J=h();async function $e(e){e.innerHTML=`
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
  `,e.querySelector("#query-comment-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-comment-id").value.trim(),s=e.querySelector("#query-comment-result");if(!t){c("请输入 Comment ID","warning");return}s.innerHTML='<div class="page-loading">查询中...</div>';try{const r=await J.getComment(t);s.innerHTML=`
        <div class="detail-card">
          ${Object.entries(r||{}).map(([i,a])=>`
            <div class="detail-row">
              <span class="detail-key">${n(i)}</span>
              <span class="detail-value">${n(typeof a=="object"?JSON.stringify(a,null,2):String(a??"-"))}</span>
            </div>
          `).join("")}
        </div>
      `}catch(r){s.innerHTML=`<div class="page-error">查询失败: ${n(r.message)}</div>`}}),e.querySelector("#query-job-btn").addEventListener("click",async()=>{const t=e.querySelector("#query-job-id").value.trim(),s=e.querySelector("#query-job-result");if(!t){c("请输入 Job ID","warning");return}s.innerHTML='<div class="page-loading">查询中...</div>';try{const r=await J.getJob(t);s.innerHTML=`
        <div class="detail-card">
          ${Object.entries(r||{}).map(([a,o])=>`
            <div class="detail-row">
              <span class="detail-key">${n(a)}</span>
              <span class="detail-value">${n(typeof o=="object"?JSON.stringify(o,null,2):String(o??"-"))}</span>
            </div>
          `).join("")}
        </div>
        ${r!=null&&r.comment_id?`<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${n(r.comment_id)}">查看关联评论 →</a></div>`:""}
      `;const i=s.querySelector("#query-goto-comment");i&&i.addEventListener("click",()=>{e.querySelector("#query-comment-id").value=i.dataset.id,e.querySelector("#query-comment-btn").click()})}catch(r){s.innerHTML=`<div class="page-error">查询失败: ${n(r.message)}</div>`}})}const I={dashboard:{render:V,title:"仪表盘"},jobs:{render:Q,title:"任务管理"},"daily-metrics":{render:ee,title:"每日指标"},knowledge:{render:te,title:"知识库"},"role-cards":{render:ie,title:"角色卡"},profiles:{render:se,title:"风格配置"},gateway:{render:ae,title:"网关"},audit:{render:re,title:"审计日志"},bilibili:{render:we,title:"B站集成"},query:{render:$e,title:"查询"}};let K=null;function Se(){const e=sessionStorage.getItem("admin_api_key");return e?(window.__ADMIN_API_KEY__=e,!0):!1}function U(){document.getElementById("login-overlay").style.display="flex",document.getElementById("logout-btn").style.display="none"}function z(){document.getElementById("login-overlay").style.display="none",document.getElementById("logout-btn").style.display=""}async function _e(e){e.preventDefault();const t=document.getElementById("login-api-key"),s=document.getElementById("login-error"),r=t.value.trim();if(r){window.__ADMIN_API_KEY__=r;try{await b("/api/admin/overview"),sessionStorage.setItem("admin_api_key",r),z(),O("dashboard")}catch{s.textContent="API Key 无效或服务不可用",s.style.display="block",window.__ADMIN_API_KEY__=""}}}function qe(){sessionStorage.removeItem("admin_api_key"),window.__ADMIN_API_KEY__="",document.getElementById("page-container").innerHTML="",U()}function O(e){if(!I[e])return;K=e,document.querySelectorAll("#nav-list .nav-item").forEach(s=>{s.classList.toggle("active",s.dataset.page===e)}),document.getElementById("page-title").textContent=I[e].title;const t=document.getElementById("page-container");t.innerHTML='<div class="page-loading">加载中...</div>',I[e].render(t).catch(s=>{t.innerHTML=`<div class="page-error">加载失败: ${s.message}</div>`})}function ke(){document.querySelectorAll("#nav-list .nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.page;t&&t!==K&&O(t)})})}function Le(){const e=document.getElementById("left-sidebar"),t=document.getElementById("toggle-left-btn"),s=document.getElementById("expand-left-btn");t&&s&&e&&(t.addEventListener("click",()=>{e.classList.add("collapsed"),s.style.display="block"}),s.addEventListener("click",()=>{e.classList.remove("collapsed"),s.style.display="none"}))}function xe(){const e=document.getElementById("theme-toggle-btn");if(!e)return;const t=["","dark","sepia"];let s=0;e.addEventListener("click",()=>{s=(s+1)%t.length,t[s]?document.body.setAttribute("data-theme",t[s]):document.body.removeAttribute("data-theme")})}function Ee(){Le(),xe(),ke(),document.getElementById("login-form").addEventListener("submit",_e),document.getElementById("logout-btn").addEventListener("click",qe),Se()?(z(),O("dashboard")):U()}Ee();
