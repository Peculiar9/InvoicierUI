import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RevenueChartProps {
  data?: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
    }[];
  };
  isLoading?: boolean;
}

const defaultData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  datasets: [
    {
      label: 'Revenue',
      data: [4500, 5200, 4800, 6100, 5800, 7200, 6800, 7500, 8100, 7900, 8500, 9200],
    },
  ],
};

export const RevenueChart = ({ data = defaultData, isLoading }: RevenueChartProps) => {
  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((dataset) => ({
      ...dataset,
      fill: true,
      backgroundColor: 'rgba(146, 78, 233, 0.1)',
      borderColor: '#924ee9',
      borderWidth: 2,
      pointBackgroundColor: '#924ee9',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.4,
    })),
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
        displayColors: false,
        callbacks: {
          label: (context: { parsed: { y: number } }) => {
            return `$${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280',
        },
      },
      y: {
        grid: {
          color: '#f3f4f6',
        },
        ticks: {
          color: '#6b7280',
          callback: (value: number | string) => `$${Number(value).toLocaleString()}`,
        },
      },
    },
  };

  if (isLoading) {
    return (
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bordered">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Revenue Overview</CardTitle>
        <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="year">This Year</option>
          <option value="month">This Month</option>
          <option value="week">This Week</option>
        </select>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <Line data={chartData} options={options as never} />
        </div>
      </CardContent>
    </Card>
  );
};
