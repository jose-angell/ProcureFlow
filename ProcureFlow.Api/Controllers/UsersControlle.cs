using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProcureFlow.Application.Users;
using ProcureFlow.Application.Users.Dtos;

namespace ProcureFlow.Api.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly UserUseCase _useCase;
        public UsersController(UserUseCase useCase)
        {
            _useCase = useCase;
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var user = await _useCase.GetMe();
            return Ok(user);
        }
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateMyProfileRequest request)
        {
            await _useCase.UpdateMe(request);
            return NoContent();
        }
        [HttpPut("me/password")]
        public async Task<IActionResult> ChangeMyPassword([FromBody] ChangeMyPasswordRequest request)
        {
            var response = await _useCase.ChangeMyPassword(request);
            return Ok(response);
        }
        [Authorize(Roles = "Admin")]
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (id == Guid.Empty) return BadRequest("El id es invalido");
            var user = await _useCase.GetById(id);
            return Ok(user);
        }
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
        {
            var result = await _useCase.Create(request);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        [Authorize(Roles = "Admin")]
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateUserRequest request)
        {
            if (id == Guid.Empty) return BadRequest("El id es invalido");
            await _useCase.Update(id, request);
            return NoContent();
        }
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete([FromRoute] Guid id)
        {
            if (id == Guid.Empty) return BadRequest("El id es invalido");
            await _useCase.Delete(id);
            return NoContent();
        }
        [Authorize(Roles = "Admin")]
        [HttpPatch("{id:guid}/activate")]
        public async Task<IActionResult> Activate([FromRoute] Guid id)
        {
            if (id == Guid.Empty) return BadRequest("El id es invalido");
            await _useCase.Activate(id);
            return NoContent();
        }
        [Authorize(Roles = "Admin")]
        [HttpPatch("{id:guid}/deactivate")]
        public async Task<IActionResult> deactivate([FromRoute] Guid id)
        {
            if (id == Guid.Empty) return BadRequest("El id es invalido");
            await _useCase.Deactivate(id);
            return NoContent();
        }
        [Authorize(Roles = "Admin")]
        [HttpPatch("{id:guid}/change-department/{departmentId:guid}")]
        public async Task<IActionResult> ChangeDepartment([FromRoute] Guid id, [FromRoute] Guid departmentId)
        {
            if (id == Guid.Empty) return BadRequest("El id es invalido");
            await _useCase.ChangeDepartment(id, departmentId);
            return NoContent();
        }
        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] UserQuery query)
        {
            var user = await _useCase.GetAll(query);
            return Ok(user);
        }
    }
}
