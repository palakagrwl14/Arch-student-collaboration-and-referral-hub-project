export default function validateRequest(rules) {
  return (req, res, next) => {
    const errors = [];
    
    for (const [location, fields] of Object.entries(rules)) {
      const data = req[location];
      if (!data) continue;
      
      for (const [fieldName, fieldRules] of Object.entries(fields)) {
        const val = data[fieldName];
        
        // Check required
        if (fieldRules.required && (val === undefined || val === null || val === '')) {
          errors.push({ field: fieldName, message: `${fieldName} is required` });
          continue;
        }
        
        if (val !== undefined && val !== null && val !== '') {
          // Check type
          if (fieldRules.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(val)) {
              errors.push({ field: fieldName, message: 'Invalid email address' });
            }
          } else if (fieldRules.type === 'number') {
            if (isNaN(Number(val))) {
              errors.push({ field: fieldName, message: `${fieldName} must be a number` });
            }
          } else if (fieldRules.type === 'array') {
            if (!Array.isArray(val) && typeof val !== 'string') {
              errors.push({ field: fieldName, message: `${fieldName} must be an array` });
            }
          }
          
          // Check minLength
          if (fieldRules.minLength && String(val).length < fieldRules.minLength) {
            errors.push({ field: fieldName, message: `${fieldName} must be at least ${fieldRules.minLength} characters` });
          }
          
          // Check maxLength
          if (fieldRules.maxLength && String(val).length > fieldRules.maxLength) {
            errors.push({ field: fieldName, message: `${fieldName} must be at most ${fieldRules.maxLength} characters` });
          }
          
          // Check enum
          if (fieldRules.enum && !fieldRules.enum.includes(val)) {
            errors.push({ field: fieldName, message: `${fieldName} must be one of: ${fieldRules.enum.join(', ')}` });
          }
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
}
