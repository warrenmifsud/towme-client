
-- Enable RLS
ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Allow Public Insertion (Application Submission)
CREATE POLICY "Public can submit applications" 
ON public.driver_applications 
FOR INSERT 
TO public, anon 
WITH CHECK (true);

-- Policy: Super Admin Only Select
CREATE POLICY "Super Admins can view applications" 
ON public.driver_applications 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- Policy: Super Admin Only Update
CREATE POLICY "Super Admins can update applications" 
ON public.driver_applications 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- Policy: Super Admin Only Delete
CREATE POLICY "Super Admins can delete applications" 
ON public.driver_applications 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);
