UPDATE utilisateur 
SET mot_de_passe_hash = '$2a$10$F0qnAsJML5OdYsYuYhe5OudXyhBbEfqBLOpOZ2VB7TCmKyVa76vau'
WHERE email IN (
    'admin@simpletaff.com',
    'coord@simpletaff.com',
    'employeur@simpletaff.com'
);

UPDATE utilisateur
SET email = 'superadmin.secure@simpletaff.com',
    mot_de_passe_hash = '$2a$10$NkwsQhJ9ZEC/GyHG8DNCVOQ0rY1/xGOi2uZRbRallW.3I1zASgbXG'
WHERE role = 'SUPER_ADMIN';
