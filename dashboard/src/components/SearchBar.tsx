import { forwardRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const SearchBar = forwardRef<HTMLInputElement, Props>(function SearchBar(
  { value, onChange },
  ref
) {
  return (
    <div className="jira-search">
      <input
        ref={ref}
        type="search"
        className="jira-search-input"
        placeholder="Search or Filter... [ / ]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
});

export default SearchBar;
