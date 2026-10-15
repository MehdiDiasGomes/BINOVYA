import type { ReminderRunResult } from '@/types/email'

export default defineTask({
  meta: {
    name: 'booking:reminders',
    description: 'Email a reminder one or two days before each paid intervention',
  },
  run: async (): Promise<{ result: ReminderRunResult }> => ({
    result: await sendDueBookingReminders(createServiceRoleClient()),
  }),
})
