app.patch('/api/team/:id', async (req,res) => {
  if(!requireRole(req,res,['owner','admin'])) return
  const id=req.params.id, role=String(req.body?.role||'').trim()
  if(!['admin','member','viewer'].includes(role)) return res.status(400).json({error:'Недопустимая роль'})
  if(role==='admin' && req.user.role!=='owner') return res.status(403).json({error:'Только владелец может назначать роль администратора'})
  if(pool){
    const q=await pool.query("update users set role=$1 where id::text=$2 and studio_id::text=$3::text and role not in ('owner','superadmin') returning id,name,email,role,created_at",[role,id,req.user.studio_id])
    if(!q.rows[0]) return res.status(404).json({error:'Участник не найден'})
    return res.json({member:q.rows[0]})
  }
  const u=memoryUsers.find(x=>x.id===id&&x.studio_id===req.user.studio_id&&!['owner','superadmin'].includes(x.role))
  if(!u)return res.status(404).json({error:'Участник не найден'})
  u.role=role
  res.json({member:{id:u.id,name:u.name,email:u.email,role:u.role,created_at:u.created_at||new Date().toISOString()}})
})