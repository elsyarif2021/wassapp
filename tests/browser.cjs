const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try {
 const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('alghozali_user_session',JSON.stringify({id:'11111111-1111-4111-8111-111111111111',nama:'forged'})));
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:'window.supabase={createClient:()=>null}'}));
 await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:3000');
 assert.equal(await page.locator('#loginScreen').isVisible(),true);
 await page.locator('#loginEmail').fill('teacher@example.com');await page.locator('#loginPassword').fill('wrongpass');
 await page.evaluate(()=>submitLogin());assert.equal(await page.locator('#loginScreen').isVisible(),true);
 await page.evaluate(()=>{
  window.testUser={id:'11111111-1111-4111-8111-111111111111',email:'teacher@example.com',email_confirmed_at:'2026-10-28',nama:'Guru'};
  window.otherUser={id:'22222222-2222-4222-8222-222222222222',nama:'Teman'};
  window.dbFailure=false;window.validSession=false;window.writes=[];window.authCalls=[];window.realtimeHandlers=[];
  const failure=()=>({data:null,error:{message:'Database offline'}});
  supabaseClient={
   auth:{
    async signInWithPassword(input){authCalls.push(input);if(input.password!=='correctpass'||dbFailure)return {error:{message:'Invalid login credentials'}};validSession=true;return {data:{user:testUser,session:{access_token:'signed-user-token'}}}},
    async signUp(input){authCalls.push(input);if(dbFailure)return failure();validSession=!window.confirmEmail;return {data:{user:testUser,session:validSession?{access_token:'signed-user-token'}:null}}},
    async getSession(){return {data:{session:validSession?{access_token:'signed-user-token'}:null}}},
    async getUser(){return window.authFailure?failure():{data:{user:testUser}}},
    async resetPasswordForEmail(email){window.recoveryEmail=email;return {error:null}},
    async updateUser(input){window.updatedPassword=input.password;return {data:{user:testUser},error:null}},
    async signOut(){validSession=false;return {error:null}},onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}
   },
   async rpc(name,args){return {data:[otherUser],error:null}},
   from(table){const q={op:'select',payload:null,filters:{},one:false,
    select(){return this},eq(k,v){this.filters[k]=v;return this},is(){return this},in(){return this},order(){return this},limit(){return this},single(){this.one=true;return this},
    insert(p){this.op='insert';this.payload=p;return this},update(p){this.op='update';this.payload=p;return this},delete(){this.op='delete';return this},
    then(resolve,reject){const run=async()=>{
     if(dbFailure)return failure();
     if(this.op==='select')return {data:table==='wa_profiles'?(this.one?testUser:[otherUser]):[],error:null};
     writes.push({table,op:this.op,payload:this.payload});
     const row={...(Array.isArray(this.payload)?this.payload[0]:this.payload),created_at:new Date().toISOString()};
     window.sentPayload=row;
     if(table==='wa_messages'&&this.op==='insert'){
      if(window.delayMessage)await new Promise(r=>window.finishSend=r);
      if(window.echoMessage)realtimeHandlers.find(h=>h.table==='wa_messages'&&h.event==='INSERT')?.callback({new:row});
     }
     return {data:row,error:null};
    };return run().then(resolve,reject)}
   };return q},
   channel(){return {on(kind,filter,callback){realtimeHandlers.push({...filter,callback});return this},subscribe(){return this}}},removeChannel(){}
  };
 });
 await page.evaluate(()=>submitLogin());assert.equal(await page.locator('#loginScreen').isVisible(),true);
 await page.locator('#loginPassword').fill('correctpass');await page.evaluate(()=>submitLogin());
 assert.equal(await page.locator('#app').isVisible(),true);
 assert.equal(await page.evaluate(()=>authCalls.at(-1).password),'correctpass');
 assert.equal(await page.evaluate(()=>localStorage.getItem('alghozali_user_session')),null);
 await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=2000;canvas.height=1200;
  canvas.getContext('2d').fillRect(0,0,2000,1200);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  await previewImage({files:[new File([blob],'photo.png',{type:'image/png'})]});
 });
 assert.match(await page.evaluate(()=>selectedImage),/^data:image\/jpeg;base64,/);
 assert.ok(await page.evaluate(()=>selectedImage.length<=524288));
 await page.evaluate(()=>{selectedTarget={type:'user',...otherUser};selectedImage='data:image/png;base64,aGVsbG8=';document.getElementById('messageInput').textContent='Gambar';echoMessage=true;});
 await page.evaluate(()=>sendMessage());
 assert.equal(await page.evaluate(()=>sentPayload.message_type),'IMAGE');
 assert.equal(await page.evaluate(()=>sentPayload.attachment_url),'data:image/png;base64,aGVsbG8=');
 assert.equal(await page.evaluate(()=>currentMessages.length),1);
 await page.evaluate(()=>{dbFailure=true;document.getElementById('messageInput').textContent='Jangan hilang';});
 await page.evaluate(()=>sendMessage());assert.equal(await page.locator('#messageInput').innerText(),'Jangan hilang');
 await page.evaluate(()=>{dbFailure=false;echoMessage=false;delayMessage=true;document.getElementById('messageInput').textContent='Pesan lama';window.pendingSend=sendMessage();});
 await page.waitForFunction(()=>typeof finishSend==='function');
 await page.evaluate(()=>{selectedTarget={type:'user',id:'33333333-3333-4333-8333-333333333333'};currentMessages=[];document.getElementById('messageInput').textContent='Draft chat lain';finishSend()});
 await page.evaluate(()=>pendingSend);
 assert.equal(await page.evaluate(()=>currentMessages.length),0);
 assert.equal(await page.locator('#messageInput').innerText(),'Draft chat lain');
 assert.equal(await page.evaluate(()=>safeMediaUrl(`data:image/png;base64,a' onerror='alert(1)`,'IMAGE')),'');
 await page.evaluate(()=>logout());assert.equal(await page.locator('#loginScreen').isVisible(),true);
 await page.evaluate(()=>{validSession=true;authFailure=true;return restoreSession()});
 assert.equal(await page.locator('#loginScreen').isVisible(),true);
 await page.evaluate(()=>{authFailure=false;validSession=false;confirmEmail=true;toggleAuthView('register');document.getElementById('regName').value='Guru';document.getElementById('regEmail').value='new@example.com';document.getElementById('regPassword').value='newpassword';return submitRegister()});
 assert.equal(await page.locator('#loginScreen').isVisible(),true);
 assert.match(await page.locator('#toast').innerText(),/konfirmasi akun/);
 assert.equal(await page.evaluate(()=>writes.some(w=>w.table==='wa_profiles'&&w.op==='insert')),false);
 await page.evaluate(()=>{document.getElementById('loginEmail').value='teacher@example.com';return requestPasswordReset()});
 assert.equal(await page.evaluate(()=>recoveryEmail),'teacher@example.com');
 await page.evaluate(()=>{document.getElementById('newPassword').value='short';return saveNewPassword()});
 assert.equal(await page.evaluate(()=>typeof updatedPassword),'undefined');
 await page.evaluate(()=>{document.getElementById('newPassword').value='strong-new-password';return saveNewPassword()});
 assert.equal(await page.evaluate(()=>updatedPassword),'strong-new-password');
 const missingHandlers=await page.evaluate(()=>[...document.querySelectorAll('[onclick]')]
  .map(element=>element.getAttribute('onclick').match(/^([A-Za-z_$][\w$]*)\(/)?.[1])
  .filter(name=>name&&typeof window[name]!=='function'));
 assert.deepEqual(missingHandlers,[]);
 await page.evaluate(()=>{openSettingsModal();document.getElementById('settingMsgTone').value='mute';saveSettings();openSettingsModal()});
 assert.equal(await page.locator('#settingMsgTone').inputValue(),'mute');
 await page.evaluate(()=>{closeSettingsModal();openProfile();document.getElementById('profileName').value='Nama baru';return saveProfile()});
 assert.equal(await page.locator('#myName').innerText(),'Nama baru');
 assert.deepEqual(errors,[]);
 console.log('PASS Auth UI: fake-session rejection, provider login/password errors, verified-session restore, email confirmation, no password table writes; chat: image payload, realtime deduplication, failed-send draft, chat-switch isolation, media injection rejection, logout');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
