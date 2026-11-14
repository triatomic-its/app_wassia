import { Pipe, PipeTransform } from '@angular/core';
import { AbidjanDateFormat, formatAbidjanDate } from '@core/i18n/format/abidjan-date';

@Pipe({ name: 'abidjanDate' })
export class AbidjanDatePipe implements PipeTransform {
  transform(
    value: string | Date | null | undefined,
    format: AbidjanDateFormat = 'datetime',
  ): string {
    return formatAbidjanDate(value, format);
  }
}
