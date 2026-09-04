<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'avatar',
        'name',
        'username',
        'email',
        'gender',
        'password',
        'phone',
        'photo_path',
        'role',
        'status',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function assignedRegions()
    {
        return $this->belongsToMany(Region::class, 'officer_assignments', 'officer_id', 'region_id')->withTimestamps();
    }

    public function canAccessCustomer(Customer $customer): bool
    {
        return $this->role === 'admin'
            || ($this->role === 'petugas' && $this->assignedRegions()->whereKey($customer->rt_id)->exists());
    }
}
