using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace ProcureFlow.Application.Departments.Dtos
{
    public class UpdateDepartmentRequest
    {
        [Required(ErrorMessage = "El nombre del departamento es requerido.")]
        public string? Name { get; set; }
    }
}
