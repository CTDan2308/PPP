
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface SaleRecord {
  id: string;
  timestamp: string;
  items: CartItem[];
  totalAmount: number;
  paymentMethod: 'CASH' | 'TRANSFER';
  customerName?: string;
}

export enum Tab {
  SALE = 'SALE',
  HISTORY = 'HISTORY',
  ANALYTICS = 'ANALYTICS',
  SETTINGS = 'SETTINGS'
}
