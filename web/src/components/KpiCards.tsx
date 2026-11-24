import { formatIndex, formatMoney, HEALTH_LABEL, indexHealth, type Health } from "../format";
import type { Kpis } from "../types";

interface KpiCardsProps {
  kpis: Kpis;
}

interface CardProps {
  label: string;
  hint: string;
  value: string;
  health?: Health;
}

function Card({ label, hint, value, health = "none" }: CardProps) {
  return (
    <article className="kpi" data-health={health}>
      <h3 className="kpi__label">{label}</h3>
      <p className="kpi__value">{value}</p>
      <p className="kpi__hint">{hint}</p>
      {health !== "none" && <p className="kpi__status">{HEALTH_LABEL[health]}</p>}
    </article>
  );
}

export function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <section className="kpis" aria-label="Key performance indicators">
      <Card
        label="SPI"
        hint="Schedule performance: earned ÷ planned"
        value={formatIndex(kpis.spi)}
        health={indexHealth(kpis.spi)}
      />
      <Card
        label="CPI"
        hint="Cost performance: earned ÷ actual cost"
        value={formatIndex(kpis.cpi)}
        health={indexHealth(kpis.cpi)}
      />
      <Card label="Schedule variance" hint="Earned − planned value" value={formatMoney(kpis.sv)} />
      <Card label="Cost variance" hint="Earned value − actual cost" value={formatMoney(kpis.cv)} />
      <Card
        label="Forecast at completion"
        hint={`Budget at completion ${formatMoney(kpis.bac)}`}
        value={formatMoney(kpis.eac)}
      />
    </section>
  );
}
