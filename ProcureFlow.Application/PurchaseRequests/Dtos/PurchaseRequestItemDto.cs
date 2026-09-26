using System;
using System.Collections.Generic;
using System.Text;

namespace ProcureFlow.Application.PurchaseRequests.Dtos
{
    public class PurchaseRequestItemDto
    {
        public Guid Id { get; set; }
        public Guid PurchaseRequestId { get; set; }
        public string Description { get; set; } = null!;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }
}
