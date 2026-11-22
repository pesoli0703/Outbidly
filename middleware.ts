import {createServerClient, type CookieOptions} from '@supabase/ssr';
import {NextResponse, type NextRequest} from 'next/server';

// Refresh an existing session before Server Components read it. No service-role key is used.
export async function middleware(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 let response=NextResponse.next({request});
 if(!url||!key||!request.cookies.getAll().some(c=>/^sb-.*-auth-token(?:\.\d+)?$/.test(c.name)))return response;
 const client=createServerClient(url,key,{cookies:{
  getAll(){return request.cookies.getAll()},
  setAll(values: {name:string;value:string;options:CookieOptions}[]){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options))}
 }});
 await client.auth.getUser();
 return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']};
