using ProcureFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace ProcureFlow.Application.Users.Dtos
{
    public class UserQuery
    {
        public string? name { get; set; }
        public string? email { get; set; }
        public UserRole? role { get; set; }
        public string? departmentName { get; set; }
        public bool? isActive { get; set; }
        public int pageSize { get; set; } = 10;
        public int page { get; set; } = 1;
    }
    }
}
