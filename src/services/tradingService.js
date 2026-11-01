// Research Paper Trading Service
// Bridges to Electron's SQLite database via desktopAPI.trading with browser localStorage fallback

const STORAGE_KEY_PURCHASES = 'rm_trading_purchases';
const STORAGE_KEY_SELLER_PAYMENTS = 'rm_trading_seller_payments';
const STORAGE_KEY_SALES = 'rm_trading_sales';
const STORAGE_KEY_BUYER_PAYMENTS = 'rm_trading_buyer_payments';
const STORAGE_KEY_BACKUP_LOGS = 'rm_trading_backup_logs';

function parseCurrencyToMinor(val) {
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return 0;
    return Math.round(val * 100);
  }
  const clean = String(val ?? '').trim().replace(/,/g, '');
  if (!clean) return 0;
  const match = clean.match(/^(\d{1,12})(?:\.(\d{1,2}))?$/);
  if (!match) return 0;
  const major = Number(match[1]);
  const minor = Number((match[2] || '').padEnd(2, '0'));
  return major * 100 + minor;
}

const INITIAL_MOCK_PURCHASES = [
  {
    id: 1,
    title: 'Reinforcement Learning in Quantum Circuit Synthesis',
    seller_name: 'Dr. Arthur Pendelton',
    seller_contact: 'arthur.p@cambridge.ac.uk | +44 1223 760000',
    purchase_date: '2026-02-10',
    purchase_price_minor: 4500000, // ₹45,000.00
    notes: 'Full experimental code and preprint transferred.',
    status: 'Active',
    created_at: '2026-02-10T10:00:00.000Z',
  },
  {
    id: 2,
    title: 'High-Throughput Single-Cell RNA Sequence Alignment',
    seller_name: 'Prof. Ananya Sen',
    seller_contact: 'ananya.sen@iisc.ac.in | +91 98201 11223',
    purchase_date: '2026-03-01',
    purchase_price_minor: 6500000, // ₹65,000.00
    notes: 'Draft manuscript with benchmark comparison datasets.',
    status: 'Active',
    created_at: '2026-03-01T11:30:00.000Z',
  },
  {
    id: 3,
    title: 'Zero-Knowledge Proofs for Federated Health Analytics',
    seller_name: 'Dr. Jean-Luc Bernard',
    seller_contact: 'jl.bernard@inria.fr | +33 1 39 63 55 55',
    purchase_date: '2026-03-15',
    purchase_price_minor: 3800000, // ₹38,000.00
    notes: 'Privacy architecture and cryptographic protocol diagrams.',
    status: 'Active',
    created_at: '2026-03-15T09:15:00.000Z',
  },
];

const INITIAL_MOCK_SELLER_PAYMENTS = [
  {
    id: 1,
    purchase_id: 1,
    amount_minor: 3000000, // ₹30,000 paid, ₹15,000 remaining
    payment_date: '2026-02-10',
    payment_method: 'Bank Transfer',
    reference: 'NEFT-8839210',
    notes: 'Initial payment upon contract signing',
    created_at: '2026-02-10T10:15:00.000Z',
  },
  {
    id: 2,
    purchase_id: 2,
    amount_minor: 6500000, // ₹65,000 paid (Fully Paid)
    payment_date: '2026-03-01',
    payment_method: 'IMPS',
    reference: 'IMPS-9921041',
    notes: 'Full settlement on manuscript delivery',
    created_at: '2026-03-01T12:00:00.000Z',
  },
  {
    id: 3,
    purchase_id: 3,
    amount_minor: 1500000, // ₹15,000 paid, ₹23,000 remaining
    payment_date: '2026-03-15',
    payment_method: 'Wire Transfer',
    reference: 'SWIFT-INRIA-092',
    notes: 'First tranche of advance',
    created_at: '2026-03-15T10:00:00.000Z',
  },
];

const INITIAL_MOCK_SALES = [
  {
    id: 1,
    purchase_id: 1,
    title: 'Reinforcement Learning in Quantum Circuit Synthesis',
    buyer_name: 'Dr. Vivek Malhotra (CyberTech Research)',
    buyer_contact: 'vivek@cybertech-ai.io | +91 98450 33412',
    sale_date: '2026-02-22',
    sale_price_minor: 7500000, // Sold for ₹75,000 (bought for ₹45,000, gross profit = ₹30,000)
    cost_price_minor: 4500000,
    notes: 'Exclusive client rights transfer with code repository.',
    created_at: '2026-02-22T14:00:00.000Z',
  },
  {
    id: 2,
    purchase_id: 2,
    title: 'High-Throughput Single-Cell RNA Sequence Alignment',
    buyer_name: 'GeneMatrix BioLabs GmbH',
    buyer_contact: 'contracts@genematrix.de | +49 89 289 01',
    sale_date: '2026-03-10',
    sale_price_minor: 11000000, // Sold for ₹1,10,000 (bought for ₹65,000, gross profit = ₹45,000)
    cost_price_minor: 6500000,
    notes: 'Payment scheduled in two installments.',
    created_at: '2026-03-10T15:30:00.000Z',
  },
];

const INITIAL_MOCK_BUYER_PAYMENTS = [
  {
    id: 1,
    sale_id: 1,
    amount_minor: 7500000, // ₹75,000 paid (Fully Settled)
    payment_date: '2026-02-22',
    payment_method: 'Bank Wire',
    reference: 'HDFC-REF-77291',
    notes: 'Full payment received upon delivery',
    created_at: '2026-02-22T14:30:00.000Z',
  },
  {
    id: 2,
    sale_id: 2,
    amount_minor: 6000000, // ₹60,000 received, ₹50,000 pending
    payment_date: '2026-03-10',
    payment_method: 'International Wire',
    reference: 'DEUT-EUR-88192',
    notes: 'Tranche 1 milestone payment',
    created_at: '2026-03-10T16:00:00.000Z',
  },
];

function getStored(key, defaultVal) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStored(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error('LocalStorage write error:', err);
  }
}

function initBrowserStorageIfEmpty() {
  if (!localStorage.getItem(STORAGE_KEY_PURCHASES)) {
    setStored(STORAGE_KEY_PURCHASES, INITIAL_MOCK_PURCHASES);
  }
  if (!localStorage.getItem(STORAGE_KEY_SELLER_PAYMENTS)) {
    setStored(STORAGE_KEY_SELLER_PAYMENTS, INITIAL_MOCK_SELLER_PAYMENTS);
  }
  if (!localStorage.getItem(STORAGE_KEY_SALES)) {
    setStored(STORAGE_KEY_SALES, INITIAL_MOCK_SALES);
  }
  if (!localStorage.getItem(STORAGE_KEY_BUYER_PAYMENTS)) {
    setStored(STORAGE_KEY_BUYER_PAYMENTS, INITIAL_MOCK_BUYER_PAYMENTS);
  }
}

export const tradingService = {
  // Purchases
  async listPurchases() {
    if (window.desktopAPI?.trading?.listPurchases) {
      return await window.desktopAPI.trading.listPurchases();
    }
    initBrowserStorageIfEmpty();
    const purchases = getStored(STORAGE_KEY_PURCHASES, []);
    const payments = getStored(STORAGE_KEY_SELLER_PAYMENTS, []);

    return purchases.map((p) => {
      const relPayments = payments.filter((pay) => pay.purchase_id === p.id);
      const paid = relPayments.reduce((s, pay) => s + (pay.amount_minor || 0), 0);
      const balance = (p.purchase_price_minor || 0) - paid;
      const lastPay = relPayments.length > 0 ? relPayments[relPayments.length - 1].payment_date : null;
      let status = 'Pending';
      if (paid >= (p.purchase_price_minor || 0) && (p.purchase_price_minor || 0) > 0) {
        status = 'Fully Paid';
      } else if (paid > 0) {
        status = 'Partially Paid';
      }
      return {
        ...p,
        amount_paid_minor: paid,
        balance_minor: balance,
        payments_count: relPayments.length,
        last_payment_date: lastPay,
        payment_status: status,
      };
    });
  },

  async createPurchase(data) {
    if (window.desktopAPI?.trading?.createPurchase) {
      return await window.desktopAPI.trading.createPurchase(data);
    }
    initBrowserStorageIfEmpty();
    const purchases = getStored(STORAGE_KEY_PURCHASES, []);
    const payments = getStored(STORAGE_KEY_SELLER_PAYMENTS, []);

    const newId = Date.now();
    const priceMinor = parseCurrencyToMinor(data.purchasePrice ?? data.purchase_price_minor);
    const initialPaidMinor = parseCurrencyToMinor(data.initialAmountPaid ?? 0);

    const newPurchase = {
      id: newId,
      title: data.title,
      seller_name: data.sellerName || data.seller_name,
      seller_contact: data.sellerContact || data.seller_contact || '',
      purchase_date: data.purchaseDate || data.purchase_date,
      purchase_price_minor: priceMinor,
      notes: data.notes || '',
      status: 'Active',
      created_at: new Date().toISOString(),
    };

    purchases.unshift(newPurchase);
    setStored(STORAGE_KEY_PURCHASES, purchases);

    if (initialPaidMinor > 0) {
      const newPayment = {
        id: Date.now() + 1,
        purchase_id: newId,
        amount_minor: initialPaidMinor,
        payment_date: data.purchaseDate || data.purchase_date,
        payment_method: data.paymentMethod || 'Bank Transfer',
        reference: data.reference || '',
        notes: 'Initial payment at purchase',
        created_at: new Date().toISOString(),
      };
      payments.unshift(newPayment);
      setStored(STORAGE_KEY_SELLER_PAYMENTS, payments);
    }

    return newPurchase;
  },

  async updatePurchase(data) {
    if (window.desktopAPI?.trading?.updatePurchase) {
      return await window.desktopAPI.trading.updatePurchase(data);
    }
    const purchases = getStored(STORAGE_KEY_PURCHASES, []);
    const updated = purchases.map((p) => {
      if (p.id === Number(data.id)) {
        return {
          ...p,
          title: data.title,
          seller_name: data.sellerName || data.seller_name,
          seller_contact: data.sellerContact || data.seller_contact || '',
          purchase_date: data.purchaseDate || data.purchase_date,
          purchase_price_minor: parseCurrencyToMinor(data.purchasePrice ?? data.purchase_price_minor),
          notes: data.notes || '',
          status: data.status || p.status,
        };
      }
      return p;
    });
    setStored(STORAGE_KEY_PURCHASES, updated);
    return { success: true };
  },

  async deletePurchase(id) {
    if (window.desktopAPI?.trading?.deletePurchase) {
      return await window.desktopAPI.trading.deletePurchase(id);
    }
    const numId = Number(id);
    const purchases = getStored(STORAGE_KEY_PURCHASES, []).filter((p) => p.id !== numId);
    const payments = getStored(STORAGE_KEY_SELLER_PAYMENTS, []).filter((pay) => pay.purchase_id !== numId);
    setStored(STORAGE_KEY_PURCHASES, purchases);
    setStored(STORAGE_KEY_SELLER_PAYMENTS, payments);
    return { success: true, id: numId };
  },

  // Seller Payments
  async listSellerPayments(purchaseId) {
    if (window.desktopAPI?.trading?.listSellerPayments) {
      return await window.desktopAPI.trading.listSellerPayments(purchaseId);
    }
    initBrowserStorageIfEmpty();
    const payments = getStored(STORAGE_KEY_SELLER_PAYMENTS, []);
    const purchases = getStored(STORAGE_KEY_PURCHASES, []);
    const list = purchaseId ? payments.filter((p) => p.purchase_id === Number(purchaseId)) : payments;

    return list.map((p) => {
      const parent = purchases.find((purch) => purch.id === p.purchase_id);
      return {
        ...p,
        paper_title: parent?.title || 'Unknown Paper',
        seller_name: parent?.seller_name || 'Unknown Seller',
      };
    });
  },

  async createSellerPayment(data) {
    if (window.desktopAPI?.trading?.createSellerPayment) {
      return await window.desktopAPI.trading.createSellerPayment(data);
    }
    const payments = getStored(STORAGE_KEY_SELLER_PAYMENTS, []);
    const newPayment = {
      id: Date.now(),
      purchase_id: Number(data.purchaseId || data.purchase_id),
      amount_minor: parseCurrencyToMinor(data.amount ?? data.amount_minor),
      payment_date: data.paymentDate || data.payment_date,
      payment_method: data.paymentMethod || data.payment_method || 'Bank Transfer',
      reference: data.reference || '',
      notes: data.notes || '',
      created_at: new Date().toISOString(),
    };
    payments.unshift(newPayment);
    setStored(STORAGE_KEY_SELLER_PAYMENTS, payments);
    return { id: newPayment.id, success: true };
  },

  async updateSellerPayment(data) {
    if (window.desktopAPI?.trading?.updateSellerPayment) {
      return await window.desktopAPI.trading.updateSellerPayment(data);
    }
    const payments = getStored(STORAGE_KEY_SELLER_PAYMENTS, []);
    const updated = payments.map((p) => {
      if (p.id === Number(data.id)) {
        return {
          ...p,
          amount_minor: parseCurrencyToMinor(data.amount ?? data.amount_minor),
          payment_date: data.paymentDate || data.payment_date,
          payment_method: data.paymentMethod || data.payment_method || 'Bank Transfer',
          reference: data.reference || '',
          notes: data.notes || '',
        };
      }
      return p;
    });
    setStored(STORAGE_KEY_SELLER_PAYMENTS, updated);
    return { success: true };
  },

  async deleteSellerPayment(id) {
    if (window.desktopAPI?.trading?.deleteSellerPayment) {
      return await window.desktopAPI.trading.deleteSellerPayment(id);
    }
    const payments = getStored(STORAGE_KEY_SELLER_PAYMENTS, []).filter((p) => p.id !== Number(id));
    setStored(STORAGE_KEY_SELLER_PAYMENTS, payments);
    return { success: true, id };
  },

  // Sales
  async listSales() {
    if (window.desktopAPI?.trading?.listSales) {
      return await window.desktopAPI.trading.listSales();
    }
    initBrowserStorageIfEmpty();
    const sales = getStored(STORAGE_KEY_SALES, []);
    const purchases = getStored(STORAGE_KEY_PURCHASES, []);
    const payments = getStored(STORAGE_KEY_BUYER_PAYMENTS, []);

    return sales.map((s) => {
      const parentPurch = purchases.find((p) => p.id === s.purchase_id);
      const relPayments = payments.filter((pay) => pay.sale_id === s.id);
      const received = relPayments.reduce((acc, pay) => acc + (pay.amount_minor || 0), 0);
      const balance = (s.sale_price_minor || 0) - received;
      const profit = (s.sale_price_minor || 0) - (s.cost_price_minor || 0);
      const lastPay = relPayments.length > 0 ? relPayments[relPayments.length - 1].payment_date : null;

      let status = 'Pending';
      if (received >= (s.sale_price_minor || 0) && (s.sale_price_minor || 0) > 0) {
        status = 'Fully Paid';
      } else if (received > 0) {
        status = 'Partially Paid';
      }

      return {
        ...s,
        original_paper_title: parentPurch?.title || '',
        seller_name: parentPurch?.seller_name || '',
        amount_received_minor: received,
        balance_minor: balance,
        profit_minor: profit,
        payments_count: relPayments.length,
        last_payment_date: lastPay,
        payment_status: status,
      };
    });
  },

  async createSale(data) {
    if (window.desktopAPI?.trading?.createSale) {
      return await window.desktopAPI.trading.createSale(data);
    }
    initBrowserStorageIfEmpty();
    const sales = getStored(STORAGE_KEY_SALES, []);
    const payments = getStored(STORAGE_KEY_BUYER_PAYMENTS, []);
    const purchases = getStored(STORAGE_KEY_PURCHASES, []);

    const newId = Date.now();
    const salePriceMinor = parseCurrencyToMinor(data.salePrice ?? data.sale_price_minor);
    let costPriceMinor = parseCurrencyToMinor(data.costPrice ?? data.cost_price_minor);
    const purchaseId = data.purchaseId || data.purchase_id ? Number(data.purchaseId || data.purchase_id) : null;

    if (purchaseId && !costPriceMinor) {
      const matchPurch = purchases.find((p) => p.id === purchaseId);
      if (matchPurch) costPriceMinor = matchPurch.purchase_price_minor;
    }

    const newSale = {
      id: newId,
      purchase_id: purchaseId,
      title: data.title,
      buyer_name: data.buyerName || data.buyer_name,
      buyer_contact: data.buyerContact || data.buyer_contact || '',
      sale_date: data.saleDate || data.sale_date,
      sale_price_minor: salePriceMinor,
      cost_price_minor: costPriceMinor,
      notes: data.notes || '',
      created_at: new Date().toISOString(),
    };

    sales.unshift(newSale);
    setStored(STORAGE_KEY_SALES, sales);

    const initialReceivedMinor = parseCurrencyToMinor(data.initialAmountReceived ?? 0);
    if (initialReceivedMinor > 0) {
      const newPayment = {
        id: Date.now() + 1,
        sale_id: newId,
        amount_minor: initialReceivedMinor,
        payment_date: data.saleDate || data.sale_date,
        payment_method: data.paymentMethod || 'Bank Transfer',
        reference: data.reference || '',
        notes: 'Initial installment on sale',
        created_at: new Date().toISOString(),
      };
      payments.unshift(newPayment);
      setStored(STORAGE_KEY_BUYER_PAYMENTS, payments);
    }

    return newSale;
  },

  async updateSale(data) {
    if (window.desktopAPI?.trading?.updateSale) {
      return await window.desktopAPI.trading.updateSale(data);
    }
    const sales = getStored(STORAGE_KEY_SALES, []);
    const updated = sales.map((s) => {
      if (s.id === Number(data.id)) {
        return {
          ...s,
          purchase_id: data.purchaseId || data.purchase_id ? Number(data.purchaseId || data.purchase_id) : null,
          title: data.title,
          buyer_name: data.buyerName || data.buyer_name,
          buyer_contact: data.buyerContact || data.buyer_contact || '',
          sale_date: data.saleDate || data.sale_date,
          sale_price_minor: parseCurrencyToMinor(data.salePrice ?? data.sale_price_minor),
          cost_price_minor: parseCurrencyToMinor(data.costPrice ?? data.cost_price_minor),
          notes: data.notes || '',
        };
      }
      return s;
    });
    setStored(STORAGE_KEY_SALES, updated);
    return { success: true };
  },

  async deleteSale(id) {
    if (window.desktopAPI?.trading?.deleteSale) {
      return await window.desktopAPI.trading.deleteSale(id);
    }
    const numId = Number(id);
    const sales = getStored(STORAGE_KEY_SALES, []).filter((s) => s.id !== numId);
    const payments = getStored(STORAGE_KEY_BUYER_PAYMENTS, []).filter((pay) => pay.sale_id !== numId);
    setStored(STORAGE_KEY_SALES, sales);
    setStored(STORAGE_KEY_BUYER_PAYMENTS, payments);
    return { success: true, id: numId };
  },

  // Buyer Payments
  async listBuyerPayments(saleId) {
    if (window.desktopAPI?.trading?.listBuyerPayments) {
      return await window.desktopAPI.trading.listBuyerPayments(saleId);
    }
    initBrowserStorageIfEmpty();
    const payments = getStored(STORAGE_KEY_BUYER_PAYMENTS, []);
    const sales = getStored(STORAGE_KEY_SALES, []);
    const list = saleId ? payments.filter((p) => p.sale_id === Number(saleId)) : payments;

    return list.map((p) => {
      const parent = sales.find((s) => s.id === p.sale_id);
      return {
        ...p,
        paper_title: parent?.title || 'Unknown Paper',
        buyer_name: parent?.buyer_name || 'Unknown Buyer',
      };
    });
  },

  async createBuyerPayment(data) {
    if (window.desktopAPI?.trading?.createBuyerPayment) {
      return await window.desktopAPI.trading.createBuyerPayment(data);
    }
    const payments = getStored(STORAGE_KEY_BUYER_PAYMENTS, []);
    const newPayment = {
      id: Date.now(),
      sale_id: Number(data.saleId || data.sale_id),
      amount_minor: parseCurrencyToMinor(data.amount ?? data.amount_minor),
      payment_date: data.paymentDate || data.payment_date,
      payment_method: data.paymentMethod || data.payment_method || 'Bank Transfer',
      reference: data.reference || '',
      notes: data.notes || '',
      created_at: new Date().toISOString(),
    };
    payments.unshift(newPayment);
    setStored(STORAGE_KEY_BUYER_PAYMENTS, payments);
    return { id: newPayment.id, success: true };
  },

  async updateBuyerPayment(data) {
    if (window.desktopAPI?.trading?.updateBuyerPayment) {
      return await window.desktopAPI.trading.updateBuyerPayment(data);
    }
    const payments = getStored(STORAGE_KEY_BUYER_PAYMENTS, []);
    const updated = payments.map((p) => {
      if (p.id === Number(data.id)) {
        return {
          ...p,
          amount_minor: parseCurrencyToMinor(data.amount ?? data.amount_minor),
          payment_date: data.paymentDate || data.payment_date,
          payment_method: data.paymentMethod || data.payment_method || 'Bank Transfer',
          reference: data.reference || '',
          notes: data.notes || '',
        };
      }
      return p;
    });
    setStored(STORAGE_KEY_BUYER_PAYMENTS, updated);
    return { success: true };
  },

  async deleteBuyerPayment(id) {
    if (window.desktopAPI?.trading?.deleteBuyerPayment) {
      return await window.desktopAPI.trading.deleteBuyerPayment(id);
    }
    const payments = getStored(STORAGE_KEY_BUYER_PAYMENTS, []).filter((p) => p.id !== Number(id));
    setStored(STORAGE_KEY_BUYER_PAYMENTS, payments);
    return { success: true, id };
  },

  // Balances
  async getBalances() {
    if (window.desktopAPI?.trading?.getBalances) {
      return await window.desktopAPI.trading.getBalances();
    }
    initBrowserStorageIfEmpty();
    const purchases = getStored(STORAGE_KEY_PURCHASES, []);
    const sellerPayments = getStored(STORAGE_KEY_SELLER_PAYMENTS, []);
    const sales = getStored(STORAGE_KEY_SALES, []);
    const buyerPayments = getStored(STORAGE_KEY_BUYER_PAYMENTS, []);

    // Group by seller_name
    const sellerMap = new Map();
    purchases.forEach((p) => {
      const name = p.seller_name || 'Unknown Seller';
      if (!sellerMap.has(name)) {
        sellerMap.set(name, {
          seller_name: name,
          papers_count: 0,
          papers_list: [],
          total_purchase_amount_minor: 0,
          total_amount_paid_minor: 0,
          last_payment_date: null,
        });
      }
      const entry = sellerMap.get(name);
      entry.papers_count += 1;
      entry.papers_list.push(p.title);
      entry.total_purchase_amount_minor += p.purchase_price_minor || 0;
    });

    sellerPayments.forEach((pay) => {
      const parent = purchases.find((p) => p.id === pay.purchase_id);
      if (parent && sellerMap.has(parent.seller_name)) {
        const entry = sellerMap.get(parent.seller_name);
        entry.total_amount_paid_minor += pay.amount_minor || 0;
        if (!entry.last_payment_date || pay.payment_date > entry.last_payment_date) {
          entry.last_payment_date = pay.payment_date;
        }
      }
    });

    const sellerPayables = Array.from(sellerMap.values()).map((s) => {
      const rem = s.total_purchase_amount_minor - s.total_amount_paid_minor;
      let status = 'Pending';
      if (rem <= 0) status = 'Fully Paid';
      else if (s.total_amount_paid_minor > 0) status = 'Partially Paid';
      return {
        ...s,
        papers_list: s.papers_list.join(' || '),
        remaining_amount_minor: rem,
        payment_status: status,
      };
    });

    // Group by buyer_name
    const buyerMap = new Map();
    sales.forEach((s) => {
      const name = s.buyer_name || 'Unknown Buyer';
      if (!buyerMap.has(name)) {
        buyerMap.set(name, {
          buyer_name: name,
          papers_count: 0,
          papers_list: [],
          total_sales_amount_minor: 0,
          total_amount_received_minor: 0,
          last_payment_date: null,
        });
      }
      const entry = buyerMap.get(name);
      entry.papers_count += 1;
      entry.papers_list.push(s.title);
      entry.total_sales_amount_minor += s.sale_price_minor || 0;
    });

    buyerPayments.forEach((pay) => {
      const parent = sales.find((s) => s.id === pay.sale_id);
      if (parent && buyerMap.has(parent.buyer_name)) {
        const entry = buyerMap.get(parent.buyer_name);
        entry.total_amount_received_minor += pay.amount_minor || 0;
        if (!entry.last_payment_date || pay.payment_date > entry.last_payment_date) {
          entry.last_payment_date = pay.payment_date;
        }
      }
    });

    const buyerReceivables = Array.from(buyerMap.values()).map((b) => {
      const rem = b.total_sales_amount_minor - b.total_amount_received_minor;
      let status = 'Pending';
      if (rem <= 0) status = 'Fully Paid';
      else if (b.total_amount_received_minor > 0) status = 'Partially Paid';
      return {
        ...b,
        papers_list: b.papers_list.join(' || '),
        remaining_amount_minor: rem,
        payment_status: status,
      };
    });

    return { sellerPayables, buyerReceivables };
  },

  // Financial Reports
  async getFinancials() {
    if (window.desktopAPI?.trading?.getFinancials) {
      return await window.desktopAPI.trading.getFinancials();
    }
    initBrowserStorageIfEmpty();
    const purchases = getStored(STORAGE_KEY_PURCHASES, []);
    const sellerPayments = getStored(STORAGE_KEY_SELLER_PAYMENTS, []);
    const sales = getStored(STORAGE_KEY_SALES, []);
    const buyerPayments = getStored(STORAGE_KEY_BUYER_PAYMENTS, []);

    const totalPurchaseValue = purchases.reduce((acc, p) => acc + (p.purchase_price_minor || 0), 0);
    const totalSalesValue = sales.reduce((acc, s) => acc + (s.sale_price_minor || 0), 0);
    const totalCostOfSold = sales.reduce((acc, s) => acc + (s.cost_price_minor || 0), 0);
    const grossProfit = totalSalesValue - totalCostOfSold;

    const totalCashPaid = sellerPayments.reduce((acc, p) => acc + (p.amount_minor || 0), 0);
    const totalCashReceived = buyerPayments.reduce((acc, p) => acc + (p.amount_minor || 0), 0);

    const outstandingSellerPayables = totalPurchaseValue - totalCashPaid;
    const outstandingBuyerReceivables = totalSalesValue - totalCashReceived;
    const netCashPosition = totalCashReceived - totalCashPaid;

    const monthlySummary = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      const pMonth = purchases.filter((p) => p.purchase_date && p.purchase_date.startsWith(ym));
      const sMonth = sales.filter((s) => s.sale_date && s.sale_date.startsWith(ym));
      const paidMonth = sellerPayments.filter((p) => p.payment_date && p.payment_date.startsWith(ym));
      const recMonth = buyerPayments.filter((p) => p.payment_date && p.payment_date.startsWith(ym));

      const pVal = pMonth.reduce((a, b) => a + (b.purchase_price_minor || 0), 0);
      const sVal = sMonth.reduce((a, b) => a + (b.sale_price_minor || 0), 0);
      const sCost = sMonth.reduce((a, b) => a + (b.cost_price_minor || 0), 0);
      const cPaid = paidMonth.reduce((a, b) => a + (b.amount_minor || 0), 0);
      const cRec = recMonth.reduce((a, b) => a + (b.amount_minor || 0), 0);

      monthlySummary.push({
        monthKey: ym,
        label,
        purchasesCount: pMonth.length,
        salesCount: sMonth.length,
        purchasesValue: pVal,
        salesValue: sVal,
        grossProfit: sVal - sCost,
        cashPaid: cPaid,
        cashReceived: cRec,
        netCashFlow: cRec - cPaid,
      });
    }

    return {
      totalPurchaseValue,
      totalSalesValue,
      grossProfit,
      totalCashPaid,
      totalCashReceived,
      outstandingSellerPayables,
      outstandingBuyerReceivables,
      netCashPosition,
      papersPurchasedCount: purchases.length,
      papersSoldCount: sales.length,
      monthlySummary,
    };
  },

  // Unified Transactions
  async getUnifiedTransactions() {
    if (window.desktopAPI?.trading?.getUnifiedTransactions) {
      return await window.desktopAPI.trading.getUnifiedTransactions();
    }
    initBrowserStorageIfEmpty();
    const purchases = getStored(STORAGE_KEY_PURCHASES, []);
    const sellerPayments = getStored(STORAGE_KEY_SELLER_PAYMENTS, []);
    const sales = getStored(STORAGE_KEY_SALES, []);
    const buyerPayments = getStored(STORAGE_KEY_BUYER_PAYMENTS, []);

    const pItems = purchases.map((p) => ({
      id: p.id,
      type: 'Purchase',
      date: p.purchase_date,
      title: p.title,
      party: p.seller_name,
      party_contact: p.seller_contact,
      amount_minor: p.purchase_price_minor,
      status: p.status || 'Active',
      notes: p.notes,
      created_at: p.created_at,
      payment_method: '',
      reference: '',
      related_id: p.id,
      parent_id: null,
    }));

    const sItems = sales.map((s) => ({
      id: s.id,
      type: 'Sale',
      date: s.sale_date,
      title: s.title,
      party: s.buyer_name,
      party_contact: s.buyer_contact,
      amount_minor: s.sale_price_minor,
      status: 'Active',
      notes: s.notes,
      created_at: s.created_at,
      payment_method: '',
      reference: '',
      related_id: s.id,
      parent_id: s.purchase_id,
    }));

    const spItems = sellerPayments.map((sp) => {
      const parent = purchases.find((p) => p.id === sp.purchase_id);
      return {
        id: sp.id,
        type: 'Seller Payment',
        date: sp.payment_date,
        title: parent?.title || 'Purchase payment',
        party: parent?.seller_name || 'Seller',
        party_contact: parent?.seller_contact || '',
        amount_minor: sp.amount_minor,
        status: 'Completed',
        notes: sp.notes,
        created_at: sp.created_at,
        payment_method: sp.payment_method || 'Bank Transfer',
        reference: sp.reference || '',
        related_id: sp.id,
        parent_id: sp.purchase_id,
      };
    });

    const bpItems = buyerPayments.map((bp) => {
      const parent = sales.find((s) => s.id === bp.sale_id);
      return {
        id: bp.id,
        type: 'Buyer Receipt',
        date: bp.payment_date,
        title: parent?.title || 'Sale receipt',
        party: parent?.buyer_name || 'Buyer',
        party_contact: parent?.buyer_contact || '',
        amount_minor: bp.amount_minor,
        status: 'Completed',
        notes: bp.notes,
        created_at: bp.created_at,
        payment_method: bp.payment_method || 'Bank Transfer',
        reference: bp.reference || '',
        related_id: bp.id,
        parent_id: bp.sale_id,
      };
    });

    const all = [...pItems, ...sItems, ...spItems, ...bpItems];
    all.sort((a, b) => {
      const cmp = (b.date || '').localeCompare(a.date || '');
      if (cmp !== 0) return cmp;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
    return all;
  },

  // Backup & Restore
  async exportBackup() {
    if (window.desktopAPI?.trading?.exportBackup) {
      return await window.desktopAPI.trading.exportBackup();
    }
    // Browser export fallback: create download
    const purchases = getStored(STORAGE_KEY_PURCHASES, []);
    const sellerPayments = getStored(STORAGE_KEY_SELLER_PAYMENTS, []);
    const sales = getStored(STORAGE_KEY_SALES, []);
    const buyerPayments = getStored(STORAGE_KEY_BUYER_PAYMENTS, []);

    const now = new Date();
    const data = {
      app: 'research-trading',
      format_version: 1,
      export_date: now.toISOString(),
      summary: {
        purchases: purchases.length,
        seller_payments: sellerPayments.length,
        sales: sales.length,
        buyer_payments: buyerPayments.length,
        total_records: purchases.length + sellerPayments.length + sales.length + buyerPayments.length,
      },
      tables: {
        trading_purchases: purchases,
        trading_seller_payments: sellerPayments,
        trading_sales: sales,
        trading_buyer_payments: buyerPayments,
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `ResearchTrading_Backup_${timestamp}.tpbak`;
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      fileName,
      size: blob.size,
      summary: data.summary,
    };
  },

  async selectRestoreFile() {
    if (window.desktopAPI?.trading?.selectRestoreFile) {
      return await window.desktopAPI.trading.selectRestoreFile();
    }
    return null;
  },

  async restoreBackup(options) {
    if (window.desktopAPI?.trading?.restoreBackup) {
      return await window.desktopAPI.trading.restoreBackup(options);
    }
    const data = options.rawJsonData
      ? typeof options.rawJsonData === 'string'
        ? JSON.parse(options.rawJsonData)
        : options.rawJsonData
      : null;

    if (!data || data.app !== 'research-trading' || !data.tables) {
      throw new Error('Invalid trading backup format.');
    }

    setStored(STORAGE_KEY_PURCHASES, data.tables.trading_purchases || []);
    setStored(STORAGE_KEY_SELLER_PAYMENTS, data.tables.trading_seller_payments || []);
    setStored(STORAGE_KEY_SALES, data.tables.trading_sales || []);
    setStored(STORAGE_KEY_BUYER_PAYMENTS, data.tables.trading_buyer_payments || []);

    return {
      success: true,
      counts: {
        purchases: (data.tables.trading_purchases || []).length,
        seller_payments: (data.tables.trading_seller_payments || []).length,
        sales: (data.tables.trading_sales || []).length,
        buyer_payments: (data.tables.trading_buyer_payments || []).length,
      },
    };
  },

  async listBackupLogs() {
    if (window.desktopAPI?.trading?.listBackupLogs) {
      return await window.desktopAPI.trading.listBackupLogs();
    }
    return getStored(STORAGE_KEY_BACKUP_LOGS, []);
  },
};

export default tradingService;

