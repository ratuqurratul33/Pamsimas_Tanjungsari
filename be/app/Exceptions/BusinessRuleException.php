<?php

namespace App\Exceptions;

use RuntimeException;

class BusinessRuleException extends RuntimeException
{
    public function __construct(string $message, public readonly string $errorCode = 'BUSINESS_RULE_ERROR')
    {
        parent::__construct($message);
    }
}
