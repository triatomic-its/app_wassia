import { Directive, computed, input } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-display font-bold select-none',
    'rounded-control transition-colors cursor-pointer',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
    '[&_ng-icon]:shrink-0',
  ],
  {
    variants: {
      variant: {
        /** Back-office main action (navy). */
        primary: 'bg-primary text-white hover:bg-primary-hover',
        /** Agent main action (sapin green), e.g. "Scanner une carte". */
        success: 'bg-sapin text-white hover:bg-sapin-hover',
        /** Highlight on dark backgrounds (gold). */
        accent: 'bg-accent text-primary hover:bg-accent-light',
        /** Secondary action: white with navy border. */
        outline: 'border-[1.5px] border-primary bg-surface text-primary hover:bg-info-soft',
        ghost: 'bg-transparent text-primary hover:bg-neutral-soft',
        danger: 'bg-danger text-white hover:opacity-90',
      },
      size: {
        /** 48px — minimum touch target. */
        md: 'min-h-12 px-5 text-base',
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
