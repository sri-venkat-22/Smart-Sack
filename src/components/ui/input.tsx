// import * as React from "react";

// import { cn } from "@/lib/utils";

// const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
//   ({ className, type, ...props }, ref) => {
//     return (
//       <input
//         type={type}
//         className={cn(
//           "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
//           className,
//         )}
//         ref={ref}
//         {...props}
//       />
//     );
//   },
// );
// Input.displayName = "Input";

// export { Input };





import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        [
          // Layout
          "flex h-10 w-full rounded-md px-3 py-2",

          // Background & border
          "bg-black/40 border border-white/10 backdrop-blur-md",

          // Text visibility (CRITICAL FIX)
          "text-white caret-white",
          "placeholder:text-gray-400",

          // Typography
          "text-base md:text-sm",

          // Focus styles
          "focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-cyan-500/70",
          "focus-visible:ring-offset-2 focus-visible:ring-offset-black",

          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",

          // File input reset
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white",

          // Remove number arrows if desired (optional, safe)
          type === "number"
            ? "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            : "",
        ],
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
