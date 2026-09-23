using ProcureFlow.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace ProcureFlow.Application.PurchaseRequests.Dtos
{
    public class UpdateurchaseRequestRequest
    {
        [Required(ErrorMessage = "La prioridad es requerida.")]
        public PurchaseRequestPriority? Priority { get; set; }

        [Required(ErrorMessage = "La justificación es requerida.")]
        [StringLength(1000, ErrorMessage = "La justificación no puede tener mas de 1000 caracteres")]
        public string? Justification { get; set; }
    }
}
