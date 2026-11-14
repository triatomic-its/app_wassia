import { Pipe, PipeTransform } from '@angular/core';
import { formatTimeAgo } from '@core/i18n/format/time-ago';
import { IsoDateTime } from '@core/models';

/** `{{ member.createdAt | timeAgo: clock.now() }}` → `il y a 3 h`. Pure: recomputed when `now` ticks. */
@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
  transform(value: IsoDateTime, now: Date): string {
    return formatTimeAgo(value, now);
  }
}
