import Link from 'next/link';
import {verifyTestPayment} from './actions';
export const metadata={title:'Test payment return',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{tx_ref?:string;transaction_id?:string}>}){
 const q=await searchParams;
 return <div className="wrap page-body"><div className="content-card form-card"><h1>Test checkout returned</h1><p>Returning from Flutterwave does not confirm a payment. Check the transaction with Flutterwave below. Test payments never affect public rankings.</p>
 {q.tx_ref&&q.transaction_id?<form action={verifyTestPayment}><input type="hidden" name="reference" value={q.tx_ref}/><input type="hidden" name="transaction_id" value={q.transaction_id}/><button className="button dark">Verify test payment</button></form>:<p>No transaction details were returned. Check your test payment history.</p>}
 <p><Link href="/sandbox-checkout">Back to test checkout</Link></p></div></div>
}
