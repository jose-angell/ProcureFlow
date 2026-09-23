using ProcureFlow.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace ProcureFlow.Application.PurchaseRequests.Dtos
{
    public class CreatePurchaseRequestRequest
    {
        [Required(ErrorMessage = "La prioridad es requerida.")]
        public PurchaseRequestPriority? Priority { get; set; }
        [Required(ErrorMessage = "La justificación es requerida.")]
        public string? Justification { get; set; }
    }
}
