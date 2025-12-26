import { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  where,
} from 'firebase/firestore';

// --- ثوابت النظام ---
const SHOP_NAME = 'بيت الغسيل والكوي';
const SHOP_PHONE = '0791112838';
const SHOP_ADDR = 'ناعور - مجمع سعود التجاري';

// أنواع المستخدمين
const USER_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee'
};

// الفئات الرئيسية
const MAIN_CATEGORIES = [
  { id: 'clothes', name: 'ملابس', icon: '👕' },
  { id: 'curtains', name: 'حرامات', icon: '🪟' },
  { id: 'blankets', name: 'برادي', icon: '🛏️' },
  { id: 'sheets', name: 'شراشف', icon: '🛌' },
  { id: 'carpets', name: 'سجاد', icon: '🧹' },
  { id: 'tailoring', name: 'خياطة', icon: '🪡' }
];

// الفئات الفرعية لكل فئة رئيسية
const SUB_CATEGORIES: { [key: string]: { id: string, name: string }[] } = {
  clothes: [
    { id: 'shirts', name: 'قمصان' },
    { id: 'pants', name: 'بناطيل' },
    { id: 'dresses', name: 'فساتين' },
    { id: 'jackets', name: 'جواكيت' },
    { id: 'suits', name: 'بدل' },
    { id: 'skirts', name: 'تنانير' },
    { id: 'coats', name: 'معاطف' },
    { id: 'other-clothes', name: 'ملابس أخرى' }
  ],
  curtains: [
    { id: 'regular-curtains', name: 'حرامات عادية' },
    { id: 'blackout-curtains', name: 'حرامات معتمة' },
    { id: 'sheer-curtains', name: 'حرامات شيفون' },
    { id: 'other-curtains', name: 'حرامات أخرى' }
  ],
  blankets: [
    { id: 'single-blankets', name: 'برادي فردي' },
    { id: 'double-blankets', name: 'برادي مزدوج' },
    { id: 'king-blankets', name: 'برادي كينج' },
    { id: 'wool-blankets', name: 'برادي صوف' },
    { id: 'other-blankets', name: 'برادي أخرى' }
  ],
  sheets: [
    { id: 'single-sheets', name: 'شراشف فردي' },
    { id: 'double-sheets', name: 'شراشف مزدوج' },
    { id: 'king-sheets', name: 'شراشف كينج' },
    { id: 'fitted-sheets', name: 'شراشف مطاطية' },
    { id: 'other-sheets', name: 'شراشف أخرى' }
  ],
  carpets: [
    { id: 'small-carpets', name: 'سجاد صغير' },
    { id: 'medium-carpets', name: 'سجاد متوسط' },
    { id: 'large-carpets', name: 'سجاد كبير' },
    { id: 'persian-carpets', name: 'سجاد فارسي' },
    { id: 'other-carpets', name: 'سجاد أخرى' }
  ],
  tailoring: [
    { id: 'alterations', name: 'تعديلات' },
    { id: 'repairs', name: 'تصليحات' },
    { id: 'custom', name: 'خياطة خاصة' }
  ]
};

// أنواع الخدمات
const SERVICE_TYPES = [
  { id: 'wash-iron', name: 'غسيل وكوي', priceMultiplier: 1.0 },
  { id: 'wash-only', name: 'غسيل فقط', priceMultiplier: 0.5 },
  { id: 'iron-only', name: 'كوي فقط', priceMultiplier: 0.5 }
];

// واجهات TypeScript
interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  createdAt: any;
  password?: string;
}

interface Product {
  id: string;
  name: string;
  mainCategory: string;
  subCategory: string;
  fullServicePrice: number;
  availableServices: string[];
  description: string;
  createdAt: any;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  createdAt: any;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientPhone: string;
  items: CartItem[];
  totalAmount: number;
  amountPaidAtStart: number;
  remainingAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  deliveryDate: string;
  createdAt: any;
  createdBy: string;
}

interface CartItem {
  id: number;
  productId: string;
  name: string;
  mainCategory: string;
  subCategory: string;
  serviceType: string;
  serviceTypeName: string;
  qty: number;
  price: number;
  total: number;
  itemNote: string;
  hasStains: boolean;
  isUrgent: boolean;
  description: string;
}

function App() {
  // --- إدارة الحالة (States) ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState<string>('pos');
  const [shiftsArchive, setShiftsArchive] = useState<any[]>([]);
  
  // بيانات المستخدمين
  const [users, setUsers] = useState<User[]>([]);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState(USER_ROLES.EMPLOYEE);
  const [newUserFullName, setNewUserFullName] = useState('');
  
  // البيانات الأساسية
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoicesList, setInvoicesList] = useState<Invoice[]>([]);
  const [expensesList, setExpensesList] = useState<any[]>([]);
  
  // المالية (الإجمالية)
  const [fin, setFin] = useState({ cash: 0, visa: 0, cliq: 0, total: 0, exp: 0, debt: 0 });
  const [currentShiftData, setCurrentShiftData] = useState({ cash: 0, visa: 0, cliq: 0, exp: 0 });
  const [cashFloat, setCashFloat] = useState('0');

  // 📊 فلاتر التقارير المتقدمة
  const [reportType, setReportType] = useState('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]); 
  const [filteredStats, setFilteredStats] = useState({ cash: 0, visa: 0, cliq: 0, total: 0, exp: 0, debt: 0 });
  const [reportDetails, setReportDetails] = useState<any[]>([]);

  // POS Inputs
  const [invoiceClientName, setInvoiceClientName] = useState('');
  const [invoiceClientPhone, setInvoiceClientPhone] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('مدفوع');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [partialPaymentAmount, setPartialPaymentAmount] = useState('');
  const [manualPriceMode, setManualPriceMode] = useState(false); 
  const [lastInvoice, setLastInvoice] = useState<any>(null); 

  // فلاتر وعرض المنتجات
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [searchProduct, setSearchProduct] = useState('');
  const [serviceModal, setServiceModal] = useState<Product | null>(null);
  const [tailoringModal, setTailoringModal] = useState(false);
  const [tailoringDetails, setTailoringDetails] = useState('');
  const [tailoringPrice, setTailoringPrice] = useState('');
  const [tailoringQty, setTailoringQty] = useState('1');

  // البحث والأرشيف
  const [searchTerm, setSearchTerm] = useState('');
  const [archiveDate, setArchiveDate] = useState(''); 

  // نماذج الإدخال
  const [expName, setExpName] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('مواد تنظيف');
  
  const [newCrmName, setNewCrmName] = useState('');
  const [newCrmPhone, setNewCrmPhone] = useState('');
  
  // إعدادات المنتجات الجديدة
  const [newProduct, setNewProduct] = useState({
    name: '',
    mainCategory: 'clothes',
    subCategory: '',
    fullServicePrice: '',
    availableServices: ['wash-iron', 'wash-only', 'iron-only'],
    description: ''
  });
  const [showCustomSubCategory, setShowCustomSubCategory] = useState(false);
  const [customSubCategory, setCustomSubCategory] = useState('');

  // النوافذ المنبثقة
  const [deliveryModal, setDeliveryModal] = useState<any>(null);
  const [shiftModal, setShiftModal] = useState(false);
  const [showShiftArchiveModal, setShowShiftArchiveModal] = useState(false);
  const [viewInvoiceModal, setViewInvoiceModal] = useState<any>(null);
  const [accountStatementModal, setAccountStatementModal] = useState<any>(null);
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState<any>(null);
  const [customerTransactions, setCustomerTransactions] = useState<any[]>([]);

  // --- Effects ---
  useEffect(() => {
    const savedUser = localStorage.getItem('dryCleanUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Error parsing saved user:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      // Subscribe to real-time updates
      const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setProducts(productsData);
      });

      const unsubscribeCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
        const customersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Customer[];
        setCustomers(customersData);
      });

      const unsubscribeInvoices = onSnapshot(collection(db, 'invoices'), (snapshot) => {
        const invoicesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Invoice[];
        setInvoicesList(invoicesData);
      });

      const unsubscribeShifts = onSnapshot(
        query(collection(db, "shifts_archive"), orderBy("timestamp", "desc")), 
        (snapshot) => {
          const shiftsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setShiftsArchive(shiftsData);
        }
      );

      if (currentUser.role === USER_ROLES.ADMIN) {
        const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
          const usersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as User[];
          setUsers(usersData);
        });

        const unsubscribeExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
          const expensesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setExpensesList(expensesData);
        });

        return () => {
          unsubscribeProducts();
          unsubscribeCustomers();
          unsubscribeInvoices();
          unsubscribeShifts();
          unsubscribeUsers();
          unsubscribeExpenses();
        };
      }

      return () => {
        unsubscribeProducts();
        unsubscribeCustomers();
        unsubscribeInvoices();
        unsubscribeShifts();
      };
    }
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    if (paymentStatus !== 'جزئي') {
      setPartialPaymentAmount('');
    } else if (paymentStatus === 'جزئي' && !partialPaymentAmount && cart.length > 0) {
      const total = cart.reduce((a, b) => a + b.total, 0);
      setPartialPaymentAmount((total * 0.5).toFixed(2));
    }
  }, [paymentStatus, cart]);

  // --- Functions ---
  
  // تسجيل الدخول
  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) {
      alert("الرجاء إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    
    try {
      // إذا كان اسم المستخدم "admin" وكلمة المرور "123456" (للاختبار)
      if (loginUsername === 'admin' && loginPassword === '123456') {
        const demoUser = {
          id: 'demo-admin',
          username: 'admin',
          fullName: 'مدير النظام',
          role: 'admin',
          createdAt: Timestamp.now()
        };
        
        setCurrentUser(demoUser);
        setIsLoggedIn(true);
        localStorage.setItem('dryCleanUser', JSON.stringify(demoUser));
        
        setLoginUsername('');
        setLoginPassword('');
        alert("تم تسجيل الدخول بنجاح!");
        return;
      }
      
      // البحث في قاعدة البيانات
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("username", "==", loginUsername));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert("اسم المستخدم أو كلمة المرور غير صحيحة");
        return;
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      if (userData.password === loginPassword) {
        const user = {
          id: userDoc.id,
          username: userData.username,
          fullName: userData.fullName,
          role: userData.role,
          createdAt: userData.createdAt
        };
        
        setCurrentUser(user);
        setIsLoggedIn(true);
        localStorage.setItem('dryCleanUser', JSON.stringify(user));
        
        setLoginUsername('');
        setLoginPassword('');
        alert("تم تسجيل الدخول بنجاح!");
      } else {
        alert("اسم المستخدم أو كلمة المرور غير صحيحة");
      }
    } catch (error) {
      console.error("خطأ في تسجيل الدخول:", error);
      alert("حدث خطأ أثناء تسجيل الدخول");
    }
  };

  // تسجيل الخروج
  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('dryCleanUser');
    setView('pos');
  };

  // التحقق من الصلاحيات
  const hasPermission = (requiredRole: string) => {
    if (!currentUser) return false;
    if (currentUser.role === USER_ROLES.ADMIN) return true;
    return currentUser.role === requiredRole;
  };

  const fetchFinancials = async () => {
    try {
      const [invSnapshot, expSnapshot, shiftsSnapshot] = await Promise.all([
        getDocs(collection(db, 'invoices')),
        getDocs(collection(db, 'expenses')),
        getDocs(query(collection(db, 'shifts_archive'), orderBy('timestamp', 'desc')))
      ]);
      
      const lastShift = shiftsSnapshot.docs[0]?.data();
      const lastCloseTime = lastShift?.timestamp?.toDate() || new Date(0);
      if (lastShift) setCashFloat(lastShift.nextFloat || '0');

      let stats = { cash: 0, visa: 0, cliq: 0, total: 0, exp: 0, debt: 0 };
      let shiftStats = { cash: 0, visa: 0, cliq: 0, exp: 0 };

      const invs = invSnapshot.docs.map(d => {
        const data = d.data();
        const date = data.createdAt?.toDate();
        return {
          id: d.id,
          ...data,
          dateStr: date?.toLocaleString('ar-EG') || '',
          fullDate: date?.toISOString().split('T')[0] || '',
          monthStr: date?.toISOString().slice(0, 7) || '',
          yearStr: date?.toISOString().slice(0, 4) || ''
        };
      });
      
      invs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setInvoicesList(invs);

      invSnapshot.docs.forEach(d => {
        const i = d.data();
        if (i.orderStatus !== 'ملغية') {
          const paid = i.amountPaidAtStart || 0;
          const rem = i.totalAmount - paid;
          const isNew = i.createdAt?.toDate() > lastCloseTime;

          const add = (m: string, a: number) => {
            if (m === 'Cash') { 
              stats.cash += a; 
              if (isNew) shiftStats.cash += a; 
            }
            if (m === 'Visa') { 
              stats.visa += a; 
              if (isNew) shiftStats.visa += a; 
            }
            if (m === 'CliQ') { 
              stats.cliq += a; 
              if (isNew) shiftStats.cliq += a; 
            }
          };

          add(i.paymentMethod, paid);
          if (i.deliveryPayMethod) add(i.deliveryPayMethod, rem);
          if (i.orderStatus !== 'تم الاستلام' || i.deliveryPayMethod === 'Debt') {
            stats.debt += i.remainingAmount || 0;
          }
        }
      });

      expSnapshot.docs.forEach(d => {
        const amount = Number(d.data().amount) || 0;
        stats.exp += amount;
        if (d.data().createdAt?.toDate() > lastCloseTime) {
          shiftStats.exp += amount;
        }
      });

      stats.total = stats.cash + stats.visa + stats.cliq;
      setCurrentShiftData(shiftStats); 
      setFin(stats);
      
      const expenses = expSnapshot.docs.map(d => {
        const data = d.data();
        const date = data.createdAt?.toDate();
        return {
          id: d.id,
          ...data,
          dateStr: date?.toLocaleString('ar-EG') || '',
          fullDate: date?.toISOString().split('T')[0] || '',
          monthStr: date?.toISOString().slice(0, 7) || '',
          yearStr: date?.toISOString().slice(0, 4) || ''
        };
      }).reverse();
      
      setExpensesList(expenses);
    } catch (error) {
      console.error("Error fetching financials:", error);
    }
  };

  // دالة لإضافة منتج للسلة مع اختيار الخدمة
  const handleAddToCart = (product: Product) => {
    if (product.availableServices && product.availableServices.length > 1) {
      setServiceModal(product);
    } else {
      const serviceType = product.availableServices?.[0] || 'wash-iron';
      addProductToCart(product, serviceType);
    }
  };

  // إضافة المنتج للسلة مع نوع الخدمة المحدد
  const addProductToCart = (product: Product, serviceTypeId: string) => {
    const serviceType = SERVICE_TYPES.find(s => s.id === serviceTypeId);
    const mainCategory = MAIN_CATEGORIES.find(c => c.id === product.mainCategory);
    const subCategory = SUB_CATEGORIES[product.mainCategory]?.find(s => s.id === product.subCategory);
    
    if (!serviceType) return;

    let finalPrice = Number(product.fullServicePrice) * serviceType.priceMultiplier;
    let qty = 1;
    let itemNote = "";
    
    if (product.mainCategory === 'carpets') {
      const meters = prompt("كم عدد الأمتار للسجاد؟");
      if (!meters || isNaN(Number(meters)) || Number(meters) <= 0) return;
      qty = Number(meters);
      finalPrice = product.fullServicePrice;
      itemNote = `(${qty} متر)`;
    } else if (manualPriceMode) {
      const userPrice = prompt(`أدخل السعر الجديد لـ (${product.name}):`, finalPrice.toString());
      if (userPrice === null) return;
      finalPrice = Number(userPrice);
      if (isNaN(finalPrice) || finalPrice < 0) return;
    }

    const totalItemPrice = finalPrice * qty;

    const existingItem = cart.find(item => 
      item.productId === product.id && 
      item.serviceType === serviceTypeId &&
      item.price === finalPrice
    );

    if (existingItem) {
      setCart(cart.map(item => 
        item.id === existingItem.id 
          ? { ...item, qty: item.qty + qty, total: (item.qty + qty) * item.price }
          : item
      ));
    } else {
      const newItem: CartItem = {
        id: Date.now(),
        productId: product.id,
        name: product.name,
        mainCategory: mainCategory?.name || 'غير محدد',
        subCategory: subCategory?.name || product.subCategory,
        serviceType: serviceTypeId,
        serviceTypeName: serviceType.name,
        qty: qty,
        price: finalPrice,
        total: totalItemPrice,
        itemNote: itemNote,
        fullServicePrice: product.fullServicePrice,
        hasStains: false,
        isUrgent: false,
        description: product.description || ''
      };

      setCart([...cart, newItem]);
    }

    setServiceModal(null);
  };

  // حساب السعر حسب نوع الخدمة
  const calculateServicePrice = (basePrice: number, serviceTypeId: string) => {
    const service = SERVICE_TYPES.find(s => s.id === serviceTypeId);
    return service ? (basePrice * service.priceMultiplier).toFixed(2) : basePrice.toFixed(2);
  };

  // دالة لإنشاء كشف حساب للعميل
  const generateAccountStatement = async (customer: any) => {
    setSelectedCustomerForStatement(customer);
    
    const customerInvoices = invoicesList.filter(inv => 
      inv.clientPhone === customer.phone || inv.clientName === customer.name
    );
    
    const transactions = customerInvoices.map(inv => ({
      type: 'فاتورة',
      date: inv.createdAt?.toDate().toLocaleDateString('ar-EG') || '',
      description: `فاتورة #${inv.invoiceNumber}`,
      debit: inv.totalAmount,
      credit: inv.amountPaidAtStart,
      balance: inv.remainingAmount,
      invoiceId: inv.id,
      status: inv.orderStatus,
      paymentStatus: inv.paymentStatus || 'مدفوع'
    }));
    
    setCustomerTransactions(transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setAccountStatementModal(true);
  };

  const calculateCustomerBalance = (customer: any) => {
    const customerInvoices = invoicesList.filter(inv => 
      inv.clientPhone === customer.phone || inv.clientName === customer.name
    );
    
    const totalDebt = customerInvoices.reduce((acc, inv) => {
      if (inv.orderStatus !== 'ملغية') {
        return acc + (inv.remainingAmount || 0);
      }
      return acc;
    }, 0);
    
    return totalDebt;
  };

  const calculateReportStats = () => {
    let tempStats = { cash: 0, visa: 0, cliq: 0, total: 0, exp: 0, debt: 0 };
    let details: any[] = [];
    
    const relevantInvoices = invoicesList.filter(inv => {
      const invDate = inv.createdAt?.toDate();
      if (!invDate) return false;
      
      const invFullDate = invDate.toISOString().split('T')[0];
      const invMonthStr = invDate.toISOString().slice(0, 7);
      const invYearStr = invDate.toISOString().slice(0, 4);
      
      if (reportType === 'daily') return invFullDate === reportDate;
      if (reportType === 'monthly') return invMonthStr === reportDate.slice(0, 7);
      if (reportType === 'year') return invYearStr === reportDate.slice(0, 4);
      return false;
    });

    const relevantExpenses = expensesList.filter(exp => {
      const expDate = exp.createdAt?.toDate();
      if (!expDate) return false;
      
      const expFullDate = expDate.toISOString().split('T')[0];
      const expMonthStr = expDate.toISOString().slice(0, 7);
      const expYearStr = expDate.toISOString().slice(0, 4);
      
      if (reportType === 'daily') return expFullDate === reportDate;
      if (reportType === 'monthly') return expMonthStr === reportDate.slice(0, 7);
      if (reportType === 'year') return expYearStr === reportDate.slice(0, 4);
      return false;
    });

    relevantInvoices.forEach(i => {
      if (i.orderStatus !== 'ملغية') {
        const paid = i.amountPaidAtStart || 0;
        const rem = i.totalAmount - paid;
        
        const add = (m: string, a: number) => {
          if (m === 'Cash') tempStats.cash += a;
          if (m === 'Visa') tempStats.visa += a;
          if (m === 'CliQ') tempStats.cliq += a;
        };
        
        add(i.paymentMethod, paid);
        if (i.deliveryPayMethod) add(i.deliveryPayMethod, rem);
        if (i.orderStatus !== 'تم الاستلام' || i.deliveryPayMethod === 'Debt') {
          tempStats.debt += i.remainingAmount || 0;
        }
        
        details.push({
          type: 'فاتورة',
          id: i.invoiceNumber,
          client: i.clientName,
          amount: i.totalAmount,
          paid: paid,
          remaining: rem,
          paymentMethod: i.paymentMethod,
          status: i.orderStatus,
          date: i.createdAt?.toDate().toLocaleDateString('ar-EG')
        });
      }
    });

    relevantExpenses.forEach(e => {
      tempStats.exp += Number(e.amount) || 0;
      details.push({
        type: 'مصروف',
        id: e.id,
        description: e.name,
        category: e.category,
        amount: -e.amount,
        date: e.createdAt?.toDate().toLocaleDateString('ar-EG')
      });
    });

    tempStats.total = tempStats.cash + tempStats.visa + tempStats.cliq;
    setFilteredStats(tempStats);
    setReportDetails(details);
  };

  const handleSaveInvoice = async () => {
    if (!invoiceClientName || cart.length === 0) {
      alert("الرجاء إدخال اسم العميل واختيار أصناف");
      return;
    }
    
    const total = cart.reduce((a, b) => a + b.total, 0);
    let paid = 0;
    
    if (paymentStatus === 'مدفوع') {
      paid = total;
    } else if (paymentStatus === 'جزئي') {
      paid = Number(partialPaymentAmount);
      if (paid <= 0) {
        alert("الرجاء إدخال مبلغ صحيح للدفع الجزئي");
        return;
      }
      if (paid > total) {
        alert("المبلغ المدفوع لا يمكن أن يكون أكبر من الإجمالي");
        return;
      }
    } else if (paymentStatus === 'غير مدفوع') {
      paid = 0;
    }
    
    // Check if customer exists
    const customerExists = customers.find(c => c.phone === invoiceClientPhone);
    if (!customerExists && invoiceClientName && invoiceClientPhone) {
      try {
        await addDoc(collection(db, 'customers'), { 
          name: invoiceClientName, 
          phone: invoiceClientPhone,
          createdAt: Timestamp.now(),
          createdBy: currentUser?.fullName || currentUser?.username || 'System'
        });
      } catch (error) {
        console.error("Error adding customer:", error);
      }
    }
    
    const invData = { 
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      clientName: invoiceClientName, 
      clientPhone: invoiceClientPhone, 
      deliveryDate: deliveryDate || new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0],
      items: cart, 
      totalAmount: total, 
      amountPaidAtStart: paid, 
      remainingAmount: total - paid, 
      paymentMethod, 
      paymentStatus,
      orderStatus: 'تحت التجهيز', 
      createdBy: currentUser?.fullName || currentUser?.username || 'System',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    try {
      await addDoc(collection(db, 'invoices'), invData);
      setLastInvoice({ 
        ...invData, 
        dateStr: new Date().toLocaleString('ar-EG'),
        id: 'temp-' + Date.now()
      });
      
      // Reset form
      setCart([]); 
      setInvoiceClientName(''); 
      setInvoiceClientPhone(''); 
      setPaymentStatus('مدفوع');
      setPartialPaymentAmount('');
      setPaymentMethod('Cash');
      setDeliveryDate('');
      
      // Refresh financial data
      fetchFinancials();
      
      // Print receipt after a short delay
      setTimeout(() => { 
        window.print();
      }, 500);
      
      alert("تم حفظ الفاتورة بنجاح!");
    } catch (error) {
      console.error("Error saving invoice:", error);
      alert("حدث خطأ أثناء حفظ الفاتورة");
    }
  };

  const handleAddTailoring = () => {
    if(!tailoringDetails || !tailoringPrice) {
      alert("الرجاء إدخال التفاصيل والسعر");
      return;
    }
    
    const price = Number(tailoringPrice);
    const qty = Number(tailoringQty) || 1;

    if (isNaN(price) || price <= 0) {
      alert("الرجاء إدخال سعر صحيح");
      return;
    }

    const newItem: CartItem = {
      id: Date.now(),
      productId: 'tailoring-' + Date.now(),
      name: "خدمة خياطة",
      mainCategory: "خياطة",
      subCategory: tailoringDetails.includes('تضييق') ? 'تعديلات' : 'خياطة خاصة',
      serviceType: 'tailoring',
      serviceTypeName: 'خياطة',
      qty: qty,
      price: price,
      total: price * qty,
      itemNote: `(${tailoringDetails})`,
      hasStains: false,
      isUrgent: false,
      description: ''
    };

    setCart([...cart, newItem]);

    setTailoringModal(false);
    setTailoringDetails(''); 
    setTailoringPrice(''); 
    setTailoringQty('1');
  };

  const markAsReady = async (id: string) => {
    if(!window.confirm("هل الطلب جاهز تماماً؟")) return;
    try {
      await updateDoc(doc(db, 'invoices', id), { 
        orderStatus: 'تم التجهيز',
        updatedAt: Timestamp.now()
      });
      fetchFinancials();
      alert("تم تحديث حالة الطلب إلى 'تم التجهيز'");
    } catch (error) {
      console.error("Error updating invoice:", error);
      alert("حدث خطأ أثناء تحديث حالة الطلب");
    }
  };

  const handleReprint = (inv: any) => {
    setLastInvoice(inv);
    setTimeout(() => { window.print(); }, 500);
  };

  // إضافة مستخدم جديد
  const handleAddUser = async () => {
    if (!newUserName || !newUserPassword || !newUserFullName) {
      alert("الرجاء ملء جميع الحقول");
      return;
    }
    
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("username", "==", newUserName));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        alert("اسم المستخدم موجود مسبقاً");
        return;
      }
      
      await addDoc(collection(db, 'users'), {
        username: newUserName,
        password: newUserPassword,
        fullName: newUserFullName,
        role: newUserRole,
        createdAt: Timestamp.now(),
        createdBy: currentUser?.fullName || currentUser?.username || 'System'
      });
      
      alert("تم إضافة المستخدم بنجاح");
      setNewUserName('');
      setNewUserPassword('');
      setNewUserFullName('');
      setNewUserRole(USER_ROLES.EMPLOYEE);
      
    } catch (error) {
      console.error("خطأ في إضافة المستخدم:", error);
      alert("حدث خطأ أثناء إضافة المستخدم");
    }
  };

  // إضافة منتج جديد
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.fullServicePrice) {
      alert("الرجاء إدخال اسم المنتج والسعر");
      return;
    }

    const price = Number(newProduct.fullServicePrice);
    if (isNaN(price) || price <= 0) {
      alert("الرجاء إدخال سعر صحيح");
      return;
    }

    let subCategoryToSave = newProduct.subCategory;
    
    if (newProduct.subCategory === 'other' && customSubCategory) {
      subCategoryToSave = customSubCategory;
    }

    const productData = {
      name: newProduct.name,
      mainCategory: newProduct.mainCategory,
      subCategory: subCategoryToSave,
      fullServicePrice: price,
      availableServices: newProduct.availableServices,
      description: newProduct.description || '',
      createdAt: Timestamp.now(),
      createdBy: currentUser?.fullName || currentUser?.username || 'System'
    };

    try {
      await addDoc(collection(db, 'products'), productData);
      
      setNewProduct({
        name: '',
        mainCategory: 'clothes',
        subCategory: '',
        fullServicePrice: '',
        availableServices: ['wash-iron', 'wash-only', 'iron-only'],
        description: ''
      });
      setCustomSubCategory('');
      setShowCustomSubCategory(false);
      
      alert("تم إضافة المنتج بنجاح");
    } catch (error) {
      console.error("خطأ في إضافة المنتج:", error);
      alert("حدث خطأ أثناء إضافة المنتج");
    }
  };

  const navBtn = (v: string, l: string, e: string, requiredRole = USER_ROLES.EMPLOYEE) => {
    if (!hasPermission(requiredRole)) return null;
    
    return (
      <button 
        key={v}
        onClick={() => setView(v)} 
        className={`nav-item ${view === v ? 'active' : ''}`}
      >
        <span className="nav-icon">{e}</span> {l}
      </button>
    );
  };

  const calculateTotals = () => {
    const total = cart.reduce((a, b) => a + b.total, 0);
    let paid = 0;
    let remaining = total;
    
    if (paymentStatus === 'مدفوع') {
      paid = total;
      remaining = 0;
    } else if (paymentStatus === 'جزئي') {
      paid = Number(partialPaymentAmount) || 0;
      remaining = total - paid;
    } else if (paymentStatus === 'غير مدفوع') {
      paid = 0;
      remaining = total;
    }
    
    return { total, paid, remaining };
  };

  // تصفية المنتجات حسب الفئة والبحث
  const filteredProducts = products.filter(product => {
    if (selectedMainCategory !== 'all' && product.mainCategory !== selectedMainCategory) {
      return false;
    }
    
    if (selectedSubCategory !== 'all' && product.subCategory !== selectedSubCategory) {
      return false;
    }
    
    if (searchProduct && !product.name.toLowerCase().includes(searchProduct.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // إذا لم يكن المستخدم مسجل الدخول، عرض شاشة تسجيل الدخول
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <style>{`
          .login-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            direction: rtl;
            padding: 20px;
          }
          
          .login-card {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            width: 100%;
            max-width: 400px;
          }
          
          .login-logo {
            text-align: center;
            margin-bottom: 30px;
          }
          
          .login-logo h1 {
            color: #4f46e5;
            margin: 0;
            font-size: 28px;
          }
          
          .login-logo p {
            color: #6b7280;
            margin: 5px 0 0 0;
            font-size: 16px;
          }
          
          .login-input {
            width: 100%;
            padding: 15px;
            margin-bottom: 20px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-size: 16px;
            transition: all 0.3s ease;
            background: white;
          }
          
          .login-input:focus {
            outline: none;
            border-color: #4f46e5;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
          }
          
          .login-btn {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #4f46e5, #3730a3);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .login-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3);
          }
          
          .demo-accounts {
            margin-top: 30px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 10px;
            font-size: 14px;
          }
          
          .demo-accounts h4 {
            margin-top: 0;
            color: #374151;
            margin-bottom: 15px;
          }
          
          .demo-account {
            margin-bottom: 10px;
            padding: 10px;
            background: white;
            border-radius: 8px;
            border-left: 4px solid #4f46e5;
          }
          
          .demo-account.admin {
            border-left-color: #ef4444;
          }
          
          .demo-account.employee {
            border-left-color: #10b981;
          }
        `}</style>
        
        <div className="login-card">
          <div className="login-logo">
            <h1>{SHOP_NAME}</h1>
            <p>نظام إدارة دراي كلين</p>
          </div>
          
          <input
            type="text"
            placeholder="اسم المستخدم"
            className="login-input"
            value={loginUsername}
            onChange={(e) => setLoginUsername(e.target.value)}
          />
          
          <input
            type="password"
            placeholder="كلمة المرور"
            className="login-input"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
          />
          
          <button className="login-btn" onClick={handleLogin}>
            تسجيل الدخول
          </button>
          
          <div className="demo-accounts">
            <h4>حسابات تجريبية:</h4>
            <div className="demo-account admin">
              <strong>مدير النظام:</strong><br/>
              المستخدم: admin<br/>
              كلمة المرور: 123456
            </div>
            <div className="demo-account employee">
              <strong>موظف:</strong><br/>
              المستخدم: employee<br/>
              كلمة المرور: 123456
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* شريط المستخدم العلوي */}
      <div className="top-bar no-print">
        <style>{`
          .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: white;
            padding: 15px 20px;
            border-radius: 12px;
            margin: 20px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
          }
          
          .user-info {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4f46e5, #3730a3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
          }
          
          .user-details {
            display: flex;
            flex-direction: column;
          }
          
          .user-name {
            font-weight: 600;
            font-size: 16px;
            color: #1e293b;
          }
          
          .user-role {
            font-size: 12px;
            color: #6b7280;
            padding: 2px 8px;
            background: #e0e7ff;
            border-radius: 12px;
            display: inline-block;
            width: fit-content;
          }
          
          .logout-btn {
            background: #fee2e2;
            color: #ef4444;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .logout-btn:hover {
            background: #ef4444;
            color: white;
          }
        `}</style>
        
        <div className="user-info">
          <div className="user-avatar">
            {currentUser?.fullName?.charAt(0) || currentUser?.username?.charAt(0) || '?'}
          </div>
          <div className="user-details">
            <div className="user-name">{currentUser?.fullName || currentUser?.username}</div>
            <div className="user-role">
              {currentUser?.role === USER_ROLES.ADMIN ? 'مدير النظام' : 'موظف'}
            </div>
          </div>
        </div>
        
        <button className="logout-btn" onClick={handleLogout}>
          تسجيل الخروج
        </button>
      </div>

      {/* التنقل العلوي */}
      <div className="nav-bar no-print">
        <style>{`
          .nav-bar {
            display: flex;
            background: white;
            border-radius: 12px;
            padding: 8px;
            margin: 0 20px 24px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
            overflow-x: auto;
            flex-wrap: wrap;
          }
          
          .nav-item {
            border: none;
            background: transparent;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            color: #6b7280;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
            margin: 2px;
          }
          
          .nav-item:hover {
            background: #e0e7ff;
            color: #4f46e5;
            transform: translateY(-1px);
          }
          
          .nav-item.active {
            background: #4f46e5;
            color: white;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
          }
          
          .nav-icon {
            font-size: 18px;
          }
        `}</style>
        
        {[
          navBtn('pos', 'نقطة بيع', '🧺', USER_ROLES.EMPLOYEE),
          navBtn('tracking', 'متابعة', '🚚', USER_ROLES.EMPLOYEE),
          hasPermission(USER_ROLES.ADMIN) && navBtn('invoices', 'السجل', '📜', USER_ROLES.ADMIN),
          hasPermission(USER_ROLES.ADMIN) && navBtn('reports', 'التقارير', '📊', USER_ROLES.ADMIN),
          hasPermission(USER_ROLES.ADMIN) && navBtn('crm', 'العملاء', '👥', USER_ROLES.ADMIN),
          hasPermission(USER_ROLES.ADMIN) && navBtn('expenses', 'المصاريف', '💸', USER_ROLES.ADMIN),
          hasPermission(USER_ROLES.ADMIN) && navBtn('settings', 'الإعدادات', '⚙️', USER_ROLES.ADMIN),
          hasPermission(USER_ROLES.ADMIN) && navBtn('users', 'المستخدمين', '👤', USER_ROLES.ADMIN)
        ].filter(Boolean)}
      </div>

      {/* ==================== 1. شاشة البيع (POS) ==================== */}
      {view === 'pos' && hasPermission(USER_ROLES.EMPLOYEE) && (
        <div className="pos-layout no-print">
          <style>{`
            .pos-layout {
              display: grid;
              grid-template-columns: 1fr 400px;
              gap: 20px;
              padding: 0 20px;
              height: calc(100vh - 180px);
            }
            
            @media (max-width: 1024px) {
              .pos-layout {
                grid-template-columns: 1fr;
                height: auto;
              }
            }
            
            .card {
              background: white;
              border-radius: 12px;
              padding: 24px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              border: 1px solid #e5e7eb;
              overflow-y: auto;
            }
            
            .cart-panel {
              background: white;
              border-radius: 12px;
              padding: 24px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              border: 1px solid #e5e7eb;
              display: flex;
              flex-direction: column;
            }
            
            .products-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
              gap: 16px;
              max-height: 500px;
              overflow-y: auto;
              padding: 8px;
            }
            
            .product-card {
              background: white;
              border: 2px solid #e2e8f0;
              padding: 16px;
              border-radius: 12px;
              cursor: pointer;
              transition: all 0.3s ease;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            
            .product-card:hover {
              border-color: #4f46e5;
              transform: translateY(-4px);
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            }
            
            .product-card::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 4px;
              background: #4f46e5;
              transform: scaleX(0);
              transition: transform 0.3s ease;
            }
            
            .product-card:hover::after {
              transform: scaleX(1);
            }
            
            .product-name {
              font-weight: 700;
              color: #1e293b;
              margin: 10px 0;
              font-size: 14px;
            }
            
            .product-price {
              font-weight: bold;
              color: #4f46e5;
              font-size: 18px;
              margin: 5px 0;
            }
            
            .product-category {
              font-size: 11px;
              color: #6b7280;
              background: #e0e7ff;
              padding: 3px 8px;
              border-radius: 12px;
              display: inline-block;
              margin-bottom: 8px;
            }
            
            .category-filters {
              margin-bottom: 20px;
            }
            
            .main-categories {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              margin-bottom: 15px;
            }
            
            .category-btn {
              padding: 10px 20px;
              border: 2px solid #e2e8f0;
              background: #f8fafc;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              gap: 8px;
              font-weight: 600;
              color: #6b7280;
            }
            
            .category-btn:hover {
              border-color: #4f46e5;
              background: #e0e7ff;
              color: #4f46e5;
            }
            
            .category-btn.active {
              background: #4f46e5;
              color: white;
              border-color: #4f46e5;
            }
            
            .sub-categories {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            
            .sub-category-btn {
              padding: 8px 15px;
              border: 1px solid #e2e8f0;
              background: #f8fafc;
              border-radius: 20px;
              cursor: pointer;
              transition: all 0.3s ease;
              font-size: 14px;
              color: #6b7280;
            }
            
            .sub-category-btn:hover {
              border-color: #4f46e5;
              background: #e0e7ff;
              color: #4f46e5;
            }
            
            .sub-category-btn.active {
              background: #4f46e5;
              color: white;
              border-color: #4f46e5;
            }
            
            .cart-header {
              margin-bottom: 20px;
              padding-bottom: 16px;
              border-bottom: 2px solid #e5e7eb;
            }
            
            .cart-items {
              flex: 1;
              overflow-y: auto;
              margin-bottom: 20px;
              max-height: 300px;
            }
            
            .cart-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px;
              background: #f8fafc;
              border-radius: 8px;
              margin-bottom: 10px;
              border: 1px solid #e5e7eb;
            }
            
            .cart-item-info {
              flex: 1;
              margin-left: 12px;
            }
            
            .cart-item-actions {
              display: flex;
              align-items: center;
              gap: 16px;
            }
            
            .qty-btn {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: 2px solid #e5e7eb;
              background: white;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 18px;
              transition: all 0.2s ease;
            }
            
            .qty-btn:hover {
              border-color: #4f46e5;
              background: #e0e7ff;
              color: #4f46e5;
            }
            
            .payment-summary {
              background: #f8fafc;
              padding: 16px;
              border-radius: 8px;
              margin-bottom: 20px;
              border: 1px solid #e5e7eb;
            }
            
            .payment-summary-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 12px;
            }
            
            .payment-summary-item:last-child {
              margin-bottom: 0;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
            }
            
            .payment-options {
              display: flex;
              flex-direction: column;
              gap: 10px;
              margin-bottom: 20px;
            }
            
            .payment-option {
              display: flex;
              align-items: center;
              padding: 12px 16px;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.3s ease;
            }
            
            .payment-option:hover {
              border-color: #4f46e5;
              background: #e0e7ff;
            }
            
            .payment-option.selected {
              border-color: #4f46e5;
              background: #e0e7ff;
            }
            
            .payment-option input {
              margin: 0 8px 0 0;
              width: auto;
            }
            
            .payment-option label {
              display: flex;
              align-items: center;
              gap: 12px;
              cursor: pointer;
              flex: 1;
              margin: 0;
            }
            
            .payment-icon {
              font-size: 24px;
            }
            
            .partial-payment-input {
              display: flex;
              gap: 10px;
              align-items: center;
              padding: 12px 16px;
              background: #fef3c7;
              border-radius: 8px;
              margin-top: 10px;
              border: 1px solid #fbbf24;
            }
            
            .partial-payment-input input {
              flex: 1;
              margin: 0;
            }
            
            .btn-main {
              background: linear-gradient(135deg, #4f46e5, #3730a3);
              color: white;
              border: none;
              padding: 14px 28px;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              width: 100%;
              font-size: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              transition: all 0.3s ease;
            }
            
            .btn-main:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3);
            }
            
            .btn-secondary {
              background: #e0e7ff;
              color: #4f46e5;
              border: none;
              padding: 10px 20px;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            .btn-secondary:hover {
              background: #4f46e5;
              color: white;
            }
            
            input, select, textarea {
              width: 100%;
              padding: 12px 16px;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              font-size: 14px;
              transition: all 0.3s ease;
              background: white;
              margin-bottom: 16px;
            }
            
            input:focus, select:focus, textarea:focus {
              outline: none;
              border-color: #4f46e5;
              box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
            }
            
            .search-bar {
              position: relative;
              display: flex;
              align-items: center;
            }
            
            .search-bar input {
              padding-right: 40px;
              margin: 0;
            }
            
            .search-icon {
              position: absolute;
              right: 12px;
              color: #6b7280;
            }
            
            .alert {
              padding: 12px 16px;
              border-radius: 8px;
              margin-bottom: 16px;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            
            .alert-warning {
              background: #fef3c7;
              color: #92400e;
              border: 1px solid #fbbf24;
            }
            
            .alert-success {
              background: #d1fae5;
              color: #065f46;
              border: 1px solid #34d399;
            }
            
            .price-option {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              padding: 4px 8px;
              background: #f8fafc;
              border-radius: 6px;
              margin-bottom: 2px;
            }
            
            .price-service {
              color: #6b7280;
            }
            
            .price-amount {
              font-weight: bold;
              color: #4f46e5;
            }
            
            .price-discount {
              color: #10b981;
              font-size: 10px;
            }
          `}</style>
          
          {/* قسم المنتجات */}
          <div className="card">
            <div className="modal-header" style={{padding: '0 0 20px 0', border: 'none'}}>
              <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: 10}}>
                <span>📦</span> الخدمات
              </h3>
              <div style={{display: 'flex', gap: 10}}>
                <button 
                  onClick={() => setTailoringModal(true)}
                  className="btn-secondary"
                  style={{background: '#8b5cf6', color: 'white'}}
                >
                  🪡 خياطة
                </button>
                <button 
                  onClick={() => setManualPriceMode(!manualPriceMode)}
                  style={{
                    background: manualPriceMode ? '#ef4444' : '#e5e7eb',
                    color: manualPriceMode ? 'white' : '#374151',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  {manualPriceMode ? '✏️' : '🖐️'} {manualPriceMode ? 'سعر يدوي' : 'تفعيل يدوي'}
                </button>
              </div>
            </div>

            {manualPriceMode && (
              <div className="alert alert-warning">
                <span>⚠️</span>
                وضع السعر اليدوي مفعل. يمكنك تعديل سعر أي منتج
              </div>
            )}

            {/* فلاتر الفئات */}
            <div className="category-filters">
              <div className="search-bar" style={{marginBottom: 10}}>
                <input 
                  type="text" 
                  placeholder="🔍 بحث عن منتج..." 
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  style={{margin: 0}}
                />
              </div>

              <div className="main-categories">
                <button 
                  className={`category-btn ${selectedMainCategory === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedMainCategory('all');
                    setSelectedSubCategory('all');
                  }}
                >
                  📋 الكل
                </button>
                
                {MAIN_CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    className={`category-btn ${selectedMainCategory === category.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedMainCategory(category.id);
                      setSelectedSubCategory('all');
                    }}
                  >
                    {category.icon} {category.name}
                  </button>
                ))}
              </div>

              {selectedMainCategory !== 'all' && SUB_CATEGORIES[selectedMainCategory] && (
                <div className="sub-categories">
                  <button
                    className={`sub-category-btn ${selectedSubCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedSubCategory('all')}
                  >
                    الكل
                  </button>
                  
                  {SUB_CATEGORIES[selectedMainCategory].map(subCat => (
                    <button
                      key={subCat.id}
                      className={`sub-category-btn ${selectedSubCategory === subCat.id ? 'active' : ''}`}
                      onClick={() => setSelectedSubCategory(subCat.id)}
                    >
                      {subCat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* شبكة المنتجات */}
            <div className="products-grid">
              {filteredProducts.length === 0 ? (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#6b7280'
                }}>
                  <div style={{fontSize: 48, marginBottom: 16}}>📦</div>
                  <p>لا توجد منتجات</p>
                  <p style={{fontSize: 14}}>أضف منتجات من صفحة الإعدادات</p>
                </div>
              ) : (
                filteredProducts.map(product => {
                  const mainCategory = MAIN_CATEGORIES.find(c => c.id === product.mainCategory);
                  const subCategory = SUB_CATEGORIES[product.mainCategory]?.find(s => s.id === product.subCategory);
                  const availableServices = product.availableServices || ['wash-iron'];
                  
                  return (
                    <div
                      key={product.id}
                      className="product-card"
                      onClick={() => handleAddToCart(product)}
                      style={{borderColor: manualPriceMode ? '#ef4444' : '#e2e8f0'}}
                    >
                      <div className="product-icon" style={{fontSize: '32px'}}>
                        {mainCategory?.icon || '👕'}
                      </div>
                      
                      <div className="product-name">
                        {product.name}
                      </div>
                      
                      <div className="product-category">
                        {subCategory?.name || product.subCategory || 'غير محدد'}
                      </div>
                      
                      <div className="product-price">
                        {product.fullServicePrice} د.أ
                      </div>
                      
                      <div style={{fontSize: '12px', color: '#6b7280', marginTop: '5px'}}>
                        {availableServices.map(serviceId => {
                          const service = SERVICE_TYPES.find(s => s.id === serviceId);
                          if (!service) return null;
                          
                          const price = Number(product.fullServicePrice) * service.priceMultiplier;
                          const isFullService = serviceId === 'wash-iron';
                          const discount = !isFullService ? '(50% خصم)' : '';
                          
                          return (
                            <div key={serviceId} className="price-option">
                              <span className="price-service">{service.name}</span>
                              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                                <span className="price-amount">{price.toFixed(2)} د.أ</span>
                                {discount && (
                                  <span className="price-discount">{discount}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {manualPriceMode && (
                        <small style={{
                          fontSize: 10,
                          color: '#ef4444',
                          background: '#fee2e2',
                          padding: '2px 6px',
                          borderRadius: 10,
                          marginTop: 5
                        }}>
                          وضع يدوي
                        </small>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* قسم السلة والدفع */}
          <div className="cart-panel">
            <div className="cart-header">
              <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: 10}}>
                <span>🛒</span> السلة
              </h3>
            </div>

            <div style={{background: '#f8fafc', padding: 16, borderRadius: '8px', marginBottom: 16, border: '1px solid #e5e7eb'}}>
              <div className="search-bar">
                <input 
                  list="cust" 
                  placeholder="بحث عن عميل..." 
                  value={invoiceClientName} 
                  onChange={e => { 
                    setInvoiceClientName(e.target.value); 
                    const c = customers.find(x => x.name === e.target.value); 
                    if (c) setInvoiceClientPhone(c.phone); 
                  }} 
                />
                <div className="search-icon">🔍</div>
              </div>
              <datalist id="cust">
                {customers.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
              
              <div style={{display: 'flex', gap: 10, marginBottom: 10}}>
                <input 
                  type="tel" 
                  placeholder="الهاتف" 
                  value={invoiceClientPhone} 
                  onChange={e => setInvoiceClientPhone(e.target.value)} 
                  style={{flex: 1, margin: 0}} 
                />
                <input 
                  type="datetime-local" 
                  value={deliveryDate} 
                  onChange={e => setDeliveryDate(e.target.value)} 
                  style={{flex: 1, margin: 0}} 
                />
              </div>
            </div>

            <div className="cart-items">
              {cart.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#6b7280'
                }}>
                  <div style={{fontSize: 48, marginBottom: 16}}>🛒</div>
                  <p>السلة فارغة</p>
                  <p style={{fontSize: 14}}>أضف منتجات من القائمة اليسرى</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="cart-item" style={{background: item.isUrgent ? '#fef2f2' : '#f8fafc'}}>
                    <div className="cart-item-info">
                      <div style={{fontWeight: 'bold', marginBottom: 4}}>
                        {item.name} {item.itemNote} {item.isUrgent && '🔥'}
                      </div>
                      <div style={{fontSize: 12, color: '#6b7280'}}>
                        {item.mainCategory} - {item.subCategory}
                      </div>
                      <div style={{fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, marginTop: 2}}>
                        {item.serviceTypeName}
                        {item.serviceType !== 'wash-iron' && (
                          <span style={{color: '#10b981', marginRight: 5}}> (50% خصم)</span>
                        )}
                      </div>
                    </div>
                    <div className="cart-item-actions">
                      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                        <button 
                          onClick={() => {
                            const newQty = item.qty - 1;
                            if(newQty > 0) {
                              setCart(cart.map(c => c.id === item.id ? {...c, qty: newQty, total: newQty*c.price} : c));
                            } else {
                              setCart(cart.filter(c => c.id !== item.id));
                            }
                          }} 
                          className="qty-btn"
                        >-</button>
                        <span style={{minWidth: 30, textAlign: 'center', fontWeight: 'bold'}}>{item.qty}</span>
                        <button 
                          onClick={() => setCart(cart.map(c => c.id === item.id ? {...c, qty: c.qty + 1, total: (c.qty+1)*c.price} : c))} 
                          className="qty-btn"
                        >+</button>
                      </div>
                      <strong style={{minWidth: 70, textAlign: 'left'}}>{item.total.toFixed(2)} د.أ</strong>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div style={{borderTop: '2px solid #e5e7eb', paddingTop: 20}}>
                <div className="payment-summary">
                  <div className="payment-summary-item">
                    <span>الإجمالي:</span>
                    <span style={{fontWeight: 'bold'}}>{calculateTotals().total.toFixed(2)} د.أ</span>
                  </div>
                  <div className="payment-summary-item">
                    <span>المدفوع:</span>
                    <span style={{color: '#10b981', fontWeight: 'bold'}}>
                      {calculateTotals().paid.toFixed(2)} د.أ
                    </span>
                  </div>
                  <div className="payment-summary-item">
                    <span>الباقي:</span>
                    <span style={{
                      color: calculateTotals().remaining > 0 ? '#ef4444' : '#10b981',
                      fontWeight: 'bold'
                    }}>
                      {calculateTotals().remaining.toFixed(2)} د.أ
                    </span>
                  </div>
                </div>
                
                {/* خيارات الدفع */}
                <div className="payment-options">
                  <div className={`payment-option ${paymentStatus === 'مدفوع' ? 'selected' : ''}`}
                       onClick={() => setPaymentStatus('مدفوع')}>
                    <input
                      type="radio"
                      id="paid"
                      name="paymentStatus"
                      checked={paymentStatus === 'مدفوع'}
                      onChange={() => setPaymentStatus('مدفوع')}
                    />
                    <label htmlFor="paid">
                      <div className="payment-icon">💳</div>
                      <div>
                        <div style={{fontWeight: 'bold'}}>مدفوع بالكامل</div>
                        <div style={{fontSize: 12, color: '#6b7280'}}>العميل دفع المبلغ كاملاً</div>
                      </div>
                    </label>
                  </div>
                  
                  <div className={`payment-option ${paymentStatus === 'جزئي' ? 'selected' : ''}`}
                       onClick={() => setPaymentStatus('جزئي')}>
                    <input
                      type="radio"
                      id="partial"
                      name="paymentStatus"
                      checked={paymentStatus === 'جزئي'}
                      onChange={() => setPaymentStatus('جزئي')}
                    />
                    <label htmlFor="partial">
                      <div className="payment-icon">💰</div>
                      <div>
                        <div style={{fontWeight: 'bold'}}>مدفوع جزئياً</div>
                        <div style={{fontSize: 12, color: '#6b7280'}}>العميل دفع جزء من المبلغ</div>
                      </div>
                    </label>
                  </div>
                  
                  {paymentStatus === 'جزئي' && (
                    <div className="partial-payment-input">
                      <label>المبلغ المدفوع:</label>
                      <input
                        type="number"
                        value={partialPaymentAmount}
                        onChange={(e) => setPartialPaymentAmount(e.target.value)}
                        placeholder="أدخل المبلغ المدفوع"
                        min="0"
                        max={calculateTotals().total}
                        step="0.01"
                      />
                      <span style={{fontWeight: 'bold'}}>د.أ</span>
                      <button
                        onClick={() => {
                          const total = calculateTotals().total;
                          setPartialPaymentAmount((total * 0.5).toFixed(2));
                        }}
                        style={{
                          background: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        50%
                      </button>
                    </div>
                  )}
                  
                  <div className={`payment-option ${paymentStatus === 'غير مدفوع' ? 'selected' : ''}`}
                       onClick={() => setPaymentStatus('غير مدفوع')}>
                    <input
                      type="radio"
                      id="unpaid"
                      name="paymentStatus"
                      checked={paymentStatus === 'غير مدفوع'}
                      onChange={() => setPaymentStatus('غير مدفوع')}
                    />
                    <label htmlFor="unpaid">
                      <div className="payment-icon">📝</div>
                      <div>
                        <div style={{fontWeight: 'bold'}}>غير مدفوع</div>
                        <div style={{fontSize: 12, color: '#6b7280'}}>العميل لم يدفع بعد</div>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div style={{marginBottom: 16}}>
                  <label style={{display: 'block', marginBottom: 8, fontWeight: 'bold'}}>
                    طريقة الدفع:
                  </label>
                  <select 
                    value={paymentMethod} 
                    onChange={e => setPaymentMethod(e.target.value)}
                    style={{margin: 0}}
                  >
                    <option value="Cash">💵 كاش</option>
                    <option value="Visa">💳 فيزا</option>
                    <option value="CliQ">📱 كليك</option>
                  </select>
                </div>
                
                <button 
                  className="btn-main" 
                  onClick={handleSaveInvoice}
                  style={{
                    background: paymentStatus === 'غير مدفوع' ? 
                      'linear-gradient(135deg, #ef4444, #dc2626)' : 
                      paymentStatus === 'جزئي' ?
                      'linear-gradient(135deg, #f59e0b, #d97706)' :
                      'linear-gradient(135deg, #10b981, #059669)'
                  }}
                >
                  {paymentStatus === 'مدفوع' && <span>✅</span>}
                  {paymentStatus === 'جزئي' && <span>💰</span>}
                  {paymentStatus === 'غير مدفوع' && <span>📝</span>}
                  حفظ وطباعة الفاتورة
                </button>
                
                {paymentStatus === 'جزئي' && calculateTotals().paid > 0 && (
                  <div style={{
                    marginTop: 12,
                    padding: 10,
                    background: '#fef3c7',
                    borderRadius: '8px',
                    fontSize: 13,
                    color: '#92400e',
                    textAlign: 'center',
                    border: '1px solid #fbbf24'
                  }}>
                    ⚠️ سيتم إضافة المبلغ المتبقي ({calculateTotals().remaining.toFixed(2)} د.أ) عند التسليم
                  </div>
                )}
                
                {paymentStatus === 'غير مدفوع' && (
                  <div style={{
                    marginTop: 12,
                    padding: 10,
                    background: '#fee2e2',
                    borderRadius: '8px',
                    fontSize: 13,
                    color: '#dc2626',
                    textAlign: 'center',
                    border: '1px solid #ef4444'
                  }}>
                    ⚠️ الفاتورة غير مدفوعة. المطلوب عند التسليم: {calculateTotals().total.toFixed(2)} د.أ
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 7. الإعدادات (Settings) ==================== */}
      {view === 'settings' && hasPermission(USER_ROLES.ADMIN) && (
        <div className="no-print" style={{maxWidth:'900px', margin:'0 auto', padding: '20px'}}>
          <style>{`
            .close-view-btn {
              position: absolute;
              top: 20px;
              left: 20px;
              background: #fee2e2;
              color: #ef4444;
              border: none;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              font-size: 20px;
              transition: all 0.3s ease;
            }
            
            .close-view-btn:hover {
              background: #ef4444;
              color: white;
            }
          `}</style>
          
          <div className="card" style={{borderTop:'4px solid #4f46e5', position: 'relative'}}>
            <button className="close-view-btn" onClick={()=>setView('pos')}>✕</button>
            <h3 style={{marginRight: 40, display: 'flex', alignItems: 'center', gap: 10}}>
              <span>➕</span> إضافة منتجات جديدة
            </h3>
            
            <div style={{display: 'grid', gap: 16, marginBottom: 20}}>
              <div>
                <label style={{display: 'block', marginBottom: 8, fontWeight: 'bold'}}>
                  اسم المنتج:
                </label>
                <input
                  type="text"
                  placeholder="مثال: قميص رجالي"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                />
              </div>
              
              <div>
                <label style={{display: 'block', marginBottom: 8, fontWeight: 'bold'}}>
                  الفئة الرئيسية:
                </label>
                <select
                  value={newProduct.mainCategory}
                  onChange={(e) => {
                    setNewProduct({...newProduct, mainCategory: e.target.value, subCategory: ''});
                    setShowCustomSubCategory(false);
                  }}
                >
                  {MAIN_CATEGORIES.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{display: 'block', marginBottom: 8, fontWeight: 'bold'}}>
                  الفئة الفرعية:
                </label>
                <select
                  value={newProduct.subCategory}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'other') {
                      setShowCustomSubCategory(true);
                      setNewProduct({...newProduct, subCategory: 'other'});
                    } else {
                      setShowCustomSubCategory(false);
                      setNewProduct({...newProduct, subCategory: value});
                    }
                  }}
                >
                  <option value="">اختر الفئة الفرعية</option>
                  {SUB_CATEGORIES[newProduct.mainCategory]?.map(subCat => (
                    <option key={subCat.id} value={subCat.id}>
                      {subCat.name}
                    </option>
                  ))}
                  <option value="other">⬇️ أخرى (حدد أدناه)</option>
                </select>
                
                {showCustomSubCategory && (
                  <input
                    type="text"
                    placeholder="أدخل اسم الفئة الفرعية الجديدة"
                    value={customSubCategory}
                    onChange={(e) => setCustomSubCategory(e.target.value)}
                    style={{marginTop: 10}}
                  />
                )}
              </div>
              
              <div>
                <label style={{display: 'block', marginBottom: 8, fontWeight: 'bold'}}>
                  سعر الخدمة الكاملة (غسيل وكوي):
                </label>
                <input
                  type="number"
                  placeholder="مثال: 5.00"
                  value={newProduct.fullServicePrice}
                  onChange={(e) => setNewProduct({...newProduct, fullServicePrice: e.target.value})}
                  step="0.01"
                  min="0"
                />
                <small style={{color: '#6b7280', fontSize: 12, display: 'block', marginTop: 5}}>
                  ⚠️ سعر الغسيل فقط أو الكوي فقط سيكون نصف هذا السعر
                </small>
              </div>
              
              <div>
                <label style={{display: 'block', marginBottom: 8, fontWeight: 'bold'}}>
                  الخدمات المتاحة:
                </label>
                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  {SERVICE_TYPES.map(service => (
                    <label key={service.id} style={{display: 'flex', alignItems: 'center', gap: 8}}>
                      <input
                        type="checkbox"
                        checked={newProduct.availableServices.includes(service.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewProduct({
                              ...newProduct,
                              availableServices: [...newProduct.availableServices, service.id]
                            });
                          } else {
                            setNewProduct({
                              ...newProduct,
                              availableServices: newProduct.availableServices.filter(s => s !== service.id)
                            });
                          }
                        }}
                      />
                      <span>{service.name}</span>
                      <span style={{color: '#6b7280', fontSize: 12}}>
                        ({service.priceMultiplier === 1 ? 'سعر كامل' : 'نصف السعر'})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label style={{display: 'block', marginBottom: 8, fontWeight: 'bold'}}>
                  وصف إضافي (اختياري):
                </label>
                <textarea
                  placeholder="وصف المنتج أو ملاحظات خاصة..."
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
            
            <button className="btn-main" onClick={handleAddProduct}>
              إضافة المنتج
            </button>
          </div>
          
          <div className="card" style={{marginTop: '20px'}}>
            <h3 style={{marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10}}>
              <span>📋</span> قائمة الأسعار الحالية ({products.length} منتج)
            </h3>
            
            <div style={{display: 'flex', gap: 10, marginBottom: 20}}>
              <select
                value={selectedMainCategory}
                onChange={(e) => setSelectedMainCategory(e.target.value)}
                style={{flex: 1}}
              >
                <option value="all">جميع الفئات</option>
                {MAIN_CATEGORIES.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              
              <input
                type="text"
                placeholder="🔍 بحث عن منتج..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                style={{flex: 1}}
              />
            </div>
            
            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', textAlign: 'right', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{background: '#f3f4f6'}}>
                    <th style={{padding: '12px', textAlign: 'right'}}>المنتج</th>
                    <th style={{padding: '12px'}}>الفئة</th>
                    <th style={{padding: '12px'}}>الخدمات</th>
                    <th style={{padding: '12px'}}>السعر الكامل</th>
                    <th style={{padding: '12px'}}>سعر الغسيل/كوي</th>
                    <th style={{padding: '12px'}}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => {
                    const mainCategory = MAIN_CATEGORIES.find(c => c.id === product.mainCategory);
                    const subCategory = SUB_CATEGORIES[product.mainCategory]?.find(s => s.id === product.subCategory);
                    
                    return (
                      <tr key={product.id} style={{borderBottom: '1px solid #e5e7eb'}}>
                        <td style={{padding: '12px'}}>
                          <div style={{fontWeight: 'bold'}}>{product.name}</div>
                          {product.description && (
                            <div style={{fontSize: 12, color: '#6b7280'}}>{product.description}</div>
                          )}
                        </td>
                        <td style={{padding: '12px'}}>
                          <div>{mainCategory?.name || 'غير محدد'}</div>
                          <div style={{fontSize: 12, color: '#6b7280'}}>
                            {subCategory?.name || product.subCategory || '-'}
                          </div>
                        </td>
                        <td style={{padding: '12px'}}>
                          <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                            {(product.availableServices || ['wash-iron']).map(serviceId => {
                              const service = SERVICE_TYPES.find(s => s.id === serviceId);
                              return service ? (
                                <span
                                  key={service.id}
                                  style={{
                                    fontSize: 12,
                                    padding: '2px 8px',
                                    background: service.priceMultiplier === 1 ? '#dbeafe' : '#d1fae5',
                                    color: service.priceMultiplier === 1 ? '#1e40af' : '#065f46',
                                    borderRadius: 4,
                                    width: 'fit-content'
                                  }}
                                >
                                  {service.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </td>
                        <td style={{padding: '12px', fontWeight: 'bold', color: '#1e40af'}}>
                          {product.fullServicePrice} د.أ
                        </td>
                        <td style={{padding: '12px', fontWeight: 'bold', color: '#065f46'}}>
                          {(product.fullServicePrice * 0.5).toFixed(2)} د.أ
                        </td>
                        <td style={{padding: '12px'}}>
                          <div style={{display: 'flex', gap: 5}}>
                            <button
                              onClick={async () => {
                                const newPrice = prompt("السعر الجديد للخدمة الكاملة:", product.fullServicePrice.toString());
                                if (newPrice && !isNaN(Number(newPrice)) && Number(newPrice) > 0) {
                                  try {
                                    await updateDoc(doc(db, 'products', product.id), {
                                      fullServicePrice: Number(newPrice),
                                      updatedAt: Timestamp.now()
                                    });
                                    alert("تم تحديث السعر بنجاح");
                                  } catch (error) {
                                    console.error("خطأ في تحديث السعر:", error);
                                    alert("حدث خطأ أثناء تحديث السعر");
                                  }
                                }
                              }}
                              style={{
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: 12
                              }}
                            >
                              تعديل السعر
                            </button>
                            
                            <button
                              onClick={async () => {
                                if (window.confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
                                  try {
                                    await deleteDoc(doc(db, 'products', product.id));
                                    alert("تم حذف المنتج بنجاح");
                                  } catch (error) {
                                    console.error("خطأ في حذف المنتج:", error);
                                    alert("حدث خطأ أثناء حذف المنتج");
                                  }
                                }
                              }}
                              style={{
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: 12
                              }}
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* باقي الشاشات يمكن إضافتها هنا */}

      {/* مودال اختيار الخدمة */}
      {serviceModal && (
        <div className="service-modal no-print">
          <style>{`
            .service-modal {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.5);
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 1000;
              backdrop-filter: blur(4px);
            }
            
            .service-options {
              background: white;
              border-radius: 12px;
              padding: 30px;
              max-width: 400px;
              width: 90%;
              animation: slideUp 0.3s ease;
            }
            
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            .service-option {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 15px;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              margin-bottom: 10px;
              cursor: pointer;
              transition: all 0.3s ease;
            }
            
            .service-option:hover {
              border-color: #4f46e5;
              background: #e0e7ff;
            }
            
            .service-option.selected {
              border-color: #4f46e5;
              background: #e0e7ff;
            }
            
            .service-info {
              display: flex;
              flex-direction: column;
              gap: 5px;
            }
            
            .service-name {
              font-weight: bold;
              color: #1e293b;
            }
            
            .service-price {
              font-size: 18px;
              font-weight: bold;
              color: #4f46e5;
            }
            
            .service-savings {
              font-size: 12px;
              color: #10b981;
            }
          `}</style>
          
          <div className="service-options">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <h3 style={{margin: 0}}>اختر نوع الخدمة</h3>
              <button
                onClick={() => setServiceModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>
            
            <p style={{marginBottom: 20, color: '#6b7280'}}>
              اختر نوع الخدمة المطلوبة للمنتج: <strong>{serviceModal.name}</strong>
            </p>
            
            {(serviceModal.availableServices || ['wash-iron']).map(serviceId => {
              const service = SERVICE_TYPES.find(s => s.id === serviceId);
              if (!service) return null;
              
              const price = Number(serviceModal.fullServicePrice) * service.priceMultiplier;
              const isFullService = serviceId === 'wash-iron';
              const savings = !isFullService ? `توفير: ${(Number(serviceModal.fullServicePrice) * 0.5).toFixed(2)} د.أ` : '';
              
              return (
                <div
                  key={serviceId}
                  className="service-option"
                  onClick={() => addProductToCart(serviceModal, serviceId)}
                >
                  <div className="service-info">
                    <div className="service-name">{service.name}</div>
                    {savings && <div className="service-savings">{savings}</div>}
                  </div>
                  <div className="service-price">{price.toFixed(2)} د.أ</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* مودال الخياطة */}
      {tailoringModal && (
        <div className="modal-overlay no-print">
          <style>{`
            .modal-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.5);
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 1000;
              backdrop-filter: blur(4px);
            }
            
            .modal-content {
              background: white;
              border-radius: 12px;
              padding: 24px;
              max-width: 500px;
              width: 90%;
              max-height: 90vh;
              overflow-y: auto;
              animation: slideUp 0.3s ease;
            }
          `}</style>
          
          <div className="modal-content" style={{width: 320}}>
            <div className="modal-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: 10}}>
                <span>🪡</span> إضافة خدمة خياطة
              </h3>
              <button 
                onClick={() => setTailoringModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}
              >
                ✕
              </button>
            </div>
            
            <textarea 
              placeholder="تفاصيل العمل (مثلاً: تضييق خصر، تركيب سحاب...)" 
              value={tailoringDetails}
              onChange={e => setTailoringDetails(e.target.value)}
              rows={3}
              style={{marginBottom: 16, width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
            />
            
            <label style={{fontSize: 14, fontWeight: 'bold', marginBottom: 8, display: 'block'}}>
              السعر (د.أ)
            </label>
            <input 
              type="number" 
              placeholder="السعر" 
              value={tailoringPrice} 
              onChange={e => setTailoringPrice(e.target.value)}
              min="0"
              step="0.01"
              style={{marginBottom: 16}}
            />
            
            <label style={{fontSize: 14, fontWeight: 'bold', marginBottom: 8, display: 'block'}}>
              عدد القطع
            </label>
            <input 
              type="number" 
              placeholder="العدد" 
              value={tailoringQty} 
              onChange={e => setTailoringQty(e.target.value)}
              min="1"
              style={{marginBottom: 16}}
            />
            
            <button 
              className="btn-main" 
              onClick={handleAddTailoring}
              style={{marginTop: 20}}
            >
              إضافة للفاتورة
            </button>
          </div>
        </div>
      )}

      {/* طباعة الفاتورة */}
      {lastInvoice && (
        <div className="print-only" style={{display: 'none'}}>
          <style>{`
            @media print {
              .print-only {
                display: block !important;
              }
              
              .receipt {
                width: 80mm !important;
                padding: 8mm !important;
                font-size: 12px !important;
                border: none !important;
                box-shadow: none !important;
                margin: 0 !important;
                page-break-after: always;
              }
            }
          `}</style>
          
          <ReceiptTemplate inv={lastInvoice} />
        </div>
      )}
    </div>
  );
}

// مكون الفاتورة المحسّن
const ReceiptTemplate = ({ inv }: any) => (
  <div className="receipt" style={{
    width: '80mm',
    padding: '8mm',
    textAlign: 'center',
    fontFamily: "'Courier New', monospace",
    direction: 'rtl',
    border: '2px solid #000',
    margin: '20px auto',
    background: 'white',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  }}>
    <div style={{marginBottom: '10px', borderBottom: '2px dashed #000', paddingBottom: '10px'}}>
      <h2 style={{margin: '0 0 5px 0', fontSize: '18px'}}>{SHOP_NAME}</h2>
      <p style={{margin: '2px 0', fontSize: '12px'}}>📞 {SHOP_PHONE}</p>
      <p style={{margin: '2px 0', fontSize: '11px'}}>{SHOP_ADDR}</p>
    </div>
    
    <div style={{marginBottom: '10px', textAlign: 'right'}}>
      <p style={{margin: '3px 0', fontSize: '12px'}}>
        <strong>رقم الفاتورة:</strong> {inv.invoiceNumber}
      </p>
      <p style={{margin: '3px 0', fontSize: '12px'}}>
        <strong>التاريخ:</strong> {inv.dateStr || new Date().toLocaleString('ar-EG')}
      </p>
      <p style={{margin: '3px 0', fontSize: '12px'}}>
        <strong>العميل:</strong> {inv.clientName}
      </p>
      {inv.clientPhone && (
        <p style={{margin: '3px 0', fontSize: '12px'}}>
          <strong>الهاتف:</strong> {inv.clientPhone}
        </p>
      )}
      {inv.deliveryDate && (
        <p style={{margin: '3px 0', fontSize: '12px'}}>
          <strong>موعد التسليم:</strong> {new Date(inv.deliveryDate).toLocaleDateString('ar-EG')}
        </p>
      )}
    </div>
    
    <div style={{margin: '15px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '8px 0'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold'}}>
        <span>الخدمة</span>
        <span>السعر</span>
      </div>
    </div>
    
    <div style={{marginBottom: '10px', maxHeight: '200px', overflow: 'auto'}}>
      {inv.items?.map((item: any, idx: number) => (
        <div key={idx} style={{
          marginBottom: '6px',
          paddingBottom: '6px',
          borderBottom: '1px dotted #ccc',
          fontSize: '11px',
          textAlign: 'right'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span style={{fontWeight: 'bold'}}>{item.name} {item.itemNote || ''}</span>
            <span>{item.total.toFixed(2)} د.أ</span>
          </div>
          <div style={{fontSize: '10px', color: '#666', marginTop: '2px'}}>
            {item.qty} × {item.price.toFixed(2)} د.أ ({item.serviceTypeName})
          </div>
        </div>
      ))}
    </div>
    
    <div style={{marginTop: '15px', borderTop: '2px solid #000', paddingTop: '10px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px'}}>
        <span>الإجمالي:</span>
        <span style={{fontWeight: 'bold'}}>{inv.totalAmount?.toFixed(2)} د.أ</span>
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px'}}>
        <span>المدفوع:</span>
        <span style={{color: '#059669', fontWeight: 'bold'}}>{inv.amountPaidAtStart?.toFixed(2)} د.أ</span>
      </div>
      {inv.remainingAmount > 0 && (
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px'}}>
          <span>الباقي:</span>
          <span style={{color: '#dc2626', fontWeight: 'bold'}}>{inv.remainingAmount?.toFixed(2)} د.أ</span>
        </div>
      )}
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px'}}>
        <span>طريقة الدفع:</span>
        <span>
          {inv.paymentMethod === 'Cash' ? '💵 كاش' : 
           inv.paymentMethod === 'Visa' ? '💳 فيزا' : 
           inv.paymentMethod === 'CliQ' ? '📱 كليك' : inv.paymentMethod}
        </span>
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}>
        <span>حالة الدفع:</span>
        <span style={{
          color: inv.paymentStatus === 'مدفوع' ? '#059669' : 
                 inv.paymentStatus === 'جزئي' ? '#d97706' : '#dc2626',
          fontWeight: 'bold'
        }}>
          {inv.paymentStatus}
        </span>
      </div>
    </div>
    
    <div style={{marginTop: '20px', fontSize: '10px', color: '#666', borderTop: '1px dashed #000', paddingTop: '10px'}}>
      <p style={{margin: '5px 0'}}>شكراً لتعاملكم معنا</p>
      <p style={{margin: '5px 0'}}>يرجى الاحتفاظ بالفاتورة لاستلام الطلب</p>
      <p style={{margin: '5px 0', fontWeight: 'bold'}}>⚠️ لا توجد إرجاع أو استبدال بعد التسليم</p>
      <p style={{margin: '5px 0'}}>Created by: {inv.createdBy || 'System'}</p>
    </div>
  </div>
);

export default App;
