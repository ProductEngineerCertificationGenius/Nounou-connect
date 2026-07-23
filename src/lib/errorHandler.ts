export const getErrorMessage = (error: any): string => {
  // Si l'erreur a une réponse du backend
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Si la réponse est une chaîne
  if (error?.response?.data && typeof error.response.data === 'string') {
    return error.response.data;
  }
  
  // Si c'est une erreur réseau (pas de réponse)
  if (error?.message) {
    return error.message;
  }
  
  // Fallback générique
  return "Une erreur est survenue. Veuillez réessayer.";
};