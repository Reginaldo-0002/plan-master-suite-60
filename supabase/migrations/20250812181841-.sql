-- Transform user f1c49adc-db5e-44d3-861a-59f9192a9068 into admin
INSERT INTO public.user_roles (user_id, role, assigned_by)
VALUES ('f1c49adc-db5e-44d3-861a-59f9192a9068', 'admin', auth.uid())
ON CONFLICT (user_id, role) DO NOTHING;

-- Also update the profile role field for consistency
UPDATE public.profiles 
SET role = 'admin'
WHERE user_id = 'f1c49adc-db5e-44d3-861a-59f9192a9068';