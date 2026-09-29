using ProcureFlow.Domain.Entities;
using ProcureFlow.Domain.Enums;
using ProcureFlow.Domain.Exceptions;

namespace ProcureFlow.Tests.Domain
{
    public class PurchaseRequestTests
    {
        [Fact]
        public void Submit_ShouldThrow_WhenRequestHasNoItems()
        {
            // Arrange
            var purchaseRequest = new PurchaseRequest(
                "PR-2026-000001",
                Guid.NewGuid(),
                Guid.NewGuid(),
                PurchaseRequestPriority.Medium,
                "Compra de equipos");

            // Act
            Action act = () => purchaseRequest.Submit();

            // Assert
            Assert.Throws<DomainException>(act);

            Assert.Equal(
                PurchaseRequestStatus.Draft,
                purchaseRequest.Status);
        }

        [Fact]
        public void Approve_ShouldCreateApprovalDecision()
        {
            // Arrange
            var purchaseRequest = new PurchaseRequest(
                "PR-2026-000002",
                Guid.NewGuid(),
                Guid.NewGuid(),
                PurchaseRequestPriority.High,
                "Compra de equipos");

            purchaseRequest.AddItem(
                "Laptop",
                2,
                15000m);

            purchaseRequest.Submit();

            var approverId = Guid.NewGuid();

            // Act
            purchaseRequest.Approve(
                approverId,
                "Compra autorizada");

            // Assert
            Assert.Equal(
                PurchaseRequestStatus.Approved,
                purchaseRequest.Status);

            Assert.NotNull(purchaseRequest.ApprovalDecision);

            Assert.Equal(
                ApprovalDecisionType.Approved,
                purchaseRequest.ApprovalDecision.Decision);

            Assert.Equal(
                approverId,
                purchaseRequest.ApprovalDecision.ApproverUserId);
        }
    } 
}
