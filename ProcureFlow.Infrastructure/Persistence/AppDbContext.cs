using Microsoft.EntityFrameworkCore;
using ProcureFlow.Application.Abstractions.Persistence;
using ProcureFlow.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace ProcureFlow.Infrastructure.Persistence
{
    public class AppDbContext: DbContext, IApplicationDbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Department> Departments => Set<Department>();
        public DbSet<PurchaseRequest> PurchaseRequests => Set<PurchaseRequest>();
        public DbSet<PurchaseRequestItem> PurchaseRequestItems => Set<PurchaseRequestItem>();
        public DbSet<ApprovalDecision> ApprovalDecisions => Set<ApprovalDecision>();
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        }
    }
}
