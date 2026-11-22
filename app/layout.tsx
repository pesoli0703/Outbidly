import type {Metadata} from 'next';
import Header from '@/components/header';
import Footer from '@/components/footer';
import './globals.css';
export const metadata:Metadata={title:{default:'OUTBIDLY | Make your business visible',template:'%s | OUTBIDLY'},description:'Discover businesses and explore transparent, payment-based leaderboards around the world.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Header/><main>{children}</main><Footer/></body></html>}
