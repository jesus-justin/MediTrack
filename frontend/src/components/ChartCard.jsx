import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  ArcElement,
  BarElement,
  Tooltip
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

export function LineChartCard({ title, labels = [], values = [] }) {
  return (
    <section className="card chart-card">
      <h3>{title}</h3>
      <Line
        data={{
          labels,
          datasets: [{ label: title, data: values, borderColor: '#0f4c81', backgroundColor: 'rgba(15,76,129,0.2)' }]
        }}
      />
    </section>
  );
}

export function BarChartCard({ title, labels = [], values = [] }) {
  return (
    <section className="card chart-card">
      <h3>{title}</h3>
      <Bar
        data={{
          labels,
          datasets: [{ label: title, data: values, backgroundColor: '#f2a65a' }]
        }}
      />
    </section>
  );
}

export function DoughnutChartCard({ title, labels = [], values = [] }) {
  return (
    <section className="card chart-card">
      <h3>{title}</h3>
      <Doughnut
        data={{
          labels,
          datasets: [{ data: values, backgroundColor: ['#0f4c81', '#f2a65a', '#66a182', '#bc4749', '#6b705c'] }]
        }}
      />
    </section>
  );
}
