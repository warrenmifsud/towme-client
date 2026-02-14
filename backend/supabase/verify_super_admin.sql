
-- Verify Super Admin Role
SELECT id, email, role, raw_user_meta_data 
FROM auth.users 
WHERE email = 'warrenmifsud@gmail.com';

-- Verify Profile Role (if separate)
SELECT id, email, role 
FROM public.profiles 
WHERE email = 'warrenmifsud@gmail.com';
