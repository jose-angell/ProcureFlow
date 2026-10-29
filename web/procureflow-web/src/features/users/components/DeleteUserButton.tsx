import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { deleteUser } from '../api/users'
import type { User } from '../types'

interface DeleteUserButtonProps {
  user: Pick<User, 'id' | 'fullName'>
  onDeleted: (fullName: string) => void
  onError: (error: unknown) => void
}

/** Botón papelera de una fila. Pide confirmación antes de llamar a la API. */
function DeleteUserButton({ user, onDeleted, onError }: DeleteUserButtonProps) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  function handleOpenChange(nextOpen: boolean) {
    // Mientras la petición está en curso el diálogo no se puede cerrar.
    if (!isDeleting) setOpen(nextOpen)
  }

  async function handleConfirm() {
    setIsDeleting(true)

    try {
      await deleteUser(user.id)
      setOpen(false)
      onDeleted(user.fullName)
    } catch (error) {
      setOpen(false)
      onError(error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Eliminar ${user.fullName}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 aria-hidden="true" />
      </Button>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar al usuario {user.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            {/* Button y no AlertDialogAction: este último cierra el diálogo al pulsarlo. */}
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleConfirm}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default DeleteUserButton
