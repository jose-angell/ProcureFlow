import { useState, type KeyboardEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/shared/lib/format'
import { getItemSubtotal, getItemsTotal } from '../purchaseRequestItems'
import type { PurchaseRequestItemBody } from '../types'

export interface DraftItem {
  /** Clave local para React. */
  key: string
  /** `null` = aún no existe en la API. */
  id: string | null
  description: string
  quantity: number
  unitPrice: number
}

interface PurchaseRequestItemsEditorProps {
  items: DraftItem[]
  onAdd: (item: PurchaseRequestItemBody) => void
  onRemove: (item: DraftItem) => void
  /** Bloquea añadir y quitar (p. ej. mientras se guarda). */
  disabled?: boolean
}

function PurchaseRequestItemsEditor({
  items,
  onAdd,
  onRemove,
  disabled = false,
}: PurchaseRequestItemsEditorProps) {
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')

  const parsedQuantity = quantity.trim() === '' ? Number.NaN : Number(quantity)
  const parsedUnitPrice = unitPrice.trim() === '' ? Number.NaN : Number(unitPrice)
  const canAdd =
    !disabled &&
    description.trim() !== '' &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity >= 1 &&
    Number.isFinite(parsedUnitPrice) &&
    parsedUnitPrice >= 0

  function handleAdd() {
    if (!canAdd) return

    onAdd({
      description: description.trim(),
      quantity: parsedQuantity,
      unitPrice: parsedUnitPrice,
    })
    setDescription('')
    setQuantity('1')
    setUnitPrice('')
  }

  // Enter añade el ítem; no hay <form> porque el editor vive dentro del formulario del modal.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    handleAdd()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-base font-semibold">Partidas y artículos</h3>
        <Badge variant="secondary" aria-live="polite">
          {items.length} {items.length === 1 ? 'artículo añadido' : 'artículos añadidos'}
        </Badge>
      </div>

      <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/40 p-3.5">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Añadir nuevo ítem
        </p>
        <div className="grid grid-cols-1 items-end gap-2.5 sm:grid-cols-12">
          <div className="flex flex-col gap-1 sm:col-span-6">
            <Label htmlFor="item-description" className="text-xs text-muted-foreground">
              Descripción / Concepto
            </Label>
            <Input
              id="item-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ej. Licencia software, Monitor..."
              maxLength={500}
              disabled={disabled}
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label htmlFor="item-quantity" className="text-xs text-muted-foreground">
              Cantidad
            </Label>
            <Input
              id="item-quantity"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label htmlFor="item-unit-price" className="text-xs text-muted-foreground">
              Precio unitario
            </Label>
            <Input
              id="item-unit-price"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="button" className="w-full" disabled={!canAdd} onClick={handleAdd}>
              <Plus aria-hidden="true" />
              Añadir
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead scope="col" className="text-xs font-semibold tracking-wider uppercase">
                Descripción
              </TableHead>
              <TableHead
                scope="col"
                className="w-20 text-center text-xs font-semibold tracking-wider uppercase"
              >
                Cant.
              </TableHead>
              <TableHead
                scope="col"
                className="w-28 text-right text-xs font-semibold tracking-wider uppercase"
              >
                Precio Ud.
              </TableHead>
              <TableHead
                scope="col"
                className="w-28 text-right text-xs font-semibold tracking-wider uppercase"
              >
                Subtotal
              </TableHead>
              <TableHead scope="col" className="w-14">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  Aún no hay ítems. Añade al menos uno para enviar la solicitud.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.key}>
                  <TableCell className="font-medium whitespace-normal">
                    {item.description}
                  </TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(getItemSubtotal(item))}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar ${item.description}`}
                      disabled={disabled}
                      onClick={() => onRemove(item)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell
                colSpan={3}
                className="text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase"
              >
                Importe total estimado
              </TableCell>
              <TableCell className="text-right text-base font-bold" aria-live="polite">
                {formatCurrency(getItemsTotal(items))}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  )
}

export default PurchaseRequestItemsEditor
