using System.ComponentModel.DataAnnotations;

namespace ProcureFlow.Application.Users.Dtos
{
    public class ChangeMyPasswordRequest
    {
        [Required(ErrorMessage = "La contraseña actual es obligatoria.")]
        public string? CurrentPassword { get; set; }

        [Required(ErrorMessage = "La nueva contraseña es obligatoria.")]
        [StringLength(500, MinimumLength = 8, ErrorMessage = "La nueva contraseña debe tener entre 8 y 500 caracteres.")]
        public string? NewPassword { get; set; }
    }
}
