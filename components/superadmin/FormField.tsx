"use client";

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'checkbox';
  value: any;
  onChange: (value: any) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  rows?: number;
}

export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  options = [],
  rows = 3
}: FormFieldProps) {
  const baseClasses = "block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";
  const errorClasses = "border-red-300 focus:border-red-500 focus:ring-red-500";

  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${baseClasses} ${error ? errorClasses : ''}`}
            required={required}
          >
            <option value="">Select an option</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            placeholder={placeholder}
            className={`${baseClasses} ${error ? errorClasses : ''}`}
            required={required}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              name={name}
              type="checkbox"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              {label}
            </label>
          </div>
        );

      default:
        return (
          <input
            name={name}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${baseClasses} ${error ? errorClasses : ''}`}
            required={required}
          />
        );
    }
  };

  if (type === 'checkbox') {
    return (
      <div>
        {renderInput()}
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
