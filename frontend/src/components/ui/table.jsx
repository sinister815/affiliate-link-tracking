import * as React from "react";
import { cn } from "@/lib/utils";

function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table
        className={cn("w-full border-separate border-spacing-0 text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }) {
  return (
    <thead className={cn("bg-slate-50", className)} {...props} />
  );
}

function TableBody({ className, ...props }) {
  return <tbody className={cn("bg-white", className)} {...props} />;
}

function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn("border-b border-slate-200 last:border-b-0", className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-left text-xs font-semibold text-slate-600",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }) {
  return (
    <td
      className={cn("px-4 py-2 align-middle text-sm text-slate-800", className)}
      {...props}
    />
  );
}

function TableCellCenter({ className, ...props }) {
  return (
    <td
      className={cn(
        "px-2 py-2 align-middle text-center text-sm text-slate-800",
        className
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }) {
  return (
    <caption
      className={cn("py-2 text-sm text-slate-500", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellCenter,
  TableCaption,
};
