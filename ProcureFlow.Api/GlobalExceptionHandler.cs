using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ProcureFlow.Application.Exceptions;
using ProcureFlow.Domain.Exceptions;
using System.Diagnostics;
using System.Text.Json;

namespace ProcureFlow.Api
{
    public class GlobalExceptionHandler : IExceptionHandler
    {
        private readonly ILogger<GlobalExceptionHandler> _logger;
        private readonly IHostEnvironment _env;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IHostEnvironment env)
        {
            _logger = logger;
            _env = env;
        }

        public async ValueTask<bool> TryHandleAsync(
            HttpContext httpContext,
            Exception exception,
            CancellationToken cancellationToken)
        {
            var traceId = Activity.Current?.Id ?? httpContext.TraceIdentifier;

            // 1. Mapeo ordenado de específico a general
            var (statusCode, title, detail) = exception switch
            {
                UnauthorizedException ex => (StatusCodes.Status401Unauthorized, "No autorizado", ex.Message),
                ForbiddenException ex => (StatusCodes.Status403Forbidden, "Acceso denegado", ex.Message),
                NotFoundException ex => (StatusCodes.Status404NotFound, "Recurso no encontrado", ex.Message),
                ConflictException ex => (StatusCodes.Status409Conflict, "Conflicto en el recurso", ex.Message),
                DomainException ex => (StatusCodes.Status400BadRequest, "Error de validación", ex.Message),
                _ => (
                    StatusCodes.Status500InternalServerError,
                    "Error interno del servidor",
                    "Ocurrió un error inesperado. Contacte al administrador si el problema persiste."
                )
            };

            // 2. Logging diferenciado
            if (statusCode == StatusCodes.Status500InternalServerError)
            {
                _logger.LogError(exception, "Error crítico [{TraceId}]: {Message}", traceId, exception.Message);
            }
            else
            {
                _logger.LogWarning("Advertencia de negocio [{TraceId}]: {Message}", traceId, exception.Message);
            }

            // 3. Respuesta ProblemDetails
            var problemDetails = new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = detail,
                Instance = httpContext.Request.Path
            };

            problemDetails.Extensions.Add("traceId", traceId);

            // Solo agregamos información técnica sensible en Desarrollo
            if (_env.IsDevelopment())
            {
                problemDetails.Extensions.Add("developmentDetails", exception.StackTrace);
                // Si fue un error 500, en desarrollo sí nos sirve ver el mensaje real del sistema
                if (statusCode == StatusCodes.Status500InternalServerError)
                {
                    problemDetails.Extensions.Add("exceptionMessage", exception.Message);
                }
            }

            // 4. Salida JSON
            httpContext.Response.StatusCode = statusCode;
            httpContext.Response.ContentType = "application/problem+json";

            await httpContext.Response.WriteAsJsonAsync(
                problemDetails,
                JsonOptions,
                cancellationToken);

            return true;
        }
    }
}
