import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "rounded-md bg-primary px-4 py-2 text-white hover:brightness-95",
        outline: "rounded-md border border-border bg-background px-4 py-2 text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Button({ className, variant = "default", asChild = false, ...props }) {
  const Component = asChild ? Slot : "button";
  // The existing landing buttons own their precise geometry and motion.
  const classes = variant === "unstyled" ? className : cn(buttonVariants({ variant }), className);
  return <Component data-slot="button" className={classes} {...props} />;
}

export { Button, buttonVariants };


