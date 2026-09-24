using System;
using System.Collections.Generic;
using System.Text;

namespace ProcureFlow.Application.PurchaseRequests.Dtos
{
    public class PurchaseRequestQuery
    {
        public string? RequestNumber { get; set; }
        public string? Department { get; set; }
        public DateTime? CreatedDateFrom { get; set; }
        public DateTime? CreatedDateTo { get; set; }
        public string? Status { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
