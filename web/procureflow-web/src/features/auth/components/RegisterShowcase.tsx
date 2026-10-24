import { Landmark, ShieldCheck } from 'lucide-react'

function RegisterShowcase() {
  return (
    <section
      aria-label="Presentación de ProcureFlow"
      className="relative hidden flex-col justify-between overflow-hidden bg-brand-panel p-8 text-white lg:flex lg:w-5/12"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-secondary/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-12 size-48 rounded-full bg-secondary/15 blur-2xl"
      />

      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-secondary shadow-md">
            <Landmark className="size-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-xl leading-tight font-semibold tracking-tight">
              ProcureFlow
            </span>
            <span className="text-[11px] font-semibold tracking-wider text-white/60 uppercase">
              Enterprise Suite
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold tracking-widest text-emerald-300 uppercase">
            Control &amp; Cumplimiento
          </span>
          <h2 className="font-heading text-3xl leading-tight font-semibold tracking-tight">
            Plataforma de gobernanza de compras e itinerarios de aprobación.
          </h2>
          <p className="text-sm leading-relaxed text-white/60">
            Centralice requisiciones, audite contratos SaaS en tiempo real y
            aplique matrices de autoridad presupuestaria con trazabilidad
            contable total.
          </p>
        </div>
      </div>

      <div className="relative z-10 my-6 flex flex-col gap-2 rounded-lg bg-white/5 p-4 backdrop-blur-md">
        <span className="text-[11px] font-semibold tracking-wider text-blue-100 uppercase">
          Auditoría en tiempo real
        </span>
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-blue-100">
            <ShieldCheck className="size-4.5" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium">
              Aprovisionamiento Blindado
            </span>
            <span className="text-[11px] text-white/60">
              Políticas de gastos y límites asignados por centro de costos
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default RegisterShowcase
