import { Landmark } from 'lucide-react'
import { Link } from 'react-router'
import LoginForm from '../components/LoginForm'
import LoginShowcase from '../components/LoginShowcase'

function LoginPage() {
  return (
    <main className="flex min-h-svh w-full items-stretch">
      <LoginShowcase />

      <div className="flex w-full flex-col items-center justify-center bg-card px-4 py-8 sm:px-8 lg:w-5/12 lg:px-8">
        <div className="flex w-full max-w-md flex-col">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Landmark className="size-4.5" aria-hidden="true" />
            </div>
            <span className="font-heading text-xl font-semibold tracking-tight">
              ProcureFlow
            </span>
          </div>

          <div className="mb-6">
            <div className="mb-1 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-secondary"
              />
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Portal de Control Financiero
              </span>
            </div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Iniciar sesión
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingrese sus credenciales corporativas para acceder al panel de
              aprobaciones y compras.
            </p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link
              to="/register"
              className="font-medium text-secondary underline underline-offset-4 transition-colors hover:text-secondary/80"
            >
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

export default LoginPage
