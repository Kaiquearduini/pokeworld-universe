import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GamePixService} from '../site/api/_lib/game-pix-service.js';
globalThis.fetch=async()=>{throw new Error('No external requests allowed')};
const reference='12345678-1234-4234-8234-123456789012';
function fixture({total='150.00',paid,orderStatus='canceled',paymentStatus=orderStatus,credited=false,patch={}}={}){
 const local={reference,account_id:1,provider_order_id:'ORD'+'A'.repeat(26),amount_cents:15000,credits:168,fulfilled_at:credited?'fixture-receipt':null,state:'cancelling',cancel_requested:1};
 const payment={id:'PAY'+'A'.repeat(26),amount:'150.00',status:paymentStatus,status_detail:paymentStatus==='processed'?'accredited':'canceled_transaction',payment_method:{id:'pix',type:'bank_transfer'},...(paid===undefined?{}:{paid_amount:paid})};
 const remote={id:local.provider_order_id,type:'online',processing_mode:'automatic',country_code:'BRA',currency:'BRL',user_id:'123',integration_data:{application_id:'456'},external_reference:reference,total_amount:'150.00',total_paid_amount:total,status:orderStatus,status_detail:orderStatus==='processed'?'accredited':orderStatus,transactions:{payments:[payment]},...patch};
 const calls={credit:0,cancel:0,create:0,fetch:0,review:0};
 const api=new GamePixService({store:{read:async()=>({...local}),lease:async()=>'fixture-lease',release:async()=>{},update:async(_a,_r,_l,state)=>{local.state=state},balance:async()=>credited?168:0},provider:{fetch:async()=>{calls.fetch++;return structuredClone(remote)},cancel:async()=>{calls.cancel++;throw new Error('Unexpected cancel')},create:async()=>{calls.create++;throw new Error('Unexpected create')}},ledger:{bind:async()=>{},fulfill:async()=>{calls.credit++;return{credited:1}},flag:async()=>{calls.review++}},identity:{userId:'123',applicationId:'456'}});
 return {local,calls,read:()=>api.handle(1,{action:'status',orderId:reference})};
}
for(const paid of [undefined,null,'0.00','0',0])test('nominal total does not trap a cancelled order; paid='+String(paid),async()=>{
 const f=fixture({paid});assert.equal((await f.read()).order.status,'cancelled');assert.equal(f.local.state,'cancelled');assert.equal(f.calls.credit,0);assert.equal(f.calls.cancel,0);assert.equal(f.calls.create,0);
});
for(const paid of ['0.01','150.00','invalid','',false,-1])test('captured or malformed payment value cannot close order: '+String(paid),async()=>{
 const f=fixture({paid});assert.equal((await f.read()).order.status,'pending');assert.equal(f.local.state,'cancelling');assert.equal(f.calls.credit,0);
});
test('expired order with nominal total is terminal only with matching payment status',async()=>{
 const f=fixture({orderStatus:'expired'});assert.equal((await f.read()).order.status,'expired');assert.equal(f.calls.credit,0);
 const mismatch=fixture({orderStatus:'expired',paymentStatus:'action_required'});assert.equal((await mismatch.read()).order.status,'pending');
});
test('stored paid receipt wins over a cancelled provider response',async()=>{
 const f=fixture({credited:true});assert.equal((await f.read()).order.status,'paid');assert.equal(f.calls.fetch,0);assert.equal(f.calls.credit,0);
});
test('confirmed payment wins over the cancellation request',async()=>{
 const f=fixture({orderStatus:'processed',paid:'150.00'});assert.equal((await f.read()).order.status,'paid');assert.equal(f.calls.credit,1);assert.equal(f.calls.cancel,0);
});
test('refund remains under review and cannot be treated as cancellation',async()=>{
 const f=fixture({orderStatus:'refunded'});assert.equal((await f.read()).order.status,'review');assert.equal(f.calls.review,1);assert.equal(f.calls.credit,0);
});
for(const patch of [{user_id:'999'},{external_reference:'other'},{currency:'USD'},{total_amount:'1.00'}])test('identity and amount mismatch still rejected '+JSON.stringify(patch),async()=>{
 const f=fixture({patch});await assert.rejects(f.read(),/pix-order-mismatch/);assert.equal(f.calls.credit,0);assert.equal(f.local.state,'cancelling');
});
