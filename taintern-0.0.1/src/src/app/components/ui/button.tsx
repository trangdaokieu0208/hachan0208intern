import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-black text-white hover:bg-gray-800 shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none border-2 border-black",
        destructive:
          "bg-rose-500 text-white hover:bg-rose-600 border-2 border-black shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
        outline:
          "border-2 border-black bg-white/80 backdrop-blur-sm text-black hover:bg-secondary/80 shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
        secondary:
          "bg-secondary text-black hover:bg-secondary/80 border-2 border-black shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
        ghost:
          "hover:bg-secondary/20 hover:text-black",
        link: "text-black underline-offset-4 hover:underline font-bold",
        brutal: "bg-white/80 backdrop-blur-sm border-2 border-black shadow-hard-sm hover:bg-secondary/80 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-black font-black uppercase italic",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-14 rounded-xl px-10 text-base",
        icon: "size-11 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
