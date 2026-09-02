import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/mockApi'
import { cn } from '@/lib/cn'
import { Card } from '@/components/ui'

export function Notifications() {
  const { data } = useQuery({ queryKey: ['notifs'], queryFn: api.listNotifications })
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Notifications</h1>
      <Card>
        <ul className="divide-y divide-gray-100">
          {(data ?? []).map((n) => (
            <li key={n.id} className="flex items-start gap-3 py-4">
              <span
                className={cn(
                  'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                  n.isRead ? 'bg-gray-300' : 'bg-ai',
                )}
              />
              <div>
                <p className="text-sm font-medium text-primary">{n.title}</p>
                <p className="text-sm text-gray-500">{n.body}</p>
                <p className="mt-1 text-xs text-gray-400">{n.at}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
