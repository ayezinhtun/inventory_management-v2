import React from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "../utils";

const Breadcrumb = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) =>
  <nav ref={ref} aria-label="breadcrumb" data-slot="breadcrumb" className={cn(className)} {...props} />

);
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = React.forwardRef<HTMLOListElement, React.OlHTMLAttributes<HTMLOListElement>>(
  ({ className, ...props }, ref) =>
  <ol
    ref={ref}
    data-slot="breadcrumb-list"
    className={cn("flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground", className)}
    {...props} />


);
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) =>
  <li ref={ref} data-slot="breadcrumb-item" className={cn("inline-flex items-center gap-1", className)} {...props} />

);
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
  ({ className, ...props }, ref) =>
  <a ref={ref} data-slot="breadcrumb-link" className={cn("transition-colors hover:text-foreground", className)} {...props} />

);
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) =>
  <span
    ref={ref}
    data-slot="breadcrumb-page"
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn("font-normal text-foreground", className)}
    {...props} />


);
BreadcrumbPage.displayName = "BreadcrumbPage";

const BreadcrumbSeparator: React.FC<React.LiHTMLAttributes<HTMLLIElement>> = ({ children, className, ...props }) =>
<li
  data-slot="breadcrumb-separator"
  role="presentation"
  aria-hidden="true"
  className={cn("[&>svg]:size-3.5", className)}
  {...props}>
  
    {children ?? <ChevronRight />}
  </li>;


const BreadcrumbEllipsis = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) =>
  <span
    ref={ref}
    data-slot="breadcrumb-ellipsis"
    role="presentation"
    aria-hidden="true"
    className={cn("flex size-5 items-center justify-center [&>svg]:size-4", className)}
    {...props}>
    
      <MoreHorizontal />
      <span className="sr-only">More</span>
    </span>

);
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis };