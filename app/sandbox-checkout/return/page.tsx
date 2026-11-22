import Link from 'next/link';
export const metadata={title:'Test payment return',robots:{index:false,follow:false}};
export default function Page(){return <div className="wrap page-body"><h1>Test checkout returned</h1><p>Returning from Flutterwave does not confirm a payment. Test payment status must be verified separately; sandbox transactions do not affect rankings.</p><Link href="/dashboard">Back to dashboard</Link></div>}
