import { Search } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="search-bar">
      <Search size={16} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Search…'}
        aria-label={placeholder || 'Search'}
      />
    </div>
  );
}