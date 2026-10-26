import { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  breadcrumb?: BreadcrumbItem[];
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function EscPageHeader({ breadcrumb, title, subtitle, action }: Props) {
  return (
    <div className="px-7 pt-7 pb-5 border-b border-gray-200 bg-white">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1 text-[13px] text-[#5B5470] mb-2">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={13} className="text-[#3F3A4F]" />}
              {item.href ? (
                <Link href={item.href} className="hover:text-indigo-600 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-[#5B5470]">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-extrabold text-gray-900 leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-[15px] text-[#5B5470] mt-1 leading-snug">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0 pt-0.5">{action}</div>}
      </div>
    </div>
  );
}
