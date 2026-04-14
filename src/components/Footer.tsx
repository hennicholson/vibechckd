export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-[960px] mx-auto px-6 py-5 flex items-center justify-between">
        <span className="text-[12px] text-border-hover">&copy; vibechckd.cc</span>
        <div className="flex items-center gap-0 text-[12px]">
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text-secondary transition-colors duration-150">Twitter</a>
          <span className="text-text-muted mx-2">/</span>
          <a href="mailto:hello@vibechckd.cc" className="text-text-muted hover:text-text-secondary transition-colors duration-150">Contact</a>
        </div>
      </div>
    </footer>
  );
}
