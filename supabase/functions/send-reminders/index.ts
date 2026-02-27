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

    const { data: overdueResults } = await supabase
      .from('checklist_results')
      .select(`
        *,
        template_items (
          title,
          due_time,
          grace_period_minutes,
          priority,
          is_critical
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

    let sentCount = 0

    for (const result of overdueResults) {
      const item = result.template_items
      if (!item?.due_time) continue

      const dueTime = new Date(`1970-01-01T${item.due_time}`)
      const gracePeriod = item.grace_period_minutes || 0
      dueTime.setMinutes(dueTime.getMinutes() + gracePeriod)

      const currentDateTime = new Date(`1970-01-01T${currentTime}`)

      if (currentDateTime > dueTime) {
        const userId = result.checklist_instances?.shift_sessions?.started_by
        if (!userId) continue

        const { data: lastNotification } = await supabase
          .from('notifications')
          .select('sent_at')
          .eq('user_id', userId)
          .eq('checklist_result_id', result.id)
          .order('sent_at', { ascending: false })
          .limit(1)
          .single()

        const hoursSinceLastNotification = lastNotification
          ? (now.getTime() - new Date(lastNotification.sent_at).getTime()) / (1000 * 60 * 60)
          : 999

        if (hoursSinceLastNotification < 1) continue

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
              checklist_result_id: result.id,
              notification_type: 'reminder',
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
