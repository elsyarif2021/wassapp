import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
await mkdir(new URL('dist/',root),{recursive:true});
for (const file of ['index.html','android-runtime.js']) await copyFile(new URL(file,root),new URL('dist/'+file,root));
// Ship the SDK inside the APK; do not depend on a CDN at application startup.
const sdk = JSON.parse(await readFile(new URL('node_modules/@supabase/supabase-js/package.json',root),'utf8'));
await copyFile(new URL('node_modules/@supabase/supabase-js/dist/umd/supabase.js',root),new URL('dist/supabase.js',root));
const html = await readFile(new URL('dist/index.html',root),'utf8');
await writeFile(new URL('dist/index.html',root),html.replace('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2','supabase.js'));
console.log('Android web assets prepared with Supabase SDK '+sdk.version);
