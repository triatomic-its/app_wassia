import { Directive, computed, input } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-display font-bold select-none',
    'rounded-button press cursor-pointer text-center',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
    '[&_ng-icon]:shrink-0',
  ],
  {
    variants: {
      variant: {
        /** Back-office main action (navy). */
        primary: 'bg-primary text-white hover:bg-primary-hover',
        /** Agent main action (sapin green), e.g. "Scanner une carte". */
        success: 'bg-sapin text-white shadow-cta hover:bg-sapin-hover',
        /** Highlight on dark backgrounds (gold). */
        accent: 'bg-accent text-night hover:bg-accent-light',
        /** Secondary action: white with grey border (mockup "Retour"). */
        outline:
          'border-[1.5px] border-border bg-surface font-semibold text-ink hover:border-ink-faint hover:bg-surface-alt',
        ghost: 'bg-transparent font-semibold text-sapin hover:bg-sapin-soft',
        danger: 'bg-danger text-white hover:opacity-90',
      },
      size: {
        /** 56px (mockup), above the 48px minimum. */
        md: 'min-h-14 px-5 text-base',
        /** Large field action (mockup agent home). */
        xl: 'min-h-[4.75rem] rounded-card px-5 text-lg',
        /** Square icon-only (label stays in aria-label + tooltip). */
        icon: 'size-12 p-0',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

/**
 * Styles a native `<button>` or `<a>`: `<button appButton variant="success" size="xl">`.
 * Always put a text label next to any icon.
 */
@Directive({
  selector: 'button[appButton], a[appButton]',
  host: { '[class]': 'classes()' },
})
export class ButtonDirective {
  readonly variant = input<ButtonVariants['variant']>('primary');
  readonly size = input<ButtonVariants['size']>('md');
  readonly block = input<boolean>(false);
  readonly class = input<string>('');

  protected readonly classes = computed(() =>
    cn(
      buttonVariants({ variant: this.variant(), size: this.size(), block: this.block() }),
      this.class(),
    ),
  );
}
