-- Get just the shift_type for this session
SELECT 
  shift_type,
  started_at,
  is_complete
FROM shift_sessions
WHERE id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59';
