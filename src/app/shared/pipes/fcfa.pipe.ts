import { Pipe, PipeTransform } from '@angular/core';
import { formatFcfa } from '@core/i18n/format/fcfa';

@Pipe({ name: 'fcfa' })
export class FcfaPipe implements PipeTransform {
  transform(value: number | null | undefined, signed = false): string {
    return formatFcfa(value, signed);
  }
}
