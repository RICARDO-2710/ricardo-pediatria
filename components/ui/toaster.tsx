"use client"

import * as React from "react"

type ToastInput = {
  title?: React.ReactNode
  description?: React.ReactNode
}

type PromiseToastInput<T> = {
  loading?: ToastInput
  success?: ToastInput | ((value: T) => ToastInput)
  error?: ToastInput | ((error: unknown) => ToastInput)
}

export const toaster = {
  create(_input?: ToastInput) {
    return ""
  },
  success(_input?: ToastInput) {
    return ""
  },
  error(_input?: ToastInput) {
    return ""
  },
  warning(_input?: ToastInput) {
    return ""
  },
  info(_input?: ToastInput) {
    return ""
  },
  loading(_input?: ToastInput) {
    return ""
  },
  dismiss(_id?: string) {},
  promise<T>(promise: Promise<T>, _input?: PromiseToastInput<T>) {
    return promise
  },
}

export const Toaster = () => {
  return null
}
