(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))a(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const i of t.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&a(i)}).observe(document,{childList:!0,subtree:!0});function o(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function a(e){if(e.ep)return;e.ep=!0;const t=o(e);fetch(e.href,t)}})();function m(){const r=(window.__ADMIN_API_KEY__||"").trim();return r||(new URLSearchParams(window.location.search).get("api_key")||"").trim()}async function d(r,n={}){const o=m(),a=new Headers(n.headers||{});o&&a.set("x-api-key",o);let e=r;if(!o){const c=(new URLSearchParams(window.location.search).get("api_key")||"").trim();if(c){const l=r.includes("?")?"&":"?";e=`${r}${l}api_key=${encodeURIComponent(c)}`}}const t=await fetch(e,{...n,headers:a}),i=await t.json().catch(()=>({}));if(!t.ok){const s=(i==null?void 0:i.detail)||(i==null?void 0:i.error)||t.statusText||"request_failed";throw new Error(String(s))}return i}function f(){return{getOverview(){return d("/api/admin/overview")},getJobs(){return d("/api/admin/jobs?limit=20")},getGatewayLogs(){return d("/api/admin/gateway/logs?limit=20")},getAuditSummary(r=7){return d(`/api/admin/audit/summary?days=${encodeURIComponent(String(r))}`)}}}async function p(r){if(!r)return;const n=f(),o=async()=>{r.innerHTML=`
      <div role="status" aria-live="polite">
        <h2>Admin Dashboard</h2>
        <p>⌛ Loading snapshot...</p>
      </div>
    `;try{const[a,e,t,i]=await Promise.all([n.getOverview(),n.getJobs(),n.getGatewayLogs(),n.getAuditSummary(7)]),s={overview:a,jobs_count:Array.isArray(e==null?void 0:e.items)?e.items.length:0,gateway_logs_count:Array.isArray(t==null?void 0:t.items)?t.items.length:0,audit_summary:i,last_updated:new Date().toLocaleTimeString()};r.innerHTML=`
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2>Admin Dashboard</h2>
          <button id="ref-btn" aria-label="Refresh dashboard data">Refresh</button>
        </div>
        <pre id="admin-dashboard-json" style="background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow: auto;">${JSON.stringify(s,null,2)}</pre>
      `,r.querySelector("#ref-btn").onclick=o}catch(a){r.innerHTML=`
        <h2>Admin Dashboard</h2>
        <div role="alert" style="border: 1px solid #ffcfcf; background: #fff5f5; padding: 1rem; border-radius: 4px;">
          <p style="color: #d32f2f; margin: 0 0 1rem 0;"><strong>❌ Error:</strong> ${a.message||a}</p>
          <button id="ret-btn" aria-label="Retry loading dashboard data">Retry</button>
        </div>
      `,r.querySelector("#ret-btn").onclick=o}};await o()}const u=document.getElementById("app");async function y(){if(!u)return;u.innerHTML='<h1>Bili Pet Frontend</h1><div id="admin-dashboard"></div>';const r=document.getElementById("admin-dashboard");await p(r)}y();
