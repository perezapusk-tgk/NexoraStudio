import app from '../server/index.js'

export default function handler(req,res){
  const route=String(req.query?.__path||'').replace(/^\/+|\/+$/g,'')
  if(!route)return app(req,res)
  const query=new URLSearchParams()
  for(const [key,value] of Object.entries(req.query||{})){
    if(key==='__path')continue
    if(Array.isArray(value)) value.forEach(v=>query.append(key,String(v)))
    else if(value!==undefined&&value!==null) query.set(key,String(value))
  }
  req.url='/api/'+route+(query.toString()?'?'+query.toString():'')
  req.originalUrl=req.url
  return app(req,res)
}
