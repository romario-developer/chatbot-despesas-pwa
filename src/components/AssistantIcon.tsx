import type { ComponentPropsWithoutRef } from "react";

type AssistantIconProps = ComponentPropsWithoutRef<"svg">;

const AssistantIcon = ({ className, ...props }: AssistantIconProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    role="img"
    aria-hidden="true"
    {...props}
  >
    <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    <path d="M12 9v6M9 12h6" />
  </svg>
);

export default AssistantIcon;
