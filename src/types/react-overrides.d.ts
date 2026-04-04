import "react";

declare module "react" {
  interface FormHTMLAttributes<T> {
    action?:
      | string
      | ((formData: FormData) => void | Promise<void>)
      | undefined;
  }
  interface ButtonHTMLAttributes<T> {
    formAction?:
      | string
      | ((formData: FormData) => void | Promise<void>)
      | undefined;
  }
}
