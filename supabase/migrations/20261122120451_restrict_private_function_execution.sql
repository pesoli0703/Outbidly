-- Supabase may grant function execution directly to anon/authenticated by default.
-- Remove anonymous access explicitly; the functions also check the current user internally.
revoke execute on function public.submit_business(text,text,text,text,text,text,text,text,text,text,text,text,text[]) from anon;
revoke execute on function public.review_business(uuid,text,text) from anon;
revoke execute on function public.manage_category(uuid,text,text,boolean,text) from anon;
revoke execute on function public.mark_notification_read(uuid) from anon;
