-- Allow authenticated administrators to inspect inactive categories as well.
create policy "admin read all categories" on public.categories for select to authenticated using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Changes to categories are made through an audited, administrator-only function.
create function public.manage_category(p_id uuid, p_name text, p_description text, p_active boolean, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare category_id uuid;
begin
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then raise exception 'Unauthorized'; end if;
  if p_name is null or length(trim(p_name)) < 2 or length(trim(p_name)) > 120 or p_active is null or p_reason is null or length(trim(p_reason)) = 0 then raise exception 'Invalid category or reason'; end if;
  if p_id is null then
    insert into public.categories(name, description, active) values (trim(p_name), nullif(trim(p_description), ''), p_active) returning id into category_id;
  else
    update public.categories set name = trim(p_name), description = nullif(trim(p_description), ''), active = p_active where id = p_id returning id into category_id;
    if category_id is null then raise exception 'Category not found'; end if;
  end if;
  insert into public.audit_logs(actor_id, action, subject_id, reason) values (auth.uid(), case when p_id is null then 'category_created' else 'category_updated' end, category_id, trim(p_reason));
  return category_id;
end $$;
revoke all on function public.manage_category(uuid,text,text,boolean,text) from public;
grant execute on function public.manage_category(uuid,text,text,boolean,text) to authenticated;

-- Marking read is limited to the recipient and cannot modify the message itself.
create function public.mark_notification_read(p_id uuid) returns void language sql security definer set search_path = public as $$
  update public.notifications set read_at = coalesce(read_at, now()) where id = p_id and user_id = auth.uid();
$$;
revoke all on function public.mark_notification_read(uuid) from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;
