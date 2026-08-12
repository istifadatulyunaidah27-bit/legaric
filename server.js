const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, 'data.json');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET || 'legaric-dev-change-me', resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: IS_PRODUCTION, maxAge: 8*60*60*1000 }}));
app.use(express.static(path.join(__dirname, 'public')));

function hash(s){ return crypto.createHash('sha256').update(s).digest('hex'); }
function readData(){ if(!fs.existsSync(DATA)) fs.writeFileSync(DATA, JSON.stringify({users:[],risks:[]}, null, 2)); return JSON.parse(fs.readFileSync(DATA,'utf8')); }
function writeData(d){ fs.writeFileSync(DATA, JSON.stringify(d,null,2)); }
let data = readData();
if (!data.users.length) {
  data.users = [
    {id:1,name:'LEGARIC Administrator',email:'admin@legaric.local',password_hash:hash('admin123'),role:'Administrator'},
    {id:2,name:'Risk Officer',email:'risk@legaric.local',password_hash:hash('risk123'),role:'Risk Officer'}
  ]; writeData(data);
}
function auth(req,res,next){ if(!req.session.user) return res.status(401).json({error:'Unauthorized'}); next(); }
app.post('/api/login',(req,res)=>{ const u=data.users.find(x=>x.email===req.body.email && x.password_hash===hash(req.body.password||'')); if(!u)return res.status(401).json({error:'Email atau password salah.'}); const user={id:u.id,name:u.name,email:u.email,role:u.role}; req.session.user=user; res.json(user); });
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/me',auth,(req,res)=>res.json(req.session.user));
app.get('/health',(req,res)=>res.json({ok:true,app:'LEGARIC'}));
app.get('/api/risks',auth,(req,res)=>res.json([...data.risks].sort((a,b)=>b.id-a.id)));
app.post('/api/risks',auth,(req,res)=>{ const {title,category,owner,likelihood,impact,treatment}=req.body; if(!title||!likelihood||!impact)return res.status(400).json({error:'Data risiko belum lengkap.'}); const id=data.risks.length?Math.max(...data.risks.map(x=>x.id))+1:1; const risk={id,risk_id:'R-'+String(Date.now()).slice(-6),title,category:category||'',owner:owner||'',likelihood:Number(likelihood),impact:Number(impact),treatment:treatment||'',status:'Open',created_at:new Date().toISOString()}; data.risks.push(risk); writeData(data); res.status(201).json(risk); });
app.put('/api/risks/:id',auth,(req,res)=>{ const id=Number(req.params.id); const r=data.risks.find(x=>x.id===id); if(!r)return res.status(404).json({error:'Risk tidak ditemukan.'}); const {title,category,owner,likelihood,impact,treatment,status}=req.body; if(!title||!likelihood||!impact)return res.status(400).json({error:'Data risiko belum lengkap.'}); Object.assign(r,{title,category:category||'',owner:owner||'',likelihood:Number(likelihood),impact:Number(impact),treatment:treatment||'',status:status||r.status}); writeData(data); res.json(r); });
app.delete('/api/risks/:id',auth,(req,res)=>{ const id=Number(req.params.id); const i=data.risks.findIndex(x=>x.id===id); if(i<0)return res.status(404).json({error:'Risk tidak ditemukan.'}); data.risks.splice(i,1); writeData(data); res.json({ok:true}); });
app.get('/api/dashboard',auth,(req,res)=>{const total=data.risks.length, high=data.risks.filter(r=>r.likelihood*r.impact>=15).length, open=data.risks.filter(r=>r.status==='Open').length; res.json({totalRisks:total,highRisks:high,openRisks:open,complianceRate:87});});
app.listen(PORT,()=>console.log(`LEGARIC running at http://localhost:${PORT}`));
