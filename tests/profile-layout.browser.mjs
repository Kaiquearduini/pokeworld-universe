const { chromium } = await import(process.env.PWU_PLAYWRIGHT_MODULE || 'playwright');
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import path from 'node:path';
const base='http://127.0.0.1:17941',out=(await mkdtemp(path.join(tmpdir(),'pwu-profile-layout-')))+path.sep;
const browser=await chromium.launch({channel:'chrome',headless:true});
const user={id:90001,name:'kaiquelopes_378',email:'preview@example.invalid',game:true,avatar:'assets/img/profile/portraits/4215a26d3fb6-v3/personagem-3--psiquico.svg',coins:0,plan:'Conta Grátis',trainers:[]};
const results=[],errors=[];
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.route('**/*',async route=>{
  if(new URL(route.request().url()).hostname!=='127.0.0.1')return route.fulfill({status:200,contentType:'text/javascript',body:''});
  return route.continue();
 });
 await context.addInitScript(u=>{localStorage.setItem('pwu_session',JSON.stringify(u));localStorage.setItem('pwu_token','profile-local-test');},user);
 await context.route('**/api/account',r=>r.request().method()==='GET'?r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)}):r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 async function rowMetrics(id){return page.locator('#'+id).evaluate(track=>{
  const bounds=track.getBoundingClientRect(),boxes=[...track.children].map(c=>c.getBoundingClientRect());
  return {count:boxes.length,visible:boxes.filter(b=>b.left>=bounds.left-2&&b.right<=bounds.right+2).length,oneRow:boxes.every(b=>Math.abs(b.top-boxes[0].top)<1),height:bounds.height,itemHeight:boxes[0].height,left:track.scrollLeft,max:track.scrollWidth-track.clientWidth};
 });}
 async function expectRow(id,count){
  const m=await rowMetrics(id);assert.equal(m.count,count);assert.equal(m.visible,3,JSON.stringify(m));assert.ok(m.oneRow);assert.ok(m.height<=m.itemHeight+30);return m;
 }
 for(const width of [1920,1440,1280,1024,768,390,320]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'/perfil.html',{waitUntil:'networkidle'});
  await expectRow('profile-characters',5);
  await page.locator('[data-carousel-controls="profile-characters"] [data-next]').click();
  await page.waitForFunction(()=>{let el=document.querySelector('#profile-characters');return el.scrollLeft>=el.scrollWidth-el.clientWidth-2;});
  await expectRow('profile-characters',5);
  assert.equal(await page.locator('[data-carousel-controls="profile-characters"] [data-range]').textContent(),'3–5 de 5');
  assert.equal(await page.locator('[data-carousel-controls="profile-characters"] [data-next]').isDisabled(),true);
  await page.locator('[data-carousel-controls="profile-characters"] [data-previous]').click();
  await page.waitForFunction(()=>document.querySelector('#profile-characters').scrollLeft<2);
  await expectRow('profile-characters',5);
  await page.locator('#profile-characters > button').first().focus();const y=await page.evaluate(()=>scrollY);
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.character),'personagem-5');
  assert.equal(await page.evaluate(()=>scrollY),y);
  await page.keyboard.press('Home');
  await page.locator('#tab-cards').click();await expectRow('profile-cards',6);
  await page.locator('[data-carousel-controls="profile-cards"] [data-next]').click();
  await page.waitForFunction(()=>{let el=document.querySelector('#profile-cards');return el.scrollLeft>=el.scrollWidth-el.clientWidth-2;});
  await expectRow('profile-cards',6);
  assert.equal(await page.locator('[data-carousel-controls="profile-cards"] [data-range]').textContent(),'4–6 de 6');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Horizontal page overflow '+width);
  const header=await page.locator('.user-chip').evaluate(chip=>{
   const img=chip.querySelector('img').getBoundingClientRect(),name=chip.querySelector('span').getBoundingClientRect(),exit=chip.querySelector('button').getBoundingClientRect();
   return {img:{y:img.y,height:img.height,right:img.right},name:{y:name.y,height:name.height,left:name.left,right:name.right},exit:{y:exit.y,height:exit.height,left:exit.left}};
  });
  assert.equal(header.img.height,44);assert.equal(header.exit.height,44);assert.ok(Math.abs(header.img.y-header.exit.y)<1);
  if(width>900){
   assert.equal(header.name.height,44);assert.ok(Math.abs(header.img.y-header.name.y)<1);assert.ok(header.img.right<header.name.left&&header.name.right<header.exit.left);
   const nav=await page.locator('.nav').boundingBox(),chip=await page.locator('.user-chip').boundingBox(),bar=await page.locator('.topbar').boundingBox();
   assert.ok(nav.x+nav.width+12<=chip.x,'Navigation must not overlap profile '+width);
   assert.ok(chip.y>=bar.y&&chip.y+chip.height<=bar.y+bar.height,'Header must fit '+width);
  }
  await page.goto(base+'/minha-conta.html',{waitUntil:'networkidle'});
  const banner=await page.locator('.banner').boundingBox(),account=await page.locator('#acc .acc-card').first().boundingBox();
  assert.ok(banner.height<160,'Banner too tall '+width+': '+banner.height);assert.ok(account.y<320,'Account too low '+width+': '+account.y);
  const frames=await page.evaluate(()=>{
   const large=getComputedStyle(document.querySelector('#acc-avatar')),small=getComputedStyle(document.querySelector('.user-chip img'));
   return {large:large.borderTopColor,small:small.borderTopColor,thickness:large.borderTopWidth,background:large.backgroundImage,fit:large.objectFit};
  });
  assert.equal(frames.large,frames.small,'Large profile frame must match header gold');
  assert.equal(frames.thickness,'2px');assert.equal(frames.background,'none');assert.equal(frames.fit,'contain');
  const title=await page.locator('.banner__title').boundingBox();assert.ok(title.height<50);
  results.push({width,threeChoicesVisible:true,arrowsAndKeyboard:true,alignedHeader:true,goldFramesMatch:true,bannerHeight:banner.height,accountTop:account.y});
 }
 await page.setViewportSize({width:1440,height:900});await page.goto(base+'/minha-conta.html',{waitUntil:'networkidle'});
 await page.screenshot({path:out+'account-first-screen.png'});await page.locator('.user-chip').screenshot({path:out+'header-aligned.png'});
 await page.goto(base+'/perfil.html',{waitUntil:'networkidle'});await page.locator('#profile-editor').screenshot({path:out+'picker-desktop.png'});
 await page.locator('#tab-cards').click();await page.locator('#profile-editor').screenshot({path:out+'picker-cards.png'});
 await page.setViewportSize({width:390,height:900});
 await page.waitForFunction(()=>{let t=document.querySelector('#profile-cards'),r=t.getBoundingClientRect();return [...t.children].filter(c=>{let b=c.getBoundingClientRect();return b.left>=r.left-2&&b.right<=r.right+2;}).length===3;});
 await expectRow('profile-cards',6);
 // Capture a viewport tall enough for the editor without resizing it mid-capture.
 await page.setViewportSize({width:390,height:1900});await page.evaluate(()=>scrollTo(0,0));
 await page.waitForFunction(()=>{let t=document.querySelector('#profile-cards'),r=t.getBoundingClientRect();return [...t.children].filter(c=>{let b=c.getBoundingClientRect();return b.left>=r.left-2&&b.right<=r.right+2;}).length===3;});
 await page.screenshot({path:out+'picker-mobile.png',clip:await page.locator('#profile-editor').boundingBox()});
 await expectRow('profile-cards',6);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('[data-carousel-controls="profile-cards"] [data-next]').click();
 await page.waitForFunction(()=>{let t=document.querySelector('#profile-cards');return t.scrollLeft>=t.scrollWidth-t.clientWidth-2;});
 await expectRow('profile-cards',6);await page.emulateMedia({reducedMotion:'reduce'});
 // Exercise catalogs larger than 40 entries before initialization, using the actual picker.
 const catalog=await readFile(new URL('../site/profile-catalog.js',import.meta.url),'utf8');
 const large=catalog+`\nconst originals=[...characters];for(let n=characters.length;n<45;n++)characters.push({...originals[n%originals.length],id:'fixture-'+n,name:'Treinador '+(n+1)});const backgrounds=[...cards];for(let n=cards.length;n<45;n++)cards.push({...backgrounds[n%backgrounds.length],id:'fixture-card-'+n,name:'Card '+(n+1)});`;
 await page.route('**/profile-catalog.js*',r=>r.fulfill({status:200,contentType:'text/javascript',body:large}));
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.goto(base+'/perfil.html',{waitUntil:'networkidle'});
  await expectRow('profile-characters',45);
  await page.locator('#profile-characters > button').first().focus();await page.keyboard.press('End');
  await expectRow('profile-characters',45);
  assert.equal(await page.locator('[data-carousel-controls="profile-characters"] [data-range]').textContent(),'43–45 de 45');
  await page.locator('#tab-cards').click();await expectRow('profile-cards',45);
  await page.locator('#profile-cards > button').first().focus();await page.keyboard.press('End');await expectRow('profile-cards',45);
  assert.equal(await page.locator('[data-carousel-controls="profile-cards"] [data-range]').textContent(),'43–45 de 45');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  results.push({width,catalog45:true,charactersAndCardsOneRow:true,lastOptionAccessible:true});
 }
 // Long user names remain contained within the framed area.
 await page.unroute('**/profile-catalog.js*');await page.setViewportSize({width:1024,height:900});await page.goto(base+'/perfil.html',{waitUntil:'networkidle'});
 await page.evaluate(()=>PWU.auth.set({...PWU.auth.user,name:'UmNomeDeUsuarioMuitoLongoParaTestarOEnquadramento'}));
 assert.ok(await page.locator('.user-chip span').evaluate(el=>el.clientWidth<el.scrollWidth&&getComputedStyle(el).textOverflow==='ellipsis'));
 assert.deepEqual(errors,[]);
 await writeFile(out+'carousel-qa.json',JSON.stringify({passed:true,results,longNameContained:true,errors,production_writes:false},null,2));
 console.log(JSON.stringify({passed:true,viewports:7,largeCatalogs:2,errors}));
}finally{await browser.close();}
