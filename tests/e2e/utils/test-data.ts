export const TEST_PROPERTIES = [
  {
    property_id: '327020',
    name: 'Rock Shores (House)',
    base_price: 150,
    min_price: 100
  },
  {
    property_id: '327021', 
    name: 'Seascape (House)',
    base_price: 200,
    min_price: 150
  },
  {
    property_id: '327022',
    name: 'Crows Nest 1 (Self)',
    base_price: 100,
    min_price: 75
  },
  {
    property_id: '327023',
    name: 'Crows Nest 2 (Self)',
    base_price: 100,
    min_price: 75
  },
  {
    property_id: '327024',
    name: 'Beach Belle (Self)',
    base_price: 120,
    min_price: 90
  },
  {
    property_id: '327025',
    name: 'Flamingo (Self)',
    base_price: 110,
    min_price: 80
  },
  {
    property_id: '327026',
    name: 'Seashells (Self)',
    base_price: 110,
    min_price: 80
  },
  {
    property_id: '327027',
    name: 'Rockpool (Self)',
    base_price: 100,
    min_price: 75
  }
];

export const TEST_DATE_RANGES = [
  {
    start_date: '2025-07-01',
    end_date: '2025-08-31',
    rate_multiplier: 1.5,
    description: 'Summer Season'
  },
  {
    start_date: '2025-12-15',
    end_date: '2025-12-31',
    rate_multiplier: 2.0,
    description: 'Holiday Season'
  }
];

export const TEST_DISCOUNT_STRATEGIES = [
  {
    name: 'Last Minute Summer',
    activation_window_days: 14,
    min_discount_percentage: 10,
    max_discount_percentage: 30
  },
  {
    name: 'Early Bird',
    activation_window_days: 60,
    min_discount_percentage: 5,
    max_discount_percentage: 15
  }
];

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getDateRange(startDate: string, endDate: string): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}