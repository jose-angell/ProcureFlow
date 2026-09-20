using ProcureFlow.Domain.Exceptions;

namespace ProcureFlow.Domain.Entities
{
    public class PurchaseRequestItem
    {
        public Guid Id { get; private set; }
        public Guid PurchaseRequestId { get; private set; }
        public string Description { get; private set; } = null!;
        public int Quantity { get; private set; }
        public decimal UnitPrice { get; private set; }

        public PurchaseRequest PurchaseRequest { get; private set; } = null!;
        private PurchaseRequestItem() { }

        public PurchaseRequestItem(Guid purchaseRequestId, string description, int quantity, decimal unitPrice)
        {
            Validate(purchaseRequestId, description, quantity, unitPrice);
            Id = Guid.NewGuid();
            PurchaseRequestId = purchaseRequestId;
            Description = description;
            Quantity = quantity;
            UnitPrice = unitPrice;
        }
        public void Update(string description, int quantity, decimal unitPrice)
        {
            Validate(PurchaseRequestId, description, quantity, unitPrice);
            Description = description;
            Quantity = quantity;
            UnitPrice = unitPrice;
        }
        private void Validate(Guid purchaseRequestId, string description, int quantity, decimal unitPrice)
        {
            if (purchaseRequestId == Guid.Empty) throw new DomainException("El id de la solicitud de compra no puede ser vacio.");
            if (string.IsNullOrWhiteSpace(description)) 
                throw new DomainException("La descripción no puede ser null o estar vacia.");
            else if(description.Length > 500)
                throw new DomainException("La descripción no puede tener más de 500 caracteres.");
            if (quantity <= 0) throw new DomainException("La cantidad debe ser mayor a cero.");
            if (unitPrice < 0) throw new DomainException("El precio unitario no puede ser negativo.");
        }
    }
}
