import { CartItem } from '../context/AppContext';

/**
 * Calculates the total weight in KG for a given cart item.
 * Supports parsing weight from product name and variation mark,
 * and directly handles unit systems (e.g. Kg, gram).
 */
export const getCartItemWeightInKg = (item: CartItem): number => {
  if (!item || !item.qty) return 0;
  
  // Return custom weight override if defined
  if (item.customWeight !== undefined) {
    return item.customWeight;
  }
  
  const unit = (item.customUnit || item.variation?.unit || item.product.unit || '').toLowerCase().trim();
  
  // If the unit of the item is already Kg, weight is simply the quantity
  if (unit === 'kg') {
    return item.qty;
  }
  
  // If the unit is gram/g/gm, weight is quantity / 1000
  if (unit === 'gram' || unit === 'g' || unit === 'gm') {
    return item.qty / 1000;
  }

  // Combine product name and variation mark to search for patterns
  const nameToSearch = `${item.product.name} ${item.variation?.mark || ''}`.toLowerCase();
  
  // Look for patterns like: "50kg", "50 kg", "1.5 kg", "500g", "500 g", "500gm", "1l", "1.5l", "500ml", etc.
  const weightRegex = /(\d+(?:\.\d+)?)\s*(kg|g|gm|grams|l|litre|litres|ml)\b/i;
  const match = nameToSearch.match(weightRegex);
  
  if (match) {
    const value = parseFloat(match[1]);
    const parsedUnit = match[2].toLowerCase();
    
    if (parsedUnit === 'kg' || parsedUnit === 'l' || parsedUnit === 'litre' || parsedUnit.startsWith('litre')) {
      return value * item.qty;
    } else if (parsedUnit === 'g' || parsedUnit === 'gm' || parsedUnit === 'grams' || parsedUnit === 'ml') {
      return (value / 1000) * item.qty;
    }
  }
  
  return 0;
};
