using ProcureFlow.Domain.Enums;

namespace ProcureFlow.Application.PurchaseRequests.Dtos
{
    public class PurchaseRequestDto
    {
        public Guid Id { get; set; }
        public string RequestNumber { get; set; } = null!;
        public Guid RequestedByUserId { get; set; }
        public Guid DepartmentId { get; set; }
        public PurchaseRequestPriority Priority { get; set; }
        public PurchaseRequestStatus Status { get; set; }
        public string Justification { get; set; } = null!;
        public decimal TotalAmount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? RejectedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
    }
}
