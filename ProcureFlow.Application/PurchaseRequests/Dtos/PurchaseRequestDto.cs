using ProcureFlow.Domain.Enums;

namespace ProcureFlow.Application.PurchaseRequests.Dtos
{
    public class PurchaseRequestDto
    {
        public Guid Id { get; set; }
        public string RequestNumber { get; set; } = null!;
        public Guid RequestedByUserId { get; set; }
        public string RequestedByName { get; set; } = string.Empty;
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        public PurchaseRequestPriority Priority { get; set; }
        public PurchaseRequestStatus Status { get; set; }
        public string Justification { get; set; } = null!;
        public decimal TotalAmount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? RejectedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public int ItemsCount { get; set; } = 0;
        public DateTime? DecidedAt { get; set; }
        public string? DecisionComment { get; set; }
        public string? DecidedByName { get; set; }
    }
}
