import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

import type { GateCategory } from "../gates/gate-catalog";

type WorkbenchControlButtonVariant = "icon" | "ghost" | "surface";

interface WorkbenchControlButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  readonly variant?: WorkbenchControlButtonVariant;
  readonly children: ReactNode;
  readonly accentTone?: GateCategory;
  readonly accentColor?: string;
  readonly accentTestId?: string;
  readonly contentClassName?: string;
}

function joinClassNames(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(" ");
}

export function WorkbenchControlButton({
  variant = "ghost",
  children,
  accentTone,
  accentColor,
  accentTestId,
  className,
  contentClassName,
  style,
  ...buttonProps
}: WorkbenchControlButtonProps) {
  const nextStyle: CSSProperties | undefined = accentColor
    ? {
        ...style,
        ["--workbench-accent-color" as const]: accentColor,
      }
    : style;

  return (
    <button
      type="button"
      className={joinClassNames(
        "workbench-control-button",
        `workbench-control-button--${variant}`,
        className,
      )}
      style={nextStyle}
      {...buttonProps}
    >
      {accentTone ? (
        <span
          aria-hidden="true"
          data-testid={accentTestId}
          className={joinClassNames(
            "gate-palette-button__accent",
            `gate-palette-button__accent--${accentTone}`,
          )}
        />
      ) : null}
      <span
        className={joinClassNames(
          "workbench-control-button__content",
          contentClassName,
        )}
      >
        {children}
      </span>
    </button>
  );
}

export function WorkbenchDivider() {
  return <span className="workbench-control-divider" aria-hidden="true" />;
}
