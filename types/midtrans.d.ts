interface MidtransSnapCallbacks {
    onSuccess?: (result: unknown) => void | Promise<void>
    onPending?: (result: unknown) => void | Promise<void>
    onError?: (result: unknown) => void | Promise<void>
    onClose?: () => void | Promise<void>
}

interface Window {
    snap: {
        pay: (token: string, callbacks: MidtransSnapCallbacks) => void
    }
}
