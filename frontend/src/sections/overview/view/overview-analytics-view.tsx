import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import Box from '@mui/material/Box';
import { Paper } from '@mui/material';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import api from 'src/services/api';
import { DashboardContent } from 'src/layouts/dashboard';
import { _posts, _tasks, _traffic, _timeline } from 'src/_mock';

import { AnalyticsNews } from '../analytics-news';
import { AnalyticsTasks } from '../analytics-tasks';
import { AnalyticsCurrentVisits } from '../analytics-current-visits';
import { AnalyticsOrderTimeline } from '../analytics-order-timeline';
import { AnalyticsWebsiteVisits } from '../analytics-website-visits';
import { AnalyticsWidgetSummary } from '../analytics-widget-summary';
import { AnalyticsTrafficBySite } from '../analytics-traffic-by-site';
import { AnalyticsCurrentSubject } from '../analytics-current-subject';
import { AnalyticsConversionRates } from '../analytics-conversion-rates';


// ----------------------------------------------------------------------

function getGreeting() {
  const currentHour = new Date().getHours();

  if (currentHour >= 6 && currentHour < 12) {
    return 'Bom dia';
  }
  else if (currentHour >= 12 && currentHour < 18) {
    return 'Boa tarde';
  }
  else {
    return 'Boa noite';
  }
}

export function OverviewAnalyticsView() {
  const { t } = useTranslation();

  const saudacao = getGreeting();
  const userDataString = localStorage.getItem('userData');
  const nomeCompleto = userDataString ? JSON.parse(userDataString).nome : 'Bem-vindo(a)';
  const primeiroNome = nomeCompleto.split(" ")[0];

  const hoje = new Date()
  const opcoesDeData = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  } as const;

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", opcoesDeData).format(hoje);
  const capitalizar = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
  const textoDaData = capitalizar(dataFormatada);

  const [vendasMes, setVendasMes] = useState(0);
  const [vendasAno, setVendasAno] = useState(0);
  const [metasMes, setMetasMes] = useState(0);
  const [pedidosAbertos, setPedidosAbertos] = useState(0);
  const [comparativoAnual, setComparativoAnual] = useState({ categories: [], series: [] });
  const [produtosMaisVendidos, setProdutosMaisVendidos] = useState({ series: [] });

  useEffect(() => {
    const carregarDadosDoPainel = async () => {
      try {
        console.log("Buscando todos os dados do painel no backend...");
        const resposta = await api.get("/api/dashboard/all");
        const dados = resposta.data;

        if (dados.metricas) {
          setVendasMes(dados.metricas.vendasMes);
          setVendasAno(dados.metricas.vendasAno);
          setPedidosAbertos(dados.metricas.pedidosAbertos);
          setMetasMes(dados.metricas.metaMes);
        }

        if (dados.comparativoAnual && dados.comparativoAnual.chart) {
          setComparativoAnual(dados.comparativoAnual.chart);
        }

        if (dados.produtosMaisVendidos && dados.produtosMaisVendidos.chart) {
          setProdutosMaisVendidos(dados.produtosMaisVendidos.chart);
        }

      } catch (error) {
        console.error("Erro ao buscar dados consolidados do painel:", error);
      }
    };

    carregarDadosDoPainel();
  }, []);

  console.log('Dados para o gráfico de pizza:', produtosMaisVendidos)

  return (
    <DashboardContent maxWidth="xl" sx={{ px: 5 }}>
      <Paper
        elevation={4}
        sx={{
          p: 3,
          mt: 5,
          mb: 5,
          maxWidth: "500px",
          borderRadius: "16px",
          background: 'linear-gradient(135deg, #2453dc 0%, #577CFF 100%)'
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold", color: "white" }}>
          {`${saudacao}, ${primeiroNome}`}
        </Typography>
        <Typography variant="subtitle1" sx={{ mt: 0.5, color: 'white' }}>
          {textoDaData}
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticsWidgetSummary
            title="Vendas do mês"
            percent={0}
            total={vendasMes}
            icon={<img alt="Vendas do mês" src="/assets/icons/glass/basket-shopping.svg" />}
            chart={{
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
              series: [22, 8, 35, 50, 82, 84, 77, 12],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticsWidgetSummary
            title="Vendas do ano"
            percent={0}
            total={vendasAno}
            color="secondary"
            icon={<img alt="Vendas do ano" src="/assets/icons/glass/cart-check.svg" />}
            chart={{
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
              series: [56, 47, 40, 62, 73, 30, 23, 54],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticsWidgetSummary
            title="Metas do mês"
            percent={0}
            total={metasMes}
            color="warning"
            icon={<img alt="Metas do mês" src="/assets/icons/glass/check-double.svg" />}
            chart={{
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
              series: [40, 70, 50, 28, 70, 75, 7, 64],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticsWidgetSummary
            title="Pedidos em aberto"
            percent={0}
            total={pedidosAbertos}
            color="error"
            icon={<img alt="Pedidos em aberto" src="/assets/icons/glass/list-check.svg" />}
            chart={{
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
              series: [56, 30, 23, 54, 47, 40, 62, 73],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          {produtosMaisVendidos.series.length > 0 ? (
            <AnalyticsCurrentVisits
              title="Produtos mais vendidos"
              chart={produtosMaisVendidos}
            />
          ) : (
            <Paper
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '16px',
              }}
            >
              <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
                Não há dados de produtos mais vendidos
              </Typography>
            </Paper>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <AnalyticsWebsiteVisits
            title="Comparativo anual de vendas"
            subheader="Vendas mensais do ano atual vs. ano anterior"
            chart={comparativoAnual}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <AnalyticsConversionRates
            title={t("dashboard8.conversionRates")}
            subheader="(+43%) than last year"
            chart={{
              categories: ['Italy', 'Japan', 'China', 'Canada', 'France'],
              series: [
                { name: '2022', data: [44, 55, 41, 64, 22] },
                { name: '2023', data: [53, 32, 33, 52, 13] },
              ],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AnalyticsCurrentSubject
            title={t("dashboard9.currentSubject")}
            chart={{
              categories: ['English', 'History', 'Physics', 'Geography', 'Chinese', 'Math'],
              series: [
                { name: 'Série 1', data: [80, 50, 30, 40, 100, 20] },
                { name: 'Série 2', data: [20, 30, 40, 80, 20, 80] },
                { name: 'Série 3', data: [44, 76, 78, 13, 43, 10] },
              ],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <AnalyticsNews title={t("dashboard10.news")} list={_posts.slice(0, 5)} />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AnalyticsOrderTimeline title={t("dashboard1.orderTimeLine")} list={_timeline} />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AnalyticsTrafficBySite title={t("dashboard11.trafficBySite")} list={_traffic} />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <AnalyticsTasks title={t("dashboard12.tasks")} list={_tasks} />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
