import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface Activity {
  id: string;
  type: 'invoice_created' | 'invoice_sent' | 'invoice_paid' | 'client_added';
  description: string;
  timestamp: string;
}

interface RecentActivityProps {
  activities?: Activity[];
  isLoading?: boolean;
}

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'invoice_paid',
    description: 'Invoice #INV-2024-001 was paid by Acme Corp',
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    type: 'invoice_sent',
    description: 'Invoice #INV-2024-005 was sent to TechStart Inc',
    timestamp: '4 hours ago',
  },
  {
    id: '3',
    type: 'client_added',
    description: 'New client "Design Studio" was added',
    timestamp: '1 day ago',
  },
  {
    id: '4',
    type: 'invoice_created',
    description: 'Invoice #INV-2024-006 was created',
    timestamp: '2 days ago',
  },
];

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'invoice_paid':
      return (
        <div className="p-2 bg-green-100 rounded-lg">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    case 'invoice_sent':
      return (
        <div className="p-2 bg-blue-100 rounded-lg">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
      );
    case 'client_added':
      return (
        <div className="p-2 bg-purple-100 rounded-lg">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
      );
    case 'invoice_created':
      return (
        <div className="p-2 bg-yellow-100 rounded-lg">
          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      );
  }
};

export const RecentActivity = ({ activities, isLoading }: RecentActivityProps) => {
  const displayActivities = activities || mockActivities;

  if (isLoading) {
    return (
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              {getActivityIcon(activity.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
