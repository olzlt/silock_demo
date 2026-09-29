import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

function Card({ className, asChild = false, unstyled = false, ...props }) {
  const Component = asChild ? Slot : "div";
  return <Component data-slot="card" className={unstyled ? className : cn("rounded-card border border-border bg-background", className)} {...props} />;
}

export { Card };


