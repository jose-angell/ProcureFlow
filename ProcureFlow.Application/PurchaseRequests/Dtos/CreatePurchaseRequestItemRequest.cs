using System.ComponentModel.DataAnnotations;

namespace ProcureFlow.Application.PurchaseRequests.Dtos
{
    public class CreatePurchaseRequestItemRequest
    {
        [Required(ErrorMessage = "La descripción es requerida.")]
        [StringLength(500, ErrorMessage = "La descripción no puede tener mas de 500 caracteres")]
        public string? Description { get; set; } = null!;

        [Required(ErrorMessage = "La cantidad es requerida.")]
        public int? Quantity { get; set; }

        [Required(ErrorMessage = "El precio unitario es requerido.")]
        public decimal? UnitPrice { get; set; }
    }
}
