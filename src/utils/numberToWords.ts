/**
 * Convert numbers into words for formal accounting vouchers
 */
export function numberToWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Only';

  const units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertChunk(num: number): string {
    let str = '';
    if (num >= 100) {
      str += units[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    if (num > 0) {
      str += units[num] + ' ';
    }
    return str.trim();
  }

  const rounded = Math.floor(Math.abs(amount));
  if (rounded === 0) return 'Rupees Zero Only';

  let result = '';
  // Pakistani numbering terms: Crores (10 Million), Lacs (100,000), Thousands
  const crores = Math.floor(rounded / 10000000);
  const lacs = Math.floor((rounded % 10000000) / 100000);
  const thousands = Math.floor((rounded % 100000) / 1000);
  const remainder = rounded % 1000;

  if (crores > 0) {
    result += convertChunk(crores) + ' Crore ';
  }
  if (lacs > 0) {
    result += convertChunk(lacs) + ' Lac ';
  }
  if (thousands > 0) {
    result += convertChunk(thousands) + ' Thousand ';
  }
  if (remainder > 0) {
    result += convertChunk(remainder) + ' ';
  }

  return ('Rupees ' + result.trim() + ' Only').replace(/\s+/g, ' ');
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPKR(amount: number): string {
  return `PKR ${formatCurrency(amount)}`;
}

