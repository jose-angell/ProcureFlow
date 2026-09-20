using Microsoft.EntityFrameworkCore;
using ProcureFlow.Domain.Entities;

namespace ProcureFlow.Application.Abstractions.Persistence
{
    public interface IApplicationDbContext
    {
        DbSet<User> Users { get; }
        DbSet<Department> Departments { get; }
        DbSet<PurchaseRequest> PurchaseRequests { get; }
        DbSet<PurchaseRequestItem> PurchaseRequestItems { get; }
        DbSet<ApprovalDecision> ApprovalDecisions { get; }

        Task<int> SaveChangesAsync(
            CancellationToken cancellationToken = default);
    }
}
