EXPLAIN ANALYZE
SELECT id, title, description, date, label, participant_count, type, department, status, reminder_sent, created_by_admin_id, created_at, updated_at
FROM events
WHERE date >= $1 AND date < $2 AND is_active = true
ORDER BY date ASC
LIMIT $3 OFFSET $4;

EXPLAIN ANALYZE
SELECT id, email, role, is_active, created_at, updated_at
FROM admin_users
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

EXPLAIN ANALYZE
SELECT activity_logs.id, activity_logs.admin_id, activity_logs.action, activity_logs.entity_type, activity_logs.entity_id, activity_logs.meta, activity_logs.created_at, admin_users.email AS admin_email
FROM activity_logs
LEFT JOIN admin_users ON activity_logs.admin_id = admin_users.id
ORDER BY activity_logs.created_at DESC
LIMIT $1 OFFSET $2;

EXPLAIN ANALYZE
SELECT id, admin_id, action, entity_type, entity_id, payload, is_read, created_at
FROM notifications
WHERE admin_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
