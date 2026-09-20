using System;
using System.Collections.Generic;
using System.Text;

namespace ProcureFlow.Application.Exceptions
{
    public class UnauthorizedException : Exception
    {
        public UnauthorizedException(string message) : base(message) { }
    }
}
