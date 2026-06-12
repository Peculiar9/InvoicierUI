import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

ChartJS.register(ArcElement, Tooltip, Legend);

interface InvoiceStatusChartProps {
  data?: {
    paid: number;
    pending: number;
    overdue: number;
    draft: number;
  };
  isLoading?: boolean;
}

const defaultData = {
  paid: 45,
  pending: 30,
  overdue: 15,
  draft: 10,
};

export const InvoiceStatusChart = ({
  data = defaultData,
  isLoading,
}: InvoiceStatusChartProps) => {
  const chartData = {
    labels: ['Paid', 'Pending', 'Overdue', 'Draft'],
    datasets: [
      {
        data: [data.paid, data.pending, data.overdue, data.draft],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#6b7280'],
        borderWidth: 0,
        cutout: '70%',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1a1a2e',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        borderRadius: 8,
        callbacks: {
          label: (context: { label: string; parsed: number }) => {
            return `${context.label}: ${context.parsed}%`;
          },
        },
      },
    },
  };

  const statusItems = [
    { label: 'Paid', value: data.paid, color: 'bg-green-500' },
    { label: 'Pending', value: data.pending, color: 'bg-yellow-500' },
    { label: 'Overdue', value: data.overdue, color: 'bg-red-500' },
    { label: 'Draft', value: data.draft, color: 'bg-gray-500' },
  ];

  if (isLoading) {
    return (
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Invoice Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle>Invoice Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          <div className="w-48 h-48">
            <Doughnut data={chartData} options={options as never} />
          </div>
          <div className="flex-1 space-y-3">
            {statusItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
