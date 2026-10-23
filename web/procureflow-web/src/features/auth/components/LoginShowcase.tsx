import { BadgeCheck, Landmark, TrendingDown, Zap } from 'lucide-react'

function LoginShowcase() {
  return (
    <section
      aria-label="Presentación de ProcureFlow"
      className="relative hidden flex-col justify-between overflow-hidden bg-brand-panel p-8 text-white lg:flex lg:w-7/12"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-secondary/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-24 size-120 rounded-full bg-secondary/15 blur-3xl"
      />

      <div className="relative z-10 flex items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-secondary shadow-md">
          <Landmark className="size-5" aria-hidden="true" />
        </div>
        <div className="flex flex-col">
          <span className="font-heading text-xl leading-tight font-semibold tracking-tight">
            ProcureFlow
          </span>
          <span className="text-[11px] font-semibold tracking-wider text-white/60 uppercase">
            Governance Suite
          </span>
        </div>
      </div>

      <div className="relative z-10 my-auto max-w-2xl py-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-secondary/30 px-3 py-1 text-[11px] font-semibold text-blue-100">
          <BadgeCheck className="size-3.5" aria-hidden="true" />
          Control Presupuestario en Tiempo Real
        </div>
        <h1 className="mb-4 max-w-xl font-heading text-4xl leading-11 font-bold tracking-tight">
          Aprobaciones ágiles y compras corporativas bajo estricta gobernanza.
        </h1>
        <p className="mb-8 max-w-lg text-base text-white/60">
          Supervise órdenes de compra, automatice flujos contables y asegure el
          cumplimiento normativo de su organización en una sola plataforma
          unificada.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col justify-between rounded-xl bg-white/5 p-4 shadow-xl backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-white/60 uppercase">
                Orden #PO-2024-892
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-300" />
                Aprobada
              </span>
            </div>
            <div className="mb-1 font-heading text-xl font-semibold">
              $14,850.00{' '}
              <span className="text-xs font-normal text-white/60">USD</span>
            </div>
            <div className="mb-2 text-xs text-white/60">
              Suscripciones Cloud Empresariales AWS
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex -space-x-2">
                <div className="flex size-6 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold ring-2 ring-brand-panel">
                  CF
                </div>
                <div className="flex size-6 items-center justify-center rounded-full bg-slate-500 text-[10px] font-semibold ring-2 ring-brand-panel">
                  MR
                </div>
              </div>
              <span className="text-[11px] font-semibold text-blue-100">
                2/2 Firmas validadas
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-white/5 p-4 shadow-xl backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-white/60 uppercase">
                Métrica de Ciclo
              </span>
              <Zap className="size-4 text-blue-100" aria-hidden="true" />
            </div>
            <div>
              <div className="font-heading text-xl font-semibold">3.8 hrs</div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-emerald-300">
                <TrendingDown className="size-4" aria-hidden="true" />
                -64% tiempo promedio
              </div>
            </div>
            <div className="pt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-4/5 rounded-full bg-secondary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LoginShowcase
