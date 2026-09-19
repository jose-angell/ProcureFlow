using System;
using System.Collections.Generic;
using System.Text;

namespace ProcureFlow.Domain.Enums
{
    public enum PurchaseRequestStatus
    {
        Draft = 1,
        Submitted = 2,
        Approved = 3,
        Rejected = 4,
        Cancelled = 5
    }
}
