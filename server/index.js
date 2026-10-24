import express from 'express'
import cors from 'cors'
import pg from 'pg'
import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs/promises'
import dns from 'node:dns/promises'

const { Pool } = pg
const app = express()
const port = Number(process.env.PORT || 4000)
const host = process.env.HOST || '0.0.0.0'
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, connectionTimeoutMillis: 8000, idleTimeoutMillis: 30000, max: 5 }) : null

app.disable('x-powered-by')
// Baseline security headers; CSP is intentionally omitted because the SPA/editor uses dynamic inline styles.
app.use((req,res,next)=>{
  res.set({
    'X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'SAMEORIGIN',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Resource-Policy':'same-site',
    ...(process.env.NODE_ENV==='production' ? {'Strict-Transport-Security':'max-age=31536000; includeSubDomains'} : {})
  })
  next()
})
// Render terminates the proxy layer; trust the first proxy so Express resolves req.ip safely.
app.set('trust proxy', 1)
app.use(cors({origin:(origin,callback)=>{if(!origin)return callback(null,true);try{const url=new URL(origin);const host=url.hostname.toLowerCase();const appHost=new URL(billingAppUrl()).hostname.toLowerCase();if(host===appHost||host==='localhost'||host==='127.0.0.1'||host.endsWith('.nexora.site'))return callback(null,true)}catch{}return callback(new Error('Origin not allowed'))},credentials:true}))
app.use(express.json({limit:'1mb',verify:(req,_res,buf)=>{req.rawBody=Buffer.from(buf)}}))

// Production API compatibility: keep API requests on /api even when a client is configured with the bare Render origin.
app.use((req,res,next)=>{
  const apiPrefixes=['/auth','/studio','/projects','/leads','/clients','/bookings','/payments','/invoices','/orders','/analytics','/templates','/connect','/billing','/team','/public']
  if(!req.path.startsWith('/api') && apiPrefixes.some(prefix=>req.path===prefix||req.path.startsWith(prefix+'/'))){ req.url='/api'+req.url }
  next()
})
