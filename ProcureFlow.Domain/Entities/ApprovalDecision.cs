using ProcureFlow.Domain.Enums;
using ProcureFlow.Domain.Exceptions;

namespace ProcureFlow.Domain.Entities
{
    public class ApprovalDecision
    {
        public Guid Id { get; private set; }
        public Guid PurchaseRequestId { get; private set; }
        public Guid ApproverUserId { get; private set; }
        public ApprovalDecisionType Decision { get; private set; }
        public string? Comment { get; private set; }
        public DateTime DecidedAt { get; private set; }

        public PurchaseRequest PurchaseRequest { get; private set; } = null!;
        public User ApproverUser { get; private set; } = null!;
        private ApprovalDecision() { }

        public ApprovalDecision(Guid purchaseRequestId, Guid approverUserId, ApprovalDecisionType decision, string? comment)
        {
            Validate(purchaseRequestId, approverUserId, decision, comment);
            Id = Guid.NewGuid();
            PurchaseRequestId = purchaseRequestId;
            ApproverUserId = approverUserId;
            Decision = decision;
            Comment = comment;
            DecidedAt = DateTime.UtcNow;
        }

        private void Validate(Guid purchaseRequestId, Guid approverUserId, ApprovalDecisionType decision, string? comment)
        {
            if (purchaseRequestId == Guid.Empty) throw new DomainException("El ID de la solicitud de compra no puede estar vacío.");
            if (approverUserId == Guid.Empty) throw new DomainException("El ID del usuario aprobador no puede estar vacío.");
            if (!Enum.IsDefined(typeof(ApprovalDecisionType), decision)) throw new DomainException("Tipo de decisión de aprobación inválida.");
            if (decision == ApprovalDecisionType.Rejected && string.IsNullOrWhiteSpace(comment))
                throw new DomainException("Se requiere un comentario cuando se rechaza una decisión de aprobación.");
            if (comment != null && comment.Length > 1000)
                throw new DomainException("El comentario no puede exceder 1000 caracteres.");
        }
    }
}
