import type { FC } from "react";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4";
}

export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Card — Container for grouped content with optional header, content, and footer sections.
 */
export const Card: FC<CardProps> = ({ children, style, ...props }) => (
  <div
    style={{
      backgroundColor: "var(--color-neutral-0)",
      border: "1px solid var(--color-neutral-200)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-sm)",
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
);

/**
 * CardHeader — Top section of the card with optional border.
 */
export const CardHeader: FC<CardHeaderProps> = ({
  children,
  style,
  ...props
}) => (
  <div
    style={{
      padding: "var(--space-6)",
      borderBottom: "1px solid var(--color-neutral-100)",
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
);

/**
 * CardTitle — Heading element for card header.
 */
export const CardTitle: FC<CardTitleProps> = ({
  as = "h3",
  children,
  style,
  ...props
}) => {
  const Heading = as as React.ElementType;
  return (
    <Heading
      style={{
        fontSize: "var(--font-size-lg)",
        fontWeight: "var(--font-weight-semibold)",
        margin: 0,
        ...style,
      }}
      {...(props as React.HTMLAttributes<HTMLHeadingElement>)}
    >
      {children}
    </Heading>
  );
};

/**
 * CardContent — Main content section of the card.
 */
export const CardContent: FC<CardContentProps> = ({
  children,
  style,
  ...props
}) => (
  <div
    style={{
      padding: "var(--space-6)",
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
);

/**
 * CardFooter — Bottom section of the card with flex layout for actions.
 */
export const CardFooter: FC<CardFooterProps> = ({
  children,
  style,
  ...props
}) => (
  <div
    style={{
      padding: "var(--space-6)",
      borderTop: "1px solid var(--color-neutral-100)",
      display: "flex",
      justifyContent: "flex-end",
      gap: "var(--space-3)",
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
);

Card.displayName = "Card";
CardHeader.displayName = "CardHeader";
CardTitle.displayName = "CardTitle";
CardContent.displayName = "CardContent";
CardFooter.displayName = "CardFooter";
