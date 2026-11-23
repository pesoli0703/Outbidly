-- Add social media fields to businesses for those without websites
alter table public.businesses
add column if not exists instagram text,
add column if not exists twitter text,
add column if not exists facebook text,
add column if not exists whatsapp_phone text;

-- Drop existing view so we can recreate it with the new columns
drop view if exists public.public_businesses;
