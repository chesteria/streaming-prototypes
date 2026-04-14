var R=Object.defineProperty,K=Object.defineProperties;var j=Object.getOwnPropertyDescriptors;var b=Object.getOwnPropertySymbols;var A=Object.prototype.hasOwnProperty,T=Object.prototype.propertyIsEnumerable;var S=(e,t,n)=>t in e?R(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,I=(e,t)=>{for(var n in t||(t={}))A.call(t,n)&&S(e,n,t[n]);if(b)for(var n of b(t))T.call(t,n)&&S(e,n,t[n]);return e},L=(e,t)=>K(e,j(t));var C=(e,t)=>{var n={};for(var s in e)A.call(e,s)&&t.indexOf(s)<0&&(n[s]=e[s]);if(e!=null&&b)for(var s of b(e))t.indexOf(s)<0&&T.call(e,s)&&(n[s]=e[s]);return n};(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const c of o)if(c.type==="childList")for(const i of c.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function n(o){const c={};return o.integrity&&(c.integrity=o.integrity),o.referrerPolicy&&(c.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?c.credentials="include":o.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function s(o){if(o.ep)return;o.ep=!0;const c=n(o);fetch(o.href,c)}})();const E="uta_v2_location_state";let y=null;const z=new Set,U=()=>{try{const e=localStorage.getItem(E);if(!e)return;const t=JSON.parse(e);t.city&&(y=t.city)}catch(e){console.error("[LocationService] Failed to load from storage",e)}},F=()=>{z.forEach(e=>e(y))},q=()=>{const e={city:y,lastUpdated:new Date().toISOString()};localStorage.setItem(E,JSON.stringify(e))},W=()=>y,Y=e=>{y=e,q(),F()},Z=()=>{y=null,localStorage.removeItem(E),F()};U();const G={UP:["ArrowUp","Up"],DOWN:["ArrowDown","Down"],LEFT:["ArrowLeft","Left"],RIGHT:["ArrowRight","Right"],OK:["Enter","Return"," "],BACK:["Backspace","Escape","XF86Back"],PLAYPAUSE:["MediaPlayPause","XF86PlayPause","MediaPlay","MediaPause"]},X=e=>{const t=e.key;for(const[n,s]of Object.entries(G))if(s.includes(t))return n;return null};let x=null;const J=e=>{x=e},Q=()=>{x=null},V=e=>{const t=X(e);if(!t)return;const n=e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement;["UP","DOWN","LEFT","RIGHT"].includes(t)&&(n&&["LEFT","RIGHT"].includes(t)||e.preventDefault()),x&&x(t,e)},ee=()=>{document.addEventListener("keydown",V)},te=(e,t={})=>{let n=t.startIndex||0;const{onFocus:s,onBlur:o,onSelect:c,wrapAround:i=!1}=t;function r(l){if(l<0||l>=e.length)return!1;const f=n;return n=l,o&&f!==l&&o(f,e[f]),s&&s(l,e[l]),!0}function u(){o&&o(n,e[n])}function M(l){const f=l==="RIGHT"?n+1:n-1;return f<0?i?r(e.length-1):!1:f>=e.length?i?r(0):!1:r(f)}function P(){c&&c(n,e[n])}function D(){return n}function $(){return e[n]}function B(){return e}function H(l){e.length=0,l.forEach(f=>e.push(f)),n>=e.length&&(n=Math.max(0,e.length-1))}return{focus:r,blur:u,move:M,select:P,getIndex:D,getItem:$,getItems:B,setItems:H}};let v=new Map,a=null,g=null;const ne=e=>{const t=document.querySelector(`[data-focus-zone="${e}"]`);return t?Array.from(t.querySelectorAll('[data-focusable="true"]')):[]},w=(e,t={})=>{const n=ne(e),s=te(n,{onFocus:(c,i)=>{var r;i.setAttribute("data-focused","true"),(r=t.onFocus)==null||r.call(t,c,i)},onBlur:(c,i)=>{var r;i.removeAttribute("data-focused"),(r=t.onBlur)==null||r.call(t,c,i)},onSelect:t.onSelect,wrapAround:t.wrapAround}),o={name:e,engineZone:s,options:t};return v.set(e,o),o},_=(e,t=0)=>{const n=v.get(e);return n?(a==null||a.engineZone.blur(),a=n,n.engineZone.focus(t),!0):!1},N=e=>{for(const t of v.values()){const s=t.engineZone.getItems().findIndex(o=>o.getAttribute("data-focus-id")===e);if(s!==-1)return a==null||a.engineZone.blur(),a=t,t.engineZone.focus(s),!0}return!1},oe=()=>{var e;return(e=a==null?void 0:a.engineZone.getIndex())!=null?e:-1},ce=(e,t)=>{var n,s,o,c;if(!a){g==null||g(e,t);return}e==="OK"?a.engineZone.select():e==="LEFT"||e==="RIGHT"?t.target instanceof HTMLInputElement||t.target instanceof HTMLTextAreaElement||a.engineZone.move(e)||(s=(n=a.options).onEdge)==null||s.call(n,e):(c=(o=a.options).onEdge)==null||c.call(o,e),g==null||g(e,t)},re=()=>{ee(),J(ce)},se=()=>{Q(),v.clear(),a=null,g=null},ie=(e,t)=>{switch(e.kind){case"detecting":if(t.type==="detection_complete")return{kind:"confirming",detectedCity:t.city};break;case"confirming":if(t.type==="confirm_detected")return{kind:"complete",selectedCity:e.detectedCity};if(t.type==="reject_detected")return{kind:"picking",query:"",selectedIndex:0};break;case"picking":if(t.type==="query_changed")return L(I({},e),{query:t.query,selectedIndex:0});if(t.type==="picker_selection_changed")return L(I({},e),{selectedIndex:t.index});if(t.type==="city_selected")return{kind:"complete",selectedCity:t.city};break;case"complete":if(t.type==="change_location_requested")return{kind:"picking",query:"",selectedIndex:0};break}return e},ae=2e3,k=[{id:"ny-nyc",displayName:"New York City",region:"Northeast",state:"NY",coordinates:{lat:40.7128,lng:-74.006}},{id:"ca-la",displayName:"Los Angeles",region:"West",state:"CA",coordinates:{lat:34.0522,lng:-118.2437}},{id:"tx-aus",displayName:"Austin",region:"South",state:"TX",coordinates:{lat:30.2672,lng:-97.7431}},{id:"il-chi",displayName:"Chicago",region:"Midwest",state:"IL",coordinates:{lat:41.8781,lng:-87.6298}},{id:"wa-sea",displayName:"Seattle",region:"West",state:"WA",coordinates:{lat:47.6062,lng:-122.3321}}],h=e=>{const t=new Date().toISOString(),o=e,{type:n}=o,s=C(o,["type"]);console.log(`%c[v2-analytics] %c${t} %c${n}`,"color: #ff5500; font-weight: bold;","color: #8899AA;","color: #FFFFFF; font-weight: bold;",s)},le=(e,t)=>{h({type:"v2_location_detection_started"}),e.innerHTML=`
    <div class="flex flex-col items-center justify-center h-full space-y-8 animate-in fade-in duration-700">
      <div class="w-16 h-16 border-4 border-v2-accent border-t-transparent rounded-full animate-spin"></div>
      <div class="text-center space-y-2">
        <h1 class="text-3xl font-bold">Detecting your location...</h1>
        <p class="text-v2-text-secondary">This helps us show you the right local content.</p>
      </div>
    </div>
  `,setTimeout(()=>{const n=k[Math.floor(Math.random()*k.length)];h({type:"v2_location_detection_completed",city:n}),t(n)},ae)},de=(e,t,n,s)=>{e.innerHTML=`
    <div class="flex flex-col items-center justify-center h-full bg-v2-bg animate-in zoom-in duration-300">
      <div class="bg-v2-card-bg p-12 rounded-tile border border-v2-surface max-w-2xl text-center space-y-8 shadow-v2-card">
        <div class="space-y-4">
          <h2 class="text-v2-text-secondary uppercase tracking-widest text-sm font-bold">Location Detection</h2>
          <h1 class="text-5xl font-bold">Is this you?</h1>
          <p class="text-3xl text-v2-accent">${t.displayName}, ${t.state}</p>
        </div>

        <div class="flex space-x-4 justify-center" data-focus-zone="confirmation-buttons">
          <button 
            class="v2-button" 
            data-focusable="true" 
            data-focus-id="confirm-yes"
          >
            Yes, that's right
          </button>
          <button 
            class="v2-button" 
            data-focusable="true" 
            data-focus-id="confirm-no"
          >
            Pick a different location
          </button>
        </div>
      </div>
    </div>
  `,w("confirmation-buttons",{onSelect:(o,c)=>{const i=c.getAttribute("data-focus-id");i==="confirm-yes"&&n(),i==="confirm-no"&&s()}}),_("confirmation-buttons")},ue=(e,t,n,s,o)=>{const c=k.filter(r=>r.displayName.toLowerCase().includes(t.toLowerCase())||r.state.toLowerCase().includes(t.toLowerCase()));e.innerHTML=`
    <div class="flex flex-col h-full bg-v2-bg p-content-x space-y-8 animate-in slide-in-from-bottom duration-300">
      <header class="space-y-4">
        <h1 class="text-4xl font-bold">Select your location</h1>
        <div class="relative" data-focus-zone="picker-input">
           <input 
            id="picker-search"
            type="text" 
            placeholder="Search for a city..."
            value="${t}"
            class="w-full bg-v2-card-bg border-2 border-v2-surface rounded-tile px-6 py-4 text-xl focus:outline-none focus:border-v2-accent"
            data-focusable="true"
            data-focus-id="search-field"
          />
        </div>
      </header>

      <div class="flex-1 overflow-hidden">
        <div 
          id="picker-grid" 
          class="grid grid-cols-3 gap-rail-gap pb-12 overflow-y-auto h-full pr-4"
          data-focus-zone="picker-grid"
        >
          ${c.map(r=>`
            <button 
              class="v2-card bg-v2-card-bg p-6 rounded-tile border-2 border-transparent text-left space-y-1 transition-all"
              data-focusable="true"
              data-focus-id="city-${r.id}"
            >
              <div class="text-xl font-bold">${r.displayName}</div>
              <div class="text-sm text-v2-text-secondary">${r.state}</div>
            </button>
          `).join("")}
          ${c.length===0?'<div class="col-span-3 text-center py-12 text-v2-text-tertiary">No cities found matching "'+t+'"</div>':""}
        </div>
      </div>
    </div>
  `;const i=document.getElementById("picker-search");i.addEventListener("input",r=>{n(r.target.value)}),w("picker-input",{onEdge:r=>{r==="DOWN"&&c.length>0&&_("picker-grid"),r==="BACK"&&o()},onSelect:()=>{if(c.length===1){const r=c[0];h({type:"v2_location_manually_selected",city:r,query:t}),s(r)}}}),w("picker-grid",{onEdge:r=>{const u=oe();r==="UP"&&u<3?_("picker-input"):r==="UP"?N(`city-${c[u-3].id}`):r==="DOWN"&&u+3<c.length?N(`city-${c[u+3].id}`):r==="BACK"&&o()},onSelect:r=>{const u=c[r];h({type:"v2_location_manually_selected",city:u,query:t}),s(u)}}),i.addEventListener("focus",()=>{i.setSelectionRange(i.value.length,i.value.length)})},m=document.getElementById("app");let d={kind:"detecting"};const p=e=>{const t=ie(d,e);t!==d&&(d=t,O())},O=()=>{var e,t;if(m)switch(se(),re(),d.kind){case"detecting":le(m,n=>{p({type:"detection_complete",city:n})});break;case"confirming":de(m,d.detectedCity,()=>p({type:"confirm_detected"}),()=>p({type:"reject_detected"}));break;case"picking":ue(m,d.query,n=>p({type:"query_changed",query:n}),n=>p({type:"city_selected",city:n}),()=>p({type:"reject_detected"}));break;case"complete":Y(d.selectedCity),m.innerHTML=`
        <div class="flex flex-col items-center justify-center h-full space-y-4 animate-in fade-in">
          <h1 class="text-5xl font-bold">Welcome!</h1>
          <p class="text-2xl text-v2-text-secondary">Your location: <span class="text-v2-accent">${d.selectedCity.displayName}</span></p>
          <div class="flex space-x-4">
            <button id="change-location" class="v2-button mt-8 border border-v2-surface">Change Location</button>
            <button id="reset-flow" class="v2-button mt-8 opacity-50 text-sm">Debug: Full Reset</button>
          </div>
        </div>
      `,(e=document.getElementById("change-location"))==null||e.addEventListener("click",()=>{h({type:"v2_location_changed",city:d.selectedCity}),p({type:"change_location_requested"})}),(t=document.getElementById("reset-flow"))==null||t.addEventListener("click",()=>{Z(),window.location.reload()});break}},fe=()=>{const e=W();e&&(d={kind:"complete",selectedCity:e}),O()};fe();
