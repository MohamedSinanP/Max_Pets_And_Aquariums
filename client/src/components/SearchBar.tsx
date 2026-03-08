export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}
export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder = "Search..." }) => (
  <div className="relative">
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-300" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="pl-9 pr-4 py-2.5 border-2 border-teal-100 rounded-xl text-sm bg-white focus:outline-none focus:border-teal-400 text-teal-900 placeholder-teal-300 w-64 transition-colors"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    />
  </div>
);
