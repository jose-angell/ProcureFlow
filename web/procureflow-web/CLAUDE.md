# ProcureFlow Frontend

## Stack
- React + TypeScript
- Vite
- shadcn/ui + Tailwind CSS
- React Router

## Arquitectura
- Organización por funcionalidades.
- Componentes base shadcn en src/components/ui.
- Componentes reutilizables propios en src/shared.
- Lógica específica dentro de src/features.

## TypeScript
- Definir tipos explícitos para contratos HTTP.
- Evitar el uso innecesario de any.
- Utilizar .tsx para componentes React.
- Utilizar .ts para lógica y tipos sin JSX.

## UI
- Usar componentes shadcn antes de crear equivalentes.
- Respetar las referencias visuales de Stitch.
- No copiar HTML estático como implementación final.
- Mantener componentes accesibles y responsive.

## Desarrollo con IA
- Leer la especificación antes de implementar.
- Proponer un plan técnico y esperar aprobación.
- Implementar tareas pequeñas y verificables.
- No agregar dependencias sin justificar su necesidad.
- Ejecutar la verificación de TypeScript y build.