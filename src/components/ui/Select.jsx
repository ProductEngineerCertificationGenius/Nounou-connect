import { forwardRef } from "react";

const Select = forwardRef(function Select({ options, placeholder, ...rest }, ref) {
  return (
    <select ref={ref} className="input" defaultValue="" {...rest}>
      <option value="" disabled>
        {placeholder || "Sélectionner..."}
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
});

export default Select;
