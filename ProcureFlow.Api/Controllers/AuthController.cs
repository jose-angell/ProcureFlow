using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProcureFlow.Application.Auth;
using ProcureFlow.Application.Auth.Dtos;

namespace ProcureFlow.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    [AllowAnonymous]
    public class AuthController : ControllerBase
    {
        private readonly AuthUseCase _useCase;
        public AuthController(AuthUseCase useCase)
        {
            _useCase = useCase;
        }
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterCustomerRequest request)
        {
            var response = await _useCase.RegisterCustomer(request);
            return Ok(response);
        }
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginCustomerRequest request)
        {
            var response = await _useCase.Login(request);
            return Ok(response);
        }
    }
}
