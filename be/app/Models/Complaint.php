<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Complaint extends Model
{
    protected $fillable = ['area', 'category', 'complaint_number', 'description', 'name', 'phone', 'photo_path', 'status'];
}
