(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))o(e);new MutationObserver(e=>{for(const r of e)if(r.type==="childList")for(const i of r.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&o(i)}).observe(document,{childList:!0,subtree:!0});function a(e){const r={};return e.integrity&&(r.integrity=e.integrity),e.referrerPolicy&&(r.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?r.credentials="include":e.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(e){if(e.ep)return;e.ep=!0;const r=a(e);fetch(e.href,r)}})();function m(){const t=(window.__ADMIN_API_KEY__||"").trim();return t||(new URLSearchParams(window.location.search).get("api_key")||"").trim()}async function d(t,n={}){const a=m(),o=new Headers(n.headers||{});a&&o.set("x-api-key",a);let e=t;if(!a){const c=(new URLSearchParams(window.location.search).get("api_key")||"").trim();if(c){const l=t.includes("?")?"&":"?";e=`${t}${l}api_key=${encodeURIComponent(c)}`}}const r=await fetch(e,{...n,headers:o}),i=await r.json().catch(()=>({}));if(!r.ok){const s=(i==null?void 0:i.detail)||(i==null?void 0:i.error)||r.statusText||"request_failed";throw new Error(String(s))}return i}function f(){return{getOverview(){return d("/api/admin/overview")},getJobs(){return d("/api/admin/jobs?limit=20")},getGatewayLogs(){return d("/api/admin/gateway/logs?limit=20")},getAuditSummary(t=7){return d(`/api/admin/audit/summary?days=${encodeURIComponent(String(t))}`)}}}async function p(t){if(!t)return;const n=f(),a=async()=>{t.innerHTML=`
      <div role="status" aria-live="polite">
        <h2>Admin Dashboard</h2>
        <p>⌛ Loading snapshot...</p>
      </div>
    `;try{const[o,e,r,i]=await Promise.all([n.getOverview(),n.getJobs(),n.getGatewayLogs(),n.getAuditSummary(7)]),s={overview:o,jobs_count:Array.isArray(e==null?void 0:e.items)?e.items.length:0,gateway_logs_count:Array.isArray(r==null?void 0:r.items)?r.items.length:0,audit_summary:i,last_updated:new Date().toLocaleTimeString()};t.innerHTML=`
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2>Admin Dashboard</h2>
          <button id="ref-btn" aria-label="Refresh dashboard data" style="padding: 0.4rem 0.8rem; cursor: pointer;">Refresh</button>
        </div>
        <pre id="admin-dashboard-json" style="background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow: auto;">${JSON.stringify(s,null,2)}</pre>
      `,t.querySelector("#ref-btn").onclick=a}catch(o){t.innerHTML=`
        <h2>Admin Dashboard</h2>
        <div role="alert" style="border: 1px solid #ffcfcf; background: #fff5f5; padding: 1rem; border-radius: 4px;">
          <p style="color: #d32f2f; margin: 0 0 1rem 0;"><strong>❌ Error:</strong> ${o.message||o}</p>
          <button id="ret-btn" aria-label="Retry loading dashboard data" style="padding: 0.4rem 0.8rem; cursor: pointer;">Retry</button>
        </div>
      `,t.querySelector("#ret-btn").onclick=a}};await a()}const u=document.getElementById("app");async function y(){if(!u)return;u.innerHTML='<h1>Bili Pet Frontend</h1><div id="admin-dashboard"></div>';const t=document.getElementById("admin-dashboard");await p(t)}y();
