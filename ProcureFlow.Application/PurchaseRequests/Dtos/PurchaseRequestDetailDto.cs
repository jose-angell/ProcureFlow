namespace ProcureFlow.Application.PurchaseRequests.Dtos
{
    public class PurchaseRequestDetailDto : PurchaseRequestDto
    {
        public List<PurchaseRequestItemDto> Items { get; set; } = new();
    }
}
