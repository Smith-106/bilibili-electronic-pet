(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))n(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const a of t.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function o(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function n(e){if(e.ep)return;e.ep=!0;const t=o(e);fetch(e.href,t)}})();function f(){return(window.__ADMIN_API_KEY__||"").trim()}async function s(r,i={}){const o=f(),n=new Headers(i.headers||{});o&&n.set("x-api-key",o);const e=await fetch(r,{...i,headers:n}),t=await e.json().catch(()=>({}));if(!e.ok){const a=(t==null?void 0:t.detail)||(t==null?void 0:t.error)||e.statusText||"request_failed";throw new Error(String(a))}return t}function m(){return{getOverview(){return s("/api/admin/overview")},getJobs(){return s("/api/admin/jobs?limit=20")},getGatewayLogs(){return s("/api/admin/gateway/logs?limit=20")},getAuditSummary(r=7){return s(`/api/admin/audit/summary?days=${encodeURIComponent(String(r))}`)}}}async function p(r){if(!r)return;const i=m(),o=async()=>{r.innerHTML=`
      <div role="status" aria-live="polite">
        <h2>Admin Dashboard</h2>
        <p>⌛ Loading snapshot...</p>
      </div>
    `;try{const[n,e,t,a]=await Promise.all([i.getOverview(),i.getJobs(),i.getGatewayLogs(),i.getAuditSummary(7)]),l={overview:n,jobs_count:Array.isArray(e==null?void 0:e.items)?e.items.length:0,gateway_logs_count:Array.isArray(t==null?void 0:t.items)?t.items.length:0,audit_summary:a,last_updated:new Date().toLocaleTimeString()};r.innerHTML=`
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2>Admin Dashboard</h2>
          <button id="ref-btn" aria-label="Refresh dashboard data" style="padding: 0.4rem 0.8rem; cursor: pointer;">Refresh</button>
        </div>
        <pre id="admin-dashboard-json" style="background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow: auto;"></pre>
      `;const d=r.querySelector("#admin-dashboard-json");d&&(d.textContent=JSON.stringify(l,null,2));const c=r.querySelector("#ref-btn");c&&(c.onclick=o)}catch(n){r.innerHTML=`
        <h2>Admin Dashboard</h2>
        <div role="alert" style="border: 1px solid #ffcfcf; background: #fff5f5; padding: 1rem; border-radius: 4px;">
          <p style="color: #d32f2f; margin: 0 0 1rem 0;"><strong>❌ Error:</strong> <span id="admin-dashboard-error"></span></p>
          <button id="ret-btn" aria-label="Retry loading dashboard data" style="padding: 0.4rem 0.8rem; cursor: pointer;">Retry</button>
        </div>
      `;const e=r.querySelector("#admin-dashboard-error");e&&(e.textContent=String((n==null?void 0:n.message)||n||"request_failed"));const t=r.querySelector("#ret-btn");t&&(t.onclick=o)}};await o()}const u=document.getElementById("app");async function y(){if(!u)return;u.innerHTML='<h1>Bili Pet Frontend</h1><div id="admin-dashboard"></div>';const r=document.getElementById("admin-dashboard");await p(r)}y();
