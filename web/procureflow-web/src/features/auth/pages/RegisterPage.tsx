import { Landmark } from 'lucide-react'
import { Link } from 'react-router'
import RegisterForm from '../components/RegisterForm'
import RegisterShowcase from '../components/RegisterShowcase'

function RegisterPage() {
  return (
    <main className="flex min-h-svh w-full items-stretch">
      <RegisterShowcase />

      <div className="flex w-full flex-col items-center justify-center bg-card px-4 py-8 sm:px-8 lg:w-7/12 lg:px-8">
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
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Crear cuenta empresarial
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingrese sus datos para activar el perfil de compras y delegación
              de órdenes.
            </p>
          </div>

          <RegisterForm />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{' '}
            <Link
              to="/login"
              className="font-medium text-secondary underline underline-offset-4 transition-colors hover:text-secondary/80"
            >
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

export default RegisterPage
