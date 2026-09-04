<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AppDataUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use SerializesModels;

    /**
     * @param  array<int, string>  $scopes
     */
    public function __construct(
        public readonly array $scopes,
        public readonly string $source,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel('pamsimas.updates');
    }

    public function broadcastAs(): string
    {
        return 'pamsimas.updated';
    }

    /**
     * @return array{scopes: array<int, string>, source: string, occurred_at: string}
     */
    public function broadcastWith(): array
    {
        return [
            'occurred_at' => now()->toIso8601String(),
            'scopes' => array_values(array_unique($this->scopes)),
            'source' => $this->source,
        ];
    }
}
