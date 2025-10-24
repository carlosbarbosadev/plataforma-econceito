import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import { useTheme, alpha as hexAlpha } from '@mui/material/styles';

import { fNumber } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  chart: {
    colors?: string[];
    categories?: string[];
    series: {
      name: string;
      data: number[];
    }[];
    options?: ChartOptions;
  };
};

export function AnalyticsWebsiteVisits({ title, subheader, chart, sx, ...other }: Props) {
  const theme = useTheme();

  const chartColors = chart.colors ?? [theme.palette.primary.dark, theme.palette.warning.main];

  const chartOptions = useChart({
    colors: chartColors,
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '60%',
      },
    },
    stroke: {
      show: false,
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      onItemHover: {
        highlightDataSeries: true,
      },
    },
    xaxis: {
      type: 'category',
      categories: chart.categories,
    },
    yaxis: {
      labels: {
        formatter: (value) => fNumber(value),
      },
    },
    tooltip: {
      y: {
        formatter: (value) => fNumber(value),
      },
    },
    ...chart.options,
  });

  return (
    <Card
      sx={{
        borderRadius: '4px', // <-- ADD THIS LINE (adjust '8px' as needed)
        ...sx, // Keep passing down other styles from the parent
      }}
      {...other}
    >
      <CardHeader title={title} subheader={subheader} />

      <Chart
        type="bar"
        series={chart.series}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{
          pl: 1,
          py: 2.5,
          pr: 2.5,
          height: 364,
        }}
      />
    </Card>
  );
}
