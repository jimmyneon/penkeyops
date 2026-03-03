-- Debug: Why are only 24 tasks showing after End Day + refresh?

-- 1. Check all sessions for today
SELECT 
  id,
  started_at,
  completed_at,
  is_complete,
  shift_type,
  'Session ' || ROW_NUMBER() OVER (ORDER BY started_at) as session_number
FROM shift_sessions
WHERE started_at::DATE = CURRENT_DATE
ORDER BY started_at;

-- 2. For EACH session today, show task counts
SELECT 
  ss.id as session_id,
  ss.is_complete,
  t.name as template_name,
  COUNT(cr.id) as task_count,
  COUNT(cr.id) FILTER (WHERE cr.status = 'completed') as completed_count,
  COUNT(cr.id) FILTER (WHERE cr.status = 'pending') as pending_count
FROM shift_sessions ss
JOIN checklist_instances ci ON ci.shift_session_id = ss.id
JOIN templates t ON t.id = ci.template_id
LEFT JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
WHERE ss.started_at::DATE = CURRENT_DATE
GROUP BY ss.id, ss.is_complete, t.name
ORDER BY ss.started_at, t.name;

-- 3. Show which templates were instantiated for each session
SELECT 
  ss.id as session_id,
  ss.started_at,
  ss.is_complete,
  t.name as template_name,
  t.template_type,
  ci.id as instance_id
FROM shift_sessions ss
JOIN checklist_instances ci ON ci.shift_session_id = ss.id
JOIN templates t ON t.id = ci.template_id
WHERE ss.started_at::DATE = CURRENT_DATE
ORDER BY ss.started_at, t.name;

-- This will show if:
-- A) Multiple sessions exist for today
-- B) Which templates were loaded for each session
-- C) Why only 24 tasks appear (which template has 24 items?)
