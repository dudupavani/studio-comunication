import type * as React from "react";

type OverriddenFormProps = Omit<
  React.DetailedHTMLProps<
    React.FormHTMLAttributes<HTMLFormElement>,
    HTMLFormElement
  >,
  "action"
> & {
  action?: string | ((formData: FormData) => void | Promise<void>);
};

type OverriddenButtonProps = Omit<
  React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >,
  "formAction"
> & {
  formAction?: string | ((formData: FormData) => void | Promise<void>);
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      form: OverriddenFormProps;
      button: OverriddenButtonProps;
    }
  }
}
