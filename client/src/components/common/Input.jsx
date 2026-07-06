import { useState, useRef } from 'react';
import { HiOutlineCloudArrowUp } from 'react-icons/hi2';
import '../../styles/components/Input.css';

export default function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  options = [],
  icon = null,
  name,
  maxLength,
  rows = 4,
  accept,
  className = '',
  ...props
}) {
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      if (onChange) onChange(e);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const renderInput = () => {
    const inputClass = [
      'form-input',
      icon ? 'form-input-with-icon' : '',
      error ? 'form-input-error' : '',
    ].filter(Boolean).join(' ');

    if (type === 'textarea') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <textarea
            name={name}
            className={inputClass}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            disabled={disabled}
            maxLength={maxLength}
            rows={rows}
            {...props}
          />
          {maxLength && (
            <span className="textarea-counter">
              {String(value || '').length}/{maxLength}
            </span>
          )}
        </div>
      );
    }

    if (type === 'select') {
      return (
        <select
          name={name}
          className={inputClass}
          value={value}
          onChange={onChange}
          disabled={disabled}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'file') {
      return (
        <div style={{ width: '100%' }}>
          <input
            type="file"
            name={name}
            accept={accept}
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            disabled={disabled}
            {...props}
          />
          <div className="file-upload-wrapper" onClick={handleFileClick}>
            <HiOutlineCloudArrowUp className="file-upload-icon" />
            <span className="file-upload-text">
              {fileName ? 'Change File' : placeholder || 'Click to upload proof / resume'}
            </span>
            {fileName && (
              <span className="file-upload-selected-name">{fileName}</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <input
        type={type}
        name={name}
        className={inputClass}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        {...props}
      />
    );
  };

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="form-label-required">*</span>}
        </label>
      )}
      <div className="form-input-container">
        {icon && <span className="form-input-icon">{icon}</span>}
        {renderInput()}
      </div>
      {error && <span className="form-error-msg">{error}</span>}
    </div>
  );
}
