namespace ProcureFlow.Application.PurchaseRequests.Dtos
{
    public class PurchaseRequestSummaryDto
    {
        public int Total { get; set; }
        public int Draft { get; set; }
        public int Submitted { get; set; }
        public int Approved { get; set; }
        public int Rejected { get; set; }
        public int Cancelled { get; set; }
        public decimal TotalAmount { get; set; }
        public List<DepartmentRequestCountDto> ByDepartment { get; set; } = [];
    }
}
