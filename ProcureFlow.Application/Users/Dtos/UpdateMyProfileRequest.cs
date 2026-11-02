using System.ComponentModel.DataAnnotations;

namespace ProcureFlow.Application.Users.Dtos
{
    public class UpdateMyProfileRequest
    {
        [Required(ErrorMessage = "El nombre es obligatorio.")]
        [StringLength(150, ErrorMessage = "El nombre no puede tener mas de 150 caracteres")]
        public string? FullName { get; set; }

        [Required(ErrorMessage = "El correo electrónico es obligatorio.")]
        [StringLength(200, ErrorMessage = "El correo no puede tener mas de 200 caracteres")]
        [EmailAddress(ErrorMessage = "El formato del correo electrónico no es válido.")]
        public string? Email { get; set; }
    }
}
