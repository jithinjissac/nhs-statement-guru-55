
import { toast as sonnerToast } from "sonner";

// Re-export sonner's toast function for direct use
export const toast = sonnerToast;

// Export a compatibility layer for components still using the old useToast hook
export const useToast = () => {
  return {
    toast: sonnerToast,
    // Add minimal implementation to match the previous interface
    // so existing components don't break
    toasts: [],
    dismiss: () => {}
  };
};
