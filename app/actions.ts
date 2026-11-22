'use server';
import {redirect} from 'next/navigation';import {supabase} from '@/lib/supabase';import {slugify} from '@/lib/categories';
const text=(f:FormData,k:string)=>String(f.get(k)||'').trim();
export async function login(f:FormData){const db=await supabase();if(!db)redirect('/login?error=Service+not+configured');const {error}=await db.auth.signInWithPassword({email:text(f,'email'),password:text(f,'password')});if(error)redirect('/login?error='+encodeURIComponent(error.message));redirect('/dashboard')}
export async function register(f:FormData){const db=await supabase();if(!db)redirect('/register?error=Service+not+configured');const origin=process.env.NEXT_PUBLIC_APP_URL;if(!origin)redirect('/register?error=Application+URL+not+configured');const {error}=await db.auth.signUp({email:text(f,'email'),password:text(f,'password'),options:{emailRedirectTo:origin+'/auth/callback',data:{name:text(f,'name'),phone:text(f,'phone')}}});if(error)redirect('/register?error='+encodeURIComponent(error.message));redirect('/login?message=Check+your+email+to+confirm+your+account')}
export async function logout(){const db=await supabase();await db?.auth.signOut();redirect('/')}
export async function reset(f:FormData){const db=await supabase();if(!db||!process.env.NEXT_PUBLIC_APP_URL)redirect('/forgot-password?error=Service+not+configured');const {error}=await db.auth.resetPasswordForEmail(text(f,'email'),{redirectTo:process.env.NEXT_PUBLIC_APP_URL+'/auth/callback?next=/account/password'});if(error)redirect('/forgot-password?error='+encodeURIComponent(error.message));redirect('/forgot-password?message=If+the+account+exists%2C+check+your+email')}
export async function submitBusiness(f:FormData){const db=await supabase();if(!db)redirect('/dashboard?error=Service+not+configured');const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');const name=text(f,'name');const selected=f.getAll('categories').map(String);const website=text(f,'website');if(!name||!text(f,'description')||!text(f,'country')||!text(f,'city')||!text(f,'address')||!text(f,'business_type')||!text(f,'contact_name')||!text(f,'email')||!text(f,'phone')||!selected.length)redirect('/dashboard?error=Please+complete+all+required+fields');if(website&&!/^https?:\/\//i.test(website))redirect('/dashboard?error=Website+must+start+with+http+or+https');const logo=f.get('logo');if(!(logo instanceof File)||!logo.size||logo.size>2_000_000||!['image/png','image/jpeg','image/webp'].includes(logo.type))redirect('/dashboard?error=Please+upload+a+PNG%2C+JPEG+or+WebP+image+under+2MB');const path=`${user.id}/${crypto.randomUUID()}`;const upload=await db.storage.from('business-logos').upload(path,logo,{contentType:logo.type});if(upload.error)redirect('/dashboard?error='+encodeURIComponent(upload.error.message));const {data:publicUrl}=db.storage.from('business-logos').getPublicUrl(path);const {error}=await db.rpc('submit_business',{p_name:name,p_slug:slugify(name)+'-'+crypto.randomUUID().slice(0,8),p_description:text(f,'description'),p_country:text(f,'country'),p_city:text(f,'city'),p_address:text(f,'address'),p_type:text(f,'business_type'),p_contact:text(f,'contact_name'),p_email:text(f,'email'),p_phone:text(f,'phone'),p_website:website||null,p_logo:publicUrl.publicUrl,p_categories:selected});if(error)redirect('/dashboard?error='+encodeURIComponent(error.message));redirect('/dashboard?message=Business+submitted+for+review')}
export async function review(f:FormData){const db=await supabase();if(!db)redirect('/admin');const {error}=await db.rpc('review_business',{p_id:text(f,'id'),p_status:text(f,'status'),p_note:text(f,'note')});if(error)redirect('/admin?error='+encodeURIComponent(error.message));redirect('/admin?message=Review+recorded')}

export async function manageCategory(f:FormData){
 const db=await supabase();if(!db)redirect('/admin?error=Service+not+configured');
 const {error}=await db.rpc('manage_category',{p_id:text(f,'id')||null,p_name:text(f,'name'),p_description:text(f,'description'),p_active:text(f,'active')==='true',p_reason:text(f,'reason')});
 if(error)redirect('/admin?error='+encodeURIComponent(error.message));
 redirect('/admin?message=Category+change+recorded');
}
export async function markNotificationRead(f:FormData){
 const db=await supabase();if(!db)redirect('/login?error=Service+not+configured');
 const {error}=await db.rpc('mark_notification_read',{p_id:text(f,'id')});
 if(error)redirect('/dashboard?error='+encodeURIComponent(error.message));
 redirect('/dashboard#notifications');
}

export async function updateAccount(f:FormData){
 const db=await supabase();if(!db)redirect('/login?error=Service+not+configured');
 const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user)redirect('/login?error=Please+sign+in');
 const name=text(f,'name'),phone=text(f,'phone');
 if(name.length<2||name.length>100||!/^\+[1-9]\d{6,14}$/.test(phone))redirect('/account?error=Enter+a+name+and+an+international+phone+number+starting+with+%2B');
 const {error}=await db.auth.updateUser({data:{...user.user_metadata,name,phone}});
 if(error)redirect('/account?error='+encodeURIComponent(error.message));
 redirect('/account?message=Account+details+updated');
}
export async function changePassword(f:FormData){
 const db=await supabase();if(!db)redirect('/login?error=Service+not+configured');
 const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user)redirect('/login?error=Please+sign+in');
 const password=String(f.get('password')||''),confirm=String(f.get('confirm')||''),current=String(f.get('current')||'');
 if(!current||!user.email||password.length<8||password.length>128||password!==confirm)redirect('/account?error=Passwords+must+match+and+contain+at+least+8+characters');
 const {error:reauthError}=await db.auth.signInWithPassword({email:user.email,password:current});
 if(reauthError)redirect('/account?error=Current+password+could+not+be+verified');
 const {error}=await db.auth.updateUser({password});
 if(error)redirect('/account?error='+encodeURIComponent(error.message));
 redirect('/account?message=Password+updated');
}
