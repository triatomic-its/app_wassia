import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { SessionStore } from '@core/auth/session.store';
import { Permission } from '@core/config/permissions.config';

/**
 * Renders its content only if the current user has the permission.
 * Usage: `<button *appCan="'loan.disburse'">Décaisser</button>`.
 * Hiding is not securing: the back end still enforces permissions.
 */
@Directive({ selector: '[appCan]' })
export class CanDirective {
  readonly appCan = input.required<Permission>();

  private readonly session = inject(SessionStore);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);
  private shown = false;

  constructor() {
    effect(() => {
      const allowed = this.session.permissions().has(this.appCan());
      if (allowed && !this.shown) {
        this.container.createEmbeddedView(this.template);
        this.shown = true;
      } else if (!allowed && this.shown) {
        this.container.clear();
        this.shown = false;
      }
    });
  }
}
