const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

async function api(url, options={}) {
  const res = await fetch(url, {headers: {"Content-Type":"application/json"}, ...options});
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function boot() {
  try {
    const me = await api("/api/me");
    showApp(me);
  } catch {
    $("#loginPage").classList.remove("hidden");
    $("#appPage").classList.add("hidden");
  }
}

function showApp(me) {
  $("#loginPage").classList.add("hidden");
  $("#appPage").classList.remove("hidden");
  $("#userName").textContent = me.name;
  $("#userRole").textContent = me.role;
  $("#avatar").textContent = me.name[0].toUpperCase();
  $("#dropdownName").textContent = me.name;
  $("#dropdownRole").textContent = me.role;
  $("#dropdownAvatar").textContent = me.name[0].toUpperCase();
  loadDashboard();
  loadRisks();
}

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("#loginError").textContent = "";
  try {
    const me = await api("/api/login", {
      method:"POST",
      body: JSON.stringify({email:$("#email").value, password:$("#password").value})
    });
    showApp(me);
  } catch(err) { $("#loginError").textContent = err.message; }
});

const profileTrigger = $("#profileTrigger");
const profileDropdown = $("#profileDropdown");

function toggleProfileMenu(force) {
  const shouldOpen = typeof force === "boolean" ? force : profileDropdown.classList.contains("hidden");
  profileDropdown.classList.toggle("hidden", !shouldOpen);
  profileTrigger.setAttribute("aria-expanded", String(shouldOpen));
}

profileTrigger.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleProfileMenu();
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".profile-menu-wrap")) toggleProfileMenu(false);
});

$("#myProfile").addEventListener("click", () => {
  toggleProfileMenu(false);
  if (typeof openProfileModal === "function") openProfileModal();
});

async function endSession() {
  await api("/api/logout", {method:"POST"});
  location.reload();
}

$("#switchAccount").addEventListener("click", endSession);
$("#logout").addEventListener("click", endSession);

$$(".sidebar nav a").forEach(a => a.addEventListener("click", () => showSection(a.dataset.section)));

function showSection(section) {
  $$(".sidebar nav a").forEach(a => a.classList.toggle("active", a.dataset.section === section));
  $$(".section").forEach(s => s.classList.add("hidden"));
  const direct = document.getElementById(section);
  if (direct) {
    direct.classList.remove("hidden");
    $("#pageTitle").textContent = section === "dashboard" ? "Executive Dashboard" : section.replaceAll("-", " ").replace(/\b\w/g, x=>x.toUpperCase());
    if (section === "risk") loadRisks();
    return;
  }
  $("#placeholder").classList.remove("hidden");
  $("#placeholderTitle").textContent = section.replaceAll("-", " ").replace(/\b\w/g, x=>x.toUpperCase());
  $("#pageTitle").textContent = $("#placeholderTitle").textContent;
}

async function loadDashboard() {
  try {
    const d = await api("/api/dashboard");
    $("#highRisks").textContent = d.highRisks;
    $("#totalRisks").textContent = d.totalRisks;
    $("#openRisks").textContent = d.openRisks;
    $("#complianceRate").textContent = d.complianceRate + "%";
  } catch {}
  await updateDashboardLive();
}

async function loadRisks() {
  const risks = await api("/api/risks");
  $("#riskRows").innerHTML = risks.length ? risks.map(r => {
    const score = r.likelihood * r.impact;
    const label = score >= 15 ? "High" : score >= 6 ? "Medium" : "Low";
    return `<tr data-risk-id="${r.id}"><td><strong>${escapeHtml(r.risk_id)}</strong></td><td>${escapeHtml(r.title)}</td><td>${escapeHtml(r.category||"-")}</td><td>${escapeHtml(r.owner||"-")}</td><td><strong>${score}</strong> · ${label}</td><td><span class="status ${label==='High'?'status-danger':label==='Medium'?'status-warn':'status-open'}">${escapeHtml(r.status)}</span></td><td class="row-actions"><button class="action-btn edit" onclick="editRisk(${r.id})">✎ Edit</button><button class="action-btn delete" onclick="deleteRisk(${r.id})">⌫ Delete</button></td></tr>`;
  }).join("") : `<tr><td colspan="7"><div class="empty-state">Belum ada data risiko. Klik “New Risk” untuk menambahkan.</div></td></tr>`;
  enhanceTableActions();
}

function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

$("#openRisk").addEventListener("click", () => { const f=$("#riskForm"); delete f.dataset.editId; f.reset(); document.querySelector("#riskModal h2").textContent="New Risk"; document.querySelector("#riskModal button[type=submit]").textContent="Save Risk"; $("#riskModal").classList.remove("hidden"); });
$("#closeRisk").addEventListener("click", () => $("#riskModal").classList.add("hidden"));

$("#riskForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("#riskError").textContent = "";
  const fd = new FormData(e.target);
  try {
    const payload=Object.fromEntries(fd.entries());
    const editId=e.target.dataset.editId;
    await api(editId ? `/api/risks/${editId}` : "/api/risks", {method:editId?"PUT":"POST", body:JSON.stringify(payload)});
    e.target.reset();
    delete e.target.dataset.editId;
    $("#riskModal").classList.add("hidden");
    await loadRisks(); await loadDashboard();
    toast(editId ? "✓ Risk berhasil direvisi." : "✓ Risk berhasil ditambahkan.");
  } catch(err) { $("#riskError").textContent = err.message; }
});

/* LEGARIC v1.1 — all module actions are interactive */
const moduleConfig = {
  "New Legal Record": {title:"New Legal Record", fields:[["Matter / Subject","text"],["Type","select","Contract,License,Legal Request,Litigation"],["Owner","text"],["Due Date","date"],["Status","select","Active,Monitoring,In Review,Closed"]]},
  "New Governance Item": {title:"New Governance Item", fields:[["Item Name","text"],["Category","select","Policy,Approval,Governance Monitoring,Authority Matrix"],["Owner","text"],["Review Date","date"],["Status","select","Active,Review,Closed"]]},
  "New Compliance Obligation": {title:"New Compliance Obligation", fields:[["Obligation","text"],["Regulator","text"],["Owner","text"],["Due Date","date"],["Status","select","Compliant,In Review,Overdue"]]},
  "New Internal Control": {title:"New Internal Control", fields:[["Control Name","text"],["Process","text"],["Owner","text"],["Frequency","select","Continuous,Monthly,Quarterly,Per Event"],["Status","select","Effective,Testing,Gap"]]},
  "New Audit Finding": {title:"New Audit Finding", fields:[["Finding","text"],["Area","text"],["Severity","select","High,Medium,Low"],["Owner","text"],["Status","select","Open,Action Plan,Closed"]]},
  "New Action Plan": {title:"New Action Plan", fields:[["Action","text"],["Source","select","Audit,Risk,Compliance,Internal Control,Legal,Governance"],["Owner","text"],["Due Date","date"],["Status","select","Open,In Progress,On Track,Completed,Overdue"]]},
  "Upload Document": {title:"Upload Document", fields:[["Document Name","text"],["Category","select","Policy,Procedure,Contract,Evidence,Report,Other"],["Owner","text"],["Review Date","date"],["Status","select","Current,Review,Archived"],["File","file"]]},
  "Change Password": {title:"Change Password", fields:[["Current Password","password"],["New Password","password"],["Confirm New Password","password"]]},
  "New User": {title:"New User", fields:[["Full Name","text"],["Email","email"],["Role","select","Administrator,Legal Officer,Governance Officer,Risk Officer,Compliance Officer,Internal Control Officer,Auditor"],["Status","select","Active,Inactive"]]}
};

function ensureModuleModal(){
  if(document.getElementById("moduleModal")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <div id="moduleModal" class="module-modal hidden" aria-hidden="true">
      <div class="module-modal-backdrop" onclick="closeModuleModal()"></div>
      <div class="module-modal-card" role="dialog" aria-modal="true">
        <button class="module-close" type="button" onclick="closeModuleModal()">×</button>
        <div class="eyebrow">LEGARIC WORKFLOW</div>
        <h2 id="moduleModalTitle">New Record</h2>
        <p id="moduleModalDesc">Complete the information below.</p>
        <form id="moduleForm"></form>
        <div id="moduleModalError" class="error"></div>
        <div class="module-modal-actions">
          <button type="button" class="secondary" onclick="closeModuleModal()">Cancel</button>
          <button type="button" id="moduleSaveButton" class="primary" onclick="saveModuleRecord()">Save Record</button>
        </div>
      </div>
    </div>`);
}

function showLegalForm(){ moduleNotice("New Legal Record"); }
function showGovernanceForm(){ moduleNotice("New Governance Item"); }

function moduleNotice(name,isEdit=false){
  ensureModuleModal();
  const cfg=moduleConfig[name] || {title:name,fields:[["Description","text"],["Owner","text"],["Status","select","Open,In Progress,Completed"]]};
  $("#moduleModalTitle").textContent=isEdit ? `Edit ${cfg.title.replace(/^New /,"")}` : cfg.title;
  $("#moduleModalDesc").textContent=isEdit ? "Perbarui data lalu simpan perubahan." : "Data dapat ditambahkan dan langsung ditampilkan pada workspace LEGARIC.";
  $("#moduleModalError").textContent="";
  const form=$("#moduleForm");
  form.innerHTML=cfg.fields.map((f,i)=>{
    const [label,type,opts]=f;
    const id="mf_"+i;
    if(type==="select") return `<label class="module-label" for="${id}">${label}</label><select id="${id}" class="module-input" data-label="${label}" required><option value="">Pilih ${label}</option>${opts.split(",").map(o=>`<option>${o}</option>`).join("")}</select>`;
    return `<label class="module-label" for="${id}">${label}</label><input id="${id}" class="module-input" data-label="${label}" type="${type}" ${type==="file"?"accept=\".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg\"":""} required>`;
  }).join("");
  $("#moduleModal").classList.remove("hidden");
  $("#moduleModal").setAttribute("aria-hidden","false");
  $("#moduleForm").dataset.editMode=isEdit ? "1" : "0";
  $("#moduleSaveButton").textContent=isEdit ? "Save Changes" : "Save Record";
}
function closeModuleModal(){
  const m=$("#moduleModal"); if(!m) return;
  m.classList.add("hidden"); m.setAttribute("aria-hidden","true");
  editingTableRow=null; editingSection=null;
}
function saveModuleRecord(){
  if(editingTableRow){
    const ok=saveEditedTableRow(); if(ok){closeModuleModal();} return;
  }
  const inputs=[...document.querySelectorAll("#moduleForm .module-input")];
  const missing=inputs.find(x=>x.required && !x.value);
  if(missing){$("#moduleModalError").textContent="Mohon lengkapi semua field."; missing.focus(); return;}
  const name=$("#moduleModalTitle").textContent;
  const record={id:"LOCAL-"+Date.now().toString().slice(-6),module:name,createdAt:new Date().toLocaleString("id-ID")};
  inputs.forEach(x=>{record[x.dataset.label]=x.type==="file"?(x.files[0]?.name||"") : x.value;});
  const key="legaric_"+name.replace(/\W+/g,"_");
  const arr=JSON.parse(localStorage.getItem(key)||"[]"); arr.unshift(record); localStorage.setItem(key,JSON.stringify(arr));
  closeModuleModal();
  toast("✓ "+name+" berhasil disimpan.");
  refreshLocalRecords();
  refreshLocalRegisterRows();
  updateAllKpis();
}
function toast(message){
  let t=document.getElementById("legaricToast");
  if(!t){document.body.insertAdjacentHTML("beforeend",'<div id="legaricToast"></div>');t=document.getElementById("legaricToast");}
  t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600);
}

/* Search + status filters for every register table */
function addTableTools(){
  const sections=["legal","risk","compliance","control","audit","action","documents","admin"];
  sections.forEach(sec=>{
    const section=document.getElementById(sec); if(!section || section.querySelector(".table-tools")) return;
    const table=section.querySelector("table"); if(!table) return;
    const head=section.querySelector(".table-panel .panel-head"); if(!head) return;
    const tools=document.createElement("div"); tools.className="table-tools";
    tools.innerHTML='<input class="table-search" placeholder="Search..."><select class="table-status"><option value="">All Status</option><option>Active</option><option>Open</option><option>In Review</option><option>Completed</option><option>Closed</option><option>Current</option><option>Effective</option><option>Testing</option><option>Overdue</option></select>';
    head.appendChild(tools);
    const apply=()=>{
      const q=tools.querySelector("input").value.toLowerCase();
      const st=tools.querySelector("select").value.toLowerCase();
      table.querySelectorAll("tbody tr").forEach(row=>{
        const text=row.innerText.toLowerCase();
        const status=(row.lastElementChild?.innerText||"").toLowerCase();
        row.style.display=(!q||text.includes(q))&&(!st||status.includes(st))?"":"none";
      });
    };
    tools.querySelector("input").addEventListener("input",apply);
    tools.querySelector("select").addEventListener("change",apply);
  });
}
function refreshLocalRecords(){
  addTableTools();
  // Show locally created records as a small activity feed without replacing server data.
  const panel=document.getElementById("dashboard");
  if(panel && !panel.querySelector(".local-activity")) {
    const div=document.createElement("div");div.className="panel local-activity";
    div.innerHTML='<div class="panel-head"><h3>Recent LEGARIC Activity</h3><span>Local workspace</span></div><div id="activityList" class="activity-list"></div>';
    panel.appendChild(div);
  }
  const all=[];
  Object.keys(localStorage).filter(k=>k.startsWith("legaric_")).forEach(k=>{
    try{all.push(...JSON.parse(localStorage.getItem(k)||"[]"));}catch{}
  });
  all.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const list=document.getElementById("activityList");
  if(list) list.innerHTML=all.slice(0,8).map(r=>`<div class="activity-row"><span class="activity-dot"></span><div><strong>${escapeHtml(r.module)}</strong><small>${escapeHtml(r.createdAt)}</small></div><span>${escapeHtml(r.id)}</span></div>`).join("") || '<div class="empty-state">Belum ada aktivitas baru.</div>';
}


/* v1.3 — CRUD actions on every register */
const tableModuleMap={
  legal:"New Legal Record", governance:"New Governance Item", compliance:"New Compliance Obligation",
  control:"New Internal Control", audit:"New Audit Finding", action:"New Action Plan", documents:"Upload Document", admin:"New User"
};
const sectionCellLabels={
  legal:["ID","Matter / Subject","Type","Owner","Due Date","Status"],
  compliance:["ID","Obligation","Regulator","Owner","Due Date","Status"],
  control:["ID","Control Name","Process","Owner","Frequency","Status"],
  audit:["ID","Finding","Area","Severity","Owner","Status"],
  action:["ID","Action","Source","Owner","Due Date","Status"],
  documents:["ID","Document Name","Category","Owner","Review Date","Status"],
  admin:["Name","Email","Role","Status"]
};
let editingTableRow=null, editingSection=null;

function actionButtons(){
  return `<div class="row-actions"><button type="button" class="action-btn edit" onclick="editTableRow(this.closest('tr'))">✎ Edit</button><button type="button" class="action-btn delete" onclick="deleteTableRow(this.closest('tr'))">⌫ Delete</button></div>`;
}
function enhanceTableActions(){
  Object.keys(tableModuleMap).forEach(sectionId=>{
    const section=document.getElementById(sectionId); if(!section) return;
    const table=section.querySelector('.table-panel table'); if(!table) return;
    const head=table.tHead?.rows[0];
    if(head && !head.querySelector('.actions-head')){
      const th=document.createElement('th'); th.className='actions-head'; th.textContent='Actions'; head.appendChild(th);
    }
    table.querySelectorAll('tbody tr').forEach(row=>{
      if(row.querySelector('.row-actions')) return;
      if(row.cells.length===1) return;
      const td=document.createElement('td'); td.className='row-actions-cell'; td.innerHTML=actionButtons(); row.appendChild(td);
    });
    applyRowState(sectionId,table);
  });
}
function rowKey(section,row){ return `${section}::${row.cells[0]?.innerText.trim()||Math.random()}`; }
function getRowId(row){ return row.cells[0]?.innerText.trim()||''; }
function applyRowState(section,table){
  const deleted=JSON.parse(localStorage.getItem('legaric_deleted_rows')||'[]');
  const edits=JSON.parse(localStorage.getItem('legaric_row_edits')||'{}');
  table.querySelectorAll('tbody tr').forEach(row=>{
    const key=rowKey(section,row);
    if(deleted.includes(key)){row.remove();return;}
    const vals=edits[key];
    if(vals){ vals.forEach((v,i)=>{ if(row.cells[i] && i>0){ row.cells[i].innerHTML=v; } }); }
  });
}
function editTableRow(row){
  editingTableRow=row; editingSection=row.closest('section')?.id;
  const name=tableModuleMap[editingSection];
  const cfg=moduleConfig[name];
  if(!cfg){toast('Form edit belum tersedia.');return;}
  ensureModuleModal();
  moduleNotice(name,true);
  const cells=[...row.cells].slice(1,-1).map(c=>c.innerText.trim());
  document.querySelectorAll('#moduleForm .module-input').forEach((input,i)=>{
    const value=cells[i]||'';
    if(input.type==='file') return;
    if(input.type==='date') input.value=toInputDate(value);
    else input.value=value;
  });
}
function toInputDate(v){
  if(!v)return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;
  const d=new Date(v); if(!isNaN(d)) return d.toISOString().slice(0,10);
  const m=v.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/); if(!m)return '';
  const months={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  return `${m[3]}-${months[m[2]]||'01'}-${String(m[1]).padStart(2,'0')}`;
}
function deleteTableRow(row){
  const section=row.closest('section')?.id||'';
  const id=getRowId(row);
  if(!confirm(`Hapus data ${id}?\nData yang dihapus tidak akan ditampilkan lagi.`))return;
  const deleted=JSON.parse(localStorage.getItem('legaric_deleted_rows')||'[]');
  const key=rowKey(section,row); if(!deleted.includes(key))deleted.push(key); localStorage.setItem('legaric_deleted_rows',JSON.stringify(deleted));
  row.remove(); toast(`✓ ${id} berhasil dihapus.`);
}
function saveEditedTableRow(){
  if(!editingTableRow||!editingSection)return false;
  const inputs=[...document.querySelectorAll('#moduleForm .module-input')];
  const vals=inputs.map(x=>x.type==='file'?'':x.value);
  const cells=[...editingTableRow.cells].slice(1,-1);
  vals.forEach((v,i)=>{
    if(!cells[i])return;
    const label=inputs[i]?.dataset.label||'';
    cells[i].innerHTML=label==='Status' ? `<span class="status status-open">${escapeHtml(v)}</span>` : escapeHtml(v||'-');
  });
  const edits=JSON.parse(localStorage.getItem('legaric_row_edits')||'{}');
  edits[rowKey(editingSection,editingTableRow)]=vals.map((v,i)=>{
    const label=inputs[i]?.dataset.label||''; return label==='Status'?`<span class="status status-open">${escapeHtml(v)}</span>`:escapeHtml(v||'-');
  });
  localStorage.setItem('legaric_row_edits',JSON.stringify(edits));
  // Persist edits for locally-created records so KPI counts remain accurate after refresh.
  if(editingTableRow?.dataset?.localRecordId && editingTableRow?.dataset?.localStorageKey){
    const lk=editingTableRow.dataset.localStorageKey, lid=editingTableRow.dataset.localRecordId;
    const records=JSON.parse(localStorage.getItem(lk)||'[]');
    const rec=records.find(x=>x.id===lid);
    if(rec){ inputs.forEach((input,i)=>{ if(input.type!=='file') rec[input.dataset.label]=input.value; }); localStorage.setItem(lk,JSON.stringify(records)); }
  }
  toast(`✓ Data ${getRowId(editingTableRow)} berhasil direvisi.`);
  editingTableRow=null; editingSection=null; return true;
}

async function editRisk(id){
  try{
    const risks=await api('/api/risks'); const r=risks.find(x=>x.id===id); if(!r)return;
    const f=document.getElementById('riskForm'); f.dataset.editId=id;
    f.querySelector('[name=title]').value=r.title; f.querySelector('[name=category]').value=r.category||'Operational'; f.querySelector('[name=owner]').value=r.owner||'';
    f.querySelector('[name=likelihood]').value=r.likelihood; f.querySelector('[name=impact]').value=r.impact; f.querySelector('[name=treatment]').value=r.treatment||'';
    document.querySelector('#riskModal h2').textContent='Edit Risk'; document.querySelector('#riskModal .eyebrow').textContent='RISK MANAGEMENT';
    document.querySelector('#riskModal button[type=submit]').textContent='Save Changes';
    document.getElementById('riskModal').classList.remove('hidden');
  }catch(err){toast(err.message)}
}
async function deleteRisk(id){
  if(!confirm('Hapus risk ini? Data akan dihapus dari Risk Register.'))return;
  try{await api(`/api/risks/${id}`,{method:'DELETE'});await loadRisks();await loadDashboard();toast('✓ Risk berhasil dihapus.');}catch(err){toast(err.message)}
}

/* Report buttons generate a printable report view instead of a placeholder alert. */
function generateReport(title){
  const d={title,generated:new Date().toLocaleString("id-ID"),totalRisks:$("#totalRisks")?.textContent||"0",highRisks:$("#highRisks")?.textContent||"0",compliance:$("#complianceRate")?.textContent||"87%",openActions:$("#openRisks")?.textContent||"0"};
  const w=window.open("","_blank");
  if(!w){toast("Izinkan pop-up browser untuk membuka report.");return;}
  w.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial;padding:40px;color:#17324f}h1{margin-bottom:5px}.box{border:1px solid #ddd;padding:16px;margin:12px 0;border-radius:8px}button{padding:9px 14px}</style></head><body><h1>${title}</h1><p>Generated ${d.generated}</p><div class="box">Total Risks: <b>${d.totalRisks}</b><br>High Risks: <b>${d.highRisks}</b><br>Compliance: <b>${d.compliance}</b><br>Open Actions: <b>${d.openActions}</b></div><button onclick="window.print()">Print / Save as PDF</button></body></html>`);
  w.document.close();
}
function setupReportButtons(){
  document.querySelectorAll("#reports .primary").forEach(btn=>{
    const text=btn.textContent.trim();
    btn.onclick=()=>generateReport(text==="Generate" ? btn.closest(".review-item").querySelector("strong").textContent : "LEGARIC Report");
  });
}

document.addEventListener("keydown",e=>{if(e.key==="Escape") closeModuleModal();});
const originalShowApp=showApp;

window.addEventListener("load",()=>{ setTimeout(enhanceTableActions,100); });
showApp=function(me){ originalShowApp(me); setTimeout(()=>{addTableTools();setupReportButtons();refreshLocalRecords();},50); };

/* v1.4 — Clickable KPI cards and smart drill-down */
const kpiLabels = {
  "active-contracts":"Active Contracts",
  "legal-requests":"Legal Requests",
  "licenses-permits":"Licenses & Permits",
  "expiring-soon":"Expiring Soon",
  "policies":"Policies",
  "approvals":"Awaiting Approvals",
  "governance-items":"Governance Items",
  "obligations":"All Obligations",
  "compliant":"Compliant Items",
  "in-review":"Items In Review",
  "overdue":"Overdue Items",
  "controls":"All Controls",
  "effective":"Effective Controls",
  "testing":"Controls In Testing",
  "gaps":"Control Gaps",
  "audits":"Audit Findings",
  "open-findings":"Open Findings",
  "high-findings":"High Findings",
  "closed":"Closed Findings",
  "open-actions":"Open Actions",
  "due-soon":"Actions Due Soon",
  "completed":"Completed Actions",
  "total-documents":"All Documents",
  "expiring":"Documents For Review",
  "archived":"Archived Documents",
  "executive-report":"Executive Report",
  "risk-report":"Risk Reports",
  "compliance-report":"Compliance Reports",
  "audit-report":"Audit Reports",
  "high":"High Risks",
  "all":"All Records"
};

function ensureKpiFilterBanner(section){
  if(!section || section.querySelector(".kpi-filter-banner")) return;
  const panel=section.querySelector(".table-panel") || section.querySelector(".governance-list")?.closest(".panel") || section.querySelector(".grid2");
  if(!panel) return;
  const banner=document.createElement("div");
  banner.className="kpi-filter-banner hidden";
  banner.innerHTML=`<div><span class="kpi-filter-dot"></span><div><strong id="kpiFilterTitle">Filtered view</strong><small id="kpiFilterCount"></small></div></div><button type="button" onclick="clearKpiFilter()">Clear filter ×</button>`;
  panel.parentNode.insertBefore(banner,panel);
}

let activeKpi={section:null,key:null};

function clickKpiCard(card){
  const target=card.dataset.target;
  const key=card.dataset.kpi||"all";
  if(!target) return;
  showSection(target);
  activeKpi={section:target,key};
  const section=document.getElementById(target);
  ensureKpiFilterBanner(section);

  // Clear table search/status controls before applying the drill-down.
  section.querySelectorAll(".table-search").forEach(x=>x.value="");
  section.querySelectorAll(".table-status").forEach(x=>x.value="");

  syncAllRowTags();
  const rows=[...section.querySelectorAll("table tbody tr")].filter(r=>r.cells.length>1);
  let visibleRows=rows;
  if(rows.length){
    visibleRows=rows.filter(row=>kpiRowMatches(target,key,row));
    rows.forEach(row=>{
      const show=visibleRows.includes(row);
      row.style.display=show?"":"none";
      row.classList.toggle("kpi-highlight",show);
    });
  }else{
    const items=[...section.querySelectorAll("[data-kpi]")].filter(x=>x!==card);
    items.forEach(item=>{
      const show=item.dataset.kpi.split(/\s+/).includes(key) || key==="all";
      item.classList.toggle("kpi-highlight",show);
    });
    visibleRows=items.filter(x=>x.classList.contains("kpi-highlight"));
  }

  const label=kpiLabels[key]||key.replaceAll("-"," ");
  const banner=section.querySelector(".kpi-filter-banner");
  if(banner){
    banner.classList.remove("hidden");
    const title=banner.querySelector("#kpiFilterTitle");
    const count=banner.querySelector("#kpiFilterCount");
    if(title) title.textContent=label;
    if(count) count.textContent=`${visibleRows.length} item${visibleRows.length===1?"":"s"} ditampilkan`;
  }
  // Put the selected register in view.
  (section.querySelector(".kpi-filter-banner")||section.querySelector(".table-panel")||section).scrollIntoView({behavior:"smooth",block:"start"});
}

function kpiRowMatches(section,key,row){
  if(key==="all" || key==="total-documents" || key==="obligations" || key==="controls" || key==="audits") return true;
  const tags=(row.dataset.kpi||"").split(/\s+/).filter(Boolean);
  if(tags.includes(key)) return true;
  const text=row.innerText.toLowerCase();
  if(section==="risk" && ["high","medium","low"].includes(key)){
    const cells=[...row.cells].map(c=>c.innerText).join(" ");
    const scoreMatch=cells.match(/\b(\d+)\b/);
    if(!scoreMatch) return text.includes(key);
    const score=Number(scoreMatch[1]);
    return key==="high" ? score>=15 : key==="medium" ? score>=6 && score<15 : score<6;
  }
  if(section==="compliance" && key==="compliant") return text.includes("compliant");
  if(section==="control" && key==="effective") return text.includes("effective");
  return false;
}

function clearKpiFilter(){
  if(!activeKpi.section) return;
  const section=document.getElementById(activeKpi.section);
  if(!section) return;
  section.querySelectorAll("table tbody tr").forEach(row=>{row.style.display="";row.classList.remove("kpi-highlight")});
  section.querySelectorAll(".kpi-highlight").forEach(el=>el.classList.remove("kpi-highlight"));
  section.querySelectorAll(".table-search").forEach(x=>x.value="");
  section.querySelectorAll(".table-status").forEach(x=>x.value="");
  section.querySelectorAll(".kpi-filter-banner").forEach(x=>x.classList.add("hidden"));
  activeKpi={section:null,key:null};
}

function setupKpiCards(){
  document.querySelectorAll(".kpi-card").forEach(card=>{
    if(card.dataset.kpiBound) return;
    card.dataset.kpiBound="1";
    card.addEventListener("click",()=>clickKpiCard(card));
    card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();clickKpiCard(card)}});
  });
  document.querySelectorAll(".kpi-card").forEach(card=>{
    const label=card.querySelector("span")?.textContent?.trim();
    if(label && !card.getAttribute("aria-label")) card.setAttribute("aria-label",`Lihat ${label}`);
  });
}

window.addEventListener("load",()=>setTimeout(setupKpiCards,120));


/* LEGARIC v1.5 — LIVE REGISTER COUNTS
   KPI values are derived from the records currently displayed in each register.
   New/edit/delete operations update the same source immediately. */
const liveModuleMap = {
  legal:'New Legal Record', governance:'New Governance Item', compliance:'New Compliance Obligation',
  control:'New Internal Control', audit:'New Audit Finding', action:'New Action Plan', documents:'Upload Document', admin:'New User'
};
const liveSectionFields = {
  legal:['ID','Matter / Subject','Type','Owner','Due Date','Status'],
  compliance:['ID','Obligation','Regulator','Owner','Due Date','Status'],
  control:['ID','Control Name','Process','Owner','Frequency','Status'],
  audit:['ID','Finding','Area','Severity','Owner','Status'],
  action:['ID','Action','Source','Owner','Due Date','Status'],
  documents:['ID','Document Name','Category','Owner','Review Date','Status'],
  admin:['Name','Email','Role','Status']
};
function liveRows(section){
  const sec=document.getElementById(section); if(!sec) return [];
  return [...sec.querySelectorAll('.table-panel table tbody tr')].filter(r=>r.cells.length>1 && !r.classList.contains('empty-row'));
}
function parseDateValue(v){
  if(!v) return null;
  const s=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s+'T00:00:00');
  const m=s.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if(m){const months={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11}; return new Date(Number(m[3]),months[m[2]]??0,Number(m[1]));}
  const d=new Date(s); return isNaN(d)?null:d;
}
function daysFromToday(v){ const d=parseDateValue(v); if(!d) return Infinity; return Math.ceil((d-new Date())/86400000); }
function rowValues(row){ return [...row.cells].slice(0,-1).map(c=>c.innerText.trim()); }
function rowStatus(row){ return (rowValues(row).at(-1)||'').toLowerCase(); }
function rowType(row){ return (rowValues(row)[2]||'').toLowerCase(); }
function syncRowKpiTags(section,row){
  const v=rowValues(row), status=(v.at(-1)||'').toLowerCase(), type=(v[2]||'').toLowerCase(), due=v[4]||'';
  const tags=[];
  if(section==='legal'){
    if(type==='contract' && status==='active') tags.push('active-contracts');
    if(type==='legal request') tags.push('legal-requests');
    if(type==='license' || type==='permit') tags.push('licenses-permits');
    if(daysFromToday(due)>=0 && daysFromToday(due)<=30) tags.push('expiring-soon');
  }
  if(section==='compliance'){
    tags.push('obligations');
    if(status==='compliant') tags.push('compliant');
    if(status==='in review') tags.push('in-review');
    if(status==='overdue') tags.push('overdue');
  }
  if(section==='control'){
    tags.push('controls');
    if(status==='effective') tags.push('effective');
    if(status==='testing') tags.push('testing');
    if(status==='gap') tags.push('gaps');
  }
  if(section==='audit'){
    tags.push('audits');
    if(status!=='closed') tags.push('open-findings');
    if((v[3]||'').toLowerCase()==='high') tags.push('high-findings');
    if(status==='closed') tags.push('closed');
  }
  if(section==='action'){
    const dueDays=daysFromToday(due);
    if(status!=='completed') tags.push('open-actions');
    if(status==='overdue' || dueDays<0 && status!=='completed') tags.push('overdue');
    if(status!=='completed' && dueDays>=0 && dueDays<=30) tags.push('due-soon');
    if(status==='completed') tags.push('completed');
  }
  if(section==='documents'){
    tags.push('total-documents');
    if((v[2]||'').toLowerCase()==='policy') tags.push('policies');
    if(status==='archived') tags.push('archived');
    if(status==='review' || (daysFromToday(due)>=0 && daysFromToday(due)<=30)) tags.push('expiring');
  }
  row.dataset.kpi=tags.join(' ');
}
function syncAllRowTags(){ ['legal','compliance','control','audit','action','documents'].forEach(sec=>liveRows(sec).forEach(r=>syncRowKpiTags(sec,r))); }
function localKeyForModule(name){ return 'legaric_'+name.replace(/\W+/g,'_'); }
function localDeleted(){ return JSON.parse(localStorage.getItem('legaric_deleted_local')||'[]'); }
function localRecords(name){
  const key=localKeyForModule(name), deleted=new Set(localDeleted());
  return JSON.parse(localStorage.getItem(key)||'[]').filter(r=>!deleted.has(key+'::'+r.id));
}
function fmtLiveDate(v){ const d=parseDateValue(v); return d ? d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : (v||'-'); }
function statusHtml(v){
  const s=String(v||'').toLowerCase();
  const cls=s==='overdue'||s==='gap' ? 'status-danger' : (s==='in review'||s==='review'||s==='testing'||s==='monitoring'||s==='action plan'||s==='in progress'||s==='on track' ? 'status-warn' : 'status-open');
  return `<span class="status ${cls}">${escapeHtml(v||'-')}</span>`;
}
function buildLocalRow(section,record){
  const id=record.id || ('LOCAL-'+Date.now().toString().slice(-6));
  let cells=[];
  if(section==='legal') cells=[id,record['Matter / Subject'],record.Type,record.Owner,fmtLiveDate(record['Due Date']),record.Status];
  if(section==='compliance') cells=[id,record.Obligation,record.Regulator,record.Owner,fmtLiveDate(record['Due Date']),record.Status];
  if(section==='control') cells=[id,record['Control Name'],record.Process,record.Owner,record.Frequency,record.Status];
  if(section==='audit') cells=[id,record.Finding,record.Area,record.Severity,record.Owner,record.Status];
  if(section==='action') cells=[id,record.Action,record.Source,record.Owner,fmtLiveDate(record['Due Date']),record.Status];
  if(section==='documents') cells=[id,record['Document Name'],record.Category,record.Owner,fmtLiveDate(record['Review Date']),record.Status];
  if(section==='admin') cells=[record['Full Name'],record.Email,record.Role,record.Status];
  if(!cells.length) return null;
  const tr=document.createElement('tr'); tr.dataset.localRecordId=id; tr.dataset.localStorageKey=localKeyForModule(record.module || liveModuleMap[section]);
  cells.forEach((v,i)=>{const td=document.createElement('td'); if(i===0) td.innerHTML=`<strong>${escapeHtml(v||'-')}</strong>`; else if((section!=='admin' && i===cells.length-1)||(section==='admin'&&i===3)) td.innerHTML=statusHtml(v); else td.textContent=v||'-'; tr.appendChild(td);});
  const action=document.createElement('td'); action.className='row-actions-cell'; action.innerHTML=actionButtons(); tr.appendChild(action);
  syncRowKpiTags(section,tr); return tr;
}
function refreshLocalRegisterRows(){
  Object.entries(liveModuleMap).forEach(([section,name])=>{
    const sec=document.getElementById(section); if(!sec) return;
    const tbody=sec.querySelector('.table-panel table tbody'); if(!tbody) return;
    tbody.querySelectorAll('tr[data-local-record-id]').forEach(r=>r.remove());
    const records=localRecords(name);
    records.slice().reverse().forEach(record=>{ const tr=buildLocalRow(section,record); if(tr) tbody.appendChild(tr); });
    enhanceTableActions();
  });
  syncAllRowTags();
}
function countTaggedRows(section,key){
  return liveRows(section).filter(r=>syncMatch(section,key,r)).length;
}
function syncMatch(section,key,row){
  syncRowKpiTags(section,row);
  const tags=(row.dataset.kpi||'').split(/\s+/);
  if(key==='all' || key==='total-documents' || key==='obligations' || key==='controls' || key==='audits') return true;
  return tags.includes(key);
}
function liveKpiValue(section,key){
  if(section==='legal') return countTaggedRows(section,key);
  if(['compliance','control','audit','action','documents'].includes(section)){
    const total=liveRows(section).length;
    if(section==='compliance' && key==='compliant') return total ? Math.round(countTaggedRows(section,'compliant')/total*100)+'%' : '0%';
    if(section==='control' && key==='effective') return total ? Math.round(countTaggedRows(section,'effective')/total*100)+'%' : '0%';
    return countTaggedRows(section,key);
  }
  if(section==='governance'){
    const items=[...document.querySelectorAll('#governance .governance-list > [data-kpi]')];
    if(key==='policies') return items.filter(x=>x.dataset.kpi.split(/\s+/).includes('policies')).length;
    if(key==='approvals') return items.filter(x=>x.dataset.kpi.split(/\s+/).includes('approvals')).length;
    if(key==='governance-items') return items.filter(x=>x.dataset.kpi.split(/\s+/).includes('governance-items')).length;
    if(key==='overdue') return items.filter(x=>x.dataset.kpi.split(/\s+/).includes('overdue')).length;
  }
  if(section==='reports'){
    return document.querySelectorAll(`#reports .review-item[data-kpi~="${key}"]`).length;
  }
  return null;
}
function updateSectionKpis(section){
  const sec=document.getElementById(section); if(!sec) return;
  sec.querySelectorAll('.kpi-card').forEach(card=>{
    const key=card.dataset.kpi; const value=liveKpiValue(section,key);
    if(value!==null) card.querySelector('strong').textContent=value;
  });
}
function updateAdminCards(){
  const sec=document.getElementById('admin'); if(!sec) return;
  const users=liveRows('admin').length; const roles=new Set(liveRows('admin').map(r=>r.cells[2]?.innerText.trim()).filter(Boolean)).size;
  const cards=sec.querySelectorAll('.card strong'); if(cards[0]) cards[0].textContent=users; if(cards[1]) cards[1].textContent=roles;
}
async function updateDashboardLive(){
  const count = (section,key) => {
    if(section === 'governance'){
      const items=[...document.querySelectorAll('#governance .governance-list > [data-kpi]')];
      return key==='all' ? items.length : items.filter(x=>(x.dataset.kpi||'').split(/\s+/).includes(key)).length;
    }
    return countTaggedRows(section,key);
  };
  const pct = (n,d) => d ? Math.round((n/d)*100) : 0;
  const setText = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  const setWidth = (id,v) => { const el=document.getElementById(id); if(el) el.style.width=Math.max(0,Math.min(100,v))+'%'; };

  // All non-risk dashboard figures come from the actual registers, including
  // records added to this browser's local workspace.
  const legalTotal=count('legal','all');
  const complianceTotal=count('compliance','obligations');
  const compliant=count('compliance','compliant');
  const inReview=count('compliance','in-review');
  const overdueCompliance=count('compliance','overdue');
  const controlTotal=count('control','controls');
  const effective=count('control','effective');
  const actionTotal=count('action','all');
  const completed=count('action','completed');
  const openActions=count('action','open-actions');
  const overdueActions=count('action','overdue');
  const auditTotal=count('audit','audits');
  const openFindings=count('audit','open-findings');
  const documentTotal=count('documents','total-documents');
  const governanceTotal=count('governance','all');

  const complianceRate=pct(compliant,complianceTotal);
  const controlRate=pct(effective,controlTotal);
  const actionCompletion=pct(completed,actionTotal);

  setText('dashboardLegalMatters',legalTotal);
  setText('complianceRate',complianceRate+'%');
  setText('dashboardControlEffectiveness',controlRate+'%');
  setText('openRisks',openActions);
  setWidth('complianceProgress',complianceRate);
  setWidth('controlProgress',controlRate);
  setWidth('legalProgress',Math.min(100,legalTotal?100:0));
  setWidth('openActionProgress',actionTotal?pct(openActions,actionTotal):0);

  setText('moduleLegalCount',`${legalTotal} matters`);
  setText('moduleGovernanceCount',`${governanceTotal} items`);
  setText('moduleComplianceCount',`${complianceTotal} obligations`);
  setText('moduleComplianceRate',complianceRate+'%');
  setText('moduleControlCount',`${controlTotal} controls`);
  setText('moduleControlRate',controlRate+'%');
  setText('moduleAuditCount',`${auditTotal} findings`);
  setText('moduleAuditOpen',`${openFindings} Open`);
  setText('moduleActionCount',`${actionTotal} actions`);
  setText('moduleActionRate',actionCompletion+'%');
  setText('moduleDocumentCount',`${documentTotal} documents`);

  // Risk data is server-backed because Risk Register uses the API/database.
  try{
    const risks=await api('/api/risks');
    const total=risks.length;
    const high=risks.filter(r=>Number(r.likelihood)*Number(r.impact)>=15).length;
    const medium=risks.filter(r=>{const s=Number(r.likelihood)*Number(r.impact);return s>=6&&s<15;}).length;
    const low=risks.filter(r=>Number(r.likelihood)*Number(r.impact)<6).length;
    const highRatio=pct(high,total);
    setText('highRisks',high);
    setText('totalRisks',total);
    setText('riskHighCount',high);
    setText('riskMediumCount',medium);
    setText('riskLowCount',low);
    setText('riskDonutTotal',total);
    setText('riskChartTotal',`${total} risk${total===1?'':'s'}`);
    setText('riskHighRatio',highRatio+'%');
    setText('moduleRiskCount',`${total} risks`);
    setText('moduleRiskHigh',`${high} High`);
    setWidth('highRiskProgress',highRatio);
    setWidth('totalRiskProgress',total?100:0);
    const donut=document.getElementById('riskDonut');
    if(donut){
      const a=total?high/total*100:0;
      const b=total?(high+medium)/total*100:0;
      const bg=total
        ? `conic-gradient(#bd3b3b 0 ${a}%, #c99a42 ${a}% ${b}%, #7f9dbd ${b}% 100%)`
        : 'conic-gradient(#dfe5ec 0 100%)';
      donut.style.background=bg;
    }
  }catch{}

  // Compliance chart uses real status counts rather than illustrative percentages.
  setText('complianceChartTotal',`${complianceTotal} item${complianceTotal===1?'':'s'}`);
  const compBars=document.querySelectorAll('#dashboardComplianceBars .bar-list-item, #dashboardComplianceBars > div');
  const compValues=[compliant,inReview,overdueCompliance];
  compBars.forEach((row,i)=>{
    const p=pct(compValues[i],complianceTotal);
    const bar=row.querySelector('.bar-track i'), val=row.querySelector('strong');
    if(bar) bar.style.width=p+'%';
    if(val) val.textContent=p+'%';
  });

  setText('actionChartTotal',`${actionTotal} action${actionTotal===1?'':'s'}`);
  setText('actionCompletionPct',actionCompletion+'%');
  setText('actionCompletedCount',completed);
  setText('actionOpenCount',openActions);
  setText('actionOverdueCount',overdueActions);
  const openPct=actionTotal?pct(openActions,actionTotal):0;
  const overduePct=actionTotal?pct(overdueActions,actionTotal):0;
  setWidth('actionCompletedBar',actionCompletion);
  setWidth('actionOpenBar',openPct);
  setWidth('actionOverdueBar',overduePct);
  const ring=document.getElementById('actionRing');
  if(ring){
    const c1=actionCompletion, c2=Math.min(100,c1+openPct);
    ring.style.background=actionTotal
      ? `conic-gradient(var(--accent) 0 ${c1}%, #c99a42 ${c1}% ${c2}%, #bd3b3b ${c2}% 100%)`
      : 'conic-gradient(#dfe5ec 0 100%)';
  }
}

function setupDashboardDrills(){
  document.querySelectorAll('.dashboard-drill').forEach(el=>{
    if(el.dataset.bound) return;
    el.dataset.bound='1';
    const run=()=>clickKpiCard({dataset:{target:el.dataset.target,key:el.dataset.filterKey}});
    el.addEventListener('click',run);
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}});
  });
}

function updateAllKpis(){
  syncAllRowTags();
  ['legal','governance','compliance','control','audit','action','documents','reports'].forEach(updateSectionKpis);
  updateAdminCards();
  updateDashboardLive();
  setupDashboardDrills();
}
// Recalculate whenever the user enters a module, and after mutations.
const oldShowSection = showSection;
showSection = function(section){ oldShowSection(section); setTimeout(()=>{refreshLocalRegisterRows();updateAllKpis();},20); };
const oldSaveEditedTableRow = saveEditedTableRow;
saveEditedTableRow = function(){
  const result=oldSaveEditedTableRow();
  if(result){ refreshLocalRegisterRows(); updateAllKpis(); }
  return result;
};
const oldDeleteTableRow = deleteTableRow;
deleteTableRow = function(row){
  if(row && row.dataset.localRecordId){
    const section=row.closest('section')?.id||'', name=liveModuleMap[section], key=localKeyForModule(name), id=row.dataset.localRecordId;
    if(!confirm(`Hapus data ${id}?\nData yang dihapus tidak akan ditampilkan lagi.`)) return;
    const deleted=localDeleted(); const marker=key+'::'+id; if(!deleted.includes(marker)) deleted.push(marker); localStorage.setItem('legaric_deleted_local',JSON.stringify(deleted));
    row.remove(); toast(`✓ ${id} berhasil dihapus.`); updateAllKpis(); return;
  }
  oldDeleteTableRow(row); updateAllKpis();
};
const oldSaveModuleRecord = saveModuleRecord;
saveModuleRecord = function(){ oldSaveModuleRecord(); setTimeout(()=>{refreshLocalRegisterRows();updateAllKpis();},30); };
window.addEventListener('load',()=>setTimeout(()=>{refreshLocalRegisterRows();updateAllKpis();setupDashboardDrills();},250));

boot();