SELECT au.id, au.email, pp.role 
FROM auth.users au 
LEFT JOIN public.profiles pp ON au.id = pp.id 
LIMIT 10;
