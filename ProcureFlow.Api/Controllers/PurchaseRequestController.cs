using Microsoft.AspNetCore.Mvc;
using ProcureFlow.Application.PurchaseRequests;
using ProcureFlow.Application.PurchaseRequests.Dtos;
using System.Reflection.Metadata.Ecma335;

namespace ProcureFlow.Api.Controllers
{
    [ApiController]
    [Route("api/purchases")]
    public class PurchaseRequestController: ControllerBase
    {
        private readonly PurchaseRequestUseCase _useCase;
        public PurchaseRequestController(PurchaseRequestUseCase useCase)
        {
            _useCase = useCase;
        }
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById([FromRoute] Guid id)
        {
            if (id == Guid.Empty) return BadRequest("El id es invalido");
            var result = await _useCase.GetById(id);
            return Ok(result);
        }
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePurchaseRequestRequest request)
        {
            var result = await _useCase.Create(request);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        [HttpGet("item/{id:guid}")]
        public async Task<IActionResult> GetItemById([FromRoute] Guid id)
        {
            if (id == Guid.Empty) return BadRequest("El id es invalido");
            var result = await _useCase.GetItemById(id);
            return Ok(result);
        }
        [HttpPost("{id:guid}/add-item")]
        public async Task<IActionResult> AddItem([FromRoute] Guid id, [FromRoute] CreatePurchaseRequestItemRequest request)
        {
            if (id == Guid.Empty) return BadRequest("El id es invalido");
            var result = await _useCase.AddItem(id, request);
            return CreatedAtAction(nameof(GetItemById), new { id = result.Id }, result);
        }
        [HttpPut("{id:guid}/update-item/{itemid:guid}")]
        public async Task<IActionResult> UpdateItem([FromRoute] Guid id, [FromRoute] Guid itemid, [FromBody] UpdatePurchaseRequestItemRequest request)
        {
            if (id == Guid.Empty) return BadRequest("El id de la solicitud es invalido");
            if (itemid == Guid.Empty) return BadRequest("El id del item es invalido");
            await _useCase.UpdateItem(id, itemid, request);
            return NoContent();
        }
        [HttpPut("{id:guid}/delete-item/{itemid:guid}")]
        public async Task<IActionResult> DeleteItem([FromRoute] Guid id, [FromRoute] Guid itemid)
        {
            if (id == Guid.Empty) return BadRequest("El id de la solicitud es invalido");
            if (itemid == Guid.Empty) return BadRequest("El id del item es invalido");
            await _useCase.DeleteItem(id, itemid);
            return NoContent();
        }
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update([FromRoute] Guid id ,[FromBody] UpdatePurchaseRequestRequest request)
        {
            await _useCase.Update(id, request);
            return NoContent();
        }
        [HttpPatch("{id:guid}/cancel")]
        public async Task<IActionResult> Cancel([FromRoute] Guid id)
        {
            if (id == Guid.Empty) return BadRequest("El id es invalido");
            await _useCase.Cancel(id);
            return NoContent();
        }
        [HttpPatch("{id:guid}/submit")]
        public async Task<IActionResult> Submit([FromRoute] Guid id)
        {
            if (id == Guid.Empty) return BadRequest("El id es invalido");
            await _useCase.Submit(id);
            return NoContent();
        }

    }
}
