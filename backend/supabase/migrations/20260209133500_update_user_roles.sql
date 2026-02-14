-- 2. Promote Warren to Super Admin
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'warrenmifsud@gmail.com';

-- 3. Promote Test User
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'warren709@gmail.com';
