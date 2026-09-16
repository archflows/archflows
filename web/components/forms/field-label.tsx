import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type FieldLabelProps<T extends ElementType = "label"> = {
  as?: T;
  required?: boolean;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "required" | "children">;

export function FieldLabel<T extends ElementType = "label">({
  as,
  required,
  children,
  className,
  ...rest
}: FieldLabelProps<T>) {
  const Tag = as ?? "label";
  const classes = className ? `field-label ${className}` : "field-label";

  return (
    <Tag className={classes} {...rest}>
      {children}
      {required ? (
        <span className="field-required" aria-hidden="true">
          *
        </span>
      ) : null}
    </Tag>
  );
}
