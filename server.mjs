import http from 'node:http';
import { readFile } from 'node:fs/promises';
import handler from './api/chat.js';
const root = new URL('./', import.meta.url);
const publicFiles = new Set(['/index.html', '/android-runtime.js']);
const types = {html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8'};
http.createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = data => { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(data)); return res; };
  try {
    const path = new URL(req.url,'http://localhost').pathname;
    if (path === '/api/chat') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 100000) return res.status(413).json({error:'Permintaan terlalu besar.'});
      }
      try { req.body = body ? JSON.parse(body) : {}; }
      catch { return res.status(400).json({error:'JSON tidak valid.'}); }
      return await handler(req,res);
    }
    if (!['GET','HEAD'].includes(req.method)) return res.status(405).json({error:'Method not allowed'});
    const file = path === '/' ? '/index.html' : path;
    if (!publicFiles.has(file)) return res.status(404).json({error:'Not found'});
    const content = await readFile(new URL('.' + file, root));
    res.setHeader('Content-Type',types[file.split('.').pop()]);
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.status(500).json({error:'Internal server error'}); }
}).listen(Number(process.env.PORT || 3000),'127.0.0.1',()=>console.log('WassApp development server started'));
