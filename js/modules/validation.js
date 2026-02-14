export function setError(input, message){
  input.setCustomValidity(message);
  input.closest(".field")?.classList.add("invalid");
}
export function clearError(input){
  input.setCustomValidity("");
  input.closest(".field")?.classList.remove("invalid");
}
export function validateRequired(input){
  if(input.hasAttribute("required") && !input.value.trim()){
    setError(input, "This field is required.");
    return false;
  }
  clearError(input);
  return true;
}
export function validatePattern(input){
  const pattern = input.getAttribute("pattern");
  if(pattern && !new RegExp(`^${pattern}$`).test(input.value)){
    setError(input, "Invalid format.");
    return false;
  }
  clearError(input);
  return true;
}
export function validateLength(input){
  const min = input.getAttribute("minlength");
  const max = input.getAttribute("maxlength");
  if(min && input.value.length < Number(min)){
    setError(input, `Minimum length is ${min} characters.`);
    return false;
  }
  if(max && input.value.length > Number(max)){
    setError(input, `Maximum length is ${max} characters.`);
    return false;
  }
  clearError(input);
  return true;
}