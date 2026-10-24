namespace ProcureFlow.Application.PurchaseRequests.Dtos
{
    public class DepartmentRequestCountDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        public int Count { get; set; }
    }
}
