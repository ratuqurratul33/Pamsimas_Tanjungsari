<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->renderable(function (BusinessRuleException $exception): JsonResponse {
            return response()->json([
                'code' => $exception->errorCode,
                'message' => $exception->getMessage(),
            ], 422);
        });

        $this->renderable(function (ValidationException $exception): JsonResponse {
            return response()->json([
                'code' => 'VALIDATION_ERROR',
                'errors' => $exception->errors(),
                'message' => 'Data tidak valid.',
            ], $exception->status);
        });

        $this->reportable(function (Throwable $e) {
            //
        });
    }
}
