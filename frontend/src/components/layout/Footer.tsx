import { RangeLogo } from '../brand/RangeLogo';

export function Footer() {
  return (
    <footer className="h-12 border-t border-mist-300 bg-mist/30 flex items-center justify-center px-8">
      <div className="flex items-center gap-3 text-stone">
        <span className="text-xs">Built and maintained by</span>
        <div className="flex items-center gap-1.5">
          <RangeLogo size={16} variant="mark" />
          <span className="text-xs font-serif italic text-forest">Range</span>
        </div>
      </div>
    </footer>
  );
}
