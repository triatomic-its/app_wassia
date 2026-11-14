import { Injectable } from '@angular/core';
import { toast } from 'ngx-sonner';

/** Thin wrapper so features never depend on the toast library directly. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  success(message: string, description?: string): void {
    toast.success(message, { description });
  }

  error(message: string, description?: string): void {
    toast.error(message, { description });
  }

  info(message: string, description?: string): void {
    toast.info(message, { description });
  }
}
