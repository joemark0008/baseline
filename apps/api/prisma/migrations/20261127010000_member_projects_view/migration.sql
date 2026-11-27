-- Feature 007: people invited into a project are usually in the built-in Member role; without
-- projects:view they could accept the invite and still not open the project. Admin holds every
-- permission by rule, so only Member needs the grant. Idempotent for databases seeded later.
INSERT INTO "role_grant" ("roleId", "area", "action")
SELECT 'role_member', 'projects', 'view'
WHERE EXISTS (SELECT 1 FROM "role" WHERE "id" = 'role_member')
ON CONFLICT DO NOTHING;
