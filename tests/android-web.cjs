const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try {
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.Capacitor={isNativePlatform:()=>true,Plugins:{DocumentExport:{share:async(data)=>{window.sharedDocument=data.html}},App:{addListener:async(event,fn)=>{window.androidBack=fn},minimizeApp:async()=>{window.minimized=true}}}}});
 await page.goto(process.env.TEST_BASE_URL||'http://127.0.0.1:3002');
 assert.equal(await page.evaluate(()=>typeof window.supabase.createClient),'function');
 assert.match(await page.evaluate(()=>{try{wassappApiEndpoint()}catch(e){return e.message}}),/Atur alamat server/);
 await page.getByRole('button',{name:'⚙️ Alamat Server AI'}).click();
 await page.locator('#backendUrl').fill('http://unsafe.example');
 await page.locator('#connectionModal').getByRole('button',{name:'Simpan',exact:true}).click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('wassapp_backend_url')),null);
 await page.locator('#backendUrl').fill('https://example.com');
 await page.locator('#connectionModal').getByRole('button',{name:'Simpan',exact:true}).click();
 assert.equal(await page.evaluate(()=>wassappApiEndpoint()),'https://example.com/api/chat');
 await page.evaluate(()=>{openSettingsModal();openConnectionSettings();androidBack()});
 assert.equal(await page.locator('#connectionModal').isVisible(),false);
 assert.equal(await page.locator('#settingsModal').isVisible(),true);
 await page.evaluate(()=>androidBack());
 await page.evaluate(()=>{document.getElementById('app').classList.add('mobile-chat-open');androidBack()});
 assert.equal(await page.evaluate(()=>document.getElementById('app').classList.contains('mobile-chat-open')),false);
 await page.evaluate(()=>androidBack());assert.equal(await page.evaluate(()=>minimized),true);
 await page.evaluate(()=>{currentMessages=[{id:'doc',messageText:'Dokumen pengujian'}];return exportAiMessageToWord('doc')});
 assert.match(await page.evaluate(()=>sharedDocument),/Dokumen pengujian/);
 await page.setViewportSize({width:390,height:400});
 await page.evaluate(()=>toggleAuthView('register'));
 await page.getByRole('button',{name:'DAFTAR AKUN',exact:true}).scrollIntoViewIfNeeded();
 const registrationButton = await page.getByRole('button',{name:'DAFTAR AKUN',exact:true}).boundingBox();
 assert.ok(registrationButton.y >= 0 && registrationButton.y + registrationButton.height <= 400);
 assert.deepEqual(errors,[]);
 console.log('PASS Android assets: bundled SDK, HTTPS endpoint settings, back navigation, minimize hook; native hooks simulated');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
