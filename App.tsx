
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, ClipboardList, BarChart3, Plus, Minus, Trash2, CheckCircle2, ChevronRight, Download, BrainCircuit, Settings, Edit2, RotateCcw, X, Save, User, Link as LinkIcon, CloudUpload, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { MenuItem, CartItem, SaleRecord, Tab } from './types';
import { INITIAL_MENU, CATEGORIES } from './constants';
import { getSalesInsights } from './geminiService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// MÃ BRIDGE CHO GOOGLE APPS SCRIPT (Dán vào Extensions > Apps Script)
const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Sheet 1") || ss.getSheets()[0];
    var data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      data.timestamp || new Date().toLocaleString(),
      "ID: " + (data.id || "TEST"),
      data.customerName || "Khách lẻ",
      data.items || "Không có món",
      data.totalAmount || 0,
      data.paymentMethod || "TIỀN MẶT"
    ]);
    
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}`;

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.SALE);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [customerName, setCustomerName] = useState('');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    name: '',
    price: 0,
    category: 'Cà phê',
    image: 'https://picsum.photos/seed/pos/200/200'
  });

  useEffect(() => {
    const savedMenu = localStorage.getItem('smart_pos_menu');
    setMenu(savedMenu ? JSON.parse(savedMenu) : INITIAL_MENU);

    const savedSales = localStorage.getItem('smart_pos_sales');
    if (savedSales) setSales(JSON.parse(savedSales));

    const savedSheetsUrl = localStorage.getItem('smart_pos_sheets_url');
    if (savedSheetsUrl) setSheetsUrl(savedSheetsUrl);
  }, []);

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const pushToGoogleSheets = async (data: any) => {
    const url = sheetsUrl.trim();
    if (!url) return;
    
    setIsSyncing(true);
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Lỗi đồng bộ:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const testConnection = async () => {
    if (!sheetsUrl) return alert('Vui lòng nhập URL Web App trước');
    const testData = {
      id: "KIEM-TRA",
      timestamp: new Date().toLocaleString('vi-VN'),
      customerName: "Kiểm tra hệ thống",
      items: "Đang test đồng bộ Sheet 1",
      totalAmount: 0,
      paymentMethod: "TEST"
    };
    alert('Đang gửi dữ liệu kiểm tra... Nếu sau 10 giây không thấy gì, hãy TRÌNH TRIỂN KHAI LẠI (New Deployment) script của bạn.');
    await pushToGoogleSheets(testData);
  };

  const confirmSale = async () => {
    const newSale: SaleRecord = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      timestamp: new Date().toISOString(),
      items: [...cart],
      totalAmount,
      paymentMethod,
      customerName: customerName.trim() || 'Khách lẻ'
    };
    
    const updatedSales = [newSale, ...sales];
    setSales(updatedSales);
    localStorage.setItem('smart_pos_sales', JSON.stringify(updatedSales));
    
    if (sheetsUrl) {
      const payload = {
        id: newSale.id,
        timestamp: new Date(newSale.timestamp).toLocaleString('vi-VN'),
        customerName: newSale.customerName,
        items: newSale.items.map(i => `${i.name} (x${i.quantity})`).join(', '),
        totalAmount: newSale.totalAmount,
        paymentMethod: newSale.paymentMethod === 'CASH' ? 'TIỀN MẶT' : 'CHUYỂN KHOẢN'
      };
      pushToGoogleSheets(payload);
    }

    setCart([]);
    setCustomerName('');
    setShowConfirmModal(false);
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const saveSheetsUrl = () => {
    localStorage.setItem('smart_pos_sheets_url', sheetsUrl.trim());
    alert('Đã lưu URL kết nối Cloud!');
  };

  const deleteMenuItem = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa món này?')) {
      const updated = menu.filter(m => m.id !== id);
      setMenu(updated);
      localStorage.setItem('smart_pos_menu', JSON.stringify(updated));
    }
  };

  const saveMenuItem = () => {
    if (!newItem.name || !newItem.price) return alert('Vui lòng điền đầy đủ thông tin');
    const updatedMenu = editingItem 
      ? menu.map(m => m.id === editingItem.id ? { ...editingItem, ...newItem as MenuItem } : m)
      : [...menu, { ...newItem as MenuItem, id: Date.now().toString() }];
    setMenu(updatedMenu);
    localStorage.setItem('smart_pos_menu', JSON.stringify(updatedMenu));
    setIsMenuModalOpen(false);
  };

  const handleGetAiInsight = async () => {
    setIsAnalyzing(true);
    setAiInsight(await getSalesInsights(sales));
    setIsAnalyzing(false);
  };

  const chartData = useMemo(() => {
    const groups: Record<string, number> = {};
    sales.slice(0, 10).forEach(s => {
      const date = new Date(s.timestamp).toLocaleDateString('vi-VN');
      groups[date] = (groups[date] || 0) + s.totalAmount;
    });
    return Object.entries(groups).map(([name, total]) => ({ name, total })).reverse();
  }, [sales]);

  const topItemsData = useMemo(() => {
    const itemCounts: Record<string, number> = {};
    sales.forEach(s => s.items.forEach(i => itemCounts[i.name] = (itemCounts[i.name] || 0) + i.quantity));
    return Object.entries(itemCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [sales]);

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0 font-sans">
      <header className="bg-white border-b sticky top-0 z-30 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg">
            <ShoppingCart size={20} />
          </div>
          <h1 className="font-black text-xl tracking-tight text-slate-800 uppercase">Smart<span className="text-blue-600">POS</span></h1>
        </div>
        
        <div className="flex items-center gap-3">
          {isSyncing ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full animate-pulse border border-blue-100">
              <CloudUpload size={14} className="animate-bounce" />
              <span className="text-[10px] font-bold uppercase">Đang đồng bộ</span>
            </div>
          ) : sheetsUrl ? (
            <div className="flex items-center gap-1 text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
               <CheckCircle size={14} />
               <span className="text-[10px] font-bold uppercase">Đã kết nối</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-400 bg-slate-50 px-2 py-1 rounded-full border">
               <AlertCircle size={14} />
               <span className="text-[10px] font-bold uppercase">Chưa kết nối Cloud</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around md:relative md:border-t-0 md:border-r md:w-24 md:flex-col md:justify-start md:gap-8 md:pt-10 z-40 shadow-xl md:shadow-none">
          <button onClick={() => setActiveTab(Tab.SALE)} className={`flex flex-col items-center p-4 transition-all ${activeTab === Tab.SALE ? 'text-blue-600 scale-110' : 'text-slate-300'}`}>
            <ShoppingCart className="w-6 h-6 mb-1" />
            <span className="text-[9px] font-bold md:hidden">Bán hàng</span>
          </button>
          <button onClick={() => setActiveTab(Tab.HISTORY)} className={`flex flex-col items-center p-4 transition-all ${activeTab === Tab.HISTORY ? 'text-blue-600 scale-110' : 'text-slate-300'}`}>
            <ClipboardList className="w-6 h-6 mb-1" />
            <span className="text-[9px] font-bold md:hidden">Lịch sử</span>
          </button>
          <button onClick={() => setActiveTab(Tab.ANALYTICS)} className={`flex flex-col items-center p-4 transition-all ${activeTab === Tab.ANALYTICS ? 'text-blue-600 scale-110' : 'text-slate-300'}`}>
            <BarChart3 className="w-6 h-6 mb-1" />
            <span className="text-[9px] font-bold md:hidden">Báo cáo</span>
          </button>
          <button onClick={() => setActiveTab(Tab.SETTINGS)} className={`flex flex-col items-center p-4 transition-all ${activeTab === Tab.SETTINGS ? 'text-blue-600 scale-110' : 'text-slate-300'}`}>
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-[9px] font-bold md:hidden">Cài đặt</span>
          </button>
        </nav>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          {activeTab === Tab.SALE && (
            <div className="flex flex-col lg:flex-row gap-8 h-full">
              <div className="flex-1 flex flex-col gap-6">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2.5 rounded-2xl whitespace-nowrap text-sm font-bold transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 border'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {menu.filter(item => selectedCategory === 'Tất cả' || item.category === selectedCategory).map(item => (
                    <div key={item.id} onClick={() => addToCart(item)} className="bg-white p-4 rounded-3xl border shadow-sm hover:shadow-xl cursor-pointer group transition-all">
                      <img src={item.image} className="w-full aspect-square object-cover rounded-2xl mb-4 group-hover:scale-105 transition-transform" />
                      <h3 className="font-bold text-slate-800 text-sm mb-1">{item.name}</h3>
                      <p className="text-blue-600 font-black">{formatCurrency(item.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:w-[350px] flex flex-col bg-white rounded-[40px] border shadow-2xl overflow-hidden sticky top-0 h-fit">
                <div className="p-6 border-b flex justify-between bg-slate-50/50">
                  <h2 className="font-black text-slate-800 uppercase tracking-tighter italic">GIỎ HÀNG</h2>
                  <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">{cart.length} món</span>
                </div>
                <div className="p-6 overflow-y-auto max-h-[400px] space-y-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-10 text-slate-300 italic text-sm">Chưa chọn món nào</div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                        <div className="text-sm">
                          <p className="font-bold truncate w-32">{item.name}</p>
                          <p className="text-xs text-slate-400">x{item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <button onClick={() => updateQuantity(item.id, -1)} className="p-1 bg-white border rounded-lg shadow-sm hover:bg-slate-50"><Minus size={12} /></button>
                           <button onClick={() => updateQuantity(item.id, 1)} className="p-1 bg-white border rounded-lg shadow-sm hover:bg-slate-50"><Plus size={12} /></button>
                           <span className="font-bold text-sm ml-2">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-6 bg-white border-t">
                  <div className="flex justify-between mb-6">
                    <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Tổng tiền tạm tính</span>
                    <span className="text-2xl font-black text-blue-600 tracking-tighter">{formatCurrency(totalAmount)}</span>
                  </div>
                  <button disabled={cart.length === 0} onClick={() => setShowConfirmModal(true)} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl disabled:bg-slate-100 transition-all active:scale-95 shadow-lg shadow-blue-100 uppercase tracking-widest text-xs">Thanh toán đơn hàng</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === Tab.SETTINGS && (
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
              <section className="bg-white p-8 rounded-[40px] border shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><LinkIcon size={24} /></div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cấu hình Google Sheets</h3>
                </div>
                
                <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl mb-8">
                  <h4 className="font-black text-amber-800 text-sm mb-2 uppercase flex items-center gap-2">
                    <AlertCircle size={16}/> Hướng dẫn sửa lỗi đồng bộ
                  </h4>
                  <p className="text-xs text-amber-700 leading-relaxed font-medium">
                    Để dữ liệu được ghi vào <b>Sheet 1</b> thành công: <br/>
                    1. Vào menu <b>Extensions > Apps Script</b> trong trang tính. <br/>
                    2. Dán mã bên dưới vào và lưu lại. <br/>
                    3. Bấm <b>Deploy > New Deployment</b>. <br/>
                    4. Tại mục <b>Who has access</b>, bắt buộc chọn <b>Anyone</b>. <br/>
                    5. Copy URL nhận được và dán vào ô dưới đây.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Đường dẫn Web App (Cloud URL)</label>
                    <div className="flex gap-3">
                      <input type="text" value={sheetsUrl} onChange={(e) => setSheetsUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..." className="flex-1 p-4 bg-slate-50 border rounded-2xl outline-none focus:border-blue-500 font-medium" />
                      <button onClick={saveSheetsUrl} className="bg-blue-600 text-white font-black px-6 rounded-2xl hover:bg-blue-700 uppercase text-xs">Lưu cấu hình</button>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-900 rounded-3xl border space-y-4 shadow-inner">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Mã nguồn Bridge Code</label>
                      <button onClick={() => { navigator.clipboard.writeText(APPS_SCRIPT_CODE); alert('Đã sao chép mã!'); }} className="text-white bg-white/10 px-3 py-1 rounded-lg flex items-center gap-2 text-[10px] font-bold hover:bg-white/20 uppercase">Sao chép</button>
                    </div>
                    <pre className="text-[11px] text-emerald-400 p-4 rounded-xl overflow-x-auto font-mono leading-relaxed">{APPS_SCRIPT_CODE}</pre>
                  </div>

                  <div className="pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button onClick={testConnection} className="w-full sm:w-auto bg-emerald-500 text-white font-black px-10 py-4 rounded-2xl shadow-lg active:scale-95 transition-all uppercase text-xs">Gửi kiểm tra thực tế</button>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center italic">Đảm bảo tab trang tính có tên là "Sheet 1"</p>
                  </div>
                </div>
              </section>

              <section className="bg-white p-8 rounded-[40px] border shadow-xl">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Quản lý thực đơn</h3>
                   <button onClick={() => { setEditingItem(null); setNewItem({ name: '', price: 0, category: 'Cà phê', image: 'https://picsum.photos/seed/pos/200/200' }); setIsMenuModalOpen(true); }} className="bg-blue-600 text-white font-black px-5 py-3 rounded-2xl text-[10px] hover:bg-blue-700 transition-all uppercase">+ Thêm món mới</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {menu.map(item => (
                    <div key={item.id} className="p-4 border bg-slate-50/30 rounded-3xl flex justify-between items-center group hover:bg-white hover:shadow-lg transition-all">
                      <div className="flex items-center gap-4">
                        <img src={item.image} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                        <div>
                          <p className="font-bold text-sm text-slate-800">{item.name}</p>
                          <p className="text-blue-600 text-xs font-black">{formatCurrency(item.price)}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingItem(item); setNewItem(item); setIsMenuModalOpen(true); }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => deleteMenuItem(item.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === Tab.HISTORY && (
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
              <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-8 uppercase">Nhật ký <span className="text-blue-600">bán hàng</span></h2>
              {sales.length === 0 ? (
                <div className="bg-white p-20 rounded-[40px] text-center text-slate-300 border border-dashed flex flex-col items-center">
                  <ClipboardList className="mb-4 opacity-20" size={80} />
                  <p className="font-black uppercase tracking-widest text-xs">Hiện tại chưa có giao dịch nào được ghi lại</p>
                </div>
              ) : (
                sales.map(sale => (
                  <div key={sale.id} className="bg-white p-7 rounded-[32px] border shadow-sm flex flex-col sm:flex-row justify-between gap-4 hover:shadow-md transition-shadow">
                    <div className="flex gap-5 items-start">
                      <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center font-black text-xl shadow-inner">
                        {sale.customerName?.charAt(0) || 'K'}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 flex items-center gap-2">{sale.customerName} <span className="text-[10px] text-slate-300 bg-slate-50 px-2 py-0.5 rounded-full font-bold">#{sale.id}</span></p>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">{new Date(sale.timestamp).toLocaleString('vi-VN')}</p>
                        <p className="text-sm text-slate-500 mt-3 font-medium italic border-l-2 border-slate-100 pl-3">{sale.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col justify-center border-t sm:border-0 pt-4 sm:pt-0">
                      <p className="text-2xl font-black text-blue-600 tracking-tighter">{formatCurrency(sale.totalAmount)}</p>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl inline-block w-fit ml-auto mt-2 ${sale.paymentMethod === 'CASH' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {sale.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === Tab.ANALYTICS && (
            <div className="max-w-6xl mx-auto space-y-10 pb-20">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[40px] border shadow-xl border-b-4 border-b-blue-600">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Tổng doanh thu</p>
                  <h4 className="text-4xl font-black text-blue-600 tracking-tighter">{formatCurrency(sales.reduce((sum, s) => sum + s.totalAmount, 0))}</h4>
                </div>
                <div className="bg-white p-8 rounded-[40px] border shadow-xl">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Số lượng đơn hàng</p>
                  <h4 className="text-4xl font-black text-slate-800 tracking-tighter">{sales.length}</h4>
                </div>
                <div className="bg-blue-600 p-8 rounded-[40px] text-white shadow-2xl flex flex-col justify-between overflow-hidden relative">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                       <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Phân tích chuyên sâu</p>
                       <BrainCircuit className="text-white/30" size={24} />
                    </div>
                    <button onClick={handleGetAiInsight} disabled={isAnalyzing || sales.length === 0} className="w-full bg-white text-blue-600 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all shadow-lg active:scale-95 disabled:bg-white/20 disabled:text-white/50">
                      {isAnalyzing ? "Đang xử lý dữ liệu..." : "Tư vấn doanh thu (AI)"}
                    </button>
                  </div>
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                </div>
              </div>

              {aiInsight && (
                <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-[40px] animate-in slide-in-from-bottom duration-500 shadow-inner">
                  <h5 className="font-black text-indigo-900 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <BrainCircuit size={14}/> Trợ lý thông minh Gemini
                  </h5>
                  <p className="text-indigo-800 font-medium italic text-lg leading-relaxed">"{aiInsight}"</p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[40px] border h-96 shadow-xl">
                  <h6 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-8">Biểu đồ tăng trưởng</h6>
                  <ResponsiveContainer width="100%" height="80%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} />
                      <Tooltip 
                        formatter={(value) => formatCurrency(Number(value))}
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} 
                      />
                      <Bar dataKey="total" fill="#2563eb" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white p-8 rounded-[40px] border shadow-xl">
                  <h6 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-8">Sản phẩm ưa chuộng nhất</h6>
                  <div className="space-y-7">
                    {topItemsData.map((item, idx) => (
                      <div key={item.name} className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-black text-slate-700 uppercase tracking-tight">{item.name}</span>
                          <span className="font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{item.value} lượt bán</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out" style={{ width: `${(item.value / (topItemsData[0]?.value || 1)) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Thanh toán */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[50px] overflow-hidden shadow-2xl p-12 space-y-10 animate-in zoom-in-95">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-[30px] flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-blue-200">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Xác nhận bán hàng</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Tên khách hàng</label>
                <div className="relative">
                  <input type="text" autoFocus value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl outline-none focus:border-blue-500 font-bold pr-12 text-lg shadow-inner" placeholder="Tên khách hàng..." />
                  <User className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <button onClick={() => setPaymentMethod('CASH')} className={`p-5 rounded-3xl border-2 font-black text-[10px] uppercase tracking-widest transition-all shadow-sm ${paymentMethod === 'CASH' ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-blue-100' : 'border-slate-50 bg-slate-50 text-slate-300'}`}>💰 Tiền mặt</button>
                <button onClick={() => setPaymentMethod('TRANSFER')} className={`p-5 rounded-3xl border-2 font-black text-[10px] uppercase tracking-widest transition-all shadow-sm ${paymentMethod === 'TRANSFER' ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-blue-100' : 'border-slate-50 bg-slate-50 text-slate-300'}`}>🏦 Chuyển khoản</button>
              </div>

              <div className="pt-8 border-t border-dashed border-slate-200 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng cộng</span>
                <span className="text-4xl font-black text-blue-600 tracking-tighter">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button onClick={confirmSale} className="w-full bg-blue-600 text-white font-black py-6 rounded-[32px] shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 text-lg uppercase tracking-widest">Hoàn tất đơn hàng</button>
              <button onClick={() => setShowConfirmModal(false)} className="w-full text-slate-300 font-black py-2 text-[10px] uppercase tracking-widest hover:text-slate-500 transition-colors">Đóng lại</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa Thực đơn */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[45px] overflow-hidden p-10 space-y-8 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{editingItem ? 'Cập nhật món' : 'Thêm món mới'}</h3>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Tên món / Sản phẩm</label>
                <input type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Ví dụ: Cà phê đen..." className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl outline-none focus:border-blue-500 font-bold shadow-inner" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Giá bán (VND)</label>
                  <input type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} placeholder="0" className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl font-black shadow-inner" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Danh mục</label>
                  <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl font-black appearance-none cursor-pointer">
                    {CATEGORIES.filter(c => c !== 'Tất cả').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-5 pt-4">
              <button onClick={() => setIsMenuModalOpen(false)} className="flex-1 py-5 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600">Thoát</button>
              <button onClick={saveMenuItem} className="flex-1 py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-3xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Lưu thông tin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
