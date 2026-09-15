"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "cn";
import { buttonVariants, type ButtonVariantProps } from "./button-variants";

function Button({
  className,
  variant = "default",
  size = "default",
  nativeButton,
  render,
  ...props
}: ButtonPrimitive.Props & ButtonVariantProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      nativeButton={nativeButton ?? render == null}
      render={render}
      {...props}
    />
  );
}

export { Button, buttonVariants };
