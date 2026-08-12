const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const SECRET = process.env.SESSION_SECRET || 'legaric-demo-secret-change-me';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Vercel's filesystem is not a persistent database.
// For this demo deployment, data is kept in memory.
const users = [
  {id:1,name:'LEGARIC Administrator',email:'admin@legaric.local',password_hash:hash('admin123'),role:'Administrator'},
  {id:2,name:'Risk Officer',email:'risk@legaric.local',password_hash:hash('risk123'),role:'Risk Officer'}
];
let risks = [];

function hash(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function readToken(req) {
  const raw = req.headers.cookie || '';
  const match = raw.match(/(?:^|;\\s*)legaric_session=([^;]+)/);
  if (!match) return null;
  try {
    const [body, sig] = decodeURIComponent(match[1]).split('.');
    const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
    if (!sig || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload.user;
  } catch {
    return null;
  }
}

function setSession(res, user) {
  const token = sign({user, exp: Date.now() + 8*60*60*1000});
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `legaric_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secure}`);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', 'legaric_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

function auth(req,res,next) {
  const user = readToken(req);
  if (!user) return res.status(401).json({error:'Unauthorized'});
  req.user = user;
  next();
}

app.get('/health', (req,res) => res.json({ok:true, app:'LEGARIC'}));

app.post('/api/login',(req,res)=>{
  const u = users.find(x => x.email === req.body.email && x.password_hash === hash(req.body.password || ''));
  if (!u) return res.status(401).json({error:'Email atau password salah.'});
  const user = {id:u.id,name:u.name,email:u.email,role:u.role};
  setSession(res, user);
  res.json(user);
});

app.post('/api/logout',(req,res)=>{
  clearSession(res);
  res.json({ok:true});
});

app.get('/api/me',auth,(req,res)=>res.json(req.user));

app.get('/api/risks',auth,(req,res)=>
  res.json([...risks].sort((a,b)=>b.id-a.id))
);

app.post('/api/risks',auth,(req,res)=>{
  const {title,category,owner,likelihood,impact,treatment}=req.body;
  if(!title || !likelihood || !impact)
    return res.status(400).json({error:'Data risiko belum lengkap.'});

  const id = risks.length ? Math.max(...risks.map(x=>x.id))+1 : 1;
  const risk = {
    id,
    risk_id:'R-'+String(Date.now()).slice(-6),
    title,
    category:category||'',
    owner:owner||'',
    likelihood:Number(likelihood),
    impact:Number(impact),
    treatment:treatment||'',
    status:'Open',
    created_at:new Date().toISOString()
  };
  risks.push(risk);
  res.status(201).json(risk);
});

app.put('/api/risks/:id',auth,(req,res)=>{
  const id=Number(req.params.id);
  const r=risks.find(x=>x.id===id);
  if(!r) return res.status(404).json({error:'Risk tidak ditemukan.'});

  const {title,category,owner,likelihood,impact,treatment,status}=req.body;
  if(!title || !likelihood || !impact)
    return res.status(400).json({error:'Data risiko belum lengkap.'});

  Object.assign(r,{
    title,
    category:category||'',
    owner:owner||'',
    likelihood:Number(likelihood),
    impact:Number(impact),
    treatment:treatment||'',
    status:status||r.status
  });
  res.json(r);
});

app.delete('/api/risks/:id',auth,(req,res)=>{
  const id=Number(req.params.id);
  const i=risks.findIndex(x=>x.id===id);
  if(i<0) return res.status(404).json({error:'Risk tidak ditemukan.'});
  risks.splice(i,1);
  res.json({ok:true});
});

app.get('/api/dashboard',auth,(req,res)=>{
  const total=risks.length;
  const high=risks.filter(r=>r.likelihood*r.impact>=15).length;
  const open=risks.filter(r=>r.status==='Open').length;
  res.json({totalRisks:total,highRisks:high,openRisks:open,complianceRate:87});
});

// Vercel detects and serves the Express app.
module.exports = app;
