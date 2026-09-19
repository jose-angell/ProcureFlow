using ProcureFlow.Domain.Exceptions;

namespace ProcureFlow.Domain.Entities
{
    public class PurchaseRequestItem
    {
        public Guid Id { get; private set; }
        public Guid PurchaseRequestId { get; private set; }
        public string Description { get; private set; } = null!;
        public int Quantity { get; private set; }
        public decimal EstimatedUnitPrice { get; private set; }

        private PurchaseRequestItem() { }

        public PurchaseRequestItem(Guid purchaseRequestId, string description, int quantity, decimal estimatedUnitPrice)
        {
            Validate(purchaseRequestId, description, quantity, estimatedUnitPrice);
            Id = Guid.NewGuid();
            PurchaseRequestId = purchaseRequestId;
            Description = description;
            Quantity = quantity;
            EstimatedUnitPrice = estimatedUnitPrice;
        }
        public void Update(string description, int quantity, decimal estimatedUnitPrice)
        {
            Validate(PurchaseRequestId, description, quantity, estimatedUnitPrice);
            Description = description;
            Quantity = quantity;
            EstimatedUnitPrice = estimatedUnitPrice;
        }
        private void Validate(Guid purchaseRequestId, string description, int quantity, decimal estimatedUnitPrice)
        {
            if (purchaseRequestId == Guid.Empty) throw new DomainException("El id de la solicitud de compra no puede ser vacio.");
            if (string.IsNullOrWhiteSpace(description)) throw new DomainException("La descripción no puede ser null o estar vacia.");
            if (quantity <= 0) throw new DomainException("La cantidad debe ser mayor a cero.");
            if (estimatedUnitPrice < 0) throw new DomainException("El precio unitario estimado no puede ser negativo.");
        }
    }
}
