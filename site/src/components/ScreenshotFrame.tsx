import { useState } from "react";
import { ImageOff } from "lucide-react";

interface Props {
  src: string;
  alt: string;
  caption: string;
}

export function ScreenshotFrame({ src, alt, caption }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-brand-800">
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-2 dark:border-slate-700 dark:bg-brand-900">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ml-2 truncate text-xs text-slate-500 dark:text-slate-400">
          PharmaOps Copilot
        </span>
      </div>
      <div className="relative aspect-video bg-slate-100 dark:bg-brand-900">
        {!failed ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover object-top"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
            <ImageOff size={32} aria-hidden />
            <p className="text-sm">Screenshot placeholder — replace with {src.split("/").pop()}</p>
          </div>
        )}
      </div>
      <figcaption className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{caption}</figcaption>
    </figure>
  );
}
