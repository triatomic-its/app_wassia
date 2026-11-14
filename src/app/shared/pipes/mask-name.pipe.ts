import { Pipe, PipeTransform } from '@angular/core';
import { maskName } from '@core/i18n/format/mask-name';

@Pipe({ name: 'maskName' })
export class MaskNamePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return maskName(value);
  }
}
