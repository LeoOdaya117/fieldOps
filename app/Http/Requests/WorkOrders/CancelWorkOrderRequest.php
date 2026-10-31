<?php

namespace App\Http\Requests\WorkOrders;

use Illuminate\Foundation\Http\FormRequest;

class CancelWorkOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('work_orders.update') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'version' => ['bail', 'required', 'integer', 'min:1'],
            'status' => ['prohibited'],
            'record_status' => ['prohibited'],
        ];
    }
}
