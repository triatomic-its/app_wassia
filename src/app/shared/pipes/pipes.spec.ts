import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AbidjanDatePipe } from './abidjan-date.pipe';
import { FcfaPipe } from './fcfa.pipe';
import { MaskNamePipe } from './mask-name.pipe';
import { TimeAgoPipe } from './time-ago.pipe';

// The formatting rules themselves are tested in core/i18n/format/format.spec.ts;
// here we check the pipes are wired to them, arguments included, inside a real template.

const NBSP = new RegExp('[' + String.fromCharCode(0xa0, 0x202f) + ']', 'g');

@Component({
  selector: 'app-pipes-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FcfaPipe, AbidjanDatePipe, MaskNamePipe, TimeAgoPipe],
  template: `
    <span id="fcfa">{{ 1000 | fcfa }}</span>
    <span id="signed">{{ 5000 | fcfa: true }}</span>
    <span id="empty">{{ null | fcfa }}</span>
    <span id="datetime">{{ iso | abidjanDate }}</span>
    <span id="date">{{ iso | abidjanDate: 'date' }}</span>
    <span id="mask">{{ 'Koné Diarra' | maskName }}</span>
    <span id="ago">{{ iso | timeAgo: now }}</span>
  `,
})
class PipesHost {
  readonly iso = '2026-11-02T13:05:00Z';
  readonly now = new Date('2026-11-02T16:05:00Z');
}

function render(): (id: string) => string {
  const fixture = TestBed.createComponent(PipesHost);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return (id) => (el.querySelector(`#${id}`)?.textContent ?? '').replace(NBSP, ' ').trim();
}

describe('shared pipes', () => {
  it('formats money in whole FCFA', () => {
    const text = render();
    expect(text('fcfa')).toBe('1 000 F');
    expect(text('signed')).toBe('+ 5 000 F');
    expect(text('empty')).toBe('—');
  });

  it('formats dates in Abidjan time, with the requested variant', () => {
    const text = render();
    expect(text('datetime')).toBe('02/11/2026 13:05');
    expect(text('date')).toBe('02/11/2026');
  });

  it('masks names and shows elapsed time', () => {
    const text = render();
    expect(text('mask')).toBe('K*** D***');
    expect(text('ago')).toContain('3');
  });
});
