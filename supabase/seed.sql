-- ===========================================================================
-- Optional seed / admin helpers. Run AFTER schema.sql and AFTER you have
-- created auth users in the Supabase dashboard (Authentication -> Users).
-- ===========================================================================

-- 1) Promote an existing user to MANAGER (they can see /admin).
--    Replace the email with the manager's login email.
update public.users
set role = 'manager'
where email = 'manager@labiq.in';

-- 2) Set a friendly display name / phone for a user.
update public.users
set name = 'Rajesh Kumar', phone = '9000000001'
where email = 'rajesh@labiq.in';

-- 3) (Optional) A few starter sites so the salesperson search has data.
--    created_by is left null here; edit to a real user id if you want.
insert into public.sites (name, site_type, city, district, state)
values
  ('KIMS Hospital', 'Hospital', 'Amalapuram', 'Konaseema', 'Andhra Pradesh'),
  ('ABC Diagnostics', 'Diagnostic Centre', 'Kakinada', 'Kakinada', 'Andhra Pradesh'),
  ('Sri Sai Hospital', 'Hospital', 'Rajahmundry', 'East Godavari', 'Andhra Pradesh')
on conflict do nothing;
