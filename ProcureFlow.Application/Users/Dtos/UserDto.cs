using ProcureFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace ProcureFlow.Application.Users.Dtos
{
    public class UserDto
    {
        public Guid Id { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public UserRole Role { get; set; }
        public Guid DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
