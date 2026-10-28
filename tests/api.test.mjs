import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/chat.js';
async function call(method,body,authorization='Bearer signed-user-token') {
 const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(code){this.statusCode=code;return this},json(data){this.body=data;return this},end(){return this}};
 await handler({method,body,headers:{authorization}},res);return res;
}
test('AI method, input validation, and missing token',async()=>{
 assert.equal((await call('GET')).statusCode,405);
 for(const body of [undefined,{}, {prompt:42},{prompt:' '},{prompt:'a'.repeat(20001)}]) assert.equal((await call('POST',body)).statusCode,400);
 assert.equal((await call('POST',{prompt:'Hello'},'')).statusCode,401);
});
test('server verifies identity, confirmed email and database quota before AI',async()=>{
 const key=process.env.GROQ_API_KEY;const original=globalThis.fetch;
 try {
 process.env.GROQ_API_KEY='test-only';
 let authStatus=200,confirmed=true,quota=true,providerStatus=200,providerCalls=0;
 globalThis.fetch=async(url,options)=>{
  if(url.endsWith('/auth/v1/user')){assert.equal(options.headers.Authorization,'Bearer signed-user-token');return {ok:authStatus===200,status:authStatus,json:async()=>({id:'test-user',email_confirmed_at:confirmed?'2026-10-28':null})}}
  if(url.endsWith('/rpc/wa_claim_ai_request'))return {ok:true,json:async()=>quota};
  providerCalls++;assert.equal(JSON.parse(options.body).messages[1].content,'Hello');
  return {ok:providerStatus===200,status:providerStatus,json:async()=>({choices:[{message:{content:'Jawaban'}}]})};
 };
 authStatus=401;assert.equal((await call('POST',{prompt:'Hello'})).statusCode,401);assert.equal(providerCalls,0);
 authStatus=200;confirmed=false;assert.equal((await call('POST',{prompt:'Hello'})).statusCode,403);assert.equal(providerCalls,0);
 confirmed=true;quota=false;assert.equal((await call('POST',{prompt:'Hello'})).statusCode,429);assert.equal(providerCalls,0);
 quota=true;assert.deepEqual((await call('POST',{prompt:'Hello'})).body,{reply:'Jawaban'});
 providerStatus=429;assert.equal((await call('POST',{prompt:'Hello'})).statusCode,429);
 globalThis.fetch=async()=>{throw new Error('private upstream diagnostics')};
 const failed=await call('POST',{prompt:'Hello'});assert.equal(failed.statusCode,503);assert.ok(!failed.body.error.includes('private upstream'));
 }finally{globalThis.fetch=original;if(key===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=key}
});
test('Android preflight includes authorization and allows bundled origin only',async()=>{
 const headers={};const res={statusCode:0,setHeader(k,v){headers[k]=v},status(c){this.statusCode=c;return this},end(){return this}};
 await handler({method:'OPTIONS',headers:{origin:'https://localhost'}},res);
 assert.equal(res.statusCode,204);assert.equal(headers['Access-Control-Allow-Origin'],'https://localhost');assert.match(headers['Access-Control-Allow-Headers'],/Authorization/);
 const denied={...res};await handler({method:'OPTIONS',headers:{origin:'https://untrusted.example'}},denied);assert.equal(denied.statusCode,403);
});
