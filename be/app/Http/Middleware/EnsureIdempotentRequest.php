<?php

namespace App\Http\Middleware;

use App\Models\IdempotencyRequest;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureIdempotentRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = trim((string) $request->header('Idempotency-Key'));

        if ($key === '') {
            return new JsonResponse([
                'code' => 'VALIDATION_ERROR',
                'errors' => ['idempotency_key' => ['Header Idempotency-Key wajib dikirim.']],
                'message' => 'Data tidak valid.',
            ], 422);
        }

        $hash = hash('sha256', $request->method().'|'.$request->path().'|'.$request->getContent());
        $record = IdempotencyRequest::query()->firstOrCreate(
            ['user_id' => $request->user()?->id, 'key' => $key],
            ['route' => $request->path(), 'request_hash' => $hash]
        );

        if (! hash_equals($record->request_hash, $hash)) {
            return new JsonResponse([
                'code' => 'CONFLICT',
                'message' => 'Idempotency-Key sudah dipakai untuk request yang berbeda.',
            ], 409);
        }

        if ($record->completed_at && $record->response_status !== null) {
            return new JsonResponse($record->response_body ?? [], $record->response_status);
        }

        return DB::transaction(function () use ($record, $request, $next) {
            $record = IdempotencyRequest::query()->lockForUpdate()->findOrFail($record->id);

            if ($record->completed_at && $record->response_status !== null) {
                return new JsonResponse($record->response_body ?? [], $record->response_status);
            }

            $response = $next($request);

            if ($response instanceof JsonResponse && $response->getStatusCode() < 500) {
                $record->update([
                    'completed_at' => now(),
                    'response_body' => json_decode((string) $response->getContent(), true),
                    'response_status' => $response->getStatusCode(),
                ]);
            }

            return $response;
        }, 3);
    }
}
