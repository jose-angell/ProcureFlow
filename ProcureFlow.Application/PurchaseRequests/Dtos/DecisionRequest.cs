using System.ComponentModel.DataAnnotations;

namespace ProcureFlow.Application.PurchaseRequests.Dtos
{
    public class DecisionRequest
    {
        [Required(ErrorMessage = "El ID del aprobador es requerido.")]
        public Guid? ApproverUserId { get; set; }

        [StringLength(1000, ErrorMessage = "Los comentarios no pueden tener mas de 1000 caracteres")]
        public string? Comments { get; set; }
    }
}
