-- Ensure all existing users have corresponding entries in user_roles
INSERT INTO user_roles (user_id, role)
SELECT user_id, 'user'::app_role
FROM profiles 
WHERE user_id NOT IN (SELECT user_id FROM user_roles)
ON CONFLICT (user_id, role) DO NOTHING;