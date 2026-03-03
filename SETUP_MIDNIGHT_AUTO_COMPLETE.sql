-- Set up automatic session completion at midnight
-- Sessions complete automatically, new session created on first access next day

-- STEP 1: Create function to complete all incomplete sessions
CREATE OR REPLACE FUNCTION complete_previous_day_sessions()
RETURNS void AS $$
DECLARE
  v_yesterday DATE;
BEGIN
  v_yesterday := CURRENT_DATE - INTERVAL '1 day';
  
  -- Mark all incomplete sessions from yesterday (or earlier) as complete
  UPDATE shift_sessions
  SET 
    is_complete = true,
    completed_at = (v_yesterday::timestamp + INTERVAL '23 hours 59 minutes')  -- Set to 11:59pm yesterday
  WHERE is_complete = false
    AND started_at::DATE < CURRENT_DATE;
    
  RAISE NOTICE 'Completed % sessions from previous days', (SELECT COUNT(*) FROM shift_sessions WHERE completed_at::DATE = v_yesterday);
END;
$$ LANGUAGE plpgsql;

-- STEP 2: Set up pg_cron to run this at midnight
-- NOTE: You need to enable pg_cron extension first in Supabase
-- Go to Database > Extensions > Enable "pg_cron"

-- Then run this to schedule the job:
SELECT cron.schedule(
  'complete-previous-sessions',  -- Job name
  '0 0 * * *',                   -- Cron expression: Every day at midnight (00:00)
  $$SELECT complete_previous_day_sessions()$$
);

-- STEP 3: Verify the cron job is scheduled
SELECT * FROM cron.job;

-- STEP 4: Test the function manually (don't run this unless testing)
-- SELECT complete_previous_day_sessions();

-- STEP 5: To remove the cron job (if needed):
-- SELECT cron.unschedule('complete-previous-sessions');

COMMENT ON FUNCTION complete_previous_day_sessions IS 'Automatically completes all incomplete sessions from previous days. Runs at midnight via pg_cron.';
