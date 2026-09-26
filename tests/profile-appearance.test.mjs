import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import * as catalog from '../site/profile-catalog.js';

async function harness({id=51, fail=false}={}) {
  const writes=[]; let image='assets/img/art/leon.png';
  const unexpected=async()=>{throw new Error('unexpected dependency called');};
  const mocks={
    'crypto':{default:crypto},
    '../profile-catalog.js':catalog,
    './_lib/gamedb.js':{gameConfigured:()=>true,q:async()=>[],one:async()=>({id,name:'Tester',email:'test@example.invalid',image,diamond_points:123}),run:async(sql,params)=>{if(fail)throw new Error('db unavailable');writes.push({sql,params});image=params[0];return {affectedRows:1};},tableExists:()=>true,tx:unexpected},
    './_lib/session.js':{sign:unexpected,accountFromRequest:async()=>id,hashSenha:unexpected},
    './_lib/mail.js':{mailConfigured:()=>false},
    './_lib/email-auth.js':{authError:(status,message)=>Object.assign(new Error(message),{status,authPublic:true}),sameSecret:unexpected,limitAuth:unexpected,issueCode:unexpected,consumeCode:unexpected},
    './_lib/characters.js':{createCharacter:unexpected},
    './_lib/site-totp.js':{totpRequired:()=>true,totpRecord:async()=>({enabled:1}),setupTotp:unexpected,consumeTotp:unexpected}
  };
  const context=vm.createContext({Buffer,URL,Date,console:{error(){}}});
  const module=new vm.SourceTextModule(await readFile(new URL('../site/api/account.js',import.meta.url),'utf8'),{context});
  await module.link(spec=>{const exports=mocks[spec];assert.ok(exports,spec);return new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v);},{context});});
  await module.evaluate();
  return {writes,async request(body,options={}) {
    const res={code:200,status(code){this.code=code;return this;},json(data){this.body=data;return this;}};
    await module.namespace.default({method:'POST',headers:{},body,...options},res);return res;
  }};
}
test('unauthenticated profile update never writes',async()=>{
  const h=await harness({id:null});const r=await h.request({action:'appearance',characterId:'personagem-1',cardId:'agua'});
  assert.equal(r.code,401);assert.equal(h.writes.length,0);
});
test('all 30 combinations update only the authenticated account with one atomic statement',async()=>{
  const h=await harness();
  for(const c of catalog.characters)for(const card of catalog.cards){
    const before=h.writes.length;
    const r=await h.request({action:'appearance',characterId:c.id,cardId:card.id,account_id:999,id:999,credits:999999});
    assert.equal(r.code,200);assert.equal(h.writes.length,before+1);
    assert.equal(h.writes.at(-1).sql,'UPDATE accounts SET image = ? WHERE id = ?');
    assert.equal(h.writes.at(-1).params[1],51);
    assert.equal(r.body.avatar,catalog.appearanceUrl(c.id,card.id));
    assert.ok(r.body.avatar.length<255);
    const file=await readFile(new URL('../site/'+r.body.avatar,import.meta.url),'utf8');
    assert.ok(file.includes('data:image/png;base64,'));assert.ok(!/https?:\/\/[^w]|<script|onload=|onerror=/i.test(file));
    assert.deepEqual(catalog.fromAvatar(r.body.avatar),{characterId:c.id,cardId:card.id});
  }
});
test('malformed and tampered choices cannot become a path or SQL input',async()=>{
  const h=await harness();
  for(const bad of [null,undefined,1,true,[],{},'','LEON','__proto__','constructor','../leon','leon--agua','<svg onload=alert(1)>',"'; DROP TABLE accounts;--",'https://evil.invalid/a.png','a'.repeat(20000)]) {
    for(const field of ['characterId','cardId']) {
      const r=await h.request({action:'appearance',characterId:'personagem-1',cardId:'agua',[field]:bad});
      assert.equal(r.code,400);
    }
  }
  assert.equal(h.writes.length,0);
});
test('preview read-only and wrong methods never change appearance',async()=>{
  const h=await harness();const body={action:'appearance',characterId:'personagem-1',cardId:'agua'};
  assert.equal((await h.request(body,{previewReadOnly:true})).code,403);
  assert.equal((await h.request(body,{method:'DELETE'})).code,405);
  assert.equal(h.writes.length,0);
});
test('storage failure reports failure, not a saved result',async()=>{
  const h=await harness({fail:true});const r=await h.request({action:'appearance',characterId:'personagem-1',cardId:'agua'});
  assert.equal(r.code,500);assert.equal(r.body.ok,undefined);assert.equal(h.writes.length,0);
});
test('saved appearance is returned by the existing authenticated account read',async()=>{
  const h=await harness();await h.request({action:'appearance',characterId:'personagem-2',cardId:'psiquico'});
  const r=await h.request({}, {method:'GET'});
  assert.equal(r.code,200);assert.equal(r.body.avatar,catalog.appearanceUrl('personagem-2','psiquico'));assert.equal(r.body.coins,123);
});
test('legacy avatar selection remains compatible',async()=>{
  const h=await harness();const r=await h.request({action:'avatar',avatar:'assets/img/art/leon.png'});
  assert.equal(r.code,200);assert.equal(r.body.avatar,'assets/img/art/leon.png');
  assert.equal(catalog.fromAvatar(r.body.avatar),null);
});

test('retired characters cannot be selected; saved legacy files remain available', async () => {
  const h=await harness();
  for(const id of ['leon','ash','treinadora','treinadora-azul','treinadora-amarela']) {
    assert.equal((await h.request({action:'appearance',characterId:id,cardId:'agua'})).code,400);
    assert.equal(catalog.fromAvatar(`assets/img/profile/portraits/4215a26d3fb6-v2/${id}--agua.svg`),null);
    assert.ok((await readFile(new URL(`../site/assets/img/profile/portraits/4215a26d3fb6-v2/${id}--agua.svg`,import.meta.url))).length>0);
  }
  assert.equal(h.writes.length,0);
});
test('header faces preserve the chosen card and compatibility with earlier saved versions', async () => {
  for (const c of catalog.characters) for (const b of catalog.cards) {
    const face = catalog.faceUrl(c.id,b.id);
    assert.equal(catalog.headerAvatarUrl(catalog.appearanceUrl(c.id,b.id)),face);
    assert.equal(catalog.headerAvatarUrl(`assets/img/profile/portraits/4215a26d3fb6-v2/${c.id}--${b.id}.svg`),face);
    assert.ok((await readFile(new URL('../site/'+face,import.meta.url),'utf8')).includes('viewBox="0 0 160 160"'));
  }
  assert.equal(catalog.headerAvatarUrl('https://example.invalid/avatar.png'),'https://example.invalid/avatar.png');
});
