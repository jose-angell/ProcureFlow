import { Link } from 'react-router'

function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="text-muted-foreground">
        La ruta que buscas no existe.
      </p>
      <Link to="/" className="text-sm font-medium underline underline-offset-4">
        Volver al inicio
      </Link>
    </main>
  )
}

export default NotFoundPage
