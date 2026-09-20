using ProcureFlow.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace ProcureFlow.Application.Abstractions.Security
{
    public interface IJwtTokenGenerator
    {
        string Generate(User user);
    }
}
