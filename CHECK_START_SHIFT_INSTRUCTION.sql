-- Check if Start Shift task has duplicate text in instruction field
SELECT 
  title,
  instruction,
  description
FROM template_items
WHERE title LIKE '%Start Shift%';
