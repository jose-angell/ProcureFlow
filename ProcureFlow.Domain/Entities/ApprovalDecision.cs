using ProcureFlow.Domain.Enums;

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
            Validate(purchaseRequestId, approverUserId, decision);
            Id = Guid.NewGuid();
            PurchaseRequestId = purchaseRequestId;
            ApproverUserId = approverUserId;
            Decision = decision;
            Comment = comment;
            DecidedAt = DateTime.UtcNow;
        }
        public void updateDecision(ApprovalDecisionType decision, string? comment)
        {
            Validate(PurchaseRequestId, ApproverUserId, decision);
            Decision = decision;
            Comment = comment;
            DecidedAt = DateTime.UtcNow;
        }
        private void Validate(Guid purchaseRequestId, Guid approverUserId, ApprovalDecisionType decision)
        {
            if (purchaseRequestId == Guid.Empty) throw new ArgumentException("Purchase request ID cannot be empty.", nameof(purchaseRequestId));
            if (approverUserId == Guid.Empty) throw new ArgumentException("Approver user ID cannot be empty.", nameof(approverUserId));
            if (!Enum.IsDefined(typeof(ApprovalDecisionType), decision)) throw new ArgumentException("Invalid approval decision type.", nameof(decision));
        }
    }
}
