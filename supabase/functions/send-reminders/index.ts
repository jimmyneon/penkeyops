import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5)
    let sentCount = 0

    // ============================================
    // STEP 1: Check for due-soon tasks (15 min warning)
    // ============================================
    const { data: dueSoonResults } = await supabase
      .from('checklist_results')
      .select(`
        *,
        template_items (
          title,
          due_time,
          priority,
          is_critical,
          no_notifications
        ),
        checklist_instances (
          shift_session_id,
          shift_sessions (
            site_id,
            started_by
          )
        )
      `)
      .eq('status', 'pending')
      .not('template_items.due_time', 'is', null)

    if (dueSoonResults) {
      for (const result of dueSoonResults) {
        const item = result.template_items
        if (!item?.due_time || item.no_notifications) continue

        const dueTime = new Date(`1970-01-01T${item.due_time}`)
        const warningTime = new Date(dueTime)
        warningTime.setMinutes(warningTime.getMinutes() - 15) // 15 min before due

        const currentDateTime = new Date(`1970-01-01T${currentTime}`)

        // Check if we're in the warning window (15 min before due, but not yet due)
        if (currentDateTime >= warningTime && currentDateTime < dueTime) {
          const userId = result.checklist_instances?.shift_sessions?.started_by
          if (!userId) continue

          // SINGLE-FIRE: Check if we've already sent a due_soon notification
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('related_id', result.id)
            .eq('notification_type', 'due_soon')
            .single()

          if (existingNotification) continue

          const { data: subscription } = await supabase
            .from('push_subscriptions')
            .select('subscription')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single()

          if (subscription) {
            const payload = {
              title: `Coming Up: ${item.title}`,
              body: `This ${item.priority} task is due in 15 minutes.`,
              data: {
                url: '/',
                resultId: result.id
              }
            }

            try {
              await fetch(`${supabaseUrl}/functions/v1/send-push`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`
                },
                body: JSON.stringify({
                  subscription: subscription.subscription,
                  payload
                })
              })

              await supabase.from('notifications').insert({
                user_id: userId,
                related_id: result.id,
                notification_type: 'due_soon',
                title: payload.title,
                message: payload.body,
                sent_at: now.toISOString()
              })

              sentCount++
            } catch (error) {
              console.error('Failed to send due-soon notification:', error)
            }
          }
        }
      }
    }

    // ============================================
    // STEP 2: Check for overdue tasks
    // ============================================
    const { data: overdueResults } = await supabase
      .from('checklist_results')
      .select(`
        *,
        template_items (
          title,
          due_time,
          grace_period_minutes,
          priority,
          is_critical,
          no_notifications
        ),
        checklist_instances (
          shift_session_id,
          shift_sessions (
            site_id,
            started_by
          )
        )
      `)
      .eq('status', 'pending')
      .not('template_items.due_time', 'is', null)

    if (!overdueResults) {
      return new Response(JSON.stringify({ checked: 0, sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    for (const result of overdueResults) {
      const item = result.template_items
      if (!item?.due_time || item.no_notifications) continue

      const dueTime = new Date(`1970-01-01T${item.due_time}`)
      const gracePeriod = item.grace_period_minutes || 0
      dueTime.setMinutes(dueTime.getMinutes() + gracePeriod)

      const currentDateTime = new Date(`1970-01-01T${currentTime}`)

      if (currentDateTime > dueTime) {
        const userId = result.checklist_instances?.shift_sessions?.started_by
        if (!userId) continue

        // SINGLE-FIRE LOGIC: Check if we've already sent an overdue notification for this task
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('related_id', result.id)
          .eq('notification_type', 'task_overdue')
          .single()

        // If notification already sent for this task instance, skip
        if (existingNotification) continue

        const { data: subscription } = await supabase
          .from('push_subscriptions')
          .select('subscription')
          .eq('user_id', userId)
          .eq('is_active', true)
          .single()

        if (subscription) {
          const payload = {
            title: `Overdue Task: ${item.title}`,
            body: `This ${item.priority} task is now overdue. Please complete it as soon as possible.`,
            data: {
              url: '/',
              resultId: result.id
            }
          }

          try {
            await fetch(`${supabaseUrl}/functions/v1/send-push`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({
                subscription: subscription.subscription,
                payload
              })
            })

            await supabase.from('notifications').insert({
              user_id: userId,
              related_id: result.id,
              notification_type: 'task_overdue',
              title: payload.title,
              message: payload.body,
              sent_at: now.toISOString()
            })

            sentCount++
          } catch (error) {
            console.error('Failed to send notification:', error)
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ checked: overdueResults.length, sent: sentCount }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
