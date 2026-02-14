import React from "react";

export default function PasswordToggleIconButton({
  pressed = false,
  onClick,
  titleOn = "Ocultar contraseña",
  titleOff = "Mostrar contraseña",
}) {
  const title = pressed ? titleOn : titleOff;

  return (
    <button
      type="button"
      className="imss-pass-icon-btn"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={title}
      title={title}
    >
      {pressed ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 12s3.6-7 9.5-7 9.5 7 9.5 7-3.6 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10.6 10.7A2.9 2.9 0 0 0 10 12a2 2 0 0 0 2 2c.46 0 .89-.16 1.23-.43"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.2 6.3C3.8 8.3 2.5 12 2.5 12s3.6 7 9.5 7c1.7 0 3.2-.4 4.5-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 5.2c.7-.13 1.4-.2 2.1-.2 5.9 0 9.5 7 9.5 7s-1.4 2.7-4 4.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}