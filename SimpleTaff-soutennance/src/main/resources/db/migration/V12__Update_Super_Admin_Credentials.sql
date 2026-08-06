-- Update the seeded super admin credentials for existing databases.
-- Password: St@ff-Super-2026!Q7
UPDATE utilisateur
SET email = 'superadmin.secure@simpletaff.com',
    mot_de_passe_hash = '$2a$10$NkwsQhJ9ZEC/GyHG8DNCVOQ0rY1/xGOi2uZRbRallW.3I1zASgbXG'
WHERE role = 'SUPER_ADMIN'
  AND email = 'superadmin@simpletaff.com';
