// Real MariaDB and HTTP, restricted user, isolated loopback fixtures only.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import mysql from '../site/node_modules/mysql2/promise.js';
import {createApp} from '../runtime/server.mjs';
import handler from '../site/api/account.js';
import {sign} from '../site/api/_lib/session.js';
import {pool,q} from '../site/api/_lib/gamedb.js';
import {characters,cards,appearanceUrl,fromAvatar} from '../site/profile-catalog.js';
assert.equal(process.env.GAME_DB_HOST,'127.0.0.1');
assert.equal(process.env.GAME_DB_PORT,'13316');
assert.match(process.env.GAME_DB_NAME,/^pwu_profile_test_[a-f0-9]{10}$/);
assert.match(process.env.GAME_DB_USER,/^pwu_prof_[a-f0-9]{8}$/);
const admin=await mysql.createConnection({host:'127.0.0.1',port:13316,user:'root',password:process.env.PROFILE_LOCAL_ADMIN,ssl:{ca:process.env.GAME_DB_SSL_CA,rejectUnauthorized:true}});
const server=createApp({apiEnabled:true,emailAuthEnabled:true,loadHandler:async()=>handler});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/api/account',token=sign(101,Date.now(),true),checks=[];
async function request(body,auth=token){
 const headers={Origin:'https://pokeworlduniverse.com','Content-Type':'application/json'};
 if(auth)headers.Authorization='Bearer '+auth;
 const res=await fetch(url,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined});
 return {status:res.status,data:await res.json()};
}
try {
 const input={action:'appearance',characterId:'personagem-1',cardId:'agua'};
 assert.equal((await request(input)).status,500);
 checks.push('Reproduced production permission failure against real MariaDB');
 await admin.query(`GRANT UPDATE(image) ON ${process.env.GAME_DB_NAME}.accounts TO '${process.env.GAME_DB_USER}'@'127.0.0.1'`);
 // Table/column privilege changes apply to the same existing pooled connection.
 for(const c of characters)for(const b of cards){
  const res=await request({...input,characterId:c.id,cardId:b.id,account_id:202,diamond_points:999999});
  assert.equal(res.status,200);assert.equal(res.data.avatar,appearanceUrl(c.id,b.id));
  const fresh=await request();assert.equal(fresh.status,200);assert.equal(fresh.data.avatar,res.data.avatar);
  assert.equal(fresh.data.diamondPoints,17);
 }
 checks.push('All 30 combinations commit and reload through real authenticated HTTP and database');
 assert.deepEqual(await q('SELECT id,image,diamond_points FROM accounts WHERE id=202'),[{id:202,image:'unchanged.png',diamond_points:33}]);
 checks.push('Forged account ID and balance fields do not alter the other account or balance');
 await assert.rejects(q('UPDATE accounts SET diamond_points=diamond_points WHERE id=-1'),error=>error.code==='ER_COLUMNACCESS_DENIED_ERROR');
 await assert.rejects(q('UPDATE accounts SET password=password WHERE id=-1'),error=>error.code==='ER_COLUMNACCESS_DENIED_ERROR');
 checks.push('Balance and password direct updates remain forbidden after the image grant');
 assert.equal((await request(input,null)).status,401);
 assert.equal((await request(input,sign(101,Date.now(),false))).status,401);
 assert.equal((await request({...input,cardId:'../../invalid'})).status,400);
 checks.push('Unauthenticated, missing-MFA and invalid-card requests are rejected');
 assert.deepEqual(fromAvatar('assets/img/profile/portraits/4215a26d3fb6-v1/personagem-1--agua.svg'),{characterId:'personagem-1',cardId:'agua'});
 checks.push('Previously saved square choices map to the new vertical catalog');
 const result={passed:true,checks,combinations:30,real_database:true,real_http:true,loopback_only:true,production_writes:false};
 await writeFile(new URL('profile-db-result.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} finally {
 await new Promise(resolve=>server.close(resolve));await pool().end();await admin.end();
}
