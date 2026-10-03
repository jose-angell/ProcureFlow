using System.ComponentModel.DataAnnotations;

namespace ProcureFlow.Application.PurchaseRequests.Dtos
{
    public class DecisionRequest
    {

        [StringLength(1000, ErrorMessage = "Los comentarios no pueden tener mas de 1000 caracteres")]
        public string? Comments { get; set; }
    }
}
