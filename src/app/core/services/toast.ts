import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor(private messageService: MessageService) {}

  success(message: string, detail?: string) {
    this.messageService.add({
      severity: 'success',
      summary: message,
      detail,
      life: 4000
    });
  }

  error(message: string, detail?: string) {
    this.messageService.add({
      severity: 'error',
      summary: message,
      detail,
      life: 5000
    });
  }

  info(message: string, detail?: string) {
    this.messageService.add({
      severity: 'info',
      summary: message,
      detail,
      life: 3000
    });
  }
}
